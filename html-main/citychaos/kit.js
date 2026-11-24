// City Chaos graphics toolkit: procedural textures, normal maps, sculpting helpers.
(function(){
const T=THREE;
const K={};
// ---- seeded noise (tileable) ----
K.rng=function(seed){let s=seed>>>0||1;return()=>((s=Math.imul(s^(s>>>15),2246822507)^Math.imul(s^(s>>>13),3266489909))>>>0)/4294967296;};
function hash(x,y,p,seed){x=((x%p)+p)%p;y=((y%p)+p)%p;let h=Math.imul(x,374761393)+Math.imul(y,668265263)+Math.imul(seed,982451653);h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;}
K.tnoise=function(x,y,p,seed){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
 const a=hash(xi,yi,p,seed),b=hash(xi+1,yi,p,seed),c=hash(xi,yi+1,p,seed),d=hash(xi+1,yi+1,p,seed);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;};
K.tfbm=function(x,y,p,oct,seed){let s=0,a=1,n=0,f=1;for(let i=0;i<oct;i++){s+=K.tnoise(x*f,y*f,p*f,seed+i)*a;n+=a;a*=.5;f*=2;}return s/n;};
// plain (non tiling) noise for geometry
K.noise3=function(x,y,z){const p=Math.floor;const h=(i,j,k)=>{let n=Math.imul(i,73856093)^Math.imul(j,19349663)^Math.imul(k,83492791);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967296;};
 const xi=p(x),yi=p(y),zi=p(z),xf=x-xi,yf=y-yi,zf=z-zi,s=t=>t*t*(3-2*t),u=s(xf),v=s(yf),w=s(zf);const L=(a,b,t)=>a+(b-a)*t;
 return L(L(L(h(xi,yi,zi),h(xi+1,yi,zi),u),L(h(xi,yi+1,zi),h(xi+1,yi+1,zi),u),v),L(L(h(xi,yi,zi+1),h(xi+1,yi,zi+1),u),L(h(xi,yi+1,zi+1),h(xi+1,yi+1,zi+1),u),v),w);};

// ---- canvas texture pipeline ----
K.canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
K.tex=function(c,{repeat=[1,1],srgb=true}={}){const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(repeat[0],repeat[1]);t.anisotropy=8;t.encoding=srgb?T.sRGBEncoding:T.LinearEncoding;t.needsUpdate=true;return t;};
// height canvas -> tangent-space normal map (linear)
K.normalMap=function(hc,strength=2,repeat){const w=hc.width,h=hc.height,src=hc.getContext('2d').getImageData(0,0,w,h).data,out=K.canvas(w,h),og=out.getContext('2d'),od=og.createImageData(w,h);
 const H=(x,y)=>src[(((y+h)%h)*w+((x+w)%w))*4]/255;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const dx=(H(x+1,y)-H(x-1,y))*strength,dy=(H(x,y+1)-H(x,y-1))*strength;const l=Math.hypot(dx,dy,1);const i=(y*w+x)*4;
  od.data[i]=(-dx/l*.5+.5)*255;od.data[i+1]=(dy/l*.5+.5)*255;od.data[i+2]=(1/l*.5+.5)*255;od.data[i+3]=255;}
 og.putImageData(od,0,0);return K.tex(out,{repeat,srgb:false});};
// build color + height canvases from a per-pixel function f(u,v)->{c:[r,g,b],h}
K.material=function(size,f,{repeat=[1,1],normal=2,rough=.85,metal=0,color=0xffffff}={}){const cc=K.canvas(size,size),hc=K.canvas(size,size),cg=cc.getContext('2d'),hg=hc.getContext('2d');
 const cd=cg.createImageData(size,size),hd=hg.createImageData(size,size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const r=f(x/size,y/size,x,y);const i=(y*size+x)*4;cd.data[i]=r.c[0];cd.data[i+1]=r.c[1];cd.data[i+2]=r.c[2];cd.data[i+3]=255;const hv=Math.max(0,Math.min(255,r.h*255));hd.data[i]=hd.data[i+1]=hd.data[i+2]=hv;hd.data[i+3]=255;}
 cg.putImageData(cd,0,0);hg.putImageData(hd,0,0);
 const map=K.tex(cc,{repeat}),nm=K.normalMap(hc,normal,repeat);return new T.MeshStandardMaterial({map,normalMap:nm,roughness:rough,metalness:metal,color});};
const cl=v=>Math.max(0,Math.min(255,v|0));
K.mix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
// ---- texture library ----
K.lib={};
K.get=function(name){if(K.lib[name])return K.lib[name];const m=K.make[name]();K.lib[name]=m;return m;};
K.make={
 asphalt:()=>K.material(256,(u,v)=>{const n=K.tfbm(u*16,v*16,16,4,3),g=K.tnoise(u*96,v*96,96,9);const s=g>.82?40:0;const b=72+n*40+s;return{c:[cl(b),cl(b),cl(b+4)],h:n*.6+g*.4};},{repeat:[1,1],normal:3,rough:.92}),
 detail:()=>K.material(256,(u,v)=>{const n=K.tfbm(u*8,v*8,8,5,11),g=K.tnoise(u*64,v*64,64,4);const b=200+n*55-g*30;return{c:[cl(b),cl(b),cl(b)],h:n*.7+g*.3};},{normal:4,rough:.95}),
 concrete:()=>K.material(256,(u,v,x,y)=>{const n=K.tfbm(u*10,v*10,10,4,21),g=K.tnoise(u*80,v*80,80,6);const seam=(x%128<2||y%128<2)?-45:0;const b=168+n*40+g*14+seam;return{c:[cl(b),cl(b-2),cl(b-6)],h:(seam?0:.6)+n*.3+g*.1};},{normal:3,rough:.9}),
 brick:()=>K.material(256,(u,v,x,y)=>{const row=y>>4,off=(row%2)*16,bx=((x+off)%32),by=y%16;const mortar=bx<2||by<2;const id=hash((x+off)>>5,row,999,5);
  const n=K.tnoise(u*40,v*40,40,8);if(mortar)return{c:[cl(150+n*30),cl(144+n*30),cl(134+n*30)],h:.1};const r=140+id*50+n*30;return{c:[cl(r),cl(r*.48),cl(r*.36)],h:.7+n*.3};},{normal:5,rough:.9}),
 stone:()=>K.material(256,(u,v,x,y)=>{const row=y>>5,off=(row%2)*24,bx=((x+off)%48),by=y%32;const mortar=bx<3||by<3;const id=hash((x+off)/48|0,row,777,9);const n=K.tfbm(u*12,v*12,12,4,91);if(mortar)return{c:[cl(120+n*30),cl(116+n*30),cl(108+n*30)],h:.05};const b=150+id*55+n*40;const edge=Math.min(bx-3,48-bx,by-3,32-by);const bev=Math.min(1,edge/5);return{c:[cl(b),cl(b*.97),cl(b*.9)],h:.35+bev*.45+n*.2};},{normal:5,rough:.88}),
 cloth:()=>K.material(128,(u,v,x,y)=>{const w=((x%4<2)!==(y%4<2))?1:0;const n=K.tnoise(u*20,v*20,20,2);const b=205+w*30+n*20;return{c:[cl(b),cl(b),cl(b)],h:.4+w*.4+n*.2};},{repeat:[10,10],normal:2.5,rough:.95}),
 wood:()=>K.material(256,(u,v)=>{const n=K.tfbm(u*3,v*3,3,4,31),f=K.tnoise(u*64,v*4,64,33);const ring=Math.sin((v*14+n*2.2)*Math.PI)*.5+.5;const t=ring*.35+n*.35+f*.15;const b=K.mix([176,124,78],[118,78,46],t);return{c:b,h:ring*.4+f*.4+n*.2};},{normal:2,rough:.7}),
 metal:()=>K.material(256,(u,v)=>{const s=K.tnoise(u*4,v*180,4,41),n=K.tfbm(u*6,v*6,6,3,7);const b=190+s*30+n*25;return{c:[cl(b),cl(b),cl(b+5)],h:s*.5+n*.5};},{normal:1.2,rough:.38,metal:.85}),
 paint:()=>K.material(128,(u,v)=>{const n=K.tfbm(u*6,v*6,6,3,51);const b=235+n*20;return{c:[cl(b),cl(b),cl(b)],h:.5+n*.08};},{normal:.6,rough:.28,metal:.55}),
 rubber:()=>K.material(128,(u,v,x,y)=>{const tread=(x%16<6)?1:0;const n=K.tnoise(u*30,v*30,30,4);return{c:[cl(38+n*10),cl(38+n*10),cl(40+n*10)],h:tread*.8+n*.2};},{repeat:[8,1],normal:4,rough:.95}),
 skin:()=>K.material(128,(u,v)=>{const n=K.tfbm(u*12,v*12,12,3,61);const b=235+n*20;return{c:[cl(b),cl(b-6),cl(b-10)],h:.5+n*.2};},{normal:.8,rough:.62}),
 bark:()=>K.material(128,(u,v)=>{const n=K.tfbm(u*6,v*30,6,4,71);const b=K.mix([110,82,58],[60,44,30],n);return{c:b,h:n};},{repeat:[2,2],normal:5,rough:.95}),
 leaf:()=>K.material(128,(u,v)=>{const n=K.tfbm(u*10,v*10,10,4,81);const b=K.mix([70,120,52],[38,82,34],n);return{c:b,h:n};},{repeat:[2,2],normal:3,rough:.8}),
};
// windows: brick/concrete facade with glass panes (color map + normal)
K.facade=function(style,seed){const S=256,r=K.rng(seed),cc=K.canvas(S,S),hc=K.canvas(S,S),g=cc.getContext('2d'),hg=hc.getContext('2d');
 const base=[[176,150,120],[140,150,160],[196,180,150],[120,96,80],[160,98,74],[210,200,182],[96,106,120]][style%7];
 const img=g.createImageData(S,S),himg=hg.createImageData(S,S);
 for(let y=0;y<S;y++)for(let x=0;x<S;x++){const n=K.tfbm(x/S*12,y/S*12,12,3,seed),i=(y*S+x)*4;const b=.85+n*.3;img.data[i]=cl(base[0]*b);img.data[i+1]=cl(base[1]*b);img.data[i+2]=cl(base[2]*b);img.data[i+3]=255;himg.data[i]=himg.data[i+1]=himg.data[i+2]=cl(140+n*60);himg.data[i+3]=255;}
 g.putImageData(img,0,0);hg.putImageData(himg,0,0);
 // 2x2 windows per tile (tile = 8m wide x 8m tall => 2 floors)
 for(let fy=0;fy<2;fy++)for(let fx=0;fx<2;fx++){const x=fx*128+30,y=fy*128+26,w=68,h=80;const lit=r()<.22;
  g.fillStyle='rgba(0,0,0,.35)';g.fillRect(x-6,y-6,w+12,h+14);hg.fillStyle='#202020';hg.fillRect(x-6,y-6,w+12,h+14);
  const gr=g.createLinearGradient(x,y,x+w,y+h);if(lit){gr.addColorStop(0,'#ffe6a8');gr.addColorStop(1,'#d89a50');}else{gr.addColorStop(0,'#8fb0c8');gr.addColorStop(.5,'#3a5268');gr.addColorStop(1,'#22303e');}
  g.fillStyle=gr;g.fillRect(x,y,w,h);g.fillStyle='rgba(255,255,255,.25)';g.fillRect(x,y+h/2-2,w,4);g.fillRect(x+w/2-2,y,4,h);
  hg.fillStyle='#000';hg.fillRect(x,y,w,h);hg.fillStyle='#ddd';hg.fillRect(x-8,y+h+6,w+16,7);g.fillStyle='rgba(255,255,255,.18)';g.fillRect(x-8,y+h+6,w+16,7);}
 const map=K.tex(cc),nm=K.normalMap(hc,3);return{map,nm};};

// ---- geometry sculpting ----
K.lathe=(pts,seg=24)=>new T.LatheGeometry(pts.map(p=>new T.Vector2(p[0],p[1])),seg);
K.tube=(pts,r,seg=24,rs=10,closed=false)=>{const curve=new T.CatmullRomCurve3(pts.map(p=>new T.Vector3(p[0],p[1],p[2])));return new T.TubeGeometry(curve,seg,r,rs,closed);};
// tapered tube: radius function along t
K.taper=(pts,rf,seg=24,rs=12)=>{const g=K.tube(pts,1,seg,rs);const curve=g.parameters.path;const pos=g.attributes.position,v=new T.Vector3(),c=new T.Vector3();
 for(let i=0;i<=seg;i++){const t=i/seg;curve.getPointAt(t,c);const r=rf(t);for(let j=0;j<=rs;j++){const k=i*(rs+1)+j;v.fromBufferAttribute(pos,k).sub(c).multiplyScalar(r).add(c);pos.setXYZ(k,v.x,v.y,v.z);}}
 g.computeVertexNormals();return g;};
K.blob=(r,seg=24,amp=.08,freq=2.5,seed=0)=>{const g=new T.SphereGeometry(r,seg,Math.max(8,seg*3/4|0));const p=g.attributes.position,v=new T.Vector3();
 for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const n=K.noise3(v.x/r*freq+seed,v.y/r*freq,v.z/r*freq)-.5;v.multiplyScalar(1+n*amp*2);p.setXYZ(i,v.x,v.y,v.z);}
 K.weld(g);return g;};
// rounded-rect shape
K.rrect=(w,h,r)=>{const s=new T.Shape(),x=-w/2,y=-h/2;r=Math.min(r,w/2,h/2);s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;};
K.extrude=(shape,depth,bevel=.05,curveSeg=6)=>{const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:Math.max(2,curveSeg/2|0),curveSegments:curveSeg});g.translate(0,0,-depth/2);return g;};
// slab: rounded rect extruded vertically (y up), centered at y=h/2
K.slab=(w,d,h,r,bevel)=>{const g=K.extrude(K.rrect(w,d,r),h,bevel==null?Math.min(.08,h*.2):bevel);g.rotateX(-Math.PI/2);g.translate(0,h/2,0);return g;};
// irregularity: sag along y, random warp
K.warp=(g,amt=.02,freq=1.5,seed=1)=>{const p=g.attributes.position,v=new T.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const n=K.noise3(v.x*freq+seed,v.y*freq,v.z*freq)-.5,m=K.noise3(v.x*freq,v.y*freq+seed,v.z*freq+7)-.5;p.setXYZ(i,v.x+n*amt,v.y+m*amt*.5,v.z+(n+m)*.5*amt);}g.computeVertexNormals();return g;};
K.sag=(g,amt,axis='x')=>{const p=g.attributes.position;let mn=1e9,mx=-1e9;const A={x:0,y:1,z:2}[axis];for(let i=0;i<p.count;i++){const a=p.array[i*3+A];mn=Math.min(mn,a);mx=Math.max(mx,a);}
 for(let i=0;i<p.count;i++){const a=(p.array[i*3+A]-mn)/(mx-mn||1);p.setY(i,p.getY(i)-Math.sin(a*Math.PI)*amt);}g.computeVertexNormals();return g;};
// merge vertices by position so normals are smooth
K.weld=(g)=>{const p=g.attributes.position,map=new Map(),acc=[];for(let i=0;i<p.count;i++){const k=Math.round(p.getX(i)*1e4)+','+Math.round(p.getY(i)*1e4)+','+Math.round(p.getZ(i)*1e4);if(!map.has(k))map.set(k,[]);map.get(k).push(i);}
 g.computeVertexNormals();const n=g.attributes.normal,v=new T.Vector3(),s=new T.Vector3();for(const ids of map.values()){if(ids.length<2)continue;s.set(0,0,0);for(const i of ids)s.add(v.fromBufferAttribute(n,i));s.normalize();for(const i of ids)n.setXYZ(i,s.x,s.y,s.z);}return g;};
// merge many (geometry, matrix) into one non-indexed geometry (position/normal/uv)
K.merge=(list)=>{const parts=list.map(([g,m])=>{let q=g.index?g.toNonIndexed():g.clone();if(m)q.applyMatrix4(m);if(!q.attributes.uv)q.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(q.attributes.position.count*2),2));return q;});
 let n=0;parts.forEach(p=>n+=p.attributes.position.count);const P=new Float32Array(n*3),N=new Float32Array(n*3),U=new Float32Array(n*2);let o=0;
 parts.forEach(p=>{P.set(p.attributes.position.array,o*3);N.set(p.attributes.normal.array,o*3);U.set(p.attributes.uv.array,o*2);o+=p.attributes.position.count;});
 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(P,3));g.setAttribute('normal',new T.BufferAttribute(N,3));g.setAttribute('uv',new T.BufferAttribute(U,2));return g;};
K.M=(o)=>new T.MeshStandardMaterial(Object.assign({roughness:.7},o));
K.mesh=(g,m,p,x=0,y=0,z=0)=>{const me=new T.Mesh(g,m);me.position.set(x,y,z);me.castShadow=me.receiveShadow=true;if(p)p.add(me);return me;};
K.mat4=(x,y,z,rx=0,ry=0,rz=0,sx=1,sy,sz)=>new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(rx,ry,rz)),new T.Vector3(sx,sy==null?sx:sy,sz==null?sx:sz));
window.CCK=K;window.CC_MODELS=window.CC_MODELS||{};
})();
