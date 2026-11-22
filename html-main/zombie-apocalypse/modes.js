// zombie-apocalypse/modes.js -- game modes (Standard / Classic, optional No-Buy loot-only), loot caches, crafting parts + Workbench.
(function(){
'use strict';
if(!window.ZA)return;
const V3=THREE.Vector3,M=window.ZAMAP||null,rnd=Math.random,pick=L=>L[Math.random()*L.length|0];
const LS={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const MODE=ZA.gameMode=Object.assign({m:'standard',nb:false},(()=>{const v=LS.get('za_mode',null);return v&&typeof v==='object'?{m:v.m==='classic'?'classic':'standard',nb:!!v.nb}:{}})());
const classic=()=>MODE.m==='classic',noBuy=()=>!!MODE.nb;
ZA.isClassic=classic;ZA.isNoBuy=noBuy;
for(const[k,n]of[['fire','Firebomb'],['spikes','Spike Mat']])if(!GUNS[k])GUNS[k]={n,pen:1,rew:0};
const H_=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);

// ================= styles + HUD =================
const css=document.createElement('style');css.textContent=`
#mdHud{position:absolute;right:18px;bottom:190px;text-align:right;font:600 12px var(--hfont);letter-spacing:1px;color:#cfd8bf;text-shadow:0 1px 3px #000}
#mdHud .p{display:inline-block;margin-left:8px}#mdHud .p i{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:4px;vertical-align:0}
#mdHud .g{margin-top:4px;color:#e9c46a}#mdHud .m{color:#9be06a;letter-spacing:2px;margin-bottom:3px}
#mdCraft{position:fixed;inset:0;display:none;align-items:center;justify-content:center;z-index:30;background:rgba(4,8,4,.62);font-family:var(--hfont);color:#dfe8d0}
#mdCraft .bx{background:rgba(14,22,12,.97);border:1px solid rgba(155,224,106,.3);border-radius:10px;padding:16px 18px;width:min(640px,94vw);max-height:90vh;overflow:auto}
#mdCraft h3{margin:0 0 4px;font:700 22px var(--hfont);letter-spacing:3px;color:#9be06a}
#mdCraft .inv{font-size:13px;margin-bottom:10px;color:#b9cfa0}#mdCraft .inv b{margin:0 10px 0 3px;color:#fff}
#mdCraft .r{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;padding:8px 10px;border-radius:7px;background:rgba(255,255,255,.04);margin:5px 0}
#mdCraft .r .n{font:600 15px var(--hfont);color:#fff}#mdCraft .r .d{font-size:12px;color:#a8b898}#mdCraft .r .c{font-size:12px;margin-top:3px}
#mdCraft .r .c span{margin-right:8px}#mdCraft .r .c .no{color:#ff7a6a}
#mdCraft button{font:600 13px var(--hfont);letter-spacing:1px;padding:7px 14px;border-radius:6px;border:1px solid #6a8f4e;background:#2e4522;color:#fff;cursor:pointer}
#mdCraft button[disabled]{opacity:.4;cursor:default}#mdCraft .ft{display:flex;justify-content:space-between;align-items:center;margin-top:10px;font-size:12px;color:#8a9a7a}
.md-mode{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.md-mode label.cb{display:flex;gap:6px;align-items:center;font-size:13px;cursor:pointer}
`;document.head.appendChild(css);
const hudEl=document.createElement('div');hudEl.id='mdHud';(document.getElementById('hud')||document.body).appendChild(hudEl);

// ================= main menu: mode select =================
const MDESC={standard:'Buy doors, rebuild barricades, unlock the town zone by zone.',classic:'Whole town open from the start, no barricades. Every zombie type from wave 1.'};
function buildMenuRow(){const dd=document.getElementById('zaDD');const after=dd?dd.closest('.row'):null;const host=after?after.parentNode:document.querySelector('#menu .box');if(!host||document.getElementById('mdRow'))return;
 const r=document.createElement('div');r.className='row';r.id='mdRow';
 r.innerHTML='<label>Mode</label><div><div class="md-mode"><div class="za-seg"><button type="button" data-m="standard">Standard</button><button type="button" data-m="classic">Classic</button></div>'+
  '<label class="cb"><input type="checkbox" id="mdNB"> No-Buy: loot only</label></div><div class="za-dd" id="mdDesc"></div></div>';
 if(after&&after.nextSibling)host.insertBefore(r,after.nextSibling);else host.appendChild(r);
 for(const b of r.querySelectorAll('button'))b.onclick=()=>{MODE.m=b.dataset.m;save();refreshRow()};
 r.querySelector('#mdNB').onchange=e=>{MODE.nb=e.target.checked;save();refreshRow()};refreshRow()}
function save(){LS.set('za_mode',{m:MODE.m,nb:MODE.nb})}
function refreshRow(){const r=document.getElementById('mdRow');if(!r)return;for(const b of r.querySelectorAll('button'))b.classList.toggle('on',b.dataset.m===MODE.m);
 r.querySelector('#mdNB').checked=MODE.nb;r.querySelector('#mdDesc').textContent=MDESC[MODE.m]+(MODE.nb?' No buying: open loot caches dropped by zombies.':'')}
try{buildMenuRow()}catch(e){console.error('modes menu',e)}

// ================= buying gate (No-Buy) + classic window uses =================
const BUYRX=/^(door|wb|perk_|box$|forge$|crate$|trap)/;
function gateUses(){for(const u of ZA.uses||[]){if(u._md)continue;u._md=1;const o=u.ok;
 u.ok=()=>{if(noBuy()&&BUYRX.test(u.id))return false;if(classic()&&/^win/.test(u.id))return false;return o?o():true}}}
const _ob=window.openBuy;window.openBuy=function(){if(running&&noBuy()){center('','No-Buy mode: open loot caches dropped by zombies');return}return _ob.apply(this,arguments)};

// ================= Classic: open map + mixed spawns =================
let winSaved=null;
function winCells(f){if(!M)return;for(const w of M.windows){const c=w.cells;for(let x=c[0];x<=c[2];x++)for(let z=c[1];z<=c[3];z++){const k=cell(x+.5,z+.5);if(k>=0)f(k)}}}
function openMap(){if(!M)return;
 if(!winSaved){winSaved=[];winCells(k=>{winSaved.push([k,H[k],C[k],M.G[k],M.WB[k]]);H[k]=0;C[k]=0;M.G[k]=0;M.WB[k]=0})}
 for(let w=0;w<M.windows.length;w++){for(let b=0;b<5;b++)M.setBoard(w,b,false);if(ZA.boards)ZA.boards[w]=0}
 const doors=M.doors.map(()=>1);ZA.emit('ev',{t:'ev',e:'zmState',doors});}
function restoreMap(){if(!winSaved||!M)return;for(const[k,h,c,g,wb]of winSaved){H[k]=h;C[k]=c;M.G[k]=g;M.WB[k]=wb}winSaved=null;if(ZA.resetMap)ZA.resetMap()}
function applyMap(){if(classic())openMap();else restoreMap()}
// zombies rise from the ground anywhere in town
let gc=null;
function groundCells(){if(gc)return gc;gc=[];if(!M)return gc;const ok=k=>k>=0&&H[k]===0&&M.G[k]===0&&!M.WB[k];
 for(let k=0;k<W*D;k++)if(M.ZN[k]>=0&&ok(k)&&ok(k-1)&&ok(k+1)&&ok(k-W)&&ok(k+W))gc.push(k);return gc}
const _zsp=ZA.zSpawnPos;ZA.zSpawnPos=function(){if(!classic())return _zsp();const L=groundCells();if(!L.length)return _zsp();const S=ZA.survivors();let best=null,bd=-1;
 for(let t=0;t<40;t++){const k=L[Math.random()*L.length|0],x=X0+(k%W)+.5,z=Z0+((k/W)|0)+.5;let d=1e9;for(const b of S)d=Math.min(d,Math.hypot(b.pos.x-x,b.pos.z-z));
  if(d>=16&&d<=48)return new V3(x,0,z);if(d>10&&(bd<0||Math.abs(d-30)<Math.abs(bd-30))){best=new V3(x,0,z);bd=d}}return best||_zsp()};
function aliveOf(t){let n=0;for(const b of bots)if(b.zombie&&b.alive&&b.ztype===t)n++;return n}
function classicType(w){
 const cap=t=>t==='brute'?(w<5?1:w<10?2:3):t==='spitter'?(w<5?1:w<10?2:4):99;
 const T=[['runner',.10,.012,.30],['crawler',.06,.004,.14],['exploder',.05,.005,.12],['spitter',.04,.005,.10],['brute',.025,.006,.09]];
 const r=rnd();let acc=0;for(const[t,a,b,m]of T){if(aliveOf(t)>=cap(t))continue;acc+=Math.min(m,a+b*(w-1));if(r<acc)return t}return 'walker'}
const _spawn=ZA.spawnZombie;ZA.spawnZombie=function(type,at){
 if(!type&&classic()&&!(ZA.isHoundWave&&ZA.isHoundWave(RS.rnd)))type=classicType(RS.rnd);return _spawn(type,at)};

// ================= No-Buy: doors open by themselves =================
function autoDoors(r){if(!M||!isHost||classic()||!noBuy()||r<2)return;
 const closed=i=>(ZA.markers||[]).some(m=>m.id==='door'+i),open=z=>ZA.zoneOpen?ZA.zoneOpen(z):z===0;
 const sp=SPAWN[0];let best=-1,bd=1e9;M.doors.forEach((d,i)=>{if(!closed(i)||!d.zones.some(open))return;const x=(d.cells[0]+d.cells[2])/2,z=(d.cells[1]+d.cells[3])/2,dd=Math.hypot(x-sp.x,z-sp.z);if(dd<bd){bd=dd;best=i}});
 if(best<0)return;const doors=M.doors.map((d,i)=>closed(i)&&i!==best?0:1),m={t:'ev',e:'zmState',doors};bcast(m);ZA.emit('ev',m);
 const n={t:'ev',e:'mdDoor',i:best};bcast(n);onMd(n)}

// ================= drops: crafting parts + loot caches =================
const PARTS={scrap:{n:'Scrap',c:0xb8b8ae,w:36},wiring:{n:'Wiring',c:0xff9a30,w:24},chem:{n:'Chemicals',c:0x6aff6a,w:20},powder:{n:'Gunpowder',c:0xff5a48,w:22},core:{n:'Core',c:0x6ae0ff,w:2}};
const PK=Object.keys(PARTS),hex=c=>'#'+c.toString(16).padStart(6,'0');
const INV={scrap:0,wiring:0,chem:0,powder:0,core:0};ZA.parts=INV;
function rollPart(){let t=0;for(const k of PK)t+=PARTS[k].w;let r=rnd()*t;for(const k of PK){r-=PARTS[k].w;if(r<0)return k}return 'scrap'}
const TIERS=[{id:'common',n:'Common',c:0xd8d8d0},{id:'rare',n:'Rare',c:0x4aa3ff},{id:'epic',n:'Epic',c:0xb46aff},{id:'legendary',n:'Legendary',c:0xffb02a}];
function rollTier(w){const L=Math.min(.12,.01+.006*w),E=Math.min(.25,.04+.015*w),R=Math.min(.4,.2+.02*w),r=rnd();return r<L?3:r<L+E?2:r<L+E+R?1:0}
// shared geometry / materials
const partG=new THREE.OctahedronGeometry(.15),ringG=new THREE.RingGeometry(.22,.4,12).rotateX(-Math.PI/2),
 partM={},ringM={};for(const k of PK){partM[k]=new THREE.MeshBasicMaterial({color:PARTS[k].c});ringM[k]=new THREE.MeshBasicMaterial({color:PARTS[k].c,transparent:true,opacity:.35,depthWrite:false,blending:THREE.AdditiveBlending})}
const crBody=new THREE.BoxGeometry(.8,.46,.54),crLid=new THREE.BoxGeometry(.84,.08,.58),crBand=new THREE.BoxGeometry(.1,.48,.56),crGlow=new THREE.CircleGeometry(.9,14).rotateX(-Math.PI/2),crBeam=new THREE.CylinderGeometry(.18,.32,4,8,1,true);
const olive=new THREE.MeshLambertMaterial({color:0x4b5530}),oliveD=new THREE.MeshLambertMaterial({color:0x323a20});
const tierM=TIERS.map(t=>({lid:new THREE.MeshBasicMaterial({color:t.c}),glow:new THREE.MeshBasicMaterial({color:t.c,transparent:true,opacity:.3,depthWrite:false,blending:THREE.AdditiveBlending}),beam:new THREE.MeshBasicMaterial({color:t.c,transparent:true,opacity:.18,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending})}));
function makePart(k){const g=new THREE.Group(),m=new THREE.Mesh(partG,partM[k]);m.position.y=.45;g.add(m);g.add(new THREE.Mesh(ringG,ringM[k]));g.userData.spin=m;return g}
function makeCrate(t){const g=new THREE.Group(),M_=tierM[t];const b=new THREE.Mesh(crBody,olive);b.position.y=.23;g.add(b);const l=new THREE.Mesh(crLid,M_.lid);l.position.y=.5;g.add(l);
 for(const s of[-1,1]){const d=new THREE.Mesh(crBand,oliveD);d.position.set(s*.28,.24,0);g.add(d)}const gl=new THREE.Mesh(crGlow,M_.glow);gl.position.y=.03;g.add(gl);
 if(t>=2){const bm=new THREE.Mesh(crBeam,M_.beam);bm.position.y=2.4;g.add(bm)}g.userData.glow=gl;return g}
const DROPS={};let dropN=0;
function addDrop(d){// d=[kind,sub,x,y,z,id,owner]
 const[k,sub,x,y,z,id,own]=d;if(DROPS[id])return;if(own&&own!==me.id)return;
 const g=k==='p'?makePart(sub):makeCrate(sub);g.position.set(x,y,z);g.rotation.y=rnd()*6.28;scene.add(g);
 const o=DROPS[id]={id,k,sub,g,t:k==='p'?45:150,ph:rnd()*6};
 if(k==='c'){ZA.addUse({id:'lc'+id,pos:g.position,r:2,hold:.8,label:()=>'Hold <b>E</b> to open the <b style="color:'+hex(TIERS[sub].c)+'">'+TIERS[sub].n+' loot cache</b>',use:()=>openCache(o)});
  if(sub>=2&&Math.hypot(x-me.pos.x,z-me.pos.z)<35)blip(sub===3?880:660,.06,.25,'triangle')}
 // keep it cheap: at most 40 parts around
 if(k==='p'){const ps=Object.values(DROPS).filter(q=>q.k==='p');if(ps.length>40)removeDrop(ps[0])}}
function removeDrop(o){scene.remove(o.g);delete DROPS[o.id];if(o.k==='c')ZA.removeUse('lc'+o.id)}
function clearDrops(){for(const id in DROPS)removeDrop(DROPS[id])}
function hostDrop(list){if(!list.length)return;const m={t:'ev',e:'mdDrop',d:list};bcast(m);for(const d of list)addDrop(d)}
const dp=(p,sp)=>[+(p.x+(rnd()-.5)*sp).toFixed(2),+hAt(p.x,p.z).toFixed(2),+(p.z+(rnd()-.5)*sp).toFixed(2)];
function dropAt(kind,sub,p,owner,sp){const q=dp(p,sp||.6);return[kind,sub,q[0],q[1],q[2],'d'+(dropN++)+Math.random().toString(36).slice(2,5),owner||0]}
ZA.on('kill',(k,v,hs,gun,b)=>{if(!isHost||!b||!b.zombie||RS.ph!=='live')return;const L=[],boss=b.boss,brute=b.ztype==='brute';
 if(boss){L.push(dropAt('p','core',b.pos));for(let i=0;i<3;i++)L.push(dropAt('p',rollPart(),b.pos,0,2))}
 else{if(rnd()<.24)L.push(dropAt('p',rollPart(),b.pos));if(brute&&rnd()<.25)L.push(dropAt('p','core',b.pos,0,1.2))}
 if(noBuy()){if(boss)L.push(dropAt('c',3,b.pos,0,1.5));else if(rnd()<(brute?.3:.08))L.push(dropAt('c',Math.min(3,rollTier(RS.rnd)+(brute?1:0)),b.pos))}
 hostDrop(L)});
function humanSpots(){const L=[[me.id,me.pos]];for(const id in others){const o=others[id];if(o&&o.o)L.push([id,o.o.position])}return L}
function cacheNear(own,p,tier){const a=rnd()*6.28;return dropAt('c',tier,{x:p.x+Math.cos(a)*2.2,z:p.z+Math.sin(a)*2.2},own,.3)}
ZA.on('waveDoneHost',r=>{if(!noBuy())return;hostDrop(humanSpots().map(([id,p])=>cacheNear(id,p,Math.max(rollTier(r),r>=4?1:0))))});

// ================= opening a loot cache =================
function gunPool(){const S=new Set();for(const id in GUNS){const G=GUNS[id];if(G.cat&&!G.base&&!G.wonder&&id!=='service'&&(G.slot===1||G.slot===2))S.add(id)}
 const A=ZA.arsenal;if(A){const ids=Array.isArray(A)?A.map(x=>typeof x==='string'?x:x&&x.id):Object.keys(A);for(const id of ids){const G=id&&GUNS[id];if(G&&(G.slot===1||G.slot===2)&&!G.wonder&&!G.base)S.add(id)}}
 return[...S].sort((a,b)=>(GUNS[a].cost||0)-(GUNS[b].cost||0))}
function gunOfTier(t){const P=gunPool().filter(id=>id!==me.inv.p&&id!==me.inv.s);if(!P.length)return null;const n=P.length,lo=[0,.25,.5,.7][t],hi=[.5,.8,1,1][t];return P[Math.min(n-1,Math.floor(n*(lo+rnd()*(hi-lo))))]}
function giveG(id){const G=GUNS[id];if(!G)return false;giveGun(id);switchTo(G.slot===1?'p':'s');return G.n}
function refill(){for(const g in me.ammo){const G=GUNS[g];if(G&&G.mag)me.ammo[g]=[G.mag,G.res]}}
function givePerkFree(){if(!ZA.PERKS||!ZA.hasPerk)return null;const L=Object.keys(ZA.PERKS).filter(p=>!ZA.hasPerk(p));if(!L.length)return null;const id=pick(L),u=(ZA.uses||[]).find(x=>x.id==='perk_'+id);if(!u)return null;
 const P=ZA.PERKS[id];me.money+=P.cost||0;const m0=me.money;u.use();if(me.money===m0)me.money-=P.cost||0;return P.n}
function addParts(n,core){const got={};for(let i=0;i<n;i++){const k=rollPart();INV[k]++;got[k]=(got[k]||0)+1}if(core){INV.core+=core;got.core=(got.core||0)+core}return Object.keys(got).map(k=>got[k]+' '+PARTS[k].n).join(', ')}
function lootRoll(t){const w=RS.rnd;
 const opts=[[ 'gun',[5,5,6,3][t]],['ammo',[3,2,1,0][t]],['nade',[2,2,1,0][t]],['armor',[2,2,1,0][t]],['parts',[2,2,1,1][t]],['perk',[0,1,2,2][t]],['wonder',[0,0,.3,3][t]],['upgun',[0,0,.6,2][t]]];
 let tot=0;for(const o of opts)tot+=o[1];let r=rnd()*tot;for(const o of opts){r-=o[1];if(r<0)return o[0]}return 'ammo'}
function openCache(o){if(!DROPS[o.id]||me.downed)return;removeDrop(o);const t=o.sub,T=TIERS[t];let kind=lootRoll(t),msg=null;
 for(let tries=0;!msg&&tries<4;tries++){
  if(kind==='gun'){const g=gunOfTier(t);if(g)msg=giveG(g)}
  else if(kind==='upgun'){const g=gunOfTier(3);if(g&&GUNS[g+'+'])msg=giveG(g+'+')}
  else if(kind==='wonder'){const L=['cryo','arc','bile'].filter(k=>GUNS[k]&&me.inv.p!==k);if(L.length)msg=giveG(pick(L))}
  else if(kind==='perk')msg=givePerkFree();
  else if(kind==='ammo'){refill();me.nades.he=Math.max(me.nades.he,1);msg='Full ammo'}
  else if(kind==='nade'){me.nades.he=Math.min(3,me.nades.he+1+(t>0?1:0));if(t>0)me.nades.flash=Math.min(2,me.nades.flash+1);msg='Grenades'}
  else if(kind==='armor'){me.armor=t>0?100:Math.min(100,me.armor+50);if(t>0)me.helm=true;msg=t>0?'Armor and helmet':'Armor plate'}
  else if(kind==='parts')msg='Parts: '+addParts(2+t*2,t>=2?1:0);
  if(!msg)kind=pick(['gun','ammo','parts'])}
 if(!msg){refill();msg='Full ammo'}
 if(t>=2)refill();
 center(T.n.toUpperCase()+' CACHE',msg,hex(T.c));puff(o.g.position.clone().add(new V3(0,.6,0)),T.c,.8,.5,.5);
 [523,659,784,1046].slice(0,2+t).forEach((f,i)=>setTimeout(()=>blip(f,.08,.18,'triangle'),i*80));drawHud()}

// ================= crafting =================
const GAD={fire:{n:'Firebomb'},med:{n:'Med-kit'},turret:{n:'Sentry Gun'},spike:{n:'Spike Mat'}};
const GINV={fire:0,med:0,turret:0,spike:0};let gSel='fire';
const RECIPES=[
 {id:'frag',n:'Frag Grenade',d:'+1 HE grenade (carry up to 3)',c:{powder:2,scrap:1},ok:()=>me.nades.he<3||'Grenades full',do(){me.nades.he++;me.gsel='he'}},
 {id:'fire',n:'Firebomb',d:'Gadget. Throw with X: burns the ground for 7 s',c:{chem:2,scrap:1},gad:'fire'},
 {id:'plate',n:'Armor Plate',d:'+50 armor',c:{scrap:3,wiring:1},ok:()=>me.armor<100||'Armor full',do(){me.armor=Math.min(100,me.armor+50)}},
 {id:'med',n:'Med-kit',d:'Gadget. X heals you fully. If you go down while carrying one, it gets you back up',c:{chem:2,wiring:1},gad:'med'},
 {id:'ammo',n:'Ammo Pack',d:'Refills every gun you carry',c:{powder:2,scrap:2},do:refill},
 {id:'spike',n:'Spike Mat',d:'Gadget. X drops it at your feet: shreds zombies that cross it',c:{scrap:3,wiring:1},gad:'spike'},
 {id:'turret',n:'Sentry Gun',d:'Gadget. X deploys an auto-turret for 45 s',c:{scrap:4,wiring:3,powder:2},gad:'turret'},
 {id:'wonder',n:'Prototype Assembly',d:'Builds a random wonder weapon',c:{core:1,wiring:3,chem:3,scrap:2},ok:()=>['cryo','arc','bile'].some(k=>GUNS[k])||'Unavailable',do(){const L=['cryo','arc','bile'].filter(k=>GUNS[k]&&me.inv.p!==k);giveG(pick(L.length?L:['cryo','arc','bile'].filter(k=>GUNS[k])))}}];
const canPay=c=>Object.keys(c).every(k=>INV[k]>=c[k]);
function craft(id){const R=RECIPES.find(r=>r.id===id);if(!R||!canPay(R.c))return;if(R.ok){const v=R.ok();if(v!==true){center('',v);return}}if(R.gad&&GINV[R.gad]>=3){center('','You can carry 3');return}
 for(const k in R.c)INV[k]-=R.c[k];if(R.gad){GINV[R.gad]++;gSel=R.gad}else R.do();
 blip(420,.06,.08,'square');setTimeout(()=>blip(760,.08,.15,'triangle'),90);feed('Crafted '+R.n,'#9be06a');drawPanel();drawHud()}
const panel=document.createElement('div');panel.id='mdCraft';panel.innerHTML='<div class="bx"><h3>WORKBENCH</h3><div class="inv" id="mdInv"></div><div id="mdList"></div><div class="ft"><span>Parts drop from zombies. Gadgets: X use, Z switch.</span><button type="button" id="mdClose">Close (E)</button></div></div>';
document.body.appendChild(panel);
panel.querySelector('#mdClose').onclick=()=>closePanel();
panel.querySelector('#mdList').onclick=e=>{const b=e.target.closest('button[data-r]');if(b)craft(b.dataset.r)};
const pOpen=()=>panel.style.display==='flex';
function invHtml(){return PK.map(k=>'<span style="color:'+hex(PARTS[k].c)+'">'+PARTS[k].n+'</span><b>'+INV[k]+'</b>').join('')}
function drawPanel(){if(!pOpen())return;panel.querySelector('#mdInv').innerHTML=invHtml();
 panel.querySelector('#mdList').innerHTML=RECIPES.map(R=>{const can=canPay(R.c),own=R.gad?' <span style="color:#e9c46a">(have '+GINV[R.gad]+')</span>':'';
  return '<div class="r"><div><div class="n">'+R.n+own+'</div><div class="d">'+R.d+'</div><div class="c">'+Object.keys(R.c).map(k=>'<span class="'+(INV[k]>=R.c[k]?'':'no')+'">'+R.c[k]+' '+PARTS[k].n+'</span>').join('')+'</div></div><button type="button" data-r="'+R.id+'"'+(can?'':' disabled')+'>Craft</button></div>'}).join('')}
function openPanel(){if(!running||!me.alive)return;document.exitPointerLock();panel.style.display='flex';drawPanel()}
function closePanel(){if(!pOpen())return;panel.style.display='none';if(running)R.domElement.requestPointerLock()}
document.addEventListener('pointerlockchange',()=>{if(pOpen()&&running){const p=document.getElementById('pause');if(p)p.style.display='none'}});
addEventListener('keydown',e=>{if(!pOpen())return;if(e.code==='Escape')closePanel()});
// workbench mesh + spot near spawn
let benchPos=null,benchG=null;
function makeBench(){const g=new THREE.Group(),wood=new THREE.MeshLambertMaterial({color:0x6b4a2c}),steel=new THREE.MeshLambertMaterial({color:0x4a5048}),glow=new THREE.MeshBasicMaterial({color:0x7fd0ff});
 const top=new THREE.Mesh(new THREE.BoxGeometry(1.8,.1,.8),wood);top.position.y=.9;g.add(top);const lg=new THREE.BoxGeometry(.08,.9,.08);
 for(const[x,z]of[[-.82,-.34],[.82,-.34],[-.82,.34],[.82,.34]]){const l=new THREE.Mesh(lg,steel);l.position.set(x,.45,z);g.add(l)}
 const sh=new THREE.Mesh(new THREE.BoxGeometry(1.7,.05,.7),wood);sh.position.y=.25;g.add(sh);
 const vise=new THREE.Mesh(new THREE.BoxGeometry(.25,.18,.2),steel);vise.position.set(-.6,1.04,.2);g.add(vise);
 const box=new THREE.Mesh(new THREE.BoxGeometry(.4,.16,.25),new THREE.MeshLambertMaterial({color:0x8a2a1e}));box.position.set(.45,1.03,-.1);g.add(box);
 const lamp=new THREE.Mesh(new THREE.BoxGeometry(.5,.04,.08),glow);lamp.position.set(0,1.5,-.32);g.add(lamp);const pole=new THREE.Mesh(new THREE.BoxGeometry(.04,.6,.04),steel);pole.position.set(0,1.2,-.34);g.add(pole);
 const ring=new THREE.Mesh(new THREE.RingGeometry(1.2,1.5,20).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x7fd0ff,transparent:true,opacity:.22,depthWrite:false,blending:THREE.AdditiveBlending}));ring.position.y=.03;g.add(ring);return g}
function placeBench(){if(benchG)return;const sp=SPAWN[0],others_=(ZA.uses||[]).map(u=>typeof u.pos==='function'?u.pos():u.pos).filter(Boolean);
 const free=(x,z)=>{for(let dx=-1.2;dx<=1.2;dx+=.6)for(let dz=-1.2;dz<=1.2;dz+=.6){const k=cell(x+dx,z+dz);if(k<0||H[k]>.3)return false}return !others_.some(p=>Math.hypot(p.x-x,p.z-z)<3.5)};
 let p=null;for(let r=4;r<12&&!p;r+=1.5)for(let a=0;a<16&&!p;a++){const an=a/16*6.28,x=sp.x+Math.cos(an)*r,z=sp.z+Math.sin(an)*r;if(free(x,z)&&(!M||M.zoneAt(x,z)===0))p=new V3(x,hAt(x,z),z)}
 if(!p)p=new V3(sp.x+3,hAt(sp.x+3,sp.z),sp.z);benchPos=p;benchG=makeBench();benchG.position.copy(p);benchG.rotation.y=Math.atan2(sp.x-p.x,sp.z-p.z);scene.add(benchG);
 (ZA.markers=ZA.markers||[]).push({id:'bench',pos:p,color:'#7fd0ff',shape:'square'});
 ZA.addUse({id:'bench',pos:p,r:2.6,label:()=>'Press <b>E</b> to use the Workbench',use:()=>pOpen()?closePanel():openPanel()})}

// ================= gadgets =================
addEventListener('keydown',e=>{if(!running||e.repeat||pOpen())return;const tg=e.target&&e.target.tagName;if(tg==='INPUT'||tg==='TEXTAREA')return;
 if(e.code==='KeyZ'){const L=Object.keys(GAD).filter(k=>GINV[k]);if(!L.length)return;gSel=L[(L.indexOf(gSel)+1)%L.length];blip(900,.03,.04);drawHud()}
 if(e.code==='KeyX')useGadget()});
function useGadget(force){if(!me.alive||me.downed||(!locked&&!force))return;if(!GINV[gSel]){const L=Object.keys(GAD).filter(k=>GINV[k]);if(!L.length)return;gSel=L[0]}const k=gSel;
 if(k==='med'){if(me.hp>=(ZA.maxHP||100)){center('','Health is full');return}me.hp=ZA.maxHP||100;center('','Patched up','#9be06a');blip(600,.06,.2,'triangle')}
 else if(k==='fire')throwFire();
 else{if(!me.ground){center('','Stand on the ground');return}const f=new V3(-Math.sin(me.yaw),0,-Math.cos(me.yaw)),p=me.pos.clone().addScaledVector(f,k==='turret'?1.4:.2);p.y=hAt(p.x,p.z);
  const m={t:'ev',e:k==='turret'?'mdTurret':'mdSpike',p:[+p.x.toFixed(2),+p.y.toFixed(2),+p.z.toFixed(2)],by:me.id};if(isHost)hostPlace(m);else send(m);blip(300,.06,.1,'square')}
 GINV[k]--;drawHud()}
ZA.useGadget=useGadget;ZA.gadgets=GINV;ZA.dropCache=(tier,p)=>{if(isHost)hostDrop([cacheNear(0,p||me.pos,tier|0)])};
// medkit: auto self-revive when you go down
const _tsr=ZA.trySelfRevive;ZA.trySelfRevive=function(){if(_tsr&&_tsr())return true;if(GINV.med>0){GINV.med--;drawHud();center('MED-KIT','Patching yourself up…','#9be06a');return true}return false};
// firebomb: local projectile, the host owns the fire
const bottleG=new THREE.CylinderGeometry(.05,.07,.22,6),bottleM=new THREE.MeshLambertMaterial({color:0x6a8a3a}),flyers=[];
function throwFire(){const d=new V3(0,0,-1).applyEuler(new THREE.Euler(me.pitch+.15,me.yaw,0,'YXZ')),p=me.pos.clone();p.y+=eyeH()-.1;p.addScaledVector(d,.4);
 const m=new THREE.Mesh(bottleG,bottleM);m.position.copy(p);scene.add(m);flyers.push({m,v:d.multiplyScalar(15),t:3});blip(400,.04,.08)}
function tickFlyers(dt){for(let i=flyers.length-1;i>=0;i--){const f=flyers[i];f.t-=dt;f.v.y-=20*dt;const p=f.m.position;p.addScaledVector(f.v,dt);f.m.rotation.x+=dt*9;
 const g=hAt(p.x,p.z);if(p.y<=g+.05||f.t<=0){scene.remove(f.m);flyers.splice(i,1);if(g>p.y+.6)p.sub(f.v.clone().normalize().multiplyScalar(.6));p.y=hAt(p.x,p.z);
  const m={t:'ev',e:'mdFire',p:[+p.x.toFixed(2),+p.y.toFixed(2),+p.z.toFixed(2)],by:me.id};if(isHost)hostPlace(m);else send(m)}}}
// ---- host authority for fires / spikes / turrets ----
const FIRES={},SPIKES={};let fxN=0;
function hostPlace(m){if(!isHost)return;const id='f'+(fxN++);
 if(m.e==='mdFire'){FIRES[id]={p:new V3(...m.p),by:m.by,t:7,tick:0};const b={t:'ev',e:'mdFx',k:'fire',id,p:m.p};bcast(b);onMd(b)}
 else if(m.e==='mdSpike'){const n=Object.keys(SPIKES);if(n.length>=6)hostSpikeOff(n[0]);SPIKES[id]={p:new V3(...m.p),by:m.by,t:75,hits:36,tick:0};const b={t:'ev',e:'mdFx',k:'spike',id,p:m.p};bcast(b);onMd(b)}
 else if(m.e==='mdTurret'){let mine=turrets.filter(t=>t.md);if(mine.length>=4)turrets.splice(turrets.indexOf(mine[0]),1);
  turrets.push({id:'tu'+(turretN++),owner:m.by,p:new V3(...m.p),yaw:0,cd:.6,t:45,md:1,tg:null,th:0});const b={t:'ev',e:'mdFx',k:'turret',by:m.by};bcast(b);onMd(b)}}
function hostSpikeOff(id){delete SPIKES[id];const b={t:'ev',e:'mdFx',k:'off',id};bcast(b);onMd(b)}
const _mz=new V3(),_tc=new V3();
ZA.on('hostTick',dt=>{const w=RS.rnd,zh=ZA.zHP(w);
 for(const id in FIRES){const f=FIRES[id];f.t-=dt;f.tick-=dt;if(f.t<=0){delete FIRES[id];continue}if(f.tick>0)continue;f.tick=.5;
  for(const b of bots)if(b.zombie&&b.alive&&Math.hypot(b.pos.x-f.p.x,b.pos.z-f.p.z)<3.2&&Math.abs(b.pos.y-f.p.y)<2)applyHit(b.id,12+zh*.08,f.by,false,'fire')}
 for(const id in SPIKES){const s=SPIKES[id];s.t-=dt;s.tick-=dt;if(s.t<=0||s.hits<=0){hostSpikeOff(id);continue}if(s.tick>0)continue;s.tick=.4;
  for(const b of bots)if(b.zombie&&b.alive&&!b.boss&&Math.hypot(b.pos.x-s.p.x,b.pos.z-s.p.z)<1.4&&Math.abs(b.pos.y-s.p.y)<1){applyHit(b.id,20+zh*.3,s.by,false,'spikes');s.hits--}}
 let any=false;for(let i=turrets.length-1;i>=0;i--){const t=turrets[i];if(!t.md)continue;any=true;t.t-=dt;if(t.t<=0){turrets.splice(i,1);continue}t.cd-=dt;t.th-=dt;
  _mz.copy(t.p);_mz.y+=1.05;
  if(t.th<=0){t.th=.3;t.tg=null;let bd=30;for(const b of bots){if(!b.zombie||!b.alive)continue;_tc.copy(b.pos);_tc.y+=1;const d=_tc.distanceTo(_mz);if(d<bd&&los(_mz,_tc)){bd=d;t.tg=b}}}
  const b=t.tg;if(!b||!b.alive)continue;const dx=b.pos.x-_mz.x,dz=b.pos.z-_mz.z;let dy=Math.atan2(-dx,-dz)-t.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));t.yaw+=dy*Math.min(1,dt*8);
  if(t.cd<=0&&Math.abs(dy)<.3){t.cd=.16;const e=b.pos.clone();e.y+=1.1+(rnd()-.5)*.3;const dir=e.clone().sub(_mz).normalize(),o=_mz.clone().addScaledVector(dir,.75);
   fxShot(o.toArray(),e.toArray(),'lmg',false);bcast({t:'fx',o:o.toArray(),e:e.toArray(),g:'lmg'});applyHit(b.id,16+w*3,t.owner,false,'turret')}}
 if(any||turrets.length===0)syncTurrets(turretState())});
// ---- visuals for fires / spikes (all peers) ----
const flameG=new THREE.ConeGeometry(.35,1.4,6);flameG.translate(0,.7,0);const flameM=new THREE.MeshBasicMaterial({color:0xff7a20,transparent:true,opacity:.75,depthWrite:false,blending:THREE.AdditiveBlending});
const fglowG=new THREE.CircleGeometry(3.2,16).rotateX(-Math.PI/2),fglowM=new THREE.MeshBasicMaterial({color:0xff5a10,transparent:true,opacity:.3,depthWrite:false,blending:THREE.AdditiveBlending});
const spPlate=new THREE.CylinderGeometry(1.2,1.2,.05,10),spCone=new THREE.ConeGeometry(.06,.32,4),spM=new THREE.MeshLambertMaterial({color:0x2a2a26}),spS=new THREE.MeshLambertMaterial({color:0xa8a8a0});
const VIS={};
function fireVis(id,p){const g=new THREE.Group();g.position.set(p[0],p[1],p[2]);const gl=new THREE.Mesh(fglowG,fglowM);gl.position.y=.05;g.add(gl);g.userData.f=[];
 for(let i=0;i<7;i++){const f=new THREE.Mesh(flameG,flameM),a=i/7*6.28,r=i?1+rnd()*1.6:0;f.position.set(Math.cos(a)*r,0,Math.sin(a)*r);g.add(f);g.userData.f.push(f)}
 scene.add(g);VIS[id]={g,t:7,fire:1};if(Math.hypot(p[0]-me.pos.x,p[2]-me.pos.z)<35){noise&&noise(.3,.5,500,1);blip(90,.1,.5,'sawtooth')}}
function spikeVis(id,p){const g=new THREE.Group();g.position.set(p[0],p[1]+.03,p[2]);g.add(new THREE.Mesh(spPlate,spM));for(let i=0;i<9;i++){const s=new THREE.Mesh(spCone,spS),a=i/9*6.28,r=i?.8:0;s.position.set(Math.cos(a)*r,.18,Math.sin(a)*r);g.add(s)}
 scene.add(g);VIS[id]={g,t:999}}
function onMd(m){
 if(m.e==='mdMode'){if(isHost)return true;const ch=MODE.m!==m.m||MODE.nb!==!!m.nb;MODE.m=m.m;MODE.nb=!!m.nb;if(ch)applyMap();drawHud();return true}
 if(m.e==='mdDrop'){if(!isHost)for(const d of m.d)addDrop(d);return true}
 if(m.e==='mdDoor'){const d=M&&M.doors[m.i];if(d){feed('The '+d.name+' gave way','#e9c46a');center('','NEW AREA OPEN','#e9c46a')}return true}
 if(m.e==='mdFx'){if(m.k==='fire')fireVis(m.id,m.p);else if(m.k==='spike')spikeVis(m.id,m.p);else if(m.k==='off'){const v=VIS[m.id];if(v){scene.remove(v.g);delete VIS[m.id]}}
  else if(m.k==='turret')feed((m.by===me.id?'You':nameOf(m.by))+' deployed a Sentry Gun','#e9c46a');return true}
 return false}
ZA.on('ev',m=>{if(m&&typeof m.e==='string'&&m.e.slice(0,2)==='md')return onMd(m)||undefined});
const _hostMsg=hostMsg;window.hostMsg=function(c,m){if(m&&m.t==='ev'&&(m.e==='mdFire'||m.e==='mdSpike'||m.e==='mdTurret')){m.by=c.peer;hostPlace(m);return}return _hostMsg(c,m)};

// ================= per-frame (all peers) =================
const _pp=new V3();let hudT=0;
ZA.on('tick',dt=>{gateUses();tickFlyers(dt);const now=performance.now()/1000;
 if(noBuy()&&ZA.Z.boxMesh)ZA.Z.boxMesh.visible=false;
 for(const id in DROPS){const o=DROPS[id];o.t-=dt;if(o.t<=0){removeDrop(o);continue}
  if(o.k==='p'){const s=o.g.userData.spin;s.rotation.y+=dt*2.5;s.position.y=.45+Math.sin(now*3+o.ph)*.08;o.g.visible=o.t>5||Math.sin(now*14)>0;
   if(me.alive&&Math.hypot(o.g.position.x-me.pos.x,o.g.position.z-me.pos.z)<1.5&&Math.abs(o.g.position.y-me.pos.y)<2){INV[o.sub]++;removeDrop(o);blip(o.sub==='core'?1300:980,.04,.07,'triangle');if(o.sub==='core')center('','Core salvaged','#6ae0ff');drawHud();drawPanel()}}
  else{const gl=o.g.userData.glow;gl.material.opacity=.22+.1*Math.sin(now*4)}}
 for(const id in VIS){const v=VIS[id];v.t-=dt;if(v.t<=0){scene.remove(v.g);delete VIS[id];continue}
  if(v.fire){const k=Math.min(1,v.t/1.2);for(let i=0;i<v.g.userData.f.length;i++){const f=v.g.userData.f[i];f.scale.set(k,k*(.6+.5*Math.abs(Math.sin(now*9+i*1.7))),k);f.rotation.y=now*3+i}}}
 if(pOpen()&&(!me.alive||!benchPos||Math.hypot(benchPos.x-me.pos.x,benchPos.z-me.pos.z)>4))closePanel();
 hudT-=dt;if(hudT<=0){hudT=.5;drawHud()}});
let hudLast='';
function drawHud(){const tag=(classic()?'CLASSIC':'STANDARD')+(noBuy()?' · NO-BUY':'');
 const parts=PK.filter(k=>INV[k]||k!=='core').map(k=>'<span class="p"><i style="background:'+hex(PARTS[k].c)+'"></i>'+INV[k]+'</span>').join('');
 const gl=Object.keys(GAD).filter(k=>GINV[k]);let g='';if(gl.length){if(!GINV[gSel])gSel=gl[0];g='<div class="g"><b>X</b> '+GAD[gSel].n+' x'+GINV[gSel]+(gl.length>1?' · <b>Z</b> switch':'')+'</div>'}
 const h='<div class="m">'+tag+'</div><div>'+parts+'</div>'+g;if(h!==hudLast){hudLast=h;hudEl.innerHTML=h}}
// hint line: no "B to buy" in No-Buy
const _hud=window.hud;window.hud=function(){_hud.apply(this,arguments);if(noBuy()){const h=document.getElementById('hint');if(h&&/B to buy/.test(h.innerHTML))h.innerHTML=h.innerHTML.replace('B to buy','No-Buy: open loot caches')}};

// ================= game flow =================
ZA.on('begin',()=>{placeBench();gateUses();drawHud()});
ZA.on('waveStart',(r,fresh)=>{
 if(fresh){for(const k of PK)INV[k]=0;for(const k in GINV)GINV[k]=0;clearDrops();for(const id in VIS){scene.remove(VIS[id].g);delete VIS[id]}for(const k in FIRES)delete FIRES[k];for(const k in SPIKES)delete SPIKES[k];closePanel()}
 if(isHost){bcast({t:'ev',e:'mdMode',m:MODE.m,nb:MODE.nb?1:0});
  if(fresh&&noBuy())setTimeout(()=>{if(running&&RS.rnd===1)hostDrop(humanSpots().map(([id,p])=>cacheNear(id,p,0)))},1500)}
 if(fresh)applyMap();else if(classic())openMap();
 if(isHost&&!fresh)autoDoors(r);
 if(fresh&&(classic()||noBuy()))setTimeout(()=>{if(running&&RS.rnd===1)center('WAVE 1',(classic()?'Classic: the whole town is open':'Standard')+(noBuy()?' · No-Buy: loot caches only, hold E to open':''),'#9be06a')},2600);
 drawHud()});
// wave-end bonus parts for everyone (local)
ZA.on('waveDone',w=>{const s=addParts(2,0);feed('Salvaged '+s,'#9be06a');drawHud()});
ZA.on('gameOver',()=>{closePanel()});
})();
