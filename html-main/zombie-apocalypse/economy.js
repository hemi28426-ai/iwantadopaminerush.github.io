// zombie-apocalypse/economy.js — points, Supply Crate shop, perk machines, Upgrade Forge, power-ups, mystery box, wonder weapons
(function(){
'use strict';
const ZA=window.ZA;if(!ZA)return;const Z=ZA.Z;
ZA.difficulty=ZA.difficulty||{id:'normal',hp:1,spd:1,dmg:1,pts:1};ZA.markers=ZA.markers||[];
const V3=THREE.Vector3,TMP=new V3(),TMP2=new V3(),rand=(a,b)=>a+Math.random()*(b-a),PTS_CAP=999999;
const isBoss=b=>!!(b&&(b.boss||/boss/i.test(b.ztype||b.type||'')));
const baseOf=id=>{const G=GUNS[id];return G&&G.base?G.base:id};
function spot(p){if(!p)return null;let x,z;if(Array.isArray(p)){x=p[0];z=p.length>2?p[2]:p[1]}else{x=p.x;z=p.z}const v=new V3(x,hAt(x,z),z);v.ry=p.ry;v.perk=p.perk||p.id;return v}
function mark(id,pos,color,shape){const i=ZA.markers.findIndex(m=>m.id===id);const m={id,pos,color,shape};if(i>=0)ZA.markers[i]=m;else ZA.markers.push(m)}
function unmark(id){const i=ZA.markers.findIndex(m=>m.id===id);if(i>=0)ZA.markers.splice(i,1)}
function bc(m){if(isHost)bcast(m);else send(m)}
// ================= canvas icons (no emojis) =================
const COL={gut:'#d9473a',quick:'#3cc46e',wind:'#4aa3e6',double:'#e8a22e',fleet:'#a874e8',ammo:'#e8c84a',dbl:'#9be06a',insta:'#e8e8e8',nuke:'#ffb030',carp:'#c98a4a',armor:'#8fb4ff',frag:'#9fae7a',refill:'#e8c84a'};
function icon(g,type,s){const c=COL[type]||'#fff';g.save();g.lineJoin='round';g.lineCap='round';
 const rr=(x,y,w,h,r)=>{g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()};
 const bullet=(x,y,w,h)=>{g.beginPath();g.moveTo(x,y+h);g.lineTo(x,y+w*.6);g.quadraticCurveTo(x+w/2,y-w*.3,x+w,y+w*.6);g.lineTo(x+w,y+h);g.closePath();g.fill()};
 rr(s*.04,s*.04,s*.92,s*.92,s*.18);g.fillStyle='rgba(10,12,8,.85)';g.fill();g.lineWidth=s*.06;g.strokeStyle=c;g.stroke();g.fillStyle=c;g.strokeStyle=c;g.lineWidth=s*.08;const u=s/10;
 if(type==='gut'||type==='armor'){g.beginPath();g.moveTo(5*u,1.8*u);g.lineTo(8.2*u,3*u);g.lineTo(8*u,5.6*u);g.quadraticCurveTo(7.4*u,7.8*u,5*u,8.6*u);g.quadraticCurveTo(2.6*u,7.8*u,2*u,5.6*u);g.lineTo(1.8*u,3*u);g.closePath();g.fill();
  if(type==='gut'){g.fillStyle='#111';g.fillRect(4.4*u,3.4*u,1.2*u,3.8*u);g.fillRect(3.1*u,4.7*u,3.8*u,1.2*u)}}
 else if(type==='quick'||type==='refill'){g.beginPath();g.arc(5*u,5*u,2.8*u,-.3,Math.PI*1.45);g.stroke();g.beginPath();g.moveTo(7.6*u,2.2*u);g.lineTo(8.2*u,5*u);g.lineTo(5.6*u,4*u);g.closePath();g.fill();if(type==='refill')bullet(4.3*u,3.6*u,1.4*u,3*u)}
 else if(type==='wind'){g.beginPath();g.moveTo(5*u,8.4*u);g.bezierCurveTo(1*u,5.6*u,1.6*u,1.6*u,5*u,3.4*u);g.bezierCurveTo(8.4*u,1.6*u,9*u,5.6*u,5*u,8.4*u);g.fill();g.strokeStyle='#111';g.lineWidth=s*.05;g.beginPath();g.moveTo(2.6*u,5*u);g.lineTo(4*u,5*u);g.lineTo(4.6*u,3.9*u);g.lineTo(5.4*u,6.3*u);g.lineTo(6*u,5*u);g.lineTo(7.4*u,5*u);g.stroke()}
 else if(type==='double'){bullet(2.6*u,2*u,1.9*u,6.4*u);bullet(5.6*u,2*u,1.9*u,6.4*u)}
 else if(type==='fleet'){for(const o of[0,2.6]){g.beginPath();g.moveTo((2+o)*u,2.4*u);g.lineTo((4.8+o)*u,5*u);g.lineTo((2+o)*u,7.6*u);g.stroke()}}
 else if(type==='ammo'){for(let i=0;i<3;i++)bullet((2.1+i*2.1)*u,2*u,1.6*u,6.2*u)}
 else if(type==='dbl'){g.font='bold '+(5.6*u)+'px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('x2',5*u,5.3*u)}
 else if(type==='insta'){g.beginPath();g.arc(5*u,4.4*u,3*u,0,7);g.fill();g.fillRect(3.4*u,6*u,3.2*u,2.4*u);g.fillStyle='#111';g.beginPath();g.arc(3.9*u,4.4*u,.9*u,0,7);g.arc(6.1*u,4.4*u,.9*u,0,7);g.fill();g.fillRect(4.1*u,7.2*u,.4*u,1.2*u);g.fillRect(5.5*u,7.2*u,.4*u,1.2*u)}
 else if(type==='nuke'){g.beginPath();g.arc(5*u,5*u,.9*u,0,7);g.fill();for(let i=0;i<3;i++){const a=-Math.PI/2+i*Math.PI*2/3;g.beginPath();g.arc(5*u,5*u,3.6*u,a-.5,a+.5);g.arc(5*u,5*u,1.5*u,a+.5,a-.5,true);g.closePath();g.fill()}}
 else if(type==='carp'){g.save();g.translate(5*u,5*u);g.rotate(-.7);g.fillRect(-.5*u,-1*u,1*u,5*u);g.fillRect(-2.6*u,-3*u,5.2*u,2*u);g.restore()}
 else if(type==='frag'){g.beginPath();g.ellipse(5*u,5.6*u,2.6*u,3*u,0,0,7);g.fill();g.fillRect(4*u,1.6*u,2*u,1.4*u);g.strokeStyle='#111';g.lineWidth=s*.04;g.beginPath();g.moveTo(2.6*u,5.6*u);g.lineTo(7.4*u,5.6*u);g.moveTo(5*u,2.8*u);g.lineTo(5*u,8.5*u);g.stroke()}
 g.restore()}
const iconURL={};function iconSrc(t,s=48){const k=t+s;if(iconURL[k])return iconURL[k];const c=document.createElement('canvas');c.width=c.height=s;icon(c.getContext('2d'),t,s);return iconURL[k]=c.toDataURL()}
function labelTex(type,title,sub,col){const c=document.createElement('canvas');c.width=128;c.height=256;const g=c.getContext('2d');
 const gr=g.createLinearGradient(0,0,0,256);gr.addColorStop(0,col);gr.addColorStop(1,'#111');g.fillStyle=gr;g.fillRect(0,0,128,256);g.fillStyle='rgba(0,0,0,.35)';g.fillRect(6,6,116,244);
 if(type){g.save();g.translate(24,22);icon(g,type,80);g.restore()}
 g.fillStyle='#fff';g.textAlign='center';g.font='bold 19px sans-serif';const w=title.split(' ');let y=type?138:70;for(const l of w.length>1?[w.slice(0,-1).join(' '),w[w.length-1]]:w){g.fillText(l.toUpperCase(),64,y);y+=22}
 g.font='13px sans-serif';g.fillStyle='#ffe9a0';if(sub)g.fillText(sub,64,y+10);
 for(let i=0;i<6;i++){g.fillStyle=i%2?'#222':'#444';g.fillRect(18+i*16,212,12,24)}
 const t=new THREE.CanvasTexture(c);return t}
// ================= styles + HUD =================
const css=document.createElement('style');css.textContent=`
#zaPerks{position:absolute;left:18px;bottom:156px;display:flex;gap:5px}#zaPerks img{width:34px;height:34px;filter:drop-shadow(0 0 4px rgba(0,0,0,.8))}
#zaPU{position:absolute;left:50%;bottom:160px;transform:translateX(-50%);display:flex;gap:14px}#zaPU div{display:flex;flex-direction:column;align-items:center;font:600 15px var(--hfont);color:#fff;text-shadow:0 1px 3px #000}#zaPU img{width:44px;height:44px}#zaPU div.blink img{opacity:.35}
#buy .it .ic img{height:40px}`;document.head.appendChild(css);
const perkBar=document.createElement('div');perkBar.id='zaPerks';const puBar=document.createElement('div');puBar.id='zaPU';
{const h=$('hud');h.appendChild(perkBar);h.appendChild(puBar)}
// ================= points =================
const PU={dbl:0,insta:0};let _kc=null,_ptsPos=null;
const mult=()=>((ZA.difficulty&&ZA.difficulty.pts)||1)*(PU.dbl>0?2:1);
const _am=window.addMoney;window.addMoney=function(n,why){
 if(why&&/^kill/.test(why)){const c=_kc||{};const kn=c.gun==='knife';n=kn?130:c.hs?150:100;why=kn?'knife kill':c.hs?'headshot kill':'zombie kill'}
 if(n>0&&why)n=Math.round(n*mult());
 const before=me.money;_am(n,null);if(n>0&&me.money<before+n)me.money=Math.min(PTS_CAP,before+n);
 if(why)feed((n>=0?'+':'-')+Math.abs(n)+' pts '+why,n>=0?'#9be06a':'#f77');if(n>0)ZA.emit('points',n,why||'',_ptsPos)};
ZA.addPts=function(n,why,pos){_ptsPos=pos||null;try{window.addMoney(n,why||'bonus')}finally{_ptsPos=null}};
const _ok=window.onKill;window.onKill=function(k,v,hs,gun){_kc={hs,gun};try{return _ok(k,v,hs,gun)}finally{_kc=null}};
// hits: core gives +10 per zombie hit; add double-points / difficulty bonus, Double Shot damage
const _rh=window.routeHit;window.routeHit=function(t,d,f,hs,g){
 if(f===me.id&&teamOf(t)===1){if(hasPerk('double')&&g!=='knife')d*=1.25;const extra=Math.round(10*mult())-10;if(extra)me.money=Math.min(PTS_CAP,Math.max(0,me.money+extra));ZA.emit('points',10+extra,'hit',null)}
 return _rh(t,d,f,hs,g)};
// host: insta-kill, cryo chill
const _ah=window.applyHit;window.applyHit=function(target,dmg,from,hs,gun){
 const b=bots.find(x=>x.id===target);
 if(b&&b.zombie&&b.alive){
  if(GUNS[gun]&&GUNS[gun].wonder==='cryo'){b.spd0=b.spd0||b.spd;b.chill=(b.chill||0)+1;b.chillT=1.6;b.spd=b.spd0*Math.max(.12,1-b.chill*.14);
   if(b.chill>=7&&!isBoss(b)){dmg=b.hp+50;const p=b.pos;zfx({t:'ev',e:'zfx',k:'shatter',p:[p.x,p.y+1,p.z]})}}
  if(PU.insta>0)dmg=isBoss(b)?dmg*3:Math.max(dmg,b.hp+1)}
 return _ah(target,dmg,from,hs,gun)};
ZA.on('hostTick',dt=>{for(const b of bots)if(b.chill){b.chillT-=dt;if(b.chillT<=0){b.chill=0;b.spd=b.spd0}}});
// ================= Supply Crate shop =================
let crateMesh=null,cratePos=null;
function makeCrate(){const g=new THREE.Group(),wood=new THREE.MeshLambertMaterial({color:0x6a4a26}),lab=new THREE.MeshBasicMaterial({map:labelTex('refill','Supply Crate','B / E','#3a5a2a')});
 const b=new THREE.Mesh(new THREE.BoxGeometry(1.6,.9,1),wood);b.position.y=.45;g.add(b);const l=new THREE.Mesh(new THREE.PlaneGeometry(.45,.9),lab);l.position.set(0,.5,.51);g.add(l);
 const s=new THREE.Mesh(new THREE.BoxGeometry(1.64,.08,1.04),new THREE.MeshLambertMaterial({color:0x2e3a22}));s.position.y=.7;g.add(s);return g}
const nearCrate=()=>cratePos&&Math.hypot(me.pos.x-cratePos.x,me.pos.z-cratePos.z)<5;
window.canBuy=function(){return me.alive&&!me.downed&&(RS.ph==='end'||RS.ph==='wait'||nearCrate())};
const _ob=window.openBuy;window.openBuy=function(){if(running&&!window.canBuy()){center('','Supply Crate: buy at the crate in spawn during a wave · anywhere between waves');return}return _ob()};
const GEAR_Z=[{id:'armor',n:'Body Armor',cost:1000,sub:'100 armor · soaks zombie hits'},{id:'frag',n:'Frag Grenade',cost:250,sub:'max 3'}];
window.drawBuy=function(){const h=$('buy').querySelector('h2');if(h)h.textContent='Supply Crate';$('buyCash').textContent=me.money+' pts';
 $('buyTime').textContent=RS.ph==='end'?'Between waves: shop from anywhere':'During a wave: stay near the crate';const cols={};
 for(const id in GUNS){const G=GUNS[id];if(!G.cat||G.base||G.wonder)continue;const own=me.inv.p===id||me.inv.s===id,a=me.ammo[id]||[0,0],full=own&&a[0]>=G.mag&&a[1]>=G.res;
  (cols[G.cat]=cols[G.cat]||[]).push(own?{id,n:G.n+' ammo',cost:Math.round(G.cost/20)*10||100,own:full,sub:'refill · '+a[0]+'/'+a[1],buy:()=>{me.ammo[id]=[G.mag,G.res]}}
   :{id,n:G.n,cost:G.cost,sub:`${G.dmg}${G.pel?'×'+G.pel:''} dmg · ${G.rpm} rpm${G.auto?' · auto':''}`,buy:()=>{giveGun(id);switchTo(G.slot===1?'p':'s')}})}
 cols.Gear=GEAR_Z.map(g=>g.id==='armor'?{id:'armor',ic:'armor',n:g.n,cost:g.cost,sub:g.sub,own:me.armor>=100,buy:()=>{me.armor=100}}
  :{id:'frag',ic:'frag',n:g.n,cost:g.cost,sub:g.sub+(me.nades.he?' · have '+me.nades.he:''),own:me.nades.he>=3,buy:()=>{me.nades.he++;me.gsel='he'}});
 $('buyCols').innerHTML='';for(const c of['Pistols','SMGs','Heavy','Rifles','Gear']){if(!cols[c])continue;const d=document.createElement('div');d.className='col';d.innerHTML='<b>'+c+'</b>';
  for(const it of cols[c]){const b=document.createElement('button');b.className='it'+(it.own?' own':'');
   b.innerHTML=(it.ic?`<div class="ic"><img src="${iconSrc(it.ic,40)}"></div>`:`<img src="${gunIcon(it.id)}">`)+`<div>${it.n}</div><span>${it.cost} pts</span><div class="st">${it.sub}</div>`;b.disabled=it.own||me.money<it.cost;
   b.onclick=()=>{if(!window.canBuy())return closeBuy();if(me.money<it.cost)return;me.money-=it.cost;it.buy();blip(1200,.08);window.drawBuy()};d.appendChild(b)}$('buyCols').appendChild(d)}};
// ================= perks =================
const PERKS={gut:{n:'Iron Gut',cost:2500,d:'max health 175'},quick:{n:'Quickhands',cost:2000,d:'reload twice as fast'},wind:{n:'Second Wind',cost:1500,d:'revive 2x faster · one self-revive per game'},
 double:{n:'Double Shot',cost:3000,d:'fire rate +33% · damage +25%'},fleet:{n:'Fleetfoot',cost:2000,d:'move +15% · hold Shift to sprint'}};
ZA.PERKS=PERKS;ZA.perks=new Set();ZA.perkBought=0;ZA.maxHP=100;let selfUsed=false;
function hasPerk(id){return ZA.perks.has(id)}ZA.hasPerk=hasPerk;
ZA.reviveMul=()=>hasPerk('wind')?2:1;
ZA.trySelfRevive=()=>{if(hasPerk('wind')&&!selfUsed){selfUsed=true;center('SECOND WIND','You pull yourself back up…','#4aa3e6');return true}return false};
function drawPerkBar(){perkBar.innerHTML=[...ZA.perks].map(p=>`<img title="${PERKS[p].n}" src="${iconSrc(p,48)}">`).join('')}
function givePerk(id){ZA.perks.add(id);ZA.perkBought++;if(id==='gut'){ZA.maxHP=175;me.hp=Math.min(175,me.hp+75)}drawPerkBar();ZA.emit('perk',id)}
function losePerks(){if(!ZA.perks.size)return;ZA.perks.clear();ZA.maxHP=100;if(me.hp>100)me.hp=100;drawPerkBar();feed('You lost your perks','#f77')}
ZA.on('down',id=>{if(id===me.id)losePerks()});
const machines=[];
const bodyG=new THREE.BoxGeometry(1.2,2.2,.9),panelG=new THREE.PlaneGeometry(.8,1.6),stripG=new THREE.BoxGeometry(1.24,.12,.94);
function makeMachine(id,p){const P=PERKS[id],col=new THREE.Color(COL[id]),g=new THREE.Group();
 const body=new THREE.Mesh(bodyG,new THREE.MeshLambertMaterial({color:col.clone().multiplyScalar(.35),emissive:col.clone().multiplyScalar(.12)}));body.position.y=1.1;body.castShadow=true;g.add(body);
 const pan=new THREE.Mesh(panelG,new THREE.MeshBasicMaterial({map:labelTex(id,P.n,P.cost+' pts',COL[id])}));pan.position.set(0,1.2,.46);g.add(pan);
 const strip=new THREE.Mesh(stripG,new THREE.MeshBasicMaterial({color:col}));strip.position.y=2.25;g.add(strip);
 g.position.copy(p);g.rotation.y=p.ry!=null?p.ry:Math.atan2(-p.x,-p.z);scene.add(g);
 const m={id,g,pos:p,strip,hue:col.getHSL({}).h};machines.push(m);mark('perk_'+id,p,COL[id],'square');
 ZA.addUse({id:'perk_'+id,pos:p,r:2.6,ok:()=>!hasPerk(id),label:()=>`Press <b>E</b> for <b style="color:${COL[id]}">${P.n}</b> · ${P.cost} pts <span class="st">(${P.d})</span>`,
  use:()=>{if(me.downed)return;if(me.money<P.cost){center('','Not enough points ('+P.cost+')');blip(200,.1);return}me.money-=P.cost;givePerk(id);center(P.n.toUpperCase(),P.d,COL[id]);jingle(id)}});return m}
function jingle(id){const base={gut:330,quick:440,wind:392,double:494,fleet:523}[id]||440;[0,4,7,12].forEach((s,i)=>setTimeout(()=>blip(base*Math.pow(2,s/12),.09,.18,'square'),i*90))}
function buildMachines(){if(machines.length)return;const ids=Object.keys(PERKS);let spots=(ZA.perkSpots||[]).map(spot).filter(Boolean);
 if(spots.length<ids.length){const s=fallbackBase();for(let i=spots.length;i<ids.length;i++)spots.push(spot({x:s.x-9+i*3.2,z:s.z+6,ry:Math.PI}))}
 const left=ids.slice();for(const s of spots){if(!left.length)break;let id=s.perk&&left.includes(s.perk)?s.perk:left[0];left.splice(left.indexOf(id),1);makeMachine(id,s)}}
function fallbackBase(){const x=4,z=-112;return{x,z}}
// machine hum: one oscillator pair, gain by distance to the nearest machine
let hum=null;function humTick(){const a=ac();if(!a)return;if(!hum){try{const o=a.createOscillator(),o2=a.createOscillator(),f=a.createBiquadFilter(),g=a.createGain();o.type='sawtooth';o.frequency.value=58;o2.type='sine';o2.frequency.value=117;f.type='lowpass';f.frequency.value=260;g.gain.value=0;o.connect(f);o2.connect(f);f.connect(g).connect(a.destination);o.start();o2.start();hum={g}}catch(e){hum={g:null};return}}
 if(!hum.g)return;let d=1e9;for(const m of machines)d=Math.min(d,Math.hypot(m.pos.x-me.pos.x,m.pos.z-me.pos.z));if(forgePos)d=Math.min(d,Math.hypot(forgePos.x-me.pos.x,forgePos.z-me.pos.z)+2);
 const v=running&&d<9&&a.state==='running'?Math.round(.045*(1-d/9)*400)/400:0;if(v!==hum.v){hum.v=v;hum.g.gain.setTargetAtTime(v,a.currentTime,.15)}}
// perk effects
const _sh=window.shoot;window.shoot=function(heavy){const g=curGun(),G=GUNS[g];if(G&&G.wonder)return wonderShoot(g,G);
 const before=me.cd;const r=_sh(heavy);if(before<=0&&me.cd>0&&hasPerk('double')&&G&&!G.melee&&g!=='nade')me.cd*=.75;return r};
const _mb=window.moveBody;window.moveBody=function(p,vx,vz,dt,st){if(p===me.pos&&!me.downed){let k=hasPerk('fleet')?1.15:1;if(hasPerk('fleet')&&(keys.ShiftLeft||keys.ShiftRight)&&keys.KeyW&&!ads&&!me.crouch)k*=1.25;vx*=k;vz*=k}return _mb(p,vx,vz,dt,st)};
const _hud=window.hud;window.hud=function(){_hud();if(ZA.maxHP!==100){const w=Math.max(0,me.hp)/ZA.maxHP*100;$('hpb').style.width=w+'%'}};
let lastHP=100,calmT=0;
// ================= Upgrade Forge =================
const UPN={service:'Brimstone Sidearm',machpist:'Hornet Swarm',revolver:'Judgement',grease:'Hellgrease',smg:'Trench Reaper',pump:'Thunderclap',auto12:'Grinder Nine',lmg:'Lewis Inferno',carbine:'Field Marshal',ak:'Mk.II Ravager',m4:'Tempest',scout:'Bolt of Fate',awp:'Mammoth Killer',cryo:'Absolute Zero',arc:'Storm Crown',bile:'Plague Mortar'};
const UPC=[0xff4a2a,0xb04aff,0x2ad0ff,0xffd02a];
// wonder weapons (box only): recoloured existing models + a glowing part, custom shoot behaviour
Object.assign(GUNS,{
 cryo:{n:'Cryo Lance',slot:1,cost:0,dmg:42,rpm:540,auto:1,mag:50,res:200,rel:2.8,spr:.003,mov:.04,kick:.004,hs:1.5,pen:1,rew:100,spd:.95,len:1.05,col:0x9fe8ff,wonder:'cryo',base:'m4',glow:0x6fe8ff},
 arc:{n:'Arc Caster',slot:1,cost:0,dmg:150,rpm:140,mag:12,res:60,rel:3,spr:.002,mov:.05,kick:.05,hs:1.5,pen:1,rew:100,spd:.95,len:1,col:0x6a5aff,wonder:'arc',base:'carbine',glow:0x9a8aff},
 bile:{n:'Bile Launcher',slot:1,cost:0,dmg:360,rpm:55,mag:4,res:24,rel:3.4,spr:.01,mov:.05,kick:.12,hs:1,pen:1,rew:100,spd:.9,len:.95,col:0x7bdc3a,wonder:'bile',base:'pump',glow:0x8aff3a}});
let ci=0;for(const id of Object.keys(GUNS)){const G=GUNS[id];if(!(G.cat||G.wonder))continue;
 GUNS[id+'+']=Object.assign({},G,{n:UPN[id]||G.n+' X',cat:undefined,cost:0,base:G.base||id,up:1,dmg:G.dmg*2,mag:Math.round(G.mag*(G.wonder?1.5:G.mag<10?2:1.5)),res:G.res*2,rpm:Math.round(G.rpm*1.1),rel:G.rel*.85,glow:G.wonder?G.glow:UPC[ci++%UPC.length]})}
function aliasAnims(){if(!window.TWA)return;for(const id in GUNS){const G=GUNS[id];if(G.base&&!TWA[id]&&TWA[G.base])TWA[id]=TWA[G.base]}}aliasAnims();
const _gm=window.gunMesh;window.gunMesh=function(id){const G=GUNS[id];if(!G||!G.base)return _gm(id);const g=_gm(G.base);
 const c=new THREE.Color(G.glow);g.traverse(o=>{if(!o.isMesh)return;const one=!Array.isArray(o.material),ms=(one?[o.material]:o.material).map(m=>{m=m.clone();if(m.color){if(G.wonder==='arc')m.color.set(0x3a3550);else m.color.lerp(c,G.wonder?.55:.3)}if(m.emissive)m.emissive.copy(c).multiplyScalar(G.wonder==='arc'?.08:G.wonder?.45:.3);if(G.wonder==='arc'&&m.map){m.map=null;m.needsUpdate=true}return m});o.material=one?ms[0]:ms});
 if(G.wonder==='arc'){const dk=new THREE.MeshLambertMaterial({color:0x2e2a40});g.traverse(o=>{if(o.isMesh)o.material=dk})}
 if(G.wonder){const L=GUNS[G.base].len||1,gm=new THREE.MeshBasicMaterial({color:G.glow});let x;
  if(G.wonder==='cryo'){x=new THREE.Mesh(new THREE.OctahedronGeometry(.07),gm);x.scale.z=2;x.position.set(0,.02,-L-.08)}
  else if(G.wonder==='arc'){x=new THREE.Group();const rm=new THREE.MeshBasicMaterial({color:0x6a2dff});for(let i=0;i<4;i++){const t=new THREE.Mesh(new THREE.TorusGeometry(.05,.015,6,12),rm);t.position.set(0,.01,-L*.5-i*.08);x.add(t)}
   const st=new THREE.Mesh(new THREE.BoxGeometry(.028,.022,L*.75),new THREE.MeshBasicMaterial({color:0x3ae8ff}));st.position.set(0,.038,-L*.55);x.add(st);for(const s of[-1,1]){const sd=new THREE.Mesh(new THREE.BoxGeometry(.01,.016,L*.45),new THREE.MeshBasicMaterial({color:0x3ae8ff}));sd.position.set(s*.034,0,-L*.35);x.add(sd)}}
  else{x=new THREE.Group();const can=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.16,10).rotateX(Math.PI/2),gm);can.position.set(0,.075,-L*.4);x.add(can);const cm=new THREE.MeshLambertMaterial({color:0x2a2e24});
   for(const dz of[-.07,.07]){const c=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,.02,10).rotateX(Math.PI/2),cm);c.position.set(0,.075,-L*.4+dz);x.add(c);const n=new THREE.Mesh(new THREE.BoxGeometry(.03,.05,.025),cm);n.position.set(0,.025,-L*.4+dz);x.add(n)}}g.add(x)}
 return g};
let forgeMesh=null,forgePos=null,forging=null,sparkT=0,forgeOffer=null;
function makeForge(){const g=new THREE.Group(),stone=new THREE.MeshLambertMaterial({color:0x4a4640}),iron=new THREE.MeshLambertMaterial({color:0x2a2a2e}),coal=new THREE.MeshBasicMaterial({color:0xff6a1a});
 const base=new THREE.Mesh(new THREE.BoxGeometry(1.6,.8,1.1),stone);base.position.y=.4;g.add(base);const a1=new THREE.Mesh(new THREE.BoxGeometry(.5,.35,.4),iron);a1.position.set(-.3,1,0);g.add(a1);
 const a2=new THREE.Mesh(new THREE.BoxGeometry(1,.22,.46),iron);a2.position.set(-.2,1.28,0);g.add(a2);const horn=new THREE.Mesh(new THREE.ConeGeometry(.12,.45,6).rotateZ(Math.PI/2),iron);horn.position.set(.5,1.3,0);g.add(horn);
 const pit=new THREE.Mesh(new THREE.BoxGeometry(.5,.1,.8),coal);pit.position.set(.55,.83,0);g.add(pit);
 const sign=new THREE.Mesh(new THREE.PlaneGeometry(.6,1.2),new THREE.MeshBasicMaterial({map:labelTex('',"Upgrade Forge",'5000 pts','#a0401a'),side:2}));sign.position.set(-.95,1.5,0);sign.rotation.y=Math.PI/2;g.add(sign);
 g.traverse(o=>{if(o.isMesh&&o!==sign)o.castShadow=true});g.userData.pit=pit;return g}
function buildForge(){if(forgeMesh)return;forgePos=spot(ZA.forgeSpot)||spot({x:-8,z:-104});forgeMesh=makeForge();forgeMesh.position.copy(forgePos);if(forgePos.ry!=null)forgeMesh.rotation.y=forgePos.ry;scene.add(forgeMesh);mark('forge',forgePos,'#ff7a2a','diamond');
 ZA.addUse({id:'forge',pos:forgePos,r:2.8,ok:()=>!forging&&!(forgeOffer&&OFFERS[forgeOffer]),label:()=>{const g=curGun(),G=GUNS[g];if(!G||!G.mag)return 'Upgrade Forge · hold the gun you want upgraded';if(G.up)return G.n+' is already upgraded';return `Press <b>E</b> to forge <b>${G.n}</b> into <b style="color:#ff8a3a">${GUNS[g+'+'].n}</b> · 5000 pts`},use:useForge})}
function useForge(){const g=curGun(),G=GUNS[g];if(!G||!G.mag||G.up||!GUNS[g+'+']||me.downed)return;if(me.money<5000){center('','Not enough points (5000)');blip(200,.1);return}
 me.money-=5000;forging={id:g,t:3,slot:G.slot};
 if(G.slot===1){me.inv.p=null;delete me.ammo[g];switchTo('s')}else{if(g!=='service'){me.inv.s='service';if(!me.ammo.service)me.ammo.service=[GUNS.service.mag,GUNS.service.res]}switchTo('k')}
 center('THE FORGE','Hammering your '+G.n+'…','#ff8a3a')}
function forgeTick(dt){if(!forgeMesh)return;const pit=forgeMesh.userData.pit;pit.material.color.setHSL(.05,1,.45+Math.sin(performance.now()/180)*.08);
 if(!forging)return;forging.t-=dt;sparkT-=dt;
 if(sparkT<=0){sparkT=.07;TMP.copy(forgePos);TMP.y+=1.45;for(let i=0;i<2;i++)puff(TMP,i?0xffd27a:0xff7a1a,.18,.45,0,new V3(rand(-3,3),rand(2,5),rand(-3,3)),.5)}
 if((forging.t%.5)<dt){noise(.25,.12,3000,4);blip(1600+Math.random()*300,.05,.2,'triangle')}
 if(forging.t<=0){const up=forging.id+'+';forging=null;const P=forgePos.clone();P.y+=1.6;forgeOffer=ZA.offerGun(up,P,{r:3,scale:1.3});center('FORGED',GUNS[up].n+' · press E to take it','#ff8a3a');[523,659,784,1046].forEach((f,i)=>setTimeout(()=>blip(f,.1,.25,'triangle'),i*80));feed('You forged '+GUNS[up].n,'#ff8a3a')}}
// ================= wonder weapon behaviour =================
const fxLines=[];function fxLine(pts,col,life){let L=fxLines.find(l=>!l.l.visible&&l.n>=pts.length);
 if(!L){if(fxLines.length>14)return;const n=Math.max(8,pts.length),geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(n*3),3));const l=new THREE.Line(geo,new THREE.LineBasicMaterial({color:col,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));l.frustumCulled=false;scene.add(l);L={l,n,t:0,life};fxLines.push(L)}
 const a=L.l.geometry.attributes.position;for(let i=0;i<L.n;i++){const p=pts[Math.min(i,pts.length-1)];a.setXYZ(i,p.x,p.y,p.z)}a.needsUpdate=true;L.l.material.color.set(col);L.l.visible=true;L.t=L.life=life}
function jag(a,b,n,amp){const P=[];for(let i=0;i<=n;i++){const p=a.clone().lerp(b,i/n);if(i&&i<n)p.add(new V3(rand(-amp,amp),rand(-amp,amp),rand(-amp,amp)));P.push(p)}return P}
const bileM=new THREE.MeshBasicMaterial({color:0x8aff3a}),bileG=new THREE.SphereGeometry(.16,8,6),puddleG=new THREE.CircleGeometry(1,16).rotateX(-Math.PI/2);
const blobs=[],puddles=[];
function wonderShoot(g,G){if(!me.alive||me.downed||me.reload>0||me.cd>0||swapT>0||RS.ph==='over')return;const a=me.ammo[g];if(!a)return;if(a[0]<=0){startReload();return}
 shotAt=performance.now();me.cd=60/G.rpm*(hasPerk('double')?.75:1);a[0]--;punch+=G.kick;
 const o=me.pos.clone();o.y+=eyeH();const d=new V3(0,0,-1).applyEuler(new THREE.Euler(me.pitch+punch+rand(-G.spr,G.spr),me.yaw+rand(-G.spr,G.spr),0,'YXZ'));
 const mz=vmGun?new V3(0,0,-(G.len||GUNS[G.base].len||1)).applyMatrix4(vmGun.matrixWorld):o.clone();const list=bodies(),team=HT(me.id,me.team);
 if(G.wonder==='cryo'){const r=traceShot(o,d,team,me.id,list,60),e=o.clone().addScaledVector(d,r.t);fxLine(jag(mz,e,4,.03),0x9ff4ff,.07);puff(e,0xcff8ff,.3,.35,.3);
  if(r.hit){routeHit(r.hit,G.dmg*(r.hs?G.hs:1),me.id,r.hs,g);hitMark('#9ff')}noise(.18,.08,5000,2);blip(1900+Math.random()*200,.03,.06,'sine');send({t:'fx',o:mz.toArray(),e:e.toArray(),g})}
 else if(G.wonder==='arc'){const r=traceShot(o,d,team,me.id,list,80),e=o.clone().addScaledVector(d,r.t);fxLine(jag(mz,e,7,.25),0xb9a8ff,.12);noise(.35,.25,4000,3);blip(90,.12,.25,'sawtooth');send({t:'fx',o:mz.toArray(),e:e.toArray(),g});
  if(r.hit){routeHit(r.hit,G.dmg*(r.hs?G.hs:1),me.id,r.hs,g);hitMark('#b9a8ff');const used=new Set([r.hit]);let cur=list.find(b=>b.id===r.hit),dmg=G.dmg;
   for(let j=0;j<4&&cur;j++){let best=null,bd=10;for(const b of list){if(used.has(b.id)||b.team===team||b.id===me.id)continue;const dd=b.pos.distanceTo(cur.pos);if(dd<bd){bd=dd;best=b}}if(!best)break;
    used.add(best.id);dmg*=.8;TMP.copy(cur.pos);TMP.y+=1.1;TMP2.copy(best.pos);TMP2.y+=1.1;fxLine(jag(TMP.clone(),TMP2.clone(),6,.3),0xb9a8ff,.15);puff(TMP2,0xb9a8ff,.25,.3);routeHit(best.id,dmg,me.id,false,g);cur=best}}}
 else{const m=new THREE.Mesh(bileG,bileM);m.position.copy(mz);scene.add(m);blobs.push({m,v:d.clone().multiplyScalar(26).add(new V3(0,2,0)),t:3,g,dmg:G.dmg});noise(.3,.2,700,2);blip(150,.12,.2,'square')}
 if(a[0]===0)setTimeout(startReload,300)}
function bileBurst(p,g,dmg){for(let i=0;i<8;i++)puff(p,i%2?0x6adf2a:0xb4ff5a,.5,.8,.6,new V3(rand(-4,4),rand(1,4),rand(-4,4)),2);noise(.5,.5,600,2);
 const team=HT(me.id,me.team);for(const b of bodies()){if(b.team===team||b.id===me.id)continue;TMP.copy(b.pos);TMP.y+=1;const d=TMP.distanceTo(p);if(d<5)routeHit(b.id,dmg*(1-d/5*.6),me.id,false,g)}
 if(puddles.length<4){const m=new THREE.Mesh(puddleG,new THREE.MeshBasicMaterial({color:0x6adf2a,transparent:true,opacity:.55,depthWrite:false}));m.scale.setScalar(3);m.position.set(p.x,hAt(p.x,p.z)+.04,p.z);scene.add(m);puddles.push({m,t:3.5,k:.5,g,dmg:dmg*.12})}}
function wonderTick(dt){for(let i=fxLines.length-1;i>=0;i--){const L=fxLines[i];if(!L.l.visible)continue;L.t-=dt;L.l.material.opacity=Math.max(0,L.t/L.life);if(L.t<=0)L.l.visible=false}
 for(let i=blobs.length-1;i>=0;i--){const b=blobs[i],p=b.m.position;b.t-=dt;b.v.y-=12*dt;p.addScaledVector(b.v,dt);let hit=b.t<=0||p.y<hAt(p.x,p.z)+.1;
  if(!hit){const team=HT(me.id,me.team);for(const o of bodies()){if(o.team===team||o.id===me.id)continue;if(Math.abs(o.pos.x-p.x)<.6&&Math.abs(o.pos.z-p.z)<.6&&p.y>o.pos.y&&p.y<o.pos.y+2){hit=true;break}}}
  if(hit){scene.remove(b.m);blobs.splice(i,1);bileBurst(p.clone(),b.g,b.dmg)}}
 for(let i=puddles.length-1;i>=0;i--){const q=puddles[i];q.t-=dt;q.k-=dt;q.m.material.opacity=Math.min(.55,q.t*.3);
  if(q.k<=0){q.k=.5;const team=HT(me.id,me.team);for(const b of bodies()){if(b.team===team||b.id===me.id)continue;if(Math.hypot(b.pos.x-q.m.position.x,b.pos.z-q.m.position.z)<3)routeHit(b.id,q.dmg,me.id,false,q.g)}if(Math.random()<.5)puff(q.m.position,0x8aff3a,.3,.6,.8)}
  if(q.t<=0){scene.remove(q.m);q.m.material.dispose();puddles.splice(i,1)}}}
// ================= power-ups =================
const PUT={ammo:'Max Ammo',dbl:'Double Points',insta:'Insta-Kill',nuke:'Nuke',carp:'Carpenter'};
const puGeo=new THREE.PlaneGeometry(.9,.9),puMat={},glowTex=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(170,255,120,.9)');gr.addColorStop(1,'rgba(170,255,120,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);return new THREE.CanvasTexture(c)})();
const glowMat=new THREE.SpriteMaterial({map:glowTex,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true});
function puMaterial(t){if(!puMat[t]){const c=document.createElement('canvas');c.width=c.height=128;icon(c.getContext('2d'),t,128);puMat[t]=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),side:2,transparent:true})}return puMat[t]}
const pups={};let puN=0,wavePU=0,lastPU=-1e9,puClock=0;
function puSpawnLocal(id,type,p){if(pups[id])return;const g=new THREE.Group();g.add(new THREE.Mesh(puGeo,puMaterial(type)));const s=new THREE.Sprite(glowMat);s.scale.setScalar(2.2);g.add(s);
 g.position.set(p[0],hAt(p[0],p[2])+1.1,p[2]);scene.add(g);pups[id]={g,type,t:25,base:g.position.y,asked:0};mark('pu_'+id,g.position,'#9be06a','circle');blip(880,.06,.3,'sine')}
function puRemove(id){const u=pups[id];if(!u)return;scene.remove(u.g);delete pups[id];unmark('pu_'+id)}
ZA.dropPowerup=function(pos,type){if(!isHost)return;type=({maxammo:'ammo',max_ammo:'ammo',double:'dbl',doublepoints:'dbl',instakill:'insta',carpenter:'carp'})[type]||type;type=type&&PUT[type]?type:ZA.pick(Object.keys(PUT));const id='pu'+(puN++);const p=[+pos.x.toFixed(2),+pos.y.toFixed(2),+pos.z.toFixed(2)];
 lastPU=puClock;const m={t:'ev',e:'pu',k:'spawn',id,type,p};bcast(m);puSpawnLocal(id,type,p)};
ZA.on('kill',(k,v,hs,gun,b)=>{if(!isHost||!b||!b.zombie||k==='nuke'||RS.ph!=='live')return;if(wavePU>=4||puClock-lastPU<10)return;if(!isBoss(b)&&Math.random()<.03){wavePU++;ZA.dropPowerup(b.pos)}});
function puApply(type,by){const who=by===me.id?'You':nameOf(by);
 center(PUT[type].toUpperCase(),who+' grabbed it','#9be06a');[784,988,1175].forEach((f,i)=>setTimeout(()=>blip(f,.1,.22,'triangle'),i*90));
 if(type==='ammo'){for(const g in me.ammo){const G=GUNS[g];if(G&&G.mag)me.ammo[g]=[G.mag,G.res]}me.nades.he=Math.max(me.nades.he,1)}
 else if(type==='dbl')PU.dbl=30;else if(type==='insta')PU.insta=30;
 else if(type==='nuke'){flashT=1;noise(1,2,300,1.5);shake=Math.max(shake,.3);if(isHost)for(const b of bots)if(b.zombie&&b.alive&&!isBoss(b)){b.hp=0;b.alive=false;b.deadT=3;kill('nuke',b.id,false,'nuke')}ZA.addPts(400,'nuke')}
 else if(type==='carp'){if(isHost&&ZA.repairAllBarricades)ZA.repairAllBarricades();ZA.addPts(200,'carpenter');noise(.3,.3,2000,3)}
 ZA.emit('powerup',type,by)}
function puTick(dt){puClock+=dt;PU.dbl=Math.max(0,PU.dbl-dt);PU.insta=Math.max(0,PU.insta-dt);const now=performance.now()/1000;
 for(const id in pups){const u=pups[id];u.t-=dt;u.g.rotation.y+=dt*1.8;u.g.position.y=u.base+Math.sin(now*2.5)*.15;u.g.visible=u.t>6||(Math.floor(u.t*(u.t<3?8:4))%2===0);
  if(isHost&&u.t<=0){bcast({t:'ev',e:'pu',k:'gone',id});puRemove(id);continue}
  if(me.alive&&!me.downed&&!u.asked&&Math.hypot(u.g.position.x-me.pos.x,u.g.position.z-me.pos.z)<1.5&&Math.abs(u.base-1.1-me.pos.y)<2){u.asked=1;if(isHost)puTake(id,me.id);else send({t:'ev',e:'pu',k:'take',id})}}
 const act=[];if(PU.dbl>0)act.push(['dbl',PU.dbl]);if(PU.insta>0)act.push(['insta',PU.insta]);const key=act.map(a=>a[0]+Math.ceil(a[1])).join();
 if(key!==puBar.dataset.k){puBar.dataset.k=key;puBar.innerHTML=act.map(([t,s])=>`<div class="${s<5&&Math.ceil(s)%2?'blink':''}"><img src="${iconSrc(t,64)}">${Math.ceil(s)}</div>`).join('')}}
function puTake(id,by){const u=pups[id];if(!u)return;const type=u.type;bcast({t:'ev',e:'pu',k:'got',id,type,by});puRemove(id);puApply(type,by)}
// ================= gun pickups: guns float where they appear and you choose whether to take them =================
// ZA.offerGun(id,pos,{ttl,spin,dropOld,ground,onTake,onGone}) -> offer id. E takes it; the label shows what it replaces.
const OFFERS={};ZA._offers=OFFERS;let offerN=0;const offerRing=new THREE.MeshBasicMaterial({color:0xffd36a,transparent:true,opacity:.55,depthWrite:false,side:2}),offerRingG=new THREE.RingGeometry(.32,.42,24).rotateX(-Math.PI/2);
function slotName(G){return G.slot===1?'p':'s'}
ZA.offerGun=function(id,pos,o){o=o||{};const G=GUNS[id];if(!G)return null;const key='gun'+(++offerN),g=new THREE.Group(),m=window.gunMesh(id);m.scale.setScalar(o.scale||1.2);
 const bb=new THREE.Box3().setFromObject(m),c=bb.getCenter(new V3());m.position.sub(c);g.add(m);
 if(o.ground){const r=new THREE.Mesh(offerRingG,G.wonder||G.up?new THREE.MeshBasicMaterial({color:G.wonder?0x7fffff:0xff8a3a,transparent:true,opacity:.6,depthWrite:false,side:2}):offerRing);r.position.y=-.45;g.add(r)}
 g.position.copy(pos);scene.add(g);const f={id,g,base:pos.y,ttl:o.ttl||0,t:0,o};OFFERS[key]=f;
 ZA.addUse({id:key,pos:g.position,r:o.r||2.2,ok:()=>!me.downed,label:()=>{const cur=me.inv[slotName(G)],C=cur&&GUNS[cur];
  const col=G.wonder?'#7fffff':G.up?'#ff8a3a':'#e9c46a',left=f.ttl&&f.ttl-f.t<15?` <span style="opacity:.7">${Math.ceil(f.ttl-f.t)}s</span>`:'';
  return `Press <b>E</b> to take <b style="color:${col}">${G.n}</b>`+(C&&cur!==id?` <span style="opacity:.75">(swaps your ${C.n})</span>`:'')+left},
  use:()=>takeOffer(key)});
 return key};
function takeOffer(key){const f=OFFERS[key];if(!f)return;const G=GUNS[f.id],sl=slotName(G),old=me.inv[sl],oldAmmo=old&&me.ammo[old];
 removeOffer(key);giveGun(f.id);switchTo(sl);
 if(old&&old!==f.id){delete me.ammo[old];if(f.o.dropOld&&old!=='service'){const p=me.pos.clone();p.x+=Math.sin(me.yaw||0)*-.9;p.z+=Math.cos(me.yaw||0)*-.9;p.y=hAt(p.x,p.z)+.55;const k=ZA.offerGun(old,p,{ground:1,dropOld:1,ttl:90});if(k&&oldAmmo)OFFERS[k].ammo=oldAmmo.slice()}}
 if(f.ammo)me.ammo[f.id]=f.ammo;
 center(G.wonder?'WONDER WEAPON':G.up?'FORGED':'',G.n,G.wonder?'#9ff':G.up?'#ff8a3a':'#e9c46a');blip(660,.08,.15,'triangle');setTimeout(()=>blip(990,.08,.2,'triangle'),110);
 if(f.o.onTake)f.o.onTake(f.id)}
function removeOffer(key,gone){const f=OFFERS[key];if(!f)return;scene.remove(f.g);ZA.removeUse(key);delete OFFERS[key];if(gone&&f.o.onGone)f.o.onGone(f.id)}
ZA.clearOffers=()=>{for(const k in OFFERS)removeOffer(k)};
function offerTick(dt){for(const k in OFFERS){const f=OFFERS[k];f.t+=dt;if(f.ttl&&f.t>=f.ttl){removeOffer(k,1);continue}
 const s=f.ttl&&f.ttl-f.t<3?.6+.4*Math.abs(Math.sin(f.t*8)):1;f.g.rotation.y+=dt*1.4;f.g.position.y=f.base+Math.sin(f.t*2.2)*.06+(f.o.sink&&f.ttl?-(f.t/f.ttl)*f.o.sink:0);f.g.children[0].visible=s>.7||f.t%.25<.15}}
ZA.on('gameOver',()=>ZA.clearOffers());
// ================= mystery box =================
const BOX={p:null,uses:0,th:5,rolling:false,moving:false,disp:null,cache:{}};
function boxSpots(){let s=(ZA.boxSpots||[]).map(spot).filter(Boolean);if(s.length)return s;
 if(!BOX.fb){BOX.fb=[];const f=fallbackBase();BOX.fb.push(spot({x:f.x+10,z:f.z+2}));for(let i=0;i<200&&BOX.fb.length<5;i++){const x=rand(-50,50),z=rand(-100,100),k=cell(x,z);if(k>=0&&C[k]===1)BOX.fb.push(spot({x,z}))}}return BOX.fb}
function placeBoxAt(p){if(Z.boxMesh){scene.remove(Z.boxMesh);Z.boxMesh=null}BOX.p=new V3(p[0],hAt(p[0],p[1]),p[1]);Z.boxMesh=ZA.makeBox();Z.boxMesh.position.copy(BOX.p);scene.add(Z.boxMesh);mark('box',BOX.p,'#ffcc33','qbox')}
ZA.placeBox=function(){if(isHost){const s=boxSpots(),i=Math.random()*s.length|0,p=[s[i].x,s[i].z];placeBoxAt(p);boxSync()}else if(!Z.boxMesh){const s=boxSpots()[0];placeBoxAt([s.x,s.z])}};
function boxSync(){if(isHost&&BOX.p)bcast({t:'ev',e:'zbox',k:'st',p:[BOX.p.x,BOX.p.z],u:BOX.uses,th:BOX.th})}
setInterval(()=>{if(running)boxSync()},5000);
function boxPool(){return Object.keys(GUNS).filter(k=>{const G=GUNS[k];return G.cat&&!G.base&&k!=='service'&&k!==me.inv.p&&k!==me.inv.s})}
function dispGun(id){if(!BOX.disp){BOX.disp=new THREE.Group();scene.add(BOX.disp)}let m=BOX.cache[id];if(!m){m=BOX.cache[id]=window.gunMesh(id);m.scale.setScalar(1.3)}BOX.disp.children.slice().forEach(c=>BOX.disp.remove(c));BOX.disp.add(m);BOX.disp.visible=true}
// Wonder weapon odds climb with the round: each wonder always beats any one normal gun, and all wonders together go from ~15% on round 1 to ~35% by round 20 and ~50% from round 40.
ZA.boxWonderWeight=()=>2.2+.3*Math.min(40,RS.rnd|0);
function useBoxZ(){if(BOX.rolling||BOX.moving||me.downed)return;if(me.money<950){center('','Not enough points (950)');blip(200,.1);return}me.money-=950;BOX.rolling=true;
 const willMove=boxSpots().length>1&&BOX.uses+1>=BOX.th;if(isHost)BOX.uses++;else send({t:'ev',e:'zbox',k:'use'});
 const pool=boxPool(),wonders=Object.keys(GUNS).filter(k=>GUNS[k].wonder&&!GUNS[k].up&&k!==me.inv.p&&k!==me.inv.s),res=(ZA.boxRoll&&ZA.boxRoll(pool,ZA.boxWonderWeight()))||(wonders.length&&Math.random()<.1?ZA.pick(wonders):ZA.pick(pool));let n=0,T=0;
 if(Z.boxMesh&&Z.boxMesh.children[1])Z.boxMesh.children[1].position.y=1.05;
 const step=()=>{if(!running){BOX.rolling=false;return}const id=n++<14?ZA.pick(Math.random()<.2?wonders:pool):willMove?null:res;
  if(id){center('MYSTERY BOX',GUNS[id].n,'#e9c46a');dispGun(id);blip(500+n*40,.05,.06,'square')}
  if(n<=14){T+=60+n*6;setTimeout(step,60+n*6);return}
  if(BOX.disp)BOX.disp.visible=false;
  if(willMove){if(Z.boxMesh&&Z.boxMesh.children[1])Z.boxMesh.children[1].position.y=.76;BOX.rolling=false;me.money+=950;center('THE BOX HAS MOVED','Your 950 points were refunded','#e9c46a');if(isHost)boxMove();else send({t:'ev',e:'zbox',k:'mv'});return}
  center(GUNS[res].wonder?'WONDER WEAPON':'MYSTERY BOX',GUNS[res].n+' · press E to take it',GUNS[res].wonder?'#9ff':'#e9c46a');blip(660,.1,.2,'triangle');
  const P=Z.boxMesh?Z.boxMesh.position.clone():me.pos.clone();P.y+=1.45;
  const done=()=>{BOX.rolling=false;if(Z.boxMesh&&Z.boxMesh.children[1])Z.boxMesh.children[1].position.y=.76};
  ZA.offerGun(res,P,{ttl:10,sink:.5,r:3,onTake:id=>{done();const m={t:'ev',e:'box',by:me.id,g:id};if(isHost){bcast(m);feed('You took '+GUNS[id].n+' from the box','#e9c46a')}else send(m)},onGone:()=>{done();center('','The box took it back','#e9c46a')}})};step()}
ZA.useBox=useBoxZ;
ZA.addUse({id:'box',pos:()=>!BOX.moving&&Z.boxMesh&&Z.boxMesh.position,r:3,ok:()=>!BOX.rolling,label:()=>'Press <b>E</b> for the Mystery Box · 950 pts',use:useBoxZ});
function boxMove(){const s=boxSpots();let c=s.filter(p=>!BOX.p||p.distanceTo(BOX.p)>3);if(!c.length)c=s;const p=ZA.pick(c);BOX.uses=0;BOX.th=4+(Math.random()*5|0);const m={t:'ev',e:'zbox',k:'mv',p:[p.x,p.z]};bcast(m);boxMoveAnim(m.p)}
function laugh(){const a=ac();if(!a)return;for(let i=0;i<5;i++){const t=a.currentTime+i*.17,o=a.createOscillator(),g=a.createGain(),v=a.createOscillator(),vg=a.createGain();o.type='sawtooth';o.frequency.setValueAtTime(260-i*22,t);o.frequency.exponentialRampToValueAtTime(150-i*15,t+.14);
 v.frequency.value=28;vg.gain.value=18;v.connect(vg).connect(o.frequency);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.08,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.15);o.connect(g).connect(a.destination);o.start(t);o.stop(t+.16);v.start(t);v.stop(t+.16)}}
let boxAnim=null;function boxMoveAnim(p){BOX.moving=true;laugh();feed('The box has moved','#e9c46a');if(!Z.boxMesh){placeBoxAt(p);BOX.moving=false;return}boxAnim={t:0,p,from:Z.boxMesh.position.clone()}}
function boxTick(dt){if(BOX.disp&&BOX.disp.visible&&Z.boxMesh){BOX.disp.position.copy(Z.boxMesh.position);BOX.disp.position.y+=1.3;BOX.disp.rotation.y+=dt*3}
 if(!boxAnim||!Z.boxMesh)return;const A=boxAnim;A.t+=dt;const b=Z.boxMesh;
 if(A.t<1.2){b.position.set(A.from.x+rand(-.06,.06),A.from.y,A.from.z+rand(-.06,.06));b.rotation.z=rand(-.06,.06)}
 else if(A.t<3){const k=A.t-1.2;b.position.set(A.from.x,A.from.y+k*k*6,A.from.z);b.rotation.y+=dt*6;b.rotation.z=0}
 else{boxAnim=null;placeBoxAt(A.p);BOX.moving=false;center('','The Mystery Box appeared somewhere else — follow the light','#7fd0ff')}}
// ================= networking =================
function zfx(m){if(isHost)bcast(m);onZfx(m)}
function onZfx(m){if(m.k==='shatter'){const p=new V3(...m.p);for(let i=0;i<8;i++)puff(p,i%2?0xcff8ff:0x7fd8ff,.3,.7,0,new V3(rand(-4,4),rand(0,4),rand(-4,4)),1);noise(.3,.25,6000,3)}}
ZA.on('ev',m=>{
 if(m.e==='pu'){if(m.k==='spawn')puSpawnLocal(m.id,m.type,m.p);else if(m.k==='gone')puRemove(m.id);else if(m.k==='got'){puRemove(m.id);puApply(m.type,m.by)}return true}
 if(m.e==='zbox'){if(m.k==='st'&&!isHost){BOX.uses=m.u;BOX.th=m.th;if(!BOX.moving&&(!BOX.p||Math.hypot(BOX.p.x-m.p[0],BOX.p.z-m.p[1])>.5))placeBoxAt(m.p)}else if(m.k==='mv'&&!isHost)boxMoveAnim(m.p);return true}
 if(m.e==='zfx'){onZfx(m);return true}});
const _hm=window.hostMsg;window.hostMsg=function(c,m){if(m&&m.t==='ev'){
  if(m.e==='pu'&&m.k==='take'){puTake(m.id,c.peer);return}
  if(m.e==='zbox'){if(m.k==='use')BOX.uses++;else if(m.k==='mv'&&!BOX.moving)boxMove();boxSync();return}}
 return _hm(c,m)};
// ================= lifecycle =================
function resetGame(){if(ZA.perks.size){ZA.perks.clear();drawPerkBar()}ZA.maxHP=100;ZA.perkBought=0;selfUsed=false;forging=null;PU.dbl=PU.insta=0;wavePU=0;for(const id in pups)puRemove(id)}
ZA.on('waveStart',(rnd,fresh)=>{wavePU=0;if(fresh)resetGame()});
ZA.on('gameOver',()=>{for(const id in pups)puRemove(id);PU.dbl=PU.insta=0});
ZA.on('begin',()=>{aliasAnims();buildMachines();buildForge();
 if(!crateMesh){cratePos=spot(ZA.shopSpot)||spot({x:-4,z:-110});crateMesh=makeCrate();crateMesh.position.copy(cratePos);if(cratePos.ry!=null)crateMesh.rotation.y=cratePos.ry;scene.add(crateMesh);mark('crate',cratePos,'#9be06a','square');
  ZA.addUse({id:'crate',pos:cratePos,r:2.6,label:()=>'Press <b>E</b> (or <b>B</b>) to open the Supply Crate',use:()=>window.openBuy()})}
 if(!isHost){const s=boxSpots()[0];if(!Z.boxMesh)placeBoxAt([s.x,s.z])}});
ZA.on('tick',dt=>{
 if(hasPerk('quick')&&me.reload>0)me.reload=Math.max(.001,me.reload-dt);
 // regen: 4 s after the last hit, 20 hp/s up to max
 if(me.hp<lastHP-.01)calmT=0;else calmT+=dt;if(me.alive&&!me.downed&&calmT>4&&me.hp<ZA.maxHP)me.hp=Math.min(ZA.maxHP,me.hp+20*dt);lastHP=me.hp;
 if(!me.alive&&ZA.perks.size&&!me.downed&&RS.ph==='live')losePerks();
 humTick();forgeTick(dt);offerTick(dt);wonderTick(dt);puTick(dt);boxTick(dt);
 for(const m of machines)m.strip.material.color.setHSL(m.hue,.8,.45+.12*Math.sin(performance.now()/300+m.pos.x))});
Object.assign(ZA,{PU,givePerk,losePerks,boxState:BOX,puList:pups,iconSrc});
})();
