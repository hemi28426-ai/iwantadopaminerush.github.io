// ================= MYSTERY MANSION =================
// Murder-mystery party mode for Unbloxed: one secret murderer (knife), one sheriff (toy blaster), everyone else innocent.
// Cartoony: a hit makes the character go POOF (smoke puff + little ghost) and fall over. No blood.
// Plugs into the main loop through window.MODES.mystery (tick / bot / spawnFor / attack).
(function(){
'use strict';
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
const LOBBY_T=12,ROUND_T=150,END_T=6,GRACE=8;
const ROLE={innocent:{n:'INNOCENT',c:'#3ce37a',tip:'Collect coins and stay away from the murderer!'},
 sheriff:{n:'SHERIFF',c:'#3aa0ff',tip:'Find the murderer and zap them with your blaster. Don’t hit an innocent!'},
 murderer:{n:'MURDERER',c:'#ff3b4a',tip:'Knock everyone out before time runs out. Click = stab, F = throw.'}};
const BOTNAMES=['Blox','Nub','Zed','Kiko','Rusty','Pip','Vex','Moxie','Taco','Jinx','Bolt','Fizz','Pokk','Lumo','Gritz','Dax','Fenn','Nova','Bean','Ziggy','Pebble','Mochi'];
const HELP0=$('help').textContent;
let MM=null;

// ---------- shared meshes ----------
const COING=new THREE.CylinderGeometry(.6,.6,.16,22),COINM=new THREE.MeshStandardMaterial({color:'#ffd24a',metalness:.6,roughness:.3,emissive:'#8a6400',emissiveIntensity:.5});
const PUFFG=new THREE.SphereGeometry(1,14,10);
function blasterMesh(scale){const g=new THREE.Group(),or=M('#ff8a1a',{roughness:.45}),cy=M('#33d1ff',{emissive:'#1590c0',emissiveIntensity:.8,roughness:.3}),dk=M('#2b2b38');
 const body=new THREE.Mesh(roundBox(.34,1.1,.48,.1),or);body.position.set(0,-.35,.32);g.add(body);// barrel points along local -y (forward when the arm is raised)
 const bar=new THREE.Mesh(new THREE.CylinderGeometry(.13,.15,.7,14),cy);bar.position.set(0,-1.15,.38);g.add(bar);
 const tip=new THREE.Mesh(new THREE.SphereGeometry(.17,12,10),new THREE.MeshBasicMaterial({color:'#bff6ff'}));tip.position.set(0,-1.5,.38);g.add(tip);
 const fin=new THREE.Mesh(new THREE.BoxGeometry(.08,.5,.26),cy);fin.position.set(0,-.25,.66);g.add(fin);
 const grip=new THREE.Mesh(roundBox(.26,.3,.5,.08),dk);grip.position.set(0,0,0);g.add(grip);
 g.scale.setScalar(scale||1);g.traverse(m=>{if(m.isMesh)m.castShadow=true});return g}
function knifeMesh(){const g=new THREE.Group();const b=new THREE.Mesh(new THREE.BoxGeometry(.1,.9,.22),M('#3a3a48',{metalness:.7,roughness:.3}));b.position.y=.55;
 const h=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.45,8),M('#5a3a22'));h.position.y=-.15;g.add(b,h);return g}
function gearOf(o){if(!o.mmGun){o.mmGun=blasterMesh(1);o.mmGun.position.set(0,-1.75,.1);o.c.aR.add(o.mmGun)}return o.mmGun}

// ---------- overlays ----------
function mkDiv(id,css){const d=document.createElement('div');d.id=id;d.style.cssText=css;document.body.appendChild(d);return d}
const card=mkDiv('mmCard','position:fixed;left:50%;top:40%;transform:translate(-50%,-50%);z-index:58;display:none;pointer-events:none;text-align:center;color:#fff;font-family:system-ui,Segoe UI,sans-serif;padding:22px 36px;border-radius:22px;background:rgba(14,10,32,.86);box-shadow:0 0 0 4px #fff3,0 14px 50px #000b;transition:transform .25s;max-width:90vw');
const outB=mkDiv('mmOut','position:fixed;left:50%;top:14%;transform:translateX(-50%);z-index:57;display:none;pointer-events:none;text-align:center;color:#fff;font:900 20px system-ui,sans-serif;padding:10px 20px;border-radius:14px;background:rgba(40,40,70,.82);text-shadow:0 2px 0 #000;max-width:90vw');
let cardT=0;
function showCard(html,secs){card.innerHTML=html;card.style.display='block';card.style.transform='translate(-50%,-50%) scale(.6)';requestAnimationFrame(()=>card.style.transform='translate(-50%,-50%) scale(1)');cardT=secs}
function hideAll(){card.style.display='none';outB.style.display='none';cardT=0}
$('back').addEventListener('click',()=>{hideAll();$('help').textContent=HELP0});

// ---------- world ----------
function bounds(m){let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9,y1=0;for(const p of m.parts){const r=Math.max(p[3],p[5])/2;x0=Math.min(x0,p[0]-r);x1=Math.max(x1,p[0]+r);z0=Math.min(z0,p[2]-r);z1=Math.max(z1,p[2]+r);y1=Math.max(y1,p[1]+p[4]/2)}return{x0,x1,z0,z1,y1}}
function buildHouse(m){const cylG=new THREE.CylinderGeometry(.5,.5,1,20),ballG=new THREE.SphereGeometry(.5,18,12);
 for(const p of m.parts){const[x,y,z,sx,sy,sz,rx,ry,rz,col,tr,cc,tg,name]=p;const isU=tg=='union'||tg=='mesh',big=Math.max(sx,sy,sz);
  if(isU&&big<.6)continue;// tiny bits of curved decor
  const door=/door/i.test(name||'');if(door&&isU)continue;// door frame union = a box that plugs the doorway
  let coll=cc!==0&&tr<1&&!door;
  if(isU&&sy>5&&Math.max(sx,sz)>4&&Math.min(sx,sz)<1.6)coll=false;// wall unions had doorways cut out: as a box they'd block them
  if(isU&&(Math.abs(rx)>.05||Math.abs(rz)>.05)&&!(sy<2.5&&sx*sz>150))coll=false;// tilted curved stuff
  if(isU&&sy<.5)coll=false;// rugs, carpets
  let mesh=null;
  if(tr<1){const mat=tr>0?new THREE.MeshStandardMaterial({color:col,transparent:true,opacity:1-tr,roughness:.6}):MC(col);
   if(tg=='cylinder'){mesh=new THREE.Group();const c=new THREE.Mesh(cylG,mat);c.rotation.z=Math.PI/2;c.castShadow=tr<.5;c.receiveShadow=true;mesh.add(c)}
   else if(tg=='ball'){mesh=new THREE.Mesh(ballG,mat);mesh.castShadow=true}
   else{mesh=new THREE.Mesh(UBOX,mat);mesh.castShadow=tr<.5;mesh.receiveShadow=true}
   mesh.scale.set(sx,sy,sz);mesh.position.set(x,y,z);mesh.rotation.set(rx,ry,rz,'YXZ');scene.add(mesh)}
  if(!coll)continue;
  const o=mesh&&mesh.isMesh?mesh:new THREE.Mesh(UBOX);if(o!==mesh){o.scale.set(sx,sy,sz);o.position.set(x,y,z);o.rotation.set(rx,ry,rz,'YXZ')}
  addPartSolids(o,sx,sy,sz,rx,rz)}}
// white picket fence with invisible tall walls so nobody leaves the garden
function fence(x0,z0,x1,z1){const P=[];const side=(ax,az,bx,bz)=>{const L=Math.hypot(bx-ax,bz-az),n=Math.ceil(L/1.4);for(let i=0;i<=n;i++)P.push([ax+(bx-ax)*i/n,az+(bz-az)*i/n,Math.atan2(bx-ax,bz-az)]);
  for(const h of[.7,1.7]){const r=new THREE.Mesh(UBOX,MC('#e9e4d6'));r.scale.set(.18,.22,L);r.position.set((ax+bx)/2,h,(az+bz)/2);r.rotation.y=Math.atan2(bx-ax,bz-az);r.castShadow=true;scene.add(r)}};
 side(x0,z0,x1,z0);side(x1,z0,x1,z1);side(x1,z1,x0,z1);side(x0,z1,x0,z0);
 const im=new THREE.InstancedMesh(UBOX,MC('#f6f2e6'),P.length),m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler();im.castShadow=im.receiveShadow=true;
 P.forEach(([x,z,a],i)=>{q.setFromEuler(e.set(0,a+Math.PI/2,0));m4.compose(V3(x,1.2,z),q,V3(.42,2.4,.16));im.setMatrixAt(i,m4)});scene.add(im);
 const W=(a,b,c,d)=>addSolid(new THREE.Box3(V3(a,-3,b),V3(c,14,d)));
 W(x0-1,z0-1,x1+1,z0+.3);W(x0-1,z1-.3,x1+1,z1+1);W(x0-1,z0-1,x0+.3,z1+1);W(x1-.3,z0-1,x1+1,z1+1)}
function bush(x,z,s){const b=new THREE.Mesh(new THREE.SphereGeometry(s,16,12),MC('#3f8f3a'));b.position.set(x,s*.6,z);b.scale.y=.8;b.castShadow=true;scene.add(b)}
// standable, roofed spots inside the house (for spawns and coins)
function spots(B){const out=[],box=new THREE.Box3();
 for(let x=Math.ceil(B.x0);x<=B.x1;x+=2)for(let z=Math.ceil(B.z0);z<=B.z1;z+=2){const nb=[...near(x,z)];
  for(const f of nb){if(!(x>f.min.x+.4&&x<f.max.x-.4&&z>f.min.z+.4&&z<f.max.z-.4))continue;const y=f.max.y;if(y<.5)continue;
   box.min.set(x-.95,y+.05,z-.95);box.max.set(x+.95,y+5.2,z+.95);let ok=true,roof=false;
   for(const b of nb){if(b===f)continue;if(box.intersectsBox(b)){ok=false;break}if(b.min.y>y+5&&b.min.y<y+20&&x>b.min.x&&x<b.max.x&&z>b.min.z&&z<b.max.z)roof=true}
   if(ok&&roof)out.push(V3(x,y,z))}}
 return out}
function buildWorld(){scene=skyScene(false);sun.color.set('#fff4e0');solids.length=0;GRID.clear();pickups.length=0;SPAWNS=[];PORTALS=[];
 scene.add(new THREE.AmbientLight('#fff2e0',.35));
 const keys=['mysteryHouse','mysteryClassic'].filter(k=>UBX_MAPS[k]&&UBX_MAPS[k].parts&&UBX_MAPS[k].parts.length);
 const key=keys.length?keys[Math.random()*keys.length|0]:null,m=key?UBX_MAPS[key]:{parts:[]};
 const B=m.parts.length?bounds(m):{x0:-20,x1:20,z0:-20,z1:20,y1:10};
 if(!m.parts.length){block(0,.5,0,40,1,40,'#a08060')}else buildHouse(m);
 const LX=(B.x0+B.x1)/2,LZ=B.z1+48;
 const gx0=B.x0-60,gx1=B.x1+60,gz0=B.z0-60,gz1=LZ+60;block((gx0+gx1)/2,-1,(gz0+gz1)/2,gx1-gx0,2,gz1-gz0,'#68a94a');
 fence(B.x0-10,B.z0-10,B.x1+10,B.z1+10);
 // a path of stepping stones and some bushes around the house
 for(let k=0;k<18;k++){const t=k/18*6.283,rx=(B.x1-B.x0)/2+6,rz=(B.z1-B.z0)/2+6;bush(LX+Math.sin(t)*rx,(B.z0+B.z1)/2+Math.cos(t)*rz,1.2+Math.random()*.8)}
 // lobby garden: wooden deck, benches, lamps, sign
 block(LX,.3,LZ,34,.6,34,'#b98b5a');fence(LX-18,LZ-18,LX+18,LZ+18);
 for(const[x,z,r]of[[-10,-8,0],[10,-8,0],[-10,8,0],[10,8,0]]){block(LX+x,1.2,LZ+z,6,.4,1.6,'#7a4a2a');block(LX+x-2.4,.85,LZ+z,.5,.5,1.2,'#3a2a1a');block(LX+x+2.4,.85,LZ+z,.5,.5,1.2,'#3a2a1a')}
 for(const s of[-1,1]){block(LX+s*15,3.5,LZ-15,.5,6,.5,'#2a2a34');const l=new THREE.PointLight('#ffd890',1.2,30);l.position.set(LX+s*15,7,LZ-15);scene.add(l);const g=new THREE.Mesh(new THREE.SphereGeometry(.6,14,10),new THREE.MeshBasicMaterial({color:'#ffe9a8'}));g.position.copy(l.position);scene.add(g)}
 for(const s of[-1,1])for(const t of[-1,1])bush(LX+s*21,LZ+t*21,1.6);
 const sign=label([['🔪 MYSTERY MANSION','#ff6b7a',40],['Lobby','#fff',28]],22,8.2);sign.position.set(LX,11,LZ-14);scene.add(sign);
 const board=stTag(18,4.5,512,128);board.position.set(LX,6.5,LZ-14);scene.add(board);
 const sp=spots(B);const lv={};for(const p of sp){const k=Math.round(p.y);lv[k]=(lv[k]||0)+1}
 let mainY=null,best=-1;for(const k in lv)if(lv[k]>best){best=lv[k];mainY=+k}
 let house=sp.filter(p=>Math.abs(p.y-mainY)<2.5);if(!house.length)house=[V3(LX,0,B.z1+5)];
 return{key,B,lobby:V3(LX,.6,LZ),coinSpots:sp.length?sp:house,house,board,mainY}}

// ---------- state ----------
function mmOf(o){return o.mm||(o.mm={role:null,alive:false,inHouse:false,coins:0,gun:false,hero:false,think:0,goal:null,goalT:0,stuck:0,detour:0,dx:0,dz:0,saw:null,sawT:0,flee:0,fleeFrom:null,stab:0,throwCd:0,shootCd:0,aim:0,windup:0,target:null,knife:0})}
function lobbySpot(){const L=MM.W.lobby;return V3(L.x+(Math.random()-.5)*24,L.y,L.z+(Math.random()-.5)*20)}
function houseSpot(){const H=MM.W.house;return H[Math.random()*H.length|0]}
function put(o,p){o.pos.set(p.x,p.y+.05,p.z);o.vel.set(0,0,0)}
function revive(o,inHouse){const m=mmOf(o);m.inHouse=inHouse;respawn(o);o.shield=0;o.ko=0;
 o.c.root.traverse(x=>{if(x.material&&x.material.userData&&x.material.userData.mmFade){x.material.transparent=false;x.material.opacity=1}});
 if(o==me)MM.wk=null}
function fadeBody(o){o.c.root.traverse(x=>{if(x.isMesh&&x.material&&x.material!==o.c.blade.material&&x!==o.bub&&!x.material.map){x.material.transparent=true;x.material.opacity=.45;x.material.userData.mmFade=1}})}
function botAvatar(){const used=new Set(chars.map(c=>c.a.name));const free=BOTNAMES.filter(n=>!used.has('🤖 '+n));const r=a=>a[Math.random()*a.length|0];
 return{name:'🤖 '+(free.length?r(free):'Bot'+(Math.random()*99|0)),head:r(PAL.slice(0,4)),torso:r(PAL.slice(4,14)),arms:r(PAL.slice(0,4)),legs:r(PAL.slice(9,16)),hat:Math.random()*HATS.length|0,face:Math.random()*FACES.length|0,sword:0,hair:Math.random()*HAIRS.length|0,hairColor:r(PAL)}}
function botJoin(quiet){const o=spawn(botAvatar(),true);mmOf(o);put(o,lobbySpot());o.shield=0;if(!quiet)log(`${esc(o.a.name)} joined`);return o}
function botLeave(o){if(o.mm&&o.mm.gun)dropGun(o);scene.remove(o.c.root);chars.splice(chars.indexOf(o),1);for(const c of chars)if(c.mm){if(c.mm.target==o)c.mm.target=null;if(c.mm.saw==o)c.mm.saw=null}log(`${esc(o.a.name)} left`)}
const players=()=>chars.filter(o=>o.mm&&o.mm.role);
const alive=()=>chars.filter(o=>o.mm&&o.mm.role&&o.mm.alive);
const murderer=()=>chars.find(o=>o.mm&&o.mm.role=='murderer');

// ---------- rounds ----------
function toLobby(rebuild){
 if(rebuild){MM.W=buildWorld();for(const o of chars)scene.add(o.c.root);MM.coins=[];MM.fx=[];MM.shots=[];MM.gunDrop=null}
 MM.phase='lobby';MM.t=LOBBY_T;MM.spawnT=0;
 for(const o of chars){const m=mmOf(o);Object.assign(m,{role:null,alive:false,gun:false,hero:false,coins:0,saw:null,flee:0,target:null,knife:0,goal:null});revive(o,false);put(o,lobbySpot())}
 outB.style.display='none'}
function startRound(mid){const ps=chars.filter(o=>!(mid&&o==me));if(ps.length<3){MM.t=5;return}
 MM.phase='play';MM.t=mid?55+Math.random()*70:ROUND_T;MM.grace=mid?0:GRACE;MM.coins=MM.coins||[];MM.spawnT=0;MM.winner=null;MM.hero=null;
 const sh=[...ps].sort(()=>Math.random()-.5),mu=sh[0],she=sh[1];
 const H=[...MM.W.house].sort(()=>Math.random()-.5);let hi=0;
 for(const o of ps){const m=mmOf(o);Object.assign(m,{role:o==mu?'murderer':o==she?'sheriff':'innocent',alive:true,gun:o==she,hero:false,coins:0,saw:null,sawT:0,flee:0,target:null,stab:mid?0:3,throwCd:6,shootCd:1,aim:0,knife:0,goal:null});
  revive(o,true);put(o,H.length?H[hi++%H.length]:houseSpot())}
 MM.sheriffName=she.a.name;MM.murdName=mu.a.name;
 const nc=mid?14:26;for(let i=0;i<nc;i++)addCoin();
 if(mid){// the server was already playing: a couple of bots are already out
  const inn=ps.filter(o=>o.mm.role=='innocent');for(let k=0;k<Math.min(inn.length-2,1+(Math.random()*2|0));k++){const o=inn[k];o.mm.alive=false;o.ko=1e9;fadeBody(o)}
  log('A round is already running — you’ll play in the next one!');return}
 const r=ROLE[me.mm.role];
 showCard(`<div style="font:700 18px system-ui;color:#cfd3ff">You are</div><div style="font:900 56px system-ui;color:${r.c};text-shadow:0 4px 0 #000;letter-spacing:2px">${r.n}</div><div style="font:600 16px system-ui;margin-top:6px">${r.tip}</div>`+(me.mm.role=='innocent'?'<div style="font:600 14px system-ui;color:#ffd24a;margin-top:6px">🪙 Every 10 coins = +5 Bux</div>':''),4);
 log('<b>Round started!</b> Someone in the house is the murderer…')}
function endRound(winner,why){if(MM.phase!='play')return;MM.phase='end';MM.t=END_T;MM.winner=winner;
 const mw=winner=='murderer';let bux=0,lines='';
 if(me.mm.role){const won=mw==(me.mm.role=='murderer');if(won)bux+=20;const cb=Math.floor(me.mm.coins/10)*5;bux+=cb;
  lines=`<div style="font:800 18px system-ui;margin-top:10px;color:${won?'#7dff9a':'#ffb0b0'}">${won?'You win! +20 🟩':'You lost this one'}</div>`+(cb?`<div style="font:700 15px system-ui;color:#ffd24a">🪙 ${me.mm.coins} coins: +${cb} 🟩</div>`:'')}
 if(bux)addBux(bux);
 showCard(`<div style="font:900 44px system-ui;color:${mw?'#ff3b4a':'#3ce37a'};text-shadow:0 4px 0 #000">${mw?'🔪 MURDERER WINS':'🎉 INNOCENTS WIN'}</div><div style="font:700 16px system-ui;margin-top:4px;color:#cfd3ff">${why}</div>`+
  `<div style="font:800 20px system-ui;margin-top:12px">The murderer was <span style="color:#ff6b7a">${esc(MM.murdName)}</span></div><div style="font:600 15px system-ui;margin-top:4px">Sheriff: <span style="color:#7cc4ff">${esc(MM.sheriffName)}</span>`+(MM.hero?` · Hero: <span style="color:#ffd24a">${esc(MM.hero)}</span>`:'')+`</div>`+lines,END_T);
 log(mw?'<b style="color:#ff6b7a">The murderer wins!</b>':'<b style="color:#7dff9a">The innocents win!</b>')}

// ---------- coins ----------
function addCoin(){const S=MM.W.coinSpots;if(!S.length)return;for(let k=0;k<8;k++){const p=S[Math.random()*S.length|0];if(MM.coins.some(c=>c.p.distanceTo(p)<4))continue;
 const m=new THREE.Mesh(COING,COINM);m.rotation.x=Math.PI/2;const g=new THREE.Group();g.add(m);g.position.set(p.x,p.y+1.3,p.z);scene.add(g);MM.coins.push({g,p});return}}
function coins(dt){MM.spawnT-=dt;if(MM.spawnT<=0&&MM.coins.length<34){MM.spawnT=3;addCoin()}
 for(let i=MM.coins.length-1;i>=0;i--){const c=MM.coins[i];c.g.rotation.y+=dt*3;c.g.position.y=c.p.y+1.3+Math.sin(t0*3+i)*.15;
  for(const o of chars){if(!o.mm||!o.mm.alive||o.ko)continue;if(Math.hypot(o.pos.x-c.p.x,o.pos.z-c.p.z)<2.1&&Math.abs(o.pos.y-c.p.y)<3){o.mm.coins++;scene.remove(c.g);MM.coins.splice(i,1);break}}}}

// ---------- line of sight + rays ----------
function solidAt(p){for(const b of near(p.x,p.z))if(p.x>b.min.x&&p.x<b.max.x&&p.y>b.min.y&&p.y<b.max.y&&p.z>b.min.z&&p.z<b.max.z)return true;return false}
function los(a,b){const d=b.clone().sub(a),L=d.length(),n=Math.ceil(L/1.1),p=new THREE.Vector3();for(let i=1;i<n;i++){p.copy(a).addScaledVector(d,i/n);if(solidAt(p))return false}return true}
const chest=o=>V3(o.pos.x,o.pos.y+3.4,o.pos.z);
const tmpBox=new THREE.Box3(),tmpV=new THREE.Vector3();
// first thing a ray hits: {o:char|null, d, p}
function rayHit(from,dir,maxD,skip,minD){const ray=new THREE.Ray(from,dir.clone().normalize());let bd=maxD,bo=null;
 const seen=new Set();for(let s=0;s<=maxD;s+=8){const q=ray.at(s,new THREE.Vector3());for(const b of near(q.x,q.z)){if(seen.has(b))continue;seen.add(b);if(b.containsPoint(from))continue;const h=ray.intersectBox(b,tmpV);if(h){const d=h.distanceTo(from);if(d<bd&&d>(minD||0))bd=d}}}
 for(const o of chars){if(o==skip||!o.mm||!o.mm.alive||o.ko)continue;tmpBox.min.set(o.pos.x-1.05,o.pos.y,o.pos.z-1.05);tmpBox.max.set(o.pos.x+1.05,o.pos.y+5.2,o.pos.z+1.05);const h=ray.intersectBox(tmpBox,tmpV);if(h){const d=h.distanceTo(from);if(d<bd&&d>(minD||0)){bd=d;bo=o}}}
 return{o:bo,d:bd,p:ray.at(bd,new THREE.Vector3())}}

// ---------- effects ----------
function fx(obj,life,up){scene.add(obj);MM.fx.push({obj,t:0,life,up})}
function poof(o){const c=V3(o.pos.x,o.pos.y+2.6,o.pos.z);
 for(let i=0;i<12;i++){const m=new THREE.Mesh(PUFFG,new THREE.MeshBasicMaterial({color:i%3?'#ffffff':'#d8dcef',transparent:true,opacity:.95,depthWrite:false}));const v=V3(Math.random()-.5,Math.random()*.8,Math.random()-.5).normalize().multiplyScalar(2+Math.random()*2.5);
  m.position.copy(c);const s0=.5+Math.random()*.5;fx(m,.75,(f,m)=>{m.position.addScaledVector(v,.016);m.scale.setScalar(s0*(.6+f*1.6));m.material.opacity=.95*(1-f)})}
 const g=new THREE.Group(),wm=new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.85,depthWrite:false});
 const hd=new THREE.Mesh(new THREE.SphereGeometry(.9,20,14),wm);hd.scale.y=1.15;const tl=new THREE.Mesh(new THREE.ConeGeometry(.9,1.4,20),wm);tl.rotation.x=Math.PI;tl.position.y=-1.1;g.add(hd,tl);
 const em=new THREE.MeshBasicMaterial({color:'#222',transparent:true});for(const s of[-1,1]){const e=new THREE.Mesh(new THREE.SphereGeometry(.14,10,8),em);e.scale.y=1.5;e.position.set(s*.3,.2,.82);g.add(e)}
 const mo=new THREE.Mesh(new THREE.SphereGeometry(.13,10,8),em);mo.position.set(0,-.2,.85);g.add(mo);
 g.position.copy(c);g.rotation.y=o.yaw;const y0=c.y;fx(g,2.4,(f,g)=>{g.position.y=y0+f*6;g.position.x+=Math.sin(f*12)*.02;wm.opacity=.85*(1-f);em.opacity=1-f});
 const t=label([['POOF!','#fff6a0',44]],6,2.3);t.position.set(c.x,c.y+2.5,c.z);fx(t,1,(f,t)=>{t.position.y+=.02;t.material.opacity=1-f})}
function beam(a,b,col){const d=b.clone().sub(a),L=d.length();const m=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,L,8,1,true),new THREE.MeshBasicMaterial({color:col||'#7ff3ff',transparent:true,opacity:.95,depthWrite:false}));
 m.position.copy(a).addScaledVector(d,.5);m.quaternion.setFromUnitVectors(V3(0,1,0),d.normalize());fx(m,.22,(f,m)=>m.material.opacity=.95*(1-f));
 const s=new THREE.Mesh(PUFFG,new THREE.MeshBasicMaterial({color:'#bff6ff',transparent:true,depthWrite:false}));s.position.copy(b);fx(s,.25,(f,s)=>{s.scale.setScalar(.2+f*.8);s.material.opacity=1-f})}
function runFx(dt){for(let i=MM.fx.length-1;i>=0;i--){const e=MM.fx[i];e.t+=dt;const f=Math.min(1,e.t/e.life);e.up(f,e.obj);if(f>=1){scene.remove(e.obj);e.obj.traverse(m=>{if(m.material){if(m.material.map)m.material.map.dispose();m.material.dispose()}});MM.fx.splice(i,1)}}}

// ---------- knock outs ----------
function ko(t,by,quiet){const m=t.mm;if(!m||!m.alive)return;m.alive=false;t.ko=1e9;t.vel.set(0,6,0);poof(t);fadeBody(t);
 if(m.gun)dropGun(t);
 if(!quiet)log(`💨 ${esc(t.a.name)} was knocked out!`);
 if(by&&by.mm&&by.mm.role=='murderer'){for(const w of chars){if(w==by||w==t||!w.bot||!w.mm||!w.mm.alive||w.ko)continue;if(w.pos.distanceTo(by.pos)<34&&los(chest(w),chest(by))){w.mm.saw=by;w.mm.sawT=25;if(!w.mm.gun){w.mm.flee=6;w.mm.fleeFrom=by}}}}
 if(t==me){outB.innerHTML=me.mm.role=='murderer'?'👻 You got caught! Watching the end of the round…':'👻 You’re out! Watch the rest of the round…';outB.style.display='block'}
 if(m.role=='murderer')endRound('innocents',`${esc(t.a.name)} was stopped${by?' by '+esc(by.a.name):''}!`)}
function dropGun(o){o.mm.gun=false;const g=blasterMesh(1.6);g.rotation.x=Math.PI/2;const w=new THREE.Group();w.add(g);w.position.set(o.pos.x,o.pos.y+2,o.pos.z);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(1.6,.1,8,30),new THREE.MeshBasicMaterial({color:'#7ff3ff'}));ring.rotation.x=Math.PI/2;ring.position.y=-1.6;w.add(ring);scene.add(w);
 if(MM.gunDrop)scene.remove(MM.gunDrop.g);MM.gunDrop={g:w,p:V3(o.pos.x,o.pos.y,o.pos.z)};log('🔫 The blaster dropped! Any innocent can grab it.')}
function gunPickup(){const G=MM.gunDrop;if(!G)return;G.g.rotation.y+=.03;G.g.position.y=G.p.y+2+Math.sin(t0*2.5)*.3;
 for(const o of chars){const m=o.mm;if(!m||!m.alive||o.ko||m.role!='innocent')continue;if(Math.hypot(o.pos.x-G.p.x,o.pos.z-G.p.z)<2.4&&Math.abs(o.pos.y-G.p.y)<3.5){m.gun=true;m.hero=true;m.shootCd=1;MM.hero=o.a.name;scene.remove(G.g);MM.gunDrop=null;
  log(`🔫 <b>${esc(o.a.name)}</b> picked up the blaster!`);if(o==me){MM.wk=null;showCard('<div style="font:900 34px system-ui;color:#ffd24a">🔫 You got the blaster!</div><div style="font:600 15px system-ui;margin-top:6px">Zap the murderer — but don’t hit an innocent!</div>',2.5)}return}}}

// ---------- weapons ----------
function stab(o){const m=o.mm;if(m.stab>0||o.ko||!m.alive)return false;let best=null,bd=4.7;
 for(const t of chars){if(t==o||!t.mm||!t.mm.alive||t.ko)continue;const dx=t.pos.x-o.pos.x,dz=t.pos.z-o.pos.z,d=Math.hypot(dx,dz);if(d>bd||Math.abs(t.pos.y-o.pos.y)>3)continue;
  const da=Math.atan2(Math.sin(Math.atan2(dx,dz)-o.yaw),Math.cos(Math.atan2(dx,dz)-o.yaw));if(Math.abs(da)>1.1)continue;bd=d;best=t}
 o.swing=.3;o.lunge=false;m.knife=1.5;m.stab=o.bot?5+Math.random()*2.5:.9;if(best)ko(best,o);return!!best}
function throwKnife(o,dir){const m=o.mm;if(m.throwCd>0||o.ko||!m.alive)return;m.throwCd=o.bot?11:8;m.knife=1.5;o.swing=.3;o.lunge=false;
 const k=knifeMesh();k.scale.setScalar(1.3);const p=V3(o.pos.x,o.pos.y+3.6,o.pos.z).addScaledVector(dir,1.4);k.position.copy(p);scene.add(k);MM.shots.push({k,p,v:dir.clone().normalize().multiplyScalar(o.bot?30:42),o,life:1.3})}
function shots(dt){for(let i=MM.shots.length-1;i>=0;i--){const s=MM.shots[i];s.life-=dt;let done=s.life<=0;const steps=4;
 for(let k=0;k<steps&&!done;k++){s.p.addScaledVector(s.v,dt/steps);if(solidAt(s.p)){done=true;break}
  for(const t of chars){if(t==s.o||!t.mm||!t.mm.alive||t.ko)continue;if(Math.hypot(t.pos.x-s.p.x,t.pos.z-s.p.z)<1.3&&s.p.y>t.pos.y&&s.p.y<t.pos.y+5.2){ko(t,s.o);done=true;break}}}
 s.k.position.copy(s.p);s.k.rotation.x+=dt*18;s.k.rotation.y=Math.atan2(s.v.x,s.v.z);
 if(done||MM.phase!='play'){scene.remove(s.k);MM.shots.splice(i,1)}}}
function fire(o,from,dir,minD){const m=o.mm;if(m.shootCd>0||o.ko||!m.alive||!m.gun)return;m.shootCd=o.bot?2.4:1.4;o.swing=.15;o.lunge=false;
 const h=rayHit(from,dir,140,o,minD);const tip=V3(o.pos.x+Math.sin(o.yaw)*1.8+Math.cos(o.yaw)*1.4,o.pos.y+4.2,o.pos.z+Math.cos(o.yaw)*1.8-Math.sin(o.yaw)*1.4);beam(tip,h.p);
 if(!h.o)return;const t=h.o;
 if(t.mm.role=='murderer'){ko(t,o,true);return}
 // zapped an innocent: both go down
 ko(t,o,true);log(`😵 ${esc(o.a.name)} zapped an innocent (${esc(t.a.name)}) and got knocked out too!`);ko(o,null,true)}

// ---------- player input ----------
function aimDir(){return cam.getWorldDirection(new THREE.Vector3())}
addEventListener('keydown',e=>{if(e.code!='KeyF'||e.repeat||GAME!='mystery'||mode!='game'||!MM||MM.phase!='play'||!me||!me.mm||me.mm.role!='murderer'||!me.mm.alive)return;
 if(MM.grace>0){log('Wait for the lights to settle… ('+Math.ceil(MM.grace)+'s)');return}const d=aimDir();me.yaw=Math.atan2(d.x,d.z);throwKnife(me,d)});
function playerAttack(){if(!MM||MM.phase!='play'||!me.mm||!me.mm.alive)return;const m=me.mm;
 if(m.role=='murderer'){if(MM.grace>0){log('You can’t attack yet ('+Math.ceil(MM.grace)+'s)');return}stab(me)}
 else if(m.gun){const tg=me.pos.clone();tg.y+=4.5;fire(me,cam.position.clone(),aimDir(),cam.position.distanceTo(tg)-.5)}}

// ---------- bots ----------
function sameLevel(o,p){return Math.abs(p.y-o.pos.y)<3.5}
function move(o,dt,goal,sprint){const m=o.mm;let mx=0,mz=0,jump=false;
 if(m.detour>0){m.detour-=dt;mx=m.dx;mz=m.dz}
 else if(goal){const dx=goal.x-o.pos.x,dz=goal.z-o.pos.z,d=Math.hypot(dx,dz);if(d>.9){mx=dx/d;mz=dz/d}}
 if(mx||mz){o.yaw=Math.atan2(mx,mz);const sp=Math.hypot(o.vel.x,o.vel.z);if(o.ground&&sp<1.6)m.stuck+=dt;else m.stuck=Math.max(0,m.stuck-dt*2);
  if(m.stuck>.45){m.stuck=0;const a=Math.atan2(mx,mz)+(Math.random()<.5?1:-1)*(1.1+Math.random()*1.2);m.dx=Math.sin(a);m.dz=Math.cos(a);m.detour=.6+Math.random()*.7;jump=Math.random()<.6;m.fails=(m.fails|0)+1;if(m.fails>4){m.fails=0;m.goal=null}}}
 physics(o,dt,mx,mz,jump,sprint)}
function wanderGoal(o){const H=MM.phase=='play'&&o.mm.inHouse?MM.W.coinSpots.filter(p=>sameLevel(o,p)&&p.distanceTo(o.pos)<40):null;
 return H&&H.length?H[Math.random()*H.length|0]:o.mm.inHouse?houseSpot():lobbySpot()}
function nearestCoin(o){let b=null,bd=34;for(const c of MM.coins){if(!sameLevel(o,c.p))continue;const d=c.p.distanceTo(o.pos);if(d<bd){bd=d;b=c}}return b}
function botBrain(o,dt){const m=mmOf(o);
 for(const k of['stab','throwCd','shootCd','knife','flee','sawT'])if(m[k]>0)m[k]-=dt;if(m.sawT<=0)m.saw=null;
 if(MM.phase!='play'||!m.alive){// lobby / spectating: mill about
  m.goalT-=dt;if(!m.goal||m.goalT<=0||o.pos.distanceTo(m.goal)<2){m.goal=Math.random()<.3?null:lobbySpot();m.goalT=3+Math.random()*5}
  move(o,dt,m.goal,false);return}
 m.think-=dt;const think=m.think<=0;if(think)m.think=.3+Math.random()*.3;
 // shooter logic (sheriff or a hero holding the blaster)
 if(m.gun){let foe=m.saw&&m.saw.mm&&m.saw.mm.alive&&!m.saw.ko?m.saw:null;
  if(!foe&&think){const mu=murderer();if(mu&&mu.mm.alive&&mu.mm.knife>0&&mu.pos.distanceTo(o.pos)<18&&Math.random()<.35&&los(chest(o),chest(mu))){m.saw=mu;m.sawT=20;foe=mu}}
  if(foe){const d=foe.pos.distanceTo(o.pos),see=d<30&&(think?(m.see=los(chest(o),chest(foe))):m.see);
   if(see){o.yaw=Math.atan2(foe.pos.x-o.pos.x,foe.pos.z-o.pos.z);m.aim+=dt;physics(o,dt,0,0,false,false);
    if(m.aim>.8&&m.shootCd<=0){m.aim=0;const to=chest(foe).sub(chest(o));if(Math.random()>.55)to.add(V3((Math.random()-.5)*6,(Math.random()-.3)*3,(Math.random()-.5)*6));fire(o,chest(o).add(to.clone().normalize().multiplyScalar(1.3)),to,0)}return}
   m.aim=0;move(o,dt,foe.pos,true);return}}
 // murderer: blend in, then stalk someone on their own
 if(m.role=='murderer'){if(think&&(!m.target||!m.target.mm.alive||Math.random()<.08)){let best=null,bd=60;
   for(const t of chars){if(t==o||!t.mm||!t.mm.alive||t.ko||!sameLevel(o,t.pos))continue;const d=t.pos.distanceTo(o.pos);if(d>bd)continue;
    const crowd=chars.filter(c=>c!=t&&c!=o&&c.mm&&c.mm.alive&&!c.ko&&c.pos.distanceTo(t.pos)<12).length;if(crowd)continue;bd=d+(t==me?4:0);best=t}m.target=best}
  const T=m.target;if(T&&MM.grace<=0){const d=T.pos.distanceTo(o.pos);if(d<14)m.knife=Math.max(m.knife,.5);
   if(d<3.6&&m.stab<=0){if(m.windup<=0)m.windup=.45;m.windup-=dt;o.yaw=Math.atan2(T.pos.x-o.pos.x,T.pos.z-o.pos.z);if(m.windup<=0){stab(o);m.target=null;m.goal=wanderGoal(o);m.goalT=6}physics(o,dt,0,0,false,false);return}
   m.windup=0;if(d>9&&d<22&&m.throwCd<=0&&think&&Math.random()<.12&&los(chest(o),chest(T))){const to=chest(T).add(V3(T.vel.x*.35,0,T.vel.z*.35)).sub(chest(o));o.yaw=Math.atan2(to.x,to.z);throwKnife(o,to)}
   move(o,dt,m.stab>0?(m.goal||T.pos):T.pos,false);return}}
 // innocents (and murderer with nobody to stalk): flee, fetch the blaster, collect coins
 if(m.role!='murderer'){if(think&&!m.flee){const mu=murderer();if(mu&&mu.mm.alive&&mu.mm.knife>0&&mu.pos.distanceTo(o.pos)<12&&los(chest(o),chest(mu))){m.flee=5;m.fleeFrom=mu;m.saw=mu;m.sawT=20}}
  if(m.flee>0&&m.fleeFrom){const a=o.pos.clone().sub(m.fleeFrom.pos).setY(0).normalize().multiplyScalar(14).add(o.pos);move(o,dt,a,true);return}
  const G=MM.gunDrop;if(G&&m.role=='innocent'&&sameLevel(o,G.p)){const mine=chars.filter(c=>c.bot&&c.mm&&c.mm.alive&&c.mm.role=='innocent'&&sameLevel(c,G.p)).sort((a,b)=>a.pos.distanceTo(G.p)-b.pos.distanceTo(G.p))[0]==o;if(mine&&o.pos.distanceTo(G.p)<60){move(o,dt,G.p,true);return}}}
 if(think&&(!m.goal||m.goalT<=0||o.pos.distanceTo(m.goal)<1.5||m.coinGoal&&!MM.coins.includes(m.coinGoal))){const c=Math.random()<.75?nearestCoin(o):null;m.coinGoal=c;m.goal=c?c.p:wanderGoal(o);m.goalT=c?8:4+Math.random()*4}
 m.goalT-=dt;move(o,dt,m.goal,false)}

// ---------- HUD ----------
const fmtT=s=>{s=Math.max(0,Math.ceil(s));return(s/60|0)+':'+String(s%60).padStart(2,'0')};
function hud(){const m=me.mm||{},r=m.role?ROLE[m.role]:null,al=alive().length,tot=players().length;let h='<b style="font-size:16px">🔪 Mystery Mansion</b><br>';
 if(MM.phase=='lobby')h+=`⏳ Next round in <b>${Math.ceil(MM.t)}s</b><br>👥 ${chars.length} players in the server`;
 else if(MM.phase=='play'){h+=r?`Role: <b style="color:${r.c}">${r.n}</b>${m.hero?' <b style="color:#ffd24a">(HERO)</b>':''}${m.alive?'':' <span style="color:#aab">👻 out</span>'}<br>`:'<span style="color:#aab">Spectating — you play next round</span><br>';
  h+=`⏱ <b>${fmtT(MM.t)}</b> · 👥 <b>${al}</b>/${tot} alive<br>🪙 ${m.coins|0} coins`}
 else h+='<b>Round over!</b><br>Back to the lobby soon…';
 if($('score').innerHTML!==h)$('score').innerHTML=h;
 let w='';if(MM.phase=='play'&&m.alive){if(m.role=='murderer')w=`<b style="color:#ff6b7a">🔪 Knife</b><br><small>Click = stab · F = throw ${m.throwCd>0?'('+Math.ceil(m.throwCd)+'s)':'(ready)'}${MM.grace>0?' · wait '+Math.ceil(MM.grace)+'s':''}</small>`;
  else if(m.gun)w=`<b style="color:#7ff3ff">🔫 Blaster</b><br><small>Aim with the crosshair · click to zap ${m.shootCd>0?'(recharging)':'(ready)'}</small>`;
  else w='<b style="color:#3ce37a">No weapon</b><br><small>Collect coins, stay alive, watch for the knife!</small>'}
 else if(MM.phase=='lobby')w='<b>Lobby</b><br><small>Hang out — roles are picked when the round starts</small>';
 if(MM.wk!==w){MM.wk=w;$('wep').innerHTML=w}
 const it=MM.phase=='play'&&m.role?`🪙 ${m.coins|0} · 10 coins = +5 🟩`:'';$('items').innerHTML=it;
 setTag(MM.W.board,MM.phase=='lobby'?['Next round in '+Math.ceil(MM.t)+'s','#ffd24a']:MM.phase=='play'?['Round in progress · '+fmtT(MM.t),'#ff9aa4']:['Round over!','#fff'])}

// ---------- main tick ----------
function tick(dt){if(!MM)return;MM.t-=dt;if(cardT>0&&(cardT-=dt)<=0)card.style.display='none';
 if(me&&me.mm&&me.mm.stab>0&&!me.bot){me.mm.stab-=dt;}if(me&&me.mm){if(me.mm.throwCd>0)me.mm.throwCd-=dt;if(me.mm.shootCd>0)me.mm.shootCd-=dt;if(me.mm.knife>0)me.mm.knife-=dt}
 if(MM.phase=='lobby'){if(MM.t<=0)startRound(false)}
 else if(MM.phase=='play'){if(MM.grace>0)MM.grace-=dt;coins(dt);gunPickup();shots(dt);
  const mu=murderer(),others=alive().filter(o=>o.mm.role!='murderer');
  if(!mu||!mu.mm.alive)endRound('innocents','The murderer was stopped!');
  else if(!others.length)endRound('murderer','Everyone else got knocked out!');
  else if(MM.t<=0)endRound('innocents','Time ran out — the house is safe!')}
 else if(MM.phase=='end'&&MM.t<=0)toLobby(true);
 // bots come and go (never an alive player mid-round)
 MM.joinT-=dt;if(MM.joinT<=0){MM.joinT=18+Math.random()*25;const n=chars.length;
  if(n<12&&(n<8||Math.random()<.5))botJoin(false);
  else if(n>7){const c=chars.filter(o=>o.bot&&!(o.mm&&o.mm.alive&&MM.phase=='play'));if(c.length)botLeave(c[Math.random()*c.length|0])}}
 // gear: knife only while the murderer has it out (yours is always out), blaster for whoever holds it
 for(const o of chars){const m=o.mm;if(!m)continue;const on=MM.phase=='play'&&m.alive&&!o.ko;
  const knife=on&&m.role=='murderer'&&(o==me||m.knife>0);o.c.sw.visible=knife;
  if(knife){const b=o.c.blade;b.scale.set(1,.36,1);b.position.z=.1+1.5*.36;b.material.color.set('#3a3a48');b.material.emissive.set('#000');if(o.c.gearMesh){o.c.gearMesh.visible=false;b.visible=true}} // (a worn gear gives way to the knife)
  const g=gearOf(o);g.visible=on&&m.gun;if(g.visible&&o.swing<=0){o.c.aR.rotation.x=-1.45;o.c.aR.rotation.z=0}}
 runFx(dt);hud()}

// ---------- start ----------
function startMystery(){GAME='mystery';mode='game';$('hub').style.display='none';$('hud').style.display='block';$('cross').style.display='block';$('dead').style.display='none';feed.length=0;$('feed').innerHTML='';hideAll();
 $('help').textContent='WASD move · Space jump · Shift sprint · Mouse look · Click = use your weapon · F = throw knife (murderer)';
 MM={phase:'lobby',t:LOBBY_T,coins:[],fx:[],shots:[],gunDrop:null,joinT:20+Math.random()*20,spawnT:0,grace:0,wk:null};
 MM.W=buildWorld();
 chars=[];me=spawn(av,false);equip(me,-1);mmOf(me);put(me,lobbySpot());me.shield=0;
 const n=6+(Math.random()*4|0);for(let i=0;i<n;i++)botJoin(true);
 if(Math.random()<.55)startRound(true);else{MM.t=5+Math.random()*7;log('Welcome to <b>Mystery Mansion</b>! The next round starts soon.')}
 {const L=MM.W.lobby;camYaw=Math.atan2(0,-1);me.yaw=camYaw;camPitch=.25}
 R.domElement.requestPointerLock()}

window.MODES=window.MODES||{};
window.MODES.mystery={tick,bot:botBrain,
 spawnFor:o=>MM&&MM.W?(o.mm&&o.mm.inHouse&&MM.phase=='play'?houseSpot():lobbySpot()):null,
 attack:o=>{if(o==me)playerAttack();return false}};
window.startMystery=startMystery;
LIST.push({id:'mystery',t:'Mystery Mansion',d:'Find the murderer before it finds you.',ic:'',bg:'url(unbloxed/thumbs/mystery-sq.jpg) center/clamp(0px,(300px - 100%)*999,100%) 100% no-repeat,url(unbloxed/thumbs/mystery-wide.jpg) center/cover #2a2440',play:function(){joinServer('mystery',this,startMystery)}});
cards();
})();
