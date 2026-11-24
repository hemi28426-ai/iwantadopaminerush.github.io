// Unblocked Rocketry visual module: sky, atmosphere, lighting, post-processing
(function(){
if(typeof init3D!=='function')return;
const V3=()=>new THREE.Vector3();
// ---------- atmosphere limb (scattering-ish rim, sunset at terminator, forward scatter) ----------
atmoMat=function(col,power){return new THREE.ShaderMaterial({uniforms:{c:{value:new THREE.Color(col)},sun:{value:new THREE.Vector3(1,0,0)},p:{value:power}},
  vertexShader:`varying vec3 vN;varying vec3 vW;
#include <common>
#include <logdepthbuf_pars_vertex>
void main(){vN=normalize(mat3(modelMatrix)*normal);vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;
#include <logdepthbuf_vertex>
}`,
  fragmentShader:`uniform vec3 c;uniform vec3 sun;uniform float p;varying vec3 vN;varying vec3 vW;
#include <logdepthbuf_pars_fragment>
void main(){
#include <logdepthbuf_fragment>
vec3 v=normalize(cameraPosition-vW);float rim=clamp(1.0-abs(dot(v,vN)),0.,1.);
float f=pow(rim,p)*(1.0+2.5*pow(rim,p*4.0));
float mu=dot(vN,sun);float lit=smoothstep(-.3,.25,mu);
vec3 sunset=vec3(1.0,.45,.18);vec3 col=mix(sunset,c,smoothstep(-.05,.45,mu));
float fwd=pow(max(dot(-v,sun),0.),6.)*smoothstep(-.2,.1,mu);
vec3 o=col*f*lit*2.2+sunset*fwd*f*1.5;
gl_FragColor=vec4(o,clamp(f*lit,0.,1.));}`,
  side:THREE.BackSide,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false})};

// ---------- procedural Milky Way skybox ----------
function milkyTex(){const w=2048,h=1024,c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');
  g.fillStyle='#000';g.fillRect(0,0,w,h);
  const band=y=>Math.exp(-Math.pow((y-h/2)/(h*.07),2));
  // diffuse glow along band, brighter towards galactic center (x=w/2)
  for(let i=0;i<5000;i++){const x=Math.random()*w,y=h/2+(Math.random()+Math.random()+Math.random()-1.5)*h*.12,cen=Math.exp(-Math.pow((x-w/2)/(w*.18),2));
    const r=8+Math.random()*40*(1+cen),a=(.012+.03*cen)*band(y)*1.4;const hue=cen>.4?'255,215,170':'190,205,255';
    const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,`rgba(${hue},${a})`);gr.addColorStop(1,`rgba(${hue},0)`);g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2)}
  // dust lanes
  g.globalCompositeOperation='multiply';
  for(let i=0;i<900;i++){const x=Math.random()*w,y=h/2+(Math.random()-.5)*h*.06+Math.sin(x*.01)*h*.01,r=6+Math.random()*28;
    const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(20,12,8,.55)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2)}
  g.globalCompositeOperation='lighter';
  // faint nebula tints
  for(const[x,y,r,col]of[[w*.62,h*.47,90,'255,80,120'],[w*.3,h*.53,70,'80,140,255'],[w*.82,h*.45,60,'255,120,80']]){const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,`rgba(${col},.10)`);gr.addColorStop(1,`rgba(${col},0)`);g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2)}
  // dense small stars, concentrated in band
  for(let i=0;i<26000;i++){const inB=i<16000,x=Math.random()*w,y=inB?h/2+(Math.random()+Math.random()+Math.random()-1.5)*h*.1:Math.random()*h;
    const b=Math.random();g.fillStyle=`rgba(${200+b*55|0},${200+b*40|0},${230+b*25|0},${.15+Math.pow(b,3)*.7})`;g.fillRect(x,y,1,1)}
  const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=4;return t}

// ---------- sky dome (Rayleigh-ish gradient + Mie sun glow) ----------
function skyMat(){return new THREE.ShaderMaterial({uniforms:{up:{value:V3()},sun:{value:V3()},zen:{value:new THREE.Color()},hor:{value:new THREE.Color()},dusk:{value:new THREE.Color()},k:{value:0},dl:{value:1},sunUp:{value:1}},
  vertexShader:`varying vec3 vD;void main(){vD=normalize((modelMatrix*vec4(position,1.)).xyz-cameraPosition);vec4 p=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.);gl_Position=p.xyww;}`,
  fragmentShader:`uniform vec3 up,sun,zen,hor,dusk;uniform float k,dl,sunUp;varying vec3 vD;void main(){
    vec3 d=normalize(vD);float h=dot(d,up);float hh=max(h,0.);
    float duskAmt=(1.0-smoothstep(0.,.35,abs(sunUp)))*smoothstep(-.25,0.,sunUp);
    vec3 horiz=mix(hor,dusk,duskAmt*(.4+.6*pow(max(dot(d,sun),0.),2.)));
    vec3 col=mix(horiz,zen,pow(hh,.45));
    col=mix(col,horiz*.35,smoothstep(0.,-.2,h)); // below horizon haze
    float cs=max(dot(d,sun),0.);
    col*=dl;
    col+=mix(vec3(1.,.95,.85),dusk,duskAmt)*(pow(cs,600.)*30.+pow(cs,40.)*.6+pow(cs,6.)*.15)*smoothstep(-.1,.05,sunUp);
    gl_FragColor=vec4(col,clamp(k*(.25+.75*dl)+pow(cs,40.)*k,0.,1.));}`,
  side:THREE.BackSide,transparent:false,blending:THREE.CustomBlending,blendSrc:THREE.SrcAlphaFactor,blendDst:THREE.OneMinusSrcAlphaFactor,depthWrite:false,depthTest:false,fog:false})}

// ---------- lens flare (screen-space overlay) ----------
function ringTex(){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d'),gr=g.createRadialGradient(64,64,40,64,64,64);
  gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(.6,'rgba(160,200,255,.35)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);return new THREE.CanvasTexture(c)}
function streakTex(){const c=document.createElement('canvas');c.width=512;c.height=32;const g=c.getContext('2d'),gr=g.createLinearGradient(0,0,512,0);
  gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(.5,'rgba(255,240,220,.9)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,14,512,4);
  const v=g.createLinearGradient(0,0,0,32);v.addColorStop(0,'rgba(0,0,0,1)');v.addColorStop(.5,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,1)');g.globalCompositeOperation='destination-out';g.fillStyle=v;g.fillRect(0,0,512,32);return new THREE.CanvasTexture(c)}

// ---------- post-processing loader ----------
const PP='https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/';
function load(src){return new Promise((ok,no)=>{const s=document.createElement('script');s.src=PP+src;s.onload=ok;s.onerror=no;document.head.appendChild(s)})}
let ppReady=null;
function loadPP(){if(ppReady)return ppReady;
  ppReady=(async()=>{for(const f of['shaders/CopyShader.js','shaders/LuminosityHighPassShader.js','shaders/GammaCorrectionShader.js','postprocessing/EffectComposer.js','postprocessing/RenderPass.js','postprocessing/ShaderPass.js','postprocessing/UnrealBloomPass.js'])await load(f);return true})().catch(e=>{console.warn('sky.js: bloom unavailable',e);return false});return ppReady}

const _i=init3D;
init3D=function(){const first=!G3;const g=_i.apply(this,arguments);if(!(first&&g))return g;
  try{setup(g)}catch(e){console.warn('sky.js setup failed',e)}return g};

function setup(g){const{ren,sc}=g;
  ren.toneMapping=THREE.ACESFilmicToneMapping;ren.toneMappingExposure=1.0;ren.physicallyCorrectLights=false;
  // skybox
  const mw=new THREE.Mesh(new THREE.SphereGeometry(5e11,64,32),new THREE.MeshBasicMaterial({map:milkyTex(),side:THREE.BackSide,depthWrite:false,fog:false,color:new THREE.Color(.55,.55,.6)}));
  mw.rotation.set(-Math.atan2(.43,.9),0,0);mw.renderOrder=-3;mw.frustumCulled=false;g.stars3.add(mw);g.stars3.renderOrder=-2;
  g.stars3.material.size=2.2;g.stars3.material.fog=false;g.stars3.material.transparent=true;
  // brighten star colors a bit for bloom
  const ca=g.stars3.geometry.attributes.color;for(let i=0;i<ca.count;i++){if(Math.random()<.02)ca.setXYZ(i,ca.getX(i)*2.5,ca.getY(i)*2.5,ca.getZ(i)*2.5)}ca.needsUpdate=true;
  // sky dome
  const dome=new THREE.Mesh(new THREE.SphereGeometry(1,64,32),skyMat());dome.frustumCulled=false;dome.renderOrder=-1;dome.visible=false;sc.add(dome);
  // flare overlay
  const fs=new THREE.Scene(),fc=new THREE.OrthographicCamera(-1,1,1,-1,0,10);fc.position.z=5;const fl=[];
  const gt=glowTex('#ffd9a0'),rt=ringTex();
  const add=(tex,s,col,op,pos)=>{const m=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,color:col,blending:THREE.AdditiveBlending,transparent:true,depthTest:false,depthWrite:false,opacity:op,toneMapped:false}));m.userData={s,op,pos};fs.add(m);fl.push(m);return m};
  add(gt,.9,'#fff2dd',.55,0);add(streakTex(),1.6,'#ffe8cc',.5,0).userData.streak=1;
  for(const[p,s,c,o,ring]of[[.35,.08,'#7fa0ff',.25],[.6,.14,'#a0ff9a',.12],[.9,.05,'#ffb070',.3],[1.25,.28,'#9ab0ff',.12,1],[1.6,.1,'#ff90c0',.18],[1.9,.4,'#80c0ff',.08,1]])add(ring?rt:gt,s,c,o,p);
  g.sky={dome,fs,fc,fl,mode:'menu',lastW:0,lastH:0};
  // patch render
  const orig=ren.render.bind(ren);let inside=false;
  ren.render=function(s,c){if(inside||s!==sc)return orig(s,c);
    try{prep(g,c)}catch(e){}
    const S=g.sky;
    if(S.comp){const w=W,h=H;if(S.lastW!==w||S.lastH!==h){S.comp.setSize(w,h);S.bloom.setSize(w/2,h/2);S.lastW=w;S.lastH=h}
      S.rp.scene=s;S.rp.camera=c;inside=true;try{S.comp.render()}catch(e){console.warn(e);S.comp=null;orig(s,c)}inside=false}
    else{orig(s,c);if(S.flareOn){const ac=ren.autoClear;ren.autoClear=false;orig(S.fs,S.fc);ren.autoClear=ac}}};
  loadPP().then(ok=>{if(!ok||!THREE.EffectComposer||!THREE.UnrealBloomPass)return;try{
    let rtg;const sz=ren.getDrawingBufferSize(new THREE.Vector2());
    const opts={type:THREE.HalfFloatType,format:THREE.RGBAFormat};
    rtg=new THREE.WebGLRenderTarget(sz.x,sz.y,opts);
    const comp=new THREE.EffectComposer(ren,rtg);comp.setPixelRatio(ren.getPixelRatio());
    const rp=new THREE.RenderPass(sc,g.cam);comp.addPass(rp);
    const fp=new THREE.RenderPass(g.sky.fs,g.sky.fc);fp.clear=false;comp.addPass(fp);g.sky.fp=fp;
    const bloom=new THREE.UnrealBloomPass(new THREE.Vector2(W/2,H/2),.75,.55,.82);comp.addPass(bloom);
    comp.addPass(new THREE.ShaderPass(THREE.GammaCorrectionShader));
    Object.assign(g.sky,{comp,rp,bloom,lastW:0,lastH:0})}catch(e){console.warn('sky.js: composer failed',e);g.sky.comp=null}});
}

// ---------- per-frame sky / light / flare setup ----------
const _menu=renderMenu3D;renderMenu3D=function(){if(G3&&G3.sky)G3.sky.mode='menu';return _menu.apply(this,arguments)};
const _r3=render3D;render3D=function(){if(G3&&G3.sky)G3.sky.mode='game';return _r3.apply(this,arguments)};

const tmp=new THREE.Vector3(),tmp2=new THREE.Vector3();
function prep(g,cam){const S=g.sky,{dome,ren,sc}=Object.assign({},S,g);
  const sunW=tmp.copy(g.sun.position).normalize(); // direction to sun (world)
  let b=null,alt=1e30,up=null,rel=null;
  if(S.mode==='game'&&R){b=R.b;const rr=Math.hypot(R.x,R.y);alt=rr-b.R;up=new THREE.Vector3(R.x/rr,R.y/rr,0);rel=[R.x,R.y]}
  else{const e=bodies.Earth;b=e;const grp=g.bm.get(e);rel=[-grp.position.x+cam.position.x,-grp.position.y+cam.position.y];const rr=Math.hypot(rel[0],rel[1]);alt=rr-e.R;up=new THREE.Vector3(rel[0]/rr,rel[1]/rr,0)}
  // eclipse / planet shadow on the vehicle
  let lit=1;if(b&&b.n!=='Sun'){const d=rel[0]*sunW.x+rel[1]*sunW.y;if(d<0){const perp=Math.abs(rel[0]*sunW.y-rel[1]*sunW.x),soft=Math.max(b.atm||0,b.R*.01);lit=Math.min(1,Math.max(0,(perp-b.R+soft*.3)/soft))}}
  const sunUp=up.dot(sunW);
  // sky dome inside atmosphere
  dome.visible=false;
  if(S.mode==='game'&&b.atm&&alt<b.atm*1.2){const k=Math.max(0,Math.min(1,Math.pow(Math.max(0,1-alt/(b.atm*1.1)),1.3)*1.15));
    const dl=Math.max(.015,Math.min(1,(sunUp+.12)*3.5));
    const u=dome.material.uniforms;u.up.value.copy(up);u.sun.value.copy(sunW);u.k.value=k;u.dl.value=dl;u.sunUp.value=sunUp;
    const P={Earth:['#1a4fc8','#9cc4f0','#ff7a3a'],Mars:['#a87a5a','#e0b590','#4a7fbf'],Venus:['#c8a060','#f2dcae','#d07030'],Titan:['#b07a20','#e8b860','#a04a10']}[b.n]||[b.col,b.col,'#ff8040'];
    u.zen.value.set(P[0]);u.hor.value.set(P[1]);u.dusk.value.set(P[2]);
    // thinning: zenith darkens with altitude
    u.zen.value.multiplyScalar(Math.max(.05,1-alt/b.atm*1.2));u.zen.value.convertSRGBToLinear();u.hor.value.convertSRGBToLinear();u.dusk.value.convertSRGBToLinear();
    dome.visible=k>.002;dome.position.copy(cam.position);dome.scale.setScalar(Math.max(10,cam.near*50));
    g.stars3.visible=true;ren.setClearColor(0x000000);
    if(sc.fog){const fc=u.hor.value.clone().multiplyScalar(dl*.9).lerp(u.dusk.value,(1-Math.min(1,Math.abs(sunUp)*3))*.35*dl);sc.fog.color.copy(fc);
      sc.fog.near=Math.max(3000,alt*.8);sc.fog.far=Math.max(1.6e5,alt*25+1.5e5)}
    // sunlight reddens near horizon, blocked below it
    const low=1-Math.min(1,Math.max(0,sunUp*4));g.sun.color.setRGB(1,.96-low*.35,.88-low*.6);lit*=Math.max(0,Math.min(1,(sunUp+.04)*12));
    g.hemi.color.copy(u.zen.value).convertLinearToSRGB();g.hemi.intensity=.15+.45*dl;g.amb.intensity=.05+.1*dl}
  else{g.sun.color.setRGB(1,.97,.92);g.hemi.color.set(0xbfd8ff);g.hemi.intensity=.12;g.amb.intensity=.06}
  g.sun.intensity=2.4*(dome.visible?lit:1);
  ren.toneMappingExposure=dome.visible?1.0:1.15;
  // lens flare
  S.flareOn=false;for(const m of S.fl)m.visible=false;
  if(lit>.05&&!(dome.visible&&sunUp<-.02)){const sw=tmp2.copy(cam.position).addScaledVector(sunW,1e9).project(cam);
    if(sw.z<1&&Math.abs(sw.x)<1.3&&Math.abs(sw.y)<1.3){const a=W/H,fade=Math.max(0,1-Math.max(Math.abs(sw.x),Math.abs(sw.y))*.75)*lit;
      // planet occlusion: ray from camera toward sun vs each nearby body
      let occ=false;for(const[bd,grp]of g.bm){if(bd.n==='Sun')continue;const o=tmp2.copy(grp.position).sub(cam.position),tc=o.dot(sunW);if(tc>0&&o.lengthSq()-tc*tc<bd.R*bd.R){occ=true;break}}
      if(!occ){S.flareOn=true;S.fc.left=-a;S.fc.right=a;S.fc.updateProjectionMatrix();
        for(const m of S.fl){const d=m.userData;m.visible=true;m.position.set(sw.x*a*(1-d.pos),sw.y*(1-d.pos),0);m.scale.set(d.streak?d.s*2:d.s,d.streak?d.s*.06:d.s,1);m.material.opacity=d.op*fade*(dome.visible?.6:1)}}}}
  if(S.fp)S.fp.enabled=S.flareOn;
}
})();
