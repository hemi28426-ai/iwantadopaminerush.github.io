// Fishing Unblocked, Unbloxed mode (?ubx=1): multiplayer extras (the page itself keeps Unbloxed lobbies apart via FUX.prefix).
// - Your 'st' message carries your fishing state (fs) and, every ~2 s or when it changes, your Unbloxed look (av).
// - Remote players get their real Unbloxed look (av.setLook) and a Roblox-style name tag; your own name tag is hidden.
// - "<name> joined the game." / "<name> left the game." system lines (FUX.sys from chat.js, else the game's feed).
// Fails safe: every hook is wrapped by FUX, and the load-time code below catches its own errors.
(function(){
'use strict';
if(!window.FUX||!FUX.on)return;
const STATES={idle:1,cast:1,wait:1,bite:1,reel:1};
const LOOK_EVERY=2000;           // ms between look re-sends
const TAG_Y=2.03;                // tag bottom edge (head top is ~1.86 at the 1.8 m R6 scale)
const FADE0=100,FADE1=140;       // name tags fade out between these camera distances (Roblox hides far names)
const now=()=>performance.now();

/* ---------- looks ---------- */
// list sizes from unbloxed/avatar.js (d when it is missing)
function lim(n,d){try{const L=n==='HATS'?(typeof HATS!=='undefined'?HATS:0):n==='HAIRS'?(typeof HAIRS!=='undefined'?HAIRS:0):(typeof FACES!=='undefined'?FACES:0);
 return L&&L.length?L.length:d}catch(e){return d}}
// never trust remote data: hex colours only, integer indices in range
function cleanLook(a,d){
 if(!a||typeof a!=='object')return null;d=d||1;
 const hex=v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)?v.toLowerCase():'#c8c8c8';
 const idx=(v,n)=>typeof v==='number'&&Number.isInteger(v)&&v>=0&&v<n?v:0;
 const b=typeof a.bt==='number'&&isFinite(a.bt)?Math.max(0,Math.min(100,Math.round(a.bt))):0;
 return{h:hex(a.h),t:hex(a.t),r:hex(a.r),l:hex(a.l),hc:hex(a.hc),ha:idx(a.ha,lim('HATS',d)),hr:idx(a.hr,lim('HAIRS',d)),f:idx(a.f,lim('FACES',d)),hs:(Array.isArray(a.hs)?a.hs:[]).slice(0,3).map(v=>idx(v,lim('HATS',d))).filter(v=>v>0),bt:b};
}
function myLook(){ // the same look avatar.js gives your own avatar
 try{if(window.UBX_FISH_AV&&typeof UBX_FISH_AV.myLook==='function'){const L=cleanLook(UBX_FISH_AV.myLook(),1e4);if(L)return L;}}catch(e){}
 let a=null;try{a=JSON.parse(localStorage.getItem('unbloxed_av')||'null')}catch(e){}
 a=a&&typeof a==='object'?a:{};
 return cleanLook({h:a.head||'#f5c99b',t:a.torso||'#3498db',r:a.arms||'#f5c99b',l:a.legs||'#2c3e50',hc:a.hairColor||'#8d5524',
  ha:a.hat===undefined?1:+a.hat,hr:a.hair===undefined?1:+a.hair,f:+a.face||0,bt:+a.bt||0,hs:Array.isArray(a.hats)?a.hats.map(Number):[]},1e4);}

let lookC=null,lookKey='',lookReadAt=-1e9,sentKey='',sentAt=-1e9;
FUX.add('stExtra',()=>{
 const o={},t=now();
 if(typeof me!=='undefined'&&me&&STATES[me.state])o.fs=me.state;
 if(t-lookReadAt>500){lookReadAt=t;lookC=myLook();lookKey=JSON.stringify(lookC);}
 try{o.lv=level()|0;o.st=S.streak|0;}catch(e){}
 if(lookC&&(lookKey!==sentKey||t-sentAt>=LOOK_EVERY)){o.av=lookC;
  let live=false;try{live=NET.host?Object.keys(NET.conns||{}).length>0:!!NET.hostConn;}catch(e){}
  if(live){sentKey=lookKey;sentAt=t;}} // not connected yet: keep sending it until someone can get it
 return o;
});
const lookSoon=()=>{sentAt=-1e9;}; // a new player showed up: send our look with the next 'st'

/* ---------- Roblox-style name tags ---------- */
const TAGS={}; // remote id -> our tag sprite
let tagGen=0;
try{if(window.SSP_READY)SSP_READY.then(()=>{tagGen++;}).catch(()=>{});}catch(e){} // the tag font (Source Sans Pro, bundled): repaint once loaded
function viewH(){try{return renderer.domElement.clientHeight||innerHeight||700}catch(e){return innerHeight||700}}
function tagPx(){return Math.max(13,Math.min(19,Math.round(viewH()*.021)))} // font size in CSS px: readable, not huge
function dprNow(){return Math.min(2.5,Math.max(1,window.devicePixelRatio||1))}
// three lines like the overhead tag in the picture: catch streak (orange), "Level: N" (tan), name (big white)
const TAG_FF='"Source Sans Pro","Segoe UI",Arial,sans-serif';
function paintTag(s,key){
 const u=s.userData,dpr=dprNow(),fs=Math.round(tagPx()*dpr),c=u.cv,x=c.getContext('2d');
 const L=[];
 if(u.st>=3)L.push({t:String(u.st),z:Math.round(fs*.96),f:'700 ',c:'#ff9a4a',fl:1}); // catch streak: a small vector flame + the number, only from 3 up
 if(u.lv>0)L.push({t:'Level: '+u.lv,z:Math.round(fs*1.02),f:'700 ',c:'#ffe08a'});
 L.push({t:window.FICON?FICON.strip(String(u.name||'')):u.name,z:Math.round(fs*1.24),f:'600 ',c:'#ffffff'});
 const pad=Math.max(3,Math.round(fs*.2));let w=0,h=pad*2;
 for(const l of L){l.f+=l.z+'px '+TAG_FF;x.font=l.f;l.tw=Math.ceil(x.measureText(l.t).width);l.fw=l.fl?Math.round(l.z*.78):0;w=Math.max(w,l.tw+l.fw);l.h=Math.ceil(l.z*1.08);h+=l.h;}
 w+=pad*2;c.width=w;c.height=h;
 x.textAlign='center';x.textBaseline='middle';x.lineJoin='round';x.miterLimit=2;
 let y=pad;
 for(const l of L){const yy=y+l.h/2+l.z*.04,cx=w/2+l.fw/2;x.font=l.f;
  if(l.fl){const z=l.z*.62,fx=cx-l.tw/2-l.fw/2,fy=yy;x.beginPath();x.moveTo(fx,fy-z*.62);x.bezierCurveTo(fx+z*.55,fy-z*.18,fx+z*.5,fy+z*.2,fx+z*.32,fy+z*.42);x.bezierCurveTo(fx+z*.12,fy+z*.58,fx-z*.12,fy+z*.58,fx-z*.32,fy+z*.42);x.bezierCurveTo(fx-z*.52,fy+z*.2,fx-z*.42,fy-z*.08,fx-z*.18,fy-z*.22);x.bezierCurveTo(fx-z*.14,fy-z*.04,fx-z*.04,fy+z*.02,fx+z*.02,fy-z*.06);x.bezierCurveTo(fx+z*.12,fy-z*.24,fx+z*.06,fy-z*.46,fx,fy-z*.62);x.closePath();
   x.lineWidth=Math.max(2,Math.round(l.z*.13));x.strokeStyle='rgba(0,0,0,.78)';x.stroke();x.fillStyle=l.c;x.fill();}
  x.lineWidth=Math.max(2,Math.round(l.z*.15));x.strokeStyle='rgba(0,0,0,.78)';x.strokeText(l.t,cx,yy);
  x.fillStyle=l.c;x.fillText(l.t,cx,yy);y+=l.h;}
 const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.minFilter=THREE.LinearFilter;t.magFilter=THREE.LinearFilter;t.generateMipmaps=false;t.isLabel=true;
 if(s.material.map)s.material.map.dispose();
 s.material.map=t;s.material.needsUpdate=true;
 u.wc=w/dpr;u.hc=h/dpr;u.key=key;
}
function sizeTag(s,k){const p=s.parent,ps=p&&p.scale&&p.scale.y?p.scale.y:1;s.scale.set(s.userData.wc*k/ps,s.userData.hc*k/ps,1);}
function tagK(){const e=camera.projectionMatrix.elements[5]||1.732;return 2/(e*viewH());} // world scale per screen pixel (sizeAttenuation off)
function tagKey(){return Math.round(tagPx()*dprNow())+'|'+tagGen}
function makeTag(name,lv,st){
 const m=new THREE.SpriteMaterial({depthTest:false,depthWrite:false,transparent:true,toneMapped:false,sizeAttenuation:false});m.fog=false;
 const s=new THREE.Sprite(m);s.center.set(.5,0);s.position.set(0,TAG_Y,0);s.renderOrder=12;s.frustumCulled=false;
 s.userData={ubx:1,name,lv:lv|0,st:st|0,cv:document.createElement('canvas')};
 paintTag(s,tagKey()+'|'+(lv|0)+'|'+(st|0));s.scale.set(.01,.01,1);return s;
}
// tag height: just above the head and hat/hair (tall hats would otherwise cover the name); hats may load late, so this is re-run
const _bx=new THREE.Box3();
function fitTagY(av,s){try{const c=av.rig&&av.rig.c;let y=TAG_Y;
 if(c){av.g.updateMatrixWorld(true);_bx.makeEmpty();for(const o of[c.head,c.H,c.HG])if(o)_bx.expandByObject(o);
  if(!_bx.isEmpty())y=Math.max(TAG_Y,Math.min(5.5,_bx.max.y-av.g.position.y+.1));}
 s.position.y=y;}catch(e){}}
function killTag(s){if(!s)return;try{if(s.parent)s.parent.remove(s);if(s.material.map)s.material.map.dispose();s.material.dispose();}catch(e){}}
function killLabel(l){try{if(l.parent)l.parent.remove(l);if(l.material){if(l.material.map)l.material.map.dispose();l.material.dispose();}}catch(e){}}
// the game (re)creates r.av.label with makeLabel whenever a name changes: swap it for our tag
function ensureTag(id,r){
 const av=r.av;if(!av||!av.g)return;
 let l=av.label;
 if(l&&l.userData&&l.userData.ubx&&l.userData.name===r.name){if(l.parent!==av.g)av.g.add(l);TAGS[id]=l;return;}
 if(l&&!(l.userData&&l.userData.ubx))killLabel(l);
 if(TAGS[id])killTag(TAGS[id]);
 const s=makeTag(r.name||'Player',r.lv,r.st);av.g.add(s);av.label=s;TAGS[id]=s;
 fitTagY(av,s);try{sizeTag(s,tagK());}catch(e){}
}

/* ---------- join / leave lines ---------- */
const esc2=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
function say(text){
 try{if(typeof FUX.sys==='function'){FUX.sys(text);return;}}catch(e){console.warn('[ubx net] FUX.sys',e);}
 try{addFeed('<span style="color:#dfe6ee">'+esc2(text)+'</span>');}catch(e){}
}
const present=new Map(); // remote id -> {name}
let pending=[];          // leaves held back while our own connection resets: [{name,until}]
let sig='',sigAt=-1e9;
function gone(id,p,held){present.delete(id);if(TAGS[id]){killTag(TAGS[id]);delete TAGS[id];}
 if(held)pending.push({name:p.name,until:now()+12000});else say(p.name+' left the game.');}
// wrapped global: our own reconnect (joinLobby / lobby host left) empties remotes in one go. Those players are probably
// still there, so their "left" lines wait until they come back (cancelled) or 12 s pass (they really left, e.g. the old host)
try{if(typeof clearRemotes==='function'){const cr0=clearRemotes;
 window.clearRemotes=function(){const v=cr0.apply(this,arguments);try{for(const [id,p] of present)if(!remotes[id])gone(id,p,true);}catch(e){}return v;};}}catch(e){}
function netSig(){ // changes when we (re)join a lobby: players we meet right after that were already there
 try{const s=(NET.id||'')+'|'+(NET.host?'h':NET.hostConn?'c':'-');if(s!==sig){sig=s;sigAt=now();}}catch(e){}
}
setInterval(()=>{try{netSig();scan();}catch(e){}},400); // also while the tab is hidden (no frames, so no tick)
function scan(){
 for(const [id,p] of present)if(!remotes[id])gone(id,p,false);
 for(const id in TAGS){const r=remotes[id];if(r&&r.av&&r.av.label===TAGS[id])fitTagY(r.av,TAGS[id]);}
 if(pending.length){const t=now(),keep=[];for(const p of pending){if(t>p.until)say(p.name+' left the game.');else keep.push(p);}pending=keep;}
}
let scanAt=0;

/* ---------- hooks ---------- */
const looks={}; // last look per remote id (re-applied if the game re-creates that player's avatar)
FUX.add('onSt',(id,r,d)=>{
 const t=now();netSig();
 // fishing state for the anim plug-ins
 const fs=typeof d.fs==='string'&&STATES[d.fs]?d.fs:undefined;
 if(fs!==r.fstate){r.fstate=fs;r.fstateAt=t;}
 // look
 let L=null;
 if(d.av&&typeof d.av==='object')L=cleanLook(d.av);else if(r.ubxLookKey===undefined&&looks[id])L=looks[id];
 if(L){const k=JSON.stringify(L);
  if(k!==r.ubxLookKey){r.ubxLookKey=k;r.ubxLook=L;looks[id]=L;
   if(r.av&&typeof r.av.setLook==='function'){try{r.av.setLook(L);}catch(e){console.warn('[ubx net] setLook',e);}
    if(r.av.label&&r.av.g&&r.av.label.parent!==r.av.g)r.av.g.add(r.av.label);}}}
 // name tag (with their level and catch streak)
 if(d.lv!==undefined)r.lv=Math.max(0,Math.min(999,d.lv|0));
 if(d.st!==undefined)r.st=Math.max(0,Math.min(9999,d.st|0));
 ensureTag(id,r);
 // joined
 const p=present.get(id);
 if(!p){present.set(id,{name:r.name});lookSoon();
  const i=pending.findIndex(q=>q.name===r.name);
  if(i>=0)pending.splice(i,1);              // back after a reconnect: not a new player
  else if(t-sigAt>3000)say(r.name+' joined the game.'); // players already here when we joined get no line
 }else if(p.name!==r.name)p.name=r.name;
 if(t-scanAt>250){scanAt=t;scan();}
});
FUX.add('onStart',()=>{if(typeof me!=='undefined'&&me.av&&me.av.label)me.av.label.visible=false;}); // the game's own label stays hidden
// our own overhead tag (streak, level, name), like in the picture
let MYTAG=null,myFitAt=0;
function myTag(k,key,t){
 if(typeof me==='undefined'||!me||!me.av||!me.av.g)return;
 let lv=0,st=0;try{lv=level()|0;st=S.streak|0;}catch(e){}
 const nm=(S&&S.name)||'Player',kk=key+'|'+lv+'|'+st+'|'+nm;
 if(!MYTAG){MYTAG=makeTag(nm,lv,st);}
 if(MYTAG.parent!==me.av.g){me.av.g.add(MYTAG);myFitAt=0;}
 const u=MYTAG.userData;
 if(u.key!==kk){u.name=nm;u.lv=lv;u.st=st;paintTag(MYTAG,kk);}
 if(t-myFitAt>1000){myFitAt=t;fitTagY(me.av,MYTAG);}
 sizeTag(MYTAG,k);
 const gp=me.av.g.position,cm=camera.matrixWorld.elements,dx=gp.x-cm[12],dy=gp.y-cm[13],dz=gp.z-cm[14];
 MYTAG.visible=me.av.g.visible!==false&&dx*dx+dy*dy+dz*dz>4; // not when the camera is inside the head
 MYTAG.material.opacity=1;
}
FUX.add('tick',()=>{
 if(typeof me!=='undefined'&&me&&me.av&&me.av.label&&me.av.label.visible)me.av.label.visible=false;
 const t=now();if(t-scanAt>250){scanAt=t;netSig();scan();}
 const k=tagK(),key0=tagKey();
 try{myTag(k,key0,t);}catch(e){}
 const ids=Object.keys(TAGS);if(!ids.length)return;
 const cm=camera.matrixWorld.elements;
 for(const id of ids){const s=TAGS[id],r=remotes[id];
  if(!r||!s.parent){continue;}
  const u=s.userData,key=key0+'|'+(r.lv|0)+'|'+(r.st|0)+'|'+r.name;
  if(u.key!==key){u.lv=r.lv|0;u.st=r.st|0;paintTag(s,key);}
  sizeTag(s,k);
  const gp=r.av.g.position,dx=gp.x-cm[12],dy=gp.y-cm[13],dz=gp.z-cm[14],dd=Math.sqrt(dx*dx+dy*dy+dz*dz);
  const a=dd<=FADE0?1:dd>=FADE1?0:1-(dd-FADE0)/(FADE1-FADE0);
  s.material.opacity=a;s.visible=a>.02;
 }
});
// for other plug-ins / tests
FUX.net={cleanLook,myLook,tags:TAGS,present,myTag:()=>MYTAG};
})();
