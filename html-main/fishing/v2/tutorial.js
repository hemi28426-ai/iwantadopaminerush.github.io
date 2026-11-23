/* Fishing v2 tutorial: window.FT. DOM/CSS only. See CONTRACT §8.
   FT.start({camera,getTarget(stepId)->THREE.Vector3|null,onDone?}), FT.on(evt,data), FT.active(), FT.skip(), FT.restart(), FT.step() */
(function(){
'use strict';
var STEPS=[
 {id:'welcome',ico:'',t:'Welcome to Driftwood Harbor',s:'I\'m the harbor guide. Let me show you how to fish, sell and set sail.',btn:'Let\'s go',ev:[]},
 {id:'move',ico:'',t:'Look around and move',s:'Use W A S D to walk and drag with the right mouse button to look around.',key:'WASD + right-drag',ev:['move']},
 {id:'water',ico:'',t:'Walk to the water',s:'Follow the arrow down to the pier and stand at the water\'s edge.',near:{id:'water',d:14},ev:['cast']},
 {id:'cast',ico:'',t:'Cast your line',s:'Hold left-click to charge the power bar, then let go. A full bar gives +50% luck.',key:'Hold left-click',ev:['cast']},
 {id:'lure',ico:'',t:'Wait for a bite',s:'Stay patient while the bobber floats. When it dips and shakes, a fish is on the hook.',ev:['bite']},
 {id:'reel',ico:'',t:'Reel it in',s:'Hold click or Space to push the white bar right, let go and it slides back left. Keep the fish inside the bar until the meter fills.',key:'Hold = move right',ev:['catch','miss'],miss:3},
 {id:'book',ico:'',t:'Check your Fish Book',s:'Every catch is recorded with its size and rarity. Press K to open the book.',key:'K',ev:['openBook']},
 {id:'sell',ico:'',t:'Sell your catch',s:'Walk to the shop counter and press E to sell the fish in your bag.',key:'E at the shop',ev:['sell']},
 {id:'buyRod',ico:'',t:'Buy a better rod',s:'Rods improve luck, strength and reel zone. Pick one you can afford from the shop.',ev:['buyRod']},
 {id:'equipRod',ico:'',t:'Equip your new rod',s:'Press R to open your rods and equip the one you just bought.',key:'R',ev:['equipRod']},
 {id:'angler',ico:'',t:'Meet the Angler',s:'The old Angler in the hut offers a fresh quest every ten minutes. Say hello.',ev:['talk:angler']},
 {id:'boat',ico:'',t:'Get a boat',s:'The harbormaster sells boats. Buy one and board it with B.',key:'B',ev:['boat']},
 {id:'island',ico:'',t:'Sail to another island',s:'Steer out to sea. Every island has its own fish, secrets and people. Check the map with M.',key:'M map',ev:['island:*']},
 {id:'done',ico:'',t:'You\'re a fisher now!',s:'That\'s everything. The sea is big and full of secrets. Good luck out there!',btn:'Start fishing',ev:[],final:true}
];
var LABEL={water:'Pier',sell:'Shop counter',buyRod:'Shop counter',equipRod:'Shop counter',angler:'The Angler',boat:'Harbormaster',island:'Coral Lagoon'};
var S0={camera:null,getTarget:null,onDone:null},running=false,el={},cur=0,missCount=0,poll=0,raf=0,tmp=null,hideT=0,confirmT=0,lastKey='';

function save(){try{if(typeof S!=='undefined'){S.tut={i:cur,done:!running&&cur>=STEPS.length-1||!!(S.tut&&S.tut.done),skipped:!!(S.tut&&S.tut.skipped)};}}catch(e){}}
function st(){try{if(typeof S!=='undefined'){return S.tut||(S.tut={i:0,done:false});}}catch(e){}return window.__ftS||(window.__ftS={i:0,done:false});}
function mk(tag,cls,parent,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;if(parent)parent.appendChild(e);return e;}

function css(){
 if(document.getElementById('ft-css'))return;
 var c=document.createElement('style');c.id='ft-css';
 c.textContent=
 '#ft-panel{position:fixed;left:50%;top:14px;transform:translateX(-50%);width:min(440px,calc(100vw - 20px));box-sizing:border-box;z-index:9000;font:14px/1.4 system-ui,Segoe UI,Arial,sans-serif;color:#eaf6f8;background:linear-gradient(#17394a,#10283a);border:2px solid #f4c95d;border-radius:12px;padding:10px 12px 9px;box-shadow:0 4px 14px rgba(0,0,0,.5);pointer-events:auto;transition:opacity .25s,transform .25s}'+
 '#ft-panel.ft-hide{opacity:0;transform:translateX(-50%) translateY(-12px);pointer-events:none}'+
 '#ft-panel.ft-pop{animation:ftpop .35s ease-out}'+
 '@keyframes ftpop{0%{transform:translateX(-50%) scale(.94)}60%{transform:translateX(-50%) scale(1.02)}100%{transform:translateX(-50%) scale(1)}}'+
 '#ft-head{display:flex;align-items:center;gap:9px}'+
 '#ft-ico{flex:none;width:38px;height:38px;border-radius:50%;background:#f4c95d;color:#10283a;display:flex;align-items:center;justify-content:center;font-size:21px}'+
 '#ft-who{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#f4c95d;font-weight:700}'+
 '#ft-title{font-size:16px;font-weight:700;color:#fff}'+
 '#ft-text{margin:7px 0 0;color:#d4e9ee}'+
 '#ft-key{display:inline-block;margin-top:7px;padding:2px 9px;border-radius:6px;background:#0a1a26;border:1px solid #6fb7c9;color:#ffe9a8;font:700 12px ui-monospace,Consolas,monospace}'+
 '#ft-foot{display:flex;align-items:center;gap:10px;margin-top:9px}'+
 '#ft-dots{display:flex;gap:4px;flex:1;flex-wrap:wrap}'+
 '#ft-dots i{width:8px;height:8px;border-radius:50%;background:#35596b}'+
 '#ft-dots i.d{background:#f4c95d}#ft-dots i.c{background:#fff;box-shadow:0 0 0 2px #f4c95d}'+
 '#ft-count{font-size:11px;color:#8fb6c2;white-space:nowrap}'+
 '.ft-btn{font:700 13px system-ui,Arial,sans-serif;border:0;border-radius:7px;padding:6px 13px;cursor:pointer;min-height:30px}'+
 '#ft-next{background:#f4c95d;color:#10283a}#ft-next:hover{background:#ffdc82}'+
 '#ft-skip{background:transparent;color:#9fc4cf;border:1px solid #4a7385}#ft-skip:hover{color:#fff;border-color:#9fc4cf}#ft-skip.ft-sure{background:#b4443a;border-color:#b4443a;color:#fff}'+
 '#ft-arrow{position:fixed;left:0;top:0;width:0;height:0;z-index:8999;pointer-events:none;display:none;will-change:transform}'+
 '#ft-arrow .ft-a{position:absolute;left:-22px;top:-22px;width:44px;height:44px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.6))}'+
 '#ft-arrow svg{width:44px;height:44px;display:block}'+
 '#ft-arrow.ft-on .ft-a{animation:ftbob .9s ease-in-out infinite}'+
 '@keyframes ftbob{0%,100%{margin-top:0}50%{margin-top:9px}}'+
 '#ft-dist{position:absolute;left:-30px;top:24px;width:60px;text-align:center;font:700 12px system-ui,Arial,sans-serif;color:#fff;background:rgba(10,26,38,.85);border-radius:9px;padding:1px 0;white-space:nowrap}'+
 '@media (max-width:520px){#ft-panel{top:6px;padding:8px 10px}#ft-title{font-size:15px}#ft-text{font-size:13px}}';
 document.head.appendChild(c);
}

function build(){
 if(el.panel)return;
 css();
 var p=el.panel=mk('div','',document.body);p.id='ft-panel';p.className='ft-hide';
 var h=mk('div','',p);h.id='ft-head';
 el.ico=mk('div','',h);el.ico.id='ft-ico';
 var tw=mk('div','',h);el.who=mk('div','',tw,'Harbor Guide');el.who.id='ft-who';el.title=mk('div','',tw);el.title.id='ft-title';
 el.text=mk('p','',p);el.text.id='ft-text';
 el.key=mk('span','',p);el.key.id='ft-key';
 var f=mk('div','',p);f.id='ft-foot';
 var d=el.dots=mk('div','',f);d.id='ft-dots';el.dotEls=[];
 for(var i=0;i<STEPS.length;i++)el.dotEls.push(mk('i','',d));
 el.count=mk('span','',f);el.count.id='ft-count';
 el.next=mk('button','ft-btn',f,'Next');el.next.id='ft-next';
 el.skip=mk('button','ft-btn',f,'Skip tutorial');el.skip.id='ft-skip';
 el.next.onclick=function(){var s=STEPS[cur];if(s.final)finish(false);else go(cur+1);};
 el.skip.onclick=function(){
   if(el.skip.className.indexOf('ft-sure')<0){el.skip.className='ft-btn ft-sure';el.skip.textContent='Really skip?';clearTimeout(confirmT);confirmT=setTimeout(resetSkip,3000);}
   else{FT.skip();}
 };
 var a=el.arrow=mk('div','',document.body);a.id='ft-arrow';
 var w=mk('div','ft-a',a);
 w.innerHTML='<svg viewBox="0 0 44 44"><path d="M22 40 L6 18 L15 18 L15 4 L29 4 L29 18 L38 18 Z" fill="#f4c95d" stroke="#10283a" stroke-width="3" stroke-linejoin="round"/></svg>';
 el.aw=w;el.dist=mk('div','',a);el.dist.id='ft-dist';
}
function resetSkip(){if(!el.skip)return;el.skip.className='ft-btn';el.skip.textContent='Skip tutorial';}

function render(pop){
 var s=STEPS[cur];resetSkip();
 el.ico.textContent=s.ico;el.title.textContent=s.t;el.text.textContent=s.s;
 el.key.style.display=s.key?'':'none';el.key.textContent=s.key||'';
 el.next.style.display=s.btn?'':'none';el.next.textContent=s.btn||'';
 el.skip.style.display=s.final?'none':'';
 for(var i=0;i<el.dotEls.length;i++)el.dotEls[i].className=i<cur?'d':i===cur?'c':'';
 el.count.textContent=(cur+1)+' / '+STEPS.length;
 el.panel.className=pop?'ft-pop':'';
 if(pop){var pn=el.panel;setTimeout(function(){if(pn.className==='ft-pop')pn.className='';},400);}
}

function go(i){
 if(i>=STEPS.length)i=STEPS.length-1;
 cur=i;missCount=0;save();
 if(i===STEPS.length-1){var t=st();t.done=true;}
 render(true);
 if(STEPS[cur].final){clearTimeout(hideT);hideT=setTimeout(function(){if(running&&cur===STEPS.length-1)finish(false);},12000);}
}
function finish(skipped){
 var t=st();t.done=true;t.skipped=!!skipped;t.i=cur;
 running=false;clearTimeout(hideT);clearTimeout(confirmT);
 try{document.body.classList.add('ft-done');}catch(e){}
 if(el.panel){el.panel.className='ft-hide';resetSkip();}if(el.arrow){el.arrow.style.display='none';el.arrow.className='';}
 stopLoop();
 if(S0.onDone)try{S0.onDone(!!skipped);}catch(e){}
}
function evMatches(pat,evt){return pat===evt||(pat.slice(-2)===':*'&&evt.indexOf(pat.slice(0,-1))===0&&evt!=='island:harbor');}

function startLoop(){if(!raf&&typeof requestAnimationFrame!=='undefined'){var n=0;(function f(){raf=requestAnimationFrame(f);if((++n&1)===0)frame();})();}}
function stopLoop(){if(raf){cancelAnimationFrame(raf);raf=0;}}

function frame(){
 if(!running||!S0.camera){if(el.arrow&&el.arrow.style.display!=='none')el.arrow.style.display='none';return;}
 var s=STEPS[cur],T=S0.getTarget?S0.getTarget(s.id):null,a=el.arrow;
 if(!T||s.final||!el.panel||cur===0){a.style.display='none';return;}
 var cam=S0.camera;
 if(!tmp)tmp=new THREE.Vector3();
 var dx=T.x-cam.position.x,dz=T.z-cam.position.z,dist=Math.sqrt(dx*dx+dz*dz);
 if(s.near&&dist<s.near.d&&Date.now()-poll>600){poll=Date.now();go(cur+1);return;}
 tmp.copy(T).project(cam);
 var W=window.innerWidth,H=window.innerHeight,x=(tmp.x*.5+.5)*W,y=(-tmp.y*.5+.5)*H,behind=tmp.z>1,m=70,top=m+(el.panel.offsetHeight||90)+16;
 var inside=!behind&&x>m&&x<W-m&&y>top&&y<H-m,rot=0;
 if(inside){y-=34;rot=0;}
 else{
  var cx=W/2,cy=H/2,vx=x-cx,vy=y-cy;if(behind){tmp.copy(T).applyMatrix4(cam.matrixWorldInverse);vx=tmp.x;vy=-tmp.y;if(Math.abs(vx)+Math.abs(vy)<1e-3)vy=1;if(Math.abs(vx)<.5)vx=vx<0?-.5:.5;}
  var sx=vx!==0?((W/2-m)/Math.abs(vx)):1e9,sy=vy!==0?((H/2-m)/Math.abs(vy)):1e9,k=Math.min(sx,sy);
  var ex=cx+vx*k,ey=cy+vy*k;if(ey<top)ey=top;
  rot=Math.atan2(vy,vx)*180/Math.PI-90;x=ex;y=ey;
 }
 a.style.display='block';a.className=inside?'ft-on':'';
 a.style.transform='translate('+(x|0)+'px,'+(y|0)+'px)';
 el.aw.style.transform=inside?'':'rotate('+(rot|0)+'deg)';
 var dt=dist>999?(dist/1000).toFixed(1)+'km':Math.round(dist)+'m';
 var lb=LABEL[s.id],tx=lb?lb+' \u00b7 '+dt:dt;if(tx!==lastKey){lastKey=tx;el.dist.textContent=tx;}
}

var FT={
 start:function(o){
  o=o||{};if(o.camera)S0.camera=o.camera;if(o.getTarget)S0.getTarget=o.getTarget;if(o.onDone)S0.onDone=o.onDone;
  var t=st();if(t.done&&!o.force)return false;
  build();try{document.body.classList.remove('ft-done');}catch(e){}running=true;cur=Math.max(0,Math.min(STEPS.length-2,t.i|0));
  if(el.panel){render(true);startLoop();}
  return true;
 },
 restart:function(o){var t=st();t.done=false;t.skipped=false;t.i=0;o=o||{};o.force=true;return FT.start(o);},
 on:function(evt,data){
  if(!running)return;
  var s=STEPS[cur];
  if(evt==='miss'&&s.id==='reel'){missCount++;if(missCount>=1){cur=3;render(true);el.text.textContent='It got away. No worries, cast again and hold the bar steadier.';save();}return;}
  for(var i=cur;i<STEPS.length-1;i++){
   var ev=STEPS[i].ev;
   for(var j=0;j<ev.length;j++)if(evMatches(ev[j],evt)){
     // events from later steps only skip ahead when they clearly mean it
     if(i===cur||evt==='catch'||evt==='sell'||evt==='buyRod'||evt==='equipRod'||evt==='openBook'||evt==='boat'||evt.indexOf('island:')===0||evt.indexOf('talk:')===0){go(i+1);return;}
   }
  }
 },
 active:function(){return running;},
 skip:function(){if(!running)return;var t=st();t.skipped=true;finish(true);},
 step:function(){return running?STEPS[cur].id:null;},
 steps:function(){return STEPS.map(function(s){return s.id;});},
 goto:function(i){if(running)go(i);}
};
window.FT=FT;
})();
