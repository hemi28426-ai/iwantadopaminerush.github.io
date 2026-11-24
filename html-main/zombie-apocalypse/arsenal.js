// zombie-apocalypse/arsenal.js — big weapon roster: ~45 real-world firearms + 4 original wonder weapons, forged camo versions,
// weighted Mystery Box pool, tabbed Supply Crate shop. Models live in arsenal-models.js (ZAM). Exposes ZA.arsenal, ZA.wonder,
// ZA.boxRoll(pool), ZA.boxShow(), ZA.gunCat(id).
(function(){
'use strict';
const ZA=window.ZA,ZAM=window.ZAM;if(!ZA||!ZAM)return;
const V3=THREE.Vector3,TMP=new V3(),rand=(a,b)=>a+Math.random()*(b-a);
const baseOf=id=>{const G=GUNS[id];return G&&G.base?G.base:id};
// ---------- roster ----------
// category defaults (balanced against the core guns + flat zombie HP: wave 30 = 500 hp)
const CD={
 Pistols:{slot:2,spd:1,rew:300,mov:.025,kick:.016,hs:3.5,pen:.55,spr:.004,rel:1.9},
 SMGs:{slot:1,auto:1,spd:.97,rew:600,mov:.03,kick:.009,hs:3.5,pen:.6,spr:.009,rel:2.4},
 Rifles:{slot:1,auto:1,spd:.88,rew:300,mov:.1,kick:.02,hs:4,pen:.78,spr:.004,rel:2.7},
 Snipers:{slot:1,spd:.9,rew:100,mov:.15,kick:.07,hs:3,pen:.97,spr:.001,uns:.06,scope:3,rel:3.3},
 Shotguns:{slot:1,spd:.92,rew:900,mov:.07,kick:.1,hs:2.5,pen:.5,spr:.06,fall:1,rel:3},
 LMGs:{slot:1,auto:1,spd:.8,rew:300,mov:.15,kick:.016,hs:3.5,pen:.8,spr:.01,rel:5.2}};
// [id, name, forged name, category, camo family, anim (fallback), box weight, stats]
const R=[
 ['m1911','M1911','Forty-Five Fury','Pistols','ember','service',2,{dmg:40,rpm:330,mag:8,res:40,cost:500,kick:.02}],
 ['glock17','G17','Polymer Plague','Pistols','hex','service',2,{dmg:28,rpm:420,mag:17,res:85,rel:1.7,cost:400}],
 ['cz75','CZ 75','Czech Mate','Pistols','hex','service',2,{dmg:32,rpm:400,mag:16,res:80,rel:1.8,cost:450}],
 ['fiveseven','Five-seveN','Seven Sins','Pistols','hex','service',2,{dmg:30,rpm:450,mag:20,res:100,rel:1.7,pen:.8,cost:650}],
 ['luger','Luger P08','Toggle Tyrant','Pistols','ember','service',2,{dmg:34,rpm:380,mag:8,res:48,cost:350}],
 ['deagle','.50 Hand Cannon','Sky Splitter','Pistols','hex','revolver',1,{dmg:85,rpm:160,mag:7,res:35,rel:2.2,spr:.006,kick:.08,hs:3,pen:.9,cost:1000}],
 ['python','.357 Revolver','Coiled Viper','Pistols','hex','revolver',2,{dmg:70,rpm:150,mag:6,res:36,rel:2.6,kick:.06,hs:3,pen:.85,cost:800}],
 ['skorpion','Skorpion vz.61','Stinger Swarm','Pistols','circuit','machpist',2,{dmg:20,rpm:850,auto:1,mag:20,res:120,rel:2,spr:.013,kick:.01,cost:700}],
 ['mp40','MP40','Iron Wolf','SMGs','ember','grease',2,{dmg:30,rpm:550,mag:32,res:160,spr:.008,cost:1000}],
 ['thompson','Thompson M1928','Tommy Typhoon','SMGs','ember','smg',2,{dmg:33,rpm:720,mag:50,res:200,rel:3.2,spr:.01,kick:.012,cost:1500}],
 ['ppsh','PPSh-41','Red Hailstorm','SMGs','inferno','smg',2,{dmg:26,rpm:1000,mag:71,res:213,rel:3.4,spr:.012,cost:1400}],
 ['mp5','MP5','Night Stalker','SMGs','circuit','smg',2,{dmg:28,rpm:800,mag:30,res:150,rel:2.2,spr:.006,kick:.007,cost:1300}],
 ['uzi','Uzi','Desert Hornet','SMGs','circuit','grease',2,{dmg:27,rpm:650,mag:32,res:160,rel:2.2,spr:.01,cost:1100}],
 ['mac10','MAC-10','Bullet Hose','SMGs','circuit','grease',2,{dmg:24,rpm:1100,mag:30,res:150,rel:1.9,spr:.016,cost:1000}],
 ['p90','P90','Swarm Engine','SMGs','circuit','smg',1,{dmg:26,rpm:900,mag:50,res:200,rel:2.8,spr:.007,cost:1600}],
 ['ak74u','AK-74u','Ember Kalash','SMGs','inferno','ak',2,{dmg:31,rpm:735,mag:30,res:150,spr:.008,pen:.7,cost:1500}],
 ['ak47','AK-47','Kalash Inferno','Rifles','inferno','ak',2,{dmg:40,rpm:600,mag:30,res:150,rel:2.6,spr:.005,kick:.024,pen:.8,cost:2200}],
 ['stg44','STG-44','Sturm Reaper','Rifles','ember','ak',2,{dmg:38,rpm:560,mag:30,res:150,cost:1900}],
 ['m16','M16A2','Eagle Talon','Rifles','digital','m4',2,{dmg:35,rpm:750,mag:30,res:150,rel:2.6,spr:.003,cost:2400}],
 ['aug','AUG','Bullpup Blizzard','Rifles','digital','m4',2,{dmg:36,rpm:680,mag:30,res:150,rel:2.8,spr:.003,cost:2500}],
 ['famas','FAMAS','Le Clairon','Rifles','digital','m4',2,{dmg:32,rpm:1000,mag:25,res:150,rel:2.6,cost:2300}],
 ['galil','Galil','Galil Firestorm','Rifles','inferno','ak',2,{dmg:37,rpm:650,mag:35,res:140,cost:2100}],
 ['g36c','G36C','Compact Cyclone','Rifles','digital','m4',2,{dmg:33,rpm:750,mag:30,res:150,rel:2.3,cost:2000}],
 ['scarh','SCAR-H','Battle Scar','Rifles','digital','m4',1,{dmg:52,rpm:600,mag:20,res:120,kick:.03,pen:.9,cost:2800}],
 ['an94','AN-94','Abakan Blaze','Rifles','inferno','ak',1,{dmg:38,rpm:900,mag:30,res:150,rel:2.8,spr:.003,cost:2700}],
 ['fal','FN FAL','Free World Fury','Rifles','digital','carbine',2,{dmg:55,rpm:650,mag:20,res:120,rel:2.9,kick:.032,pen:.9,cost:2600}],
 ['m14','M14','Iron Sergeant','Rifles','digital','marksman|carbine',2,{dmg:62,rpm:450,auto:0,mag:20,res:120,rel:2.6,spr:.002,kick:.03,pen:.9,cost:2000}],
 ['garand','M1 Garand','Ping of Doom','Rifles','ember','marksman|carbine',2,{dmg:75,rpm:300,auto:0,mag:8,res:96,rel:2.4,spr:.002,kick:.04,pen:.95,cost:1500}],
 ['kar98k','Kar98k','Edelweiss','Snipers','ember','scout',2,{dmg:140,rpm:45,mag:5,res:40,rel:3.2,cost:1600}],
 ['mosin','Mosin-Nagant','Siberian Silence','Snipers','inferno','scout',2,{dmg:150,rpm:42,mag:5,res:40,rel:3.4,cost:1500}],
 ['springfield','Springfield M1903','Old Faithful','Snipers','ember','scout',2,{dmg:145,rpm:46,mag:5,res:40,cost:1700}],
 ['dragunov','Dragunov SVD','Steppe Hawk','Snipers','toxic','marksman|carbine',2,{dmg:110,rpm:160,mag:10,res:60,rel:3,scope:3.5,kick:.05,cost:2900}],
 ['l96','L96A1','Arctic Ghost','Snipers','grav','awp',1,{dmg:220,rpm:40,mag:10,res:40,rel:3.6,scope:4.5,uns:.1,pen:1,cost:3500}],
 ['barrett','Barrett M82','Thunder Fifty','Snipers','toxic','marksman|awp',1,{dmg:320,rpm:110,mag:10,res:30,rel:4,scope:4.5,uns:.14,kick:.14,pen:1,spd:.82,cost:4500}],
 ['r870','Remington 870','Crimson Pump','Shotguns','tiger','pump',2,{dmg:28,pel:8,rpm:70,mag:6,res:36,cost:1200}],
 ['spas12','SPAS-12','Riot Breaker','Shotguns','tiger','pump',2,{dmg:26,pel:8,rpm:120,mag:8,res:40,rel:3.2,cost:1700}],
 ['ksg','KSG','Twin Tube Terror','Shotguns','tiger','pump',2,{dmg:26,pel:8,rpm:80,mag:14,res:42,rel:3.6,cost:2000}],
 ['dbl12','Double-Barrel','Both Barrels','Shotguns','tiger','dbarrel|pump',2,{dmg:34,pel:9,rpm:300,mag:2,res:40,rel:2.2,spr:.07,cost:1000}],
 ['ou12','Over-Under 12','Clay Crusher','Shotguns','tiger','dbarrel|pump',2,{dmg:36,pel:9,rpm:320,mag:2,res:40,rel:2.1,spr:.05,cost:1300}],
 ['m1897','M1897 Trench Gun','Trench Sweeper','Shotguns','ember','pump',2,{dmg:30,pel:8,rpm:90,mag:6,res:36,cost:1400}],
 ['mg42','MG42','Buzzsaw Requiem','LMGs','hazard','hmg|lmg',1,{dmg:38,rpm:1200,mag:75,res:225,rel:5.5,kick:.014,cost:4500}],
 ['m60','M60','The Pig Roast','LMGs','hazard','lmg',1,{dmg:42,rpm:600,mag:100,res:200,rel:5.5,cost:4000}],
 ['rpk','RPK','Kalash Furnace','LMGs','inferno','ak',2,{dmg:40,rpm:650,mag:75,res:225,rel:4.5,cost:3500}],
 ['bar','BAR M1918','Barrage Engine','LMGs','hazard','carbine',2,{dmg:50,rpm:500,mag:20,res:160,rel:3.2,spr:.007,cost:2800}],
 ['m249','M249 SAW','Squad Annihilator','LMGs','hazard','hmg|lmg',1,{dmg:36,rpm:800,mag:100,res:300,rel:5.2,cost:4200}]];
// original wonder weapons (Mystery Box only)
const WW=[
 ['blox','Blox Blaster','Blox Blaster MAX','blox','revolver',{slot:2,dmg:160,rpm:200,mag:12,res:96,rel:2.4,spr:.004,mov:.02,kick:.05,hs:1,pen:1,rew:100,spd:1,col:0x2f7dff,glow:0x5bff6a}],
 ['gravity','Gravity Maul','Event Horizon','grav','gl|pump',{slot:1,dmg:240,rpm:50,mag:3,res:24,rel:3.4,spr:.004,mov:.05,kick:.12,hs:1,pen:1,rew:100,spd:.9,col:0x2a2c33,glow:0x9a5cff}],
 ['spore','Spore Cannon','Overgrowth','spore','gl|pump',{slot:1,dmg:200,rpm:70,mag:5,res:30,rel:3.2,spr:.01,mov:.05,kick:.1,hs:1,pen:1,rew:100,spd:.92,col:0x8a3a6a,glow:0xc8ff3a}],
 ['tesla','Tesla Coil Pistol','Wardenclyffe','tesla','service',{slot:2,dmg:34,rpm:520,auto:1,mag:40,res:200,rel:2.6,spr:.01,mov:.02,kick:.006,hs:1.5,pen:1,rew:100,spd:1,col:0xb88d3e,glow:0x6af4ff}]];
const MINE={},WEIGHT={},ANIM={},ARS=[],MYW=[];
for(const[id,n,up,cat,fam,anim,w,st]of R){if(GUNS[id])continue;const G=GUNS[id]=Object.assign({n,cat,len:ZAM.len(id),col:0x333333,za:1,model:id,fam},CD[cat],st);
 G.auto=G.auto?1:0;MINE[id]=up;WEIGHT[id]=w;ANIM[id]=anim;ARS.push(id)}
for(const[id,n,up,fam,anim,st]of WW){GUNS[id]=Object.assign({n,cost:0,len:ZAM.len(id),wonder:id,za:1,model:id,fam},st);MINE[id]=up;ANIM[id]=anim;MYW.push(id)}
// forged versions: economy's forge rules (2x dmg, 1.5x mag or 2x for small mags, 2x reserve, +10% rpm, faster reload) + own name + camo
for(const id in MINE){const G=GUNS[id];GUNS[id+'+']=Object.assign({},G,{n:MINE[id],cat:undefined,cost:0,base:id,up:1,dmg:G.dmg*2,
 mag:Math.round(G.mag*(G.wonder?1.5:G.mag<10?2:1.5)),res:G.res*2,rpm:Math.round(G.rpm*1.1),rel:G.rel*.85,glow:new THREE.Color(ZAM.FAM[G.fam].c).getHex()});ANIM[id+'+']=ANIM[id]}
// old core guns: shop tab mapping + box weights
const OLDCAT={pump:'Shotguns',auto12:'Shotguns',lmg:'LMGs',scout:'Snipers',awp:'Snipers'};
Object.assign(WEIGHT,{lmg:1,awp:1,auto12:1});
const gunCat=id=>{const G=GUNS[id];return G?OLDCAT[id]||(G.cat==='Heavy'?'LMGs':G.cat):null};
// ---------- models ----------
window.TWM=window.TWM||{};TWM.guns=TWM.guns||{};for(const id of ARS.concat(MYW))TWM.guns[id]=()=>ZAM.mesh(id);
// economy's forged core guns + box wonders get a camo family too (instead of economy's flat colour tint)
const COREFAM={service:'inferno',machpist:'circuit',revolver:'ember',grease:'toxic',smg:'tiger',pump:'hazard',auto12:'inferno',lmg:'inferno',
 carbine:'digital',ak:'tiger',m4:'digital',scout:'circuit',awp:'hex',cryo:'grav',arc:'tesla',bile:'toxic'};
for(const id in COREFAM){const U=GUNS[id+'+'];if(U&&!U.fam){U.fam=COREFAM[id];U.glow=new THREE.Color(ZAM.FAM[U.fam].c).getHex()}}
const _gm=window.gunMesh;window.gunMesh=function(id){const G=GUNS[id];if(G&&G.za)return ZAM.mesh(G.model,G.up?G.fam:null);
 if(G&&G.up&&G.fam&&ZAM.skin)return ZAM.skin(gunMesh(G.wonder?id.slice(0,-1):G.base),G.fam);return _gm(id)};
// Lewis LMG: core gun, but its model is the arsenal one (arsenal-models.js D.lmg); the forged Lewis Inferno gets the inferno camo
if(ZAM.has('lmg')){TWM.guns.lmg=()=>ZAM.mesh('lmg');for(const id of['lmg','lmg+'])if(GUNS[id])Object.assign(GUNS[id],{za:1,model:'lmg',fam:'inferno'});if(GUNS['lmg+'])GUNS['lmg+'].glow=new THREE.Color(ZAM.FAM.inferno.c).getHex()}
// Field Carbine (core gun) + economy's box wonders cryo/arc/bile: own arsenal models (D.carbine/D.cryo/D.arc/D.bile); forged '+' keep their COREFAM camo
for(const w of['carbine','cryo','arc','bile'])if(ZAM.has(w)&&GUNS[w]){TWM.guns[w]=()=>ZAM.mesh(w);const L=ZAM.len(w);for(const id of[w,w+'+'])if(GUNS[id])Object.assign(GUNS[id],{za:1,model:w,len:L},COREFAM[w]&&id!==w?{fam:COREFAM[w]}:{})}
// ---------- first-person anims: resolve lazily so late-loaded layers work ----------
if(!window.TWA)window.TWA={};
if(!TWA.dbarrel){const s=document.createElement('script');s.src='trench-war/anims/guns-new.js';document.head.appendChild(s)}
// Blox Blaster: turn it a little so the side meter and core read in first person
for(const id of['blox','blox+'])TWA[id]=function(S){const f=TWA.revolver||TWA.service,o=f?f(S):null,p=o&&o.p?o.p.slice():[0,0,0],r=o&&o.r?o.r.slice():[0,0,0];const k=S.aim?.3:1;r[1]+=.32*k;p[1]+=.055*k;p[0]+=.025*k;p[2]-=.05*k;return{p,r}};
for(const id in ANIM){if(TWA[id])continue;const opts=ANIM[id].split('|').concat(['service']);TWA[id]=function(S){for(const k of opts){const f=TWA[k];if(f&&f!==TWA[id])return f(S)}return null}}
// ---------- Mystery Box ----------
const WONDERS=()=>Object.keys(GUNS).filter(k=>GUNS[k].wonder&&!GUNS[k].up);
const held=k=>k===me.inv.p||k===me.inv.s;
// weight per item: each wonder (3, rising with the round, see ZA.boxWonderWeight) > each common gun 2 > rare/strong gun 1
ZA.boxRoll=function(pool,ww){const L=[];let tot=0;const push=(k,w)=>{if(!GUNS[k]||held(k))return;L.push([k,w]);tot+=w};
 for(const k of pool||[])if(!GUNS[k]||!GUNS[k].wonder)push(k,WEIGHT[k]||2);for(const k of WONDERS())push(k,ww||3);
 let r=Math.random()*tot;for(const[k,w]of L){r-=w;if(r<=0)return k}return L.length?L[L.length-1][0]:null};
ZA.boxShow=function(){const ks=ARS.concat(WONDERS(),Object.keys(OLDCAT));return ks[Math.random()*ks.length|0]};
ZA.arsenal=ARS.slice();ZA.wonder=WONDERS();ZA.gunCat=gunCat;ZA.forgedName=id=>MINE[id];
// ---------- Supply Crate shop: tabs per category ----------
const CATS=['Pistols','SMGs','Rifles','Snipers','Shotguns','LMGs'];let tab=null;
const css=document.createElement('style');css.textContent=`#buy .zaTabs{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:6px}#buy .zaTabs button{padding:6px 12px;font:600 13px var(--hfont);letter-spacing:1px;text-transform:uppercase;background:rgba(0,0,0,.35);border:1px solid var(--line);border-radius:7px}
#buy .zaTabs button.on{border-color:var(--gold);color:var(--gold);background:rgba(233,196,106,.12)}#buy .zaGrid{grid-column:1/-1;display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:4px 8px}#buy .zaGrid .it{margin:0}#buy .zaGear{grid-column:1/-1;display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:4px 8px}#buy .zaGear>b{grid-column:1/-1}#buy .zaGear .it{margin:0}
#buy .box{max-height:92vh;overflow:auto}`;document.head.appendChild(css);
const _db=window.drawBuy;window.drawBuy=function(){_db();const cols=$('buyCols'),gear=[...cols.children].find(c=>{const b=c.querySelector('b');return b&&/gear/i.test(b.textContent)});
 if(!tab){const p=me.inv.p&&gunCat(me.inv.p);tab=p&&CATS.includes(p)?p:'Rifles'}
 cols.innerHTML='';const tb=document.createElement('div');tb.className='zaTabs';
 for(const c of CATS){const b=document.createElement('button');b.textContent=c;if(c===tab)b.className='on';b.onclick=()=>{tab=c;blip(900,.04);window.drawBuy()};tb.appendChild(b)}cols.appendChild(tb);
 const grid=document.createElement('div');grid.className='col zaGrid';
 const ids=Object.keys(GUNS).filter(id=>{const G=GUNS[id];return G.cat&&!G.base&&!G.wonder&&gunCat(id)===tab}).sort((a,b)=>GUNS[a].cost-GUNS[b].cost);
 for(const id of ids){const G=GUNS[id],own=held(id),a=me.ammo[id]||[0,0],full=own&&a[0]>=G.mag&&a[1]>=G.res;
  const it=own?{n:G.n+' ammo',cost:Math.round(G.cost/20)*10||100,own:full,sub:'refill · '+a[0]+'/'+a[1],buy:()=>{me.ammo[id]=[G.mag,G.res]}}
   :{n:G.n,cost:G.cost,sub:`${G.dmg}${G.pel?'×'+G.pel:''} dmg · ${G.rpm} rpm${G.auto?' · auto':''}${G.scope?' · scope':''}`,buy:()=>{giveGun(id);switchTo(G.slot===1?'p':'s')}};
  const b=document.createElement('button');b.className='it'+(it.own?' own':'');b.innerHTML=`<img src="${gunIcon(id)}"><div>${it.n}</div><span>${it.cost} pts</span><div class="st">${it.sub}</div>`;
  b.disabled=it.own||me.money<it.cost;b.onclick=()=>{if(window.canBuy&&!window.canBuy())return closeBuy();if(me.money<it.cost)return;me.money-=it.cost;it.buy();blip(1200,.08);window.drawBuy()};grid.appendChild(b)}
 cols.appendChild(grid);if(gear){gear.classList.add('zaGear');cols.appendChild(gear)}};
// ---------- sounds ----------
function zap(f0,f1,len,type,vol){const a=ac();if(!a)return;const t=a.currentTime,o=a.createOscillator(),g=a.createGain();o.type=type||'square';o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+len);
 g.gain.setValueAtTime(vol||.07,t);g.gain.exponentialRampToValueAtTime(.001,t+len);o.connect(g).connect(a.destination);o.start(t);o.stop(t+len+.02)}
// ---------- wonder weapon behaviour ----------
const P=[],wells=[],clouds=[];
const boltG=new THREE.BoxGeometry(.16,.16,.16),orbG=new THREE.SphereGeometry(.18,10,8),podG=new THREE.SphereGeometry(.13,8,6),ringG=new THREE.TorusGeometry(1,.05,4,20).rotateX(Math.PI/2),cloudG=new THREE.SphereGeometry(1,10,8);
const MB={green:new THREE.MeshBasicMaterial({color:0x2bff3c}),gold:new THREE.MeshBasicMaterial({color:0xffc43a}),purple:new THREE.MeshBasicMaterial({color:0xb04aff}),
 violet:new THREE.MeshBasicMaterial({color:0x9a5cff}),dark:new THREE.MeshBasicMaterial({color:0x07020f}),spore:new THREE.MeshBasicMaterial({color:0xc8ff3a})};
const enemies=()=>{const team=HT(me.id,me.team);return bodies().filter(b=>b.team!==team&&b.id!==me.id)};
function splash(p,r,dmg,g,minK){for(const b of enemies()){TMP.copy(b.pos);TMP.y+=1;const d=TMP.distanceTo(p);if(d<r)routeHit(b.id,dmg*(1-d/r*(1-(minK||.5))),me.id,false,g)}}
function selfHurt(p,r,n){if(!me.alive||me.downed)return;TMP.copy(me.pos);TMP.y+=1;const d=TMP.distanceTo(p);if(d>=r)return;me.hp=Math.max(1,me.hp-n*(1-d/r));$('dmg').style.opacity=.8;setTimeout(()=>$('dmg').style.opacity=0,200)}
function muzzle(G){return vmGun?new V3(0,0,-G.len).applyMatrix4(vmGun.matrixWorld):me.pos.clone().setY(me.pos.y+eyeH())}
function aimDir(spr){return new V3(0,0,-1).applyEuler(new THREE.Euler(me.pitch+punch+rand(-spr,spr),me.yaw+rand(-spr,spr),0,'YXZ'))}
function wShoot(g,G){if(!me.alive||me.downed||me.reload>0||me.cd>0||swapT>0||RS.ph==='over')return;const a=me.ammo[g];if(!a)return;if(a[0]<=0){startReload();return}
 shotAt=performance.now();me.cd=60/G.rpm*(ZA.hasPerk&&ZA.hasPerk('double')?.75:1);a[0]--;punch+=G.kick;const w=baseOf(g),mz=muzzle(G);
 if(w==='blox'){const n=G.up?3:1;for(let i=0;i<n;i++){const d=aimDir(G.spr+(i?.05:0));if(i)d.applyAxisAngle(new V3(0,1,0),i===1?.09:-.09);
   const m=new THREE.Mesh(boltG,G.up?(i%2?MB.purple:MB.gold):MB.green);m.position.copy(mz);scene.add(m);P.push({m,v:d.multiplyScalar(34),t:2.2,k:'blox',g,dmg:G.dmg,b:1})}
  zap(1400,180,.18,'square',.06);zap(700,90,.22,'sawtooth',.03)}
 else if(w==='gravity'){const d=aimDir(G.spr),m=new THREE.Mesh(orbG,MB.violet);m.position.copy(mz);scene.add(m);P.push({m,v:d.multiplyScalar(22),t:1.3,k:'grav',g,dmg:G.dmg,up:G.up});zap(120,40,.5,'sawtooth',.09);noise(.3,.4,500,2)}
 else if(w==='spore'){const d=aimDir(G.spr),m=new THREE.Mesh(podG,MB.spore);m.position.copy(mz);scene.add(m);P.push({m,v:d.multiplyScalar(21).add(new V3(0,2.5,0)),t:3,k:'spore',g,dmg:G.dmg,up:G.up,grav:12});noise(.3,.25,900,2);zap(260,120,.15,'triangle',.06)}
 else if(w==='tesla')teslaFire(g,G,mz);
 if(a[0]===0)setTimeout(startReload,300)}
function teslaFire(g,G,mz){const o=me.pos.clone();o.y+=eyeH();const d=aimDir(G.spr),list=enemies();let best=null,ba=.22;
 for(const b of list){TMP.copy(b.pos);TMP.y+=1.1;TMP.sub(o);const dist=TMP.length();if(dist>18)continue;const ang=TMP.normalize().angleTo(d);if(ang<ba&&rayGrid(o,TMP,dist)>=dist-.3){ba=ang;best=b}}
 const jag=(a,b,n,amp)=>{const L=[];for(let i=0;i<=n;i++){const p=a.clone().lerp(b,i/n);if(i&&i<n)p.add(new V3(rand(-amp,amp),rand(-amp,amp),rand(-amp,amp)));L.push(p)}return L};
 zap(2400+Math.random()*800,900,.06,'sawtooth',.03);
 if(!best){const r=traceShot(o,d,HT(me.id,me.team),me.id,bodies(),14),e=o.clone().addScaledVector(d,r.t);line(jag(mz,e,5,.06),0x6af4ff,.06);if(r.hit)routeHit(r.hit,G.dmg,me.id,r.hs,g);return}
 let cur=best,from=mz,dmg=G.dmg;const used=new Set();
 for(let j=0;j<(G.up?3:2)&&cur;j++){used.add(cur.id);const to=cur.pos.clone();to.y+=1.1;line(jag(from,to,6,j?.2:.08),j?0xa8fbff:0x6af4ff,.08);routeHit(cur.id,dmg,me.id,false,g);puff(to,0x9ff8ff,.2,.25);
  from=to;dmg*=.6;let nx=null,nd=6;for(const b of list){if(used.has(b.id))continue;const dd=b.pos.distanceTo(cur.pos);if(dd<nd){nd=dd;nx=b}}cur=nx}
 hitMark('#6af4ff')}
// pooled additive lines for arcs
const lines=[];function line(pts,col,life){let L=lines.find(l=>!l.o.visible);if(!L){if(lines.length>10)return;const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(24),3));
  const o=new THREE.Line(geo,new THREE.LineBasicMaterial({color:col,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));o.frustumCulled=false;scene.add(o);L={o};lines.push(L)}
 const a=L.o.geometry.attributes.position;for(let i=0;i<8;i++){const p=pts[Math.min(i,pts.length-1)];a.setXYZ(i,p.x,p.y,p.z)}a.needsUpdate=true;L.o.material.color.set(col);L.o.material.opacity=1;L.o.visible=true;L.t=L.l=life}
function explode(q){const p=q.m.position;
 if(q.k==='blox'){const c=q.m.material.color.getHex();for(let i=0;i<6;i++)puff(p,c,.35,.45,.4,new V3(rand(-4,4),rand(1,4),rand(-4,4)),1.5);splash(p,3.2,q.dmg,q.g);selfHurt(p,2.6,12);zap(500,60,.2,'square',.06);noise(.25,.2,2500,3)}
 else if(q.k==='grav'){const m=new THREE.Mesh(orbG,MB.dark),r=new THREE.Mesh(ringG,MB.violet);m.position.copy(p);r.position.copy(p);scene.add(m);scene.add(r);
  wells.push({p:p.clone(),m,r,t:2.6,k:.3,g:q.g,dmg:q.dmg,R:q.up?12:9});const msg={t:'ev',e:'zgrav',p:p.toArray(),R:q.up?12:9};if(isHost)bcast(msg);else send(msg);zap(80,30,1.2,'sawtooth',.1)}
 else if(q.k==='spore'){for(let i=0;i<8;i++)puff(p,i%2?0xc8ff3a:0xff7ae0,.5,.8,.6,new V3(rand(-4,4),rand(1,4),rand(-4,4)),2);splash(p,4,q.dmg,q.g);noise(.4,.4,700,2);
  if(clouds.length<3){const m=new THREE.Mesh(cloudG,new THREE.MeshBasicMaterial({color:q.up?0xff7ae0:0xb8ff4a,transparent:true,opacity:.28,depthWrite:false}));m.position.copy(p);m.scale.setScalar(.5);scene.add(m);clouds.push({m,t:q.up?6:4.5,k:.5,g:q.g,dmg:q.dmg*.1,R:q.up?5:4})}}
 scene.remove(q.m)}
// host side of the gravity well: pull zombies toward the crush point
const pulls=[];function hostPull(p,R){pulls.push({p:new V3(...p),R,t:2.6})}
const isBoss=b=>!!(b&&(b.boss||/boss/i.test(b.ztype||b.type||'')));
ZA.on('hostTick',dt=>{for(let i=pulls.length-1;i>=0;i--){const w=pulls[i];w.t-=dt;if(w.t<=0){pulls.splice(i,1);continue}
  for(const b of bots){if(!b.zombie||!b.alive)continue;const dx=w.p.x-b.pos.x,dz=w.p.z-b.pos.z,d=Math.hypot(dx,dz);if(d>w.R||d<.6)continue;const k=Math.min(d-.5,(isBoss(b)?2:7)*dt)/d;
   const nx=b.pos.x+dx*k,nz=b.pos.z+dz*k;if(Math.abs(hAt(nx,nz)-hAt(b.pos.x,b.pos.z))<.6){b.pos.x=nx;b.pos.z=nz}}}
 for(const b of bots)if(b.zombie&&b.slowT>0){b.slowT-=dt;if(b.slowT<=0&&b.spdS){b.spd=b.spdS;b.spdS=0}}});
ZA.on('zombieTick',(b,dt)=>{if(b.stunT>0){b.stunT-=dt;return true}});
const _ah=window.applyHit;window.applyHit=function(t,dmg,from,hs,gun){const w=baseOf(gun||'');if(w==='tesla'||w==='spore'){const b=bots.find(x=>x.id===t);
  if(b&&b.zombie&&b.alive&&!isBoss(b)){if(w==='tesla')b.stunT=.35;else{if(!b.spdS)b.spdS=b.spd;b.spd=b.spdS*.5;b.slowT=1}}}return _ah(t,dmg,from,hs,gun)};
function wellVisual(p,R){const m=new THREE.Mesh(orbG,MB.dark),r=new THREE.Mesh(ringG,MB.violet);const v=new V3(...p);m.position.copy(v);r.position.copy(v);scene.add(m);scene.add(r);wells.push({p:v,m,r,t:2.6,k:99,R,vis:1})}
ZA.on('ev',m=>{if(m.e==='zgrav'){if(m.by!==me.id)wellVisual(m.p,m.R);return true}});
const _hm=window.hostMsg;window.hostMsg=function(c,m){if(m&&m.t==='ev'&&m.e==='zgrav'){hostPull(m.p,m.R);bcast({t:'ev',e:'zgrav',p:m.p,R:m.R,by:c.peer});wellVisual(m.p,m.R);return}return _hm(c,m)};
function wTick(dt){
 for(let i=P.length-1;i>=0;i--){const q=P[i],p=q.m.position;q.t-=dt;if(q.grav)q.v.y-=q.grav*dt;else if(q.k==='blox')q.v.y-=5*dt;
  const ox=p.x,oz=p.z;p.addScaledVector(q.v,dt);q.m.rotation.x+=dt*8;q.m.rotation.y+=dt*6;let hit=q.t<=0;const gy=hAt(p.x,p.z);
  if(!hit&&p.y<gy+.08){if(q.k==='blox'&&q.b>0){q.b--;if(hAt(ox,oz)<=p.y+.3){p.y=gy+.1;q.v.y=Math.abs(q.v.y)*.7}else{p.x=ox;p.z=oz;if(hAt(ox,p.z+q.v.z*dt)>p.y)q.v.z*=-.8;else q.v.x*=-.8}zap(900,300,.08,'square',.04)}else hit=true}
  if(!hit)for(const b of enemies()){if(Math.abs(b.pos.x-p.x)<.6&&Math.abs(b.pos.z-p.z)<.6&&p.y>b.pos.y&&p.y<b.pos.y+2.1){hit=true;break}}
  if(hit){P.splice(i,1);explode(q)}}
 for(let i=wells.length-1;i>=0;i--){const w=wells[i];w.t-=dt;const s=Math.max(.01,w.t/2.6);w.m.scale.setScalar(.8+Math.sin(w.t*20)*.15);w.r.scale.setScalar(w.R*s*.5+.5);w.r.rotation.y+=dt*4;
  if(Math.random()<.4){TMP.set(rand(-1,1),rand(0,.6),rand(-1,1)).normalize().multiplyScalar(w.R*.6).add(w.p);puff(TMP,0x9a5cff,.25,.4,0,w.p.clone().sub(TMP).multiplyScalar(2),1)}
  if(!w.vis){w.k-=dt;if(w.k<=0){w.k=.3;splash(w.p,3,w.dmg*.22,w.g,.8)}if(isHost&&!w.pulled){w.pulled=1;hostPull(w.p.toArray(),w.R)}}
  if(w.t<=0){if(!w.vis){splash(w.p,4.5,w.dmg,w.g,.6);noise(.6,.5,400,2);shake=Math.max(shake,.12);for(let k=0;k<8;k++)puff(w.p,k%2?0x9a5cff:0xffffff,.4,.5,.5,new V3(rand(-5,5),rand(0,4),rand(-5,5)),2)}
   scene.remove(w.m);scene.remove(w.r);wells.splice(i,1)}}
 for(let i=clouds.length-1;i>=0;i--){const c=clouds[i];c.t-=dt;c.k-=dt;c.m.scale.setScalar(Math.min(c.R,c.m.scale.x+dt*8));c.m.material.opacity=Math.min(.28,c.t*.12);c.m.rotation.y+=dt*.5;
  if(c.k<=0){c.k=.5;for(const b of enemies())if(b.pos.distanceTo(c.m.position)<c.R+.5)routeHit(b.id,c.dmg,me.id,false,c.g);if(Math.random()<.6)puff(c.m.position,0xc8ff3a,.4,.8,.4)}
  if(c.t<=0){scene.remove(c.m);c.m.material.dispose();clouds.splice(i,1)}}
 for(const L of lines)if(L.o.visible){L.t-=dt;L.o.material.opacity=Math.max(0,L.t/L.l);if(L.t<=0)L.o.visible=false}}
// shoot: my wonders handled here, everything else passes down the chain; M1 Garand pings on the last round
const _sh=window.shoot;window.shoot=function(heavy){const g=curGun(),G=GUNS[g];if(G&&G.za&&G.wonder&&MYW.includes(baseOf(g)))return wShoot(g,G);
 const a=me.ammo[g],before=a?a[0]:0,r=_sh(heavy);if(a&&before>0&&a[0]===0&&baseOf(g)==='garand')setTimeout(()=>{blip(2500,.06,.35,'triangle');blip(3700,.03,.25,'sine')},80);return r};
// ---------- per-frame: camo pulse, Blox Blaster shot meter ----------
let pt=0;ZA.on('tick',dt=>{wTick(dt);pt+=dt;const k=.65+.35*Math.sin(pt*3);for(const m of ZAM.pulse)m.emissiveIntensity=k*(m.userData.base||.8)/.8;
 const g=curGun();if(vmGun&&vmGun.userData.cells&&baseOf(g)==='blox'){const G=GUNS[g],a=me.ammo[g]||[0,0],n=me.reload>0?0:Math.round((1-a[0]/G.mag)*8),M=ZAM.mats();vmGun.userData.cells.forEach((c,i)=>c.material=i<n?(vmGun.userData.cellOn||M.cellOn):M.cellOff)}});
ZA.on('gameOver',()=>{for(const q of P)scene.remove(q.m);P.length=0;for(const w of wells){scene.remove(w.m);scene.remove(w.r)}wells.length=0;pulls.length=0;for(const c of clouds)scene.remove(c.m);clouds.length=0});
})();
