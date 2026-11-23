// Trench War persistent progression: rank, daily challenges, weapon XP, attachments, camos. localStorage key tw_prog.
// Loaded before the main script; touches game globals (GUNS, me, vmId, THREE) lazily at call time. Hooks: see trench-war.html (TWP.*).
(function(){
'use strict';
const KEY='tw_prog';
const RANKS=['Recruit','Private','Private First Class','Lance Corporal','Corporal','Bombardier','Lance Sergeant','Sergeant','Staff Sergeant','Colour Sergeant','Sergeant Major','Warrant Officer','Cadet Officer','Second Lieutenant','Lieutenant','Senior Lieutenant','Captain','Senior Captain','Major','Lieutenant Colonel','Colonel','Brevet Colonel','Brigadier','Brigadier General','Major General','Lieutenant General','General','General of the Army','Marshal','Field Marshal'];
const NR=RANKS.length;
const rankAt=n=>n<=1?0:Math.round(80*Math.pow(n-1,1.75)/10)*10; // total XP needed to reach rank n
const XP={kill:10,hs:5,round:25,win:100,played:30};
const WL=[0,100,300,600,1000]; // weapon xp for level 0..4
const ATT=[{k:'mag',n:'Ext Mag',lv:1,t:'Extended Mag: +25% magazine, tiny speed cost'},{k:'grip',n:'Foregrip',lv:2,t:'Foregrip: -15% recoil'},{k:'sight',n:'Sight',lv:3,t:'Better Sight: more ADS zoom (non-scoped guns)'},{k:'sup',n:'Suppr',lv:4,t:'Suppressor: less muzzle flash, -8% damage'}];
const CAMOS=[{k:'woodland',n:'Woodland',kills:25,c:'#4f6030'},{k:'desert',n:'Desert',kills:100,c:'#c8a96a'},{k:'night',n:'Night',kills:250,c:'#1f2a44'},{k:'gold',n:'Gold',lv:4,c:'#e9c46a'}];
const POOL=[
 {id:'hs20',g:'hs',txt:'Get 20 headshots',goal:20,ev:'hs',xp:350},
 {id:'hs10',g:'hs',txt:'Get 10 headshots',goal:10,ev:'hs',xp:200},
 {id:'win2',g:'win',txt:'Win 2 matches',goal:2,ev:'mwin',xp:400},
 {id:'win1',g:'win',txt:'Win a match',goal:1,ev:'mwin',xp:220},
 {id:'sg10',g:'sg',txt:'Get 10 kills with shotguns',goal:10,ev:'sg',xp:280},
 {id:'melee5',g:'melee',txt:'Get 5 knife kills',goal:5,ev:'melee',xp:350},
 {id:'plant2',g:'plant',txt:'Plant the bomb 2 times',goal:2,ev:'plant',xp:250},
 {id:'streak5',g:'streak',txt:'Get a 5 kill streak',goal:5,ev:'streak',xp:320},
 {id:'kills30',g:'kills',txt:'Get 30 kills',goal:30,ev:'kill',xp:260},
 {id:'pist10',g:'pist',txt:'Get 10 pistol kills',goal:10,ev:'pist',xp:260},
 {id:'rifle15',g:'rifle',txt:'Get 15 rifle kills',goal:15,ev:'rifle',xp:260},
 {id:'smg15',g:'smg',txt:'Get 15 SMG kills',goal:15,ev:'smg',xp:260},
 {id:'rnd5',g:'rnd',txt:'Win 5 rounds',goal:5,ev:'rwin',xp:260},
 {id:'defuse1',g:'defuse',txt:'Defuse the bomb',goal:1,ev:'defuse',xp:280}];

let S={xp:0,w:{},att:{},camo:{},daily:null};
try{const j=JSON.parse(localStorage.getItem(KEY)||'null');if(j&&typeof j==='object')S=Object.assign(S,j)}catch(e){}
S.w=S.w||{};S.att=S.att||{};S.camo=S.camo||{};
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}

// ---------- rank ----------
function rankOf(xp){let n=1;while(n<NR&&xp>=rankAt(n+1))n++;return n}
const rank=()=>rankOf(S.xp);
function rankInfo(){const n=rank(),a=rankAt(n),b=n>=NR?a:rankAt(n+1);return{n,name:RANKS[n-1],xp:S.xp,a,b,f:n>=NR?1:(S.xp-a)/(b-a)}}
function tierCol(n){return n>=25?'#ffd75e':n>=19?'#e9c46a':n>=13?'#9fc0ff':n>=7?'#9fd89a':'#b8b8b8'}
function badge(n){if(!n)return'';return`<span class="twpb" style="border-color:${tierCol(n)};color:${tierCol(n)}" title="${RANKS[n-1]||''}">${n}</span>`}

// ---------- toasts ----------
function css(){if(document.getElementById('twpCss'))return;const s=document.createElement('style');s.id='twpCss';s.textContent=`
.twpb{display:inline-block;min-width:20px;padding:0 4px;margin-right:7px;border:1px solid;border-radius:4px;font:700 12px/17px Oswald,Impact,sans-serif;text-align:center;letter-spacing:0;background:rgba(0,0,0,.4)}
#twpToasts{position:fixed;left:50%;top:92px;transform:translateX(-50%);z-index:12;display:flex;flex-direction:column;align-items:center;gap:6px;pointer-events:none}
#twpToasts>div{padding:7px 18px;background:rgba(14,15,12,.82);border:1px solid rgba(255,240,200,.2);border-left:3px solid #e9c46a;border-radius:7px;font:500 15px Oswald,Impact,sans-serif;letter-spacing:1.5px;color:#f3e3b5;text-shadow:0 2px 6px #000;animation:twpIn .25s ease-out;transition:opacity .5s}
#twpToasts>div small{display:block;font:400 12px Inter,sans-serif;letter-spacing:0;color:#ddd}
#twpToasts>div.up{font-size:20px;border-left-color:#ffd75e;padding:10px 26px}
@keyframes twpIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
.twpR{display:flex;align-items:center;gap:10px}.twpR .twpb{font-size:18px;line-height:26px;min-width:30px;margin:0}
.twpR b{font:600 16px Oswald,Impact,sans-serif;letter-spacing:2px;color:#f3e3b5;text-transform:uppercase}
.twpBar{height:6px;background:rgba(255,255,255,.12);border-radius:3px;overflow:hidden;margin-top:4px}.twpBar i{display:block;height:100%;background:linear-gradient(90deg,#c9a24a,#ffe08a)}
.twpSm{font:400 11px Inter,sans-serif;color:#bbb}
.twpD{margin:6px 0}.twpD .l{display:flex;justify-content:space-between;font:500 13px Inter,sans-serif;color:#eee;gap:8px}.twpD.done .l{color:#8cff7a}.twpD .l span{color:#e9c46a;white-space:nowrap}
#buy .twp{margin:-2px 0 8px;padding:5px 6px;border:1px solid rgba(255,240,200,.08);border-radius:6px;background:rgba(0,0,0,.25)}
#buy .twp .wx{display:flex;align-items:center;gap:6px;font:500 10px Oswald,Impact,sans-serif;letter-spacing:1px;color:#cfc4a6}#buy .twp .wx .twpBar{flex:1;margin:0;height:5px}
#buy .twp .at,#buy .twp .cm{display:flex;gap:3px;margin-top:5px;flex-wrap:wrap}
#buy .twp button{margin:0;padding:2px 5px;font:600 10px Inter,sans-serif;letter-spacing:0;text-transform:none;border-radius:4px;background:rgba(0,0,0,.4);border:1px solid rgba(255,240,200,.18);color:#bbb;box-shadow:none;flex:1 1 auto;min-width:0}
#buy .twp button.on{background:rgba(233,196,106,.22);border-color:#e9c46a;color:#fff}
#buy .twp button:disabled{opacity:.4;cursor:default}
#buy .twp .cm button{flex:0 0 auto;width:20px;height:16px;padding:0;position:relative}#buy .twp .cm button.on{outline:2px solid #fff}
`;document.head.appendChild(s)}
function toast(t,sub,cls){css();let c=document.getElementById('twpToasts');if(!c){c=document.createElement('div');c.id='twpToasts';document.body.appendChild(c)}
 const d=document.createElement('div');if(cls)d.className=cls;d.innerHTML=t+(sub?'<small>'+sub+'</small>':'');c.appendChild(d);while(c.children.length>4)c.firstChild.remove();
 setTimeout(()=>d.style.opacity=0,3800);setTimeout(()=>d.remove(),4400);try{if(typeof blip==='function')blip(cls==='up'?990:760,.12,.3,'triangle')}catch(e){}}

function addXP(n,why){if(!(n>0))return;const before=rank();S.xp+=n;const after=rank();save();
 if(after>before)toast('RANK UP: '+RANKS[after-1]+' (Rank '+after+')','Total XP '+S.xp,'up');refresh()}

// ---------- weapon data ----------
const GU=()=>typeof GUNS!=='undefined'?GUNS:{};
const orig={}; // id -> unmodified GUNS entry while a modified copy is installed
const gOf=id=>orig[id]||GU()[id];
const isGun=G=>G&&G.cat&&G.mag;
function wd(id){return S.w[id]||(S.w[id]={xp:0,k:0})}
function wlevel(id){const x=wd(id).xp;let l=0;for(let i=1;i<WL.length;i++)if(x>=WL[i])l=i;return l}
function attOn(id,k){const l=wlevel(id),a=ATT.find(x=>x.k===k);return l>=a.lv&&!!(S.att[id]&&S.att[id][k])}
function camoOK(id,c){const w=wd(id);return c.kills?w.k>=c.kills:wlevel(id)>=c.lv}
function build(id){const G=gOf(id);if(!isGun(G))return null;const m=Object.assign({},G);let any=false;
 if(attOn(id,'mag')){m.mag=Math.ceil(G.mag*1.25);m.spd=(G.spd||1)*.985;any=true}
 if(attOn(id,'grip')){m.kick=(G.kick||0)*.85;any=true}
 if(attOn(id,'sight')&&!G.scope){m.adsz=2;any=true}
 if(attOn(id,'sup')){m.sup=1;m.dmg=G.dmg*.92;any=true}
 return any?m:null}
function restore(id){if(orig[id]){GU()[id]=orig[id];delete orig[id]}}
function install(id){const G=GU()[id];if(!isGun(G))return;const base=gOf(id),m=build(id);restore(id);if(m){orig[id]=base;GU()[id]=m}}
function give(id){const G=gOf(id);if(!isGun(G))return;
 for(const k of Object.keys(orig)){const O=orig[k];const held=typeof me!=='undefined'&&(me.inv.p===k||me.inv.s===k);if(k!==id&&(O.slot===G.slot||!held))restore(k)}
 install(id);vmRefresh()}
function vmRefresh(){try{if(typeof vmId!=='undefined')vmId=''}catch(e){}}
function reapply(id){const G=GU()[id];if(!G)return;const old=G.mag;install(id);
 try{if(me.ammo[id]){const n=GU()[id];if(n.mag>old)me.ammo[id][0]=Math.min(n.mag,me.ammo[id][0]+(n.mag-old));me.ammo[id][0]=Math.min(me.ammo[id][0],n.mag)}}catch(e){}vmRefresh()}
const owned=id=>typeof me!=='undefined'&&(me.inv.p===id||me.inv.s===id);

// ---------- camo ----------
const texC={};
function camoTex(name){if(texC[name])return texC[name];const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');
 const P={woodland:['#4a5a2a','#2f3b1c','#6b5a34','#1d2412'],desert:['#c8a96a','#a88a4e','#dcc48c','#8c7340'],night:['#141b2e','#0a0d18','#26334f','#05070d'],gold:['#ffd75e','#c8962a','#fff0a0','#a87a18']}[name]||['#888'];
 g.fillStyle=P[0];g.fillRect(0,0,64,64);let s=name.length*977+13;const r=()=>(s=(s*16807)%2147483647)/2147483647;
 for(let i=0;i<46;i++){g.fillStyle=P[1+(i%(P.length-1))];const x=r()*64,y=r()*64,w=6+r()*16,h=4+r()*10;g.beginPath();g.ellipse(x,y,w,h,r()*3,0,6.3);g.fill()}
 if(name==='gold'){for(let i=0;i<64;i+=4){g.fillStyle='rgba(255,255,255,.12)';g.fillRect(0,i,64,1)}}
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2,2);return texC[name]=t}
function camo(mesh,id){try{const k=S.camo[id];if(!k||!mesh||typeof THREE==='undefined')return mesh;const c=CAMOS.find(x=>x.k===k);if(!c||!camoOK(id,c))return mesh;const tex=camoTex(k),white=new THREE.Color(1,1,1);
 mesh.traverse(o=>{if(!o.isMesh||!o.material)return;const mats=Array.isArray(o.material)?o.material:[o.material];const out=mats.map(m=>{if(!m||!m.color||m.transparent||m.opacity<1)return m;const lum=(m.color.r+m.color.g+m.color.b)/3;if(k!=='gold'&&lum<.03)return m;
  const n=m.clone();n.map=tex;n.color=m.color.clone().lerp(white,k==='night'?.45:.7);if(k==='gold'){if(n.emissive)n.emissive.setHex(0x3a2a00);if('metalness' in n){n.metalness=.7;n.roughness=.35}}n.needsUpdate=true;return n});o.material=Array.isArray(o.material)?out:out[0]});
 }catch(e){console.warn('[TWP camo]',e)}return mesh}

// ---------- daily challenges ----------
function today(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function seeded(str){let h=1779033703^str.length;for(let i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353);h=h<<13|h>>>19}let a=h>>>0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function ensureDaily(){const d=today();if(S.daily&&S.daily.date===d&&S.daily.ch&&S.daily.ch.length===3)return S.daily;
 const r=seeded('trenchwar'+d),p=POOL.slice();for(let i=p.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[p[i],p[j]]=[p[j],p[i]]}
 const pick=[],gs={};for(const c of p){if(pick.length>=3)break;if(gs[c.g])continue;gs[c.g]=1;pick.push(c)}
 S.daily={date:d,ch:pick.map(c=>({id:c.id,p:0,done:0}))};save();return S.daily}
const chDef=id=>POOL.find(c=>c.id===id);
function ev(name,n){n=n==null?1:n;const D=ensureDaily();let ch=false;
 for(const c of D.ch){const def=chDef(c.id);if(!def||c.done||def.ev!==name)continue;
  c.p=name==='streak'?Math.max(c.p,n):c.p+n;ch=true;
  if(c.p>=def.goal){c.p=def.goal;c.done=1;toast('CHALLENGE COMPLETE',def.txt+' · +'+def.xp+' XP');addXP(def.xp,'challenge')}}
 if(ch){save();refresh()}}

// ---------- game hooks ----------
let streak=0,lastWin=0;
function weaponXP(gun,hs){const G=gOf(gun);if(!G||!G.dmg)return;const w=wd(gun),lb=wlevel(gun);w.k++;w.xp+=XP.kill+(hs?XP.hs:0);const la=wlevel(gun);save();
 if(isGun(G)){
  if(la>lb){for(let l=lb+1;l<=la;l++){const a=ATT.find(x=>x.lv===l);if(a&&!(a.k==='sight'&&G.scope)){S.att[gun]=S.att[gun]||{};S.att[gun][a.k]=1}}
   toast((G.n||gun).toUpperCase()+' LEVEL '+la,'Unlocked '+ATT.filter(a=>a.lv>lb&&a.lv<=la).map(a=>a.n).join(', ')+(la>=4?' · Gold camo':''));save();if(owned(gun))reapply(gun)}
  for(const c of CAMOS)if(c.kills&&w.k===c.kills)toast((G.n||gun)+': '+c.n+' camo unlocked',w.k+' kills')}}
function onKill(k,v,hs,gun,tk){try{if(typeof me==='undefined')return;
 if(v===me.id){streak=0;return}
 if(k!==me.id||tk)return;
 const G=gOf(gun)||{};
 streak++;addXP(XP.kill+(hs?XP.hs:0),'kill');weaponXP(gun,hs);
 ev('kill');if(hs)ev('hs');if(G.pel)ev('sg');if(G.melee)ev('melee');if(G.slot===2&&!G.melee)ev('pist');if(G.cat==='Rifles')ev('rifle');if(G.cat==='SMGs')ev('smg');ev('streak',streak)
 }catch(e){console.warn('[TWP]',e)}}
function roundEnd(m){try{const won=m.mode==='ffa'?m.win===me.id:m.win===me.team;
 if((!m.mode||m.mode==='bomb')&&won){addXP(XP.round);ev('rwin')}
 if(m.over){const t=Date.now();if(t-lastWin<15000)return;lastWin=t;if(won){addXP(XP.win);ev('mwin')}else addXP(XP.played)}
 }catch(e){console.warn('[TWP]',e)}}

// ---------- UI ----------
const els=new Set();
function renderRank(el){if(!el)return;css();els.add({el,f:renderRank});const r=rankInfo();
 el.innerHTML=`<div class="twpR">${badge(r.n)}<div style="flex:1"><b>${r.name}</b><div class="twpBar"><i style="width:${Math.round(r.f*100)}%"></i></div><div class="twpSm">${r.n>=NR?r.xp+' XP · max rank':r.xp+' / '+r.b+' XP to Rank '+(r.n+1)}</div></div></div>`}
function renderDaily(el){if(!el)return;css();els.add({el,f:renderDaily});const D=ensureDaily();
 el.innerHTML='<div class="twpSm" style="letter-spacing:1px;text-transform:uppercase">Daily challenges</div>'+D.ch.map(c=>{const d=chDef(c.id);if(!d)return'';return`<div class="twpD${c.done?' done':''}"><div class="l"><div>${d.txt}</div><span>${c.done?'DONE':c.p+'/'+d.goal+' · +'+d.xp+' XP'}</span></div><div class="twpBar"><i style="width:${Math.round(c.p/d.goal*100)}%"></i></div></div>`}).join('')}
function refresh(){for(const o of Array.from(els)){if(!o.el.isConnected){els.delete(o);continue}o.f(o.el)}}
function fallback(){if(document.getElementById('lobbyDaily')||document.getElementById('lobbyRank')||document.getElementById('twpFallback'))return;const menu=document.getElementById('menu');if(!menu)return;const box=menu.querySelector('.box'),err=document.getElementById('err');if(!box)return;
 css();const d=document.createElement('div');d.className='card';d.id='twpFallback';d.innerHTML='<div id="twpFR"></div><div id="twpFD" style="margin-top:10px"></div>';box.insertBefore(d,err||null);renderRank(document.getElementById('twpFR'));renderDaily(document.getElementById('twpFD'))}
// buy-menu extras under a gun card: weapon XP bar, attachment toggles, camo picker
function locked(id){const G=gOf(id);return !!(G&&typeof G.rank==='number'&&G.rank>rank())}
function lockTxt(id){const G=gOf(id);return locked(id)?'LOCKED · Rank '+G.rank+' · ':''}
function buyRow(col,id,redraw){const G=gOf(id);if(!isGun(G)||locked(id))return;css();const lv=wlevel(id),w=wd(id),nx=WL[Math.min(4,lv+1)],pv=WL[lv],f=lv>=4?1:(w.xp-pv)/(nx-pv);
 const r=document.createElement('div');r.className='twp';
 r.innerHTML=`<div class="wx"><span>LV ${lv}</span><div class="twpBar"><i style="width:${Math.round(f*100)}%"></i></div><span>${w.k}K</span></div><div class="at"></div><div class="cm"></div>`;
 const at=r.querySelector('.at'),cm=r.querySelector('.cm');
 for(const a of ATT){const b=document.createElement('button');const ok=lv>=a.lv&&!(a.k==='sight'&&G.scope);b.textContent=ok?a.n:(a.k==='sight'&&G.scope?'n/a':'L'+a.lv);b.title=a.t+(lv<a.lv?' (unlocks at weapon level '+a.lv+')':'');b.disabled=!ok;if(ok&&S.att[id]&&S.att[id][a.k])b.className='on';
  b.onclick=e=>{e.stopPropagation();S.att[id]=S.att[id]||{};S.att[id][a.k]=S.att[id][a.k]?0:1;save();if(owned(id))reapply(id);redraw&&redraw()};at.appendChild(b)}
 const none=document.createElement('button');none.textContent='x';none.title='No camo';if(!S.camo[id])none.className='on';none.onclick=e=>{e.stopPropagation();delete S.camo[id];save();vmRefresh();redraw&&redraw()};cm.appendChild(none);
 for(const c of CAMOS){const b=document.createElement('button'),ok=camoOK(id,c);b.style.background=ok?c.c:'#222';b.title=c.n+(ok?'':' (locked: '+(c.kills?c.kills+' kills':'all attachments unlocked')+')');b.disabled=!ok;if(S.camo[id]===c.k)b.className='on';
  b.onclick=e=>{e.stopPropagation();S.camo[id]=c.k;save();vmRefresh();redraw&&redraw()};cm.appendChild(b)}
 col.appendChild(r)}

window.TWP={rank,rankName:n=>RANKS[(n||rank())-1],info:rankInfo,badge,onKill,roundEnd,ev,give,camo,locked,lockTxt,buyRow,renderRank,renderDaily,refresh,toast,addXP,state:()=>S,
 plant:()=>ev('plant'),defuse:()=>ev('defuse'),wlevel,ensureDaily};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(fallback,0));else setTimeout(fallback,0);
addEventListener('load',()=>setTimeout(fallback,50));
})();
