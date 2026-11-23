/* Fishing Unblocked v2 — reel fight (contract §4).
   window.FR = { start(o), update(dt, holding), abort(), active }
   o = {name, tier, kg, rel, need, beh, rod:{pow,zone,ctl,passive}, env:{storm}, big}
   update() -> null while fighting, {win, perfect, snapped} once when the fight ends.
   Pure fight logic lives in FR.core (no DOM) so it can be unit-tested in node.
   DOM/CSS only, transforms + opacity for per-frame changes (cheap on low-end Chromebooks). */
(function(G){
'use strict';
var TIER_N=['Common','Uncommon','Rare','Epic','Legendary','Mythic','Divine','Secret','Abyssal','Duke'];
var TIER_C=['#cfd6dc','#5fd35f','#4aa3ff','#c070ff','#ffb020','#ff4fd8','#fff3a0','#ff3b3b','#00ffd5','#00e5ff'];
var TIER_S=[0.6,0.75,0.9,1.05,1.2,1.35,1.5,1.65,1.9,2.1];
var BEHS=['steady','darter','puller','erratic','tank'];
function cl(v,a,b){return v<a?a:v>b?b:v;}
// next swim target: usually away from the player's zone (the fish fights you), never camping at a wall
function pick(s,span,lo,hi){var zc=s.zx+s.zw/2,away=s.fx>=zc?1:-1,d=(.35+s.rng()*.65)*span;
 if(s.rng()<.3)away=-away;var t=s.fx+away*d;if(t<lo||t>hi)t=s.fx-away*d;return cl(t,lo,hi);}

/* ---------------- pure logic ---------------- */
var core={
 create:function(o,rng){
  o=o||{};rng=rng||Math.random;
  var rod=o.rod||{},tier=cl(o.tier|0,0,9),big=!!o.big,beh=BEHS.indexOf(o.beh)>=0?o.beh:'steady';
  var pow=Math.max(.3,+rod.pow||1),need=o.need==null?(.6+tier*.45):Math.max(0,+o.need||0),r=need/pow;
  var pas=rod.passive||null,tv=(pas&&pas.id==='tension')?cl(+pas.v||0,0,1):0;
  var spd=TIER_S[tier]*(1+Math.min(.4,(+o.rel||0)*.25))*((o.env&&o.env.storm)?1.12:1)*(big?1.2:1)*(r>1?1+Math.min(1,r-1)*.5:1);
  var zw=cl((+rod.zone||.28)*(big?.85:1)*(r>1?Math.max(.7,1-(r-1)*.3):1),.11,.5);
  var gain=.17/(1+tier*.09)/(big?1.7:1)/(r>1?Math.pow(r,1.4):1)*(r<.7?1.15:1)*(beh==='tank'?.8:1);
  var loss=.11*(1+tier*.06)*(big?1.3:1)*(r>1?r:1);
  // Owner (Nov 19): reeling is easy; only a slight challenge from Legendary up. The real danger is random encounters.
  var bs=1+(+o.rel||0)*.18,easy=big?(tier>7?[.55,1.4,2.6,.5,.6]:tier>6?[.75/bs,1.32,2.1,.7,.7]:[.83/bs,1.27,2.29,.65,.8]):tier<4?[.55,1.4,1.8,.5,.5]:[.8,1.15,1.25,.8,.8]; // big: Abyssal/Duke hunts, Secret boss, Divine bosses (bs damps the size speed-up so even a record boss is no harder than the Angler)
  if(easy){spd*=easy[0];zw=cl(zw*easy[1],.11,.55);gain*=easy[2];loss*=easy[3];}
  var tmE=easy?easy[4]:1;
  var fx=.3+rng()*.4;
  return {o:o,rng:rng,beh:beh,tier:tier,big:big,r:r,spd:spd,zw:zw,ctl:cl(+rod.ctl||0,0,1),tm:(1-tv*.6)*tmE,gain:gain,loss:loss,
   intro:big?1.6:1.0,t:0,fx:fx,fv:0,tx:fx,mt:.4+rng()*.6,mode:0,dir:rng()<.5?-1:1,tell:0,jit:0,
   zx:cl(fx-zw/2,0,1-zw),zv:0,prog:.22,ten:0,outT:0,inZ:true,ev:'',done:null,hold:false,thrash:0};
 },
 // advance the fight; returns null or {win,perfect,snapped}
 step:function(s,dt,hold){
  if(s.done)return s.done;
  dt=cl(+dt||0,0,.05);s.ev='';s.hold=!!hold;s.t+=dt;
  if(s.t<s.intro){s.zx=cl(s.fx-s.zw/2,0,1-s.zw);return null;}
  var rng=s.rng,sp=s.spd,k,damp,noise,jn=1-s.ctl*.65;
  s.mt-=dt;if(s.tell>0)s.tell-=dt;
  // ---- fish behaviour ----
  switch(s.beh){
   case 'darter':
    k=4*sp;damp=5;noise=.25;
    if(s.mode===0){ // lurking
     if(s.mt<=0){s.mode=1;s.tell=.32;s.mt=.32;}
    }else if(s.mode===1){ // tell -> dash
     if(s.mt<=0){s.tx=pick(s,.48,.05,.95);if(Math.abs(s.tx-s.fx)<.2)s.tx=cl(s.fx+(s.fx<.5?.35:-.35),.05,.95);s.mode=2;s.mt=.45;s.ev='dash';}
    }else{ k=30*Math.sqrt(sp);damp=8; if(s.mt<=0){s.mode=0;s.mt=(.9+rng()*1.1)/Math.sqrt(sp);s.tx=s.fx;} }
    break;
   case 'puller':
    k=3.6*sp;damp=4;noise=.3;
    s.tx=s.dir>0?.93:.07;
    if(s.mode===1&&s.mt<=0){s.mode=0;s.dir=-s.dir;s.mt=(2.2+rng()*2)/Math.sqrt(sp);s.ev='turn';}
    else if(s.mode===0&&s.mt<=0){s.mode=1;s.tell=.4;s.mt=.4;}
    break;
   case 'erratic':
    k=11*Math.sqrt(sp);damp=5.5;noise=1.1;
    if(s.mt<=0){s.tx=pick(s,.3,.04,.96);s.mt=(.2+rng()*.4)/Math.sqrt(sp);}
    break;
   case 'tank':
    k=2.6*sp;damp=3.2;noise=.12;
    if(s.mt<=0){s.tx=pick(s,.35,.08,.92);s.mt=(2+rng()*2)/Math.sqrt(sp);}
    s.thrash-=dt;if(s.thrash<=0){s.thrash=(2.6+rng()*2.4)/Math.sqrt(sp);if(s.t>s.intro+1){s.fv+=(rng()<.5?-1:1)*.85*sp;s.ev='thrash';s.tell=.25;}}
    break;
   default: // steady glide
    k=6.5*sp;damp=4.2;noise=.25;
    if(s.mt<=0){s.tx=pick(s,.4,.06,.94);s.mt=(1.1+rng()*1.3)/Math.sqrt(sp);}
  }
  s.jit+=((rng()-.5)*2-s.jit)*Math.min(1,dt*12);
  s.fv+=((s.tx-s.fx)*k-s.fv*damp+s.jit*noise*sp*jn*3)*dt;
  s.fx+=s.fv*dt;
  if(s.fx<.02){s.fx=.02;s.fv=Math.abs(s.fv)*.3;}else if(s.fx>.98){s.fx=.98;s.fv=-Math.abs(s.fv)*.3;}
  // ---- catch zone ----
  var inZ=s.fx>=s.zx-.012&&s.fx<=s.zx+s.zw+.012,fc=1-s.ctl*.7;
  s.zv+=(hold?2.7:-2.35)*dt;
  if(inZ){ // a hooked fish drags your zone around; control resists it
   var drag=(s.beh==='tank'?1.25:s.beh==='puller'?.8:.35)*fc*(s.big?1.4:1);
   s.zv+=s.fv*drag*dt*2;
   if(s.beh==='puller')s.zv+=s.dir*.9*sp*fc*dt;
   s.zv+=s.jit*.6*sp*fc*dt*(s.beh==='erratic'?2:1);
  }
  s.zv*=Math.exp(-1.7*dt);s.zx+=s.zv*dt;
  if(s.zx<0){s.zx=0;s.zv=-s.zv*.35;}else if(s.zx>1-s.zw){s.zx=1-s.zw;s.zv=-s.zv*.35;}
  inZ=s.fx>=s.zx-.012&&s.fx<=s.zx+s.zw+.012;
  if(!inZ&&s.inZ)s.ev=s.ev||'lost';
  s.inZ=inZ;
  // ---- progress ----
  if(inZ)s.prog+=s.gain*dt;else{s.prog-=s.loss*dt;s.outT+=dt;}
  // ---- line tension ----
  var st;
  if(inZ)st=s.r>1?(hold?(s.r-1)*.6:-.15):-.3;
  else st=hold?.5*Math.max(1,s.r):-.15;
  if(hold)st+=Math.max(0,-s.fv)*.8;         // pulling against a run
  if(s.ev==='thrash')s.ten+=.1*s.tm;
  s.ten=Math.max(0,s.ten+st*dt*s.tm*(s.big?1.3:1));
  if(s.ten>=1){s.ten=1;s.done={win:false,perfect:false,snapped:true};}
  else if(s.prog>=1){s.prog=1;s.done={win:true,perfect:s.outT<.12,snapped:false};}
  else if(s.prog<=0){s.prog=0;s.done={win:false,perfect:false,snapped:false};}
  return s.done;
 },
 TIER_N:TIER_N,TIER_C:TIER_C,BEHS:BEHS
};

if(typeof module!=='undefined'&&module.exports)module.exports=core;
if(typeof document==='undefined'){G.FR=G.FR||{core:core};return;}

/* ---------------- DOM / view ---------------- */
var CSS='\
#frReel{position:fixed;left:50%;bottom:max(6vh,70px);width:min(640px,92vw);margin-left:calc(min(640px,92vw)/-2);z-index:30;pointer-events:none;font-family:Inter,system-ui,Segoe UI,Arial,sans-serif;color:#eaf6ff;display:none}\
#frReel.on{display:block}\
#frReel .frp{position:relative;background:linear-gradient(180deg,#14304a,#0b1d2e);border:2px solid var(--tc);border-radius:16px;padding:10px 14px 10px;box-shadow:0 8px 26px rgba(0,0,0,.5),0 0 0 4px rgba(0,0,0,.25),0 0 22px var(--tg)}\
#frReel.big .frp{border-width:3px;background:linear-gradient(180deg,#2a1a32,#120c1c)}\
#frReel .frh{display:flex;align-items:baseline;gap:10px;font:700 15px/1.2 Oswald,Impact,system-ui,sans-serif;letter-spacing:.6px;margin:0 2px 8px}\
#frReel .frt{color:#0b1622;background:var(--tc);padding:2px 8px;border-radius:6px;font-size:12px;letter-spacing:1px;text-transform:uppercase}\
#frReel .frn{font-size:20px;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\
#frReel .frk{color:#9fc4dd;font-size:15px}\
#frReel .frs{margin-left:auto;font-size:12px;padding:2px 8px;border-radius:6px;background:rgba(255,255,255,.08);color:#bfe0f4;white-space:nowrap}\
#frReel.big .frs{background:#7a1420;color:#ffd6d0;box-shadow:0 0 10px rgba(255,60,60,.5)}#frReel.big .frb{box-shadow:inset 0 3px 8px rgba(0,0,0,.55),inset 0 0 0 2px rgba(255,80,80,.35),inset 0 0 24px rgba(160,20,40,.45)}#frReel .frs.hard{background:#5a2a12;color:#ffc48a}#frReel .frs.vhard{background:#6a1010;color:#ffd0c8}\
#frReel .frb{position:relative;height:58px;border-radius:12px;background:linear-gradient(180deg,#0d3b5c 0%,#0a2c46 55%,#071d30 100%);box-shadow:inset 0 3px 8px rgba(0,0,0,.55),inset 0 0 0 2px rgba(255,255,255,.08)}\
#frReel .frw{position:absolute;inset:0;border-radius:12px;background:repeating-linear-gradient(90deg,rgba(255,255,255,.07) 0 2px,transparent 2px 10%);}\
#frReel .frw2{position:absolute;left:0;right:0;top:9px;height:2px;background:rgba(160,220,255,.12)}\
#frReel .frz{position:absolute;left:0;top:4px;bottom:4px;border-radius:9px;background:rgba(80,230,170,.28);box-shadow:inset 0 0 0 3px #5ff0b4,0 0 14px rgba(95,240,180,.55);will-change:transform;transition:background-color .12s,box-shadow .12s}\
#frReel .frz:before,#frReel .frz:after{content:"";position:absolute;top:50%;width:4px;height:18px;margin-top:-9px;border-radius:2px;background:#5ff0b4}\
#frReel .frz:before{left:7px}#frReel .frz:after{right:7px}\
#frReel.out .frz{background:rgba(255,120,80,.16);box-shadow:inset 0 0 0 3px #ff8a5a,0 0 12px rgba(255,110,70,.5)}\
#frReel.out .frz:before,#frReel.out .frz:after{background:#ff8a5a}\
#frReel .frf{position:absolute;left:0;top:50%;width:44px;height:26px;margin:-13px 0 0 -22px;will-change:transform}#frReel .frfs{position:absolute;inset:0;transform:scale(1.3)}\
#frReel .frfi{position:absolute;inset:0}\
#frReel .frhalo{position:absolute;left:-14px;top:-12px;right:-14px;bottom:-12px;border-radius:50%;background:radial-gradient(closest-side,var(--tg),transparent)}\
#frReel.t4 .frhalo,#frReel.t5 .frhalo,#frReel.t6 .frhalo,#frReel.t7 .frhalo,#frReel.t8 .frhalo,#frReel.t9 .frhalo{animation:frPulse .8s ease-in-out infinite alternate}\
#frReel .frbody{position:absolute;left:12px;top:3px;width:30px;height:20px;border-radius:55% 45% 45% 55%/50%;background:radial-gradient(ellipse at 60% 35%,#fff 0,var(--tc) 38%,var(--td) 100%);box-shadow:0 0 0 2px rgba(0,0,0,.45)}\
#frReel .frtail{position:absolute;left:0;top:2px;width:15px;height:22px;background:var(--td);clip-path:polygon(0 0,100% 42%,100% 58%,0 100%,28% 50%);}\
#frReel .freye{position:absolute;left:33px;top:8px;width:5px;height:5px;border-radius:50%;background:#0b1622;box-shadow:0 0 0 1.5px #fff}\
#frReel .frfin{position:absolute;left:22px;top:-2px;width:10px;height:7px;background:var(--td);clip-path:polygon(0 100%,40% 0,100% 100%)}\
#frReel .frex{position:absolute;left:50%;top:-22px;z-index:2;margin-left:-9px;width:18px;height:18px;border-radius:50%;background:#ffde3a;color:#2a1600;font:900 14px/18px Arial,sans-serif;text-align:center;opacity:0;box-shadow:0 0 8px #ffde3a}\
#frReel .frf.tell .frex{opacity:1}\
#frReel .frf.tell .frfi{animation:frWig .08s linear infinite alternate}\
#frReel .frsp{position:absolute;left:0;top:50%;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;border:2px solid #e8f8ff;box-sizing:border-box;opacity:0}\
#frReel .frm{display:flex;align-items:center;gap:8px;margin-top:9px;font:700 13px/1 Oswald,Impact,system-ui,sans-serif;letter-spacing:1px}\
#frReel .frm label{width:62px;color:#9fc4dd}\
#frReel .frmt{position:relative;flex:1;height:14px;border-radius:7px;background:rgba(0,0,0,.45);overflow:hidden;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}\
#frReel .frmf{position:absolute;inset:0;transform-origin:0 50%;will-change:transform;border-radius:6px}\
#frReel .frpg .frmf{background:linear-gradient(90deg,#3bd6ff,#5ff0b4 70%,#d8ff6a)}\
#frReel .frtn .frmf{background:linear-gradient(90deg,#5ff0b4 0,#ffd23a 55%,#ff4a3a 85%)}\
#frReel .frtn .frmk{position:absolute;inset:0;background:#0d1a26;transform-origin:100% 50%;will-change:transform}\
#frReel .frseg{position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 calc(10% - 2px),rgba(0,0,0,.55) calc(10% - 2px) 10%)}\
#frReel .frm span{width:58px;text-align:right;color:#eaf6ff;font-size:14px}\
#frReel.danger .frtn label,#frReel.danger .frtn span{color:#ff6a5a;animation:frBlink .25s steps(2) infinite}\
#frReel.danger .frb{box-shadow:inset 0 3px 8px rgba(0,0,0,.55),inset 0 0 0 2px #ff5a4a,inset 0 0 26px rgba(255,60,40,.5)}#frReel.danger .frtn .frmt{box-shadow:0 0 10px #ff4a3a,inset 0 0 0 1px #ff6a5a}\
#frReel .frc{position:absolute;left:0;right:0;top:-34px;text-align:center;font:800 22px/1 Oswald,Impact,system-ui,sans-serif;letter-spacing:1.5px;color:#fff;text-shadow:0 2px 0 #000,0 0 10px rgba(0,0,0,.6);opacity:0;transition:opacity .15s}\
#frReel .frc.show{opacity:1}\
#frReel .frc.good{color:#7dffb8}#frReel .frc.warn{color:#ffb84a}#frReel .frc.bad{color:#ff6a5a}\
#frReel .frtip{margin-top:8px;text-align:center;font-size:13px;color:#9fc4dd;opacity:.8}\
#frReel .frtip b{display:inline-block;padding:1px 6px;border-radius:4px;background:rgba(255,255,255,.14);color:#fff;font-size:11px}\
#frReel .fri{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:14px;background:rgba(6,14,24,.82);opacity:0;pointer-events:none}\
#frReel.intro .fri{opacity:1}\
#frReel .fri b{font:900 44px/1 Oswald,Impact,system-ui,sans-serif;letter-spacing:3px;color:var(--tc);text-shadow:0 3px 0 #000,0 0 18px var(--tg)}\
#frReel.intro .fri b{animation:frPop .45s cubic-bezier(.2,1.6,.4,1) both}\
#frReel .fri small{margin-top:6px;font:700 14px/1 Oswald,Impact,system-ui,sans-serif;letter-spacing:2px;color:#cfe6f5}\
#frReel.intro .frb,#frReel.intro .frm{opacity:.35}\
#frReel.jolt .frp{animation:frJolt .28s linear}\
#frReel.big.intro .frp{animation:frJolt .3s linear 3}\
#frReel.end .frp{animation:frOut .55s ease-in forwards}\
@keyframes frPulse{from{opacity:.55;transform:scale(.85)}to{opacity:1;transform:scale(1.15)}}\
@keyframes frWig{from{transform:rotate(-12deg)}to{transform:rotate(12deg)}}\
@keyframes frBlink{50%{opacity:.35}}\
@keyframes frPop{0%{transform:scale(.3);opacity:0}100%{transform:scale(1);opacity:1}}\
@keyframes frJolt{0%,100%{transform:translate(0,0)}25%{transform:translate(-5px,2px)}50%{transform:translate(5px,-2px)}75%{transform:translate(-3px,1px)}}\
@keyframes frOut{0%{transform:scale(1);opacity:1}30%{transform:scale(1.04);opacity:1}100%{transform:scale(.92) translateY(20px);opacity:0}}\
@media (max-height:640px){#frReel{bottom:max(3vh,66px)}#frReel .frb{height:38px}#frReel .frn{font-size:17px}}\
';
function darken(hex,f){var n=parseInt(hex.slice(1),16),r=(n>>16)&255,g=(n>>8)&255,b=n&255;return 'rgb('+((r*f)|0)+','+((g*f)|0)+','+((b*f)|0)+')';}
function rgba(hex,a){var n=parseInt(hex.slice(1),16);return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+a+')';}

var root,E={},S=null,W=600,endTimer=0,joltT=0,call={txt:'',cls:'',t:0},last={};
function build(){
 if(root)return;
 var st=document.createElement('style');st.id='frReelCss';st.textContent=CSS;document.head.appendChild(st);
 root=document.createElement('div');root.id='frReel';
 root.innerHTML='<div class="frp"><div class="frc"></div>'+
  '<div class="frh"><span class="frt"></span><span class="frn"></span><span class="frk"></span><span class="frs"></span></div>'+
  '<div class="frb"><div class="frw"></div><div class="frw2"></div><div class="frz"></div>'+
   '<div class="frf"><div class="frfs"><div class="frhalo"></div><div class="frfi"><div class="frtail"></div><div class="frfin"></div><div class="frbody"></div><div class="freye"></div></div></div><div class="frex">!</div></div>'+
   '<i class="frsp"></i><i class="frsp"></i><i class="frsp"></i><i class="frsp"></i></div>'+
  '<div class="frm frpg"><label>CATCH</label><div class="frmt"><div class="frmf"></div><div class="frseg"></div></div><span></span></div>'+
  '<div class="frm frtn"><label>TENSION</label><div class="frmt"><div class="frmf"></div><div class="frmk"></div><div class="frseg"></div></div><span></span></div>'+
  '<div class="frtip">Hold <b>SPACE</b> / <b>CLICK</b> to pull the zone right &nbsp;·&nbsp; let go to drift left &nbsp;·&nbsp; let go when the line strains</div>'+
  '<div class="fri"><b>FISH ON!</b><small></small></div></div>';
 document.body.appendChild(root);
 var q=function(c){return root.querySelector(c);};
 E={p:q('.frp'),c:q('.frc'),t:q('.frt'),n:q('.frn'),k:q('.frk'),s:q('.frs'),b:q('.frb'),z:q('.frz'),f:q('.frf'),fi:q('.frfi'),
  pf:q('.frpg .frmf'),ps:q('.frpg span'),tk:q('.frtn .frmk'),ts:q('.frtn span'),ib:q('.fri b'),is:q('.fri small'),sp:root.querySelectorAll('.frsp')};
 G.addEventListener('resize',function(){if(S)W=E.b.clientWidth||W;});
}
function setCls(name,on){if(last[name]!==on){last[name]=on;root.classList.toggle(name,on);}}
function say(txt,cls,dur){call.txt=txt;call.cls=cls;call.t=dur;E.c.textContent=txt;E.c.className='frc show '+cls;}
function splash(x){
 if(!E.sp[0].animate)return;
 for(var i=0;i<E.sp.length;i++){var a=(i/(E.sp.length-1)-.5)*2.4,dx=Math.sin(a)*30,dy=-Math.cos(a)*16-4;
  E.sp[i].animate([{transform:'translate('+x+'px,0) scale(1)',opacity:.95},{transform:'translate('+(x+dx)+'px,'+dy+'px) scale(1.6)',opacity:0}],{duration:480,easing:'ease-out'});}
}
function jolt(){root.classList.remove('jolt');void root.offsetWidth;root.classList.add('jolt');joltT=.3;}

function render(dt){
 var s=S;
 var zx=s.zx*W,fx=s.fx*W;
 E.z.style.transform='translate3d('+zx.toFixed(1)+'px,0,0)';
 var face=s.fv<-.02?-1:s.fv>.02?1:(last.face||1);
 E.f.style.transform='translate3d('+fx.toFixed(1)+'px,0,0)';
 if(face!==last.face){last.face=face;E.fi.style.transform=face<0?'scaleX(-1)':'';}
 E.pf.style.transform='scaleX('+s.prog.toFixed(3)+')';
 E.tk.style.transform='scaleX('+(1-s.ten).toFixed(3)+')';
 var pt=Math.round(s.prog*100);if(pt!==last.pt){last.pt=pt;E.ps.textContent=pt+'%';}
 var tt=Math.round(s.ten*100);if(tt!==last.tt){last.tt=tt;E.ts.textContent=tt+'%';}
 var intro=s.t<s.intro;setCls('intro',intro);
 setCls('out',!intro&&!s.inZ);setCls('danger',s.ten>.72);
 var tell=s.tell>0;if(tell!==last.tell){last.tell=tell;E.f.classList.toggle('tell',tell);}
 if(joltT>0){joltT-=dt;if(joltT<=0)root.classList.remove('jolt');}
 if(!intro){
  if(s.ev==='dash'||s.ev==='thrash'){splash(fx);if(s.ev==='thrash'||s.big)jolt();}
  if(s.ev==='turn')splash(fx);
  // priority call-outs
  if(s.ten>.72&&s.hold){if(call.txt!=='LINE STRAINING — LET GO!')say('LINE STRAINING — LET GO!','bad',.4);}
  else if(s.ev==='lost')say(s.fx<s.zx?'CHASE IT ←':'CHASE IT →','warn',.9);
  else if(s.ev==='dash')say(s.big?'HUGE RUN!':'IT\'S RUNNING!','warn',.8);
  else if(s.ev==='thrash')say('THRASHING!','warn',.7);
  else if(s.ev==='turn')say(s.dir>0?'PULLING RIGHT →':'← PULLING LEFT','warn',.9);
  else if(s.prog>.85&&!last.almost){last.almost=1;say('ALMOST THERE!','good',1);}
  else if(s.prog>.5&&!last.half){last.half=1;say('HALFWAY!','good',.9);}
  if(s.inZ&&call.txt.indexOf('CHASE')===0)call.t=Math.min(call.t,.05);
  if(call.t>0){call.t-=dt;if(call.t<=0){call.txt='';E.c.className='frc';}}
 }
}

var FR={core:core,active:false,state:null,
 start:function(o){
  build();clearTimeout(endTimer);
  S=core.create(o);FR.state=S;FR.active=true;last={};call={txt:'',cls:'',t:0};
  var tc=TIER_C[S.tier];
  root.style.setProperty('--tc',tc);root.style.setProperty('--td',darken(tc,.55));root.style.setProperty('--tg',rgba(tc,S.tier>=4?.55:S.tier>=2?.35:.18));
  root.className='on t'+S.tier+(S.big?' big':'');
  E.t.textContent=TIER_N[S.tier];E.n.textContent=(o&&o.name)||'Fish';
  E.k.textContent=o&&o.kg!=null?(+o.kg).toFixed(o.kg<10?2:1)+' kg':'';
  var r=S.r;E.s.className='frs'+(r>1.45?' vhard':r>1?' hard':'');
  E.s.textContent=(S.big?'HEAVY · ':'')+(r>1.45?'TOO STRONG FOR ROD':r>1?'STRONG FISH':r<.7?'EASY PULL':'FAIR FIGHT');
  E.ib.textContent=S.big?'HEAVY CATCH!':'FISH ON!';
  E.is.textContent=S.big?'Brace yourself — this one fights back':'Keep the fish inside the green zone';
  E.c.className='frc';
  W=E.b.clientWidth||600;
  E.z.style.width=(S.zw*W).toFixed(1)+'px';
  render(0);
 },
 update:function(dt,holding){
  if(!S||!FR.active)return null;
  var res=core.step(S,dt,holding);
  if(Math.abs((E.b.clientWidth||W)-W)>1&&S.t%1<.05){W=E.b.clientWidth;E.z.style.width=(S.zw*W).toFixed(1)+'px';}
  render(cl(+dt||0,0,.05));
  if(res){
   FR.active=false;
   say(res.snapped?'LINE SNAPPED!':res.win?(res.perfect?'PERFECT CATCH!':'CAUGHT!'):'IT GOT AWAY…',res.win?'good':'bad',1);
   root.classList.add('end');
   endTimer=setTimeout(function(){root.className='';},560);
   return res;
  }
  return null;
 },
 abort:function(){FR.active=false;S=null;FR.state=null;clearTimeout(endTimer);if(root)root.className='';}
};
G.FR=FR;
})(typeof window!=='undefined'?window:globalThis);
