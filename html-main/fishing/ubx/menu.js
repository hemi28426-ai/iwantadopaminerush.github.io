/* Fishing Unblocked, Unbloxed mode (?ubx=1): Roblox-style in-game chrome, our own look and icons.
   - Top-left row: menu button (left 12) and chat button (left 56). The chat button only shows once chat.js gives FUX.toggleChat.
   - Esc or the menu button opens the game menu: tabs Game (Resume, Reset Character, Leave Game: both ask first when it matters), Settings (sound, camera, chat, player list)
     and Controls,
     and Graphics Quality: Fast (Chromebook, the default) or Pretty (more detail). The title menu with the game's own
     Graphics select is hidden in Unbloxed mode, so this is where it lives: same key (localStorage 'fishunb-gfx'),
     progress saved first, then the game reloads.
     Esc with one of the game's windows or an NPC dialog open is left to the game (its own Esc closes it).
     While the menu is open, game input is blocked.
   - Moves the fishing #hud down under the chat window and keeps the chat feed from running into it.
   - Links back to the old games page go to unbloxed.html.
   Hooks used: onStart, tick. Adds FUX.menu = {open, close, toggle, isOpen, reset} and calls FUX 'menuOpen' / 'menuClose' / 'onReset'.
   No game globals are wrapped. */
(function(){'use strict';
if(!window.FUX||!FUX.on)return;
let warned=0;
const safe=(fn)=>{try{return fn();}catch(e){if(warned++<5)console.warn('[ubx menu]',e);}};
const $id=id=>document.getElementById(id);
const isStarted=()=>{try{return !!started;}catch(e){return false;}};

/* ---------- spawn: the game starts you at me.pos's first value, (POND_R+2, 0, 6), facing ry 0 ---------- */
let SPAWN=null,SPAWN_RY=0;
safe(()=>{SPAWN=isStarted()?new THREE.Vector3(POND_R+2,0,6):me.pos.clone();SPAWN_RY=isStarted()?0:(me.ry||0);});
if(!SPAWN||!isFinite(SPAWN.x)||!isFinite(SPAWN.z))safe(()=>{SPAWN=new THREE.Vector3(32,0,6);});

/* ---------- font + styles ---------- */
safe(()=>{if(false&&![...document.querySelectorAll('link[href*="fonts.googleapis.com/css2"]')].some(l=>/family=Montserrat/.test(l.href))){
 const l=document.createElement('link');l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800&display=swap';document.head.appendChild(l);}});
const css=`
html.ubx #hud{top:244px}
#uxmTop{position:fixed;left:0;top:0;width:0;height:0;z-index:9101}
.uxmIco{position:fixed;top:8px;width:36px;height:36px;padding:0;margin:0;border:0;border-radius:10px;background:rgba(18,19,23,.62);display:none;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.18);transition:background .12s,transform .08s;outline:none;-webkit-tap-highlight-color:transparent}
.uxmIco.show{display:flex}
.uxmIco:hover{background:rgba(34,36,42,.8)}
.uxmIco:active{transform:scale(.92)}
.uxmIco svg{width:22px;height:22px;display:block;fill:none;stroke:#fff;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;pointer-events:none}
.uxmIco.on{background:rgba(255,255,255,.94)}
.uxmIco.on svg{stroke:#17191d}
#uxmMenuBtn{left:12px}
#uxmChatBtn{left:56px}
#uxmOv{position:fixed;inset:0;z-index:9100;display:none;align-items:flex-start;justify-content:center;background:rgba(8,10,14,.55);font-family:"Source Sans Pro","Segoe UI",Arial,sans-serif;color:#fff;user-select:none;-webkit-user-select:none}
#uxmOv.show{display:flex;animation:uxmFade .14s ease-out}
#uxmPanel{box-sizing:border-box;margin-top:max(16px,calc(50vh - 250px));width:min(640px,calc(100vw - 32px));padding:22px 22px 20px;border-radius:16px;background:rgba(24,26,31,.96);box-shadow:0 18px 50px rgba(0,0,0,.45);animation:uxmPop .18s cubic-bezier(.2,.9,.3,1.15)}
.uxmSub{font-size:12px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;opacity:.5;margin:0 0 4px}
.uxmTitle{font-size:24px;font-weight:800;margin:0 0 16px;letter-spacing:.2px;line-height:1.2}
.uxmText{font-size:14px;font-weight:600;opacity:.65;margin:0 0 18px}
.uxmBtn{box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;width:100%;height:54px;margin:0 0 10px;padding:0 14px 0 20px;border:0;border-radius:12px;background:#383b42;color:#fff;font:700 18px "Source Sans Pro","Segoe UI",Arial,sans-serif;text-transform:none;letter-spacing:0;cursor:pointer;transition:background .12s,transform .08s;outline:none}
.uxmBtn:last-child{margin-bottom:0}
.uxmBtn:hover{background:#464a52}
.uxmBtn:active{transform:scale(.985)}
.uxmBtn.pri{background:#fff;color:#17191d}
.uxmBtn.pri:hover{background:#e3e5e9}
.uxmBtn.bad{background:transparent;box-shadow:inset 0 0 0 1.5px rgba(255,98,88,.65);color:#ff8a80}
.uxmBtn.bad:hover{background:rgba(255,98,88,.12)}
.uxmBtn.bad.fill{background:#e5483d;color:#fff;box-shadow:none}
.uxmBtn.bad.fill:hover{background:#f05a4f}
.uxmBtn small{font-size:13px;font-weight:600;opacity:.55}
.uxmTabs{display:flex;gap:4px;margin:0 0 16px;padding:4px;border-radius:12px;background:#2c2f35}
.uxmTab{flex:1 1 0;height:34px;border:0;border-radius:9px;background:transparent;color:rgba(255,255,255,.7);font:700 15px "Source Sans Pro","Segoe UI",Arial,sans-serif;cursor:pointer;outline:none}
.uxmTab:hover{color:#fff;background:#3a3d44}
.uxmTab.on{background:#fff;color:#17191d}
.uxmRow{display:flex;align-items:center;gap:12px;min-height:40px;margin:0 0 6px}
.uxmRow .nm{flex:0 0 150px;font-size:15px;font-weight:700}
.uxmRow .val{flex:0 0 44px;text-align:right;font-size:14px;font-weight:700;opacity:.7;font-variant-numeric:tabular-nums}
.uxmRow input[type=range]{flex:1 1 auto;min-width:0;height:22px;margin:0;-webkit-appearance:none;appearance:none;background:transparent;cursor:pointer;outline:none}
.uxmRow input[type=range]::-webkit-slider-runnable-track{height:6px;border-radius:3px;background:linear-gradient(90deg,#2bc4a9 var(--p,50%),#3a3d44 var(--p,50%))}
.uxmRow input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;margin-top:-6px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.4)}
.uxmRow input[type=range]::-moz-range-track{height:6px;border-radius:3px;background:#3a3d44}
.uxmRow input[type=range]::-moz-range-progress{height:6px;border-radius:3px;background:#2bc4a9}
.uxmRow input[type=range]::-moz-range-thumb{width:18px;height:18px;border:0;border-radius:50%;background:#fff}
.uxmSw{margin-left:auto;position:relative;flex:none;width:44px;height:26px;border:0;border-radius:13px;background:#3a3d44;cursor:pointer;outline:none;transition:background .12s}
.uxmSw::after{content:"";position:absolute;left:3px;top:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:transform .14s}
.uxmSw.on{background:#2bc4a9}
.uxmSw.on::after{transform:translateX(18px)}
.uxmWarn{display:flex;align-items:center;gap:10px;margin:10px 0 0;padding:10px 12px;border-radius:10px;background:rgba(255,176,32,.12);color:#ffd27a;font-size:14px;font-weight:600}
.uxmWarn span{flex:1}
.uxmMini{height:32px;padding:0 12px;border:0;border-radius:8px;background:#fff;color:#17191d;font:700 14px "Source Sans Pro","Segoe UI",Arial,sans-serif;cursor:pointer}
.uxmMini.g{background:transparent;color:#ffd27a}
#uxmPanel{max-height:calc(100vh - 24px);overflow-y:auto}
#uxmPanel.tabbed{min-height:0;height:auto}
.uxmKeyCols{display:grid;grid-template-columns:1fr 1fr;gap:0 28px}
@media (max-width:600px){.uxmKeyCols{grid-template-columns:1fr}}
.uxmKeys{display:grid;grid-template-columns:minmax(86px,max-content) 1fr;gap:6px 12px;align-items:center;align-content:start;font-size:15px;font-weight:600}
.uxmKeys .ks{display:flex;gap:4px;justify-content:flex-start}
.uxmKeys kbd{white-space:nowrap;box-sizing:border-box;min-width:28px;height:26px;padding:0 7px;border-radius:7px;background:#3a3d44;box-shadow:inset 0 -2px 0 rgba(0,0,0,.35);display:inline-flex;align-items:center;justify-content:center;font:800 12.5px "Source Sans Pro","Segoe UI",Arial,sans-serif;color:#fff}
.uxmKeys span.d{opacity:.85}
.uxmKeys .hd{grid-column:1/-1;font-size:12px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;opacity:.5;margin-top:6px}
.uxmKey{box-sizing:border-box;min-width:30px;height:26px;padding:0 7px;border-radius:7px;border:1.5px solid currentColor;display:flex;align-items:center;justify-content:center;font:800 12px "Source Sans Pro","Segoe UI",Arial,sans-serif;opacity:.5}
.uxmSep{height:1px;margin:16px 0 14px;background:rgba(255,255,255,.1)}
.uxmSetHd{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin:0 0 8px}
.uxmSetName{font-size:15px;font-weight:700}
.uxmSetNote{font-size:12px;font-weight:600;opacity:.55;white-space:nowrap}
.uxmSeg{display:flex;gap:4px;padding:4px;border-radius:12px;background:#2c2f35}
.uxmOpt{flex:1 1 0;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;height:50px;margin:0;padding:0 8px;border:0;border-radius:9px;background:transparent;color:#fff;font:700 16px/1.1 "Source Sans Pro","Segoe UI",Arial,sans-serif;cursor:pointer;transition:background .12s,transform .08s;outline:none}
.uxmOpt small{font-size:11.5px;font-weight:600;opacity:.6;white-space:nowrap}
.uxmOpt:hover{background:#3a3d44}
.uxmOpt:active{transform:scale(.97)}
.uxmOpt.on{background:#fff;color:#17191d;cursor:default;transform:none}
.uxmOpt.on small{opacity:.7}
.uxmOpt[disabled]{opacity:.7;cursor:progress}
@keyframes uxmFade{from{opacity:0}to{opacity:1}}
@keyframes uxmPop{from{transform:scale(.94);opacity:0}to{transform:none;opacity:1}}
`;
safe(()=>{const st=document.createElement('style');st.id='uxmStyle';st.textContent=css;document.head.appendChild(st);});

/* ---------- our own line icons ---------- */
const ICON_MENU='<svg viewBox="0 0 24 24"><path d="M4.5 7h15M4.5 12h15M4.5 17h15"/></svg>';
const ICON_CHAT='<svg viewBox="0 0 24 24"><path d="M6.5 4.5h11a3 3 0 0 1 3 3v6.5a3 3 0 0 1-3 3h-6l-4.5 3.5v-3.5h-.5a3 3 0 0 1-3-3V7.5a3 3 0 0 1 3-3z"/></svg>';

let top,mb,cb,ov,panel,isOpen=false,stepName='main';
safe(()=>{
 top=document.createElement('div');top.id='uxmTop';
 top.innerHTML=`<button id="uxmMenuBtn" class="uxmIco" type="button" tabindex="-1" title="Menu (Esc)" aria-label="Menu">${ICON_MENU}</button><button id="uxmChatBtn" class="uxmIco" type="button" tabindex="-1" title="Chat" aria-label="Chat">${ICON_CHAT}</button>`;
 ov=document.createElement('div');ov.id='uxmOv';ov.innerHTML='<div id="uxmPanel" role="dialog" aria-modal="true" aria-label="Game menu"></div>';
 document.body.appendChild(ov);document.body.appendChild(top);
 mb=$id('uxmMenuBtn');cb=$id('uxmChatBtn');panel=$id('uxmPanel');
 // never take keyboard focus (Space/Enter would click them again)
 const noFocus=e=>e.preventDefault();
 [mb,cb].forEach(el=>el.addEventListener('mousedown',noFocus));
 ov.addEventListener('mousedown',e=>{if(!(e.target&&e.target.tagName==='INPUT'))e.preventDefault();});
 ov.addEventListener('input',e=>{const t=e.target;if(t&&t.dataset&&t.dataset.set)setVal(t.dataset.set,+t.value,t);});
 // clicks on the menu never reach the game
 ['mousedown','mouseup','click','pointerdown','pointerup','wheel','contextmenu','touchstart'].forEach(ev=>ov.addEventListener(ev,e=>e.stopPropagation()));
 mb.addEventListener('click',e=>{e.stopPropagation();toggle();});
 cb.addEventListener('click',e=>{e.stopPropagation();
  if(typeof FUX.toggleChat==='function'){const r=safe(()=>FUX.toggleChat());if(typeof r==='boolean')cb.classList.toggle('on',r);}
  else cb.classList.remove('show');});
 panel.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-a]');if(b)act(b.dataset.a);});
});

let tab='game';
const TABS=[['game','Game'],['settings','Settings'],['controls','Controls']];
function tabsHTML(){return '<div class="uxmTabs" role="tablist">'+TABS.map(t=>`<button class="uxmTab${tab===t[0]?' on':''}" type="button" tabindex="-1" role="tab" data-a="tab-${t[0]}">${t[1]}</button>`).join('')+'</div>';}
function renderMain(){stepName='main';if(!panel)return;panel.classList.add('tabbed');
 let h=tabsHTML();
 if(tab==='game')h+=`<button class="uxmBtn pri" type="button" tabindex="-1" data-a="resume">Resume<span class="uxmKey">Esc</span></button>`+
  `<button class="uxmBtn" type="button" tabindex="-1" data-a="reset">Reset Character<small>Back to the start</small></button>`+
  `<button class="uxmBtn bad" type="button" tabindex="-1" data-a="leave">Leave Game<small>Saves first</small></button>`;
 else if(tab==='settings')h+=setHTML();
 else h+=keysHTML();
 panel.innerHTML=h;}
/* ---------- settings: sound volume, camera sensitivity, chat and player list (saved in localStorage 'fishunb-set') ---------- */
const SET_KEY='fishunb-set';
const SET={vol:70,sens:100,chat:true,plist:true};
safe(()=>{const o=JSON.parse(localStorage.getItem(SET_KEY)||'{}')||{};for(const k in SET)if(typeof o[k]===typeof SET[k])SET[k]=o[k];});
function saveSet(){try{localStorage.setItem(SET_KEY,JSON.stringify(SET));}catch(e){}}
// every game sound goes AudioContext -> destination; route those through one master gain we control
const MG=new WeakMap();
safe(()=>{const AN=window.AudioNode;if(!AN||AN.prototype.connect.__uxm)return;const orig=AN.prototype.connect;
 const w=function(d){try{if(window.AudioDestinationNode&&d instanceof AudioDestinationNode){let m=MG.get(d.context);
  if(!m){m=d.context.createGain();m.gain.value=SET.vol/100;orig.call(m,d);MG.set(d.context,m);(window.__uxmCtx=window.__uxmCtx||[]).push(d.context);}
  if(this!==m){const a=[...arguments];a[0]=m;return orig.apply(this,a);}}}catch(e){}return orig.apply(this,arguments);};
 w.__uxm=1;AN.prototype.connect=w;});
function applySet(k){
 if(k==='chat'){safe(()=>{if(typeof FUX.toggleChat==='function'){const r=FUX.toggleChat(SET.chat);if(cb&&typeof r==='boolean')cb.classList.toggle('on',r);}});return;}
 if(k==='plist'){safe(()=>{if(window.ubxPlayers)ubxPlayers.toggle(SET.plist);});return;}
 safe(()=>(window.__uxmCtx||[]).forEach(c=>{const m=MG.get(c);if(m)m.gain.value=SET.vol/100;}));
 safe(()=>{if(window.UBXMOVE)UBXMOVE.CAM_SENS=.003*SET.sens/100;});
}
function setVal(k,v,el){if(k==='sensP'){const p=v;v=pToSens(p);k='sens';SET.sens=v;saveSet();applySet('sens');if(el){el.style.setProperty('--p',p+'%');const o=el.parentNode.querySelector('.val');if(o)o.textContent=v+'%';}return;}SET[k]=v;saveSet();applySet(k);if(el){el.style.setProperty('--p',((v-el.min)/(el.max-el.min)*100)+'%');const o=el.parentNode.querySelector('.val');if(o)o.textContent=v+'%';}}
function slider(k,name,min,max,step){const v=SET[k];return `<div class="uxmRow"><span class="nm">${name}</span><input type="range" tabindex="-1" min="${min}" max="${max}" step="${step}" value="${v}" data-set="${k}" style="--p:${(v-min)/(max-min)*100}%" aria-label="${name}"><span class="val">${v}%</span></div>`;}
function sensSlider(){const p=sensToP(SET.sens);return `<div class="uxmRow"><span class="nm">Camera sensitivity</span><input type="range" tabindex="-1" min="0" max="100" step="1" value="${p}" data-set="sensP" style="--p:${p}%" aria-label="Camera sensitivity"><span class="val">${SET.sens}%</span></div>`;}
function sw(k,name){return `<div class="uxmRow"><span class="nm">${name}</span><button class="uxmSw${SET[k]?' on':''}" type="button" tabindex="-1" role="switch" aria-checked="${!!SET[k]}" data-a="sw-${k}" aria-label="${name}"></button></div>`;}
function sensToP(v){return v<=100?(v-25)/75*50:50+(v-100)/100*50;}
function pToSens(p){return Math.round((p<=50?25+p/50*75:100+(p-50)/50*100)/5)*5;}
function setHTML(){safe(()=>{if(FUX.chatShown)SET.chat=!!FUX.chatShown();});safe(()=>{if(window.ubxPlayers&&ubxPlayers.shown)SET.plist=!!ubxPlayers.shown();});
 return slider('vol','Sound volume',0,100,5)+sensSlider()+sw('chat','Show chat')+sw('plist','Show player list')+gfxHTML();}
function keysHTML(){const r=(ks,d)=>`<span class="ks">${ks.map(k=>`<kbd>${k}</kbd>`).join('')}</span><span class="d">${d}</span>`;
 return '<div class="uxmKeyCols"><div class="uxmKeys">'+
  '<div class="hd">Move</div>'+r(['W A S D'],'Walk')+r(['Shift'],'Run')+r(['Space'],'Jump (on foot)')+r(['R-drag'],'Turn the camera')+r(['Wheel'],'Zoom')+
  '<div class="hd">Fish</div>'+r(['Hold click'],'Charge and cast')+r(['Click'],'Reel in')+r(['Space'],'Cast and reel (boat)')+r(['B'],'Launch or leave the boat')+'</div><div class="uxmKeys">'+
  '<div class="hd">Windows</div>'+r(['E'],'Talk, shop')+r(['I'],'Bag')+r(['K'],'Fish Book')+r(['R'],'Rods')+r(['M'],'Map')+r(['T'],'Trade with a nearby player')+
  r(['Enter','/'],'Chat')+r(['Tab'],'Player list')+r(['Esc'],'Close window / menu')+'</div></div>';}
/* ---------- Graphics Quality: the title menu's Graphics select (#gfxSel) is hidden in Unbloxed mode ---------- */
const GFX_KEY='fishunb-gfx'; // the game reads it at load: 'high' = Pretty (also denser islands and fish, FW.HQ), else Fast
function gfxNow(){try{if(typeof GFX!=='undefined')return GFX==='high'?'high':'low';}catch(e){}
 try{return localStorage.getItem(GFX_KEY)==='high'?'high':'low';}catch(e){return 'low';}}
let gfxBusy=false,gfxPick=null;
function gfxHTML(){const g=gfxNow(),sel=gfxPick||g,opt=(v,n,s)=>`<button class="uxmOpt${sel===v?' on':''}" type="button" tabindex="-1" role="radio" aria-checked="${sel===v}" data-a="gfx-${v}"${gfxBusy?' disabled':''}><b>${n}</b><small>${s}</small></button>`;
 return `<div class="uxmSep"></div><div class="uxmSetHd"><span class="uxmSetName">Graphics quality</span></div>`+
  `<div class="uxmSeg" role="radiogroup" aria-label="Graphics quality">${opt('low','Fast','Chromebook')}${opt('high','Pretty','More detail')}</div>`+
  (gfxBusy?'<div class="uxmWarn"><span>Saving and reloading…</span></div>':gfxPick&&gfxPick!==g?'<div class="uxmWarn"><span>The game saves and reloads to switch.</span><button class="uxmMini g" type="button" tabindex="-1" data-a="gfx-cancel">Cancel</button><button class="uxmMini" type="button" tabindex="-1" data-a="gfx-apply">Reload now</button></div>':'');}
function setGfx(v){v=v==='high'?'high':'low';if(gfxBusy||v===gfxNow())return;gfxBusy=true;renderMain();
 try{localStorage.setItem(GFX_KEY,v);}catch(e){}
 safe(()=>{if(gameLive&&typeof save==='function')save();});                  // progress first (the reload saves again on the way out)
 let u=location.href;safe(()=>{const x=new URL(location.href);if(x.searchParams.has('hq')){x.searchParams.delete('hq');u=x.toString();}}); // a ?hq= in the address would win over the saved choice
 setTimeout(()=>{if(u!==location.href)location.replace(u);else location.reload();},120);}
function renderLeave(){stepName='leave';if(!panel)return;panel.classList.remove('tabbed');
 panel.innerHTML=`<div class="uxmTitle" style="margin-bottom:6px">Leave the game?</div><div class="uxmText">Your progress is saved. You'll go back to Unbloxed.</div>`+
  `<button class="uxmBtn pri" type="button" tabindex="-1" data-a="leaveNo">Stay<span class="uxmKey">Esc</span></button>`+
  `<button class="uxmBtn bad fill" type="button" tabindex="-1" data-a="leaveYes">Leave</button>`;}
function renderReset(){stepName='reset';if(!panel)return;panel.classList.remove('tabbed');
 panel.innerHTML=`<div class="uxmTitle" style="margin-bottom:6px">Reset your character?</div><div class="uxmText">You go back to the start spot. A fish on the line gets away.</div>`+
  `<button class="uxmBtn pri" type="button" tabindex="-1" data-a="leaveNo">Cancel<span class="uxmKey">Esc</span></button>`+
  `<button class="uxmBtn" type="button" tabindex="-1" data-a="resetYes">Reset</button>`;}
function act(a){
 if(a==='resume')close();
 else if(a==='reset'){if(safe(()=>me.state==='reel'||me.state==='bite'))renderReset();else resetChar();}
 else if(a==='resetYes')resetChar();
 else if(a==='leave')renderLeave();
 else if(a.startsWith('tab-')){tab=a.slice(4);renderMain();}
 else if(a.startsWith('sw-')){const k=a.slice(3);setVal(k,!SET[k]);renderMain();}
 else if(a==='gfx-cancel'){gfxPick=null;renderMain();}
 else if(a==='gfx-apply'){if(gfxPick)setGfx(gfxPick);}
 else if(a==='leaveNo')renderMain();
 else if(a==='leaveYes')leave();
 else if(a==='gfx-low'||a==='gfx-high'){gfxPick=a.slice(4)===gfxNow()?null:a.slice(4);renderMain();}}

/* ---------- open / close ---------- */
function open(){if(isOpen||!ov||!isStarted())return;isOpen=true;tab='game';gfxPick=null;renderMain();ov.classList.add('show');mb.classList.add('on');
 safe(()=>{const a=document.activeElement;if(a&&a!==document.body&&a.blur)a.blur();});
 safe(()=>releaseAll());                                                        // stop walking / reeling / camera drag
 safe(()=>{if(charge){charge=null;const m=$id('cmeter');if(m)m.style.display='none';}}); // drop a half-charged cast
 safe(()=>FUX.call('menuOpen'));}
function close(){if(!isOpen)return;isOpen=false;ov.classList.remove('show');mb.classList.remove('on');renderMain();
 safe(()=>releaseAll());safe(()=>FUX.call('menuClose'));}
function toggle(){isOpen?close():open();}

/* ---------- Reset Character: respawn at the start spot, fishing cancelled, out of the boat ---------- */
function resetChar(){close();
 safe(()=>{                                                                    // cancel fishing cleanly
  if(charge)charge=null;
  if((me.state==='bite'||me.state==='reel')&&me.fish&&!(typeof BIGFISH==='function'&&BIGFISH(me.fish.i))&&typeof breakStreak==='function')breakStreak(); // same rule as a fish getting away
  ['cmeter','reel','shakeBtn','bang'].forEach(id=>{const el=$id(id);if(el)el.style.display='none';});
  try{bangT=0;}catch(e){}
  me.state='idle';me.t=0;me.fish=null;
  if(me.av&&me.av.bob)me.av.bob.visible=false;});
 safe(()=>{if(typeof closeWins==='function')closeWins();});
 safe(()=>{if(me.inBoat&&typeof toggleBoat==='function')toggleBoat();});        // the game's own way off the boat
 safe(()=>{if(me.inBoat){me.inBoat=false;if(boat.g){scene.remove(boat.g);boat.g=null;}}boat.v=0;}); // no land near the boat: just drop it
 safe(()=>{
  me.pos.copy(SPAWN);
  me.pos.y=(typeof onDock==='function'&&onDock(me.pos))?.6:Math.max(0,heightAt(me.pos.x,me.pos.z));
  me.ry=SPAWN_RY;if(me.lastP)me.lastP.copy(me.pos);
  if(me.av&&me.av.g){me.av.g.position.copy(me.pos);me.av.g.rotation.y=me.ry;me.av.g.rotation.z=0;}
  camYaw=-Math.PI/2;camPitch=.45;                                              // the start view
  const cp=me.pos.clone().add(new THREE.Vector3(Math.sin(camYaw)*Math.cos(camPitch),Math.sin(camPitch),Math.cos(camYaw)*Math.cos(camPitch)).multiplyScalar(camDist));cp.y+=1.5;
  camera.position.copy(cp);camera.lookAt(me.pos.x,me.pos.y+2,me.pos.z);});
 safe(()=>{if(typeof hint==='function')hint('',0);});
 safe(()=>{if(typeof emit==='function')emit(me.pos.clone().setY(me.pos.y+1.4),34,0xffffff,2.4,2.6);});
 safe(()=>{if(typeof beep==='function')beep(520,.12,'triangle');});
 safe(()=>FUX.call('onReset'));}

/* ---------- Leave Game ---------- */
function leave(){safe(()=>{if(gameLive&&typeof save==='function')save();});location.href='unbloxed.html';}

/* ---------- keys: Esc toggles the menu; while open nothing reaches the game ---------- */
function gameWinOpen(){
 try{if(window.FN&&typeof FN.isOpen==='function'&&FN.isOpen())return true;}catch(e){} // an NPC dialog: its own Esc closes it
 try{if(typeof anyWin==='function')return !!anyWin();}catch(e){}
 return [...document.querySelectorAll('.win')].some(w=>w.style.display==='block');}
addEventListener('keydown',e=>{safe(()=>{
 if(isOpen){
  e.stopImmediatePropagation();
  const k=e.key||'',kl=k.toLowerCase();
  if(k==='Escape'){e.preventDefault();if(e.repeat)return;if(stepName!=='main')renderMain();else close();return;}
  if(k==='Enter'||k===' '||k==='Tab')e.preventDefault();
  return;}
 if(e.key!=='Escape'||!isStarted())return;
 const a=document.activeElement;
 if(a&&(a.tagName==='INPUT'||a.tagName==='TEXTAREA'||a.isContentEditable))return; // a text box closes itself
 if(gameWinOpen())return;                                                        // the game's own Esc closes its window
 if(e.repeat)return;
 e.preventDefault();e.stopImmediatePropagation();open();
})},true);

/* ---------- show the corner buttons once in game; chat button only when chat.js is there ---------- */
function sync(){if(!mb)return;const on=isStarted();
 mb.classList.toggle('show',on);
 cb.classList.toggle('show',on&&typeof FUX.toggleChat==='function');}
FUX.add('onStart',()=>{sync();fixLinks();fitFeed();setTimeout(applySet,600);});
let tk=0;FUX.add('tick',()=>{if(++tk%20===0)sync();});
setInterval(()=>safe(sync),500);

/* ---------- the chat feed (bottom-left) must not grow up into the moved #hud on short screens ---------- */
function fitFeed(){safe(()=>{const fd=$id('feed'),hud=$id('hud');if(!fd||!hud)return;
 const kids=[...fd.children];
 kids.forEach(d=>{if(d.dataset.uxmHid){d.style.display='';delete d.dataset.uxmHid;}});
 const hr=hud.getBoundingClientRect();if(!hr.height||!hr.width)return;
 const lim=hr.bottom+8;
 for(const d of kids){if(d.style.display==='none')continue;const r=d.getBoundingClientRect();
  if(r.width&&r.top<lim&&r.left<hr.right&&r.right>hr.left){d.style.display='none';d.dataset.uxmHid='1';}}});}
safe(()=>{const fd=$id('feed');if(fd&&window.MutationObserver)new MutationObserver(fitFeed).observe(fd,{childList:true});});
addEventListener('resize',fitFeed);setInterval(fitFeed,1000);

/* ---------- links back to the old games page go to Unbloxed ---------- */
function oldGames(href){try{const u=new URL(href,location.href);if(u.origin!==location.origin)return false;
 return /\/(games|index)\.html$/i.test(u.pathname)||u.pathname==='/'||/^\/html-main\/?$/i.test(u.pathname);}catch(e){return false;}}
function fixLinks(){safe(()=>document.querySelectorAll('a[href]').forEach(a=>{if(oldGames(a.href))a.setAttribute('href','unbloxed.html');}));}
document.addEventListener('click',e=>{safe(()=>{const a=e.target&&e.target.closest&&e.target.closest('a[href]');
 if(a&&oldGames(a.href)){e.preventDefault();e.stopPropagation();location.href='unbloxed.html';}});},true);
fixLinks();

FUX.menu={open,close,toggle,isOpen:()=>isOpen,reset:resetChar};
})();
