// zombie-apocalypse/admin.js -- a little admin panel inside Zombie Apocalypse (owner only).
// Open with the ` key (or the Admin button in the pause menu). First use asks for the Dopamine Rush admin password;
// it is checked the same way admin.html checks it (Supabase admin_list as duke) and remembered on this device.
// Host-only powers (waves, zombies, the Overlord) are greyed out when you joined someone else's game.
(function(){
'use strict';
if(!window.ZA)return;
const SB='https://zznsfdcpondfnacherxv.supabase.co',SBK='sb_publishable_P6Xw_9hNrt-1_sKE7SsN7w_nN7eum3I',LK='za_admin';
const ls=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k);if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v)}catch(e){return null}};
async function hash(u,p){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(p+'::shooter::'+u.toLowerCase()));return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('')}
async function check(a){const r=await fetch(SB+'/rest/v1/rpc/admin_list',{method:'POST',headers:{apikey:SBK,Authorization:'Bearer '+SBK,'Content-Type':'application/json'},body:JSON.stringify({p_user:a.u,p_hash:a.h,p_table:'bans',p_search:'',p_limit:1})});if(!r.ok)throw new Error(r.status===400||r.status===401||r.status===403?'Wrong password':'Could not reach the server ('+r.status+')')}
let ok=false;
// ---------- panel ----------
const css=document.createElement('style');css.textContent=`
#zaAdm{position:fixed;right:18px;top:80px;width:min(340px,92vw);max-height:80vh;overflow:auto;z-index:40;display:none;background:rgba(12,14,12,.94);border:1px solid #4a5a3a;border-radius:10px;padding:12px 14px;color:#e8eadf;font:600 13px system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.6)}
#zaAdm h3{margin:0 0 8px;font:800 14px system-ui;letter-spacing:.16em;color:#9be06a;display:flex;justify-content:space-between;align-items:center}
#zaAdm .x{background:none;border:0;color:#aab;font-size:18px;cursor:pointer;padding:0 4px}
#zaAdm .sec{margin:10px 0 4px;font-size:11px;letter-spacing:.14em;color:#8a9a7a;text-transform:uppercase}
#zaAdm .row{display:flex;flex-wrap:wrap;gap:6px}
#zaAdm button.b{flex:1 1 auto;background:#2a3424;border:1px solid #4a5a3a;color:#e8eadf;border-radius:6px;padding:6px 8px;font:700 12px system-ui;cursor:pointer}
#zaAdm button.b:hover{background:#3a4a30}#zaAdm button.b.on{background:#5a8a3a;border-color:#9be06a}
#zaAdm button.b:disabled{opacity:.4;cursor:default}
#zaAdm input,#zaAdm select{background:#1a1e18;border:1px solid #4a5a3a;color:#e8eadf;border-radius:6px;padding:6px 8px;font:600 12px system-ui;min-width:0;flex:1 1 auto}
#zaAdm .msg{margin-top:8px;font-size:12px;color:#9be06a;min-height:15px}#zaAdm .msg.bad{color:#ff8a7a}
#zaAdm .note{font-size:11px;color:#8a9a7a;margin-top:4px}`;
document.head.appendChild(css);
const P=document.createElement('div');P.id='zaAdm';document.body.appendChild(P);
const msg=(t,bad)=>{const m=P.querySelector('.msg');if(m){m.textContent=t;m.className='msg'+(bad?' bad':'')}};
const host=()=>typeof isHost==='undefined'||isHost;
let god=false,frozen=false;
function login(){P.innerHTML=`<h3>ADMIN<button class="x" type="button">×</button></h3><div class="note">Enter your Dopamine Rush admin password (the one for admin.html).</div>
 <div class="row" style="margin-top:8px"><input id="zaAdmU" value="duke" autocomplete="username" style="flex:0 1 90px"><input id="zaAdmP" type="password" placeholder="password" autocomplete="current-password"></div>
 <div class="row" style="margin-top:6px"><button class="b" type="button" id="zaAdmIn">Log in</button></div><div class="msg"></div>`;
 P.querySelector('.x').onclick=close;const go=async()=>{const u=P.querySelector('#zaAdmU').value.trim(),p=P.querySelector('#zaAdmP').value;if(!u||!p)return;msg('Checking...');
  try{const a={u,h:await hash(u,p)};await check(a);ls(LK,JSON.stringify(a));ok=true;draw();msg('Welcome, '+u)}catch(e){msg(e.message,true)}};
 P.querySelector('#zaAdmIn').onclick=go;P.querySelector('#zaAdmP').onkeydown=e=>{e.stopPropagation();if(e.key==='Enter')go()};P.querySelector('#zaAdmU').onkeydown=e=>e.stopPropagation()}
function useDoor(i){const u=ZA.uses&&ZA.uses.find(u=>u.id==='door'+i);if(!u||!u.ok())return false;const m=me.money;me.money=Math.max(m,(ZAMAP.doors[i]||{}).cost||0);u.use();me.money=m;return true}
function draw(){const X=ZA.xmas,H=host(),guns=Object.keys(GUNS).filter(g=>GUNS[g]&&GUNS[g].mag&&GUNS[g].n).sort((a,b)=>GUNS[a].n.localeCompare(GUNS[b].n));
 P.innerHTML=`<h3>ADMIN<button class="x" type="button" title="Close (\`)">×</button></h3>
 <div class="sec">You</div><div class="row"><button class="b" data-a="pts10">+10,000 pts</button><button class="b" data-a="pts100">+100,000 pts</button></div>
 <div class="row" style="margin-top:6px"><button class="b ${god?'on':''}" data-a="god">God mode ${god?'ON':'off'}</button><button class="b" data-a="heal">Full heal + revive</button><button class="b" data-a="ammo">Max ammo</button></div>
 <div class="row" style="margin-top:6px"><select id="zaAdmG">${guns.map(g=>`<option value="${g}">${GUNS[g].n}</option>`).join('')}</select><button class="b" data-a="gun" style="flex:0 0 auto">Give gun</button></div>
 <div class="sec">Game ${H?'':'(host only)'}</div><div class="row"><input id="zaAdmW" type="number" min="1" max="200" value="${Math.max(1,(RS.rnd||1)+5)}" style="flex:0 1 70px"><button class="b" data-a="wave" ${H?'':'disabled'}>Skip to wave</button></div>
 <div class="row" style="margin-top:6px"><button class="b" data-a="kill" ${H?'':'disabled'}>Kill all zombies</button><button class="b ${frozen?'on':''}" data-a="freeze" ${H?'':'disabled'}>Freeze zombies ${frozen?'ON':'off'}</button></div>
 <div class="row" style="margin-top:6px"><button class="b" data-a="doors">Open all doors</button><button class="b" data-a="power">Power on</button></div>
 ${X?`<div class="sec">Christmas event</div><div class="row"><select id="zaAdmA">${Array.from({length:X.n},(_,i)=>`<option value="${i}">${i+1}. ${ZA.zones[ZA.zones.length-X.n+i].name}</option>`).join('')}</select><button class="b" data-a="tp" style="flex:0 0 auto">Teleport</button></div>
 <div class="row" style="margin-top:6px"><button class="b" data-a="xdoors">Open event doors</button><button class="b" data-a="boss" ${H?'':'disabled'}>Spawn the Overlord</button></div>`:''}
 <div class="sec">Unlocks</div><div class="row"><button class="b" data-a="skin">Unlock Overlord skins</button></div>
 <div class="row" style="margin-top:10px"><button class="b" data-a="out" style="flex:0 0 auto;opacity:.7">Log out</button></div><div class="msg"></div>`;
 P.querySelector('.x').onclick=close;P.querySelectorAll('input,select').forEach(e=>e.onkeydown=ev=>ev.stopPropagation());
 P.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{try{act(b.dataset.a)}catch(e){msg(e.message,true)}})}
function act(a){const X=ZA.xmas;
 switch(a){
  case'pts10':case'pts100':{const n=a==='pts10'?1e4:1e5;me.money=Math.min(typeof PTS_CAP!=='undefined'?PTS_CAP:1e9,me.money+n);msg('+'+n.toLocaleString()+' points');break}
  case'god':god=!god;draw();msg('God mode '+(god?'on':'off'));break;
  case'heal':{if(me.downed&&ZA.revive)try{ZA.revive(me.id)}catch(e){}me.downed=false;me.alive=true;me.hp=ZA.maxHP||100;msg('Healed');break}
  case'ammo':{for(const g in me.ammo){const G=GUNS[g];if(G&&G.mag)me.ammo[g]=[G.mag,G.res]}msg('Ammo full');break}
  case'gun':{const g=P.querySelector('#zaAdmG').value,G=GUNS[g];if(!G)return;giveGun(g);if(!me.ammo[g])me.ammo[g]=[G.mag,G.res];switchTo(G.slot===1?'p':'s');msg('Gave '+G.n);break}
  case'wave':{if(!host())return;const w=Math.max(1,Math.min(200,+P.querySelector('#zaAdmW').value||1));ZA.skipToWave(w);msg('Wave '+w);break}
  case'kill':{if(!host())return;let n=0;for(const b of bots)if(b.zombie&&b.alive){applyHit(b.id,1e9,me.id,false,'nuke');n++}msg('Killed '+n+' zombies');break}
  case'freeze':frozen=!frozen;draw();msg('Zombies '+(frozen?'frozen':'moving'));break;
  case'doors':{let n=0;ZAMAP.doors.forEach((d,i)=>{if(!d.power&&useDoor(i))n++});msg('Opened '+n+' doors');break}
  case'power':{const u=ZA.uses&&ZA.uses.find(u=>u.id==='power');if(u&&u.ok()){u.use();msg('Power on')}else msg('Power is already on (or this map has none)');break}
  case'xdoors':{let n=0;const N=ZAMAP.doors.length;for(let i=N-(X?X.n:0);i<N;i++)if(useDoor(i))n++;msg('Opened '+n+' event doors');break}
  case'tp':{const i=+P.querySelector('#zaAdmA').value,p=X&&X.arena(i);if(!p)return;me.pos.set(p[0],0,p[1]);me.vy=0;me.yaw=0;msg('Teleported to arena '+(i+1)+(ZA.zoneOpen(ZA.zones.length-X.n+i)?'':' (its door is still shut)'));break}
  case'boss':{if(!host()||!X)return;const N=ZAMAP.doors.length;for(let i=N-X.n;i<N;i++)useDoor(i);const b=X.spawnOverlord();if(b){const p=X.arena(X.n-1);me.pos.set(p[0],0,p[1]);me.vy=0;me.yaw=0}msg(b?'The Overlord is in the hangar (doors opened, you were moved to the hangar)':'The Overlord is already out',!b);break}
  case'skin':try{localStorage.setItem('za_skin_ovl','1');localStorage.setItem('za_skin_prime','1');localStorage.setItem('za_gunskin','prime')}catch(e){}if(window.ZAskin)ZAskin.refresh();msg('Overlord + Overlord Prime skins unlocked (Prime equipped)');break;
  case'out':ls(LK,null);ok=false;login();break}}
function open(){P.style.display='block';try{document.exitPointerLock()}catch(e){}
 if(ok){draw();return}const a=(()=>{try{return JSON.parse(ls(LK)||'null')}catch(e){return null}})();
 if(a&&a.u&&a.h){P.innerHTML='<h3>ADMIN</h3><div class="msg">Checking...</div>';check(a).then(()=>{ok=true;draw()}).catch(e=>{ls(LK,null);login();msg(e.message,true)})}else login()}
function close(){P.style.display='none'}
addEventListener('keydown',e=>{if(e.code!=='Backquote'||e.repeat)return;const t=e.target;if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'))return;e.preventDefault();P.style.display==='block'?close():open()},true);
// a button in the pause menu too
addEventListener('load',()=>{const box=document.querySelector('#pause .box');if(!box)return;const b=document.createElement('button');b.type='button';b.textContent='Admin ( ` )';
 b.style.cssText='position:absolute;right:10px;bottom:8px;background:none;border:0;color:#8a9a7a;font:700 11px system-ui;cursor:pointer;opacity:.6';b.onclick=e=>{e.stopPropagation();open()};if(getComputedStyle(box).position==='static')box.style.position='relative';box.appendChild(b)});
// ---------- powers that run every frame ----------
ZA.on('tick',()=>{if(god&&me.alive){me.hp=Math.max(me.hp,ZA.maxHP||100);if(me.downed)me.downed=false}
 if(frozen&&host())for(const b of bots)if(b.zombie&&b.alive){b.stag=Math.max(b.stag||0,.2);if(b._fz)b.pos.copy(b._fz);else b._fz=b.pos.clone();b.cd=Math.max(b.cd||0,.5);b.orbCd=Math.max(b.orbCd||0,1)}
 if(!frozen)for(const b of bots)if(b._fz)b._fz=null});
})();
