// Trench War lobby: the main menu becomes a lobby with a live 3D preview of your own Unbloxed avatar standing in a small dusk
// trench (sandbags, duckboards, a lantern), idling with the gun you spawn with; drag to turn it. Left panel = callsign, mode,
// bots, Play Solo / Host / Join (the original #menu inputs and buttons are moved in, so every existing handler keeps working).
// Rendering reuses the game's own WebGLRenderer (R) with a tiny separate scene: no second WebGL context, and the big map is not
// drawn while the lobby is up. Hooks in trench-war.html: frame() calls TWL.render(dt); the match-over timers call TWL.matchOver().
(function(){'use strict';
if(typeof THREE==='undefined'||typeof R==='undefined'||!document.getElementById('menu'))return;
const $=id=>document.getElementById(id);
const menu=$('menu'),box=menu.querySelector('.box');
const TWL=window.TWL={active:false};

// ---------------------------------------------------------------- styles
const css=document.createElement('style');css.textContent=`
#menu.twl{background:linear-gradient(90deg,rgba(8,8,6,.5) 0,rgba(8,8,6,.2) 34%,rgba(8,8,6,0) 50%);pointer-events:none}
#menu.twl .box{position:absolute;left:0;top:0;bottom:0;margin:0;width:clamp(330px,30vw,410px);max-width:none;max-height:none;min-width:0;border-radius:0;
 padding:16px 20px 12px;overflow-y:auto;overflow-x:hidden;pointer-events:auto;display:flex;flex-direction:column;gap:9px;
 background:linear-gradient(180deg,rgba(28,27,21,.95),rgba(14,14,11,.97));border:0;border-right:1px solid var(--line);box-shadow:10px 0 40px #0009;backdrop-filter:none}
#menu.twl h1{font-size:44px;letter-spacing:5px}
#menu.twl .tag{font-size:12px;letter-spacing:3px;margin:2px 0 4px}
#menu.twl .card{margin:0;padding:11px 13px}
#menu.twl .twl-h{font:600 12px var(--hfont);letter-spacing:3px;color:var(--gold);text-transform:uppercase;margin:0 0 7px;opacity:.9}
#menu.twl .row{margin:7px 0}
#menu.twl label{min-width:0;flex:0 0 96px;font-size:12px}
#menu.twl #name{flex:1;width:auto;min-width:0}
.twl-seg{display:flex;gap:5px;flex:1}
#menu.twl .twl-seg button{flex:1;margin:0;padding:7px 0;background:rgba(0,0,0,.4);border:1px solid var(--line);box-shadow:none;font-size:14px;letter-spacing:2px;color:#cfc4a6}
#menu.twl .twl-seg button.on{background:linear-gradient(180deg,#8a7440,#5e4e28);border-color:#a88f52;color:#fff}
.twl-desc{color:#9c9686;font-size:12px;margin:-1px 0 2px 104px;min-height:15px}
.twl-step{display:flex;align-items:center;gap:5px}
#menu.twl .twl-step button{margin:0;padding:6px 0;width:32px;font-size:16px;box-shadow:none;background:rgba(0,0,0,.4);border:1px solid var(--line)}
#menu.twl #bots{width:54px!important;text-align:center;padding:7px 4px}
#menu.twl #bSolo{width:100%;margin:0;padding:13px;font-size:21px;letter-spacing:4px}
#menu.twl #bHost{width:100%;margin:0}
#menu.twl .twl-join{display:flex;gap:6px;margin:7px 0 0}
#menu.twl #joinCode{flex:1;width:auto;min-width:0}
#menu.twl #bJoin{margin:0}
#menu.twl #err{margin:0;min-height:0}#menu.twl #err:empty{display:none}
#menu.twl #twRemix{margin-top:0!important;align-self:flex-start;font-size:13px}
#menu.twl .keys{margin-top:auto;padding-top:6px;font-size:11px;line-height:1.7}
#twlSide{position:absolute;right:16px;top:16px;bottom:16px;width:clamp(220px,19vw,280px);display:flex;flex-direction:column;gap:10px;overflow-y:auto;pointer-events:auto}
#twlSide:empty{display:none}
#menu.twl .box #twlSide{position:static;width:auto;overflow:visible}
#twlSide>div:empty,#twlSide>.twl-hide{display:none}
#twlSide .card{margin:0;padding:11px 13px;background:rgba(14,15,12,.72);border:1px solid var(--line);border-radius:10px;backdrop-filter:blur(4px)}
.twl-big{font:600 24px/1.1 var(--hfont);letter-spacing:1px}
.twl-code{font:700 30px var(--hfont);color:#8cff7a;letter-spacing:6px}
.twl-pl{font:500 14px var(--hfont);letter-spacing:.5px;display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.06)}
#twlPlate{position:absolute;bottom:22px;text-align:center;pointer-events:none;font-family:var(--hfont);text-shadow:0 2px 10px #000,0 0 2px #000}
#twlPlate .n{font:600 30px/1 var(--hfont);letter-spacing:3px;color:#f3e3b5;text-transform:uppercase}
#twlPlate .g{font:500 13px var(--hfont);letter-spacing:3px;color:var(--gold);margin-top:5px;text-transform:uppercase}
#twlPlate .h{font:400 11px Inter;color:#9c9686;margin-top:6px;letter-spacing:.5px}
#twlLoad{position:fixed;inset:0;z-index:40;display:none;align-items:center;justify-content:center;flex-direction:column;opacity:0;transition:opacity .35s;
 background:radial-gradient(ellipse at center,#2a2219 0,#120f0b 60%,#070605 100%)}
#twlLoad.on{opacity:1}
#twlLoad .t{font:500 13px var(--hfont);letter-spacing:6px;color:var(--gold)}
#twlLoad .d{font:700 52px/1.1 var(--hfont);letter-spacing:8px;color:#f3e3b5;text-shadow:0 4px 0 #3a2d14,0 10px 30px #000;margin:6px 0 18px}
#twlLoad .b{width:min(360px,70vw);height:6px;background:rgba(255,255,255,.08);border-radius:3px;overflow:hidden}
#twlLoad .b i{display:block;height:100%;width:30%;background:linear-gradient(90deg,#c9a24a,#ffe08a);border-radius:3px;animation:twlbar 1.1s ease-in-out infinite}
@keyframes twlbar{0%{transform:translateX(-110%)}100%{transform:translateX(340%)}}
#twlLoad .s{color:#9c9686;margin-top:16px;font-size:13px;max-width:520px;text-align:center;line-height:1.5}
#twlLoad .c{margin-top:14px;text-align:center;font:500 13px var(--hfont);letter-spacing:2px;color:#cfc4a6}
@media (max-height:740px){#menu.twl h1{font-size:38px}#menu.twl .keys{display:none}#menu.twl .box{gap:7px;padding-top:12px}#menu.twl .card{padding:9px 12px}}
`;document.head.appendChild(css);

// ---------------------------------------------------------------- restructure the menu (move the original controls)
const old=[...box.children];
const mk=(tag,cls,html)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e};
const head=mk('div','twl-head');const h1=box.querySelector('h1'),tag=box.querySelector('.tag');if(h1)head.appendChild(h1);if(tag)head.appendChild(tag);
const MODES=[['bomb','BOMB'],['classic','TDM'],['ffa','FFA']];
const cardA=mk('div','card');cardA.appendChild(mk('div','twl-h','Soldier · Match'));
const rName=mk('div','row');rName.appendChild(mk('label',null,'Callsign'));if($('name'))rName.appendChild($('name'));cardA.appendChild(rName);
const rMode=mk('div','row');rMode.appendChild(mk('label',null,'Mode'));const seg=mk('div','twl-seg');rMode.appendChild(seg);cardA.appendChild(rMode);
const desc=mk('div','twl-desc');cardA.appendChild(desc);
const sel=$('mode');if(sel){sel.style.display='none';cardA.appendChild(sel)}
const rBots=mk('div','row');rBots.appendChild(mk('label',null,'Bots / team'));const step=mk('div','twl-step');rBots.appendChild(step);cardA.appendChild(rBots);
const bots=$('bots');const bMinus=mk('button',null,'&minus;'),bPlus=mk('button',null,'+');bMinus.type=bPlus.type='button';
step.appendChild(bMinus);if(bots)step.appendChild(bots);step.appendChild(bPlus);
const stepBots=d=>{if(!bots)return;const lo=+bots.min||0,hi=+bots.max||8;bots.value=Math.max(lo,Math.min(hi,(+bots.value||0)+d))};
bMinus.onclick=()=>stepBots(-1);bPlus.onclick=()=>stepBots(1);
{const et=$('enemyTypes');if(et){const oldCard=et.closest('.card');const rE=mk('div','row');rE.appendChild(mk('label',null,'Enemies'));et.style.flex='1';rE.appendChild(et);cardA.appendChild(rE);if(oldCard&&!oldCard.querySelector('input,select,button'))oldCard.remove()}}
const segB={};
function syncMode(){const v=sel?sel.value:'bomb';for(const k in segB)segB[k].classList.toggle('on',k===v);
 const o=sel&&sel.options[sel.selectedIndex];desc.textContent=o?o.textContent.split('·').slice(1).join('·').trim():''}
for(const[v,l] of MODES){if(sel&&![...sel.options].some(o=>o.value===v))continue;const b=mk('button',null,l);b.type='button';b.onclick=()=>{sel.value=v;sel.dispatchEvent(new Event('change'));syncMode()};seg.appendChild(b);segB[v]=b}
if(sel)sel.addEventListener('change',syncMode);syncMode();
const solo=$('bSolo');if(solo)solo.textContent='Play Solo';
const cardO=mk('div','card');cardO.appendChild(mk('div','twl-h','Online · play with friends'));
const host=$('bHost');if(host){host.textContent='Host Online';cardO.appendChild(host)}
const jr=mk('div','twl-join');if($('joinCode'))jr.appendChild($('joinCode'));if($('bJoin'))jr.appendChild($('bJoin'));cardO.appendChild(jr);
const side=mk('div');side.id='twlSide';
const roomCard=mk('div','card twl-hide');const lastCard=mk('div','card twl-hide');side.appendChild(roomCard);side.appendChild(lastCard);
for(const id of['lobbyRank','lobbyDaily']){let e=$(id);if(!e){e=mk('div');e.id=id}side.appendChild(e)}
const foot=mk('div','twl-foot');foot.style.cssText='display:flex;flex-direction:column;gap:6px';
const keysEl=box.querySelector('.keys');
box.appendChild(head);box.appendChild(cardA);if(solo)box.appendChild(solo);box.appendChild(cardO);if($('err'))box.appendChild($('err'));
if($('twRemix'))box.appendChild($('twRemix'));box.appendChild(foot);
// anything else that lived in the menu (other features' controls, the "Back to Unbloxed" link) is kept, in the footer
for(const e of old){if(e===h1||e===tag||e===keysEl||box.contains(e)&&e.parentNode!==box)continue;if(e.parentNode!==box||[head,cardA,cardO,solo,foot,$('err'),$('twRemix')].includes(e))continue;
 const keep=e.id||e.matches('a,button,input,select,canvas,img')||e.querySelector('input,select,button,a,canvas,img,[id]');if(keep)foot.appendChild(e);else e.remove()}
if(keysEl)box.appendChild(keysEl);
menu.appendChild(side);
const plate=mk('div');plate.id='twlPlate';plate.innerHTML='<div class="n"></div><div class="g"></div><div class="h">Drag to turn your soldier</div>';menu.appendChild(plate);
menu.classList.add('twl');
const load=mk('div');load.id='twlLoad';load.innerHTML='<div class="t">TRENCH WAR</div><div class="d">DEPLOYING</div><div class="b"><i></i></div><div class="s"></div><div class="c"></div>';document.body.appendChild(load);
const TIPS=['Crouch behind sandbags: bullets lose their bite through cover.','Buy armor early. A helmet saves you from one-shot headshots.','Hold E to plant or defuse. A defuse kit halves the time.',
 'Pistols are accurate when you stand still. Stop, then shoot.','Smoke a sightline before you cross it.','Free For All: 20 kills for a turret, 35 for a shield, 50 for the nuke.'];

// ---------------------------------------------------------------- the 3D trench preview (own small scene, drawn with the game's renderer)
const S=new THREE.Scene();S.fog=new THREE.Fog(0x3b3236,9,40);
const C=new THREE.PerspectiveCamera(32,innerWidth/innerHeight,.1,120);C.position.set(0,1.2,5.6);
const skyU={fl:{value:0}};
{const sky=new THREE.Mesh(new THREE.SphereGeometry(90,24,12),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:skyU,
 vertexShader:'varying vec3 vp;void main(){vp=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:'uniform float fl;varying vec3 vp;void main(){float h=vp.y;vec3 gr=vec3(.10,.08,.07),hz=vec3(.78,.42,.24),mid=vec3(.36,.24,.33),zen=vec3(.09,.11,.20);'+
  'vec3 c=h<0.?mix(hz*.5,gr,min(1.,-h*6.)):h<.18?mix(hz,mid,h/.18):mix(mid,zen,min(1.,(h-.18)/.5));vec3 sd=normalize(vec3(.75,.06,-.65));float s=max(0.,dot(vp,sd));'+
  'c+=vec3(1.,.55,.25)*(pow(s,40.)*.6+pow(s,6.)*.18);c+=vec3(1.,.6,.3)*fl*exp(-abs(h)*14.)*(.6+.4*sin(vp.x*9.));gl_FragColor=vec4(c,1.);}'}));
 sky.renderOrder=-1;sky.frustumCulled=false;S.add(sky)}
// same light set as the battlefield (hemi + shadowed sun + 2 point lights), so shared materials reuse their shader programs
S.add(new THREE.HemisphereLight(0x8a90c0,0x3a2a1c,.62));
const sun=new THREE.DirectionalLight(0xffa868,1.15);sun.position.set(4.5,4,6);sun.target.position.set(0,1,0);S.add(sun,sun.target);
sun.castShadow=true;sun.shadow.mapSize.set(512,512);Object.assign(sun.shadow.camera,{left:-3,right:3,top:3.2,bottom:-1.5,near:.5,far:20});sun.shadow.bias=-.0008;sun.shadow.normalBias=.02;
const lamp=new THREE.PointLight(0xffa040,1.3,7,1.6);lamp.position.set(-1.75,1.55,-.55);S.add(lamp);
const flash=new THREE.PointLight(0xffb070,0,60);flash.position.set(6,8,-30);S.add(flash);
function mesh(g,m,x,y,z,ry){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.rotation.y=ry||0;o.receiveShadow=true;S.add(o);return o}
function inst(tw,fallG,fallM,list){const n=list.length;const im=new THREE.InstancedMesh(tw?tw.geometry:fallG,tw?tw.material:fallM,n);const o=new THREE.Object3D();
 list.forEach((p,i)=>{o.position.set(p[0],p[1],p[2]);o.rotation.set(p[4]||0,p[3]||0,p[5]||0,'YXZ');o.scale.set(p[6]||1,p[7]||1,p[8]||1);o.updateMatrix();im.setMatrixAt(i,o.matrix)});
 im.receiveShadow=true;S.add(im);return im}
try{
 const dt2=typeof dirtTex!=='undefined'?dirtTex.clone():null;if(dt2){dt2.needsUpdate=true;dt2.repeat.set(10,3)}
 const mud=new THREE.MeshLambertMaterial({color:0x4a3b2c,map:dt2});
 const fl=mesh(new THREE.PlaneGeometry(40,14),mud,0,0,0);fl.rotation.x=-Math.PI/2;
 // parapet earth behind the wall and a low bank in front
 const bank=new THREE.MeshLambertMaterial({color:0x3d3125,map:dt2});
 const back=mesh(new THREE.BoxGeometry(40,2.1,6),bank,0,1.05,-4.25);
 const plankT=typeof plankTex!=='undefined'?plankTex:null,burlT=typeof burlapTex!=='undefined'?burlapTex:null,rb=typeof RBox==='function'?RBox:(w,h,d)=>new THREE.BoxGeometry(w,h,d);
 // duckboards along the trench floor
 const dL=[];for(let x=-7;x<=7;x++){dL.push([x,0,0,Math.PI/2]);dL.push([x,0,1,Math.PI/2])}
 inst(TW('duckboard'),(()=>{const g=rb(.9,.05,.95,.02);g.translate(0,.03,0);return g})(),new THREE.MeshLambertMaterial({color:0xa08060,map:plankT}),dL);
 // revetment panels + posts holding the back wall
 const pL=[],poL=[];for(let x=-7.5;x<=7.5;x+=1.02)pL.push([x,.95,-1.02,Math.PI,.1,0,1,1.95,1]);for(let x=-7;x<=7;x+=2)poL.push([x,.98,-.96,0,.1,0,1,1.98,1]);
 const pg=rb(1.02,1,.05);inst(TW('revetPanel'),pg,new THREE.MeshLambertMaterial({color:0xb09070,map:plankT}),pL);
 inst(TW('revetPost'),new THREE.CylinderGeometry(.06,.07,1,8),new THREE.MeshLambertMaterial({color:0x5a4028,map:plankT}),poL);
 // sandbag parapet on top (three staggered layers) + a small pile on the left, foreground
 const twS=TW('sandbag');const bL=[];let sd=7;const r=()=>(sd=(sd*16807)%2147483647)/2147483647;
 for(let l=0;l<3;l++)for(let x=-8;x<=8;x+=.9)bL.push([x+(l%2)*.45+(r()-.5)*.08,2.13+l*.27,-1.45+(r()-.5)*.1-l*.08,(r()-.5)*.15]);
 for(const p of[[-2.5,.15,.35,.3],[-2.45,.15,-.15,-.2],[-3.4,.15,.15,.1],[-2.95,.42,.12,.4],[-2.6,.15,.85,1.3]])bL.push(p);
 const bags=inst(twS,typeof sackGeo==='function'?sackGeo():new THREE.BoxGeometry(.9,.28,.45),new THREE.MeshLambertMaterial({color:0xb8a77c,map:burlT}),bL);bags.castShadow=true;
 // ammo crates on the right
 const cr=TW('crate');const crL=[[2.3,.05,-.45,.25],[2.95,.05,.25,-.3]];
 const cg=rb(1,1,1);cg.translate(0,.5,0);const crates=inst(cr,cg,new THREE.MeshLambertMaterial({color:0xe0c8a0,map:typeof crateTex!=='undefined'?crateTex:null}),crL.map(p=>cr?p:[...p,0,0,.8,.9,.7]));crates.castShadow=true;
 // barbed wire + a dead tree on the skyline
 for(let i=0;i<5;i++){const w=TW('wireSection',i);if(w){w.position.set(-6+i*3,2.1,-3.2-(i%2)*.6);w.rotation.y=(i%2)*.4;S.add(w)}}
 for(const[x,z,s] of[[-6.5,-10,11],[7,-14,4]]){const t=TW('deadTree',s);if(t){t.position.set(x,2.1,z);t.scale.setScalar(1.1);S.add(t)}}
 // hanging lantern on the post left of the soldier
 const lg=new THREE.Group();lg.position.copy(lamp.position);
 const iron=new THREE.MeshLambertMaterial({color:0x222018});lg.add(new THREE.Mesh(new THREE.CylinderGeometry(.07,.08,.03,10),iron));
 const glass=new THREE.Mesh(new THREE.CylinderGeometry(.055,.06,.16,10),new THREE.MeshBasicMaterial({color:0xffc070}));glass.position.y=.095;lg.add(glass);
 const cap=new THREE.Mesh(new THREE.ConeGeometry(.08,.07,10),iron);cap.position.y=.21;lg.add(cap);
 const hook=new THREE.Mesh(new THREE.BoxGeometry(.03,.03,.45),iron);hook.position.set(0,.3,-.2);lg.add(hook);S.add(lg);
}catch(e){console.warn('[lobby] scene',e)}
// drifting embers / dust in the lamp light
const EMB=(()=>{const N=70,pos=new Float32Array(N*3);for(let i=0;i<N;i++){pos[i*3]=(Math.random()-.5)*7;pos[i*3+1]=Math.random()*3.2;pos[i*3+2]=-.8+Math.random()*2.6}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));
 const p=new THREE.Points(g,new THREE.PointsMaterial({color:0xffc890,size:.025,transparent:true,opacity:.7,depthWrite:false}));S.add(p);return p})();

// ---------------------------------------------------------------- your soldier
let ch=null,yaw=-.62,yawV=0,drag=null,t0=0,shownGun='';
function spawnGun(){const g=window.TW_SPAWN_GUN;return typeof GUNS!=='undefined'&&g&&GUNS[g]?g:(typeof GUNS!=='undefined'&&GUNS.service?'service':'')}
function buildChar(){try{if(ch){S.remove(ch);ch=null}
  ch=makeSoldier(typeof me!=='undefined'?me.team||0:0,MYAV,'');S.add(ch); // makeSoldier adds it to the battlefield; S.add moves it here
  ch.position.set(0,.07,.45);shownGun=ch.userData.gunId||'';if(ch.userData.tag)ch.userData.tag.visible=false}catch(e){console.warn('[lobby] avatar',e);ch=null}}
function setGun(){if(!ch)return;const g=spawnGun();if(g&&g!==shownGun){try{setSoldierGun(ch,g)}catch(e){}shownGun=g}
 plate.querySelector('.g').textContent=(typeof GUNS!=='undefined'&&GUNS[shownGun]?GUNS[shownGun].n:'')}
const nameIn=$('name');const setName=()=>{plate.querySelector('.n').textContent=(nameIn&&nameIn.value||'Soldier').slice(0,14)};if(nameIn)nameIn.addEventListener('input',setName);

// drag to turn (the menu overlay lets pointer events through outside its panels, so they land on the canvas)
R.domElement.addEventListener('pointerdown',e=>{if(!TWL.active)return;drag={x:e.clientX,id:e.pointerId};try{R.domElement.setPointerCapture(e.pointerId)}catch(_){}R.domElement.style.cursor='grabbing'});
addEventListener('pointermove',e=>{if(!drag||!TWL.active)return;const d=e.clientX-drag.x;drag.x=e.clientX;yaw+=d*.012;yawV=d*.012});
addEventListener('pointerup',()=>{if(!drag)return;drag=null;R.domElement.style.cursor=TWL.active?'grab':''});

// ---------------------------------------------------------------- layout: centre the soldier between the panels
let cx=innerWidth/2,narrow=null;
function layout(){const W=innerWidth,H=innerHeight;const nw=W<1000;
 if(nw!==narrow){narrow=nw;if(nw)box.insertBefore(side,keysEl&&keysEl.parentNode===box?keysEl:null);else menu.appendChild(side)}
 const L=box.getBoundingClientRect().right;let Rr=W;if(!nw&&side.offsetParent){const sr=side.getBoundingClientRect();if(sr.height>0&&side.querySelector(':scope>div:not(:empty):not(.twl-hide)'))Rr=sr.left}
 cx=(L+Rr)/2;plate.style.left=L+'px';plate.style.width=(Rr-L)+'px';
 C.aspect=W/H;C.setViewOffset(W,H,W/2-cx,0,W,H);
 // keep the whole soldier in view on short / narrow middles
 const span=Math.max(.1,Rr-L)/W*C.aspect;C.position.z=span<.75?8*.75/span:8}

// ---------------------------------------------------------------- side cards
const escH=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function roomInfo(){const code=typeof roomCode!=='undefined'?roomCode:'';const net=(typeof peer!=='undefined'&&peer)||(typeof hostConn!=='undefined'&&hostConn);
 if(!net||!(code||Object.keys(others||{}).length)){roomCard.classList.add('twl-hide');return}
 let h='<div class="twl-h">Room</div>';if(code)h+='<div class="twl-code">'+escH(code)+'</div><div class="st">Friends type this in Join</div>';
 const L=[[me.name+' (you)',me.team]];for(const id in others)L.push([others[id].name,others[id].team]);
 h+='<div style="margin-top:8px">'+L.map(p=>'<div class="twl-pl"><span>'+escH(p[0])+'</span><span style="color:'+(TC[p[1]]||'#ddd')+'">'+(TN[p[1]]||'')+'</span></div>').join('')+'</div>';
 roomCard.innerHTML=h;roomCard.classList.remove('twl-hide')}
let last=null;
function lastInfo(){if(!last){lastCard.classList.add('twl-hide');return}
 lastCard.innerHTML='<div class="twl-h">Last match</div><div class="twl-big" style="color:'+last.col+'">'+escH(last.head)+'</div><div class="st" style="margin-top:4px">'+escH(last.sub)+'</div>'+
  '<div style="margin-top:8px;font:500 15px var(--hfont);letter-spacing:1px">'+last.k+' kills · '+last.d+' deaths</div>';lastCard.classList.remove('twl-hide')}
function progress(){const P=window.TWP;if(!P)return;try{if(typeof P.renderRank==='function')P.renderRank($('lobbyRank'))}catch(e){console.warn('[lobby] rank',e)}
 try{if(typeof P.renderDaily==='function')P.renderDaily($('lobbyDaily'))}catch(e){console.warn('[lobby] daily',e)}}

// ---------------------------------------------------------------- open / close
const DPR=Math.min(devicePixelRatio,1.5);
function open(){if(TWL.active)return;TWL.active=true;try{R.setPixelRatio(1)}catch(e){}
 if(!ch)buildChar();setGun();setName();roomInfo();lastInfo();progress();layout();R.domElement.style.cursor='grab'}
function close(){if(!TWL.active)return;TWL.active=false;drag=null;R.domElement.style.cursor='';try{R.setPixelRatio(DPR)}catch(e){}}
TWL.open=open;TWL.close=close;TWL.refresh=()=>{if(TWL.active){roomInfo();lastInfo();progress();layout()}};

// ---------------------------------------------------------------- loading screen
let loadT=0,loadF=0,loading=false,loadMin=700;
function showLoad(msg){load.querySelector('.d').textContent=msg||'DEPLOYING';
 if(!loading){load.querySelector('.s').textContent='Tip: '+TIPS[Math.random()*TIPS.length|0];load.querySelector('.c').innerHTML='';loading=true;loadT=performance.now();loadF=0;load.style.display='flex';void load.offsetWidth;load.classList.add('on')}}
function hideLoad(){loading=false;load.classList.remove('on');setTimeout(()=>{if(!loading)load.style.display='none'},380);
 // you clicked Play (pointer lock taken then); if the lock held, no "Click to fight" screen
 if(typeof running!=='undefined'&&running&&document.pointerLockElement===R.domElement)$('pause').style.display='none'}
TWL.loading=()=>loading;

// Play Solo: show the loading screen first, then build the match (bots, guns) behind it
if(solo&&solo.onclick){const orig=solo.onclick;solo.onclick=function(e){if(loading)return;try{R.domElement.requestPointerLock()}catch(_){}
 showLoad('DEPLOYING');requestAnimationFrame(()=>requestAnimationFrame(()=>{try{orig.call(solo,e)}catch(err){console.error(err)}if(menu.style.display!=='none'){hideLoad()}}))}}

// the menu shows / hides through the game's own code (begin(), host left...): follow it
function vis(){return getComputedStyle(menu).display!=='none'}
new MutationObserver(()=>{if(vis())open();else{if(TWL.active){close();
  const code=typeof roomCode!=='undefined'&&roomCode;showLoad(code?'ROOM OPEN':'DEPLOYING');if(code){load.querySelector('.c').innerHTML='Room code<div class="twl-code">'+escH(code)+'</div>Friends type this in Join';loadMin=2200}}}}).observe(menu,{attributes:true,attributeFilter:['style','class']});

// ---------------------------------------------------------------- match over (solo): back to the lobby instead of an automatic rematch
TWL.matchOver=function(){
 if(typeof isHost==='undefined'||!isHost||(typeof peer!=='undefined'&&peer)||(typeof hostConn!=='undefined'&&hostConn))return false; // online keeps its rematch loop
 try{const ffa=RS.mode==='ffa';
  if(ffa){const L=leaderboard(),i=L.findIndex(x=>x.id===me.id);last={head:i===0?'VICTORY':'#'+(i+1)+' OF '+L.length,col:i===0?'#8cff7a':'#f3e3b5',sub:'Free For All · winner '+(L[0]?L[0].n:''),k:me.kills,d:me.deaths}}
  else{const my=RS.sc[me.team],th=RS.sc[1-me.team];last={head:my>th?'VICTORY':my<th?'DEFEAT':'DRAW',col:my>th?'#8cff7a':my<th?'#ff8a7a':'#f3e3b5',sub:(RS.mode==='classic'?'Team Deathmatch':'Bomb Defusal')+' · '+TN[0]+' '+RS.sc[0]+' – '+RS.sc[1]+' '+TN[1],k:me.kills,d:me.deaths}}
 }catch(e){last=null}
 running=false;RS.ph='wait';RS.tl=0;try{document.exitPointerLock()}catch(e){}
 for(const k in keys)keys[k]=false;
 for(const id of['hud','pause','buy','board'])if($(id))$(id).style.display='none';if($('center'))$('center').style.opacity=0;if($('err'))$('err').textContent='';
 menu.style.display='flex';open();return true};

// ---------------------------------------------------------------- per frame (called from the game's frame())
TWL.render=function(dt){
 if(loading){loadF++;if(loadF>3&&performance.now()-loadT>loadMin){loadMin=700;hideLoad()}}
 if(!TWL.active)return false;dt=Math.min(.05,dt||.016);t0+=dt;
 layout();
 if(ch){if(!drag){yaw+=yawV;yawV*=Math.pow(.02,dt);yaw+=(-.62+Math.sin(t0*.25)*.12-yaw)*dt*.15*(Math.abs(yawV)<.002?1:0)}
  ch.rotation.y=Math.PI+yaw;
  try{animSoldier(ch,0,-.55+Math.sin(t0*1.3)*.035,dt,false)}catch(e){}
  if(ch.userData.tag)ch.userData.tag.visible=false;if(ch.userData.pack)ch.userData.pack.visible=false;
  ch.position.y=.07+Math.sin(t0*1.6)*.006}
 // lantern flicker, distant shell flashes on the horizon, drifting embers, a slow camera sway
 lamp.intensity=1.2+Math.sin(t0*13)*.06+Math.sin(t0*7.3)*.08+(Math.random()-.5)*.05;
 if(Math.random()<dt*.35&&flash.intensity<.05){flash.position.x=(Math.random()-.5)*50;flash.intensity=2.2;skyU.fl.value=1}
 flash.intensity*=Math.pow(.02,dt);skyU.fl.value*=Math.pow(.03,dt);
 const a=EMB.geometry.attributes.position;for(let i=0;i<a.count;i++){let y=a.getY(i)+dt*(.06+(i%5)*.02),x=a.getX(i)+Math.sin(t0*.7+i)*dt*.08;if(y>3.3){y=0;x=(Math.random()-.5)*7}a.setX(i,x);a.setY(i,y)}a.needsUpdate=true;
 C.position.x=Math.sin(t0*.21)*.12;C.position.y=1.45+Math.sin(t0*.33)*.04;C.lookAt(0,1.05,0);
 R.render(S,C);return true};

addEventListener('resize',()=>{if(TWL.active)layout()});
if(vis())open();
})();
