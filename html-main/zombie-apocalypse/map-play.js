// zombie-apocalypse/map-play.js -- gameplay on the Hollow Creek map: zones + buyable doors, barricade windows,
// wall-buys, traps, zombie spawn points and a flow-field so zombies path around walls.
(function(){
'use strict';
const M=window.ZAMAP;if(/noplay/.test(location.search)||!M||!M.T||!window.ZA)return;
const V3=THREE.Vector3,T=M.T,G=M.G,WB=M.WB,ZN=M.ZN,NN=W*D;
ZA.markers=ZA.markers||[];
if(!GUNS.trap)GUNS.trap={n:'Trap',pen:1,rew:0};
const pts=(n,why,pos)=>{if(ZA.addPts)ZA.addPts(n,why,pos);else me.money=Math.min(MAX$,me.money+n)};
const near=(p,r)=>Math.hypot(p.x-me.pos.x,p.z-me.pos.z)<r;
// ---------- shared spots ----------
const spot=(a,zone)=>{const v=new V3(a[0],0,a[1]);v.yaw=a[2];v.pos=v;v.zone=zone!=null?zone:M.zoneAt(a[0],a[1]);return v};
ZA.boxSpots=M.boxSpots.map(a=>spot(a));ZA.perkSpots=M.perkSpots.map(a=>spot(a));ZA.forgeSpot=spot(M.forgeSpot);
ZA.lampSpots=M.lampHeads||[];
const zoneOpen=M.zones.map((z,i)=>i===0);
ZA.zones=M.zones.map((z,i)=>{let sx=0,sz=0,n=0;for(const r of z.rects){const a=(r[2]-r[0]+1)*(r[3]-r[1]+1);sx+=(r[0]+r[2]+1)/2*a;sz+=(r[1]+r[3]+1)/2*a;n+=a}return{id:i,name:z.name,rects:z.rects,center:new V3(sx/n,0,sz/n),get open(){return zoneOpen[i]}}});
ZA.zoneAt=(x,z)=>M.zoneAt(x,z);ZA.zoneOpen=i=>!!zoneOpen[i];
// ---------- walkability + flow field (host) ----------
const WK=new Uint8Array(NN),NW=new Uint8Array(NN);
function rebuildWalk(){for(let k=0;k<NN;k++)WK[k]=H[k]<=.9&&!WB[k]?1:0;for(let j=1;j<D-1;j++)for(let i=1;i<W-1;i++){const k=j*W+i;NW[k]=(!WK[k-1]||!WK[k+1]||!WK[k-W]||!WK[k+W]||!WK[k-W-1]||!WK[k-W+1]||!WK[k+W-1]||!WK[k+W+1])?1:0}}
rebuildWalk();
const dist=new Float32Array(NN).fill(1e9),src=new Int8Array(NN),hk=new Int32Array(NN*3),hd=new Float32Array(NN*3);let hn=0,fieldT=[],fieldAge=9;
function hpush(k,d){if(hn>=hk.length)return;let i=hn++;while(i>0){const p=(i-1)>>1;if(hd[p]<=d)break;hk[i]=hk[p];hd[i]=hd[p];i=p}hk[i]=k;hd[i]=d}
function hpop(){const k=hk[0],lk=hk[--hn],ld=hd[hn];let i=0;for(;;){let c=2*i+1;if(c>=hn)break;if(c+1<hn&&hd[c+1]<hd[c])c++;if(hd[c]>=ld)break;hk[i]=hk[c];hd[i]=hd[c];i=c}hk[i]=lk;hd[i]=ld;return k}
const DIRS=[[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,1.414],[1,-1,1.414],[-1,1,1.414],[-1,-1,1.414]];
function buildField(){fieldT=ZA.survivors().filter(b=>b.pos);dist.fill(1e9);hn=0;
 fieldT.forEach((t,i)=>{const k=cell(t.pos.x,t.pos.z);if(k<0)return;dist[k]=0;src[k]=i;hpush(k,0)});
 while(hn){const d=hd[0],k=hpop();if(d>dist[k]||d>140)continue;const i=k%W,j=(k/W)|0;
  for(const[dx,dz,c] of DIRS){const ni=i+dx,nj=j+dz;if(ni<0||nj<0||ni>=W||nj>=D)continue;const nk=nj*W+ni;if(!WK[nk])continue;if(c>1&&(!WK[k+dx]||!WK[k+dz*W]))continue;
   const nd=d+c+(NW[nk]?.8:0);if(nd<dist[nk]){dist[nk]=nd;src[nk]=src[k];hpush(nk,nd)}}}}
const OFF=[[0,0],[.3,.3],[-.3,.3],[.3,-.3],[-.3,-.3]];
function clearLine(ax,az,bx,bz){const dx=bx-ax,dz=bz-az,L=Math.hypot(dx,dz),n=Math.ceil(L/.4);for(let i=1;i<=n;i++){const x=ax+dx*i/n,z=az+dz*i/n;for(const o of OFF){const k=cell(x+o[0],z+o[1]);if(k<0||!WK[k])return false}}return true}
function bestNb(k){const i=k%W,j=(k/W)|0;let b=-1,bd=dist[k];for(const[dx,dz,c] of DIRS){const ni=i+dx,nj=j+dz;if(ni<0||nj<0||ni>=W||nj>=D)continue;const nk=nj*W+ni;if(c>1&&(!WK[k+dx]||!WK[k+dz*W]))continue;if(dist[nk]<bd){bd=dist[nk];b=nk}}return b}
const cx=k=>X0+(k%W)+.5,cz=k=>Z0+((k/W)|0)+.5;
function nearestSurv(p){let best=null,bd=1e9;for(const t of ZA.survivors()){const d=Math.hypot(t.pos.x-p.x,t.pos.z-p.z);if(d<bd){bd=d;best=t}}return best}
// steer direction toward the nearest survivor along the flow field; returns the real target body
ZA.navDir=function(b,out){out=out||new V3();let k=cell(b.pos.x,b.pos.z);if(k<0){out.set(0,0,0);return null}
 if(dist[k]>=1e8){const nb=bestNb(k);if(nb<0||dist[nb]>=1e8){const t=nearestSurv(b.pos);if(!t){out.set(0,0,0);return null}out.set(t.pos.x-b.pos.x,0,t.pos.z-b.pos.z).normalize();return t}k=nb}
 const t=fieldT[src[k]]||nearestSurv(b.pos);
 const path=[];let c=k;for(let s=0;s<7;s++){const n=bestNb(c);if(n<0)break;path.push(n);c=n;if(dist[n]===0)break}
 let tgt=path.length?path[0]:k;for(let s=path.length-1;s>0;s--)if(clearLine(b.pos.x,b.pos.z,cx(path[s]),cz(path[s]))){tgt=path[s];break}
 out.set(cx(tgt)-b.pos.x,0,cz(tgt)-b.pos.z);if(out.lengthSq()<1e-4&&t)out.set(t.pos.x-b.pos.x,0,t.pos.z-b.pos.z);out.normalize();return t};
const _dir=new V3();
function navTick(b,dt){b.think=1;b._nt=(b._nt||0)-dt;if(!b._px){b._px={id:'',team:0,pos:new V3(),cr:false,real:null};b._wp=new V3();b._lp=new V3().copy(b.pos);b._st=0}
 const px=b._px;
 if(b._nt<=0){b._nt=.22+Math.random()*.12;let t=ZA.navDir(b,_dir);if(!t){b.target=null;return}
  const direct=Math.hypot(t.pos.x-b.pos.x,t.pos.z-b.pos.z)<16&&clearLine(b.pos.x,b.pos.z,t.pos.x,t.pos.z);
  b._wp.set(b.pos.x+_dir.x*3,b.pos.y,b.pos.z+_dir.z*3);px.id=t.id;px.real=t;px.cr=t.cr;px.pos=direct?t.pos:b._wp;
  // unstick: little sidestep if we barely moved for ~1.5 s
  if(b.pos.distanceTo(b._lp)<.25){b._st+=b._nt;if(b._st>1.4){b._st=0;b._wp.x+=(Math.random()-.5)*4;b._wp.z+=(Math.random()-.5)*4;px.pos=b._wp;b.vy=b.ground?7:b.vy}}else b._st=0;b._lp.copy(b.pos)}
 if(px.real&&px.real.pos&&!ZA.survivors().some(s=>s.id===px.id))b._nt=0;
 b.target=px.real?px:null}
// ---------- doors ----------
const doorOpen=M.doors.map(()=>false),doorAnim=[];
function doorCells(d,f){const c=d.cells;for(let x=c[0];x<=c[2];x++)for(let z=c[1];z<=c[3];z++){const k=cell(x+.5,z+.5);if(k>=0)f(k)}}
function setDoor(i,open,fx){const d=M.doors[i];if(doorOpen[i]===open)return;doorOpen[i]=open;doorCells(d,k=>{H[k]=open?0:6;C[k]=open?0:2;G[k]=open?0:2});
 const g=M.doorMeshes[i];if(open){if(fx){doorAnim.push({g,t:0});puff(new V3(d.x,1,d.z),0x8a7a60,3,1.2,.8);blip(70,.18,.7,'sawtooth');setTimeout(()=>blip(110,.1,.4,'square'),120)}else g.visible=false;for(const z of d.zones)zoneOpen[z]=true}
 else{g.visible=true;g.position.y=0}
 const mk=ZA.markers.findIndex(m=>m.id==='door'+i);if(open&&mk>=0)ZA.markers.splice(mk,1);if(!open&&mk<0)ZA.markers.push({id:'door'+i,pos:new V3(d.x,0,d.z),color:'#e9c46a',shape:'door'});
 rebuildWalk();fieldAge=9;paintRadar()}
function openDoor(i,by,fx){if(doorOpen[i])return;const d=M.doors[i];const newZ=d.zones.filter(z=>!zoneOpen[z]);setDoor(i,true,fx);
 if(fx){const nm=by===me.id?'You':nameOf(by);feed(nm+' cleared the '+d.name,'#e9c46a');if(newZ.length)center('',M.zones[newZ[0]].name.toUpperCase()+' IS OPEN','#e9c46a')}}
M.doors.forEach((d,i)=>{ZA.markers.push({id:'door'+i,pos:new V3(d.x,0,d.z),color:d.power?'#7fd0ff':'#e9c46a',shape:'door'});
 ZA.addUse({id:'door'+i,pos:new V3(d.x,0,d.z),r:Math.max(2.6,d.w/2+1.6),hold:0,ok:()=>!doorOpen[i]&&RS.ph!=='over',
  label:()=>d.power?'<b style="color:#7fd0ff">Needs power</b> · find the power switch to open the '+d.name:'Press <b>E</b> to clear the '+d.name+' · <b>'+d.cost+'</b>'+(me.money<d.cost?' <span class="st">(not enough points)</span>':''),
  use:()=>{if(doorOpen[i])return;if(d.power){center('','This door opens when the power is on','#7fd0ff');blip(200,.08,.15);return}if(me.money<d.cost){center('','Not enough points ('+d.cost+')');blip(200,.08,.15);return}me.money-=d.cost;
   if(isHost){openDoor(i,me.id,true);bcast({t:'ev',e:'zmDoor',i,by:me.id})}else{openDoor(i,me.id,true);send({t:'ev',e:'zmDoor',i,by:me.id})}}})});
// ---------- power switch: turning it on opens every door marked power:true (the map's connector doors) ----------
let powerOn=false,powerLever=null;ZA.powerOn=()=>powerOn;
function turnPower(by,fx){if(powerOn)return;powerOn=true;if(powerLever)powerLever.rotation.x=-.9;
 M.doors.forEach((d,i)=>{if(d.power&&!doorOpen[i])openDoor(i,by,fx)});
 const mk=ZA.markers.findIndex(m=>m.id==='power');if(mk>=0)ZA.markers.splice(mk,1);
 if(fx){const nm=by===me.id?'You':by?nameOf(by):'Someone';center('POWER IS ON',nm+' turned on the power · the connector doors are open','#7fd0ff');feed(nm+' turned on the power','#7fd0ff');blip(90,.3,.9,'sawtooth');setTimeout(()=>blip(440,.12,.4,'square'),250);setTimeout(()=>blip(660,.1,.5,'square'),450)}
 ZA.emit&&ZA.emit('power',by)}
if(M.power){const [px,pz,py]=M.power,g=new THREE.Group(),dark=new THREE.MeshLambertMaterial({color:0x2a2c2a}),yel=new THREE.MeshLambertMaterial({color:0xc8a020}),red=new THREE.MeshBasicMaterial({color:0xff3020}),hy=hAt(px,pz);
 const box=new THREE.Mesh(new THREE.BoxGeometry(.9,1.2,.25),dark);box.position.y=1.5;g.add(box);
 const stripe=new THREE.Mesh(new THREE.BoxGeometry(.92,.12,.26),yel);stripe.position.y=2.02;g.add(stripe);
 const lamp=new THREE.Mesh(new THREE.BoxGeometry(.12,.12,.06),red);lamp.position.set(.3,1.85,.14);g.add(lamp);
 powerLever=new THREE.Group();powerLever.position.set(0,1.4,.15);powerLever.rotation.x=.9;const arm=new THREE.Mesh(new THREE.BoxGeometry(.08,.5,.08),dark);arm.position.y=.25;powerLever.add(arm);
 const knob=new THREE.Mesh(new THREE.BoxGeometry(.16,.12,.16),yel);knob.position.y=.52;powerLever.add(knob);g.add(powerLever);
 g.position.set(px,hy,pz);g.rotation.y=py||0;scene.add(g);ZA.powerSwitch=g;
 ZA.on&&ZA.on('power',()=>{lamp.material=new THREE.MeshBasicMaterial({color:0x40ff60})});
 const up=new V3(px+Math.sin(py||0)*.8,0,pz+Math.cos(py||0)*.8);
 ZA.markers.push({id:'power',pos:up.clone(),color:'#ffe14a',shape:'bolt'});
 ZA.addUse({id:'power',pos:up,r:2.4,hold:0,ok:()=>!powerOn&&RS.ph!=='over',label:()=>'Press <b>E</b> to turn on the <b style="color:#7fd0ff">power</b>',
  use:()=>{if(powerOn)return;turnPower(me.id,true);if(isHost)bcast({t:'ev',e:'zmPower',by:me.id});else send({t:'ev',e:'zmPower',by:me.id})}})}
// ---------- barricade windows ----------
const NB=5,boards=M.windows.map(()=>NB),winBusy=M.windows.map(()=>null);let repPts=0;
function setBoards(w,n,fx){n=Math.max(0,Math.min(NB,n));const o=boards[w];if(o===n)return;boards[w]=n;for(let b=0;b<NB;b++)M.setBoard(w,b,b<n);
 if(fx){const W_=M.windows[w],p=new V3(W_.x,1.2,W_.z),d=Math.hypot(p.x-me.pos.x,p.z-me.pos.z);
  if(n<o){puff(p,0x9a7a50,.8,.5,.4);if(d<30)blip(140+Math.random()*60,.1*(1-d/30)+.02,.12,'square')}else if(d<30)blip(420,.06*(1-d/30)+.02,.06,'square')}}
ZA.repairAllBarricades=function(){for(let w=0;w<boards.length;w++)setBoards(w,NB,false);if(isHost)bcast({t:'ev',e:'zmState',...state()})};
ZA.windows=M.windows;ZA.boards=boards;
M.windows.forEach((w,i)=>{const ip=new V3(w.x+w.n[0]*1.1,0,w.z+w.n[1]*1.1);
 ZA.addUse({id:'win'+i,pos:ip,r:2.3,hold:.6,ok:()=>boards[i]<NB&&RS.ph!=='over'&&zoneOpen[w.zone],
  label:()=>'Hold <b>E</b> to rebuild the barricade'+(repPts<50?' · +10':''),
  use:()=>{if(boards[i]>=NB)return;setBoards(i,boards[i]+1,true);if(repPts<50){repPts+=10;pts(10,'repair',ip)}
   if(isHost)bcast({t:'ev',e:'zmBoards',w:i,n:boards[i]});else send({t:'ev',e:'zmRep',w:i})}})});
// ---------- wall-buys ----------
M.wallbuys.forEach((wb,i)=>{const G_=GUNS[wb.g];if(!G_)return;const p=new V3(wb.x+Math.sin(wb.yaw)*.8,0,wb.z+Math.cos(wb.yaw)*.8);
 ZA.markers.push({id:'wb'+i,pos:p,color:'#cfd8ff',shape:'gun'});const half=Math.round(wb.cost/2/10)*10;
 const owned=()=>me.inv.p===wb.g||me.inv.s===wb.g;
 ZA.addUse({id:'wb'+i,pos:p,r:1.9,hold:0,ok:()=>RS.ph!=='over',
  label:()=>owned()?'Press <b>E</b> for '+G_.n+' ammo · <b>'+half+'</b>':'Press <b>E</b> to buy '+G_.n+' · <b>'+wb.cost+'</b>',
  use:()=>{const own=owned(),c=own?half:wb.cost;if(me.money<c){center('','Not enough points ('+c+')');blip(200,.08,.15);return}
   if(own){const a=me.ammo[wb.g];if(a&&a[0]>=G_.mag&&a[1]>=G_.res){center('','Ammo is full');return}me.money-=c;me.ammo[wb.g]=[G_.mag,G_.res];center('',G_.n+' ammo refilled','#e9c46a');blip(500,.08,.12,'triangle')}
   else{me.money-=c;giveGun(wb.g);switchTo(G_.slot===1?'p':'s');center('WALL BUY',G_.n,'#e9c46a');blip(660,.1,.15,'triangle');setTimeout(()=>blip(880,.1,.2,'triangle'),110)}}})});
// ---------- traps ----------
const TRAP_COST=1000,TRAP_ON=20,TRAP_CD=45;
const traps=M.traps.map((t,i)=>{const c=t.cells,o={...t,i,act:0,cd:0,by:null,x0:c[0],z0:c[1],x1:c[2]+1,z1:c[3]+1};
 const g=new THREE.Group();scene.add(g);o.g=g;
 // switch panel
 const sw=new THREE.Group();sw.position.set(t.sw.x,t.sw.y,t.sw.z);sw.rotation.y=t.sw.yaw;g.add(sw);
 sw.add(new THREE.Mesh(new THREE.BoxGeometry(.5,.7,.12),new THREE.MeshLambertMaterial({color:0x4a4f48})));
 const lever=new THREE.Mesh(new THREE.BoxGeometry(.06,.3,.06),new THREE.MeshLambertMaterial({color:0x222222}));lever.position.set(0,0,.1);sw.add(lever);o.lever=lever;
 o.lamp=new THREE.Mesh(new THREE.BoxGeometry(.12,.08,.04),new THREE.MeshBasicMaterial({color:0x40ff60}));o.lamp.position.set(0,.26,.07);sw.add(o.lamp);
 const w=o.x1-o.x0,d=o.z1-o.z0,mx=(o.x0+o.x1)/2,mz=(o.z0+o.z1)/2;
 if(t.kind==='fire'){const gc=document.createElement('canvas');gc.width=gc.height=64;const q=gc.getContext('2d');q.fillStyle='#1a1a1a';q.fillRect(0,0,64,64);q.strokeStyle='#5a5a58';q.lineWidth=3;for(let a=4;a<64;a+=10){q.beginPath();q.moveTo(a,0);q.lineTo(a,64);q.stroke();q.beginPath();q.moveTo(0,a);q.lineTo(64,a);q.stroke()}
  const tx=new THREE.CanvasTexture(gc);tx.wrapS=tx.wrapT=THREE.RepeatWrapping;tx.repeat.set(w,d);const gp=new THREE.Mesh(new THREE.PlaneGeometry(w,d).rotateX(-Math.PI/2),new THREE.MeshLambertMaterial({map:tx}));gp.position.set(mx,.03,mz);gp.receiveShadow=true;g.add(gp);
  const fm=new THREE.MeshBasicMaterial({color:0xff7a20,transparent:true,opacity:.75,depthWrite:false,blending:THREE.AdditiveBlending}),fg=new THREE.ConeGeometry(.32,1.6,6);fg.translate(0,.8,0);o.fl=[];
  for(let n=0;n<10;n++){const f=new THREE.Mesh(fg,fm);f.position.set(o.x0+.3+Math.random()*(w-.6),.05,o.z0+.3+Math.random()*(d-.6));f.visible=false;g.add(f);o.fl.push(f)}
  o.glow=new THREE.Mesh(new THREE.PlaneGeometry(w+1.5,d+1.5).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xff5a10,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));o.glow.position.set(mx,.06,mz);g.add(o.glow)}
 else{const along=w>d,len=along?w:d,pm=new THREE.MeshLambertMaterial({color:0x5a5a50});o.wm=new THREE.MeshBasicMaterial({color:0x303838});
  for(const s of[-1,1]){const p=new THREE.Mesh(new THREE.BoxGeometry(.2,2.4,.2),pm);p.position.set(along?mx+s*(len/2-.15):mx,1.2,along?mz:mz+s*(len/2-.15));g.add(p);
   const ins=new THREE.Mesh(new THREE.BoxGeometry(.3,.3,.3),new THREE.MeshLambertMaterial({color:0xc8c040}));ins.position.copy(p.position);ins.position.y=2.4;g.add(ins)}
  for(let n=0;n<5;n++){const wr=new THREE.Mesh(new THREE.BoxGeometry(along?len-.3:.03,.03,along?.03:len-.3),o.wm);wr.position.set(mx,.35+n*.45,mz);g.add(wr)}}
 ZA.addUse({id:'trap'+i,pos:new V3(t.sw.x+Math.sin(t.sw.yaw)*.7,0,t.sw.z+Math.cos(t.sw.yaw)*.7),r:2,hold:0,ok:()=>RS.ph!=='over'&&zoneOpen[t.zone],
  label:()=>o.act>0?t.name+' is running · '+Math.ceil(o.act)+'s':o.cd>0?t.name+' recharging · '+Math.ceil(o.cd)+'s':'Press <b>E</b> to activate the '+t.name+' · <b>'+TRAP_COST+'</b>',
  use:()=>{if(o.act>0||o.cd>0)return;if(me.money<TRAP_COST){center('','Not enough points ('+TRAP_COST+')');return}me.money-=TRAP_COST;
   if(isHost){trapOn(i,me.id);bcast({t:'ev',e:'zmTrap',i,by:me.id})}else{trapOn(i,me.id);send({t:'ev',e:'zmTrap',i,by:me.id})}}});
 ZA.markers.push({id:'trap'+i,pos:new V3(mx,0,mz),color:'#ff7a40',shape:'trap'});return o});
function trapOn(i,by,act){const o=traps[i];if(!o)return;o.act=act!=null?act:TRAP_ON;o.cd=o.act+TRAP_CD;o.by=by;if(near(o.sw,40)){blip(o.kind==='fire'?90:1400,.12,.6,o.kind==='fire'?'sawtooth':'square')}if(by===me.id)center('',o.name+' active','#ff9a50')}
ZA.traps=traps;
// ---------- net ----------
function state(){return{power:powerOn?1:0,doors:doorOpen.map(x=>x?1:0),boards:boards.slice(),traps:traps.map(o=>[+o.act.toFixed(1),+o.cd.toFixed(1),o.by])}}
function applyState(s){if(!s)return;if(s.power&&!powerOn)turnPower(null,false);(s.doors||[]).forEach((v,i)=>{if(v&&!doorOpen[i])openDoor(i,null,false)});(s.boards||[]).forEach((n,w)=>setBoards(w,n,false));
 (s.traps||[]).forEach((a,i)=>{const o=traps[i];if(o){o.act=a[0];o.cd=a[1];o.by=a[2]}})}
ZA.on('ev',m=>{if(!m||!m.e||m.e.slice(0,2)!=='zm')return;
 if(m.e==='zmDoor'){if(m.by!==me.id)openDoor(m.i,m.by,true)}
 else if(m.e==='zmPower'){if(m.by!==me.id)turnPower(m.by,true)}
 else if(m.e==='zmBoards')setBoards(m.w,m.n,true);
 else if(m.e==='zmTrap'){if(m.by!==me.id||!traps[m.i].act)trapOn(m.i,m.by)}
 else if(m.e==='zmState')applyState(m);
 return true});
const _hostMsg=hostMsg;window.hostMsg=function(c,m){if(m&&m.t==='ev'&&typeof m.e==='string'&&m.e.slice(0,2)==='zm'){m.by=c.peer;
 if(m.e==='zmDoor'){if(!doorOpen[m.i]){openDoor(m.i,m.by,true);bcast(m)}}
 else if(m.e==='zmPower'){if(!powerOn){turnPower(m.by,true);bcast(m)}}
 else if(m.e==='zmRep'){const n=Math.min(NB,boards[m.w]+1);setBoards(m.w,n,true);bcast({t:'ev',e:'zmBoards',w:m.w,n})}
 else if(m.e==='zmTrap'){const o=traps[m.i];if(o&&o.act<=0&&o.cd<=0){trapOn(m.i,m.by);bcast(m)}else c.send({t:'ev',e:'zmState',...state()})}
 return}return _hostMsg(c,m)};
// ---------- body blocking at windows (bullets still pass above the sill) ----------
const _blocked=blocked;window.blocked=function(x,z,y){if(_blocked(x,z,y))return true;for(const dx of[-RAD,RAD])for(const dz of[-RAD,RAD]){const k=cell(x+dx,z+dz);if(k>=0&&WB[k])return true}return false};
// ---------- spawning ----------
const groundCells=M.zones.map(()=>[]);for(let k=0;k<NN;k++)if(ZN[k]>=0&&WK[k]&&!NW[k]&&H[k]===0&&G[k]===0)groundCells[ZN[k]].push(k);
let _pick=null;
ZA.zSpawnPos=function(){const S=ZA.survivors();const dmin=p=>{let d=1e9;for(const b of S)d=Math.min(d,Math.hypot(b.pos.x-p.x,b.pos.z-p.z));return d};
 const wins=[];M.windows.forEach((w,i)=>{if(!zoneOpen[w.zone])return;const o={x:w.x-w.n[0]*1.4,z:w.z-w.n[1]*1.4},d=dmin(o);if(d>=14&&d<=55)wins.push({i,o,d})});
 if(wins.length&&Math.random()<.78){const busy=i=>bots.filter(b=>b.zombie&&b.alive&&b.win===i&&b.atWindow).length;wins.sort((a,b)=>busy(a.i)-busy(b.i)+(Math.random()-.5)*1.5);const w=wins[0];
  _pick={v:new V3(w.o.x,0,w.o.z),win:w.i};return _pick.v}
 const open=[];zoneOpen.forEach((o,i)=>{if(o)open.push(i)});let best=null,bd=-1;
 for(let t=0;t<40;t++){const zc=groundCells[open[Math.random()*open.length|0]];if(!zc||!zc.length)continue;const k=zc[Math.random()*zc.length|0],p={x:cx(k),z:cz(k)},d=dmin(p);
  if(d>=18&&d<=50){best=p;break}if(d>10&&(bd<0||Math.abs(d-30)<Math.abs(bd-30))){best=p;bd=d}}
 if(!best&&wins.length){const w=wins[0];_pick={v:new V3(w.o.x,0,w.o.z),win:w.i};return _pick.v}
 if(!best){const w=M.windows.find(w=>zoneOpen[w.zone]);const i=M.windows.indexOf(w);_pick={v:new V3(w.x-w.n[0]*1.4,0,w.z-w.n[1]*1.4),win:i};return _pick.v}
 _pick={v:new V3(best.x,0,best.z),win:-1};return _pick.v};
function assign(b,pk){b.win=pk.win;if(pk.win>=0){const w=M.windows[pk.win];b.atWindow=true;b.yaw=Math.atan2(-w.n[0],-w.n[1]);b.tearT=0;b.climb=null}
 else{b.atWindow=true;b.rise=1.3;b.pos.y=-1.7;b.yaw=Math.random()*6.28}}
ZA.on('spawn',b=>{if(_pick&&b.pos===_pick.v){assign(b,_pick);_pick=null;return}if(b.noRelocate)return;
 const z=M.zoneAt(b.pos.x,b.pos.z);if(z<0||!zoneOpen[z]||(b.pos.x===0&&b.pos.z===100)){const v=ZA.zSpawnPos(),pk=_pick;b.pos.copy(v);_pick=null;if(pk)assign(b,pk)}});
// ---------- zombie behaviour at windows / rising, then flow-field navigation ----------
const _o=new V3(),_i=new V3();
function pose(b,dt,spd,sw){b.o.visible=true;ZA.hideGun(b.o);b.o.position.copy(b.pos);b.o.rotation.y=b.yaw;animSoldier(b.o,spd,sw,dt,false)}
ZA.on('zombieTick',(b,dt)=>{
 if(b.rise>0){b.rise-=dt;b.pos.y=-1.7*Math.max(0,b.rise/1.3);if(Math.random()<dt*6)puff(new V3(b.pos.x+(Math.random()-.5),.1,b.pos.z+(Math.random()-.5)),0x3a2e1e,.7,.6,.4);
  if(b.rise<=0){b.rise=0;b.pos.y=0;b.atWindow=false}pose(b,dt,0,-.4);return true}
 if(b.atWindow&&b.win>=0){const wi=b.win,w=M.windows[wi],n=w.n;b.cd=(b.cd||0)-dt;b.swing=Math.max(0,(b.swing||0)-dt);
  _o.set(w.x-n[0]*1.4,0,w.z-n[1]*1.4);_i.set(w.x+n[0]*1.3,0,w.z+n[1]*1.3);b.yaw=Math.atan2(-n[0],-n[1]);
  if(RS.ph==='over'){pose(b,dt,0,.15);return true}
  if(b.climb!=null){b.climb+=dt/.9;const t=Math.min(1,b.climb);b.pos.lerpVectors(_o,_i,t);b.pos.y=Math.sin(t*Math.PI)*1.15;pose(b,dt,3,-.3);
   if(t>=1){b.climb=null;b.atWindow=false;b.pos.y=0;winBusy[wi]=null}return true}
  const fb=winBusy[wi];if(fb&&fb!==b&&(!fb.alive||!fb.atWindow||fb.win!==wi||bots.indexOf(fb)<0))winBusy[wi]=null;
  let goal=_o;if(winBusy[wi]&&winBusy[wi]!==b){if(!b._q)b._q=(Math.random()-.5)*2.4;goal=new V3(_o.x-n[0]*1.3+n[1]*b._q,0,_o.z-n[1]*1.3+n[0]*b._q)}else winBusy[wi]=b;
  const dx=goal.x-b.pos.x,dz=goal.z-b.pos.z,L=Math.hypot(dx,dz);let spd=0;
  if(L>.12){const s=Math.min(L,b.spd*.7*dt);b.pos.x+=dx/L*s;b.pos.z+=dz/L*s;spd=b.spd*.7}
  else if(winBusy[wi]===b){if(boards[wi]>0){b.tearT=(b.tearT||0)+dt;if(b.tearT>1.2){b.tearT=0;b.swing=.35;setBoards(wi,boards[wi]-1,true);bcast({t:'ev',e:'zmBoards',w:wi,n:boards[wi]})}}else b.climb=0}
  // claw survivors standing at the window
  if(b.cd<=0&&RS.ph==='live')for(const t of ZA.survivors()){if(Math.hypot(t.pos.x-b.pos.x,t.pos.z-b.pos.z)<2.1&&Math.abs(t.pos.y-b.pos.y)<1.6){b.cd=1.1;b.swing=.3;applyHit(t.id,ZA.zDmg(RS.rnd),b.id,false,'knife');break}}
  pose(b,dt,spd,b.swing>0||(winBusy[wi]===b&&boards[wi]>0&&L<=.12&&b.tearT>.8)?-.5:.15);return true}
 navTick(b,dt)});
// ---------- per-frame ----------
let stT=0;
ZA.on('hostTick',dt=>{fieldAge+=dt;if(fieldAge>.4){fieldAge=0;buildField()}
 for(const o of traps){if(o.act<=0)continue;for(const b of bots){if(!b.zombie||!b.alive||b.atWindow)continue;if(b.pos.x>o.x0-.25&&b.pos.x<o.x1+.25&&b.pos.z>o.z0-.25&&b.pos.z<o.z1+.25)applyHit(b.id,9999,o.by||me.id,false,'trap')}}
 stT+=dt;if(stT>4){stT=0;if(Object.keys(conns).length)bcast({t:'ev',e:'zmState',...state()})}});
let sparkT=0;
ZA.on('tick',dt=>{
 for(let a=doorAnim.length-1;a>=0;a--){const d=doorAnim[a];d.t+=dt;d.g.position.y=-d.t*d.t*3;if(d.t>1){d.g.visible=false;d.g.position.y=0;doorAnim.splice(a,1)}}
 sparkT-=dt;const now=performance.now()/1000;
 for(const o of traps){const on=o.act>0;if(on)o.act=Math.max(0,o.act-dt);if(o.cd>0)o.cd=Math.max(0,o.cd-dt);
  o.lamp.material.color.setHex(on?0xff3a20:o.cd>0?0xffa020:0x40ff60);o.lever.rotation.x=on?.9:-.5;
  if(o.kind==='fire'){for(let n=0;n<o.fl.length;n++){const f=o.fl[n];f.visible=on;if(on){f.scale.set(1,.6+.5*Math.abs(Math.sin(now*9+n*1.7)),1);f.rotation.y=now*3+n}}o.glow.material.opacity=on?.35+.1*Math.sin(now*20):0}
  else{o.wm.color.setHex(on?(Math.random()<.5?0x9ff0ff:0x3aa0ff):0x303838);if(on&&sparkT<=0&&near({x:(o.x0+o.x1)/2,z:(o.z0+o.z1)/2},40)){const p=new V3(o.x0+Math.random()*(o.x1-o.x0),.3+Math.random()*1.9,o.z0+Math.random()*(o.z1-o.z0));puff(p,0x9fe8ff,.35,.15,0,null,2)}}}
 if(sparkT<=0)sparkT=.12});
// ---------- reset per game, repair cap per wave ----------
function resetMap(){powerOn=false;if(powerLever)powerLever.rotation.x=.9;if(M.power&&!ZA.markers.some(m=>m.id==='power')){const [px,pz,py]=M.power;ZA.markers.push({id:'power',pos:new V3(px+Math.sin(py||0)*.8,0,pz+Math.cos(py||0)*.8),color:'#ffe14a',shape:'bolt'})}
 M.doors.forEach((d,i)=>setDoor(i,false,false));zoneOpen.fill(false);zoneOpen[0]=true;doorAnim.length=0;M.doorMeshes.forEach(g=>{g.visible=true;g.position.y=0});
 for(let w=0;w<boards.length;w++){setBoards(w,NB,false);winBusy[w]=null}traps.forEach(o=>{o.act=0;o.cd=0;o.by=null});rebuildWalk();paintRadar()}
ZA.resetMap=resetMap;
ZA.on('waveStart',(r,fresh)=>{repPts=0;if(fresh)resetMap()});
// ---------- spawn points: game start on Main Street, later respawns next to a teammate ----------
const _sp=spawnPoint;window.spawnPoint=function(team){if(RS.mode!=='zombies'||team!==0)return _sp(team);
 const free=(x,z)=>{const k=cell(x,z);return k>=0&&ZN[k]>=0&&H[k]<.2&&!NW[k]};
 if(RS.rnd>1||RS.since>2){const al=bodies().filter(b=>b.team===0&&b.id!==me.id&&b.pos&&M.zoneAt(b.pos.x,b.pos.z)>=0);if(al.length){const a=al[Math.random()*al.length|0];for(let t=0;t<30;t++){const r=1.5+Math.random()*2.5,an=Math.random()*6.28,x=a.pos.x+Math.cos(an)*r,z=a.pos.z+Math.sin(an)*r;if(free(x,z)&&clearLine(a.pos.x,a.pos.z,x,z))return new V3(x,0,z)}}}
 for(let t=0;t<40;t++){const x=SPAWN[0].x+(Math.random()-.5)*9,z=SPAWN[0].z+(Math.random()-.5)*6;if(free(x,z))return new V3(x,0,z)}return new V3(SPAWN[0].x,0,SPAWN[0].z)};
// survivors who are still standing keep their spot when a new wave starts
const _ors=onRoundStart;window.onRoundStart=function(m){const keep=!m.reset&&running&&me.alive?me.pos.clone():null,ky=me.yaw,kp=me.pitch;_ors(m);// stay where you are between waves: also in doorways, on ledges and outside the zone rectangles (only a spot inside a wall sends you back)
 if(keep&&(M.zoneAt(keep.x,keep.z)>=0||!blocked(keep.x,keep.z,keep.y+.3))){me.pos.copy(keep);me.yaw=ky;me.pitch=kp}};
// Mystery Box starts on box spot 0
ZA.on('begin',()=>{const b=ZA.Z.boxMesh,s=ZA.boxSpots[0];if(b&&s){b.position.set(s.x,0,s.z);b.rotation.y=s.yaw}});
// ---------- radar map ----------
function paintRadar(){if(typeof radMap==='undefined')return;const g=radMap.getContext('2d');
 const col=['#24281c','#3a3a3c','#6a6862','#3e3d3b','#3c4a2c','#5a4630','#6a6a64','#5e5e5a','#36422a','#5a5244'];
 for(let j=0;j<D;j++)for(let i=0;i<W;i++){const k=j*W+i;let c=col[T[k]];if(G[k]===2&&H[k]>2)c='#c8962a';else if(WB[k])c='#9a6a3a';else if(H[k]>=2.5)c=ZN[k]<0&&T[k]===0?'#141612':'#0c0c0c';else if(H[k]>.9)c='#55524a';g.fillStyle=c;g.fillRect(i*2,j*2,2,2)}}
paintRadar();
})();
