// Flight UI: navball housing, altimeter, warp, staging stack, app bar. Original artwork, all drawn here.
(function(){
const $=id=>document.getElementById(id);
const css=`
#hud,#help{visibility:hidden!important}#urNav,#urWarp{display:none!important}
#fui{position:absolute;inset:0;z-index:4;pointer-events:none;font-family:'Segoe UI',system-ui,sans-serif;color:#cfe;display:none}
#fui .pn{pointer-events:auto;background:linear-gradient(#4a4f55,#2b2f34 55%,#22252a);border:1px solid #111;box-shadow:inset 0 1px 0 #7a8088,inset 0 -1px 0 #15171a,0 2px 8px #000a;border-radius:6px}
#fui .lcd{background:linear-gradient(#0b1512,#06100d);border:1px solid #000;box-shadow:inset 0 1px 4px #000;border-radius:3px;color:#5ff0b0;font-family:Consolas,'Courier New',monospace;text-shadow:0 0 4px #2f9a70}
#fNav{position:absolute;left:50%;bottom:0;width:340px;height:236px;margin-left:-170px;transform-origin:50% 100%;border-radius:120px 120px 0 0}
#fNav canvas{position:absolute;left:80px;top:46px}
#fSpd{position:absolute;left:85px;top:8px;width:170px;height:32px;text-align:center;cursor:pointer;font-size:15px;line-height:14px;padding-top:3px;box-sizing:border-box}
#fSpd small{display:block;font-size:9px;color:#8bc;letter-spacing:1px}
#fThr,#fFuel{position:absolute;top:60px}#fThr{left:8px}#fFuel{right:8px}
#fFuel{width:22px;height:150px}#fFuel i{position:absolute;left:3px;right:3px;bottom:3px;background:linear-gradient(#ffe070,#e09020);border-radius:2px}
#fFuel b,#fThr b{position:absolute;bottom:-14px;width:100%;text-align:center;font-size:9px;color:#9ab;font-weight:600}
.fbtn{pointer-events:auto;display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:24px;padding:0 5px;box-sizing:border-box;cursor:pointer;font-size:11px;font-weight:700;color:#9aa;background:linear-gradient(#555b62,#2e3237);border:1px solid #111;border-radius:4px;box-shadow:inset 0 1px 0 #889;user-select:none}
.fbtn:hover{filter:brightness(1.2)}.fbtn.on{color:#0f2;background:linear-gradient(#2c5a35,#183520);text-shadow:0 0 5px #0f4}
#fSas{position:absolute;left:36px;top:12px;display:flex;flex-direction:column;gap:3px}#fSas2{position:absolute;right:36px;top:12px;display:flex;flex-direction:column;gap:3px}
#fAlt{position:absolute;left:50%;top:0;transform:translateX(-50%);padding:5px 10px 6px;border-radius:0 0 8px 8px;text-align:center;transform-origin:50% 0}
#fAlt .b{font-size:10px;color:#9bd;letter-spacing:2px;text-transform:uppercase}
#fOdo{display:flex;gap:2px;margin-top:2px;justify-content:center}
#fOdo .d{width:16px;height:24px;overflow:hidden;background:linear-gradient(#ddd,#fff 40%,#bbb);border-radius:2px;box-shadow:inset 0 2px 3px #0008,inset 0 -2px 3px #0008}
#fOdo .d div{transition:transform .25s;color:#111;font:700 18px/24px Consolas,monospace;text-align:center}
#fOdo .u{color:#9bd;font-size:11px;align-self:flex-end;margin-left:3px}
#fWarp{position:absolute;left:0;top:0;padding:5px 8px;border-radius:0 0 8px 0;transform-origin:0 0}
#fWarp .row{display:flex;align-items:center;gap:1px}
#fWarp .tri{width:14px;height:16px;cursor:pointer;clip-path:polygon(0 0,100% 50%,0 100%);background:#3a4046}
#fWarp .tri.on{background:#3cf07a;box-shadow:0 0 6px #3cf07a}#fWarp .tri.lock{opacity:.35}
#fWarp .clk{margin-top:4px;padding:2px 6px;font-size:13px}
#fStage{position:absolute;left:6px;bottom:8px;display:flex;flex-direction:column-reverse;gap:4px;max-height:70vh;overflow:auto;padding:4px;transform-origin:0 100%}
#fStage .sg{display:flex;align-items:center;gap:3px;padding:3px 5px}#fStage .sg.cur{border-color:#3cf07a;box-shadow:0 0 6px #3cf07a80,inset 0 1px 0 #7a8088}
#fStage .sn{font:700 13px Consolas,monospace;color:#7c9;width:18px}
#fStage .ic{width:30px;height:30px;position:relative;border-radius:4px;background:#1b1e22;border:1px solid #000;display:flex;align-items:center;justify-content:center}
#fStage .ic.act{cursor:pointer;outline:1px solid #3cf07a}#fStage .ic i{position:absolute;left:2px;right:2px;bottom:1px;height:3px;background:#222}#fStage .ic i b{display:block;height:100%;background:#3cf07a}
#fApps{position:absolute;right:0;top:0;display:flex;gap:3px;padding:5px;border-radius:0 0 0 8px;transform-origin:100% 0}
#fOrb{position:absolute;right:6px;top:44px;width:190px;font-size:12px;transform-origin:100% 0}
#fOrb h4{margin:0;padding:4px 8px;font-size:11px;letter-spacing:1px;color:#bcd;cursor:pointer;border-bottom:1px solid #111}
#fOrb .bd{padding:5px 8px}#fOrb .bd div{display:flex;justify-content:space-between}#fOrb .bd span:last-child{color:#5ff0b0;font-family:Consolas,monospace}
#fHelp{position:absolute;right:6px;top:44px;width:260px;padding:8px;font-size:12px;line-height:1.5;display:none;pointer-events:auto}
#msg{top:28%!important;font-size:22px!important;transition:opacity .4s}#msg:empty{opacity:0}#msg:not(:empty){opacity:1;display:block;width:auto!important;left:50%;transform:translateX(-50%);padding:6px 18px;border-radius:6px;background:#0008;color:#ffd060}
`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
const ui=document.createElement('div');ui.id='fui';document.body.appendChild(ui);
ui.innerHTML=`
<div id="fWarp" class="pn"><div class="row"><span class="fbtn" id="fPlay">❚❚</span><span id="fTris" class="row" style="margin-left:4px"></span></div><div class="clk lcd" id="fClk">T+ 0d 00:00:00</div></div>
<div id="fAlt" class="pn"><div class="b" id="fBody">Body</div><div id="fOdo"></div></div>
<div id="fApps" class="pn"></div>
<div id="fOrb" class="pn"><h4 id="fOrbH">▾ ORBIT INFO</h4><div class="bd" id="fOrbB"></div></div>
<div id="fHelp" class="pn">W/S throttle · Z full · X cut · A/D rotate<br>SPACE stage · P parachute · T/Y hold retro/pro<br>M map · V 2D/3D · , . time warp · wheel zoom<br>C cheats · R refuel (cheat) · B back to VAB</div>
<div id="fStage"></div>
<div id="fNav" class="pn"><div id="fSpd" class="lcd"><small id="fSpdM">SURFACE</small><span id="fSpdV">0 m/s</span></div>
<canvas id="fThr" width="40" height="160"></canvas><div id="fFuel" class="lcd"><i id="fFuelI"></i><b>FUEL</b></div>
<div id="fSas"><span class="fbtn" id="fSasB">SAS</span><span class="fbtn" id="fChB" title="Parachute">⛱</span></div>
<div id="fSas2"><span class="fbtn" id="fPro" title="Hold prograde">⊕</span><span class="fbtn" id="fRet" title="Hold retrograde">⊗</span></div>
<canvas id="fBall" width="180" height="180"></canvas></div>`;
const tris=$('fTris');for(let i=1;i<WARPS.length;i++){const d=document.createElement('div');d.className='tri';d.title=WARPS[i]+'×';d.onclick=()=>setW(i);tris.appendChild(d)}
function setW(i){const max=cheat.warp?WARPS.length-1:9;warpI=Math.max(0,Math.min(max,i))}
$('fPlay').onclick=()=>setW(warpI?0:1);
const apps=[['🗺','Map',()=>{map=!map}],['⚙','Cheats',()=>{const c=$('cheats');c.style.display=c.style.display=='block'?'none':'block'}],['3D','2D/3D view',()=>{v3=!v3;msg(v3?'3D view':'2D view')}],['ⓘ','Orbit info',()=>{orbOpen=!orbOpen;orbVis=!orbVis||orbOpen;}],['?','Controls',()=>{const h=$('fHelp');h.style.display=h.style.display=='block'?'none':'block'}],['⌂','Back to VAB',()=>toBuilder()]];
let orbOpen=true,orbVis=true;
apps.forEach(([l,tt,f],i)=>{const b=document.createElement('span');b.className='fbtn';b.textContent=l;b.title=tt;b.id='fApp'+i;b.onclick=f;$('fApps').appendChild(b)});
$('fOrbH').onclick=()=>{orbOpen=!orbOpen};
let surf=true;$('fSpd').onclick=()=>{surf=!surf};
$('fSasB').onclick=()=>{R.sas=R.sas?null:'pro';msg(R.sas?'SAS: hold prograde':'SAS off')};
$('fPro').onclick=()=>{R.sas=R.sas=='pro'?null:'pro';msg(R.sas?'SAS: hold prograde':'SAS off')};
$('fRet').onclick=()=>{R.sas=R.sas=='retro'?null:'retro';msg(R.sas?'SAS: hold retrograde':'SAS off')};
function chute(){if(!R)return;if(R.parts.some(p=>p.type=='chute')&&!R.chute){R.chute=true;R.chuteT=0;msg('🪂 Parachute deployed')}else if(!R.parts.some(p=>p.type=='chute'))msg('No parachute')}
$('fChB').onclick=chute;
// odometer
const odo=$('fOdo'),ND=7,cols=[];for(let i=0;i<ND;i++){const d=document.createElement('div');d.className='d';const s=document.createElement('div');s.innerHTML=[0,1,2,3,4,5,6,7,8,9].join('<br>');d.appendChild(s);odo.appendChild(d);cols.push(s)}
const unit=document.createElement('span');unit.className='u';odo.appendChild(unit);
// navball
const bc=$('fBall'),bg=bc.getContext('2d'),N=180,img=bg.createImageData(N,N);
function attitude(dx,dy,ux,uy){const ex=uy,ey=-ux,vt=dx*ux+dy*uy,hz=dx*ex+dy*ey;return[Math.atan2(vt,Math.abs(hz)),hz>=0?Math.PI/2:-Math.PI/2]}
function basis(e,h){return{f:[Math.cos(e)*Math.sin(h),Math.sin(e),Math.cos(e)*Math.cos(h)],r:[Math.cos(h),0,-Math.sin(h)],u:[-Math.sin(e)*Math.sin(h),Math.cos(e),-Math.sin(e)*Math.cos(h)]}}
function proj(B,lat,lon){const d=[Math.cos(lat)*Math.sin(lon),Math.sin(lat),Math.cos(lat)*Math.cos(lon)],dt=(a)=>a[0]*d[0]+a[1]*d[1]+a[2]*d[2];return[dt(B.r),dt(B.u),dt(B.f)]}
function drawBall(){const r0=Math.hypot(R.x,R.y)||1,ux=R.x/r0,uy=R.y/r0,[e,h]=attitude(Math.sin(R.ang),Math.cos(R.ang),ux,uy),B=basis(e,h),D=img.data,c=N/2,rad=c-2;
  const D10=Math.PI/18,D30=Math.PI/6;
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){const sx=(x-c)/rad,sy=(c-y)/rad,q=sx*sx+sy*sy,o=(y*N+x)*4;if(q>1){D[o+3]=0;continue}
    const z=Math.sqrt(1-q),dx=sx*B.r[0]+sy*B.u[0]+z*B.f[0],dy=sx*B.r[1]+sy*B.u[1]+z*B.f[1],dz=sx*B.r[2]+sy*B.u[2]+z*B.f[2];
    const lat=Math.asin(Math.max(-1,Math.min(1,dy))),lon=Math.atan2(dx,dz),sh=.45+.55*z;
    let R_,G,Bb;if(lat>=0){R_=60;G=150;Bb=225}else{R_=150;G=95;Bb=45}
    const ml=Math.abs(lat/D10-Math.round(lat/D10))*D10,mo=Math.abs(lon/D30-Math.round(lon/D30))*D30*Math.cos(lat);
    if(Math.abs(lat)<.012){R_=G=Bb=250}else if(ml<.006||(mo<.006&&Math.abs(lat)<1.4)){R_=R_*.55+110;G=G*.55+110;Bb=Bb*.55+110}
    const a=q>.96?(1-q)/.04:1;D[o]=R_*sh;D[o+1]=G*sh;D[o+2]=Bb*sh;D[o+3]=255*a}
  bg.putImageData(img,0,0);
  bg.font='bold 9px Consolas';bg.textAlign='center';bg.textBaseline='middle';
  for(let L=-80;L<=80;L+=20){if(!L)continue;for(const lo of [h-.35,h+.35]){const p=proj(B,L*Math.PI/180,lo);if(p[2]>.2){bg.fillStyle=L>0?'#eaf6ff':'#ffe6c8';bg.fillText(Math.abs(L),c+p[0]*rad,c-p[1]*rad)}}}
  for(let k=0;k<12;k++){const lo=k*D30,p=proj(B,0.06,lo);if(p[2]>.15){bg.fillStyle='#fff';bg.fillText(k==0?'N':k==3?'E':k==6?'S':k==9?'W':String(k*30),c+p[0]*rad,c-p[1]*rad-6)}}
  const v=Math.hypot(R.vx,R.vy);if(v>.5){const[ve,vh]=attitude(R.vx/v,R.vy/v,ux,uy);for(const s of [1,-1]){const p=proj(B,s*ve,s>0?vh:vh+Math.PI);if(p[2]>0)mark(c+p[0]*rad,c-p[1]*rad,s>0)}}
  const g=bg.createRadialGradient(c-rad*.35,c-rad*.4,2,c,c,rad);g.addColorStop(0,'#ffffff55');g.addColorStop(.35,'#ffffff08');g.addColorStop(1,'#00000070');bg.fillStyle=g;bg.beginPath();bg.arc(c,c,rad,0,7);bg.fill();
  bg.strokeStyle='#111';bg.lineWidth=3;bg.stroke();
  bg.strokeStyle='#ffc400';bg.lineWidth=3;bg.lineJoin='round';bg.beginPath();bg.moveTo(c-26,c+8);bg.lineTo(c-10,c+8);bg.lineTo(c,c-4);bg.lineTo(c+10,c+8);bg.lineTo(c+26,c+8);bg.stroke();bg.beginPath();bg.arc(c,c,2.5,0,7);bg.fillStyle='#ffc400';bg.fill()}
function mark(x,y,pro){bg.strokeStyle='#d6ff3c';bg.fillStyle='#d6ff3c';bg.lineWidth=2;bg.beginPath();bg.arc(x,y,7,0,7);bg.stroke();
  if(pro){bg.beginPath();bg.arc(x,y,1.8,0,7);bg.fill();bg.beginPath();bg.moveTo(x,y-7);bg.lineTo(x,y-12);bg.moveTo(x-7,y);bg.lineTo(x-12,y);bg.moveTo(x+7,y);bg.lineTo(x+12,y);bg.stroke()}
  else{bg.beginPath();bg.moveTo(x-5,y-5);bg.lineTo(x+5,y+5);bg.moveTo(x+5,y-5);bg.lineTo(x-5,y+5);bg.moveTo(x,y+7);bg.lineTo(x,y+12);bg.moveTo(x-6,y-4);bg.lineTo(x-10,y-9);bg.moveTo(x+6,y-4);bg.lineTo(x+10,y-9);bg.stroke()}}
const tc=$('fThr').getContext('2d');
function drawThr(){tc.clearRect(0,0,40,160);const cx=150,cy=80,r=130,a0=Math.PI*.83,a1=Math.PI*1.17;tc.lineCap='butt';
  tc.lineWidth=12;tc.strokeStyle='#0a0d0c';tc.beginPath();tc.arc(cx,cy,r,a0,a1);tc.stroke();
  const am=a1-(a1-a0)*R.thr,gr=tc.createLinearGradient(0,150,0,10);gr.addColorStop(0,'#3cf07a');gr.addColorStop(.7,'#ffd040');gr.addColorStop(1,'#ff6030');
  tc.strokeStyle=gr;tc.lineWidth=9;if(R.thr>0){tc.beginPath();tc.arc(cx,cy,r,am,a1);tc.stroke()}
  tc.strokeStyle='#ddd';tc.lineWidth=1;for(let i=0;i<=10;i++){const a=a0+(a1-a0)*i/10;tc.beginPath();tc.moveTo(cx+Math.cos(a)*(r+7),cy+Math.sin(a)*(r+7));tc.lineTo(cx+Math.cos(a)*(r+(i%5?10:13)),cy+Math.sin(a)*(r+(i%5?10:13)));tc.stroke()}
  tc.fillStyle='#fff';tc.beginPath();const px=cx+Math.cos(am)*(r-8),py=cy+Math.sin(am)*(r-8);tc.moveTo(px,py);tc.lineTo(px+9,py-5);tc.lineTo(px+9,py+5);tc.fill();
  tc.fillStyle='#9ab';tc.font='bold 9px system-ui';tc.textAlign='center';tc.fillText((R.thr*100|0)+'%',22,158)}
// staging
const ICON={eng:'<svg width="22" height="24"><path d="M7 2h8v6l5 14H2L7 8z" fill="#8a9099" stroke="#222"/><path d="M8 18h6l-3 5z" fill="#ff8a30"/></svg>',
 tank:'<svg width="18" height="24"><rect x="2" y="1" width="14" height="20" rx="3" fill="#d8dde2" stroke="#222"/><rect x="2" y="7" width="14" height="3" fill="#e05030"/></svg>',
 dec:'<svg width="24" height="14"><rect x="1" y="4" width="22" height="6" fill="#e0a020" stroke="#222"/><path d="M4 7h16" stroke="#222" stroke-dasharray="2 2"/></svg>',
 chute:'<svg width="24" height="22"><path d="M2 11Q12-6 22 11z" fill="#e04040" stroke="#222"/><path d="M2 11L12 21L22 11M12 4V21" stroke="#ddd" fill="none"/></svg>',
 pod:'<svg width="20" height="22"><path d="M7 2h6l6 18H1z" fill="#cfd4da" stroke="#222"/><circle cx="10" cy="11" r="2.5" fill="#4fc3ff"/></svg>',
 shield:'<svg width="22" height="14"><path d="M1 3h20q-10 14-20 0z" fill="#6a4a30" stroke="#222"/></svg>',
 legs:'<svg width="22" height="22"><path d="M11 2v10M11 8L3 20M11 8l8 12" stroke="#bbb" stroke-width="2.5"/></svg>'};
const fs=$('fStage');let stKey='';
function drawStages(){const secs=[[]];R.parts.forEach(p=>{secs[secs.length-1].push(p);if(p.type=='dec')secs.push([])});
  // secs top→bottom; dec ends the section above it and belongs to its separation
  const groups=secs.map((s,i)=>({parts:s.filter(p=>p.type!='dec'),dec:i>0?secs[i-1].find(p=>p.type=='dec'):null}));
  const hasCh=R.parts.some(p=>p.type=='chute');
  const key=R.parts.length+'|'+R.chute+'|'+hasCh;
  if(key!=stKey){stKey=key;let h='';
    if(hasCh)h+=`<div class="sg pn"><span class="sn">⛱</span><div class="ic${R.chute?'':' act'}" data-a="chute" title="Deploy parachute">${ICON.chute}</div></div>`;
    for(let i=0;i<groups.length;i++){const g=groups[i],cur=i==groups.length-1,n=groups.length-1-i;
      let ic=g.parts.filter(p=>p.type!='chute').map((p,k)=>`<div class="ic" title="${p.name}">${ICON[p.type]||ICON.tank}${p.type=='tank'?`<i><b data-f="${i}_${k}"></b></i>`:''}</div>`).join('');
      if(g.dec)ic+=`<div class="ic${cur?' act':''}" ${cur?'data-a="stage"':''} title="Decoupler${cur?' — click to stage':''}">${ICON.dec}</div>`;
      h=`<div class="sg pn${cur?' cur':''}"><span class="sn">${n}</span>${ic}</div>`+h}
    fs.innerHTML=h;
    fs.querySelectorAll('[data-a]').forEach(e=>e.onclick=()=>{if(!R)return;e.dataset.a=='stage'?stage():chute()})}
  groups.forEach((g,i)=>g.parts.filter(p=>p.type!='chute').forEach((p,k)=>{if(p.type!='tank')return;const b=fs.querySelector(`[data-f="${i}_${k}"]`),o=design.find(q=>q.name==p.name);if(b)b.style.width=Math.min(100,100*(p.fuel||0)/((o&&o.fuel)||p.fuel||1))+'%'}))}
function pad(n){return String(n).padStart(2,'0')}
let lastOdo='';
function tick(){requestAnimationFrame(tick);
  const vis=!!R&&$('hud')&&$('hud').style.display!='none'&&$('menu').style.display=='none'&&getComputedStyle($('build')).display=='none';
  ui.style.display=vis?'block':'none';if(!vis)return;
  try{
  const s=Math.min(1,innerWidth/760,innerHeight/560);
  $('fNav').style.transform=`scale(${s})`;['fAlt','fWarp','fApps','fOrb','fStage'].forEach(id=>$(id).style.transform=(id=='fAlt'?'translateX(-50%) ':'')+`scale(${Math.max(.6,s)})`);
  drawBall();drawThr();drawStages();
  const tr=$('fTris').children,max=cheat.warp?WARPS.length-1:9;for(let i=0;i<tr.length;i++){tr[i].className='tri'+(i+1<=warpI?' on':'')+(i+1>max?' lock':'')}
  $('fPlay').textContent=warpI?'▶▶':'❚❚';$('fPlay').title=WARPS[warpI]+'×';
  const T=Math.floor(t),Y=Math.floor(T/31536000),D=Math.floor(T%31536000/86400);$('fClk').textContent=`T+ ${Y?Y+'y ':''}${D}d ${pad(Math.floor(T%86400/3600))}:${pad(Math.floor(T%3600/60))}:${pad(T%60)}  ${WARPS[warpI]}×`;
  let alt=Math.hypot(R.x,R.y)-R.b.R-rocketH()/2;alt=Math.max(0,alt);let u='m',av=alt;if(av>=1e7){av/=1e3;u='km'}if(av>=1e7){av/=1e3;u='Mm'}if(av>=1e7){av/=1e3;u='Gm'}
  const ds=String(Math.floor(av)).padStart(ND,'0').slice(-ND);if(ds+u!=lastOdo){lastOdo=ds+u;for(let i=0;i<ND;i++)cols[i].style.transform=`translateY(${-24*+ds[i]}px)`;unit.textContent=u}
  $('fBody').textContent='Altitude · '+(R.b.name||'');
  const om=R.b.rot||R.b.spin||0,vs=Math.hypot(R.vx-(om?-om*R.y:0),R.vy-(om?om*R.x:0)),vo=Math.hypot(R.vx,R.vy);
  $('fSpdM').textContent=surf?'SURFACE':'ORBIT';$('fSpdV').textContent=(surf?vs:vo).toFixed(1)+' m/s';
  const sec=bottom(),fuel=sec.reduce((a,p)=>a+(p.fuel||0),0),fmax=sec.reduce((a,p)=>{const o=design.find(q=>q.name==p.name&&q.type==p.type);return a+((o&&o.fuel)||p.fuel||0)},0);
  $('fFuelI').style.height=(fmax?144*fuel/fmax:0)+'px';
  $('fSasB').classList.toggle('on',!!R.sas);$('fPro').classList.toggle('on',R.sas=='pro');$('fRet').classList.toggle('on',R.sas=='retro');$('fChB').classList.toggle('on',!!R.chute);
  $('fApp0').classList.toggle('on',!!map);$('fApp2').textContent=v3?'3D':'2D';$('fApp1').classList.toggle('on',$('cheats').style.display=='block');
  $('fOrb').style.display=orbVis?'block':'none';$('fOrbB').style.display=orbOpen?'block':'none';$('fOrbH').textContent=(orbOpen?'▾':'▸')+' ORBIT INFO';
  if(orbOpen){const o=orbit(),si=stageInfo(R.parts),cur=si&&si.length?si[0]:null;
    $('fOrbB').innerHTML=`<div><span>Apoapsis</span><span>${fmt(o.ap)}</span></div><div><span>Periapsis</span><span>${fmt(o.pe)}</span></div><div><span>Eccentricity</span><span>${o.e.toFixed(3)}</span></div><div><span>Heat</span><span style="color:${R.heat>.7?'#ff6040':'#5ff0b0'}">${((R.heat||0)*100).toFixed(0)}%</span></div><div><span>Mass</span><span>${mass().toFixed(2)} t</span></div>${cur&&cur.dv!=null?`<div><span>Stage Δv</span><span>${cur.dv.toFixed(0)} m/s</span></div>`:''}`}
  }catch(e){}
}
tick();
})();
