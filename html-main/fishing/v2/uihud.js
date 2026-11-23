// Fishing Unblocked UI layer (loaded right after the page's main script; uses its globals).
// - one queued banner slot (plated) + the catch card, so pop-ups never stack
// - plated event/hunt announcements, event/hunt timer chips, the radar card
// - body state classes (st-reel, st-boat, st-win, st-dlg) the CSS uses to hide or dim things
// - the boat strip (speed, heading, nearest island)
(function(){'use strict';
var $=function(id){return document.getElementById(id);};
var IC=function(n,s){return window.FICON?FICON(n,s):'';};
var ST=function(t){return window.FICON?FICON.strip(t):t;};

/* ---------------- ONE top-centre slot: every plate (your catch card, event/hunt news, messages) queues here ----------------
   Your own catch card always goes first: it jumps the queue and pushes whatever is showing back into it.
   While a window, dialog or the menu is open the slot is hidden and its timer is held, so nothing is missed. */
var BQ=[],cur=null,curAt=0;
function show(){var b=$('banner');cur=BQ.shift()||null;document.body.classList.toggle('pl-on',!!cur);if(!cur){b.classList.remove('on');return;}
 b.className='';b.classList.add('k-'+cur.k);b.style.color='';b.style.opacity='';
 b.innerHTML=cur.html;void b.offsetWidth;b.classList.add('on');curAt=performance.now();bannerT=cur.d;}
window.bannerDone=function(){var b=$('banner');b.classList.remove('on');cur=null;document.body.classList.remove('pl-on');setTimeout(function(){if(bannerT<=0&&!cur)show();},380);};
function push(it,first){if(first)BQ.unshift(it);else BQ.push(it);if(BQ.length>6)BQ.splice(6);
 if(!cur||bannerT<=0){show();return;}
 if(first&&cur.k!=='card'){cur.d=Math.min(Math.max(bannerT,1.5),3);BQ.splice(1,0,cur);show();}}
function plate(ac,ico,title,sub,cls){return '<div class="pl'+(cls?' '+cls:'')+'" style="--ac:'+ac+'"><span class="pl-ico">'+ico+'</span><div class="pl-tx"><div class="pl-t">'+title+'</div>'+(sub?'<div class="pl-s">'+sub+'</div>':'')+'</div></div>';}
function icoFor(col){col=String(col||'').toLowerCase();return col==='#ff6a5a'?'warning':col==='#ff9a2a'?'flame':col==='#ffe066'?'star':'event';}
window.banner=function(h,col,dur){h=ST(String(h||''));var parts=h.split(/<br\s*\/?>/i),t=parts[0],sub=parts.slice(1).join(' ').replace(/<[^>]*>/g,'').trim();
 col=col||'#ffd27a';push({k:'msg',d:dur||3.6,html:plate(col,IC(icoFor(col),24),'<b>'+t+'</b>',esc(sub))});};

window.catchCard=function(f,o){o=o||{};var r=rarOf(f),col=RCOL[r]||'#fff',F=FISH[f.i]||[],b=[];
 if(f.sh)b.push('<span class="cc-bd sh">'+IC('event',11)+'Shiny</span>');
 if(f.m&&MUT[f.m])b.push('<span class="cc-bd mu" style="--mc:'+MUT[f.m].c+'">'+esc(MUT[f.m].n)+' ×'+MUT[f.m].x+'</span>');
 if(F.giant)b.push('<span class="cc-bd gi">Giant</span>');
 if(o.first)b.push('<span class="cc-bd new">New</span>');
 // stat line: every stat is its own unbreakable chip; the "·" is drawn before each one (CSS), so no separator ends a line
 var SP=function(h,c){return '<span class="st'+(c?' '+c:'')+'">'+h+'</span>';};
 var ach=(o.rec?SP(IC('trophy',12)+' New record','cc-rec'):'')+(o.perfect?SP('Perfect catch','cc-pf'):'');
 var html='<div class="pl cc" style="--ac:'+col+'"><span class="pl-ico cc-img"><img alt="" src="'+fishIcon(f.i,f.sh)+'"></span><div class="pl-tx">'+
  '<div class="cc-top"><span class="cc-k">You caught</span><span class="rtag" style="--rc:'+col+'">'+(RAR[r]||'')+'</span>'+b.join('')+'</div>'+
  '<div class="pl-t cc-n">'+esc(F[0]||fishName(f))+'</div><div class="pl-s cc-s">'+SP('<b>'+f.kg+' kg</b>')+SP(sizeName(f))+SP('<b class="cc-v">'+fmt(f.v)+'</b>')+
  ach+(o.xp?SP('+'+o.xp+' XP','cc-x'):'')+(S.streak>1?SP('Streak '+S.streak,'cc-x'):'')+'<span class="st cc-x cc-bux" hidden></span></div></div></div>';
 push({k:'card',d:o.big?3.8:3,html:html},true);};
// bux.js folds its "+N Bux" into your card while it shows (or into the card still waiting in the queue)
window.catchCardBux=function(n){n=n|0;
 if(BQ.length&&BQ[0].k==='card'){var it0=BQ[0];it0.bux=(it0.bux||0)+n;it0.html=it0.html.replace(/<span class="st cc-x cc-bux"[^>]*>[^<]*<\/span>/,'<span class="st cc-x cc-bux">+'+it0.bux.toLocaleString()+' Bux</span>');return true;}
 if(cur&&cur.k==='card'&&performance.now()-curAt<2600){cur.bux=(cur.bux||0)+n;var sp=$('banner').querySelector('.cc-bux');if(sp){sp.hidden=false;sp.textContent='+'+cur.bux.toLocaleString()+' Bux';}return true;}
 for(var i=0;i<BQ.length;i++)if(BQ[i].k==='card'){var it=BQ[i];it.bux=(it.bux||0)+n;it.html=it.html.replace(/<span class="st cc-x cc-bux"[^>]*>[^<]*<\/span>/,'<span class="st cc-x cc-bux">+'+it.bux.toLocaleString()+' Bux</span>');return true;}
 return false;};

/* event / hunt news: the same plate in the same slot */
annEl.id='annBox';annEl.style.cssText='display:none';
var EVI={surge:['fish','#ffd54a'],whirlpool:['sea','#7fd8ff'],meteor:['event','#ffd27a'],aurora:['aurora','#78ffc8'],bloodtide:['warning','#ff4a3d']};
window.bigAnnounce=function(pre,name,post,sub,o){o=o||{};var t=esc(ST(pre||''))+'<b>'+esc(ST(name||''))+'</b>'+esc(ST(post||''));
 push({k:'ann',d:o.d||5.5,html:plate(o.col||'#ec2a21',IC(o.ico||'event',24),t,esc(ST(sub||'')),o.kind)});};
window.annNext=function(){};
function where(x,z){if(!isFinite(x)||!isFinite(z))return '';var B=BIOMES[biomeAt(x,z)];if(!B||B.hidden)return '';var d=Math.hypot(x-B.c[0],z-B.c[1]);
 return d<B.R*1.3?' near '+B.n:', '+dirLong(x-B.c[0],z-B.c[1])+' of '+B.n;}
function dirLong(dx,dz){return ['north','northeast','east','southeast','south','southwest','west','northwest'][((Math.round(Math.atan2(dx,-dz)*180/Math.PI/45)%8)+8)%8];}
var HICO={angler:'lantern',duke:'crown',ridgeback:'fin',ironcoil:'coil',thunderhide:'storm',kelpwood:'kelp',rimetusk:'tusk',gravekeel:'anchor',cinderspine:'flame',gloomwarden:'skull'};
window.HUNT_ICO=HICO;
function cap(t){return t?t.charAt(0).toUpperCase()+t.slice(1):t;}
function whereSub(x,z){return cap(where(x,z).replace(/^, /,'').replace(/^ /,''));}
window.annHunt=function(h){var n=h.n||'A sea creature',sub={angler:'Find it before dawn!',duke:'It only comes once in a hundred nights!',ridgeback:'Catch it before it dives!',ironcoil:'Its iron scales will test your rod!',thunderhide:'Brave the storm and reel it in!'}[h.kind]||'Be the first to catch it!';
 if(h.summoned){bigAnnounce('You called up the ',n,'','It stays for 6 minutes. Make it count!',{ico:HICO[h.kind]||'hunt',col:'#ffb020',kind:'hu'});return;}
 var w=whereSub(h.x,h.z);bigAnnounce('',n,' has surfaced',(w?w+' · ':'')+sub,{ico:HICO[h.kind]||'hunt',col:'#ff4a3d',kind:'hu'});};
window.annEvent=function(ev){var W=ev.x!==undefined&&ev.x!==null?whereSub(ev.x,ev.z):'',isl=ev.isl&&BIOMES.find(function(b){return b.id===ev.isl;}),e=EVI[ev.id]||['event','#ffd54a'];
 var A=({surge:['A ',' has hit '+(isl?isl.n:'an island')+'!','Rare fish crowd its shores. Luck ×2!'],whirlpool:['A ',' is churning!',(W?W+' · ':'')+'Strange fish circle inside it!'],meteor:['',' has begun!','Cast into open water for star-touched fish!'],
  aurora:['An ',' lights up the sky!','Luck ×6 everywhere while it lasts!'],bloodtide:['A ',' is spreading!',(W?W+' · ':'')+'Dangerous rare fish hunt in the red water!']})[ev.id]||['A ',' has begun!',''];
 bigAnnounce(A[0],ev.n,A[1],A[2],{ico:e[0],col:e[1],kind:'ev'});};

/* ---------------- event / hunt chips + radar card ---------------- */
var chips=document.createElement('div');chips.id='evChips';document.body.appendChild(chips);
function shortN(n){n=String(n||'').replace(/^(The|A|An)\s+/i,'');var w=n.split(/\s+/);if(n.length<=12)return n;if(w[0].length<=12&&w[0].length>=4)return w[0];return n.slice(0,11).trim()+'\u2026';}
function mmss(ms){ms=Math.max(0,ms);var s=Math.round(ms/1000),m=Math.floor(s/60);return m+':'+('0'+(s%60)).slice(-2);}
function tick(){if(typeof started==='undefined'||!started){chips.innerHTML='';return;}var h='',now=NOW(),px=me.pos.x,pz=me.pos.z;
 try{(window.FE&&FE.now()||[]).forEach(function(ev){var e=EVI[ev.id]||['event','#ffd54a'];h+='<span class="evc" style="--ec:'+e[1]+'" title="'+esc(ev.n)+'">'+IC(e[0],13)+'<b>'+esc(ev.n)+'</b><em>'+esc(shortN(ev.n))+'</em><i>'+mmss(ev.until-Date.now())+'</i></span>';});}catch(e){}
 try{(window.FHUNT&&FHUNT.list(now)||[]).forEach(function(k){if((S.huntDone||{})[k.key])return;var dx=k.x-px,dz=k.z-pz,d=Math.hypot(dx,dz),arr='';
  if(S.radar&&isFinite(d)){var a=Math.atan2(dx,dz)-(camYaw+Math.PI);arr='<span class="evd"><span class="eva" style="transform:rotate('+(-a)+'rad)">'+IC('arrow',12)+'</span>'+(d<=k.r?'here':Math.round(d)+' m')+'</span>';}
  h+='<span class="evc hu" style="--ec:#ff6a5a" title="'+esc(k.n)+'">'+IC(HICO[k.kind]||'hunt',13)+'<b>'+esc(k.n)+'</b><em>'+esc(shortN(k.n))+'</em>'+(!S.radar&&FHUNT.whereText?'<span class="evw">'+esc(FHUNT.whereText(k.x,k.z))+'</span>':'')+arr+'<i>'+mmss(k.until-now)+'</i></span>';});}catch(e){}
 if(chips._h!==h){chips._h=h;chips.innerHTML=h;chips.classList.toggle('many',chips.children.length>2);}
 if(typeof radarEl!=='undefined')radar();}
function radar(){if(!S.radar){radarEl.style.display='none';return;}var L=[],now=NOW(),px=me.pos.x,pz=me.pos.z;
 try{(FHUNT.list(now)||[]).forEach(function(k){var dx=k.x-px,dz=k.z-pz,d=Math.hypot(dx,dz),c=(S.huntDone||{})[k.key];
  L.push('<div class="rl"><b>'+esc(k.n)+'</b>'+(c?' · caught':'')+'</div><div class="rs">'+(d<=k.r?'You are inside its ring. Cast now!':Math.round(d)+' m '+dirLong(dx,dz)+', inside the churning ring')+'</div><div class="rs rt">'+mmss(k.until-now)+' left</div>');});}catch(e){}
 if(S.radarFish){var i=FISH.findIndex(function(F){return F.id===S.radarFish;});var sc=SCH.list.find(function(s){return s.fav===i;});
  if(i>=0)L.push('<div class="rl"><b>'+esc(FISH[i][0])+'</b></div><div class="rs">'+(sc?'Abundant at a school near '+esc(BIOMES[sc.bi].n)+' · '+Math.round(Math.hypot(sc.x-px,sc.z-pz))+' m '+dirLong(sc.x-px,sc.z-pz):'Not abundant anywhere right now (schools move every 3 min)')+'</div>');}
 var html='<div class="rh">'+IC('radar',14)+' Radar</div>'+(L.length?L.join(''):'<div class="rs">Nothing unusual on the sea.</div>');
 if(radarEl._h!==html){radarEl._h=html;radarEl.innerHTML=html;}radarEl.style.display='block';}
window.radarHud=function(){};
setInterval(function(){try{tick();}catch(e){}},1000);

/* ---------------- shop rod rows: icon, mini stat bars vs equipped, odds behind a toggle ---------------- */
var SST=[['luck','Luck',0,3,function(v){return +v?'+'+(+v).toFixed(1):'Base';},'#7ee36f'],['pow','Power',1,4.5,function(v){return (+v).toFixed(1);},'#ff8a5c'],
 ['zone','Reel bar',.18,.42,function(v){return Math.round(v*100)+'%';},'#2fd3c0'],['cast','Cast',9,32,function(v){return Math.round(v)+'m';},'#6fb6ff'],
 ['spd','Bite speed',0,.45,function(v){return '+'+Math.round(v*100)+'%';},'#ffd25a'],['ctl','Control',0,1,function(v){return Math.round(v*100)+'%';},'#c79bff']];
window.SHOP_STATS=SST;
window.shopRod=function(r,od,own){var cur=ROD(),eq=S.rod===r.id,col='#'+(((r.col||0)>>>0).toString(16)).padStart(6,'0').slice(-6),h='';
 SST.forEach(function(s){var v=+r[s[0]]||0,c=+cur[s[0]]||0,p=Math.max(0,Math.min(1,(v-s[2])/(s[3]-s[2]))),d=v-c,cl=eq||Math.abs(d)<1e-6?'':d>0?' up':' dn';
  h+='<span class="ms-l">'+s[1]+'</span><span class="sbar" style="--sc:'+s[5]+'"><b style="width:'+(p*100).toFixed(1)+'%"></b></span><em class="ms-v'+cl+'">'+s[4](v)+'</em>';});
 var lv=r.lvl?'<span class="lvt'+(level()>=r.lvl?' ok':'')+'">Lv '+r.lvl+'</span>':'';
 var btn=eq?'<span class="eqb">'+IC('check',14)+' Equipped</span>':own?'<button class="btn r" data-eq="'+r.id+'">Equip</button>':
  level()<(r.lvl||0)?'<button class="btn g" disabled>Needs Lv '+r.lvl+'</button>':
  '<span class="buy"><button class="btn g" data-buy="'+r.id+'" '+(S.money>=r.p?'':'disabled')+'>'+fmt(r.p)+'</button>'+(S.money<r.p?'<small class="need">Need '+fmt(r.p-S.money)+' more</small>':'')+'</span>';
 return '<div class="srod'+(eq?' eq':'')+'"><div class="sw" style="--rod:'+col+'"><i></i></div><div class="sr-b"><div class="sr-n"><b>'+esc(r.n)+'</b>'+lv+'</div>'+
  (r.t?'<div class="sr-t">'+esc(r.t)+'</div>':'')+'<div class="ms">'+h+'</div>'+(r.passive?'<div class="sr-p">'+IC('star',13)+' '+esc(r.passive.desc)+'</div>':'')+
  '<details class="sr-od"><summary title="Rare fish odds on this island">'+IC('info',13)+' Odds</summary><div>Legendary '+oneIn(od[4])+' · Mythic '+oneIn(od[5])+' · Secret '+oneIn(od[7])+' on this island</div></details></div><div class="sr-a">'+btn+'</div></div>';};

/* ---------------- body state classes + boat strip ---------------- */
if(typeof softHint!=='undefined')softHint.id='softHint';
var bh=document.createElement('div');bh.id='boatHud';bh.innerHTML='<span class="bh-spd"><i>'+IC('boat',15)+'</i><span class="bh-bar"><b></b></span><em>0 kn</em></span><span class="bh-hd">'+IC('compass',15)+'<b>N</b></span><span class="bh-isl"></span>';document.body.appendChild(bh);
var cls={},bt=0,sailT=0;function set(k,on){if(cls[k]===on)return;cls[k]=on;document.body.classList.toggle(k,on);}
var held=null,shopBtn=document.querySelector('#bar .btn[data-w="shop"]');
UPD.push(function(t,dt){var st=typeof started!=='undefined'&&started;set('st-reel',st&&(me.state==='reel'));set('st-boat',st&&!!me.inBoat);
 var w=false;try{w=anyWin();}catch(e){}set('st-win',w);var d=false;try{d=!!(window.FN&&FN.isOpen&&FN.isOpen());}catch(e){}set('st-dlg',d);
 var m=false;try{m=!!(window.FUX&&FUX.menu&&FUX.menu.isOpen());}catch(e){}set('st-menu',m);
 // one layering rule: a window, dialog or the menu hides the top-centre slot, the chips and the tutorial card; the slot's timer waits
 var blk=w||d||m;set('st-cover',blk);
 if(blk){if(held===null&&bannerT>0)held=bannerT;if(held!==null)bannerT=Math.max(bannerT,.5);}else if(held!==null){bannerT=held;held=null;}
 var who=$('ft-who');if(who&&who.textContent==='Harbor Guide')who.textContent='Juni · Island Guide';var ftc=$('ft-count'),ftt=$('ft-title');if(ftc&&ftt){var nn=ftc.textContent.replace(/\s+/g,'');if(ftt.getAttribute('data-n')!==nn)ftt.setAttribute('data-n',nn);}
 if(shopBtn){var tt=me.inBoat?'Get off the boat to shop':'Shop (E)';if(shopBtn.title!==tt)shopBtn.title=tt;}
 if(!me.inBoat){set('st-sailing',false);sailT=0;return;}
 var vv=Math.abs(boat.v||0);sailT=vv>2.5?sailT+(dt||.016):vv<1?0:sailT;set('st-sailing',sailT>4);
 if((bt-=dt||.016)>0)return;bt=.2;var B=BOATS[S.boat]||{spd:16},v=Math.abs(boat.v||0),fx=Math.sin(boat.yaw),fz=Math.cos(boat.yaw);
 bh.querySelector('.bh-bar b').style.width=Math.min(100,v/(B.spd*1.35)*100)+'%';bh.querySelector('em').textContent=Math.round(v*1.94)+' kn';
 var deg=Math.round(((Math.atan2(fx,-fz)*180/Math.PI)+360)%360);bh.querySelector('.bh-hd b').textContent=dirName(fx,fz)+' '+deg+'°';
 var best=null,bd=1e9;BIOMES.forEach(function(I){if(I.hidden||I.secret||(window.FW&&FW.byId&&FW.byId[I.id]&&FW.byId[I.id].secret))return;var dd=Math.hypot(I.c[0]-me.pos.x,I.c[1]-me.pos.z)-I.R;if(dd<20)return;if(dd<bd){bd=dd;best=I;}});
 // the island pill already names where you are: the strip points to the next island instead
 var s=best?best.n+' · '+Math.round(bd)+' m '+dirName(best.c[0]-me.pos.x,best.c[1]-me.pos.z):'';var ie=bh.querySelector('.bh-isl');if(ie.textContent!==s)ie.innerHTML=IC('island',15)+esc(s);});
})();
// windows: drop the "more below" chevron once the list is scrolled to its end (or fits)
(function(){function chk(w){if(!w||!w.classList)return;var o=w.scrollHeight-w.clientHeight;w.classList.toggle('at-end',o<=34||w.scrollTop>=o-6);}/* the chevron pseudo adds ~26px: a window that only overflows by that fits */
document.addEventListener('scroll',function(e){if(e.target&&e.target.classList&&e.target.classList.contains('win'))chk(e.target);},true);
setInterval(function(){document.querySelectorAll('.win').forEach(function(w){if(w.offsetParent)chk(w);});},400);})();
// another player's catch, in the world: a screen-sized plate (like the name tags) just above that player's tag.
// Fish name in the rarity colour, kg in white, 2 px rarity border; Epic+ (rarity 4 and up) gets a rarity chip, 1.2x and a pop.
window.FLOAT3D=function(av,f,r){try{
 if(!av||!av.g)return false;var D=2,col=RCOL[r]||'#fff',big=r>=4,nm=(FISH[f.i]&&FISH[f.i][0])||fishName(f),kg=f.kg+' kg';
 nm=window.FICON?FICON.strip(nm):nm;
 var c=document.createElement('canvas'),x=c.getContext('2d'),FF='"Source Sans Pro","Segoe UI",Arial,sans-serif',fs=15*D,pad=10*D,h=32*D,gap=7*D;
 var fN='700 '+fs+'px '+FF,fK='600 '+fs+'px '+FF,fC='800 '+(10.5*D)+'px '+FF,chip=big?String(RAR[r]||'').toUpperCase():'';
 x.font=fC;var cw=chip?Math.ceil(x.measureText(chip).width)+12*D:0;x.font=fN;var nw=Math.ceil(x.measureText(nm).width);x.font=fK;var kw=Math.ceil(x.measureText(kg).width);
 var w=pad*2+(cw?cw+gap:0)+nw+gap+kw;c.width=w;c.height=h;
 var rr=function(X,Y,W,H,R){x.beginPath();x.moveTo(X+R,Y);x.arcTo(X+W,Y,X+W,Y+H,R);x.arcTo(X+W,Y+H,X,Y+H,R);x.arcTo(X,Y+H,X,Y,R);x.arcTo(X,Y,X+W,Y,R);x.closePath();};
 rr(D,D,w-2*D,h-2*D,9*D);x.fillStyle='rgba(12,14,18,.93)';x.fill();x.lineWidth=2*D;x.strokeStyle=col;x.stroke();
 x.textBaseline='middle';x.textAlign='left';var X=pad,Y=h/2+D*.5;
 if(cw){rr(X,h/2-9*D,cw,18*D,5*D);x.fillStyle=col;x.fill();x.font=fC;x.fillStyle='#14171c';x.textAlign='center';x.fillText(chip,X+cw/2,Y);x.textAlign='left';X+=cw+gap;}
 x.font=fN;x.fillStyle=col;x.fillText(nm,X,Y);X+=nw+gap;x.font=fK;x.fillStyle='#fff';x.fillText(kg,X,Y);
 var t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.minFilter=THREE.LinearFilter;t.generateMipmaps=false;t.isLabel=true;
 var s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthTest:false,depthWrite:false,transparent:true,toneMapped:false,sizeAttenuation:false}));
 s.renderOrder=13;s.frustumCulled=false;
 var tg=av.label&&av.label.userData&&av.label.userData.hc&&av.label.parent?av.label:null,tagH=tg?tg.userData.hc:0,wc=w/D,hc=h/D;
 if(tg)tg.getWorldPosition(s.position);else{s.position.copy(av.g.position);s.position.y+=4.3*(av.g.scale.y||1);}
  var H=(renderer.domElement&&renderer.domElement.clientHeight)||innerHeight||700,k=2*Math.tan(camera.fov*Math.PI/360)/Math.max(200,H),sc=big?1.2:1;
 s.center.set(.5,-(tagH+5)/(hc*sc));s.userData={wc:wc,hc:hc,sc:sc,cv:c,h0:hc*k*sc};s.scale.set(wc*k*sc,hc*k*sc,1);scene.add(s);av._float=s;
 av._floatH=(hc*sc)+5;av._floatUntil=performance.now()+3500; // chat bubbles sit above it while it shows
 FX.push({m:s,t:0,life:3.5,kind:'fs',w:wc*k*sc,h:hc*k*sc,pop:big});return true;}catch(e){return false;}};
