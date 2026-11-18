// Fishing Unblocked, Unbloxed mode (fishing-unblocked.html?ubx=1): catches earn Unbloxed Bux.
// Bux live in localStorage 'unbloxed_av'.bux and are written exactly like trench-war.html's ubxBux() / unbloxed.html's addBux():
// read the saved avatar, add to .bux, write the whole object back. The hub keeps Bux only in this browser (no cloud copy).
// No Unbloxed avatar saved in this browser → no Bux and no counter.
// Shows a Bux counter at the top right (the hub's header Bux look: our own Bux icon + amount, Montserrat) and a "+N Bux" toast
// for every award that slides out leftwards from under the counter; several stack leftwards in the same top row (y 8-44),
// so they never cover the player list below the counter.
// Also offers window.UBXBUX = {get(), add(n, reason, color), refresh()} and fires a window 'ubxbux' event {detail:{bux, add, reasons}}.
(function(){'use strict';
if(!window.FUX||!FUX.on)return;
try{
const KEY='unbloxed_av';
const PAY=[1,2,3,5,10,20,40,75,150,150]; // by rarity: Common, Uncommon, Rare, Epic, Legendary, Mythic, Divine, Secret, then the two giants (ABYSSAL, DUKE)
const STREAK={5:5,10:10,25:25,50:50,100:100}; // catch-streak milestones
const PERFECT=2;
const C_PERFECT='#9fe7ff',C_STREAK='#ff9a2a';
const FONT='Montserrat,"Helvetica Neue",Helvetica,Arial,sans-serif';

function read(){try{const a=JSON.parse(localStorage.getItem(KEY)||'null');return a&&typeof a==='object'&&!Array.isArray(a)?a:null}catch(e){return null}}
function save(n){try{const a=read();if(!a)return null;a.bux=(a.bux|0)+n;localStorage.setItem(KEY,JSON.stringify(a));return a.bux}catch(e){return null}}
const esc=s=>String(s).replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
// the hub's own Bux icon (unbloxed.html ICO.bux)
const ICON=s=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><rect x="9" y="9" width="6" height="6" rx="1.2" fill="currentColor" stroke="none"/></svg>`;

// Montserrat (once, if no other plug-in added it yet)
if(![...document.querySelectorAll('link[href*="fonts.googleapis"]')].some(l=>/Montserrat/.test(l.href))){
 const l=document.createElement('link');l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800&display=swap';document.head.appendChild(l)}

const css=document.createElement('style');css.id='ubxBuxCss';
css.textContent=`
#ubxBuxBar{position:fixed;top:8px;right:12px;height:36px;z-index:30;display:none;flex-direction:row-reverse;align-items:center;pointer-events:none}
#ubxBuxBar.on{display:flex}
#ubxBux{position:relative;z-index:2;flex:none;height:36px;display:flex;align-items:center;gap:5px;padding:0 12px 0 8px;border-radius:10px;
 background:rgba(247,247,248,.95);color:#202227;font:600 16px/1 ${FONT};font-variant-numeric:tabular-nums;white-space:nowrap;
 box-shadow:0 2px 10px rgba(0,0,0,.22);cursor:default;pointer-events:auto;user-select:none;-webkit-user-select:none}
#ubxBux svg{flex:none;display:block}
#ubxBux.bump{animation:ubxBuxBump .4s ease}
#ubxBux.bump span{animation:ubxBuxFlash .9s ease}
@keyframes ubxBuxBump{0%{transform:scale(1)}30%{transform:scale(1.12)}100%{transform:scale(1)}}
@keyframes ubxBuxFlash{0%,45%{color:#0a9a4b}100%{color:#202227}}
#ubxBuxBar .t{position:relative;z-index:1;flex:none;width:0;height:30px;margin-right:0;overflow:hidden;border-radius:8px;
 background:rgba(39,41,48,.92);box-shadow:0 2px 8px rgba(0,0,0,.28)}
#ubxBuxBar .t .c{display:flex;align-items:center;gap:6px;width:max-content;height:30px;padding:0 11px 0 8px;color:#fff;font:600 13px/1 ${FONT};white-space:nowrap}
#ubxBuxBar .t svg{flex:none;display:block}
#ubxBuxBar .t b{font-weight:800}
#ubxBuxBar .t i{font-style:normal;font-weight:700;margin-left:2px}
#ubxBuxBar .t.in{animation:ubxBuxIn .42s cubic-bezier(.2,.85,.25,1) forwards}
#ubxBuxBar .t.out{animation:ubxBuxOut .5s ease forwards}
@keyframes ubxBuxIn{from{width:0;margin-right:0;opacity:.5}to{width:var(--w);margin-right:6px;opacity:1}}
@keyframes ubxBuxOut{from{width:var(--w);margin-right:6px;opacity:1;transform:none}to{width:var(--w);margin-right:6px;opacity:0;transform:translateY(-6px)}}
`;
document.head.appendChild(css);

// one fixed row at the top right: the counter, then the toasts to its left (row-reverse), so they never cover the player list below
const bar=document.createElement('div');bar.id='ubxBuxBar';
const el=document.createElement('div');el.id='ubxBux';el.title='Unbloxed Bux: every catch earns Bux';
el.innerHTML=ICON(24)+'<span></span>';
const num=el.lastChild;
bar.appendChild(el);document.body.appendChild(bar);

let pending=0; // Bux already saved whose toast hasn't popped yet (the counter goes up as each toast shows)
function render(bump){
 const a=read();
 if(!a){bar.classList.remove('on');return}
 bar.classList.add('on');
 num.textContent=Math.max(0,(a.bux|0)-pending).toLocaleString();
 if(bump){el.classList.remove('bump');void el.offsetWidth;el.classList.add('bump')}}

let nextAt=0;
function toast(n,reason,col){
 pending+=n;
 const now=Date.now(),at=Math.max(now,nextAt);nextAt=at+220; // one after another
 setTimeout(()=>{try{pop(n,reason,col)}catch(e){pending=Math.max(0,pending-n)}},at-now)}
// a toast slides out leftwards from under the counter (its box widens from the counter's edge) and pushes the older ones left
function pop(n,reason,col){
 pending=Math.max(0,pending-n);render(true);
 const t=document.createElement('div');t.className='t';
 t.innerHTML='<div class="c">'+ICON(16)+'<b>+'+(n|0).toLocaleString()+' Bux</b>'+(reason?'<i style="color:'+esc(col||'#fff')+'">'+esc(reason)+'</i>':'')+'</div>';
 el.after(t);
 t.style.setProperty('--w',t.firstChild.offsetWidth+'px');t.classList.add('in');
 const cap=Math.max(1,Math.min(4,Math.floor((innerWidth-220)/215))); // the row stays clear of the menu/chat buttons at the top left
 [...bar.querySelectorAll('.t')].slice(cap).forEach(x=>x.remove());
 setTimeout(()=>{t.classList.add('out');setTimeout(()=>t.remove(),520)},2600)}

// award: save first (all or nothing), then show the toasts; returns the new balance or null (no avatar)
function award(items){
 const total=items.reduce((s,x)=>s+(x[0]|0),0);if(total<=0)return null;
 const bux=save(total);if(bux===null){render(false);return null}
 for(const x of items)toast(x[0]|0,x[1],x[2]);
 try{dispatchEvent(new CustomEvent('ubxbux',{detail:{bux,add:total,reasons:items.map(x=>x[1])}}))}catch(e){}
 return bux}

const seen=new WeakSet(); // a fish pays once, even if the hook were called twice
FUX.add('onCatch',function(f,info){
 if(!f||typeof f!=='object'||seen.has(f))return;seen.add(f);
 if(!read())return;
 info=info||{};
 let r=info.rarity;if(typeof r!=='number')r=typeof rarOf==='function'?rarOf(f):0;r=Math.max(0,Math.min(PAY.length-1,r|0));
 const big=!!info.big||r>=8,col=(typeof RCOL!=='undefined'&&RCOL[r])||'#fff';
 const name=typeof FISH!=='undefined'&&FISH[f.i]&&FISH[f.i][0];
 const items=[[big?150:PAY[r],big?(name?name+'!':'Giant catch!'):((typeof RAR!=='undefined'&&RAR[r])||'Fish')+' catch',col]];
 if(info.perfect)items.push([PERFECT,'Perfect catch',C_PERFECT]);
 const s=info.streak|0;if(STREAK[s])items.push([STREAK[s],s+' catch streak!',C_STREAK]);
 award(items)});
FUX.add('onStart',()=>render(false));

addEventListener('storage',e=>{if(e.key===KEY||e.key===null)render(false)});
addEventListener('focus',()=>render(false));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)render(false)});
render(false);

// fail-safe if the players plug-in is missing: keep the game's #net label from hiding under the counter
setInterval(()=>{try{const n=document.getElementById('net');if(!n||!bar.classList.contains('on'))return;const cs=getComputedStyle(n);
 if(cs.display==='none'||cs.visibility==='hidden'||cs.position!=='fixed')return;
 const a=n.getBoundingClientRect(),b=el.getBoundingClientRect();
 if(a.right>b.left-6&&a.left<b.right&&a.top<b.bottom&&a.bottom>b.top)n.style.right=Math.round(innerWidth-b.left+8)+'px'}catch(e){}},1000);

window.UBXBUX={get(){const a=read();return a?(a.bux|0):null},add(n,reason,col){n=n|0;return n>0?award([[n,reason||'',col||'#fff']]):null},refresh(){render(false)}};
}catch(e){console.warn('[ubx bux]',e)}
})();
