// zombie-apocalypse/fx.js — night atmosphere, street lamps, flashlight, weather, generated music, hurt feedback.
// Exposes ZA.fx = {setLow(bool), low, flash(), weather, music:{sting(name), vol(v)}, flashlight:{on,toggle()}}.
(function(){
const ZA=window.ZA;if(!ZA)return;
const LSg=k=>{try{return localStorage.getItem(k)}catch(e){return null}},LSs=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
const FX=ZA.fx=ZA.fx||{};
let low=LSg('za_lowfx')==='1';FX.low=low;ZA.lowfx=low;
let musicVol=+(LSg('za_music')??.35);if(!isFinite(musicVol))musicVol=.35;
const V3=THREE.Vector3,TAU=Math.PI*2,rnd=Math.random,clamp=(v,a,b)=>v<a?a:v>b?b:v;

// ---------- shared soft textures ----------
function radTex(stops,n=64){const c=document.createElement('canvas');c.width=c.height=n;const g=c.getContext('2d'),gr=g.createRadialGradient(n/2,n/2,0,n/2,n/2,n/2);for(const s of stops)gr.addColorStop(s[0],s[1]);g.fillStyle=gr;g.fillRect(0,0,n,n);return new THREE.CanvasTexture(c)}
const T_GLOW=radTex([[0,'rgba(255,255,255,1)'],[.2,'rgba(255,255,255,.55)'],[.5,'rgba(255,255,255,.12)'],[1,'rgba(255,255,255,0)']]);
const T_POOL=radTex([[0,'rgba(255,255,255,.9)'],[.45,'rgba(255,255,255,.35)'],[1,'rgba(255,255,255,0)']]);
const T_MIST=(()=>{const n=128,c=document.createElement('canvas');c.width=c.height=n;const g=c.getContext('2d');
 for(let i=0;i<14;i++){const x=24+rnd()*80,y=24+rnd()*80,r=18+rnd()*30,gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(255,255,255,.35)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,n,n)}
 const m=g.createRadialGradient(n/2,n/2,n*.25,n/2,n/2,n/2);m.addColorStop(0,'rgba(0,0,0,0)');m.addColorStop(1,'rgba(0,0,0,1)');g.globalCompositeOperation='destination-out';g.fillStyle=m;g.fillRect(0,0,n,n);return new THREE.CanvasTexture(c)})();
const T_MOON=(()=>{const n=128,c=document.createElement('canvas');c.width=c.height=n;const g=c.getContext('2d');
 let gr=g.createRadialGradient(n*.45,n*.42,n*.05,n/2,n/2,n*.36);gr.addColorStop(0,'#fbf8ec');gr.addColorStop(1,'#cfd3d6');g.fillStyle=gr;g.beginPath();g.arc(n/2,n/2,n*.36,0,TAU);g.fill();
 g.fillStyle='rgba(120,128,140,.35)';for(const[x,y,r]of[[.38,.4,.09],[.6,.55,.07],[.5,.68,.05],[.62,.34,.045],[.33,.6,.04]]){g.beginPath();g.arc(x*n,y*n,r*n,0,TAU);g.fill()}return new THREE.CanvasTexture(c)})();

// ---------- night palette + sky patch ----------
const hemi=(()=>{let h=null;scene.traverse(o=>{if(o.isHemisphereLight&&!h)h=o});return h})();
const sky=window._sky,SU=sky&&sky.userData&&sky.userData.uniforms;
if(SU&&sky.material&&sky.material.fragmentShader){let f=sky.material.fragmentShader;const rep=[['uniform vec3 uFogColor;','uniform vec3 uFogColor;uniform vec3 uGlow;uniform vec3 uCloud;'],['vec3 glowCol = vec3(1.0, 0.80, 0.52);','vec3 glowCol = uGlow;'],['float disc = smoothstep(0.99965, 0.99988, sd);','float disc = 0.0;'],['col = mix(col, cc, alpha);','col = mix(col, cc * uCloud, alpha);']];
 if(rep.every(r=>f.includes(r[0]))){for(const r of rep)f=f.replace(r[0],r[1]);SU.uGlow={value:new THREE.Color(.3,.36,.5)};SU.uCloud={value:new THREE.Color(.2,.22,.3)};sky.material.uniforms=SU;sky.material.fragmentShader=f;sky.material.needsUpdate=true}}
// palettes: hz/zn sky gradient, cl cloud multiplier, fog colour, fog range, hemi light, moon light
const PAL={
 night:{hz:[.075,.095,.13],zn:[.012,.02,.045],cl:[.16,.18,.25],fog:[.045,.06,.075],near:14,far:105,hI:.42,hc:[.5,.6,.85],sI:.5,sc:[.62,.72,.95]},
 rain:{hz:[.06,.07,.085],zn:[.02,.025,.035],cl:[.1,.11,.14],fog:[.05,.06,.07],near:8,far:70,hI:.36,hc:[.45,.52,.68],sI:.3,sc:[.55,.62,.8]},
 boss:{hz:[.32,.045,.03],zn:[.07,0,.005],cl:[.55,.12,.08],fog:[.2,.035,.03],near:8,far:72,hI:.46,hc:[.95,.45,.4],sI:.42,sc:[1,.5,.42]},
 fog:{hz:[.11,.12,.13],zn:[.05,.055,.065],cl:[.18,.19,.21],fog:[.1,.11,.12],near:2,far:36,hI:.45,hc:[.6,.64,.72],sI:.3,sc:[.6,.65,.75]}};
// zombie-apocalypse/sky.js tone-maps the sky like the scene (so its horizon really equals the fog), which lifts dark values:
// it uses darker, greyer COD-style night values (murky blue-grey horizon = fog, near-black blue zenith)
if(sky&&sky.userData&&sky.userData.moon){
 Object.assign(PAL.night,{hz:[.046,.052,.062],zn:[.007,.009,.017],cl:[.085,.092,.115],fog:[.036,.041,.049]});
 Object.assign(PAL.rain,{hz:[.036,.04,.046],zn:[.01,.012,.016],cl:[.055,.06,.07],fog:[.033,.037,.042]});
 Object.assign(PAL.boss,{hz:[.16,.03,.02],zn:[.035,0,.004],cl:[.3,.07,.05],fog:[.12,.024,.02]});
 Object.assign(PAL.fog,{hz:[.07,.075,.082],zn:[.03,.033,.04],cl:[.1,.105,.115],fog:[.066,.071,.078]})}
const cur=JSON.parse(JSON.stringify(PAL.night));let tgt=PAL.night;
const C1=new THREE.Color(),moonDir=SU?SU.uSunDir.value:new V3(.45,.32,.35).normalize();
let lf=0; // lightning flash level
function lerpA(a,b,k){for(let i=0;i<a.length;i++)a[i]+=(b[i]-a[i])*k}
function applyPal(dt){const k=Math.min(1,dt*1.2);for(const key of['hz','zn','cl','fog','hc','sc'])lerpA(cur[key],tgt[key],k);for(const key of['near','far','hI','sI'])cur[key]+=(tgt[key]-cur[key])*k;
 const L=lf,f=cur.fog;scene.fog.color.setRGB(f[0]+L*.25,f[1]+L*.27,f[2]+L*.32);scene.fog.near=cur.near;scene.fog.far=cur.far+L*40;scene.background.copy(scene.fog.color);
 if(SU){SU.uHorizon.value.setRGB(cur.hz[0]+L*.45,cur.hz[1]+L*.5,cur.hz[2]+L*.6);SU.uZenith.value.setRGB(cur.zn[0]+L*.3,cur.zn[1]+L*.32,cur.zn[2]+L*.4);SU.uFogColor.value.copy(scene.fog.color);
  if(SU.uCloud)SU.uCloud.value.setRGB(cur.cl[0]+L*1.2,cur.cl[1]+L*1.25,cur.cl[2]+L*1.4)}
 if(hemi){hemi.intensity=cur.hI+L*2.2;hemi.color.setRGB(cur.hc[0],cur.hc[1],cur.hc[2]);hemi.groundColor.setRGB(.16,.13,.1)}
 sun.intensity=cur.sI;sun.color.setRGB(cur.sc[0],cur.sc[1],cur.sc[2])}
applyPal(1);
// moon sprite (+ halo) parked far along the light direction
const moon=new THREE.Sprite(new THREE.SpriteMaterial({map:T_MOON,fog:false,depthWrite:false,transparent:true,toneMapped:false}));moon.scale.setScalar(34);
const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:T_GLOW,color:0x6f86b0,fog:false,depthWrite:false,transparent:true,opacity:.45,blending:THREE.AdditiveBlending,toneMapped:false}));halo.scale.setScalar(150);
moon.renderOrder=halo.renderOrder=-.5;scene.add(halo,moon);
const NOMOON=!!(sky&&sky.userData&&sky.userData.moon);if(NOMOON)moon.visible=halo.visible=false; // zombie-apocalypse/sky.js draws its own moon

// ---------- ground mist ----------
const mistMat=new THREE.MeshBasicMaterial({map:T_MIST,color:0x8796ab,transparent:true,opacity:.16,depthWrite:false}),mistGeo=new THREE.PlaneGeometry(30,30).rotateX(-Math.PI/2);
const mists=[];for(let i=0;i<5;i++){const m=new THREE.Mesh(mistGeo,mistMat);m.position.set((rnd()-.5)*60,0,(rnd()-.5)*60);m.rotation.y=rnd()*TAU;m.userData.h=.35+rnd()*.7;m.userData.s=.15+rnd()*.25;m.renderOrder=2;scene.add(m);mists.push(m)}
function tickMist(dt){const p=me.pos;for(const m of mists){const o=m.position;o.x+=m.userData.s*dt;o.z+=m.userData.s*.4*dt;m.rotation.y+=dt*.01;
 if(o.x-p.x>32)o.x-=64;if(o.x-p.x<-32)o.x+=64;if(o.z-p.z>32)o.z-=64;if(o.z-p.z<-32)o.z+=64;o.y=hAt(o.x,o.z)+m.userData.h}}

// ---------- street lamps (fake light: glow sprite + cone + ground pool, max 2 real point lights) ----------
const LAMPC=0xffc27a,lamps=[];
const poleMat=new THREE.MeshStandardMaterial({color:0x2a2a2c,roughness:.7,metalness:.4}),bulbMat=new THREE.MeshBasicMaterial({color:0xfff0c8});
const poleGeo=new THREE.CylinderGeometry(.07,.1,5,6).translate(0,2.5,0),armGeo=new THREE.BoxGeometry(1.2,.08,.08).translate(.55,0,0),headGeo=new THREE.BoxGeometry(.45,.14,.28),bulbGeo=new THREE.BoxGeometry(.3,.04,.18);
const coneGeo=(()=>{const g=new THREE.CylinderGeometry(.18,2.4,4.7,14,1,true).translate(0,-2.35,0),p=g.attributes.position,c=new Float32Array(p.count*3);for(let i=0;i<p.count;i++){const v=p.getY(i)>-1?1:0;c[i*3]=c[i*3+1]=c[i*3+2]=v}g.setAttribute('color',new THREE.BufferAttribute(c,3));return g})();
const poolGeo=new THREE.PlaneGeometry(7,7).rotateX(-Math.PI/2);
const PL=[];
function buildLamps(){if(lamps.length)return;let spots=(ZA.lampSpots||[]).slice(0,24);
 if(!spots.length){const s=spawnPoint(0);for(const[dx,dz]of[[7,6],[-8,-4],[3,-14],[-6,14]])spots.push({x:s.x+dx,z:s.z+dz})}
 for(const s of spots){const x=s.x,z=s.z;let gy=hAt(x,z);if(!(gy<50))gy=0;if(s.y!=null&&gy>s.y-1)gy=Math.max(0,s.y-5);const own=!(s.pole===true||s.built===true),top=own?gy+5:(s.y!=null?s.y:gy+5);
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=s.yaw!=null?s.yaw:rnd()*TAU;
  if(own){const pole=new THREE.Mesh(poleGeo,poleMat);pole.position.y=gy;const arm=new THREE.Mesh(armGeo,poleMat);arm.position.y=top-.05;const hd=new THREE.Mesh(headGeo,poleMat);hd.position.set(1.1,top-.05,0);g.add(pole,arm,hd)}
  const hx=own?1.1:0;const bulb=new THREE.Mesh(bulbGeo,bulbMat.clone());bulb.position.set(hx,top-.14,0);
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:T_GLOW,color:LAMPC,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:.9}));glow.scale.setScalar(2.6);glow.position.set(hx,top-.2,0);
  const cone=new THREE.Mesh(coneGeo,new THREE.MeshBasicMaterial({color:LAMPC,vertexColors:true,transparent:true,opacity:.09,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}));cone.position.set(hx,top-.15,0);cone.scale.y=(top-gy-.15)/4.7;
  const pool=new THREE.Mesh(poolGeo,new THREE.MeshBasicMaterial({map:T_POOL,color:LAMPC,transparent:true,opacity:.42,depthWrite:false,blending:THREE.AdditiveBlending,polygonOffset:true,polygonOffsetFactor:-2}));pool.position.set(hx,gy+.06,0);
  g.add(bulb,glow,cone,pool);scene.add(g);g.updateMatrixWorld(true);
  const wp=new V3(hx,top-.4,0).applyMatrix4(g.matrixWorld);
  lamps.push({g,bulb,glow,cone,pool,wp,v:1,broken:rnd()<.35,bT:2+rnd()*10,burst:0,flT:0,on:1})}
 for(let i=0;i<2;i++){const l=new THREE.PointLight(LAMPC,0,16,2);l.castShadow=false;scene.add(l);PL.push(l)}
 setLow(low)}
let plT=0;const plL=[null,null];
function tickLamps(dt){
 for(const l of lamps){l.bT-=dt;
  if(l.burst>0){l.burst-=dt;l.flT-=dt;if(l.flT<=0){l.flT=.03+rnd()*.09;l.on=rnd()<.45?1:.05+rnd()*.15}if(l.burst<=0)l.on=1}
  else if(l.bT<=0){l.burst=.25+rnd()*(l.broken?1.4:.5);l.bT=l.broken?1.5+rnd()*4:9+rnd()*20}
  const v=l.on*(.94+rnd()*.06);if(Math.abs(v-l.v)<.02&&l.burst<=0)continue;l.v=v;
  l.glow.material.opacity=.9*v;l.cone.material.opacity=.09*v;l.pool.material.opacity=.42*v;l.bulb.material.color.setScalar(.25+.75*v)}
 plT-=dt;if(plT<=0&&lamps.length){plT=.5;let a=null,b=null,da=1e9,db=1e9;for(const l of lamps){const d=l.wp.distanceToSquared(me.pos);if(d<da){db=da;b=a;da=d;a=l}else if(d<db){db=d;b=l}}plL[0]=da<1600?a:null;plL[1]=db<1600?b:null;for(let i=0;i<2;i++)if(plL[i])PL[i].position.copy(plL[i].wp)}
 for(let i=0;i<PL.length;i++)PL[i].intensity=plL[i]?1.7*plL[i].v:0}

// ---------- flashlight on the gun ----------
const torch=new THREE.SpotLight(0xfff1d6,0,42,.42,.55,1.3);torch.castShadow=false;torch.position.set(.06,-.08,-.85);torch.target.position.set(.03,-.12,-6);cam.add(torch,torch.target);
const beam=(()=>{const g=new THREE.CylinderGeometry(.02,1.9,14,16,1,true).translate(0,-7,0).rotateX(Math.PI/2),p=g.attributes.position,c=new Float32Array(p.count*3);for(let i=0;i<p.count;i++){const v=p.getZ(i)>-1?.9:0;c[i*3]=c[i*3+1]=c[i*3+2]=v}g.setAttribute('color',new THREE.BufferAttribute(c,3));g.rotateX(-.02);
 const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:0xfff1d6,vertexColors:true,transparent:true,opacity:.035,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,fog:true}));m.position.set(.2,-.2,-.35);m.renderOrder=3;cam.add(m);return m})();
const FL=FX.flashlight={on:true,toggle(){FL.on=!FL.on;blip(FL.on?2400:1800,.05,.03,'square')}};let flI=0;
addEventListener('keydown',e=>{if(e.code!=='KeyL'||e.repeat||!running)return;const t=e.target&&e.target.tagName;if(t==='INPUT'||t==='TEXTAREA')return;FL.toggle()});
function tickTorch(dt){const want=FL.on&&me.alive?2.4:0;flI+=(want-flI)*Math.min(1,dt*14);torch.intensity=flI;beam.visible=false;beam.material.opacity=.035*flI/2.4}

// ---------- weather ----------
const W={rain:0,rainT:0,thunder:false,thT:6,kind:'clear',boss:false};FX.weather='clear';FX._W=W;
const RN=1400,rPos=new Float32Array(RN*6),rGeo=new THREE.BufferGeometry();rGeo.setAttribute('position',new THREE.BufferAttribute(rPos,3));
const rMat=new THREE.LineBasicMaterial({color:0x9fb0c4,transparent:true,opacity:0,depthWrite:false});const rain=new THREE.LineSegments(rGeo,rMat);rain.frustumCulled=false;rain.visible=false;scene.add(rain);
const rd=new Float32Array(RN*3);function seedDrop(i,c,any){rd[i*3]=c.x+(rnd()-.5)*36;rd[i*3+1]=c.y+(any?(rnd()-.4)*18:10+rnd()*4);rd[i*3+2]=c.z+(rnd()-.5)*36}
let rainN=low?350:RN;
function tickRain(dt){W.rain+=(W.rainT-W.rain)*Math.min(1,dt*.8);rain.visible=W.rain>.02;rMat.opacity=.5*W.rain;rainSound(W.rain);if(!rain.visible)return;
 const c=cam.position,sp=24*dt,wx=-1.6,wz=-.6;rGeo.setDrawRange(0,rainN*2);
 for(let i=0;i<rainN;i++){let x=rd[i*3]+wx*dt,y=rd[i*3+1]-sp,z=rd[i*3+2]+wz*dt;
  if(y<c.y-6||x-c.x>18||x-c.x<-18||z-c.z>18||z-c.z<-18){seedDrop(i,c,false);x=rd[i*3];y=rd[i*3+1];z=rd[i*3+2]}
  rd[i*3]=x;rd[i*3+1]=y;rd[i*3+2]=z;const j=i*6;rPos[j]=x;rPos[j+1]=y;rPos[j+2]=z;rPos[j+3]=x-wx*.03;rPos[j+4]=y+.7;rPos[j+5]=z-wz*.03}
 rGeo.attributes.position.needsUpdate=true}
let lf2=0;
function tickWeather(dt){
 if(W.thunder&&RS.ph==='live'){W.thT-=dt;if(W.thT<=0){W.thT=7+rnd()*16;FX.flash()}}
 if(lf2>0){lf2-=dt;if(lf2<=0)lf=Math.max(lf,.8)}
 lf*=Math.pow(.004,dt);if(lf<.003)lf=0;
 const want=W.boss?PAL.boss:ZA.modifier==='fog'?PAL.fog:W.rainT>0?PAL.rain:PAL.night;tgt=want}
FX.flash=function(){lf=1;lf2=.12+rnd()*.1;const d=.25+rnd()*1.6;setTimeout(()=>thunderSound(1.2-d*.35),d*1000)};
function setWeather(rnd_){const boss=!!(ZA.isBossWave&&ZA.isBossWave(rnd_)),h=(rnd_*2654435761>>>0)%7;
 W.boss=boss;const raining=!boss&&rnd_>1&&(h===1||h===3||h===5);W.rainT=raining?1:0;W.thunder=boss||(raining&&h!==3);W.thT=3+Math.random()*6;
 FX.weather=W.kind=boss?'boss':ZA.modifier==='fog'?'fog':raining?(W.thunder?'storm':'rain'):'clear'}
function clearWeather(){W.boss=false;W.rainT=0;W.thunder=false;FX.weather=W.kind='clear'}

// ---------- audio: sfx helpers (rain, thunder, heartbeat) ----------
let NB=null;function noiseBuf(a){if(!NB){NB=a.createBuffer(1,a.sampleRate*2,a.sampleRate);const d=NB.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=rnd()*2-1}return NB}
let rainSrc=null,rainG=null;
function rainSound(v){const a=ac();if(!a)return;if(v>.02&&!rainSrc){rainSrc=a.createBufferSource();rainSrc.buffer=noiseBuf(a);rainSrc.loop=true;const hp=a.createBiquadFilter();hp.type='highpass';hp.frequency.value=500;const lp=a.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2600;rainG=a.createGain();rainG.gain.value=0;rainSrc.connect(hp).connect(lp).connect(rainG).connect(a.destination);rainSrc.start()}
 if(rainSrc){rainG.gain.setTargetAtTime(.09*v,a.currentTime,.3);if(v<=.02){try{rainSrc.stop(a.currentTime+.5)}catch(e){}rainSrc=null}}}
function thunderSound(v){const a=ac();if(!a)return;v=clamp(v,.3,1);const s=a.createBufferSource();s.buffer=noiseBuf(a);const lp=a.createBiquadFilter();lp.type='lowpass';lp.frequency.setValueAtTime(900,a.currentTime);lp.frequency.exponentialRampToValueAtTime(90,a.currentTime+2.5);const g=a.createGain(),t=a.currentTime;
 g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.55*v,t+.06);g.gain.exponentialRampToValueAtTime(.25*v,t+.6);g.gain.exponentialRampToValueAtTime(.0001,t+3.4);s.connect(lp).connect(g).connect(a.destination);s.start(t,rnd());s.stop(t+3.5)}
function thump(t,f,v){const a=ac();const o=a.createOscillator(),g=a.createGain();o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*.55,t+.15);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+.2);o.connect(g).connect(a.destination);o.start(t);o.stop(t+.22)}

// ---------- hurt vignette + heartbeat ----------
const hurtEl=document.createElement('div');hurtEl.style.cssText='position:absolute;inset:0;pointer-events:none;opacity:0;background:radial-gradient(ellipse at center,transparent 38%,rgba(120,0,0,.55) 75%,rgba(70,0,0,.92) 100%)';
const hudEl=document.getElementById('hud');hudEl&&hudEl.insertBefore(hurtEl,hudEl.firstChild.nextSibling);
let hbT=0,pulse=0,lastOp=-1;
function tickHurt(dt){const max=Math.max(100,me.maxHp||me.maxHP||100),miss=me.alive?clamp(1-me.hp/max,0,1):0;pulse*=Math.pow(.02,dt);
 if(me.alive&&me.hp<30&&me.hp>0&&RS.ph!=='over'){hbT-=dt;if(hbT<=0){hbT=.55+me.hp/30*.45;pulse=1;const a=ac();if(a){const t=a.currentTime+.02;thump(t,62,.32);thump(t+.17,52,.22)}}}else hbT=0;
 const op=Math.round(clamp((miss-.2)*1.1,0,.85)*(.8+.35*pulse)*100)/100;if(op!==lastOp){hurtEl.style.opacity=op;lastOp=op}}

// ---------- music (WebAudio, scheduled with a lookahead timer) ----------
const SC=[0,1,3,5,7,8,10],ROOT=36.71; // D phrygian-ish
const hz=n=>ROOT*Math.pow(2,n/12),deg=(d,o)=>hz(SC[((d%7)+7)%7]+12*(o+Math.floor(d/7)));
let MU=null,tens=0,tensT=0,nearT=0,waveT=0,stepI=0,nextT=0;
function musicInit(){if(MU)return MU;const a=ac();if(!a)return null;const t=a.currentTime;
 const master=a.createGain();master.gain.value=musicVol;master.connect(a.destination);
 const dF=a.createBiquadFilter();dF.type='lowpass';dF.frequency.value=260;dF.Q.value=2;const dG=a.createGain();dG.gain.value=0;dF.connect(dG).connect(master);
 const os=[];for(const[f,ty,v]of[[ROOT,'sawtooth',.22],[ROOT*1.007,'sawtooth',.22],[ROOT*1.5,'triangle',.12]]){const o=a.createOscillator(),g=a.createGain();o.type=ty;o.frequency.value=f;g.gain.value=v;o.connect(g).connect(dF);o.start(t);os.push(o)}
 const lfo=a.createOscillator(),lg=a.createGain();lfo.frequency.value=.06;lg.gain.value=140;lfo.connect(lg).connect(dF.frequency);lfo.start(t);
 const verb=a.createBiquadFilter();verb.type='lowpass';verb.frequency.value=1600;for(const[dt_,gv]of[[0,.5],[.37,.3],[.74,.14]]){const g=a.createGain();g.gain.value=gv;if(dt_){const d=a.createDelay(1);d.delayTime.value=dt_;verb.connect(d).connect(g)}else verb.connect(g);g.connect(master)} // echo taps, no feedback loop
 MU={a,master,dG,dF,verb};nextT=t+.1;return MU}
function voice(t,f,dur,v,type,dest,attack=.005,cut=0){const a=MU.a,o=a.createOscillator(),g=a.createGain();o.type=type||'sine';o.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
 if(cut){const lp=a.createBiquadFilter();lp.type='lowpass';lp.frequency.setValueAtTime(cut,t);lp.frequency.exponentialRampToValueAtTime(Math.max(60,cut*.2),t+dur);o.connect(lp).connect(g)}else o.connect(g);g.connect(dest||MU.master);o.start(t);o.stop(t+dur+.02)}
function piano(t,f,v){voice(t,f,2.6,v,'sine',MU.master,.004);voice(t,f*2,1.2,v*.35,'triangle',MU.verb,.004);voice(t,f,1.8,v*.4,'sine',MU.verb,.004)}
function nz(t,dur,v,type,f){const a=MU.a,s=a.createBufferSource();s.buffer=noiseBuf(a);const fl=a.createBiquadFilter();fl.type=type;fl.frequency.value=f;const g=a.createGain();g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(fl).connect(g).connect(MU.master);s.start(t,rnd()*1.5);s.stop(t+dur+.02)}
function kick(t,v){const a=MU.a,o=a.createOscillator(),g=a.createGain();o.frequency.setValueAtTime(120,t);o.frequency.exponentialRampToValueAtTime(42,t+.12);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+.3);o.connect(g).connect(MU.master);o.start(t);o.stop(t+.32)}
const BASS=[[0,0,0,1],[0,0,-2,-1],[0,0,3,1],[0,-2,-3,-2]];
function step(t,i){const s=i%16,bar=(i>>4)%4,boss=W.boss&&RS.ph==='live';
 const calm=clamp(1-tens*1.6,0,1)*(RS.ph!=='live'||waveT<40?1:.35);
 if(s%4===0&&rnd()<.2*calm){const d=(rnd()*9|0)-1;piano(t,deg(d,3),.07);if(rnd()<.3)piano(t+.34,deg(d+2,3),.05)}
 if(s===0&&bar===0&&rnd()<.6*calm)piano(t,deg(0,2),.06);
 const T=tens;if(T>.04){const bn=BASS[bar][s>>2];
  if(s%2===0)voice(t,hz(bn+(boss?-12:0)+(s%8===6?12:0)),.2,(boss?.16:.12)*T,'sawtooth',MU.master,.008,boss?900:600);
  if(s===0||s===8||(boss&&(s===4||s===12||s===14))||(T>.6&&s===10))kick(t,.45*Math.min(1,T*1.4));
  if(T>.3&&s%4===2)nz(t,.05,.06*T,'highpass',7000);
  if(boss&&(s===4||s===12))nz(t,.16,.14,'bandpass',1800);
  if(boss&&s===0&&(bar===0||bar===2)){voice(t,hz(12+(bar?1:0)),1.4,.06,'sawtooth',MU.verb,.08,1400);voice(t,hz(13+(bar?1:0)),1.4,.05,'sawtooth',MU.master,.08,1200)}}}
function sched(){if(!MU||!running)return;const a=MU.a,bpm=W.boss&&RS.ph==='live'?132:104,st=60/bpm/4;if(nextT<a.currentTime-.2)nextT=a.currentTime+.05;
 while(nextT<a.currentTime+.25){step(nextT,stepI++);nextT+=st}
 MU.dG.gain.setTargetAtTime(RS.ph==='over'?.03:(W.boss&&RS.ph==='live'?.11:.075)*(1-tens*.4),a.currentTime,1.5)}
setInterval(sched,70);
function sting(kind){if(!musicInit())return;const t=MU.a.currentTime+.05;
 if(kind==='start'){for(const[n,d]of[[0,0],[7,.0],[12,.0]])voice(t+d,hz(n),1.6,.09,'sawtooth',MU.verb,.01,1600);kick(t,.6);for(const[k,n]of[[.45,13],[.6,12]])voice(t+k,hz(n+12),.5,.05,'square',MU.verb,.01,2000);nz(t,1.2,.08,'lowpass',400)}
 else if(kind==='boss'){for(const n of[0,1,6])voice(t,hz(n-12),2.6,.12,'sawtooth',MU.verb,.02,1400);kick(t,.8);kick(t+.5,.7);kick(t+1,.8);nz(t,2,.12,'lowpass',300)}
 else if(kind==='clear'){[[0,0],[4,.16],[7,.32],[12,.5]].forEach(([n,d])=>piano(t+d,hz(n+24),.08));voice(t+.5,hz(16+12),2.2,.04,'triangle',MU.verb,.02)}
 else if(kind==='over'){[[7,0],[5,.55],[3,1.1],[2,1.65],[0,2.3]].forEach(([n,d])=>{piano(t+d,hz(n+24),.08);voice(t+d,hz(n+12),.9,.04,'triangle',MU.verb,.05)});voice(t+2.3,hz(0),4,.08,'sawtooth',MU.master,.3,500)}}
FX.music={sting,vol:v=>{musicVol=clamp(+v||0,0,1);LSs('za_music',musicVol);if(MU)MU.master.gain.setTargetAtTime(musicVol,MU.a.currentTime,.05)}};
function tickTension(dt){waveT+=dt;nearT-=dt;if(nearT<=0){nearT=.3;let n=0;const p=me.pos;
  if(me.alive&&RS.ph==='live'){for(const b of bots)if(b.zombie&&b.alive&&b.pos.distanceToSquared(p)<400)n++;for(const id in others){const o=others[id];if(o.alive&&o.team===1&&o.o.position.distanceToSquared(p)<400)n++}}
  tensT=RS.ph!=='live'?0:Math.max(W.boss?.6:0,Math.min(1,n/6))}
 tens+=(tensT-tens)*Math.min(1,dt*(tensT>tens?.9:.35))}

// ---------- pause screen controls ----------
(function ui(){const box=document.querySelector('#pause .box');if(!box)return;const d=document.createElement('div');d.className='sub';d.style.cssText='margin-top:12px;display:flex;gap:18px;justify-content:center;align-items:center;flex-wrap:wrap';
 d.innerHTML='<label style="display:flex;align-items:center;gap:8px">Music <input id="zaMusic" type="range" min="0" max="1" step="0.05" style="width:120px"></label><label style="display:flex;align-items:center;gap:6px"><input id="zaLowfx" type="checkbox"> Low graphics</label><span><kbd>F</kbd> flashlight</span>';
 box.appendChild(d);const m=d.querySelector('#zaMusic'),c=d.querySelector('#zaLowfx');m.value=musicVol;c.checked=low;
 m.oninput=()=>FX.music.vol(m.value);c.onchange=()=>{setLow(c.checked)};for(const el of[m,c,d])el.addEventListener('mousedown',e=>e.stopPropagation())})();
function setLow(v){low=FX.low=ZA.lowfx=!!v;LSs('za_lowfx',low?'1':'0');for(const m of mists)m.visible=!low;for(const l of lamps)l.cone.visible=!low;for(const l of PL)l.visible=!low;halo.visible=!low&&!NOMOON;rainN=low?350:RN;
 try{R.setPixelRatio(low?1:Math.min(devicePixelRatio,1.5));R.setSize(innerWidth,innerHeight)}catch(e){}}
FX.setLow=setLow;if(low)setLow(true);

// ---------- events ----------
let started=false;
ZA.on('begin',()=>{buildLamps();musicInit();for(let i=0;i<RN;i++)seedDrop(i,cam.position,true);FL.on=true;started=true});
ZA.on('waveStart',(r,fresh)=>{waveT=0;setWeather(r);if(MU||musicInit())sting(W.boss?'boss':'start')});
ZA.on('waveDone',()=>{clearWeather();sting('clear')});
ZA.on('gameOver',()=>{clearWeather();sting('over')});
ZA.on('tick',dt=>{if(!started){buildLamps();started=true}
 tickWeather(dt);applyPal(dt);tickRain(dt);if(!low)tickMist(dt);tickLamps(dt);tickTorch(dt);tickHurt(dt);tickTension(dt);
 moon.position.copy(cam.position).addScaledVector(moonDir,380);halo.position.copy(moon.position)});
})();
