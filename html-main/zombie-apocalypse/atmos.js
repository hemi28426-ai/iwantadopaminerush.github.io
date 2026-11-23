// zombie-apocalypse/atmos.js — night atmosphere around Hollow Creek (Trench War's atmosphere pass, night version):
//  * floating ash + a few rising embers around the player (shader-animated Points: no per-frame CPU work or allocation)
//  * 3 billboard smoke columns rising from burning buildings outside the town, with a faint orange glow at their base
//    (2 instanced draw calls, animated in the vertex shader)
//  * a distant silhouette ring (treeline, barns, water tower, steeple, radio mast) that the night haze turns into a dark skyline
// Everything reads the live fog colour by reference, so fx.js's rain / boss / fog palettes and lightning recolour it for free.
// Each part is built in its own try/catch; a failure just leaves that part out.
(function(){
'use strict';
const ZA=window.ZA;if(!ZA||typeof THREE==='undefined'||typeof scene==='undefined'||!scene.fog)return;
const A=ZA.atmos={};let sd=4242;const rnd=()=>(sd=(sd*16807)%2147483647)/2147483647;
const FOG=scene.fog.color,CAM=cam.position,U_T={value:0},U_SCALE={value:innerHeight/2};
const TM='\n#include <tonemapping_fragment>\n';
// town centre / size (falls back to the Hollow Creek layout)
let CX=0,CZ=-6;try{if(window.ZAMAP&&ZAMAP.town&&ZAMAP.town.length){let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;for(const r of ZAMAP.town){x0=Math.min(x0,r[0]);x1=Math.max(x1,r[2]);z0=Math.min(z0,r[1]);z1=Math.max(z1,r[3])}CX=(x0+x1)/2;CZ=(z0+z1)/2}}catch(e){}

// ---------- ash + embers ----------
function particles(N,o){const pos=new Float32Array(N*3),sdA=new Float32Array(N);for(let i=0;i<N;i++){pos[i*3]=Math.random();pos[i*3+1]=Math.random();pos[i*3+2]=Math.random();sdA[i]=Math.random()}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('aSeed',new THREE.BufferAttribute(sdA,1));
 const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:o.add?THREE.AdditiveBlending:THREE.NormalBlending,fog:false,
  uniforms:{uTime:U_T,uCam:{value:CAM},uScale:U_SCALE,uSize:{value:o.size},uVel:{value:new THREE.Vector3(...o.vel)},uBox:{value:new THREE.Vector3(...o.box)},uCol:{value:new THREE.Color(...o.col)},uOp:{value:o.op},uFogC:{value:FOG}},
  vertexShader:`uniform float uTime,uScale,uSize;uniform vec3 uCam,uVel,uBox;attribute float aSeed;varying float vA,vS;
void main(){vec3 p=position*uBox+uVel*uTime*(0.6+0.8*aSeed);
 p+=vec3(sin(uTime*0.7+aSeed*40.0),sin(uTime*0.9+aSeed*23.0)*0.5,cos(uTime*0.6+aSeed*31.0))*0.6;
 p=mod(p-uCam+uBox*0.5,uBox)-uBox*0.5+uCam;
 vec4 mv=viewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;
 float d=length(p-uCam);vA=smoothstep(0.4,1.5,d)*(1.0-smoothstep(uBox.x*0.3,uBox.x*0.5,d));vS=aSeed;
 gl_PointSize=min(uSize*(0.5+aSeed)*uScale/max(-mv.z,0.1),24.0);}`,
  fragmentShader:`uniform vec3 uCol,uFogC;uniform float uOp,uTime;varying float vA,vS;
void main(){vec2 c=gl_PointCoord-0.5;float d=length(c);if(d>0.5)discard;float a=smoothstep(0.5,0.1,d)*vA*uOp;
 ${o.add?'a*=0.6+0.4*sin(uTime*(6.0+vS*9.0)+vS*50.0);':''}
 gl_FragColor=vec4(${o.add?'uCol':'mix(uCol,uFogC*3.0,0.35)'},a);${TM}}`});
 const p=new THREE.Points(g,m);p.frustumCulled=false;p.renderOrder=4;scene.add(p);return p}
try{A.ash=particles(420,{size:.05,vel:[.25,-.32,.12],box:[34,16,34],col:[.2,.2,.21],op:.55});
 A.embers=particles(46,{size:.06,vel:[.18,.55,.1],box:[40,18,40],col:[1.4,.5,.12],op:.9,add:true})}catch(e){console.warn('[ZA atmos] ash',e)}

// ---------- smoke columns ----------
function puffTex(){const n=128,c=document.createElement('canvas');c.width=c.height=n;const g=c.getContext('2d');
 for(let i=0;i<18;i++){const x=28+Math.random()*72,y=28+Math.random()*72,r=16+Math.random()*30,gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(255,255,255,.42)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,n,n)}
 const m=g.createRadialGradient(n/2,n/2,n*.22,n/2,n/2,n/2);m.addColorStop(0,'rgba(0,0,0,0)');m.addColorStop(1,'rgba(0,0,0,1)');g.globalCompositeOperation='destination-out';g.fillStyle=m;g.fillRect(0,0,n,n);
 const t=new THREE.CanvasTexture(c);return t}
try{
 const COLS=[],PER=22;
 // spots outside the woods ring, spread round the compass so one is usually in view
 for(const[a,r]of[[-.75,205],[2.05,215],[3.55,195]]){COLS.push([CX+Math.cos(a)*r,0,CZ+Math.sin(a)*r*1.15])}
 const n=COLS.length*PER,base=new Float32Array(n*3),ph=new Float32Array(n),se=new Float32Array(n);
 for(let c=0;c<COLS.length;c++)for(let i=0;i<PER;i++){const k=c*PER+i;base[k*3]=COLS[c][0]+(rnd()-.5)*6;base[k*3+1]=4;base[k*3+2]=COLS[c][2]+(rnd()-.5)*6;ph[k]=i/PER+rnd()*.04;se[k]=rnd()}
 const geo=new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1,1));geo.instanceCount=n;
 geo.setAttribute('aBase',new THREE.InstancedBufferAttribute(base,3));geo.setAttribute('aPh',new THREE.InstancedBufferAttribute(ph,1));geo.setAttribute('aSeed',new THREE.InstancedBufferAttribute(se,1));
 const VS=`uniform float uTime;uniform vec2 uWind;attribute vec3 aBase;attribute float aPh,aSeed;varying vec2 vUv;varying float vA,vT;
void main(){float t=fract(uTime*0.011*(0.85+aSeed*0.3)+aPh);
 vec3 c=aBase+vec3(uWind.x*t*t*120.0,t*115.0,uWind.y*t*t*120.0);
 float s=mix(12.0,64.0,sqrt(t))*(0.8+aSeed*0.4);float an=aSeed*6.283+uTime*0.03*(aSeed-0.5);
 vec2 q=mat2(cos(an),-sin(an),sin(an),cos(an))*position.xy*s;
 vec4 mv=viewMatrix*vec4(c,1.0);mv.xy+=q;gl_Position=projectionMatrix*mv;
 vA=smoothstep(0.0,0.05,t)*(1.0-smoothstep(0.6,1.0,t));vT=t;vUv=uv;}`;
 const sm=new THREE.ShaderMaterial({transparent:true,depthWrite:false,fog:false,uniforms:{uTime:U_T,uWind:{value:new THREE.Vector2(.55,.2)},uMap:{value:puffTex()},uFogC:{value:FOG}},vertexShader:VS,
  fragmentShader:`uniform sampler2D uMap;uniform vec3 uFogC;uniform float uTime;varying vec2 vUv;varying float vA,vT;
void main(){float a=min(1.0,texture2D(uMap,vUv).a*1.6)*vA;if(a<0.004)discard;
 vec3 col=mix(uFogC*2.4+vec3(0.018,0.016,0.014),uFogC*1.5,smoothstep(0.0,0.8,vT));
 col+=vec3(0.42,0.15,0.04)*(1.0-smoothstep(0.0,0.25,vT))*(0.8+0.2*sin(uTime*3.0+vT*20.0));
 gl_FragColor=vec4(col,a);${TM}}`});
 const smoke=new THREE.Mesh(geo,sm);smoke.frustumCulled=false;smoke.renderOrder=1;scene.add(smoke);A.smoke=smoke;
 // fire glow at each base: additive, flickering, peeking over the treeline
 const gb=new Float32Array(COLS.length*3),gs=new Float32Array(COLS.length),gp=new Float32Array(COLS.length);COLS.forEach((c,i)=>{gb[i*3]=c[0];gb[i*3+1]=c[1];gb[i*3+2]=c[2];gs[i]=rnd()});
 const gg=new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1,1));gg.instanceCount=COLS.length;
 gg.setAttribute('aBase',new THREE.InstancedBufferAttribute(gb,3));gg.setAttribute('aPh',new THREE.InstancedBufferAttribute(gp,1));gg.setAttribute('aSeed',new THREE.InstancedBufferAttribute(gs,1));
 const gm=new THREE.ShaderMaterial({transparent:true,depthWrite:false,fog:false,blending:THREE.AdditiveBlending,uniforms:{uTime:U_T},
  vertexShader:`uniform float uTime;attribute vec3 aBase;attribute float aSeed;varying vec2 vUv;varying float vF;
void main(){vec3 c=aBase+vec3(0.0,3.0,0.0);vec4 mv=viewMatrix*vec4(c,1.0);mv.xy+=position.xy*vec2(110.0,30.0);gl_Position=projectionMatrix*mv;vUv=uv;
 vF=0.75+0.15*sin(uTime*2.3+aSeed*20.0)+0.1*sin(uTime*7.1+aSeed*9.0);}`,
  fragmentShader:`varying vec2 vUv;varying float vF;void main(){vec2 p=(vUv-0.5)*2.0;float d=length(p*vec2(1.0,1.3));float a=pow(max(0.0,1.0-d),3.0)*vF;
 gl_FragColor=vec4(vec3(0.55,0.2,0.05)*a*0.4,1.0);${TM}}`});
 const glow=new THREE.Mesh(gg,gm);glow.frustumCulled=false;glow.renderOrder=0;scene.add(glow);A.glow=glow;A.smokeSpots=COLS;
}catch(e){console.warn('[ZA atmos] smoke',e)}

// ---------- distant silhouette ring ----------
try{
 const N=1100,RX=255,RZ=300,pos=new Float32Array((N+1)*2*3),uv=new Float32Array((N+1)*2*2),idx=[];
 const struct=[];// [centre angle, half width (rad), height, kind]
 for(let i=0;i<16;i++){const k=rnd();struct.push([rnd()*6.283,k<.5?.012+rnd()*.03:.004+rnd()*.006,k<.5?13+rnd()*10:k<.75?24+rnd()*10:30+rnd()*16,k<.5?'barn':k<.75?'tower':'mast'])}
 const hill=a=>6+4*Math.sin(a*3+1.3)+2.5*Math.sin(a*7+.4)+1.5*Math.sin(a*13+2.1);
 for(let i=0;i<=N;i++){const a=i/N*6.2832,x=CX+Math.cos(a)*RX,z=CZ+Math.sin(a)*RZ;
  const dens=.5+.5*Math.sin(a*5+.7)*Math.sin(a*2.3);let h=hill(a)+(dens>.15?(i%2?2+rnd()*3:7+rnd()*7)*Math.min(1,dens*1.6):rnd()*1.5);
  for(const s of struct){const d=Math.abs(((a-s[0]+9.4248)%6.2832)-3.1416);if(d>s[1])continue;const f=d/s[1];
   if(s[3]==='barn')h=Math.max(h,hill(s[0])+s[2]*(1-.35*Math.max(0,f-.5)*2));
   else if(s[3]==='tower')h=Math.max(h,hill(s[0])+s[2]*(f<.5?1:.55)+(f<.3?3*(1-f/.3):0));
   else h=Math.max(h,hill(s[0])+s[2]*(1-f*.85))}
  const v=i*2;pos.set([x,-3,z],v*3);pos.set([x,h,z],v*3+3);uv.set([i/N,0],v*2);uv.set([i/N,1],v*2+2);
  if(i<N)idx.push(v,v+2,v+1,v+1,v+2,v+3)}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('uv',new THREE.BufferAttribute(uv,2));g.setIndex(idx);g.computeBoundingSphere();
 const m=new THREE.ShaderMaterial({side:THREE.DoubleSide,fog:false,uniforms:{uFogC:{value:FOG}},
  vertexShader:`varying float vY;void main(){vY=position.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`uniform vec3 uFogC;varying float vY;void main(){vec3 c=mix(uFogC,uFogC*0.3,smoothstep(0.0,9.0,vY));gl_FragColor=vec4(c,1.0);${TM}}`});
 const ring=new THREE.Mesh(g,m);ring.frustumCulled=false;ring.renderOrder=-.5;scene.add(ring);A.ring=ring;
}catch(e){console.warn('[ZA atmos] ring',e)}

// ---------- the html's floating dust: round soft motes instead of square pixels ----------
try{const dt=(()=>{const c=document.createElement('canvas');c.width=c.height=32;const g=c.getContext('2d'),gr=g.createRadialGradient(16,16,0,16,16,16);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.4,'rgba(255,255,255,.5)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,32,32);return new THREE.CanvasTexture(c)})();
 scene.traverse(o=>{if(o.isPoints&&o.material&&o.material.isPointsMaterial&&!o.material.map){o.material.map=dt;o.material.alphaTest=.02;o.material.opacity=.4;o.material.size=.07;o.material.needsUpdate=true}})}catch(e){}

// ---------- per frame: one uniform write ----------
let lowWas=null;
function tick(){U_T.value=performance.now()/1000;const low=!!ZA.lowfx;if(low!==lowWas){lowWas=low;if(A.ash)A.ash.geometry.setDrawRange(0,low?140:420);if(A.embers)A.embers.visible=!low}}
ZA.on('tick',tick);
(function idle(){if(!running){tick()}requestAnimationFrame(idle)})(); // menu background keeps drifting too
addEventListener('resize',()=>{U_SCALE.value=R.domElement.height/2});U_SCALE.value=R.domElement.height/2;
})();
