/* fishing/ubx/players.js - Unbloxed mode: Roblox-style player list (leaderboard) at the top right.
   - Panel at right 12, top 52, 250 wide (the Bux counter row above it, y 8-44, stays clear).
   - Header: server info ("Server 1 · 3/12", "Solo" when offline) + column titles.
   - One row per player: you first (highlighted), then everyone else in the lobby, sorted by Fish.
     Leaderstats: Fish = catches this session, Best = best rarity this session (colored with RCOL).
   - Tab toggles the list; remembered in localStorage 'ubx_fish_plist'. Refreshes twice a second.
   - Hides the game's own #net lobby label (the header shows the server instead).
   Hooks: FUX 'onCatch' (your catches), 'onStart'. Wraps the global onMsg (always calls through) to count
   other players' 'catch' messages per sender. Everything is wrapped in try/catch so the game never breaks. */
(function(){
'use strict';
if(!window.FUX||!FUX.on)return;
try{

const LS_KEY='ubx_fish_plist';
const CAP_DEF=12;
// the game's top-level let/const (S, NET, remotes, started, CAP...) are shared globals but not window properties
const G={
 S:()=>typeof S!=='undefined'?S:null,
 NET:()=>typeof NET!=='undefined'?NET:null,
 remotes:()=>typeof remotes!=='undefined'&&remotes?remotes:{},
 started:()=>typeof started!=='undefined'&&!!started,
 CAP:()=>typeof CAP!=='undefined'&&CAP?CAP:CAP_DEF,
 FISH:()=>typeof FISH!=='undefined'?FISH:null,
 RAR:()=>typeof RAR!=='undefined'?RAR:null,
 RCOL:()=>typeof RCOL!=='undefined'?RCOL:null};
const g=n=>G[n]();
const escH=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------- font + style ---------- */
if(!document.querySelector('link[href*="family=Montserrat"]')){
 const l=document.createElement('link');l.rel='stylesheet';
 l.href='https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800&display=swap';
 document.head.appendChild(l);
}
const css=document.createElement('style');css.id='ubxPlistCss';
css.textContent=`
html.ubx #net{display:none!important}
#ubxPlist{position:fixed;top:52px;right:12px;width:250px;z-index:6;pointer-events:none;display:none;
 font-family:Montserrat,Inter,'Segoe UI',Arial,sans-serif;color:#fff;user-select:none;-webkit-user-select:none;
 opacity:0;transform:translateX(14px);transition:opacity .16s ease,transform .16s ease}
#ubxPlist.show{opacity:1;transform:none}
#ubxPlist .pl-box{background:rgba(17,19,24,.62);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
 border:1px solid rgba(255,255,255,.09);border-radius:10px;overflow:hidden;box-shadow:0 6px 20px rgba(0,0,0,.28);
 max-height:calc(100vh - 150px)}
#ubxPlist .pl-srv{display:flex;align-items:center;gap:7px;height:30px;padding:0 10px;font-size:12px;font-weight:700;letter-spacing:.2px;white-space:nowrap}
#ubxPlist .pl-srv b{font-weight:800}
#ubxPlist .pl-dot{flex:none;width:8px;height:8px;border-radius:50%;background:#9aa1ab}
#ubxPlist .pl-dot.on{background:#38d26c;box-shadow:0 0 6px rgba(56,210,108,.75)}
#ubxPlist .pl-dot.wait{background:#ffb020;box-shadow:0 0 6px rgba(255,176,32,.65)}
#ubxPlist .pl-key{margin-left:auto;font-size:9.5px;font-weight:800;letter-spacing:.4px;padding:1px 5px;border-radius:4px;
 border:1px solid rgba(255,255,255,.32);color:rgba(255,255,255,.62)}
#ubxPlist .pl-head,#ubxPlist .pl-row{display:grid;grid-template-columns:minmax(0,1fr) 38px 74px;column-gap:6px;align-items:center;padding:0 10px}
#ubxPlist .pl-head{height:22px;font-size:10px;font-weight:800;letter-spacing:.7px;text-transform:uppercase;color:rgba(255,255,255,.6);
 background:rgba(0,0,0,.18);border-top:1px solid rgba(255,255,255,.08);border-bottom:1px solid rgba(255,255,255,.08)}
#ubxPlist .pl-row{height:28px;font-size:13px;font-weight:600}
#ubxPlist .pl-row+.pl-row{border-top:1px solid rgba(255,255,255,.06)}
#ubxPlist .pl-row.me{background:rgba(255,255,255,.15);box-shadow:inset 3px 0 0 #4aa3ff;font-weight:800}
#ubxPlist .pl-n{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-shadow:0 1px 2px rgba(0,0,0,.45)}
#ubxPlist .r{text-align:right}
#ubxPlist .pl-f{text-align:right;font-weight:700;font-variant-numeric:tabular-nums}
#ubxPlist .pl-b{text-align:right;font-size:11px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 1px 2px rgba(0,0,0,.6)}
#ubxPlist .pl-b.none{color:rgba(255,255,255,.38);text-shadow:none}
`;
document.head.appendChild(css);

const box=document.createElement('div');box.id='ubxPlist';
box.innerHTML='<div class="pl-box"></div>';
document.body.appendChild(box);
const inner=box.firstChild;

/* ---------- state ---------- */
let shown=true;
try{shown=localStorage.getItem(LS_KEY)!=='0';}catch(e){}
const mine={fish:0,best:-1};
const stats={}; // peer id -> {fish,best,t,seen}
let lastHtml='';

function rarityOf(f){
 const F=g('FISH');if(!f||!F)return -1;const i=f.i;
 if(typeof i!=='number'||!F[i])return -1;
 const r=typeof window.rarOf==='function'?window.rarOf(f):F[i][1];
 return typeof r==='number'&&r>=0?r:-1;
}

/* your own catches */
FUX.add('onCatch',(f,info)=>{
 mine.fish++;
 let r=info&&typeof info.rarity==='number'?info.rarity:rarityOf(f);
 if(r>mine.best)mine.best=r;
 render();
});

/* other players' catches: wrap the global onMsg (call through, keep its behavior) */
const counted=new WeakSet(); // never mark the message object itself: the host forwards it to the other players
function countRemote(m){
 if(!m||typeof m!=='object'||m.t!=='catch'||m.f==null||counted.has(m))return;
 counted.add(m);
 const d=m.d||{};const r=rarityOf(d.f);if(r<0)return;
 const id=String(m.f);
 const s=stats[id]||(stats[id]={fish:0,best:-1,t:performance.now(),seen:0});
 s.fish++;if(r>s.best)s.best=r;s.t=performance.now();
}
function hookMsg(){
 const orig=window.onMsg;
 if(typeof orig!=='function'||orig.__ubxPlist)return;
 const w=function(m){
  try{countRemote(m);}catch(e){}
  return orig.apply(this,arguments);
 };
 w.__ubxPlist=1;
 window.onMsg=w;
}
hookMsg();
FUX.add('onStart',()=>{hookMsg();render();});

/* ---------- render ---------- */
function myName(){
 const S=g('S');let n=S&&S.name;
 if(!n){try{n=(JSON.parse(localStorage.getItem('unbloxed_av')||'{}')||{}).name;}catch(e){}}
 return String(n||'You').slice(0,20);
}
function bestCell(r){
 const RAR=g('RAR'),RCOL=g('RCOL');
 if(r<0||!RAR||!RAR[r])return '<span class="pl-b none">—</span>';
 return '<span class="pl-b" style="color:'+escH(RCOL&&RCOL[r]||'#fff')+'">'+escH(RAR[r])+'</span>';
}
function serverInfo(count){
 const N=g('NET'),R=g('remotes')||{};const cap=g('CAP')||CAP_DEF;
 let cls='',txt='Solo';
 if(N&&N.id&&(N.host||(N.hostConn&&N.hostConn.open!==false)||Object.keys(R).length)){cls='on';txt='Server <b>'+((N.lobby|0)||1)+'</b> · '+count+'/'+cap;}
 else if(N&&N.peer){
  const lab=(document.getElementById('net')||{}).textContent||'';
  if(!/offline|solo|full/i.test(lab)){cls='wait';txt='Joining server…';}
 }
 return '<div class="pl-srv"><span class="pl-dot '+cls+'"></span><span>'+txt+'</span><span class="pl-key">TAB</span></div>';
}
function render(){
 try{
  if(!g('started')){box.style.display='none';box.classList.remove('show');return;} // title / boot screen
  if(box.style.display!=='block'){box.style.display='block';void box.offsetWidth;}
  if(!shown){box.classList.remove('show');return;} // fades + slides out
  const R=g('remotes')||{},now=performance.now();
  const rows=[];
  for(const id in R){
   const r=R[id];if(!r)continue;
   const s=stats[id]||(stats[id]={fish:0,best:-1,t:now,seen:0});s.seen=1;
   rows.push({name:String(r.name||'Angler').slice(0,20),fish:s.fish,best:s.best});
  }
  for(const id in stats)if(!R[id]&&(stats[id].seen||now-stats[id].t>60000))delete stats[id]; // left the lobby
  rows.sort((a,b)=>b.fish-a.fish||b.best-a.best||a.name.localeCompare(b.name));
  rows.unshift({name:myName(),fish:mine.fish,best:mine.best,me:1});
  let h=serverInfo(rows.length)+'<div class="pl-head"><span>Player</span><span class="r">Fish</span><span class="r">Best</span></div>';
  for(const p of rows)h+='<div class="pl-row'+(p.me?' me':'')+'"><span class="pl-n">'+escH(p.name)+'</span><span class="pl-f">'+p.fish+'</span>'+bestCell(p.best)+'</div>';
  if(h!==lastHtml){inner.innerHTML=h;lastHtml=h;}
  if(!box.classList.contains('show')){void box.offsetWidth;box.classList.add('show');}
 }catch(e){if(!render._w){render._w=1;console.warn('[players.js] render',e);}}
}
setInterval(render,500);

/* ---------- Tab toggles the list ---------- */
addEventListener('keydown',e=>{
 try{
  if(e.key!=='Tab'||e.ctrlKey||e.altKey||e.metaKey||!g('started'))return;
  const a=document.activeElement,tg=a&&a.tagName;
  if(tg==='INPUT'||tg==='TEXTAREA'||tg==='SELECT'||(a&&a.isContentEditable))return;
  e.preventDefault();
  if(e.repeat)return;
  shown=!shown;
  try{localStorage.setItem(LS_KEY,shown?'1':'0');}catch(err){}
  render();
 }catch(err){}
},true);

window.ubxPlayers={toggle(v){shown=v==null?!shown:!!v;try{localStorage.setItem(LS_KEY,shown?'1':'0');}catch(e){}render();},stats,mine,render};
render();

}catch(e){console.warn('[players.js] failed to start',e);}
})();
