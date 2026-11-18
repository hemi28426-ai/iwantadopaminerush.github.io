/* Fishing Unblocked, Unbloxed mode (?ubx=1): Roblox-style in-game chrome, our own look and icons.
   - Top-left row: menu button (left 12) and chat button (left 56). The chat button only shows once chat.js gives FUX.toggleChat.
   - Esc or the menu button opens the game menu: Resume (Esc), Reset Character (R), Leave Game (L, asks first).
     Esc with one of the game's windows open is left to the game (its own Esc closes the window).
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
safe(()=>{if(![...document.querySelectorAll('link[href*="fonts.googleapis.com/css2"]')].some(l=>/family=Montserrat/.test(l.href))){
 const l=document.createElement('link');l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800&display=swap';document.head.appendChild(l);}});
const css=`
html.ubx #hud{top:244px}
#uxmTop{position:fixed;left:0;top:0;width:0;height:0;z-index:9001}
.uxmIco{position:fixed;top:8px;width:36px;height:36px;padding:0;margin:0;border:0;border-radius:10px;background:rgba(18,19,23,.62);display:none;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.18);transition:background .12s,transform .08s;outline:none;-webkit-tap-highlight-color:transparent}
.uxmIco.show{display:flex}
.uxmIco:hover{background:rgba(34,36,42,.8)}
.uxmIco:active{transform:scale(.92)}
.uxmIco svg{width:22px;height:22px;display:block;fill:none;stroke:#fff;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;pointer-events:none}
.uxmIco.on{background:rgba(255,255,255,.94)}
.uxmIco.on svg{stroke:#17191d}
#uxmMenuBtn{left:12px}
#uxmChatBtn{left:56px}
#uxmOv{position:fixed;inset:0;z-index:9000;display:none;align-items:center;justify-content:center;background:rgba(8,10,14,.55);font-family:Montserrat,Arial,sans-serif;color:#fff;user-select:none;-webkit-user-select:none}
#uxmOv.show{display:flex;animation:uxmFade .14s ease-out}
#uxmPanel{box-sizing:border-box;width:min(400px,calc(100vw - 32px));padding:22px 22px 20px;border-radius:16px;background:rgba(24,26,31,.96);box-shadow:0 18px 50px rgba(0,0,0,.45);animation:uxmPop .18s cubic-bezier(.2,.9,.3,1.15)}
.uxmSub{font-size:12px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;opacity:.5;margin:0 0 4px}
.uxmTitle{font-size:24px;font-weight:800;margin:0 0 16px;letter-spacing:.2px;line-height:1.2}
.uxmText{font-size:14px;font-weight:600;opacity:.65;margin:0 0 18px}
.uxmBtn{box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;width:100%;height:54px;margin:0 0 10px;padding:0 14px 0 20px;border:0;border-radius:12px;background:#383b42;color:#fff;font:700 18px Montserrat,Arial,sans-serif;text-transform:none;letter-spacing:0;cursor:pointer;transition:background .12s,transform .08s;outline:none}
.uxmBtn:last-child{margin-bottom:0}
.uxmBtn:hover{background:#464a52}
.uxmBtn:active{transform:scale(.985)}
.uxmBtn.pri{background:#fff;color:#17191d}
.uxmBtn.pri:hover{background:#e3e5e9}
.uxmKey{box-sizing:border-box;min-width:30px;height:26px;padding:0 7px;border-radius:7px;border:1.5px solid currentColor;display:flex;align-items:center;justify-content:center;font:800 12px Montserrat,Arial,sans-serif;opacity:.5}
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
 [mb,cb,ov].forEach(el=>el.addEventListener('mousedown',noFocus));
 // clicks on the menu never reach the game
 ['mousedown','mouseup','click','pointerdown','pointerup','wheel','contextmenu','touchstart'].forEach(ev=>ov.addEventListener(ev,e=>e.stopPropagation()));
 mb.addEventListener('click',e=>{e.stopPropagation();toggle();});
 cb.addEventListener('click',e=>{e.stopPropagation();
  if(typeof FUX.toggleChat==='function'){const r=safe(()=>FUX.toggleChat());if(typeof r==='boolean')cb.classList.toggle('on',r);}
  else cb.classList.remove('show');});
 panel.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-a]');if(b)act(b.dataset.a);});
});

function renderMain(){stepName='main';if(!panel)return;
 panel.innerHTML=`<div class="uxmSub">Fishing Unblocked</div><div class="uxmTitle">Game Menu</div>`+
  `<button class="uxmBtn pri" type="button" tabindex="-1" data-a="resume">Resume<span class="uxmKey">Esc</span></button>`+
  `<button class="uxmBtn" type="button" tabindex="-1" data-a="reset">Reset Character<span class="uxmKey">R</span></button>`+
  `<button class="uxmBtn" type="button" tabindex="-1" data-a="leave">Leave Game<span class="uxmKey">L</span></button>`;}
function renderLeave(){stepName='leave';if(!panel)return;
 panel.innerHTML=`<div class="uxmTitle" style="margin-bottom:6px">Leave the game?</div><div class="uxmText">You'll go back to Unbloxed.</div>`+
  `<button class="uxmBtn pri" type="button" tabindex="-1" data-a="leaveYes">Leave<span class="uxmKey">Enter</span></button>`+
  `<button class="uxmBtn" type="button" tabindex="-1" data-a="leaveNo">Stay<span class="uxmKey">Esc</span></button>`;}
function act(a){
 if(a==='resume')close();
 else if(a==='reset')resetChar();
 else if(a==='leave')renderLeave();
 else if(a==='leaveNo')renderMain();
 else if(a==='leaveYes')leave();}

/* ---------- open / close ---------- */
function open(){if(isOpen||!ov||!isStarted())return;isOpen=true;renderMain();ov.classList.add('show');mb.classList.add('on');
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
 try{if(typeof anyWin==='function')return !!anyWin();}catch(e){}
 return [...document.querySelectorAll('.win')].some(w=>w.style.display==='block');}
addEventListener('keydown',e=>{safe(()=>{
 if(isOpen){
  e.stopImmediatePropagation();
  const k=e.key||'',kl=k.toLowerCase();
  if(k==='Escape'){e.preventDefault();if(e.repeat)return;if(stepName==='leave')renderMain();else close();return;}
  if(k==='Enter'||k===' '||k==='Tab')e.preventDefault();
  if(e.repeat)return;
  if(stepName==='main'){if(kl==='r'){e.preventDefault();resetChar();}else if(kl==='l'){e.preventDefault();renderLeave();}}
  else if(stepName==='leave'&&k==='Enter')leave();
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
FUX.add('onStart',()=>{sync();fixLinks();fitFeed();});
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
