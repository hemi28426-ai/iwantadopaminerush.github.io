// Unblocked Rocketry visual module: planets (loaded after the main game script; override/wrap globals here)
(function(){
if(typeof makeTex!=='function')return;
const cl01=v=>v<0?0:v>1?1:v, sm=(a,b,x)=>{const t=cl01((x-a)/(b-a));return t*t*(3-2*t)};
const ridge=(x,y,z,s,o)=>{let a=0,f=1,amp=.5;for(let i=0;i<o;i++){a+=amp*(1-Math.abs(vnoise(x*f,y*f,z*f,s+i*13)*2-1));f*=2.1;amp*=.5}return a};
function canvasTex(W,H,fill,srgb){const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d'),img=g.createImageData(W,H);fill(img.data);g.putImageData(img,0,0);
  const t=new THREE.CanvasTexture(c);t.wrapS=THREE.RepeatWrapping;if(srgb)t.encoding=THREE.sRGBEncoding;t.anisotropy=8;return t}
const _old=makeTex;
makeTex=function(b,Wt){
  const st=STYLE[b.n]||'rock';if(Wt<256)return _old(b,Wt);
  const Ht=Wt/2,N=Wt*Ht,col=new Uint8ClampedArray(N*4),hgt=new Float32Array(N),rgh=st=='earth'?new Uint8ClampedArray(N):null,emi=st=='earth'?new Float32Array(N):null;
  const base=hex(b.col),seed=b.n.charCodeAt(0)*31+b.n.length;let s2=seed*7+3;const rnd=()=>(s2=(s2*16807)%2147483647)/2147483647;
  for(let y=0;y<Ht;y++){const lat=(y/Ht-.5)*Math.PI,cla=Math.cos(lat),sl=Math.sin(lat),al=Math.abs(sl);
    for(let x=0;x<Wt;x++){const lon=x/Wt*2*Math.PI,px=cla*Math.cos(lon),py=cla*Math.sin(lon),pz=sl,k=y*Wt+x;let c,h=0;
      if(st=='earth'){const wx=fbm(px*1.5,py*1.5,pz*1.5,seed+40,3)-.5,wy=fbm(px*1.5+5,py*1.5,pz*1.5,seed+41,3)-.5;
        const qx=px+wx*.9,qy=py+wy*.9,qz=pz+(wx-wy)*.5,dl=(px+.6)**2+(py-.3)**2+pz*pz;
        const e=fbm(qx*1.8,qy*1.8,qz*1.8,seed,6)+.06*fbm(px*14,py*14,pz*14,seed+5,3)+.1*Math.exp(-dl*6)-.04;
        h=e;if(e<.5){const sh=sm(.43,.5,e);c=mix(mix([4,18,52],[10,48,105],sm(.25,.43,e)),[30,120,150],sh*sh);rgh[k]=sh>.6?120:55}
        else{const m=fbm(px*4,py*4,pz*4,seed+9,4),dry=cl01(1-Math.abs(Math.abs(lat)-.42)*4)*.9+(m-.5)*1.6,cold=sm(.5,.8,al);
          let g=mix([38,82,28],[22,58,22],sm(.0,.25,1-Math.abs(lat)*3));g=mix(g,[96,104,52],cl01(m*1.4-.5));
          c=mix(g,mix([196,164,108],[214,186,130],m),sm(.35,.75,dry));c=mix(c,[82,92,70],cold*.7);
          const mt=ridge(px*5,py*5,pz*5,seed+11,4);const mtn=sm(.55,.8,e)*mt;c=mix(c,[110,98,86],cl01(mtn*1.6));if(mtn>.55-.1*cold)c=mix(c,[240,244,250],sm(.55,.7,mtn+.1*cold));
          c=mix(c,[235,232,220],sm(.02,0,e-.5)*.4);h=.5+mtn*.4;rgh[k]=230;
          const cit=fbm(px*40,py*40,pz*40,seed+77,2),reg=fbm(px*6,py*6,pz*6,seed+78,3);emi[k]=(1-cold)*(1-sm(.4,.9,dry))*sm(.5,.62,reg)*sm(.55,.72,cit)*(e<.56?1.4:.8)}
        const ice=.86+.05*fbm(px*5,py*5,pz*5,seed+3,3);if(al>ice){c=mix(c,[238,243,250],sm(ice,ice+.02,al));rgh[k]=200;emi[k]=0;h=Math.max(h,.55)}}
      else if(st=='mars'){const e=fbm(px*2.5,py*2.5,pz*2.5,seed,6),d=fbm(px*1.6,py*1.6,pz*1.6,seed+8,4);
        c=mix([118,48,26],[212,118,70],e);c=mix(c,[70,38,30],sm(.52,.66,d)*.8);
        const vl=Math.abs(lat+.15+.05*Math.sin(lon*3))*30+Math.abs(lon-1.2)*1.2-1.5;if(lon>.4&&lon<2.2)c=mix(c,[60,26,16],sm(1,0,vl+e*.8)*.85);
        const vol=Math.hypot(lon-.6,lat-.3);if(vol<.18)c=mix(c,[170,95,60],sm(.18,.05,vol));
        h=e-sm(1,0,vl)*.3+sm(.18,0,vol)*.4;if(al>.9+.04*e)c=mix(c,[236,230,224],sm(.9,.93,al))}
      else if(st=='gas'||st=='ice'){const sat=b.n=='Saturn',jup=b.n=='Jupiter';
        const tq=fbm(px*4,py*4,pz*4,seed,5),tw=fbm(px*12+tq*3,py*12,pz*12,seed+4,4);const lw=sl+(tq-.5)*(st=='ice'?.04:.07)+(tw-.5)*.025;
        const bnd=Math.sin(lw*(jup?28:sat?36:10)),b2=Math.sin(lw*(jup?71:sat?90:23));
        if(jup){c=mix([196,160,120],[244,232,208],.5+.5*bnd);c=mix(c,[150,95,60],sm(.4,1,-bnd)*.55+.15*b2);c=mix(c,[95,95,110],sm(.75,.95,al))}
        else if(sat){c=mix([200,170,118],[236,218,176],.5+.4*bnd+.1*b2);c=mix(c,[150,150,160],sm(.8,.97,al)*.6)}
        else c=mix(mix(base,[0,20,60],.15),mix(base,[255,255,255],.3),.5+.3*bnd+.1*b2);
        if(jup){for(const[lx,ly,rx,ry,cc]of[[4,-.38,.24,.09,[196,82,52]],[1.3,.5,.06,.03,[245,240,230]],[2.6,-.6,.05,.03,[245,240,230]]]){const dx=lon-lx,dy=lat-ly,q=dx*dx/(rx*rx)+dy*dy/(ry*ry);if(q<1.6){const sw=Math.sin(q*9+tw*6)*.15;c=mix(cc,c,sm(.2,1.5,q+sw))}}}
        if(b.n=='Neptune'){const dx=lon-2,dy=lat+.35,q=dx*dx/.03+dy*dy/.006;if(q<1)c=mix([20,30,90],c,q)}}
      else if(st=='venus'){const tq=fbm(px*2,py*2,pz*2,seed,5),v=Math.sin(sl*5+tq*7+Math.cos(lon*2)*sl*3);c=mix([196,150,84],[250,232,182],.5+.5*v)}
      else if(st=='sun'){const gr=fbm(px*40,py*40,pz*40,seed,3),e=fbm(px*6,py*6,pz*6,seed+2,4);c=mix([255,120,20],[255,236,170],cl01(gr*.8+e*.5-.1));if(e>.68)c=mix(c,[150,40,0],sm(.68,.75,e)*.7)}
      else if(st=='europa'){const e=fbm(px*3,py*3,pz*3,seed,4),cr=Math.abs(fbm(px*6,py*6,pz*6,seed+4,4)-.5),cr2=Math.abs(fbm(px*13,py*13,pz*13,seed+6,3)-.5);c=mix([206,194,176],[246,246,250],e);if(cr<.018)c=mix(c,[150,92,64],sm(.018,.004,cr));if(cr2<.01)c=mix(c,[170,120,95],.5);h=e}
      else if(st=='titan'){const e=fbm(px*2,py*2,pz*2,seed,5);c=mix([150,90,30],[230,170,70],e)}
      else if(st=='io'){const e=fbm(px*3,py*3,pz*3,seed,5),f=fbm(px*9,py*9,pz*9,seed+3,3);c=mix([212,180,56],[252,244,160],e);c=mix(c,[190,90,30],sm(.6,.75,f)*.7);h=e}
      else{const e=fbm(px*3,py*3,pz*3,seed,6),mar=fbm(px*1.4,py*1.4,pz*1.4,seed+21,4),dk=mix(base,[0,0,0],.5),lt=mix(base,[255,255,255],.22);
        c=mix(dk,lt,e);if(b.n=='Moon')c=mix(c,[72,72,76],sm(.5,.6,mar)*.75);h=e*.5-sm(.5,.6,mar)*.1}
      hgt[k]=h;const i=k*4;col[i]=c[0];col[i+1]=c[1];col[i+2]=c[2];col[i+3]=255}}
  // craters stamped into color + height (spherical-correct width)
  if(st=='rock'||st=='io'||b.n=='Mars'){const nC=st=='io'?40:b.n=='Mars'?200:700;
    for(let n=0;n<nC;n++){const cy=rnd()*Ht,cx=rnd()*Wt,r=(1.5+Math.pow(rnd(),3)*28)*Wt/1024,cosl=Math.max(.15,Math.cos((cy/Ht-.5)*Math.PI)),rx=r/cosl,ray=r>14*Wt/1024&&rnd()<.5;
      const R2=ray?3:1.35;for(let yy=Math.max(0,cy-r*R2|0);yy<Math.min(Ht,cy+r*R2+1);yy++)for(let xo=-rx*R2|0;xo<=rx*R2;xo++){const dx=xo/rx,dy=(yy-cy)/r,d=Math.hypot(dx,dy);if(d>R2)continue;
        const k=yy*Wt+(((cx+xo)|0)%Wt+Wt)%Wt,i=k*4;let dh=0,dc=0;
        if(d<1){dh=-(1-d*d)*.5;dc=-(1-d)*.25+(d>.6?(dx+dy<0?.18:-.12)*(d-.6)*2.5:0)}else if(d<1.35){dh=(1.35-d)*.6;dc=.08*(1.35-d)/.35}
        else if(ray){dc=.12*(1-(d-1.35)/1.65)*sm(.6,.9,vnoise(Math.atan2(dy,dx)*4,n,0,9))}
        hgt[k]+=dh*r/(30*Wt/1024);const m=1+dc;col[i]*=m;col[i+1]*=m;col[i+2]*=m}}}
  const t=canvasTex(Wt,Ht,d=>d.set(col),true);t._ux={};
  if(st!='sun'&&st!='gas'&&st!='ice'&&st!='venus'&&st!='titan'){let mn=1e9,mx=-1e9;for(let k=0;k<N;k++){mn=Math.min(mn,hgt[k]);mx=Math.max(mx,hgt[k])}
    t._ux.bump=canvasTex(Wt,Ht,d=>{for(let k=0;k<N;k++){const v=(hgt[k]-mn)/(mx-mn)*255;d[k*4]=d[k*4+1]=d[k*4+2]=v;d[k*4+3]=255}})}
  if(rgh){t._ux.rough=canvasTex(Wt,Ht,d=>{for(let k=0;k<N;k++){d[k*4]=d[k*4+1]=d[k*4+2]=rgh[k];d[k*4+3]=255}});
    t._ux.emi=canvasTex(Wt,Ht,d=>{for(let k=0;k<N;k++){const v=cl01(emi[k])*255;d[k*4]=v;d[k*4+1]=v*.78;d[k*4+2]=v*.45;d[k*4+3]=255}},true)}
  return t};
// night lights only on the dark side
function nightOnly(m){m.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>',
  '#include <emissivemap_fragment>\n#if NUM_DIR_LIGHTS>0\n totalEmissiveRadiance*=smoothstep(0.08,-0.18,dot(normal,directionalLights[0].direction));\n#endif')};m.needsUpdate=true}
function applyExtras(grp,b){const m=grp.userData.mat,t=m&&m.map;if(!t||grp.userData._px===t)return;grp.userData._px=t;const u=t._ux||{};
  for(const mm of [m,grp.userData.pmat]){if(!mm||!mm.isMeshStandardMaterial)continue;
    if(u.bump){mm.bumpMap=u.bump;mm.bumpScale=b.n=='Earth'?b.R*2e-4:b.R*6e-4}
    if(u.rough){mm.roughnessMap=u.rough;mm.roughness=1;mm.metalness=0}
    if(u.emi&&mm===m){mm.emissiveMap=u.emi;mm.emissive=new THREE.Color(1,.85,.6);mm.emissiveIntensity=1.6;nightOnly(mm)}
    mm.needsUpdate=true}}
const _i=init3D;
init3D=function(){const first=!G3,g=_i();if(first&&g){
  for(const[b,grp]of g.bm){
    if(b.n=='Sun'){grp.userData.sunTex=true}
    if(b.n=='Saturn'){const ring=grp.children.find(o=>o.geometry&&o.geometry.type=='RingGeometry');if(ring){
      const rc=document.createElement('canvas');rc.width=2048;rc.height=4;const rg=rc.getContext('2d');
      for(let x=0;x<2048;x++){const f=x/2048;let a=.35+.4*vnoise(x*.05,0,0,3)+.2*vnoise(x*.4,0,0,5);
        if(f<.12)a*=.25;else if(f<.3)a*=.5;if(f>.52&&f<.56)a*=.04;if(f>.86&&f<.87)a*=.2;if(f>.93)a*=.6*(1-(f-.93)/.07);
        const br=200+40*vnoise(x*.1,1,0,7);rg.fillStyle=`rgba(${br|0},${br*.88|0},${br*.7|0},${cl01(a)})`;rg.fillRect(x,0,1,4)}
      const rt=new THREE.CanvasTexture(rc);rt.encoding=THREE.sRGBEncoding;rt.anisotropy=8;ring.material.map=rt;ring.material.roughness=.9;ring.material.alphaTest=.01;ring.material.needsUpdate=true;
      grp.traverse(o=>{if(o.isMesh&&o!==ring&&o.material&&o.material.isMeshStandardMaterial){const mm=o.material;mm.onBeforeCompile=s=>{ // ring shadow on planet
        s.uniforms.rN={value:new THREE.Vector3()};mm.userData.sh=s;s.vertexShader=s.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvWp=(modelMatrix*vec4(transformed,1.)).xyz;');s.vertexShader='varying vec3 vWp;\n'+s.vertexShader;
        s.fragmentShader='uniform vec3 rN;uniform vec3 rC;uniform vec3 rS;uniform float rR;varying vec3 vWp;\n'+s.fragmentShader.replace('#include <lights_fragment_end>','#include <lights_fragment_end>\n{float dn=dot(rS,rN);if(abs(dn)>1e-4){float tt=dot(rC-vWp,rN)/dn;if(tt>0.){float rr=length(vWp+rS*tt-rC)/rR;if(rr>1.25&&rr<2.3)reflectedLight.directDiffuse*=0.35;}}}');
        s.uniforms.rC={value:new THREE.Vector3()};s.uniforms.rS={value:new THREE.Vector3(1,0,0)};s.uniforms.rR={value:b.R}};mm.needsUpdate=true;grp.userData.ringSh={ring,mm}}})}}
    applyExtras(grp,b)}}
  return g};
const _pb=placeBodies;
placeBodies=function(g,gx,gy,camW){_pb(g,gx,gy,camW);const sp=bpos(bodies.Sun,t);
  for(const[b,grp]of g.bm){applyExtras(grp,b);
    if(grp.userData.sunTex&&grp.userData.mat.map){const m=grp.userData.mat.map;m.offset.x=(performance.now()*2e-6)%1}
    const rs=grp.userData.ringSh;if(rs&&rs.mm.userData.sh){const u=rs.mm.userData.sh.uniforms;grp.updateMatrixWorld();
      u.rC.value.setFromMatrixPosition(grp.matrixWorld);u.rN.value.set(0,0,1).applyQuaternion(rs.ring.getWorldQuaternion(new THREE.Quaternion()));
      const p=bpos(b,t);u.rS.value.set(sp[0]-p[0],sp[1]-p[1],0).normalize()}}};
})();
