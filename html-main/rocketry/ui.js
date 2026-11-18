// Unblocked Rocketry visual module: ui (loaded after the main game script; override/wrap globals here)
(function(){
const $=id=>document.getElementById(id);
// ---------- fonts + CSS ----------
const lk=document.createElement('link');lk.rel='stylesheet';lk.href='https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Rajdhani:wght@500;600;700&display=swap';document.head.appendChild(lk);
const css=`
:root{--ac:#4fc3ff;--ac2:#ff9a2e;--ok:#3ee08a;--pn:linear-gradient(160deg,#101c36e6,#070c1ae6);--bd:#3c5f9e88}
body{font:600 14px Rajdhani,system-ui,sans-serif;letter-spacing:.2px}
.panel{background:var(--pn);border:1px solid var(--bd);border-radius:12px;box-shadow:0 10px 40px #000a,inset 0 1px 0 #ffffff14}
button{background:linear-gradient(#24407a,#182c58);border:1px solid #4a6cc0;border-radius:8px;padding:6px 10px;font:600 14px Rajdhani,system-ui;color:#e8f1ff;transition:.15s;box-shadow:inset 0 1px 0 #ffffff22}
button:hover{background:linear-gradient(#2f56a3,#1f3a74);border-color:var(--ac);box-shadow:0 0 12px #4fc3ff55,inset 0 1px 0 #ffffff33}
button.on{background:linear-gradient(#2fa463,#1d6d40);border-color:var(--ok)}
input,select{background:#060b18;border:1px solid #34508e;border-radius:6px;padding:4px 6px;font:600 14px Rajdhani,system-ui;color:#e8f1ff}
input:focus,select:focus{outline:none;border-color:var(--ac);box-shadow:0 0 8px #4fc3ff66}
h3{font:700 12px Orbitron,system-ui;letter-spacing:2px;text-transform:uppercase;color:var(--ac)}
#menu{background:radial-gradient(ellipse at 50% 60%,#0000 0,#02040a66 55%,#02040add 100%);gap:10px}
#menu h1{font:900 clamp(40px,9vw,92px)/0.95 Orbitron,system-ui;letter-spacing:clamp(3px,1vw,10px);background:linear-gradient(180deg,#fff 20%,#9fd4ff 55%,#ff9a2e 100%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 24px #4fc3ff88) drop-shadow(0 4px 2px #000);animation:urT 4s ease-in-out infinite}
@keyframes urT{50%{filter:drop-shadow(0 0 40px #4fc3ffbb) drop-shadow(0 4px 2px #000)}}
#menu .sub{font:600 clamp(13px,2.4vw,18px) Rajdhani;letter-spacing:5px;text-transform:uppercase;color:#bcd6ff;margin-bottom:26px;text-shadow:0 2px 6px #000}
#menu button{width:min(360px,calc(100vw - 32px));font:700 16px Orbitron,system-ui;letter-spacing:1.5px;padding:15px;border-radius:12px;background:linear-gradient(90deg,#0f1f44cc,#1b3570cc);backdrop-filter:blur(8px);border:1px solid #4fc3ff66}
#menu button:hover{transform:translateY(-2px) scale(1.02);background:linear-gradient(90deg,#1b3a80,#2d5cc0)}
#menu #mNew{background:linear-gradient(90deg,#c85a14,#ff9a2e);border-color:#ffc27a;box-shadow:0 0 30px #ff8a2e55}
#menu #mNew:hover{box-shadow:0 0 44px #ff9a2e99}
#howto{background:#070c1acc;padding:14px;border-radius:12px;border:1px solid var(--bd);font-size:15px}
#build{background:radial-gradient(ellipse at 50% 0,#2a3c62 0,#121a2c 45%,#090c14 100%);padding:12px;gap:12px}
#catalog,#editor{background:var(--pn);border:1px solid var(--bd);border-radius:12px;padding:12px;width:280px}
#stackWrap{background:#ffffff05;border:1px solid #ffffff10;border-radius:12px;padding:10px}
#stackWrap>h3{font-size:11px}#stats{display:none}
.tabs{display:flex;flex-wrap:wrap;gap:3px;margin-bottom:8px}.tabs button{margin:0;padding:3px 8px;font-size:12px;border-radius:20px;background:#13213f}
.tabs button.on{background:var(--ac);color:#03101e;border-color:var(--ac)}
.cat{display:grid;gap:6px}
.cat button{margin:0;padding:6px 8px;border-radius:10px;background:linear-gradient(90deg,#14254a,#0c1630);font-size:13px;line-height:1.2;align-items:center}
.cat button:hover{transform:translateX(3px)}
.cat canvas{background:radial-gradient(#2a4070,#0a1226);border-radius:8px;border:1px solid #ffffff18}
.cat b{display:block;font-size:14px;color:#fff}.cat small{color:#8fb0e0;font-size:12px}
#launch{font:700 18px Orbitron,system-ui!important;letter-spacing:2px;padding:10px 26px!important;background:linear-gradient(90deg,#1fa060,#3ee08a)!important;border-color:#8fffc0!important;color:#02140a!important;box-shadow:0 0 26px #3ee08a77;animation:urP 2s infinite}
@keyframes urP{50%{box-shadow:0 0 40px #3ee08acc}}
#vab{border-radius:12px;box-shadow:0 10px 40px #000c}
#urStats{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:6px 0}
.urS{background:#0a1430cc;border:1px solid var(--bd);border-radius:10px;padding:5px 10px;min-width:84px;text-align:center}
.urS i{display:block;font:normal 600 10px Orbitron;letter-spacing:1px;color:#7fa6dd}.urS b{font:700 16px Orbitron;color:#fff}
#urStages{width:100%;font-size:13px;margin-top:8px}#urStages div{display:flex;justify-content:space-between;padding:3px 6px;border-radius:6px;background:#ffffff08;margin:2px 0}
#edit .row{background:#ffffff06;padding:3px 6px;border-radius:6px}
#hud{left:14px;top:14px;width:270px;padding:12px 14px}
#hud .big{font:700 26px Orbitron;color:#fff;text-shadow:0 0 12px #4fc3ff88}
#hud .lbl{font:600 10px Orbitron;letter-spacing:1.5px;color:#7fa6dd}
#hud .g2>div{background:#ffffff08;border-radius:6px;padding:3px 6px;font-size:15px}
#hud .bar{height:8px;background:#ffffff14;box-shadow:inset 0 1px 2px #000}
#urNav{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);z-index:2;pointer-events:none;filter:drop-shadow(0 6px 16px #000c)}
#urWarp{position:absolute;top:14px;left:50%;transform:translateX(-50%);z-index:2;font:700 13px Orbitron;letter-spacing:2px;padding:6px 14px;border-radius:20px;background:#070c1acc;border:1px solid var(--bd);color:var(--ac);pointer-events:none}
#msg{top:22%;font:700 clamp(18px,3vw,28px) Orbitron;letter-spacing:2px;color:#fff;text-shadow:0 0 16px #4fc3ff,0 2px 4px #000}
#msg:not(:empty){animation:urM .3s}@keyframes urM{from{transform:scale(1.3);opacity:0}}
#cheats{width:280px;border-color:#ff9a2e88}#cheats h3{color:var(--ac2)}#cheats .row{background:#ffffff06;padding:4px 8px;border-radius:6px;margin:4px 0}
#help{font:600 12px Rajdhani;color:#a9c0e8}
@media (max-width:760px){#build{flex-direction:column;overflow:auto}#catalog,#editor{width:100%;max-height:none}#hud{width:190px;font-size:12px;padding:8px}#hud .big{font-size:19px}#help{display:none!important}#cheats{width:calc(100vw - 20px)}}
`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

// ---------- part drawing with shading ----------
function shade(c,k){let h=c.length==4?'#'+[...c.slice(1)].map(x=>x+x).join(''):c;if(h[0]!='#'||h.length<7)return c;
  const n=parseInt(h.slice(1,7),16),f=v=>Math.max(0,Math.min(255,Math.round(k>0?v+(255-v)*k:v*(1+k))));
  return`rgb(${f(n>>16)},${f(n>>8&255)},${f(n&255)})`}
window.drawPart=function(g,p,cxp,y,z){const w=p.w*z,h=p.h*z;
  const gr=g.createLinearGradient(cxp-w/2,0,cxp+w/2,0);gr.addColorStop(0,shade(p.col,-.55));gr.addColorStop(.3,shade(p.col,.35));gr.addColorStop(.45,shade(p.col,.15));gr.addColorStop(1,shade(p.col,-.65));
  g.fillStyle=gr;g.beginPath();
  if(p.type=='eng'){g.moveTo(cxp-w*.25,y);g.lineTo(cxp+w*.25,y);g.lineTo(cxp+w*.5,y+h);g.lineTo(cxp-w*.5,y+h)}
  else if(p.type=='pod'){g.moveTo(cxp-w*.2,y);g.lineTo(cxp+w*.2,y);g.lineTo(cxp+w*.5,y+h);g.lineTo(cxp-w*.5,y+h)}
  else if(p.type=='chute'){g.moveTo(cxp-w/2,y+h);g.quadraticCurveTo(cxp,y-h*.6,cxp+w/2,y+h)}
  else if(p.type=='shield'){g.moveTo(cxp-w/2,y);g.lineTo(cxp+w/2,y);g.quadraticCurveTo(cxp,y+h*2,cxp-w/2,y)}
  else if(p.type=='legs'){g.rect(cxp-w*.2,y,w*.4,h);g.moveTo(cxp-w*.2,y);g.lineTo(cxp-w/2,y+h);g.lineTo(cxp-w*.45,y+h);g.lineTo(cxp-w*.2,y+h*.3);g.moveTo(cxp+w*.2,y);g.lineTo(cxp+w/2,y+h);g.lineTo(cxp+w*.45,y+h);g.lineTo(cxp+w*.2,y+h*.3)}
  else if(g.roundRect)g.roundRect(cxp-w/2,y,w,h,Math.min(w,h)*.08);else g.rect(cxp-w/2,y,w,h);
  g.fill();g.strokeStyle='#000a';g.lineWidth=1;g.stroke();
  if(p.type=='tank'&&h>8){g.fillStyle='#0003';for(const f of[.12,.88])g.fillRect(cxp-w/2,y+h*f-1,w,Math.max(1,h*.03));}
  if(p.type=='pod'&&h>10){g.fillStyle='#9fe0ff';g.strokeStyle='#123';g.beginPath();g.arc(cxp,y+h*.45,Math.min(w,h)*.12,0,7);g.fill();g.stroke()}
  if(p.type=='eng'&&h>8){g.fillStyle='#0006';g.fillRect(cxp-w*.5,y+h-Math.max(1,h*.08),w,Math.max(1,h*.08))}
  if(p.type=='dec'){g.fillStyle='#ffb000aa';for(let x=-w/2;x<w/2;x+=Math.max(4,w/8))g.fillRect(cxp+x,y,Math.max(2,w/16),h)}};

// ---------- VAB ----------
window.drawVAB=function(){const c=$('vab'),g=c.getContext('2d'),Ht=design.reduce((s,p)=>s+p.h,0),Wd=Math.max(4,...design.map(p=>p.w));
  const mob=innerWidth<760,H=mob?Math.max(320,innerHeight*.55):Math.max(200,innerHeight-230),Wc=mob?innerWidth-50:Math.max(260,Math.min(innerWidth-640,640));c.width=Wc;c.height=H;
  vabZ=Math.min(18,(H-50)/Math.max(Ht,1),(Wc-90)/Wd);
  const bg=g.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#1a2a48');bg.addColorStop(1,'#070b14');g.fillStyle=bg;g.fillRect(0,0,Wc,H);
  g.strokeStyle='#ffffff08';g.lineWidth=1;for(let x=0;x<Wc;x+=24){g.beginPath();g.moveTo(x,0);g.lineTo(x,H);g.stroke()}for(let y=0;y<H;y+=24){g.beginPath();g.moveTo(0,y);g.lineTo(Wc,y);g.stroke()}
  const sp=g.createRadialGradient(Wc/2,0,0,Wc/2,0,H);sp.addColorStop(0,'#bfe0ff22');sp.addColorStop(1,'#0000');g.fillStyle=sp;g.fillRect(0,0,Wc,H);
  const gx=Wc/2+Wd*vabZ/2+22;g.strokeStyle='#d07a2a';g.lineWidth=2;for(let y=H-24;y>24;y-=24){g.strokeRect(gx,y-24,16,24);g.beginPath();g.moveTo(gx,y);g.lineTo(gx+16,y-24);g.stroke()}
  const fl=g.createLinearGradient(0,H-24,0,H);fl.addColorStop(0,'#3a3f48');fl.addColorStop(1,'#16181d');g.fillStyle=fl;g.fillRect(0,H-24,Wc,24);
  g.fillStyle='#ffcc00';for(let x=0;x<Wc;x+=30)g.fillRect(x,H-24,15,3);
  g.fillStyle='#6a707c';g.fillRect(Wc/2-Wd*vabZ/2-24,H-30,Wd*vabZ+48,7);
  let y=H-30-Ht*vabZ;design.forEach((p,i)=>{drawPart(g,p,Wc/2,y,vabZ);
    if(i==sel){g.save();g.shadowColor='#4fc3ff';g.shadowBlur=14;g.strokeStyle='#4fc3ff';g.lineWidth=2;g.setLineDash([6,4]);g.strokeRect(Wc/2-p.w*vabZ/2-4,y-2,p.w*vabZ+8,p.h*vabZ+4);g.restore()}
    if(p.type=='dec'){g.fillStyle='#ffb000';g.font='700 10px Orbitron,system-ui';g.fillText('◀ STAGE',Wc/2+p.w*vabZ/2+40,y+p.h*vabZ/2+4)}p._y=y;y+=p.h*vabZ});
  if(!design.length){g.fillStyle='#8fb0e0';g.font='600 16px Orbitron,system-ui';g.textAlign='center';g.fillText('ADD A PART FROM THE CATALOG',Wc/2,H/2);g.textAlign='left'}};
const ICON={pod:'Command',tank:'Fuel tank',eng:'Engine',dec:'Decoupler',chute:'Parachute',shield:'Heat shield',legs:'Landing legs'};
const oCat=renderCat;window.renderCat=function(){oCat();const L=$('catList'),list=CAT.filter(c=>tab=='all'||c.type==tab);
  [...L.children].forEach((b,i)=>{const c=list[i];if(!c)return;const ic=b.querySelector('canvas');ic.width=ic.height=44;const z=Math.min(36/c.h,36/c.w),g=ic.getContext('2d');drawPart(g,c,22,22-c.h*z/2,z);
    const sub=c.thrust?`${c.thrust} kN · Isp ${c.isp}s`:c.fuel?`${c.fuel} t fuel · ${c.dry} t dry`:`${ICON[c.type]||''} · ${c.dry} t`;
    b.innerHTML='';b.appendChild(ic);const d=document.createElement('div');d.innerHTML=`<b>${c.name}</b><small>${sub}</small>`;b.appendChild(d)})};
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{tab=b.dataset.t;document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('on',x==b));renderCat()});
renderCat();
const sw=$('stackWrap'),sb=document.createElement('div');sb.id='urStats';sw.insertBefore(sb,sw.children[1]);
const stl=document.createElement('div');stl.id='urStages';$('editor').appendChild(stl);
const oRB=renderBuild;window.renderBuild=function(){oRB();const s=stageInfo(design),m=design.reduce((a,p)=>a+p.dry+(p.fuel||0),0),dv=s.reduce((a,x)=>a+x.dv,0),tw=s[0]?.twr||0;
  sb.innerHTML=`<div class="urS"><i>MASS</i><b>${m.toFixed(1)} t</b></div><div class="urS"><i>TOTAL ΔV</i><b>${dv.toFixed(0)}</b> m/s</div><div class="urS"><i>LAUNCH TWR</i><b style="color:${tw>1.2?'#3ee08a':tw>1?'#ffcc40':'#ff5050'}">${tw.toFixed(2)}</b></div><div class="urS"><i>STAGES</i><b>${s.length}</b></div>`;
  stl.innerHTML='<h3 style="margin-top:14px">Stages (fires first ↓)</h3>'+s.map((x,i)=>`<div><span>Stage ${i+1}</span><span>${x.dv.toFixed(0)} m/s · TWR <span style="color:${x.twr>1?'#3ee08a':'#ffb040'}">${x.twr.toFixed(2)}</span></span></div>`).join('')};

// ---------- HUD extras: navball + warp ----------
const nv=document.createElement('canvas');nv.id='urNav';nv.width=nv.height=150;document.body.appendChild(nv);
const wp=document.createElement('div');wp.id='urWarp';document.body.appendChild(wp);
function navball(){const g=nv.getContext('2d'),r=68,c=75;g.clearRect(0,0,150,150);
  const up=Math.atan2(R.x,R.y),a=R.ang-up; // rocket angle relative to local vertical
  g.save();g.beginPath();g.arc(c,c,r,0,7);g.clip();g.translate(c,c);g.rotate(-a);
  g.fillStyle='#2b6fd0';g.fillRect(-r*2,-r*2,r*4,r*2);g.fillStyle='#9a5a26';g.fillRect(-r*2,0,r*4,r*2);
  g.strokeStyle='#fff';g.lineWidth=2;g.beginPath();g.moveTo(-r*2,0);g.lineTo(r*2,0);g.stroke();
  g.lineWidth=1;g.strokeStyle='#ffffff88';for(let k=-3;k<=3;k++)if(k){g.beginPath();g.moveTo(-14,k*18);g.lineTo(14,k*18);g.stroke()}
  g.restore();
  const v=Math.hypot(R.vx,R.vy);if(v>1){const pa=Math.atan2(R.vx,R.vy)-R.ang,px=c+Math.sin(pa)*r*.6,py=c-Math.cos(pa)*r*.6;g.strokeStyle='#d4ff3a';g.lineWidth=2;g.beginPath();g.arc(px,py,6,0,7);g.stroke();g.beginPath();g.moveTo(px,py-6);g.lineTo(px,py-11);g.moveTo(px-6,py);g.lineTo(px-11,py);g.moveTo(px+6,py);g.lineTo(px+11,py);g.stroke()}
  const rg=g.createRadialGradient(c-20,c-25,5,c,c,r);rg.addColorStop(0,'#ffffff40');rg.addColorStop(.6,'#0000');rg.addColorStop(1,'#0008');g.fillStyle=rg;g.beginPath();g.arc(c,c,r,0,7);g.fill();
  g.strokeStyle='#ffb000';g.lineWidth=3;g.beginPath();g.moveTo(c-26,c);g.lineTo(c-8,c);g.lineTo(c,c+8);g.lineTo(c+8,c);g.lineTo(c+26,c);g.stroke();
  g.strokeStyle='#1a2a4a';g.lineWidth=5;g.beginPath();g.arc(c,c,r+2,0,7);g.stroke();g.strokeStyle='#4fc3ff';g.lineWidth=1.5;g.beginPath();g.arc(c,c,r+5,0,7);g.stroke();
  // throttle arc
  g.strokeStyle='#ff9a2e';g.lineWidth=4;g.beginPath();g.arc(c,c,r+5,Math.PI*.75,Math.PI*.75+Math.PI*.5*R.thr);g.stroke()}
function mapExtras(){const Z=mapZ,[gx,gy]=gpos(),S=(X,Y)=>[W/2+(X-gx)*Z,H/2-(Y-gy)*Z],bp=bpos(R.b,t),pts=predict();
  cx.save();cx.shadowColor='#3ee08a';cx.shadowBlur=12;cx.strokeStyle='#5dffa8';cx.lineWidth=2.5;cx.beginPath();for(const[x,y]of pts){const[sx,sy]=S(bp[0]+x,bp[1]+y);cx.lineTo(sx,sy)}cx.stroke();cx.restore();
  // SOI ring of current body
  const[cx0,cy0]=S(...bp);if(R.b.soi&&isFinite(R.b.soi)){const sr=R.b.soi*Z;if(sr>4&&sr<1e6){cx.save();cx.setLineDash([4,6]);cx.strokeStyle='#4fc3ff55';cx.beginPath();cx.arc(cx0,cy0,sr,0,7);cx.stroke();cx.restore()}}
  // apo/peri markers
  let mx=-1,mn=1e99,A,P;for(const[x,y]of pts){const r=Math.hypot(x,y);if(r>mx){mx=r;A=[x,y]}if(r<mn){mn=r;P=[x,y]}}
  const o=orbit(),mk=(q,l,col,val)=>{if(!q)return;const[sx,sy]=S(bp[0]+q[0],bp[1]+q[1]);cx.fillStyle=col;cx.beginPath();cx.moveTo(sx,sy);cx.lineTo(sx-6,sy-12);cx.lineTo(sx+6,sy-12);cx.fill();cx.font='700 11px Orbitron,system-ui';cx.textAlign='center';cx.fillText(l+' '+fmt(val),sx,sy-16);cx.textAlign='left'};
  if(o.e<1&&isFinite(o.ap))mk(A,'Ap',ROC.ap,o.ap);mk(P,'Pe',ROC.pe,o.pe);
  // body labels / rings
  for(const b of BL){const[sx,sy]=S(...bpos(b,t));if(sx<-40||sx>W+40||sy<-40||sy>H+40)continue;const rr=Math.max(b.R*Z,4);
    cx.strokeStyle=b.col;cx.globalAlpha=.7;cx.lineWidth=1.5;cx.beginPath();cx.arc(sx,sy,rr+4,0,7);cx.stroke();cx.globalAlpha=1;
    cx.font='600 12px Rajdhani,system-ui';cx.fillStyle='#000a';cx.fillText(b.n,sx+rr+8,sy+5);cx.fillStyle='#e8f1ff';cx.fillText(b.n,sx+rr+7,sy+4)}
  // ship marker
  cx.save();cx.translate(W/2,H/2);cx.rotate(R.ang);cx.shadowColor='#5dffa8';cx.shadowBlur=10;cx.fillStyle='#5dffa8';cx.beginPath();cx.moveTo(0,-9);cx.lineTo(6,7);cx.lineTo(0,3);cx.lineTo(-6,7);cx.fill();cx.restore();
  cx.font='700 12px Orbitron,system-ui';cx.fillStyle='#4fc3ff';cx.fillText('MAP · '+R.b.n.toUpperCase()+(o.e>=1?' · ESCAPE':''),16,H-16)}
const ROC={ap:'#4fc3ff',pe:'#ff9a2e'};
function loop(){requestAnimationFrame(loop);
  const on=!!R&&$('hud').style.display!='none';nv.style.display=on&&!map?'block':'none';wp.style.display=on?'block':'none';if(!on)return;
  try{navball();const w=WARPS[warpI];wp.textContent=(w>1?'⏩ ':'▶ ')+(w>=1e3?w.toExponential(0).replace('e+','e'):w)+'×'+(R.sas?' · SAS '+R.sas.toUpperCase():'');wp.style.color=w>1?'#ffb000':'#4fc3ff';
    if(map)mapExtras()}catch(e){}}
requestAnimationFrame(()=>requestAnimationFrame(loop));
})();
