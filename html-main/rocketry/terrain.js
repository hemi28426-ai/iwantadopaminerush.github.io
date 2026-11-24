// Unblocked Rocketry visual module: terrain (loaded after the main game script; override/wrap globals here)
// Close-up ground (0-20 km): displaced hills/mountains (flat near pad + rocket ground point), tiling detail,
// Earth ocean, Moon craters, instanced rocks. Persistent buffers; rebuilt only when the anchor moves.
(function(){
if(typeof render3D!=='function')return;
const TR=window.__TR={mesh:null,rocks:null,mat:null,key:'',anc:null,E:0,dTex:null,water:new Map()};
// ---- fast noise ----
function h3(x,y,z){let h=(x*374761393+y*668265263+z*1274126177)|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296}
function vn(x,y,z){const xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z),xf=x-xi,yf=y-yi,zf=z-zi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf),w=zf*zf*(3-2*zf);
  const L=(a,b,t)=>a+(b-a)*t;
  return L(L(L(h3(xi,yi,zi),h3(xi+1,yi,zi),u),L(h3(xi,yi+1,zi),h3(xi+1,yi+1,zi),u),v),L(L(h3(xi,yi,zi+1),h3(xi+1,yi,zi+1),u),L(h3(xi,yi+1,zi+1),h3(xi+1,yi+1,zi+1),u),v),w)}
function pn(x,y,P,s){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf),m=i=>((i%P)+P)%P;
  const a=h3(m(xi),m(yi),s),b=h3(m(xi+1),m(yi),s),c=h3(m(xi),m(yi+1),s),d=h3(m(xi+1),m(yi+1),s);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v}
const sm=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
// ---- per-body look ----
const LOOK={Earth:{a:'#4a7a2a',b:'#6a6a32',c:'#7a6a4a',amp:700,rock:'#77736c',dens:.5,mix:.6},
  Mars:{a:'#b5562c',b:'#7a3a22',c:'#d08a5a',amp:2200,rock:'#6b3a26',dens:1,mix:.6},
  Moon:{a:'#8e8c88',b:'#6c6a67',c:'#b4b2ad',amp:1400,rock:'#6a6865',dens:.8,mix:.6,crat:1},
  Mercury:{a:'#8a8178',b:'#5f5852',c:'#a89d90',amp:1500,rock:'#5a534d',dens:.8,mix:.6,crat:1},
  Europa:{a:'#e8eef4',b:'#b8a088',c:'#c9dcec',amp:400,rock:'#cfd8e0',dens:.3,mix:.7},
  Venus:{a:'#b08850',b:'#7a5a34',c:'#d0a870',amp:1600,rock:'#5a4430',dens:.7,mix:.55},
  Titan:{a:'#a07038',b:'#5a3c20',c:'#c89050',amp:600,rock:'#4a3420',dens:.4,mix:.55}};
function look(b){if(LOOK[b.n])return LOOK[b.n];const c=new THREE.Color(b.col||'#888'),hx=x=>'#'+x.getHexString();
  return LOOK[b.n]={a:hx(c),b:hx(c.clone().multiplyScalar(.7)),c:hx(c.clone().lerp(new THREE.Color('#fff'),.3)),amp:Math.min(1500,b.R*.003),rock:hx(c.clone().multiplyScalar(.6)),dens:.6,mix:.5,crat:!b.atm}}
// ---- planet texture sampling (Earth ocean) ----
function texData(b){const g=G3.bm.get(b),tx=g&&g.userData.mat.map,im=tx&&tx.image;if(!im||!im.width)return null;
  let e=TR.water.get(b);if(e&&e.im===im)return e;
  try{let c=im;if(!(im instanceof HTMLCanvasElement)){c=document.createElement('canvas');c.width=im.width;c.height=im.height;c.getContext('2d').drawImage(im,0,0)}
    e={im,w:c.width,h:c.height,d:c.getContext('2d').getImageData(0,0,c.width,c.height).data}}catch(_){e={im,d:null}}
  TR.water.set(b,e);return e}
function isWater(e,th,ph){if(!e||!e.d)return 0;let u=th/(2*Math.PI);u-=Math.floor(u);const v=ph/Math.PI+.5;
  const x=Math.min(e.w-1,u*e.w|0),y=Math.min(e.h-1,Math.max(0,(e.flipY===false?v:1-v)*e.h|0)),i=(y*e.w+x)*4,r=e.d[i],g=e.d[i+1],bb=e.d[i+2];
  return bb>r*1.15&&bb>g*1.02?1:0}
// launch-site island: planet texture may put the pad in the sea; keep ~10 km of land around it
function landAt(X,Y,Z,pad){if(!pad)return 0;const d=Math.hypot(X-pad[0],Y-pad[1],Z)+(vn(X/3000,Y/3000,Z/3000)-.5)*7000;return 1-sm(9000,12000,d)}
// ---- height (meters) at body-fixed point ----
function height(b,L,x,y,z){const s=1/9000;let n=0,a=1,f=1,tot=0;
  for(let i=0;i<6;i++){let v=vn(x*s*f+i*31.7,y*s*f,z*s*f);v=1-Math.abs(v*2-1);n+=v*v*a;tot+=a;a*=.48;f*=2.1}
  n/=tot;const big=vn(x/60000,y/60000+7,z/60000);let h=(n*.8+big*.6-.55)*L.amp*(.4+1.2*big);
  if(L.crat){const C=500;const cx=Math.floor(x/C),cy=Math.floor(y/C),cz=Math.floor(z/C);
    for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)for(let k=-1;k<=1;k++){const r0=h3(cx+i,cy+j,cz+k);if(r0>.35)continue;
      const r=30+Math.pow(h3(cx+i+9,cy+j,cz+k),3)*220,ox=(cx+i+h3(cx+i,cy+j+5,cz+k))*C-x,oy=(cy+j+h3(cx+i,cy+j,cz+k+5))*C-y,oz=(cz+k+h3(cx+i+5,cy+j,cz+k))*C-z;
      const d=Math.hypot(ox,oy,oz)/r;if(d<1.5)h+=d<1?(d*d-1)*r*.22+r*.06:r*.06*(1-sm(1,1.5,d))}}
  return h}
// ---- detail texture (seamless) ----
function makeDTex(){const N=256,c=document.createElement('canvas');c.width=c.height=N;const g=c.getContext('2d'),img=g.createImageData(N,N),d=img.data;
  const fb=(x,y,P,o,s)=>{let a=0,amp=.5,f=1;for(let i=0;i<o;i++){a+=amp*pn(x*f,y*f,P*f,s+i);amp*=.5;f*=2}return a};
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){const i=(y*N+x)*4,X=x/N,Y=y/N;
    d[i]=Math.min(255,fb(X*16,Y*16,16,5,1)*330);d[i+1]=Math.min(255,fb(X*4,Y*4,4,4,9)*330);const r=fb(X*8,Y*8,8,4,20);d[i+2]=Math.min(255,Math.pow(r*1.6,3)*255);d[i+3]=255}
  g.putImageData(img,0,0);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;return t}
function makeMat(){const U={dTex:{value:TR.dTex},cA:{value:new THREE.Color()},cB:{value:new THREE.Color()},cC:{value:new THREE.Color()},uMix:{value:.5},uWater:{value:0},uT:{value:0}};
  const m=new THREE.MeshStandardMaterial({roughness:.95,metalness:0,envMapIntensity:.25});m.userData.U=U;
  m.onBeforeCompile=s=>{Object.assign(s.uniforms,U);
    s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nattribute vec2 tuv;attribute float fade;attribute float lnd;varying vec2 vT;varying float vF;varying float vL;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvT=tuv;vF=fade;vL=lnd;');
    s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D dTex;uniform vec3 cA,cB,cC;uniform float uMix,uWater,uT;varying vec2 vT;varying float vF;varying float vL;float wM=0.;')
      .replace('#include <map_fragment>',`vec4 texelColor=mapTexelToLinear(texture2D(map,vUv));vec3 pc=texelColor.rgb;
        vec4 d1=texture2D(dTex,vT),d2=texture2D(dTex,vT*.071+.37),d3=texture2D(dTex,vT*6.3),d4=texture2D(dTex,vT*.009);
        float fine=d1.r*.45+d3.r*.35+d2.r*.2;vec3 gc=mix(cA,cB,smoothstep(.35,.65,d2.g*.35+d4.g*.65));gc=mix(gc,cC,smoothstep(.15,.6,d1.b)*.7);
        float lum=max(.03,dot(gc,vec3(.333)));vec3 tint=mix(pc,pc*gc/lum*.9,.5);vec3 col=mix(pc,mix(tint,gc*(.6+dot(pc,vec3(.333))),.4),uMix);
        col*=mix(1.,.55+.9*fine,uMix);col=mix(col,gc*(.55+.8*fine)*.8,vL);col=mix(pc,col,max(vF,vL));
        wM=uWater*smoothstep(.0,.06,pc.b-max(pc.r,pc.g)*1.05)*(1.-vL);
        vec3 wc=vec3(.02,.09,.16)*(.8+.4*texture2D(dTex,vT*.3+vec2(uT*.01,uT*.007)).r);col=mix(col,mix(pc,wc,vF*.85+.15),wM);
        diffuseColor.rgb*=col*.62;`)
      .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.18,wM);')};
  return m}
// ---- geometry: polar grid around the rocket's ground point ----
const NR=110,NS=144;
function makeMesh(){const n=1+NR*NS,g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(n*3),3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(n*3),3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(n*2),2).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('tuv',new THREE.BufferAttribute(new Float32Array(n*2),2).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('fade',new THREE.BufferAttribute(new Float32Array(n),1).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('lnd',new THREE.BufferAttribute(new Float32Array(n),1).setUsage(THREE.DynamicDrawUsage));
  const idx=[];for(let j=0;j<NS;j++)idx.push(0,1+j,1+(j+1)%NS);
  for(let k=0;k<NR-1;k++)for(let j=0;j<NS;j++){const a=1+k*NS+j,b=1+k*NS+(j+1)%NS,c=a+NS,d=b+NS;idx.push(a,d,b,a,c,d)}
  g.setIndex(idx);g.boundingSphere=new THREE.Sphere(new THREE.Vector3(),1e9);
  const m=new THREE.Mesh(g,TR.mat);m.frustumCulled=false;return m}
function rebuild(b,L,th0,E,flats){const g=TR.mesh.geometry,P=g.attributes.position.array,UV=g.attributes.uv.array,TU=g.attributes.tuv.array,F=g.attributes.fade.array,LN=g.attributes.lnd.array,pad=flats[1];
  const Rb=b.R,ax=Rb*Math.cos(th0),ay=Rb*Math.sin(th0),wd=b.n=='Earth'?texData(b):null,tile=40,base=Math.floor(th0*Rb/tile/256)*256;
  const d0=1.5,q=Math.pow(E/d0,1/(NR-1));
  const put=(i,d,ca,sa)=>{const u=d*ca,w=d*sa,th=th0+u/Rb,ph=w/Rb,cp=Math.cos(ph),nx=cp*Math.cos(th),ny=cp*Math.sin(th),nz=Math.sin(ph);
    let h=0;const ef=1-sm(.55*E,.92*E,d);
    if(ef>0){const X=nx*Rb,Y=ny*Rb,Z=nz*Rb;let fm=1;for(const f of flats){const dd=Math.hypot(X-f[0],Y-f[1],Z);fm=Math.min(fm,1-f[3]*(1-sm(f[2],f[2]*6+1500,dd)))}
      if(fm>0)h=height(b,L,X,Y,Z)*fm*ef;if(wd){const ld=landAt(X,Y,Z,pad);LN[i]=ld;if(ld<.5&&isWater(wd,th,ph))h=Math.min(h,0)*.2-2*ef}}else LN[i]=0;
    if(!wd)LN[i]=0;
    if(d>=E*.999)h=-E*.004;
    const r=Rb+h;P[i*3]=nx*r-ax;P[i*3+1]=ny*r-ay;P[i*3+2]=nz*r;UV[i*2]=th/(2*Math.PI);UV[i*2+1]=ph/Math.PI+.5;
    TU[i*2]=th*Rb/tile-base;TU[i*2+1]=ph*Rb/tile;F[i]=1-sm(.4*E,.85*E,d)};
  put(0,0,1,0);for(let k=0;k<NR;k++){const d=d0*Math.pow(q,k);for(let j=0;j<NS;j++){const a=j/NS*2*Math.PI;put(1+k*NS+j,d,Math.cos(a),Math.sin(a))}}
  for(const k in g.attributes)g.attributes[k].needsUpdate=true;g.computeVertexNormals();
  placeRocks(b,L,th0,flats,wd)}
// ---- instanced rocks ----
const NROCK=500;
function makeRocks(){const geo=new THREE.IcosahedronGeometry(1,1),p=geo.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),s=.75+.5*vn(x*2.3+5,y*2.3,z*2.3);p.setXYZ(i,x*s,y*s*.7,z*s)}geo.computeVertexNormals();
  const m=new THREE.InstancedMesh(geo,new THREE.MeshStandardMaterial({color:'#fff',roughness:.92,flatShading:true,envMapIntensity:.25}),NROCK);m.frustumCulled=false;return m}
function placeRocks(b,L,th0,flats,wd){const m=TR.rocks,Rb=b.R,C=18,G=70,ax=Rb*Math.cos(th0),ay=Rb*Math.sin(th0),u0=Math.round(th0*Rb/C);let n=0;
  m.material.color.set(L.rock).convertSRGBToLinear();const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),S=new THREE.Vector3(),V=new THREE.Vector3(),up=new THREE.Vector3(0,1,0),Nv=new THREE.Vector3();
  for(let a=-G;a<=G&&n<NROCK;a++)for(let c=-G;c<=G&&n<NROCK;c++){const ci=u0+a,r0=h3(ci,c,77);if(r0>.09*L.dens)continue;
    const u=(ci+h3(ci,c,3))*C,w=(c+h3(ci,c,4))*C,th=u/Rb,ph=w/Rb;let near=1e9;
    const cp=Math.cos(ph),nx=cp*Math.cos(th),ny=cp*Math.sin(th),nz=Math.sin(ph),X=nx*Rb,Y=ny*Rb,Z=nz*Rb;
    for(const f of flats)if(f[3]>.5)near=Math.min(near,Math.hypot(X-f[0],Y-f[1],Z));if(near<45)continue;if(wd&&landAt(X,Y,Z,flats[1])<.5&&isWater(wd,th,ph))continue;
    let fm=1;for(const f of flats)fm=Math.min(fm,1-f[3]*(1-sm(f[2],f[2]*6+1500,Math.hypot(X-f[0],Y-f[1],Z))));
    const h=height(b,L,X,Y,Z)*fm,big=h3(ci,c,8),s=(.4+Math.pow(big,4)*6)*(near<120?.5:1);
    Nv.set(nx,ny,nz);Q.setFromUnitVectors(up,Nv);const q2=new THREE.Quaternion().setFromAxisAngle(up,big*20);Q.multiply(q2);
    V.set(nx*(Rb+h-s*.25)-ax,ny*(Rb+h-s*.25)-ay,nz*(Rb+h-s*.25));S.set(s*(1+h3(ci,c,9)),s,s*(1+h3(ci,c,10)));M.compose(V,Q,S);m.setMatrixAt(n++,M)}
  m.count=n;m.instanceMatrix.needsUpdate=true}
// ---- hook into render3D ----
const EMPTY=()=>new THREE.BufferGeometry();
const _r=render3D;
render3D=function(gx,gy){const g=G3;if(!g)return _r(gx,gy);
  if(!TR.mat){TR.dTex=makeDTex();TR.mat=makeMat();TR.mesh=makeMesh();TR.rocks=makeRocks();TR.grp=new THREE.Group();TR.grp.add(TR.mesh,TR.rocks);g.sc.add(TR.grp)}
  const b=R.b,rr=Math.hypot(R.x,R.y),alt=rr-b.R,dist=(H/2)/(Math.tan(25*Math.PI/180)*zoom);
  const on=alt<Math.min(2e4,b.R*.1)&&b.R>1e4&&b.n!='Sun'&&g.bm.get(b);
  TR.grp.visible=!!on;
  if(on){const L=look(b),th0=Math.atan2(R.y,R.x),E=Math.min(b.R*.45,3*Math.sqrt(2*b.R*(Math.max(0,alt)+300))+dist*4+2000);
    const flats=[[b.R*Math.cos(th0),b.R*Math.sin(th0),250,1-sm(2500,6000,alt)]];if(R.pad&&R.pad.b===b)flats.push([b.R*Math.cos(R.pad.th),b.R*Math.sin(R.pad.th),300,1]);
    const pm=g.bm.get(b).userData.mat.map;if(TR.mat.map!==pm){if(pm){pm.wrapS=THREE.RepeatWrapping;pm.needsUpdate=true}TR.mat.map=pm;TR.mat.needsUpdate=true;TR.water.delete(b)}
    const U=TR.mat.userData.U;U.cA.value.set(L.a).convertSRGBToLinear();U.cB.value.set(L.b).convertSRGBToLinear();U.cC.value.set(L.c).convertSRGBToLinear();U.uMix.value=L.mix;U.uWater.value=b.n=='Earth'?1:0;U.uT.value=performance.now()/1000;
    const A=TR.anc,key=b.n+'|'+(pm&&pm.uuid);
    if(key!==TR.key||!A||Math.abs(th0-A)*b.R>Math.max(30,E*.004)||Math.abs(E/TR.E-1)>.12||Math.abs(TR.fk-flats[0][3])>.05){TR.key=key;TR.anc=th0;TR.E=E;TR.fk=flats[0][3];rebuild(b,L,th0,E,flats)}
    TR.grp.position.set(b.R*Math.cos(TR.anc)-R.x,b.R*Math.sin(TR.anc)-R.y,0)}
  if(!on)return _r(gx,gy);
  const sg=sphGeo;sphGeo=function(){return arguments[7]?EMPTY():sg.apply(this,arguments)};
  try{_r(gx,gy)}finally{sphGeo=sg}};
})();
