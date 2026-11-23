// zombie-apocalypse/coop-ui.js — co-op & UI layer: revives, menu, HUD, stats, game over, leaderboards
(function(){
const ZA=window.ZA;if(!ZA)return;
const LS={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const H=s=>String(s==null?'':s).replace(/[<>&"]/g,'');
const V3=new THREE.Vector3();
function P(p){if(!p)return null;if(typeof p==='function')p=p();return p&&p.x!=null?p:null}
function isZ(id){if(id===me.id)return false;const b=bots.find(x=>x.id===id);if(b)return!!b.zombie;return teamOf(id)===1}

// ================= shared fields =================
const DIFFS={easy:{id:'easy',n:'Easy',hp:.7,spd:.85,dmg:.6,pts:1},normal:{id:'normal',n:'Normal',hp:1,spd:1,dmg:1,pts:1},nightmare:{id:'nightmare',n:'Nightmare',hp:1.5,spd:1.2,dmg:1.5,pts:1.5}};
function setDiff(id){ZA.difficulty=Object.assign({},DIFFS[id]||DIFFS.normal)}
setDiff(LS.get('za_diff','normal'));
ZA.markers=ZA.markers||[];ZA.stats=ZA.stats||{};
for(const [k,m] of [['zHP','hp'],['zSpd','spd'],['zDmg','dmg']]){const f=ZA[k];ZA[k]=w=>f(w)*((ZA.difficulty&&ZA.difficulty[m])||1)}

// ================= CSS =================
const css=document.createElement('style');css.textContent=`
:root{--zg:#9be06a;--zr:#c0160f;--zd:#0b120a}
#menu{background:radial-gradient(ellipse at 75% 60%,rgba(60,0,0,.0),rgba(4,8,4,.35) 60%),linear-gradient(90deg,rgba(5,10,5,.94) 0,rgba(6,12,6,.78) 45%,rgba(6,10,6,.25) 100%)!important;justify-content:center!important;align-items:safe center!important;overflow:auto}
#menu:after{content:"";position:fixed;inset:0;pointer-events:none;background:radial-gradient(ellipse at center,transparent 50%,rgba(40,0,0,.55) 100%);mix-blend-mode:multiply}
#menu .box.zam{margin:0;max-width:1060px;width:100%;display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:26px;padding:22px 26px;position:relative;z-index:1}
@media (max-width:860px){#menu .box.zam{grid-template-columns:1fr;padding:16px}}
.za-title{font:900 clamp(40px,min(8vw,12vh),92px)/.86 Impact,'Arial Black','Arial Narrow',sans-serif;letter-spacing:2px;text-transform:uppercase;position:relative;margin:0 0 6px;user-select:none}
.za-title span{display:block;background:linear-gradient(180deg,#d8ff9a 0,#8cc85a 45%,#3d6a26 100%);-webkit-background-clip:text;background-clip:text;color:transparent;
 -webkit-mask-image:repeating-linear-gradient(97deg,#000 0 9px,rgba(0,0,0,.55) 9px 10px,#000 10px 23px,rgba(0,0,0,.3) 23px 24px),radial-gradient(circle at 30% 40%,#000 60%,rgba(0,0,0,.85));
 mask-image:repeating-linear-gradient(97deg,#000 0 9px,rgba(0,0,0,.55) 9px 10px,#000 10px 23px,rgba(0,0,0,.3) 23px 24px);filter:drop-shadow(0 4px 0 #0a1606) drop-shadow(0 12px 26px #000)}
.za-title span.z2{background:linear-gradient(180deg,#ff5a40 0,#c0160f 50%,#5a0503 100%);-webkit-background-clip:text;background-clip:text;font-size:.62em;letter-spacing:.09em;transform:rotate(-1.5deg);transform-origin:left;margin-top:4px;filter:drop-shadow(0 3px 0 #2a0000) drop-shadow(0 10px 22px #000)}
.za-title:after{content:"";position:absolute;left:4%;top:calc(100% - 8px);width:62%;height:26px;background:radial-gradient(circle at 8% 0,#8a0c08 5px,transparent 6px),radial-gradient(circle at 22% 0,#8a0c08 3px,transparent 4px),radial-gradient(circle at 51% 0,#8a0c08 4px,transparent 5px),radial-gradient(circle at 78% 0,#8a0c08 3px,transparent 4px),linear-gradient(#8a0c08,#8a0c08) 8% 0/3px 20px no-repeat,linear-gradient(#8a0c08,#8a0c08) 51% 0/3px 13px no-repeat,linear-gradient(#8a0c08,#8a0c08) 22% 0/2px 8px no-repeat;opacity:.9}
.za-tag{font:500 13px var(--hfont);letter-spacing:3px;color:#b6c79d;margin:16px 0 10px;text-transform:uppercase}
.za-best{display:inline-flex;gap:10px;align-items:baseline;font:600 15px var(--hfont);letter-spacing:2px;color:#cfd8bf;background:rgba(150,10,5,.18);border:1px solid rgba(220,40,30,.4);padding:6px 14px;border-radius:6px;margin-bottom:12px}
.za-best b{font:700 30px Impact,var(--hfont);color:#ff3b2a;letter-spacing:1px}
#menu .row{margin:6px 0}#menu .card{background:rgba(12,22,10,.62)!important;border:1px solid rgba(155,224,106,.18)!important;border-radius:10px;padding:14px 16px;margin-bottom:12px}
#menu label{color:#b9cfa0}
#menu button{background:linear-gradient(180deg,#a3170f,#5c0806);border-color:#d0352a;box-shadow:0 3px 0 #2a0302,0 6px 14px #0006}
#menu button.alt{background:linear-gradient(180deg,#3e5a2c,#22331a);border-color:#6a8f4e}
#bSolo{font-size:18px!important;padding:13px 26px!important}
.za-seg{display:inline-flex;border:1px solid rgba(155,224,106,.3);border-radius:7px;overflow:hidden}
.za-seg button{margin:0!important;border:0!important;border-radius:0!important;box-shadow:none!important;background:rgba(0,0,0,.35)!important;padding:8px 14px!important;font-size:13px!important;color:#aab49a}
.za-seg button.on{background:linear-gradient(180deg,#3e5a2c,#22331a)!important;color:#fff}.za-seg button.on[data-d=nightmare]{background:linear-gradient(180deg,#a3170f,#5c0806)!important}
.za-dd{font:400 11px Inter,sans-serif;color:#8f9a80;margin-top:4px;min-height:14px}
.za-h{font:600 15px var(--hfont);letter-spacing:3px;color:var(--zg);text-transform:uppercase;margin:0 0 8px;display:flex;justify-content:space-between;align-items:center}
.za-daily{border-color:rgba(233,196,106,.35)!important;background:linear-gradient(135deg,rgba(60,40,8,.5),rgba(14,20,10,.6))!important}
.za-daily .n{font:700 22px var(--hfont);letter-spacing:1px;color:#f3e3b5}.za-daily .d{color:#cfc4a6;margin:4px 0 8px;line-height:1.4}
.za-daily .r{font:600 13px var(--hfont);letter-spacing:1.5px;color:#e9c46a}.za-daily .done{color:#9be06a}
.za-tabs button{margin:0 0 0 4px!important;padding:4px 10px!important;font-size:11px!important;box-shadow:none!important;background:rgba(0,0,0,.4)!important;border-color:rgba(155,224,106,.25)!important}
.za-tabs button.on{background:#3e5a2c!important}
.za-lb{width:100%;border-collapse:collapse;font:500 14px var(--hfont);letter-spacing:.5px}.za-lb td{padding:4px 6px;border-bottom:1px solid rgba(255,255,255,.06)}.za-lb td:first-child{color:#7c8a6c;width:26px}.za-lb td.w{color:#ff4a36;text-align:right;font-weight:700}.za-lb td.k{color:#a9b59a;text-align:right;font-size:12px}
.za-lb tr.me td{color:#f3e3b5}.za-empty{color:#7c8a6c;font-size:12px;padding:6px 0}
#menu .keys{color:#7f8d70!important}
/* hud */
#zaWave{position:absolute;left:20px;bottom:160px;pointer-events:none;filter:drop-shadow(0 3px 4px #000) drop-shadow(0 0 12px rgba(150,0,0,.45));transition:transform .3s}
#zaWave .num{font:900 76px/1 Impact,'Arial Black',sans-serif;color:#b3120e;letter-spacing:2px;-webkit-text-stroke:1px #3a0000}
#zaWave.pop{animation:zaPop 1.4s ease-out}@keyframes zaPop{0%{transform:scale(1.7);filter:brightness(2.5) drop-shadow(0 0 20px #f00)}100%{transform:scale(1)}}
#zaPops{position:absolute;left:50%;top:50%;width:0;height:0}
#zaPops div{position:absolute;white-space:nowrap;font:700 20px var(--hfont);color:#c9f58a;text-shadow:0 2px 3px #000,0 0 8px rgba(0,0,0,.6);animation:zaUp .95s ease-out forwards}
#zaPops div.big{font-size:28px;color:#ffd84a}@keyframes zaUp{0%{transform:translate(0,0) scale(.7);opacity:0}15%{opacity:1;transform:translate(0,-6px) scale(1.12)}100%{transform:translate(18px,-60px) scale(.95);opacity:0}}
#zaSplat{position:absolute;left:50%;top:50%;width:46px;height:46px;margin:-23px;border-radius:50%;opacity:0;background:radial-gradient(circle,rgba(170,0,0,.0) 30%,rgba(170,0,0,.55) 32%,rgba(120,0,0,.0) 62%);transform:scale(.6);transition:opacity .35s,transform .35s;pointer-events:none}
#zaSplat.on{opacity:1;transform:scale(1);transition:none}
#zaDown{position:absolute;inset:0;display:none;pointer-events:none;background:radial-gradient(ellipse at center,rgba(70,70,70,.38) 25%,rgba(110,0,0,.7) 100%)}
#zaDown .w{position:absolute;left:50%;top:58%;transform:translateX(-50%);text-align:center;font:600 18px var(--hfont);letter-spacing:1.5px;color:#ffd6cf;text-shadow:0 2px 6px #000}
#zaDown .w b{display:block;font:900 40px Impact,var(--hfont);color:#ff3b2a;letter-spacing:4px}
#zaDown svg{width:96px;height:96px;display:block;margin:0 auto 6px}
#zaOver{position:fixed;inset:0;z-index:40;display:none;align-items:center;justify-content:center;background:radial-gradient(ellipse at center,rgba(30,0,0,.6),rgba(0,0,0,.88));font-family:var(--hfont)}
#zaOver .pnl{width:min(720px,94vw);max-height:94vh;overflow:auto;background:linear-gradient(180deg,rgba(26,8,6,.96),rgba(10,14,9,.97));border:1px solid rgba(200,30,20,.45);border-radius:12px;padding:22px 26px;box-shadow:0 20px 70px #000}
#zaOver h2{font:900 48px Impact,var(--hfont);color:#d01a10;letter-spacing:4px;margin:0;text-shadow:0 4px 0 #200}
#zaOver .sv{font:500 18px var(--hfont);letter-spacing:2px;color:#e8dcc0;margin:2px 0 14px}
#zaOver .nb{display:inline-block;background:linear-gradient(90deg,#e9c46a,#ffdf8a);color:#2a1a00;font:700 16px var(--hfont);letter-spacing:3px;padding:4px 14px;border-radius:4px;margin-bottom:12px;animation:zaPop 1.2s}
#zaOver .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;margin-bottom:14px}
#zaOver .grid div{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:8px 10px;text-align:center}
#zaOver .grid b{display:block;font:700 28px var(--hfont);color:#fff}#zaOver .grid span{font:500 11px var(--hfont);letter-spacing:2px;color:#9aa58c;text-transform:uppercase}
#zaOver table{width:100%;border-collapse:collapse;font:500 14px var(--hfont)}#zaOver td{padding:4px 8px;border-bottom:1px solid rgba(255,255,255,.06)}#zaOver td+td{text-align:right}#zaOver tr.h td{color:#8a937c;font-size:11px;letter-spacing:2px}
#zaOver .mvp{color:#e9c46a}#zaOver .ft{display:flex;align-items:center;gap:12px;margin-top:14px;flex-wrap:wrap}#zaOver .ft .st{font:400 13px Inter,sans-serif}
#zaOver button{background:linear-gradient(180deg,#a3170f,#5c0806);border-color:#d0352a}
#zaOver .ch{margin:0 0 12px;font:500 14px var(--hfont);letter-spacing:1px;color:#cfc4a6}
`;document.head.appendChild(css);

// ================= 1. Trench War leftovers =================
{const ps=$('pause').querySelector('.sub');if(ps)ps.innerHTML='<kbd>WASD</kbd> move · <kbd>Space</kbd> jump · <kbd>Ctrl</kbd>/<kbd>C</kbd> crouch · <kbd>LMB</kbd> shoot · <kbd>RMB</kbd> aim<br><kbd>1</kbd> primary · <kbd>2</kbd> pistol · <kbd>3</kbd> knife · <kbd>4</kbd>/<kbd>G</kbd> grenades · <kbd>Q</kbd> last · <kbd>R</kbd> reload<br><kbd>B</kbd> armory · <kbd>E</kbd> use: mystery box, perks, doors · hold <kbd>E</kbd> revive a downed teammate · <kbd>Tab</kbd> scores';
 const b=$('bResume');if(b)b.textContent='Back to the fight';
 const sm=$('top').querySelectorAll('small');if(sm[0])sm[0].textContent='WAVE';if(sm[2])sm[2].textContent='ZOMBIES';
 $('time').textContent='WAVE 1';$('phase').textContent='GET READY';$('sc0').textContent='1';$('sc1').textContent='0';$('money').textContent='500 pts';
 const ac=$('armL');if(ac)ac.textContent='ARMOR';}
const _cm=clientMsg;window.clientMsg=function(m){const r=_cm(m);if(m&&m.t==='welcome'){center('JOINED THE SURVIVORS','You get up when the current wave is cleared','#9be06a')}return r};
// Tab scoreboard
window.showBoard=function(v){const b=$('board');b.style.display=v?'block':'none';if(!v)return;
 const rows=[];const add=(id,n,alive,pts)=>{const s=ZA.stats[id]||{};rows.push({id,n,k:s.kills||0,d:s.downs||0,r:s.revives||0,pts,st:DOWN[id]?'DOWN':alive?'':'DEAD'})};
 add(me.id,me.name,me.alive,me.money);for(const id in others){const o=others[id];if(o.team!==0)continue;add(id,o.name,o.alive,o.money)}
 if(isHost)for(const x of bots)if(!x.zombie)add(x.id,x.name,x.alive,null);
 rows.sort((a,c)=>c.k-a.k);
 b.innerHTML=`<div class="st">WAVE ${RS.rnd} · ${(ZA.difficulty||{}).n||'Normal'}${roomCode?' · room code '+roomCode:''}</div><div style="color:#9be06a;margin:8px 0 4px;font:600 18px var(--hfont);letter-spacing:2px">SURVIVORS</div><table><tr class="st"><td>Name</td><td>Kills</td><td>Downs</td><td>Revives</td><td>Points</td></tr>`+
  rows.map(p=>`<tr style="${p.st==='DEAD'?'opacity:.45':''}${p.id===me.id?';color:#e8d29a':''}"><td>${H(p.n)}${p.st?' <span style="color:#f55;font-size:11px">'+p.st+'</span>':''}</td><td>${p.k}</td><td>${p.d}</td><td>${p.r}</td><td>${p.pts!=null?p.pts:'—'}</td></tr>`).join('')+'</table>'};

// ================= 2. Downs & revives =================
const BLEED=30,DOWN={};let nDown=0,selfRev=false,selfT=0,dlT=0,dlLast=false;
ZA.downs=DOWN;ZA.isDowned=id=>!!DOWN[id];me.downed=false;
const _bodies=bodies;window.bodies=function(){const L=_bodies();if(!nDown)return L;return L.filter(b=>!DOWN[b.id]||(b.id===me.id&&selfRev))};
const _surv=ZA.survivors;ZA.survivors=function(){return _surv().filter(b=>!DOWN[b.id]||(b.id===me.id&&selfRev))};
function upMates(ex){let n=0;for(const b of _bodies())if(b.team===0&&b.id!==ex&&!DOWN[b.id])n++;return n}
function setDown(id,o){if(!DOWN[id])nDown++;DOWN[id]=Object.assign(DOWN[id]||{},o)}
function clrDown(id){if(DOWN[id]){delete DOWN[id];nDown--}ZA.removeUse('rev_'+id);const b=isHost&&bots.find(x=>x.id===id);if(b){b.downed=false;b.crouch=false}}
function clearAllDowns(){for(const id in DOWN)clrDown(id);nDown=0;if(me.downed){me.downed=false;selfRev=false;keys.KeyC=false}}
const revHold=()=>3/(ZA.reviveMul?ZA.reviveMul():(ZA.hasPerk&&ZA.hasPerk('secondwind')?2:1));
function addRevUse(id){if(id===me.id)return;ZA.addUse({id:'rev_'+id,pos:()=>posOf(id),r:2.4,
 label:()=>'Hold <b>E</b> to revive '+H(nameOf(id)),ok:()=>!!DOWN[id]&&me.alive&&!me.downed,get hold(){return revHold()},
 use:()=>{if(isHost)hostRevive(id,me.id);else send({t:'ev',e:'revReq',id})}})}
// --- host authority ---
function hostDown(id,k,self){if(DOWN[id]||RS.ph!=='live')return false;const m={t:'ev',e:'down',id,k,self:!!self};bcast(m);onDownEv(m);return true}
function hostRevive(id,by){if(!DOWN[id])return;const m={t:'ev',e:'revived',id,by};bcast(m);onRevivedEv(m)}
function hostBleed(id){if(!DOWN[id])return;const m={t:'ev',e:'bleed',id,k:DOWN[id].k};bcast(m);onBleedEv(m)}
// --- all peers ---
function onDownEv(m){const id=m.id;setDown(id,{t:BLEED,k:m.k,self:m.self});addRevUse(id);(st(id)).downs++;
 if(isHost){const b=bots.find(x=>x.id===id);if(b){b.downed=true;b.crouch=true;b.revId=null}}
 if(id!==me.id){feed(nameOf(id)+' is down! Hold E near them to revive','#ff6a5a');blip(330,.1,.35,'sawtooth')}
 if(id===me.id&&!me.downed)localDownFx(m.self);
 ZA.emit('down',id)}
function onRevivedEv(m){const id=m.id,by=m.by;if(!DOWN[id]&&!(id===me.id&&me.downed))return;clrDown(id);
 if(isHost){const b=bots.find(x=>x.id===id);if(b){b.hp=50;b.alive=true}}
 if(id===me.id){me.downed=false;selfRev=false;keys.KeyC=false;me.hp=Math.round((ZA.maxHP||100)*.5);me.shieldT=Math.max(me.shieldT||0,1.5);
  center(by===me.id?'SECOND WIND':'REVIVED',by===me.id?'Back on your feet':'by '+H(nameOf(by)),'#9be06a');blip(520,.1,.2,'triangle');setTimeout(()=>blip(780,.1,.3,'triangle'),120)}
 else feed(nameOf(by)+(by===id?' got back up':' revived '+nameOf(id)),'#9be06a');
 if(by!==id){st(by).revives++;if(by===me.id){if(ZA.addPts)ZA.addPts(100,'revive',posOf(id).clone());else addMoney(100,'revive')}}
 ZA.emit('revive',id,by)}
function onBleedEv(m){const id=m.id;clrDown(id);
 if(isHost){const b=bots.find(x=>x.id===id);if(b&&b.alive){b.alive=false;b.downed=false;b.deadT=99;kill(m.k||'?',b.id,false,'knife')}}
 if(id===me.id&&me.downed)dieLocal(m.k)}
// --- local player ---
const _hurt=hurtLocal;
window.hurtLocal=function(d,f,hs,g){
 if(me.downed)return;
 if(!me.alive||RS.ph!=='live'||g==='nuke')return _hurt(d,f,hs,g);
 const hp0=me.hp;me.hp+=1e5;_hurt(d,f,hs,g);if(!me.alive)return;
 const nh=me.hp-1e5;if(nh>0){me.hp=nh;return}
 const mates=upMates(me.id)>0,self=!!(ZA.trySelfRevive&&ZA.trySelfRevive());
 if(!mates&&!self){me.hp=Math.min(hp0,.01);_hurt(1e6,f,hs,g);return}
 me.hp=1;me.downed=true;selfRev=self;selfT=3;localDownFx(self);chal.downed=true;
 if(isHost)hostDown(me.id,f,self);else send({t:'ev',e:'down',id:me.id,k:f,self})};
function localDownFx(self){me.downed=true;me.cur='s';center(self?'SECOND WIND':'YOU ARE DOWN',self?'Getting back up…':'Crawl to safety · you can still use your pistol','#ff4a3a');blip(110,.2,.8,'sawtooth')}
function dieLocal(k){me.downed=false;selfRev=false;keys.KeyC=false;me.shieldT=0;me.hp=.01;_hurt(1e6,k||'?',false,'knife');center('YOU BLED OUT','You get back up when the wave is cleared','#ff4a3a')}
const _eyeH=eyeH;window.eyeH=function(){return me.downed?.55:_eyeH()};
const _mb=moveBody;window.moveBody=function(p,vx,vz,dt,s){if(p===me.pos&&me.downed){vx*=.55;vz*=.55}return _mb(p,vx,vz,dt,s)};
const _sw=switchTo;window.switchTo=function(k){if(me.downed&&k!=='s')return;return _sw(k)};
const _ob=openBuy;window.openBuy=function(){if(me.downed)return;if(chal.def&&chal.def.id==='noarmory'&&!chal.failed){center('','Daily challenge: no Armory today. Use the Mystery Box.');return}return _ob()};
const _nu=ZA.nearUse;ZA.nearUse=function(){return me.downed?null:_nu()};
// --- host-side: bots, client messages ---
const _ah=applyHit;window.applyHit=function(t,dmg,from,hs,gun){
 if(DOWN[t])return;
 const b=t!==me.id&&bots.find(x=>x.id===t);
 if(b&&!b.zombie&&b.alive&&RS.ph==='live'&&gun!=='nuke'&&upMates(b.id)>0){b.hp+=1e5;_ah(t,dmg,from,hs,gun);if(!b.alive)return;const nh=b.hp-1e5;if(nh>0){b.hp=nh;return}b.hp=1;hostDown(b.id,from,false);return}
 return _ah(t,dmg,from,hs,gun)};
const _bt=botTick;window.botTick=function(b,dt){
 if(!b.zombie&&b.alive&&RS.ph==='live'){
  if(DOWN[b.id])return crawlBot(b,dt);
  if(nDown&&reviveBot(b,dt))return}
 return _bt(b,dt)};
function moveTo(b,tx,tz,sp,dt){const dx=tx-b.pos.x,dz=tz-b.pos.z,L=Math.hypot(dx,dz)||1;const ty=Math.atan2(-dx,-dz);let dy=ty-b.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));b.yaw+=dy*Math.min(1,dt*8);
 const s={vy:b.vy,ground:false};moveBody(b.pos,dx/L*sp,dz/L*sp,dt,s);b.vy=s.vy;b.ground=s.ground;if((s.bx||s.bz)&&s.ground&&sp>2)b.vy=8.2}
function crawlBot(b,dt){b.o.visible=true;b.crouch=true;let best=null,bd=1e9;for(const t of _bodies())if(t.team===0&&!DOWN[t.id]){const d=Math.hypot(t.pos.x-b.pos.x,t.pos.z-b.pos.z);if(d<bd){bd=d;best=t}}
 let sp=0;if(best&&bd>3){sp=1;moveTo(b,best.pos.x,best.pos.z,1,dt)}else{const s={vy:b.vy,ground:false};_mb(b.pos,0,0,dt,s);b.vy=s.vy}
 b.o.position.copy(b.pos);b.o.rotation.y=b.yaw;animSoldier(b.o,sp,-.4,dt,true)}
function reviveBot(b,dt){
 let id=b.revId;if(!id||!DOWN[id]||(DOWN[id].cl&&DOWN[id].cl!==b.id)){id=null;b.revId=null;b.revT=0;let bd=70;
  for(const k in DOWN){const D=DOWN[k];if(D.cl&&D.cl!==b.id&&bots.some(x=>x.id===D.cl&&x.alive&&!DOWN[x.id]))continue;const p=posOf(k),d=Math.hypot(p.x-b.pos.x,p.z-b.pos.z);if(d<bd){bd=d;id=k}}
  if(!id)return false;b.revId=id;DOWN[id].cl=b.id}
 const p=posOf(id),d=Math.hypot(p.x-b.pos.x,p.z-b.pos.z);b.o.visible=true;
 if(d>1.4){b.revT=0;b.crouch=false;moveTo(b,p.x,p.z,5.4,dt);b.o.position.copy(b.pos);b.o.rotation.y=b.yaw;animSoldier(b.o,5.4,0,dt,false);return true}
 b.crouch=true;b.revT=(b.revT||0)+dt;const s={vy:b.vy,ground:false};_mb(b.pos,0,0,dt,s);b.vy=s.vy;b.o.position.copy(b.pos);animSoldier(b.o,0,.6,dt,true);
 if(b.revT>=3){b.revT=0;b.revId=null;hostRevive(id,b.id)}return true}
const _hm=hostMsg;window.hostMsg=function(c,m){if(m&&m.t==='ev'){const id=c.peer;
  if(m.e==='down'){if(others[id]){if(RS.ph!=='live'){const r={t:'ev',e:'revived',id,by:id};bcast(r);onRevivedEv(r)}else hostDown(id,m.k,m.self)}return}
  if(m.e==='revReq'){const D=DOWN[m.id];if(!D)return;if(m.id===id){if(D.self)hostRevive(id,id);return}if(posOf(id).distanceTo(posOf(m.id))<5)hostRevive(m.id,id);return}
  if(m.e==='mystats'){if(m.s&&typeof m.s==='object'){ZA.stats[id]=cleanStats(m.s,nameOf(id));bcast({t:'ev',e:'stats',all:{[id]:ZA.stats[id]}},id);renderOver()}return}}
 return _hm(c,m)};
// events from the host (clients) — ZA 'ev' hook
ZA.on('ev',m=>{
 if(m.e==='down'){if(!isHost)onDownEv(m);return true}
 if(m.e==='revived'){if(!isHost)onRevivedEv(m);return true}
 if(m.e==='bleed'){if(!isHost)onBleedEv(m);return true}
 if(m.e==='dl'){if(!isHost){for(const id in m.d){if(!DOWN[id]){setDown(id,{t:m.d[id]});addRevUse(id)}else DOWN[id].t=m.d[id]}for(const id in DOWN)if(!(id in m.d)&&id!==me.id)clrDown(id)}return true}
 if(m.e==='diff'){if(!isHost)setDiff(m.d);return true}
 if(m.e==='stats'){for(const id in m.all)if(id!==me.id)ZA.stats[id]=cleanStats(m.all[id],nameOf(id));renderOver();return true}
 if(m.e==='selfRev'){return true}});
// head icons over downed teammates
const iconTex=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');g.strokeStyle='#ff2a1a';g.lineWidth=7;g.shadowColor='#000';g.shadowBlur=6;g.beginPath();g.arc(32,32,24,0,7);g.stroke();g.fillStyle='#fff';g.fillRect(28,18,8,28);g.fillRect(18,28,28,8);return new THREE.CanvasTexture(c)})();
const iconMat=new THREE.SpriteMaterial({map:iconTex,depthTest:false,transparent:true,sizeAttenuation:false});const ICONS={};
// per-frame (all peers)
ZA.on('tick',dt=>{
 for(const id in DOWN){const D=DOWN[id];D.t-=dt;
  if(isHost){if(id!==me.id&&!others[id]&&!bots.some(b=>b.id===id&&b.alive)){clrDown(id);continue}if(D.t<=0&&!D.self)hostBleed(id)}
  if(id!==me.id){let s=ICONS[id];if(!s){s=ICONS[id]=new THREE.Sprite(iconMat);s.renderOrder=999;scene.add(s)}const p=posOf(id);s.position.set(p.x,p.y+2.1,p.z);const k=.045+.008*Math.sin(performance.now()/180);s.scale.set(k,k,1)}}
 for(const id in ICONS)if(!DOWN[id]){scene.remove(ICONS[id]);delete ICONS[id]}
 if(isHost){dlT-=dt;if(dlT<=0){dlT=.5;if(nDown||dlLast){const d={};for(const id in DOWN)d[id]=Math.max(0,Math.round(DOWN[id].t));bcast({t:'ev',e:'dl',d});dlLast=!!nDown}}}
 if(me.downed){keys.KeyC=true;keys.Space=false;if(me.cur!=='s')me.cur='s';
  if(selfRev){selfT-=dt;if(selfT<=0){selfT=99;if(isHost)hostRevive(me.id,me.id);else send({t:'ev',e:'revReq',id:me.id})}}
  if(!me.alive){me.downed=false;keys.KeyC=false}}
 dailyTick()});
ZA.on('waveDone',()=>{const was=me.downed;if(isHost)for(const id in DOWN){const b=bots.find(x=>x.id===id);if(b)b.hp=100}clearAllDowns();if(was){me.hp=ZA.maxHP||100;me.shieldT=1}});
ZA.on('waveStart',(r,fresh)=>{clearAllDowns();if(isHost)bcast({t:'ev',e:'diff',d:(ZA.difficulty||{}).id||'normal'});if(fresh)newGame();waveFx(r)});

// ================= 5. Stats =================
function st(id){return ZA.stats[id]||(ZA.stats[id]={name:nameOf(id),kills:0,hs:0,downs:0,revives:0,pts:0,gunKills:{}})}
function cleanStats(s,n){const o={name:H(String(s.name||n).slice(0,20)),kills:s.kills|0,hs:s.hs|0,downs:s.downs|0,revives:s.revives|0,pts:s.pts|0,gunKills:{}};if(s.gunKills&&typeof s.gunKills==='object')for(const g in s.gunKills)if(GUNS[g]||g==='knife')o.gunKills[g]=s.gunKills[g]|0;return o}
function bestGun(s){let g=null,n=0;for(const k in s.gunKills)if(s.gunKills[k]>n){n=s.gunKills[k];g=k}return g?(GUNS[g]||{n:g}).n:'—'}
let gameN=0,overShown=-1,submitted=-1,lastPtsAt=0,ptsEvents=false;
function newGame(){gameN++;for(const k in ZA.stats)delete ZA.stats[k];hideOver();chalReset()}
ZA.on('kill',(k,v,hs,gun,b)=>{if(!((b&&b.zombie)||(!b&&isZ(v))))return;const s=st(k);s.kills++;if(hs)s.hs++;s.gunKills[gun]=(s.gunKills[gun]||0)+1;
 if(k===me.id){chal.kills++;if(hs)chal.hs++;if(gun==='knife')chal.knife++}});
ZA.on('points',(n,why,pos)=>{ptsEvents=true;lastPtsAt=performance.now();if(n>0){st(me.id).pts+=n;popup(n)}});
const _am=addMoney;window.addMoney=function(n,why){const r=_am(n,why);if(n>0){const t=performance.now();queueMicrotask(()=>{if(performance.now()-lastPtsAt<40&&lastPtsAt>=t-40)return;if(!ptsEvents)st(me.id).pts+=n;popup(n)})}return r};

// ================= 4. HUD =================
const hudEl=$('hud');
const waveEl=document.createElement('div');waveEl.id='zaWave';hudEl.appendChild(waveEl);
const popsEl=document.createElement('div');popsEl.id='zaPops';hudEl.appendChild(popsEl);
const splat=document.createElement('div');splat.id='zaSplat';hudEl.appendChild(splat);
const downEl=document.createElement('div');downEl.id='zaDown';downEl.innerHTML='<div class="w"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="8"/><circle id="zaDRing" cx="50" cy="50" r="42" fill="none" stroke="#ff2a1a" stroke-width="8" stroke-linecap="round" stroke-dasharray="264" transform="rotate(-90 50 50)"/><text id="zaDT" x="50" y="60" text-anchor="middle" fill="#fff" font-size="28" font-family="Impact,sans-serif">30</text></svg><b>DOWNED</b><span id="zaDMsg">Hold on — a teammate can revive you</span></div>';hudEl.appendChild(downEl);
let waveShown=-1;
function tally(n){let s='<svg width="'+(n>=5?92:n*16+10)+'" height="74" viewBox="0 0 '+(n>=5?92:n*16+10)+' 74" style="display:block">';const J=[[1,-2],[-2,1],[2,0],[-1,2]];
 for(let i=0;i<Math.min(4,n);i++){const x=10+i*17,j=J[i];s+=`<path d="M${x+j[0]} ${6+j[1]} Q${x+3} 36 ${x-j[1]} ${66+j[0]}" stroke="#b3120e" stroke-width="8" stroke-linecap="round" fill="none"/>`}
 if(n>=5)s+='<path d="M2 54 Q40 38 88 16" stroke="#d0180f" stroke-width="8" stroke-linecap="round" fill="none"/>';return s+'</svg>'}
function waveFx(r){if(r===waveShown)return;waveShown=r;waveEl.innerHTML=r<=5?tally(Math.max(1,r)):'<div class="num">'+r+'</div>';waveEl.classList.remove('pop');void waveEl.offsetWidth;waveEl.classList.add('pop')}
let popN=0;function popup(n){if(!running)return;const d=document.createElement('div');d.textContent='+'+Math.round(n);if(n>=100)d.className='big';d.style.left=(26+(popN%3)*10)+'px';d.style.top=(-14-(popN%4)*12)+'px';popN++;popsEl.appendChild(d);
 while(popsEl.children.length>8)popsEl.firstChild.remove();setTimeout(()=>d.remove(),1000)}
const _hm2=hitMark;let splT=null;window.hitMark=function(c,kill){const col=kill?'#e0140c':c==='#f55'?'#ffb020':'#8fe060';_hm2(col,kill);if(kill){splat.classList.add('on');clearTimeout(splT);splT=setTimeout(()=>splat.classList.remove('on'),60)}};
const _hud=hud;window.hud=function(){_hud();if(RS.rnd&&RS.rnd!==waveShown)waveFx(RS.rnd);
 if(me.downed){downEl.style.display='block';const D=DOWN[me.id],t=D?Math.max(0,D.t):BLEED;$('zaDRing').setAttribute('stroke-dashoffset',264*(1-t/BLEED));$('zaDT').textContent=selfRev?'':Math.ceil(t);
  const mates=upMates(me.id);$('zaDMsg').textContent=selfRev?'Second Wind — getting back up':mates?'Hold on — a teammate can revive you':'Nobody is left standing…';
  $('hint').innerHTML='<span style="color:#ff8a7a">DOWNED · crawl with WASD · pistol only</span>'}
 else downEl.style.display='none';
 if(nDown&&!me.downed&&me.alive){const u=ZA.nearUse();if(!u||!/^rev_/.test(u.id)){let n=0;for(const id in DOWN)if(id!==me.id)n++;if(n)$('hint').innerHTML+='<br><span style="color:#ff6a5a">'+n+' teammate'+(n>1?'s':'')+' down — find the red marker</span>'}}};
// radar: ZA.markers + downed players
const _dr=drawRadar;window.drawRadar=function(){_dr();const g=$('radar').getContext('2d'),S=1.5,cx=90,cy=90,c=Math.cos(me.yaw),s=Math.sin(me.yaw),t=performance.now();
 const toR=(p,clamp)=>{const dx=p.x-me.pos.x,dz=p.z-me.pos.z;let x=(dx*c-dz*s)*S,y=(dx*s+dz*c)*S;const L=Math.hypot(x,y);if(L>84){if(!clamp)return null;x*=82/L;y*=82/L}return[cx+x,cy+y]};
 g.save();g.lineWidth=1.5;g.strokeStyle='#000';
 for(const m of ZA.markers){const p=P(m.pos);if(!p)continue;const q=toR(p,m.clamp);if(!q)continue;const[x,y]=q;g.fillStyle=m.color||'#e9c46a';g.beginPath();
  switch(m.shape){case'square':g.rect(x-4,y-4,8,8);break;case'diamond':g.moveTo(x,y-5);g.lineTo(x+5,y);g.lineTo(x,y+5);g.lineTo(x-5,y);g.closePath();break;
   case'tri':g.moveTo(x,y-5);g.lineTo(x+5,y+4);g.lineTo(x-5,y+4);g.closePath();break;case'bar':g.rect(x-5,y-2,10,4);break;
   case'star':for(let i=0;i<10;i++){const r=i%2?2.4:6,a=i*Math.PI/5-Math.PI/2;g.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r)}g.closePath();break;default:g.arc(x,y,4,0,7)}
  g.fill();g.stroke()}
 const on=Math.floor(t/250)%2;for(const id in DOWN){if(id===me.id)continue;const q=toR(posOf(id),true);if(!q)continue;const[x,y]=q;g.fillStyle=on?'#ff2a1a':'#fff';g.fillRect(x-1.8,y-6,3.6,12);g.fillRect(x-6,y-1.8,12,3.6);g.strokeStyle='#ff2a1a';g.beginPath();g.arc(x,y,8,0,7);g.stroke()}
 g.restore()};

// ================= Daily challenge =================
const DAILY=[
 {id:'pistol',n:'Sidearm Only',d:'Pistols only (no primary weapons). Reach wave 8.',w:8,bux:60},
 {id:'night10',n:'Nightmare Ten',d:'Survive 10 waves on Nightmare.',w:10,diff:'nightmare',bux:120},
 {id:'noperk',n:'Clean Living',d:'Never buy a perk. Reach wave 8.',w:8,bux:70},
 {id:'knife',n:'Up Close',d:'Only knife kills count. Get 30 knife kills in one game.',knife:30,bux:80},
 {id:'hs',n:'Headhunter',d:'Get 60 headshot kills in one game.',hs:60,bux:70},
 {id:'noarmory',n:'Scavenger',d:'The Armory is closed. Reach wave 7 with what you find.',w:7,bux:70},
 {id:'nodown',n:'Untouchable',d:'Reach wave 6 without ever going down.',w:6,bux:70},
 {id:'marathon',n:'Marathon',d:'Survive 15 waves on any difficulty.',w:15,bux:100},
 {id:'lone',n:'Lone Wolf',d:'No AI survivors, no friends. Reach wave 6.',w:6,bux:80},
 {id:'exterm',n:'Exterminator',d:'Get 150 kills in one game.',kills:150,bux:60},
 {id:'nm5',n:'Into the Dark',d:'Survive 6 waves on Nightmare without going down.',w:6,diff:'nightmare',bux:110}];
const dayKey=()=>{const d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()};
function today(){const k=dayKey();let h=2166136261;for(let i=0;i<k.length;i++){h^=k.charCodeAt(i);h=Math.imul(h,16777619)}return DAILY[(h>>>0)%DAILY.length]}
const chal={def:today(),failed:false,done:false,kills:0,hs:0,knife:0,downed:false};
const dailyDone=()=>LS.get('za_daily_done','')===dayKey();
function chalReset(){Object.assign(chal,{def:today(),failed:false,done:dailyDone(),kills:0,hs:0,knife:0,downed:false});
 if(chal.def.id==='lone'&&(Object.values(others).some(o=>o.team===0)||(isHost&&bots.some(b=>!b.zombie))))chalFail('AI survivors or friends are in the game')}
function chalFail(why){if(chal.failed||chal.done)return;chal.failed=true;feed('Daily challenge failed: '+why,'#ff8a7a')}
function chalWin(){if(chal.done||chal.failed)return;chal.done=true;if(dailyDone())return;LS.set('za_daily_done',dayKey());if(window.ubxBux)ubxBux(chal.def.bux);
 center('DAILY CHALLENGE COMPLETE',H(chal.def.n)+' · +'+chal.def.bux+' Unbloxed bux','#e9c46a');blip(660,.12,.3,'triangle');setTimeout(()=>blip(990,.12,.5,'triangle'),180)}
function dailyTick(){const c=chal.def;if(!c||chal.done||chal.failed||RS.ph==='over')return;
 if(c.id==='pistol'&&me.inv.p){me.inv.p=null;if(me.cur==='p')me.cur='s';center('','Daily challenge: pistols only — primary dropped')}
 if(c.id==='noperk'&&((ZA.perkBought|0)>0||(!('perkBought' in ZA)&&ZA.perks&&ZA.perks.size)))chalFail('a perk was bought');
 if((c.id==='nodown'||c.id==='nm5')&&chal.downed)chalFail('you went down');
 if(c.diff&&(ZA.difficulty||{}).id!==c.diff)return;
 if(c.knife&&chal.knife>=c.knife)chalWin();if(c.hs&&chal.hs>=c.hs)chalWin();if(c.kills&&chal.kills>=c.kills)chalWin()}
ZA.on('waveDone',w=>{const c=chal.def;if(c.w&&w>=c.w&&!chal.failed&&!(c.diff&&(ZA.difficulty||{}).id!==c.diff)){if((c.id==='nodown'||c.id==='nm5')&&chal.downed)return;chalWin()}});
ZA.on('down',id=>{if(id===me.id)chal.downed=true});
chalReset();

// ================= Game over panel =================
const over=document.createElement('div');over.id='zaOver';document.body.appendChild(over);let overData=null,overTimer=0;
const _ore=onRoundEnd;window.onRoundEnd=function(m){const r=_ore(m);if(RS.ph==='over'){$('center').style.opacity=0;try{centerT=0}catch(e){}if(isHost)RS.tl=15}return r};
ZA.on('gameOver',(w,m)=>{if(overShown===gameN)return;overShown=gameN;clearAllDowns();
 const s=st(me.id);s.name=me.name;
 if(isHost)for(const b of bots)if(!b.zombie){const x=st(b.id);x.name=b.name;x.pts=x.kills*100+x.revives*100}
 const best=LS.get('za_best',0)|0,nb=w>best&&w>0;if(nb)LS.set('za_best',w);
 const runs=LS.get('za_runs',[]);runs.push({n:me.name,w,k:s.kills,d:(ZA.difficulty||{}).id||'normal',at:Date.now()});runs.sort((a,b)=>b.w-a.w||b.k-a.k);LS.set('za_runs',runs.slice(0,10));
 overData={w,nb,best:Math.max(best,w),diff:(ZA.difficulty||{}).n||'Normal'};
 if(isHost){const all={};for(const id in ZA.stats)if(id===me.id||bots.some(b=>b.id===id))all[id]=ZA.stats[id];bcast({t:'ev',e:'stats',all})}else send({t:'ev',e:'mystats',s});
 if(w>=3&&submitted!==gameN){submitted=gameN;rpc('za_submit',{p_name:String(me.name).slice(0,20),p_wave:w,p_kills:s.kills,p_diff:(ZA.difficulty||{}).id||'normal'}).then(()=>{gCache=null;LS.set('za_gtop',null)})}
 showOver()});
function showOver(){over.style.display='flex';renderOver();try{document.exitPointerLock()}catch(e){}clearInterval(overTimer);overTimer=setInterval(()=>{if(over.style.display!=='flex'){clearInterval(overTimer);return}const e=$('zaOT');if(e)e.textContent=RS.ph==='over'?'Next game in '+Math.max(0,Math.ceil(RS.tl))+'s':''},250)}
function hideOver(){if(over.style.display==='flex'){over.style.display='none';if(running&&!locked)try{R.domElement.requestPointerLock()}catch(e){}}}
function renderOver(){if(!overData||over.style.display!=='flex')return;const s=st(me.id),o=overData;
 const L=Object.keys(ZA.stats).map(id=>Object.assign({id},ZA.stats[id]));L.sort((a,b)=>(b.kills+b.revives*5)-(a.kills+a.revives*5));const mvp=L[0];
 const c=chal.def;
 over.innerHTML=`<div class="pnl"><h2>THE HORDE GOT YOU</h2><div class="sv">You survived <b style="color:#ff4a36">${o.w}</b> wave${o.w===1?'':'s'} · ${H(o.diff)}</div>${o.nb?'<div class="nb">NEW BEST WAVE</div>':''}
 <div class="grid"><div><b>${o.w}</b><span>Waves</span></div><div><b>${s.kills}</b><span>Kills</span></div><div><b>${s.hs}</b><span>Headshots</span></div><div><b>${s.pts}</b><span>Points</span></div><div><b style="font-size:18px;line-height:34px">${H(bestGun(s))}</b><span>Best gun</span></div><div><b>${s.revives}</b><span>Revives</span></div></div>
 ${mvp&&L.length>1?`<div class="ch mvp">MVP: <b>${H(mvp.name)}</b> · ${mvp.kills} kills · ${mvp.revives} revives</div>`:''}
 <div class="ch">Daily challenge, ${H(c.n)}: ${chal.done?'<span style="color:#9be06a">complete</span>':chal.failed?'<span style="color:#ff8a7a">failed</span>':'not yet'} · Best wave ${o.best}</div>
 ${L.length>1?'<table><tr class="h"><td>SURVIVOR</td><td>KILLS</td><td>HEADSHOTS</td><td>DOWNS</td><td>REVIVES</td><td>POINTS</td></tr>'+L.map(p=>`<tr${p.id===me.id?' style="color:#e8d29a"':''}><td>${H(p.name)}${mvp&&p.id===mvp.id?' <span class="mvp">MVP</span>':''}</td><td>${p.kills}</td><td>${p.hs}</td><td>${p.downs}</td><td>${p.revives}</td><td>${p.pts}</td></tr>`).join('')+'</table>':''}
 <div class="ft"><button id="zaAgain">${isHost?'Play again':'Back to the game'}</button><span class="st" id="zaOT"></span></div></div>`;
 $('zaAgain').onclick=()=>{if(isHost&&RS.ph==='over')RS.tl=0;over.style.display='none';try{R.domElement.requestPointerLock()}catch(e){}}}
addEventListener('keydown',e=>{if(e.code==='Enter'&&over.style.display==='flex'){const b=$('zaAgain');b&&b.click()}});

// ================= 6. Leaderboards =================
const SB=window.DR_STATUS_URL||'https://zznsfdcpondfnacherxv.supabase.co',SBK='sb_publishable_P6Xw_9hNrt-1_sKE7SsN7w_nN7eum3I';
function rpc(fn,body){try{return fetch(SB+'/rest/v1/rpc/'+fn,{method:'POST',headers:{apikey:SBK,Authorization:'Bearer '+SBK,'Content-Type':'application/json'},body:JSON.stringify(body||{})}).then(r=>r.ok?r.text().then(t=>{try{return JSON.parse(t)}catch(e){return null}}):null).catch(()=>null)}catch(e){return Promise.resolve(null)}}
let gCache=null,gTab=LS.get('za_lbtab','local');
function loadGlobal(){const c=LS.get('za_gtop',null);if(c&&Date.now()-c.at<3e5){gCache=c.rows;drawLB();return}
 rpc('za_top',{}).then(r=>{if(Array.isArray(r)){gCache=r.slice(0,10);LS.set('za_gtop',{at:Date.now(),rows:gCache})}drawLB()})}
function drawLB(){const el=$('zaLB');if(!el)return;for(const b of document.querySelectorAll('.za-tabs button'))b.classList.toggle('on',b.dataset.t===gTab);
 const rows=gTab==='local'?LS.get('za_runs',[]):(gCache||[]);
 if(!rows.length){el.innerHTML='<div class="za-empty">'+(gTab==='local'?'No runs yet. Survive some waves!':gCache?'No global scores yet. Reach wave 3 to get on the board.':'Global board unavailable right now.')+'</div>';return}
 el.innerHTML='<table class="za-lb">'+rows.slice(0,10).map((r,i)=>{const n=r.n||r.name,w=r.w!=null?r.w:r.wave,k=r.k!=null?r.k:r.kills,d=r.d||r.diff;return`<tr class="${n===me.name?'me':''}"><td>${i+1}</td><td>${H(n)}</td><td class="k">${k|0} kills · ${H(d||'')}</td><td class="w">W${w|0}</td></tr>`}).join('')+'</table>'}

// ================= 3. Main menu =================
const box=$('menu').querySelector('.box');
function buildMenu(){const keep={name:$('name').closest('.row'),bots:$('bots').closest('.row'),mode:$('mode'),solo:$('bSolo'),host:$('bHost'),join:$('joinCode').closest('.row'),err:$('err'),keys:box.querySelector('.keys'),back:box.querySelector('a')};
 box.innerHTML='';box.classList.add('zam');
 const L=document.createElement('div'),Rt=document.createElement('div');box.append(L,Rt);
 L.innerHTML='<div class="za-title"><span>ZOMBIE</span><span class="z2">APOCALYPSE</span></div><div class="za-tag">Round-based survival · co-op · how long can you last?</div><div class="za-best">BEST WAVE <b id="zaBest">0</b></div>';
 const c1=document.createElement('div');c1.className='card';c1.append(keep.name,keep.bots);
 const dr=document.createElement('div');dr.className='row';dr.innerHTML='<label>Difficulty</label><div><div class="za-seg">'+Object.values(DIFFS).map(d=>`<button type="button" data-d="${d.id}">${d.n}</button>`).join('')+'</div><div class="za-dd" id="zaDD"></div></div>';c1.append(dr,keep.mode);
 const c2=document.createElement('div');c2.className='card';c2.append(keep.solo,keep.host,keep.join);L.append(c2,c1,keep.err);if(keep.keys){keep.keys.innerHTML='<kbd>W A S D</kbd> move · <kbd>Space</kbd> jump · <kbd>B</kbd> armory · <kbd>E</kbd> use / hold to revive · <kbd>G</kbd> grenades · <kbd>Tab</kbd> scores';L.append(keep.keys)}if(keep.back)L.append(keep.back);
 keep.solo.textContent='Play solo';keep.host.textContent='Host co-op';
 Rt.innerHTML='<div class="card za-daily"><div class="za-h">Daily challenge <span class="r" id="zaDR"></span></div><div class="n" id="zaDN"></div><div class="d" id="zaDD2"></div><div class="r" id="zaDS"></div></div>'+
  '<div class="card"><div class="za-h">Leaderboard <span class="za-tabs"><button type="button" data-t="local">This device</button><button type="button" data-t="global">Global</button></span></div><div id="zaLB"></div></div>';
 if(window.ZAMAP&&ZAMAP.list&&ZAMAP.list.length>1){const mr=document.createElement('div');mr.className='card za-mapc';mr.innerHTML='<div class="za-h">Map</div><div class="za-seg za-map">'+ZAMAP.list.map(m=>`<button type="button" data-m="${m.id}" class="${m.id===ZAMAP.id?'on':''}">${H(m.name)}</button>`).join('')+'</div>';Rt.prepend(mr);
  for(const b of mr.querySelectorAll('button'))b.onclick=()=>{if(b.dataset.m===ZAMAP.id)return;try{localStorage.setItem('za_map',b.dataset.m)}catch(e){}const u=new URL(location.href);u.searchParams.delete('map');location.replace(u.toString())}}
 for(const b of dr.querySelectorAll('button'))b.onclick=()=>{setDiff(b.dataset.d);LS.set('za_diff',b.dataset.d);refreshMenu()};
 for(const b of Rt.querySelectorAll('.za-tabs button'))b.onclick=()=>{gTab=b.dataset.t;LS.set('za_lbtab',gTab);drawLB()}}
const DDESC={easy:'Slower, weaker zombies. Good for learning the map.',normal:'The intended experience.',nightmare:'Tougher, faster, hungrier. 1.5x points.'};
function refreshMenu(){for(const b of box.querySelectorAll('.za-seg:not(.za-map) button'))b.classList.toggle('on',b.dataset.d===(ZA.difficulty||{}).id);const dd=$('zaDD');if(dd)dd.textContent=DDESC[(ZA.difficulty||{}).id]||'';
 $('zaBest').textContent=LS.get('za_best',0)|0;const c=today();$('zaDN').textContent=c.n;$('zaDD2').textContent=c.d;$('zaDR').textContent='+'+c.bux+' bux';
 $('zaDS').innerHTML=dailyDone()?'<span class="done">Completed today. New challenge tomorrow.</span>':'Resets at midnight · play any mode to attempt';drawLB()}
try{buildMenu();refreshMenu();loadGlobal()}catch(e){console.error('coop-ui menu',e)}
// pause menu: Leave match (back to the main menu)
try{const rb=$('bResume');if(rb&&!$('bLeave')){const lb=document.createElement('button');lb.id='bLeave';lb.type='button';lb.className='alt';lb.textContent='Leave match';lb.style.marginLeft='10px';rb.after(lb);
 lb.addEventListener('mousedown',e=>e.stopPropagation());lb.onclick=e=>{e.stopPropagation();try{if(typeof peer!=='undefined'&&peer)peer.destroy()}catch(_){}const u=new URL(location.href);u.searchParams.delete('join');location.replace(u.toString())}}}catch(e){}
// rejoin after switching to the host's map (?join=CODE)
try{const jc=new URLSearchParams(location.search).get('join');if(jc){const u=new URL(location.href);u.searchParams.delete('join');history.replaceState(null,'',u.toString());setTimeout(()=>{$('joinCode').value=jc;$('bJoin').click()},600)}}catch(e){}
// idle zombies on the menu background
const idle=[];let menuVis=true,mt=performance.now();
function spawnIdle(){if(idle.length||!ZA.zAv)return;for(let i=0;i<5;i++){let x=0,z=0;for(let t=0;t<40;t++){const a=Math.random()*6.28,r=5+Math.random()*12;x=Math.cos(a)*r;z=Math.sin(a)*r;const k=cell(x,z);if(k>=0&&C[k]===1)break}
 try{const o=makeSoldier(1,ZA.zAv(),'');if(o.userData.tag)o.userData.tag.visible=false;ZA.hideGun(o);o.position.set(x,hAt(x,z),z);scene.add(o);idle.push({o,a:Math.random()*6.28,r:Math.hypot(x,z),cx:0,cz:0,sp:(.15+Math.random()*.15)*(Math.random()<.5?-1:1),lurch:Math.random()*6})}catch(e){}}}
function clearIdle(){for(const z of idle)scene.remove(z.o);idle.length=0}
(function loop(){requestAnimationFrame(loop);const n=performance.now(),dt=Math.min(.05,(n-mt)/1000);mt=n;
 const vis=!running&&$('menu').style.display!=='none';if(vis&&!menuVis){refreshMenu();loadGlobal()}menuVis=vis;
 if(!vis){if(idle.length)clearIdle();return}spawnIdle();
 for(const z of idle){z.a+=z.sp*dt/Math.max(3,z.r)*3;z.lurch+=dt;const x=Math.cos(z.a)*z.r,zz=Math.sin(z.a)*z.r;z.o.position.set(x,hAt(x,zz),zz);z.o.rotation.y=Math.atan2(-(-Math.sin(z.a)*z.sp),-(Math.cos(z.a)*z.sp));try{animSoldier(z.o,1.4+Math.sin(z.lurch*2)*.6,.25,dt,false)}catch(e){}}})();
})();
