// zombie-apocalypse/maps/colony-xmas.js -- Christmas event on Colony Ship Meridian (runs until Dec 25, 2026).
// A gangway off Hydroponics leads to 20 arenas in one straight line down the ship's west side. Each door costs more
// than the last (500 ... 20,000). Behind the 20th door waits THE OVERLORD, a robot alien walker (not an avatar).
// Beating it unlocks the Overlord gun skin, which you can equip from the lobby (Christmas event card).
// ?xmas=1 forces the event on, ?xmas=0 turns it off (testing).
(function(){
'use strict';
const Q=location.search,END=new Date(2026,11,26).getTime();
const XMAS=/[?&]xmas=1/.test(Q)||(!/[?&]xmas=0/.test(Q)&&Date.now()<END);
const SKEY='za_skin_ovl',EKEY='za_gunskin';
const ls=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}};
const unlocked=()=>ls(SKEY)==='1',equipped=()=>unlocked()&&ls(EKEY)==='ovl';
// gun skin + lobby card work on every map and keep working after the event ends
addEventListener('load',()=>{try{initSkin()}catch(e){console.error('xmas skin',e)}});
if(!XMAS||!window.ZAMAP||!ZAMAP.maps||!ZAMAP.maps.colony)return;
const def=ZAMAP.maps.colony,D=def.data,VH=4.2;
// ---------------- data ----------------
const TH=[
 {n:'Frost Hangar',fl:'SLAB',t:0xa8c4d8,p:'pillars'},{n:'Tinsel Tunnel',fl:'TILE',t:0xc8a84a,p:'lanes'},
 {n:'Holly Cargo Bay',fl:'LOT',t:0x6a8a5a,p:'crates'},{n:'Snowfall Lab',fl:'TILE',t:0xd0d8e2,p:'consoles'},
 {n:'Ornament Foundry',fl:'CEM',t:0x9a5a4a,p:'tanks'},{n:'Ice Core',fl:'SLAB',t:0x8ab8e0,p:'core'},
 {n:'Gift Wrap Depot',fl:'LOT',t:0xb04a4a,p:'gifts'},{n:'Candlelight Reactor',fl:'CEM',t:0xc89a5a,p:'tanks'},
 {n:'Sleigh Dock',fl:'WOOD',t:0x7a5a3a,p:'sleigh'},{n:'Aurora Gallery',fl:'SLAB',t:0x5aa88a,p:'tree'},
 {n:'Mistletoe Medbay',fl:'TILE',t:0xc8d8d0,p:'beds'},{n:'Cocoa Galley',fl:'TILE',t:0x8a6a4a,p:'counters'},
 {n:'Wreath Engine Room',fl:'CEM',t:0x4a7a4a,p:'pillars'},{n:'Starlight Vault',fl:'SLAB',t:0x6a6aa8,p:'shelves'},
 {n:'Frozen Barracks',fl:'SLAB',t:0x9aa8b8,p:'bunks'},{n:'Jingle Armory',fl:'LOT',t:0x8a8a5a,p:'crates'},
 {n:'Polar Relay',fl:'TILE',t:0x7ab0c8,p:'core'},{n:'Yule Furnace',fl:'CEM',t:0xa8603a,p:'lanes'},
 {n:'Silent Night Gate',fl:'SLAB',t:0x4a4a6a,p:'tree'},{n:"The Overlord's Hangar",fl:'SLAB',t:0x3a3e4a,p:'boss'}];
// arenas 1-19: a 15 x 10 strip down the ship's west side (x -60..-46); arena 20 is a 51 x 28 hangar at the far end
const A=[];for(let k=1;k<=19;k++){const z1=112-(k-1)*11;A.push([-60,z1-9,-46,z1])}A.push([-60,-124,-10,-97]);
const GANG=[-44,108,-14,111],Z0=D.zones.length,BOSSZ=Z0+19,BOSSAT=[-35,-115];
const cost=i=>Math.round(500*Math.pow(40,(i-1)/19)/50)*50; // door 1 = 500 ... door 20 = 20,000
A.forEach((r,i)=>D.zones.push({id:Z0+i,name:TH[i].n,rects:i?[r]:[r,GANG]}));
D.doors.push({name:'Christmas event airlock',cells:[-13,108,-13,111],zones:[0,Z0],cost:cost(1),style:'iron'});
for(let k=1;k<=19;k++){const z=A[k-1][1]-1;D.doors.push({name:k===19?"Overlord's vault door":TH[k].n+' door',cells:[-55,z,-52,z],zones:[Z0+k-1,Z0+k],cost:cost(k+1),style:k%2?'pile':'iron'})}
A.forEach((r,i)=>{const[x0,z0,x1,z1]=r;
 if(i<19){D.windows.push({cells:[-61,z0+2,-61,z0+3],zone:Z0+i,n:[1,0]},{cells:[-61,z1-3,-61,z1-2],zone:Z0+i,n:[1,0]});if(i)D.windows.push({cells:[-45,z0+4,-45,z0+5],zone:Z0+i,n:[-1,0]})}
 else for(const z of[-121,-111,-102])D.windows.push({cells:[-61,z,-61,z+1],zone:Z0+i,n:[1,0]},{cells:[-9,z,-9,z+1],zone:Z0+i,n:[-1,0]})});
// solid deck under the event: each arena plus a 2-cell hull ledge (zombies climb in from there), the gangway plus 1
const FPX=A.map(r=>[Math.max(-62,r[0]-2),Math.max(-125,r[1]-2),r[2]+2,r[3]+2]).concat([[GANG[0]-1,GANG[1]-1,GANG[2],GANG[3]+1]]);
ZAMAP.xmas={A,Z0,BOSSZ,FPX};
// ---------------- layout ----------------
let XL=null;
const _lay=def.layout;def.layout=function(h){_lay(h);const{floorT,setH,wall,opening,obstN,F}=h;
 XL={blk:[],cons:[]};const blk=(x0,z0,x1,z1,hh,kind,col)=>{setH(x0,z0,x1,z1,hh,5);XL.blk.push({x0,z0,x1,z1,h:hh,kind,col})};
 for(const r of FPX){setH(r[0],r[1],r[2],r[3],0,0);floorT(r[0],r[1],r[2],r[3],F.SLAB)}
 A.forEach((r,i)=>floorT(...r,F[TH[i].fl]||F.SLAB));floorT(...GANG,F.LOT);
 // walls: one long west/east wall per arena, separators between them (each drawn once), the hangar ring
 A.slice(0,19).forEach((r,i)=>{const[x0,z0,x1,z1]=r,t=TH[i].t;wall(-61,z0,-61,z1,'stucco',VH,t);wall(-45,z0,-45,z1,'stucco',VH,t);
  if(!i)wall(-61,z1+1,-45,z1+1,'stucco',VH,t);if(i<18)wall(-61,z0-1,-45,z0-1,'stucco',VH,t)});
 {const t=TH[19].t;wall(-61,-125,-9,-125,'stucco',VH+1.8,t);wall(-61,-96,-9,-96,'stucco',VH+1.8,t);wall(-61,-124,-61,-97,'stucco',VH+1.8,t);wall(-9,-124,-9,-97,'stucco',VH+1.8,t)}
 wall(GANG[0],GANG[1]-1,GANG[2],GANG[1]-1,'stucco',VH,0x8c96a4);wall(GANG[0],GANG[3]+1,GANG[2],GANG[3]+1,'stucco',VH,0x8c96a4);
 opening(-45,GANG[1],-45,GANG[3]);
 // cover inside each arena (u = x+60, 0..14; v = z-z0, 0..9). The doors sit at u 5..8, so that band stays passable.
 A.slice(0,19).forEach((r,i)=>{const x=u=>-60+u,z0=r[1],z=v=>z0+v,tc=TH[i].t,P=TH[i].p,dk=new THREE.Color(tc).multiplyScalar(.6).getHex();
  const B=(u0,v0,u1,v1,hh,kind,col)=>blk(x(u0),z(v0),x(u1),z(v1),hh,kind,col);
  switch(P){
   case'pillars':for(const[u,v]of[[2,2],[11,2],[2,6],[11,6]])obstN(x(u),z(v),x(u+1),z(v+1),6,'pillar',dk);break;
   case'lanes':obstN(x(1),z(3),x(3),z(6),1.05,'counter',dk);obstN(x(11),z(3),x(13),z(6),1.05,'counter',dk);B(6,4,7,5,1.2,'crate');break;
   case'crates':for(const[a,b,c,d,hh]of[[1,1,2,2,1.2],[12,1,13,1,1.2],[3,6,3,7,2.2],[10,5,11,6,1.2],[12,8,13,8,1.2],[0,8,1,8,2.2]])B(a,b,c,d,hh,'crate');break;
   case'consoles':for(const[u,v]of[[1,3],[11,3],[1,6],[11,6]])B(u,v,u+2,v,1.1,'console');break;
   case'tanks':for(const[u,v]of[[1,1],[12,1],[1,7],[12,7]])B(u,v,u+1,v+1,6,'tank',[0xc84a3a,0x3a8a4a,0xd8b040,0x3a6ac8][(u+v)%4]);break;
   case'core':B(6,4,7,5,6,'core',i===5?0x7fe0ff:0x9affd0);for(const[u,v]of[[1,1],[13,8]])B(u,v,u,v,1.2,'crate');break;
   case'gifts':for(const[a,b,c,d,hh,col]of[[1,1,2,2,1.3,0xc83a3a],[12,2,13,3,.9,0x3a9a4a],[2,6,3,7,1.6,0xd8b040],[11,6,12,7,1.2,0x3a6ac8],[0,4,0,5,.8,0xe8e8f0],[6,4,7,5,1,0xc83ac8]])B(a,b,c,d,hh,'gift',col);break;
   case'sleigh':B(4,4,9,5,1.2,'sleigh');B(1,1,1,1,1.2,'crate');B(13,8,13,8,1.2,'crate');break;
   case'tree':B(6,4,7,5,6,'tree');for(const[u,v,col]of[[1,1,0xc83a3a],[13,1,0x3a9a4a],[1,8,0xd8b040],[13,8,0x3a6ac8]])B(u,v,u,v,.8,'gift',col);break;
   case'beds':for(const[u,v]of[[1,2],[1,6],[12,2],[12,6]])B(u,v,u+1,v+1,.9,'bed');break;
   case'counters':obstN(x(0),z(4),x(3),z(4),1.05,'counter',0x6a7078);obstN(x(11),z(4),x(13),z(4),1.05,'counter',0x6a7078);B(6,4,7,5,.9,'crate');break;
   case'shelves':for(const[u,v]of[[1,2],[1,7],[10,2],[10,7]])obstN(x(u),z(v),x(u+3),z(v),2.4,'shelf',0x7a828c);break;
   case'bunks':for(const[u,v]of[[1,0],[10,1],[1,7],[10,7]])B(u,v,u+3,v+1,1.6,'bunk');break}});
 // the hangar: four big pillars, low cover by the entrance
 for(const[x,z]of[[-50,-119],[-50,-104],[-21,-119],[-21,-104]])obstN(x,z,x+2,z+2,6,'pillar',0x2e323c);
 for(const[x0,z0,x1,z1]of[[-58,-100,-57,-99],[-48,-100,-47,-99],[-30,-101,-29,-100],[-16,-100,-15,-99]])blk(x0,z0,x1,z1,1.2,'crate');
};
// ---------------- decorate ----------------
let bulbs=null;
const _dec=def.decorate;def.decorate=function(d){_dec(d);if(!XL)return;const{CL,box,cbox,cyl,cone,pool,GLOW,root}=d;
 const HULL=0x3e434c,DK=0x23262c,TRIM=0x5a6270;
 // hull underside under the event deck
 for(const r of FPX){const x0=r[0],z0=r[1],x1=r[2]+1,z1=r[3]+1;box(CL.prop,x0,-5,z0,x1,-.03,z1,HULL);box(CL.prop,x0-.05,-.3,z0-.05,x1+.05,.06,z1+.05,TRIM)}
 // ceilings + light strips (strip arenas, gangway); the hangar is open to space with a ribbed frame
 const ceil=(x0,z0,x1,z1)=>{box(CL.ceil,x0-1,VH-.06,z0-1,x1+2,VH,z1+2,0x8a929e);box(CL.prop,x0-1.1,VH,z0-1.1,x1+2.1,VH+.45,z1+2.1,HULL);
  const ax=(x1-x0)>=(z1-z0);for(let a=(ax?x0:z0)+3;a<(ax?x1:z1)-1;a+=6){const x=ax?a+1:(x0+x1+1)/2,z=ax?(z0+z1+1)/2:a+1;cbox(CL.prop,x,VH-.1,z,ax?.5:3,.1,ax?3:.5,TRIM);cbox(GLOW,x,VH-.16,z,ax?.28:2.6,.03,ax?2.6:.28,0xffffff);pool(x,VH-.08,z,2.2,0x1e2228,1)}};
 A.slice(0,19).forEach(r=>ceil(...r));ceil(...GANG);
 {const[x0,z0,x1,z1]=A[19],top=VH+1.8;for(let x=x0;x<=x1+1;x+=5)cbox(CL.prop,x,top+.2,(z0+z1+1)/2,.45,.4,z1-z0+3,TRIM);for(const z of[z0-.5,(z0+z1+1)/2,z1+1.5])cbox(CL.prop,(x0+x1+1)/2,top+.2,z,x1-x0+3,.4,.45,TRIM)}
 // hazard stripes at the event doors
 for(const dd of D.doors.slice(-20)){const c=dd.cells,ax=c[1]===c[3];for(let i=0;i<6;i++){const t=i/5;if(ax)cbox(CL.prop,c[0]+(c[2]+1-c[0])*t,.02,c[1]+.5,.25,.02,1.6,i%2?0x1a1a1a:0xc8a020,.6);else cbox(CL.prop,c[0]+.5,.02,c[1]+(c[3]+1-c[1])*t,1.6,.02,.25,i%2?0x1a1a1a:0xc8a020,.6)}}
 // cover pieces
 for(const b of XL.blk){const x0=b.x0+.08,z0=b.z0+.08,x1=b.x1+.92,z1=b.z1+.92,cx=(x0+x1)/2,cz=(z0+z1)/2,w=x1-x0,dp=z1-z0,hh=b.h;
  switch(b.kind){
   case'crate':box(CL.prop,x0,0,z0,x1,hh,z1,0x6a727c);box(CL.prop,x0-.03,hh*.45,z0-.03,x1+.03,hh*.55,z1+.03,0xc8a020);box(CL.prop,x0-.03,hh-.06,z0-.03,x1+.03,hh,z1+.03,DK);break;
   case'gift':box(CL.prop,x0,0,z0,x1,hh,z1,b.col);box(CL.prop,cx-.09,0,z0-.02,cx+.09,hh+.02,z1+.02,0xf0e8d0);box(CL.prop,x0-.02,0,cz-.09,x1+.02,hh+.02,cz+.09,0xf0e8d0);cbox(CL.prop,cx-.15,hh+.12,cz,.3,.2,.12,0xf0e8d0,.6);cbox(CL.prop,cx+.15,hh+.12,cz,.3,.2,.12,0xf0e8d0,-.6);break;
   case'console':box(CL.prop,x0,0,z0,x1,1,z1,0x3a4048);box(CL.prop,x0,1,z0,x1,1.08,z1,DK);cbox(GLOW,cx,1.1,cz,w*.7,.02,dp*.6,0xffffff);pool(cx,1.12,cz,1.6,0x0a2028,0);break;
   case'tank':{const r=Math.min(w,dp)/2;cyl(CL.prop,cx,VH/2,cz,r,VH,b.col);cyl(CL.prop,cx,VH+.04,cz,r*.85,.12,DK);for(const y of[.5,VH-.5])cyl(CL.prop,cx,y,cz,r+.04,.12,TRIM);break}
   case'core':cyl(CL.prop,cx,.25,cz,1.05,.5,DK);cyl(CL.prop,cx,VH-.25,cz,1.05,.5,DK);cyl(GLOW,cx,VH/2,cz,.55,VH-.9,0xffffff);for(let a=0;a<4;a++)cbox(CL.prop,cx+Math.cos(a*1.57)*.75,VH/2,cz+Math.sin(a*1.57)*.75,.18,VH-.9,.18,TRIM);pool(cx,0,cz,5,0x0a2430,0);break;
   case'sleigh':box(CL.prop,x0+.3,.35,z0,x1-.6,1.05,z1,0xb02a2a);box(CL.prop,x0+.3,1.05,z0,x0+1.1,1.6,z1,0xb02a2a);box(CL.prop,x0+.3,1,z0-.03,x1-.6,1.12,z1+.03,0xd8b040);
    for(const z of[z0+.1,z1-.1])box(CL.prop,x0,.05,z-.05,x1,.15,z+.05,0xd8b040);cbox(CL.prop,x1-.4,.55,cz,.6,.5,dp-.2,0x6a4a2a);break;
   case'tree':cyl(CL.prop,cx,.4,cz,.25,.8,0x4a3020);for(let k=0;k<4;k++)cone(CL.prop,cx,1.1+k*.75,cz,1.25-k*.26,1.3-k*.15,k%2?0x2a6a34:0x2f7a3a);
    {const cols=[0xc83a3a,0xd8b040,0x3a6ac8,0xe8e8f0];for(let k=0;k<14;k++){const a=k*2.4,y=1+((k*7)%13)/13*2.6,rr=Math.max(.25,1.1-(y-1)*.32);cyl(CL.prop,cx+Math.cos(a)*rr,y,cz+Math.sin(a)*rr,.09,.18,cols[k%4])}}
    cone(CL.prop,cx,4.3,cz,.22,.4,0xffe070);pool(cx,0,cz,3.5,0x2a2a10,0);break;
   case'bed':box(CL.prop,x0,.5,z0,x1,.68,z1,0xd8dce0);box(CL.prop,x0+.05,.68,z0+.05,x1-.05,.8,z0+.5,0xe8ecf0);for(const[x,z]of[[x0+.1,z0+.1],[x1-.1,z0+.1],[x0+.1,z1-.1],[x1-.1,z1-.1]])cbox(CL.prop,x,.25,z,.06,.5,.06,TRIM);break;
   case'bunk':box(CL.prop,x0,0,z0,x1,.12,z1,DK);for(const y of[.35,1.3]){box(CL.prop,x0,y,z0,x1,y+.1,z1,0x5a626c);box(CL.prop,x0+.1,y+.1,z0+.1,x1-.1,y+.26,z1-.1,0x7a8aa0)}box(CL.prop,x0,0,z0,x0+.08,1.6,z1,0x5a626c);box(CL.prop,x1-.08,0,z0,x1,1.6,z1,0x5a626c);break}}
 // garlands with blinking bulbs along every event wall, plus a big wreath over each door
 const bl=[];const string=(ax,az,bx,bz,y)=>{const L=Math.hypot(bx-ax,bz-az),n=Math.max(1,Math.round(L/.8));
  cbox(CL.prop,(ax+bx)/2,y,(az+bz)/2,Math.abs(bx-ax)+.12,.14,Math.abs(bz-az)+.12,0x2a5a30);
  for(let i=0;i<=n;i++){const t=i/n;bl.push([ax+(bx-ax)*t,y-.12-Math.sin(t*n*Math.PI)*.06,az+(bz-az)*t])}};
 A.slice(0,19).forEach(r=>{const[x0,z0,x1,z1]=r,y=VH-.4;string(x0+.1,z0+.1,x1+.9,z0+.1,y);string(x0+.1,z1+.9,x1+.9,z1+.9,y);string(x0+.1,z0+.1,x0+.1,z1+.9,y);string(x1+.9,z0+.1,x1+.9,z1+.9,y)});
 string(GANG[0],GANG[1]+.1,GANG[2]+1,GANG[1]+.1,VH-.4);string(GANG[0],GANG[3]+.9,GANG[2]+1,GANG[3]+.9,VH-.4);
 {const[x0,z0,x1,z1]=A[19],y=VH+1.2;string(x0+.1,z0+.1,x1+.9,z0+.1,y);string(x0+.1,z1+.9,x1+.9,z1+.9,y);string(x0+.1,z0+.1,x0+.1,z1+.9,y);string(x1+.9,z0+.1,x1+.9,z1+.9,y)}
 for(const dd of D.doors.slice(-19)){const c=dd.cells,x=(c[0]+c[2]+1)/2,z=c[1]+.5;for(const s of[-1,1]){for(let k=0;k<10;k++){const a=k/10*Math.PI*2;cbox(CL.prop,x+Math.cos(a)*.45,3.45+Math.sin(a)*.45,z+s*.56,.22,.22,.1,0x2a6a34,0,0,0,a)}cbox(CL.prop,x,3.05,z+s*.58,.3,.18,.06,0xc83a3a)}}
 // the hangar floor: a glowing summoning ring around the Overlord's spawn
 {const[bx,bz]=BOSSAT;for(let k=0;k<24;k++){const a=k/24*Math.PI*2;cbox(GLOW,bx+Math.cos(a)*5,.03,bz+Math.sin(a)*5,1.2,.02,.18,0xffffff,-a+Math.PI/2)}pool(bx,0,bz,9,0x200a30,0)}
 if(bl.length){const g=new THREE.SphereGeometry(.07,8,6),m=new THREE.MeshBasicMaterial({color:0xffffff}),im=new THREE.InstancedMesh(g,m,bl.length),M4=new THREE.Matrix4(),C=new THREE.Color();
  bl.forEach((p,i)=>{M4.makeTranslation(p[0],p[1],p[2]);im.setMatrixAt(i,M4);im.setColorAt(i,C.setHex(BULB[i%4]))});im.frustumCulled=false;root.add(im);bulbs=im}
 // real lights near the player: one lamp head per arena (the fx lamp system picks the nearest)
 queueMicrotask(()=>{if(!ZAMAP.lampHeads)return;for(const r of A.concat([GANG])){const v=new THREE.Vector3((r[0]+r[2]+1)/2,VH-.2,(r[1]+r[3]+1)/2);v.built=true;ZAMAP.lampHeads.push(v)}})};
const BULB=[0xff3a2a,0x3aff5a,0xffd040,0x4a8aff];
// ======================================================================================
// runtime (Colony only): deck cut-out, twinkling bulbs, the Overlord, plasma volleys, the skin unlock
// ======================================================================================
if(ZAMAP.id!=='colony')return;
addEventListener('load',()=>{try{initEvent()}catch(e){console.error('xmas',e)}});
function initEvent(){
 const ZA=window.ZA,V3=THREE.Vector3;if(!ZA||typeof scene==='undefined')return;
 // the colony's runtime cut the ground plane down to the ship's footprint: add the event deck to it
 {const gm=ZAMAP.root&&ZAMAP.root.children[0],t=gm&&gm.material&&gm.material.alphaMap,cv=t&&t.image;if(cv&&cv.getContext){const g=cv.getContext('2d');g.fillStyle='#fff';for(const r of FPX)g.fillRect(r[0]+63,r[1]+126,r[2]-r[0]+1,r[3]-r[1]+1);t.needsUpdate=true}}
 // the Mystery Box stays put during the event: one spot only (the Seed Vault, next to the start)
 if(ZA.boxSpots&&ZA.boxSpots.length>1)ZA.boxSpots=ZA.boxSpots.slice(0,1);
 // ---------- the Overlord: boss kind + look ----------
 if(ZA.BOSS)ZA.BOSS.overlord={n:'THE OVERLORD',s:2.4,sub:'It ate the Meridian crew. It is still hungry.',min:['walker','hound'],
  // hitboxes match the walker body (metres): [forward, height, radius, head]
  hb:[[1.05,3.3,.7,1],[0,2.75,1.4],[0,1.9,1.05],[-1.1,2.9,.6],[0,1.1,.75],[.9,2.4,.8]]};
 const mechs=new Set();
 ZA.zlook=ZA.zlook||{};ZA.zlook.overlord={build(o){for(const c of o.children)c.visible=false;const m=makeMech();o.add(m);o.userData.mech=m;mechs.add(o)}};
 // ---------- twinkling bulbs ----------
 let tw=0;const C=new THREE.Color();
 // ---------- plasma orbs (host deals damage; every peer draws them) ----------
 const orbG=new THREE.SphereGeometry(.32,14,10),orbM=new THREE.MeshBasicMaterial({color:0x7ff4ff,transparent:true,opacity:.95,blending:THREE.AdditiveBlending,depthWrite:false}),
  haloM=new THREE.MeshBasicMaterial({color:0xff4ae0,transparent:true,opacity:.28,blending:THREE.AdditiveBlending,depthWrite:false});
 const ORBS=[];for(let i=0;i<24;i++){const m=new THREE.Mesh(orbG,orbM),h=new THREE.Mesh(orbG,haloM);h.scale.setScalar(1.45);m.add(h);m.visible=false;scene.add(m);ORBS.push({m,v:new V3(),t:0,host:false,by:''})}
 let orbI=0;function orb(p,v,host,by){const o=ORBS[orbI++%ORBS.length];o.m.position.set(p[0],p[1],p[2]);o.v.set(v[0],v[1],v[2]);o.t=4;o.host=host;o.by=by;o.m.visible=true;
  const d=Math.hypot(p[0]-me.pos.x,p[2]-me.pos.z);if(d<45&&typeof blip==='function'){blip(260,.08*(1-d/45)+.02,.18,'sawtooth');setTimeout(()=>blip(520,.05*(1-d/45)+.01,.12,'square'),40)}
  const mo=findMech(by);if(mo)mo.userData.mech.userData.recoil=.25}
 function pop(o){o.m.visible=false;o.t=0;if(typeof puff==='function')for(let i=0;i<4;i++)puff(o.m.position,i%2?0xff4ae0:0x7ff4ff,.35,.4,0,new V3((Math.random()-.5)*4,Math.random()*3,(Math.random()-.5)*4),1.2)}
 function findMech(id){for(const o of mechs){const b=bots.find(x=>x.o===o);if(b&&b.id===id)return o}return null}
 const tele=(p)=>{if(typeof puff!=='function')return;const v=new V3(p[0],0,p[2]);for(let i=0;i<30;i++)puff(new V3(v.x+(Math.random()-.5)*3,Math.random()*7,v.z+(Math.random()-.5)*3),i%2?0x7ff4ff:0xff4ae0,.6,.8,0,new V3(0,3+Math.random()*4,0),1.5);
  if(typeof noise==='function')noise(1,1.6,180,1.2);if(typeof fxBoom==='function')fxBoom([v.x,1,v.z],2.5);shake=Math.max(shake||0,.3)};
 ZA.on('ev',m=>{if(m.e==='xorb'){orb(m.p,m.v,false,m.by);return true}if(m.e==='xtele'){tele(m.p);return true}});
 // ---------- state ----------
 let bossRef=null,bossDone=false,bossWait=0,seenOpen=false,intro=false;
 ZA.on('begin',()=>{bossRef=null;bossDone=false;bossWait=0;seenOpen=false;
  if(!intro){intro=true;setTimeout(()=>{if(typeof feed==='function')feed('CHRISTMAS EVENT: the airlock in Hydroponics leads to 20 arenas. The Overlord waits at the end.','#9be06a')},2500)}});
 const live=()=>typeof RS!=='undefined'&&RS.ph==='live';
 ZA.on('tick',dt=>{
  // bulbs
  if(bulbs&&(tw-=dt)<=0){tw=.35;const n=bulbs.count;for(let k=0;k<n/6;k++){const i=Math.random()*n|0;bulbs.setColorAt(i,C.setHex(Math.random()<.25?0x202020:BULB[i%4]))}bulbs.instanceColor.needsUpdate=true}
  // the vault door opened: warn everyone (every peer sees the zone open)
  const open=ZA.zoneOpen&&ZA.zoneOpen(BOSSZ);if(open&&!seenOpen){seenOpen=true;if(typeof center==='function')center("THE OVERLORD'S HANGAR",'Something huge is powering up...','#7ff4ff');if(typeof blip==='function'){blip(110,.25,.8,'sawtooth');setTimeout(()=>blip(82,.25,1,'sawtooth'),500)}}
  // orbs
  for(const o of ORBS){if(o.t<=0)continue;o.t-=dt;const p=o.m.position;p.addScaledVector(o.v,dt);o.m.scale.setScalar(1+Math.sin(performance.now()/60)*.12);
   if(o.t<=0||p.y<.1||(typeof blocked==='function'&&blocked(p.x,p.z,p.y))){pop(o);continue}
   if(o.host)for(const s of ZA.survivors()){if(!s.pos)continue;if(Math.hypot(s.pos.x-p.x,s.pos.z-p.z)<1.1&&p.y>s.pos.y-.2&&p.y<s.pos.y+2.2){applyHit(s.id,ZA.zDmg(RS.rnd)*1.3,o.by,false,'knife');pop(o);break}}}
  // mech animation (every peer)
  for(const o of mechs){if(!o.parent){mechs.delete(o);continue}animMech(o,dt)}});
 // ---------- host: spawn the Overlord, plasma volleys ----------
 function spawnOverlord(){if(!ZA.spawnBossKind||(bossRef&&bossRef.alive))return null;
  const at=new V3(BOSSAT[0],0,BOSSAT[1]),b=ZA.spawnBossKind('overlord',at);bossRef=b;
  b.hp=Math.max(b.hp*3,10000*(1+.6*Object.keys(others||{}).length)); // ~3x a wave boss, at least 10k (50k was a wall)b.maxHp=b.hp;b.rise=0;b.gy=0;b.pos.y=0;b.atWindow=false;b.orbCd=4;b.o.position.copy(b.pos);
  const m={t:'ev',e:'xtele',p:[at.x,0,at.z]};bcast(m);tele(m.p);return b}
 ZA.xmas={spawnOverlord,arena:i=>{const r=A[i];return r?[(r[0]+r[2]+1)/2,r[3]-.5]:null},n:A.length};
 ZA.on('hostTick',dt=>{
  if(!bossRef&&!bossDone&&seenOpen&&live()&&ZA.spawnBossKind&&!ZA.bossBusy()){bossWait+=dt;if(bossWait>=3){bossWait=0;spawnOverlord()}}
  if(bossRef&&!bossRef.alive){bossRef=null;bossDone=true}
  const b=bossRef;if(!b||b.rise>0||!live())return;b.orbCd-=dt;if(b.orbCd>0)return;
  const T=ZA.survivors().filter(s=>s.pos&&Math.hypot(s.pos.x-b.pos.x,s.pos.z-b.pos.z)<46);if(!T.length){b.orbCd=.5;return}
  const t=T[Math.random()*T.length|0],ph=b.ph||1;b.orbCd=ph>=3?1.6:ph>=2?2.3:3.2;
  const yw=b.yaw,fx=-Math.sin(yw),fz=-Math.cos(yw),rx=-fz,rz=fx,n=ph>=2?5:3;
  for(let i=0;i<n;i++){const side=i%2?1:-1,o=[b.pos.x+rx*side*1.5+fx*1.6,b.pos.y+3.2,b.pos.z+rz*side*1.5+fz*1.6],spread=(i-(n-1)/2)*.09;
   const dx=t.pos.x-o[0],dz=t.pos.z-o[2],dy=t.pos.y+1.1-o[1],L=Math.hypot(dx,dy,dz)||1,cs=Math.cos(spread),sn=Math.sin(spread),sp=15;
   const vx=(dx*cs-dz*sn)/L*sp,vz=(dx*sn+dz*cs)/L*sp,vy=dy/L*sp;setTimeout(()=>{if(!b.alive)return;const m={t:'ev',e:'xorb',p:o,v:[vx,vy,vz],by:b.id};bcast(m);orb(o,m.v,true,b.id)},i*110)}});
 // ---------- the reward: beat the Overlord, unlock the skin (every survivor in the match) ----------
 ZA.on('kill',(k,v)=>{const z=ZA.ztypes&&ZA.ztypes[v];if(!z||z.k!=='overlord')return;const first=!unlocked();ls(SKEY,'1');ls(EKEY,'ovl');
  setTimeout(()=>{if(typeof center==='function')center('OVERLORD SKIN UNLOCKED',first?'Equipped on all your guns · change it in the lobby':'Overlord skin equipped','#7ff4ff');if(window.ZAskin)ZAskin.refresh()},2600)});
 // ---------- teleporters: Hydroponics <-> every opened event arena, 1000 a ride, with a beam-up animation ----------
 const TPC=1000,pads=[];
 const freeSpot=(x0,z0,x1,z1,pref)=>{const all=[];for(let x=x0+1;x<x1;x++)for(let z=z0+1;z<z1;z++)all.push([x+.5,z+.5]);const t=pref[0];all.sort((a,b)=>Math.hypot(a[0]-t[0],a[1]-t[1])-Math.hypot(b[0]-t[0],b[1]-t[1]));
  const near=(px,pz)=>Math.abs(px-(x0+x1+1)/2)<3&&(Math.abs(pz-z0)<2.5||Math.abs(pz-z1-1)<2.5); // keep the door lanes clear
  for(const[px,pz]of pref.concat(all)){if(near(px,pz))continue;let ok=true;for(const dx of[-1,0,1])for(const dz of[-1,0,1])if(typeof blocked==='function'&&blocked(px+dx*.9,pz+dz*.9,.4))ok=false;if(ok)return[px,pz]}return null};
 {const disc=new THREE.CircleGeometry(1,32).rotateX(-Math.PI/2),ring=new THREE.TorusGeometry(1.05,.07,8,40).rotateX(Math.PI/2),
   dM=new THREE.MeshBasicMaterial({color:0x5ff0ff,transparent:true,opacity:.35,blending:THREE.AdditiveBlending,depthWrite:false}),rM=new THREE.MeshBasicMaterial({color:0xa8ffff}),
   bM=new THREE.MeshStandardMaterial({color:0x3a4252,metalness:.6,roughness:.4}),pyl=new THREE.CylinderGeometry(.07,.1,1.1,8);
  const mk=(x,z,to,label)=>{const g=new THREE.Group();g.position.set(x,0,z);const base=new THREE.Mesh(new THREE.CylinderGeometry(1.25,1.35,.12,32),bM);base.position.y=.06;g.add(base);
   const d=new THREE.Mesh(disc,dM);d.position.y=.13;g.add(d);const r=new THREE.Mesh(ring,rM);r.position.y=.16;g.add(r);
   for(let k=0;k<4;k++){const a=k*Math.PI/2+.785,p=new THREE.Mesh(pyl,bM);p.position.set(Math.cos(a)*1.15,.6,Math.sin(a)*1.15);g.add(p);const t=new THREE.Mesh(new THREE.SphereGeometry(.09,10,8),rM);t.position.set(Math.cos(a)*1.15,1.2,Math.sin(a)*1.15);g.add(t)}
   scene.add(g);const pad={x,z,g,d,r,to,label};pads.push(pad);return pad};
  // Hydroponics pad, and one per event arena (on the first free spot near its entrance)
  const home=mk(6,102,null,'');
  A.forEach((r,i)=>{const[x0,z0,x1,z1]=r,mz=i<19?z1-1.5:z1-2.5,cand=i<19?[[x0+10.5,mz],[x0+3.5,mz],[x0+12.5,mz-2],[x0+2.5,mz-2],[x0+10.5,z0+1.5],[x0+3.5,z0+1.5]]:[[-44,-100],[-26,-100],[-52,-104]];
   const s=freeSpot(x0,z0,x1,z1,cand);if(s)mk(s[0],s[1],'home',TH[i].n).i=i});
  for(const p of pads){const id='xtp'+pads.indexOf(p),dest=()=>{if(p.to==='home')return home;let best=null;for(const q of pads)if(q.i!=null&&ZA.zoneOpen(Z0+q.i))best=q;return best};
   ZA.addUse({id,pos:new V3(p.x,0,p.z),r:1.5,hold:0,ok:()=>!tpAnim&&live()&&(p===home?!!dest():ZA.zoneOpen(Z0+p.i))&&!me.downed,
    label:()=>{const q=dest();return 'Press <b>E</b> to teleport to <b>'+(p===home?q.label:'Hydroponics')+'</b> · <b>'+TPC+'</b>'+(me.money<TPC?' <span class="st">(not enough points)</span>':'')},
    use:()=>{const q=dest();if(!q||tpAnim)return;if(me.money<TPC){center('','Not enough points ('+TPC+')');blip(200,.08,.15);return}me.money-=TPC;startTp(p,q)}})}}
 // the ride: 1.1 s charge (lifted in a light column, screen whites out), jump, 0.7 s arrival (drop back down, flash fades)
 let tpAnim=null;const beamG=new THREE.CylinderGeometry(1,1,1,24,1,true),beamM=new THREE.MeshBasicMaterial({color:0x7ff4ff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
 const beams=[0,1].map(()=>{const m=new THREE.Mesh(beamG,beamM.clone());m.visible=false;scene.add(m);return m});
 const veil=document.createElement('div');veil.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:7;opacity:0;background:radial-gradient(circle at 50% 50%,rgba(255,255,255,1) 0%,rgba(160,250,255,.95) 35%,rgba(40,120,200,.85) 100%)';
 const streak=document.createElement('div');streak.style.cssText='position:absolute;inset:-20%;background:repeating-conic-gradient(from 0deg,rgba(255,255,255,.0) 0deg 6deg,rgba(255,255,255,.55) 6deg 7deg);mix-blend-mode:screen;opacity:.0';veil.appendChild(streak);document.body.appendChild(veil);
 function beamFx(b,x,z,t){b.position.set(x,4,z);b.visible=true;b.userData.t=t;b.userData.T=t}
 function remoteFx(m){beamFx(beams[0],m.a[0],m.a[1],1.8);beamFx(beams[1],m.b[0],m.b[1],1.8);if(typeof puff==='function')for(const p of[m.a,m.b])for(let i=0;i<10;i++)puff(new V3(p[0]+(Math.random()-.5)*1.6,Math.random()*3,p[1]+(Math.random()-.5)*1.6),0x7ff4ff,.3,.7,0,new V3(0,3,0),1.2)}
 function startTp(p,q){tpAnim={p,q,t:0,jumped:false,sx:p.x,sz:p.z};const m={t:'ev',e:'xtpfx',a:[p.x,p.z],b:[q.x,q.z]};if(typeof isHost!=='undefined'&&isHost)bcast(m);else if(typeof send==='function')send(m);remoteFx(m);
  if(typeof blip==='function'){blip(220,.12,1.1,'sawtooth');setTimeout(()=>blip(440,.1,.6,'sine'),300);setTimeout(()=>blip(880,.1,.5,'sine'),650)}
  try{document.exitPointerLock&&0}catch(e){}}
 ZA.on('ev',m=>{if(m.e==='xtpfx'){remoteFx(m);return true}});
 const _hm2=window.hostMsg;window.hostMsg=function(c,m){if(m&&m.t==='ev'&&m.e==='xtpfx'){bcast(m);remoteFx(m);return}return _hm2(c,m)};
 ZA.on('tick',dt=>{const now=performance.now()/1000;
  for(const p of pads){p.r.rotation.y+=dt*1.5;p.d.material.opacity=.25+.15*Math.sin(now*4);const on=p===pads[0]||ZA.zoneOpen(Z0+p.i);p.g.visible=true;p.r.visible=on}
  for(const b of beams)if(b.visible){b.userData.t-=dt;const f=Math.max(0,b.userData.t/b.userData.T);b.material.opacity=Math.sin(f*Math.PI)*.55;b.scale.set(.9+.3*(1-f),8,.9+.3*(1-f));b.rotation.y+=dt*3;if(b.userData.t<=0)b.visible=false}
  const T=tpAnim;if(!T)return;T.t+=dt;me.vy=0;
  if(!T.jumped){const f=Math.min(1,T.t/1.1);me.pos.set(T.sx,f*1.4,T.sz);veil.style.opacity=(f*f).toFixed(3);streak.style.opacity=(f*.9).toFixed(3);streak.style.transform='rotate('+(T.t*220)+'deg) scale('+(1+f*.6)+')';
   if(typeof puff==='function'&&Math.random()<.6)puff(new V3(T.sx+(Math.random()-.5)*1.8,Math.random()*.5,T.sz+(Math.random()-.5)*1.8),0x7ff4ff,.25,.6,0,new V3(0,5,0),1);
   if(f>=1){T.jumped=true;T.t=0;T.sx=T.q.x;T.sz=T.q.z;me.pos.set(T.sx,1.4,T.sz);if(typeof noise==='function')noise(.5,.5,2400,1.5)}}
  else{const f=Math.min(1,T.t/.7);me.pos.set(T.sx,1.4*(1-f),T.sz);veil.style.opacity=((1-f)*(1-f)).toFixed(3);streak.style.opacity=((1-f)*.9).toFixed(3);
   if(f>=1){tpAnim=null;veil.style.opacity=0;streak.style.opacity=0;me.pos.y=0;if(typeof fxBoom==='function')0;if(typeof puff==='function')for(let i=0;i<14;i++)puff(new V3(T.sx,.3,T.sz),i%2?0x7ff4ff:0xffffff,.4,.6,0,new V3((Math.random()-.5)*6,Math.random()*3,(Math.random()-.5)*6),1.4);
    if(typeof center==='function')center('',T.q===pads[0]?'Hydroponics':T.q.label,'#7ff4ff')}}});
 ZA.on('begin',()=>{tpAnim=null;veil.style.opacity=0});
 // ---------- the mech model ----------
 function makeMech(){const g=new THREE.Group(),S=1/2.4; // built in metres, the zombie object is scaled 2.4
  const metal=new THREE.MeshStandardMaterial({color:0x5a6680,metalness:.55,roughness:.33,emissive:0x0a1020}),plate=new THREE.MeshStandardMaterial({color:0xc0cada,metalness:.6,roughness:.28,emissive:0x101418}),
   joint=new THREE.MeshStandardMaterial({color:0x2e3340,metalness:.45,roughness:.45}),cyan=new THREE.MeshBasicMaterial({color:0x7ff4ff}),mag=new THREE.MeshBasicMaterial({color:0xff4ae0}),
   eye=new THREE.MeshBasicMaterial({color:0xff2a50});
  const add=(geo,mat,x,y,z,sx,sy,sz,par)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);if(sx)m.scale.set(sx,sy,sz);m.castShadow=true;(par||g).add(m);return m};
  const sph=new THREE.SphereGeometry(1,28,18),cylG=new THREE.CylinderGeometry(1,1,1,20),tor=new THREE.TorusGeometry(1,.08,10,40),cn=new THREE.ConeGeometry(1,1,16);
  const root=new THREE.Group();root.scale.setScalar(S);g.add(root);
  const body=new THREE.Group();body.position.y=2.75;root.add(body);
  // armoured pod: a smooth lathe shell, waist ring, glowing belly
  const shell=new THREE.LatheGeometry([[0,-.95],[.7,-.85],[1.15,-.45],[1.3,0],[1.2,.45],[.9,.85],[.4,1.05],[0,1.08]].map(p=>new THREE.Vector2(p[0],p[1])),36);
  add(shell,metal,0,0,0,1,1,1.12,body);add(tor,plate,0,0,0,1.33,1.33,1.6,body).rotation.x=Math.PI/2;
  add(sph,cyan,0,-.82,0,.55,.18,.55,body);for(const y of[-.35,.35])add(tor,cyan,0,y,0,1.27-Math.abs(y)*.15,1.27-Math.abs(y)*.15,.35,body).rotation.x=Math.PI/2;
  // head: a sleek dome pushed forward with a triangle of three eyes and two mandible blades
  const head=new THREE.Group();head.position.set(0,.55,-1.05);body.add(head);
  add(sph,plate,0,0,0,.62,.5,.6,head);add(sph,joint,0,-.05,-.25,.5,.32,.42,head);
  const eyes=[],eg=document.createElement('canvas');eg.width=eg.height=64;{const q=eg.getContext('2d'),gr=q.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,90,120,1)');gr.addColorStop(.4,'rgba(255,40,80,.5)');gr.addColorStop(1,'rgba(255,0,60,0)');q.fillStyle=gr;q.fillRect(0,0,64,64)}
  const egM=new THREE.SpriteMaterial({map:new THREE.CanvasTexture(eg),blending:THREE.AdditiveBlending,transparent:true,depthWrite:false});
  for(const[x,y,s]of[[-.22,.1,.17],[.22,.1,.17],[0,-.14,.2]]){const e=add(sph,eye,x,y,-.55,s,s,s*.6,head);const sp=new THREE.Sprite(egM);sp.scale.set(4.5,4.5,1);sp.position.z=-.3;e.add(sp);eyes.push(e)}
  for(const s of[-1,1]){const md=add(cn,plate,s*.32,-.35,-.42,.08,.55,.12,head);md.rotation.set(-1.9,0,s*.25)}
  // dorsal spines + back reactor
  for(let i=0;i<4;i++){const sp=add(cn,plate,0,1.05-i*.05,.1+i*.32,.1,.55-i*.08,.1,body);sp.rotation.x=.45+i*.15}
  const core=add(sph,mag,0,.15,1.15,.38,.38,.38,body);add(tor,plate,0,.15,1.15,.42,.42,.42,body);
  // halo ring
  const halo=add(tor,cyan,0,1.55,0,.85,.85,.85,body);halo.rotation.x=Math.PI/2;
  // arm cannons
  const guns=[];for(const s of[-1,1]){const arm=new THREE.Group();arm.position.set(s*1.5,.05,-.15);body.add(arm);
   add(sph,joint,0,0,0,.42,.42,.42,arm);add(cylG,metal,0,0,-.6,.3,1.2,.3,arm).rotation.x=Math.PI/2;
   add(cylG,plate,0,0,-1.3,.2,.6,.2,arm).rotation.x=Math.PI/2;const mz=add(tor,cyan,0,0,-1.62,.22,.22,.22,arm);add(sph,cyan,0,0,-1.55,.12,.12,.12,arm);
   for(const a of[0,2.09,4.19])add(cylG,joint,Math.cos(a)*.24,Math.sin(a)*.24,-1.1,.05,.8,.05,arm).rotation.x=Math.PI/2;guns.push(arm)}
  // three digitigrade legs (two front, one back)
  const legs=[];for(const a of[-.75,.75,Math.PI]){const L=new THREE.Group();L.position.set(Math.sin(a)*.8,2.15,-Math.cos(a)*.8);L.rotation.y=-a;root.add(L);
   add(sph,joint,0,0,0,.32,.32,.32,L);const th=new THREE.Group();th.rotation.x=.56;L.add(th);
   add(cylG,metal,0,0,-.75,.2,1.5,.2,th).rotation.x=Math.PI/2;add(sph,joint,0,0,-1.5,.24,.24,.24,th);
   const sh=new THREE.Group();sh.position.set(0,0,-1.5);sh.rotation.x=-1.73;th.add(sh);
   add(cylG,plate,0,0,-1.6,.15,3.2,.15,sh).rotation.x=Math.PI/2;add(sph,cyan,0,0,-1.6,.08,.08,.7,sh);
   const ft=add(cn,metal,0,0,-3.2,.32,.35,.32,sh);ft.rotation.x=-Math.PI/2;legs.push({L,th,sh,a})}
  g.traverse(o=>{if(o.isMesh)o.castShadow=true});
  g.userData={body,head,eyes,halo,core,guns,legs,ph:0,recoil:0,last:null,spd:0};return g}
 function animMech(o,dt){const m=o.userData.mech,u=m.userData,now=performance.now()/1000;for(const c of o.children)if(c!==m)c.visible=false;
  const wp=o.position;if(!u.last)u.last=wp.clone();const sp=Math.min(12,wp.distanceTo(u.last)/Math.max(dt,1e-3));u.last.copy(wp);u.spd+=(sp-u.spd)*Math.min(1,dt*6);
  o.rotation.x=0;u.ph+=dt*(1.5+u.spd*.9);const walk=Math.min(1,u.spd/3);
  u.legs.forEach((l,i)=>{const p=u.ph+i*2.09,lift=Math.max(0,Math.sin(p));l.th.rotation.x=.56+Math.cos(p)*.22*walk+lift*.3*walk;l.sh.rotation.x=-1.73-lift*.25*walk});
  u.body.position.y=2.75+Math.sin(u.ph*2)*.06*walk+Math.sin(now*2)*.05;u.body.rotation.z=Math.sin(u.ph)*.05*walk;
  u.halo.rotation.z+=dt*2.2;u.halo.position.y=1.55+Math.sin(now*3)*.06;u.core.scale.setScalar(.38+Math.sin(now*6)*.04);
  const blink=(now%3.2)<.12;for(const e of u.eyes)e.visible=!blink;
  if(u.recoil>0){u.recoil-=dt;for(const gn of u.guns)gn.position.z=-.15+Math.max(0,u.recoil)*1.2}}
}
// ======================================================================================
// gun skin: the Overlord skin on your own guns (first-person view), and the lobby card to equip it
// ======================================================================================
function initSkin(){
 if(typeof setVM!=='function'||!window.THREE)return;
 let mats=null;function M(){if(mats)return mats;const cv=document.createElement('canvas');cv.width=cv.height=128;const g=cv.getContext('2d');g.fillStyle='#000';g.fillRect(0,0,128,128);
  g.strokeStyle='#fff';g.lineWidth=2;for(let i=0;i<22;i++){let x=Math.random()*128,y=Math.random()*128;g.beginPath();g.moveTo(x,y);for(let s=0;s<4;s++){if(Math.random()<.5)x+=(Math.random()-.5)*60;else y+=(Math.random()-.5)*60;g.lineTo(x,y)}g.stroke();g.fillStyle='#fff';g.fillRect(x-2,y-2,4,4)}
  const t=new THREE.CanvasTexture(cv);t.wrapS=t.wrapT=THREE.RepeatWrapping;
  mats={dark:new THREE.MeshStandardMaterial({color:0x14171f,metalness:.9,roughness:.25,emissive:0x29e8ff,emissiveMap:t,emissiveIntensity:1}),
   trim:new THREE.MeshStandardMaterial({color:0x5a4a9a,metalness:.95,roughness:.2,emissive:0x2a0a3a}),
   glow:new THREE.MeshBasicMaterial({color:0x7ff4ff})};return mats}
 function apply(list){const m=M();list.forEach(o=>{if(!o.isMesh||!o.material||o.userData.ovl)return;o.userData.ovl=1;const om=Array.isArray(o.material)?o.material[0]:o.material;
  if(om.isMeshBasicMaterial||(om.emissive&&om.emissive.getHSL&&om.emissive.getHSL({}).l>.3)){o.material=m.glow;return}
  const c=om.color||new THREE.Color(.3,.3,.3),l=.3*c.r+.59*c.g+.11*c.b;o.material=l<.3?m.dark:m.trim})}
 // only the gun itself (setVM also hangs the gloves/sleeves on it): catch the mesh gunMesh() returns during setVM
 const _sv=window.setVM;window.setVM=function(id){const _gm=window.gunMesh;let gun=null;window.gunMesh=function(){const g=_gm.apply(this,arguments);if(!gun){gun=[];g.traverse(o=>gun.push(o))}return g};
  let r;try{r=_sv.apply(this,arguments)}finally{window.gunMesh=_gm}try{if(equipped()&&gun)apply(gun)}catch(e){}return r};
 window.ZAskin={refresh(){try{vmId=null;setVM(curGun())}catch(e){}}};
 const t0=performance.now();(function pulse(){requestAnimationFrame(pulse);if(!mats)return;const s=(performance.now()-t0)/1000;mats.dark.emissiveIntensity=.6+.5*Math.sin(s*2.2);mats.glow.color.setHSL(.5+.08*Math.sin(s*.7),1,.62)})();
 // lobby card (sits under the map picker)
 const card=document.createElement('div');card.className='card za-xmasc';
 function draw(){const u=unlocked(),on=equipped();card.innerHTML='<div class="za-h">'+(XMAS?'Christmas event · until Dec 25':'Gun skin')+'</div>'+
  (XMAS?'<div class="d" style="margin:4px 0 8px;opacity:.85">Colony Ship Meridian: fight through 20 arenas (doors up to 20,000) and beat <b>THE OVERLORD</b> to unlock the Overlord gun skin.</div>':'')+
  '<div class="za-seg"><button type="button" data-s="" class="'+(on?'':'on')+'">Default skin</button><button type="button" data-s="ovl" class="'+(on?'on':'')+'"'+(u?'':' disabled title="Beat the Overlord to unlock" style="opacity:.45"')+'>'+(u?'Overlord skin':'Overlord skin (locked)')+'</button></div>';
  for(const b of card.querySelectorAll('button'))b.onclick=()=>{if(b.disabled)return;ls(EKEY,b.dataset.s);draw();ZAskin.refresh()}}
 if(!XMAS&&!unlocked())return;draw();
 setInterval(()=>{const mp=document.querySelector('.za-mapc');if(mp&&card.parentNode!==mp.parentNode){mp.after(card);draw()}},800);
}
})();
