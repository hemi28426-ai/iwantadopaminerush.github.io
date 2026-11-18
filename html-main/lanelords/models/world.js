// Lane Lords battlefield: smooth heightmap board, river channel, sculpted bridges, instanced trees/rocks/grass, mountain ring.
(function(){const T=THREE,K=CCK;window.LL_MODELS=window.LL_MODELS||{};
LL_MODELS.world=function(scene,o){const BW=o.bw,BD=o.bd,LXW=o.lanes,RIV=o.river;// board width/depth in world units, lane x centers, river half-width
 const EXT=70,res=.5,seg=Math.round(EXT*2/res);
 const ss=t=>t<=0?0:t>=1?1:t*t*(3-2*t);
 const fb=(x,z)=>{let s=0,a=1,n=0,f=1;for(let i=0;i<4;i++){s+=K.noise3(x*f,z*f,1.7)*a;n+=a;a*=.5;f*=2;}return s/n;};
 // coarse grid + smoothstep sampling
 const GC=2,gN=Math.ceil(EXT*2/GC)+1,coarse=new Float32Array(gN*gN);
 for(let j=0;j<gN;j++)for(let i=0;i<gN;i++){const x=-EXT+i*GC,z=-EXT+j*GC;const ex=Math.max(0,Math.abs(x)-BW/2),ez=Math.max(0,Math.abs(z)-BD/2);const e=Math.hypot(ex,ez);
  coarse[j*gN+i]=ss(e/5)*1.4+ss((e-6)/18)*(fb(x/14,z/14)*14-2);}
 const H=(x,z)=>{const fx=(x+EXT)/GC,fz=(z+EXT)/GC,i=Math.min(gN-2,Math.max(0,Math.floor(fx))),j=Math.min(gN-2,Math.max(0,Math.floor(fz))),u=ss(fx-i),v=ss(fz-j);const a=coarse[j*gN+i],b=coarse[j*gN+i+1],c=coarse[(j+1)*gN+i],d=coarse[(j+1)*gN+i+1];return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;};
 const height=(x,z)=>{const nz=K.noise3(x*1.3,z*1.3,4)-.5;const ex=Math.max(0,Math.abs(x)-BW/2),ez=Math.max(0,Math.abs(z)-BD/2);let h=(ex>0||ez>0)?H(x,z)+nz*.08:.02+nz*.03;
  if(Math.abs(x)<BW/2+3)h-=ss(1-(Math.abs(z)-RIV)/1.2)*1.0;
  if(ex===0&&ez===0)for(const lx of LXW)if(Math.abs(x-lx)<.9&&Math.abs(z)<BD/2-5)h-=.04*ss(1-Math.abs(x-lx)/.9);return h;};
 const geo=new T.PlaneGeometry(EXT*2,EXT*2,seg,seg);geo.rotateX(-Math.PI/2);const p=geo.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,height(p.getX(i),p.getZ(i)));geo.computeVertexNormals();
 const col=new Float32Array(p.count*3),n=geo.attributes.normal;
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),y=p.getY(i);const onBoard=Math.abs(x)<BW/2&&Math.abs(z)<BD/2;let c;
  const m=K.noise3(x*.25,z*.25,9),m2=K.noise3(x*1.1,z*1.1,3);
  if(onBoard){const stripe=Math.floor((z+BD/2)/1.5)%2?1:.92;c=[.24*stripe,.43*stripe,.16*stripe];c=K.mix(c,[.3,.46,.18],m*.4);
   for(const lx of LXW){const d=Math.abs(x-lx);if(d<.85&&Math.abs(z)<BD/2-5)c=K.mix(c,[.62,.5,.34],ss(1-d/.85)*.9);}
   for(const kz of[-BD/2+3,BD/2-3]){const d=Math.hypot(x,z-kz);if(d<2.7)c=K.mix(c,[.6,.5,.34],ss(1-(d-2)/.7)*.85);}}
  else{c=K.mix([.26,.44,.2],[.44,.46,.25],Math.max(0,m-.4)*1.6);if(m2>.68)c=K.mix(c,[.34,.27,.18],Math.min(1,(m2-.68)*4));if(y>6)c=K.mix(c,[.5,.5,.48],Math.min(1,(y-6)/5));}
  if(y<-.2)c=K.mix(c,[.36,.3,.22],Math.min(1,(-.2-y)*2));
  const sl=1-n.getY(i);const dk=1-Math.min(.5,sl*1.8);col.set([c[0]*dk,c[1]*dk,c[2]*dk],i*3);}
 geo.setAttribute('color',new T.BufferAttribute(col,3));
 const d=K.get('detail');const map=d.map.clone(),nm=d.normalMap.clone();map.repeat.set(EXT*2/2.5,EXT*2/2.5);nm.repeat.copy(map.repeat);map.needsUpdate=nm.needsUpdate=true;
 const ground=new T.Mesh(geo,new T.MeshStandardMaterial({map,normalMap:nm,normalScale:new T.Vector2(.6,.6),vertexColors:true,roughness:.95}));ground.receiveShadow=true;scene.add(ground);
 // water
 const wn=d.normalMap.clone();wn.repeat.set(6,1);wn.needsUpdate=true;
 const water=new T.Mesh(new T.PlaneGeometry(BW+6,RIV*2+1.4,1,1),new T.MeshStandardMaterial({color:0x1a4f86,roughness:.08,metalness:.3,normalMap:wn,normalScale:new T.Vector2(.35,.35),transparent:true,opacity:.92}));water.rotation.x=-Math.PI/2;water.position.y=-.32;water.receiveShadow=true;scene.add(water);
 // bridges
 const wd=K.get('wood');const plankM=K.M({map:wd.map,normalMap:wd.normalMap,color:0xb08a5a,roughness:.75}),postM=K.M({map:wd.map,normalMap:wd.normalMap,color:0x7a5a38,roughness:.8});
 const bparts=[],pparts=[];const r=K.rng(3);
 for(const lx of LXW){for(let i=0;i<9;i++){const z=-1.7+i*.425;const pl=K.slab(2.0+r()*.1,.38,.12,.06,.025);K.warp(pl,.02,3,i);bparts.push([pl,K.mat4(lx+(r()-.5)*.05,.02+Math.sin(i/8*Math.PI)*.12,z,0,(r()-.5)*.04,(r()-.5)*.03)]);}
  for(const s of[-1,1]){for(let i=0;i<4;i++)pparts.push([K.lathe([[0,-.5],[.09,-.5],[.1,.5],[.07,.62],[0,.64]],12),K.mat4(lx+s*1.05,.1,-1.6+i*1.07)]);
   pparts.push([K.tube([[lx+s*1.05,.62,-1.7],[lx+s*1.05,.56,0],[lx+s*1.05,.62,1.7]],.045,16,8),null]);}}
 const bm=new T.Mesh(K.merge(bparts),plankM),pm=new T.Mesh(K.merge(pparts),postM);bm.castShadow=bm.receiveShadow=pm.castShadow=true;scene.add(bm,pm);
 // instanced trees, rocks, grass, bushes outside the board
 const dm=new T.Object3D();const inst=(g,m,list,fn,shadow=true)=>{const im=new T.InstancedMesh(g,m,list.length);list.forEach((s,k)=>{fn(dm,s);dm.updateMatrix();im.setMatrixAt(k,dm.matrix);});im.castShadow=shadow;im.receiveShadow=true;scene.add(im);return im;};
 const off=(minE,maxE,count,rr)=>{const out=[];let k=0;while(out.length<count&&k<count*30){k++;const x=(rr()-.5)*EXT*1.8,z=(rr()-.5)*EXT*1.8;const ex=Math.max(0,Math.abs(x)-BW/2),ez=Math.max(0,Math.abs(z)-BD/2),e=Math.hypot(ex,ez);if(e>minE&&e<maxE&&Math.abs(z)>RIV+2.5||(e>minE&&e<maxE&&Math.abs(x)>BW/2+4))out.push([x,z,rr()]);}return out;};
 const rr=K.rng(11);
 if(window.CC_MODELS&&CC_MODELS.tree){const tr=CC_MODELS.tree();const trees=off(1.5,40,140,rr);const pf=(o,s)=>{o.position.set(s[0],height(s[0],s[1]),s[1]);o.rotation.set(0,s[2]*6.28,0);o.scale.setScalar(.45+s[2]*.35);};
  inst(tr.trunk,tr.trunkMat,trees,pf);inst(tr.leaves,tr.leafMat,trees,pf);}
 const rockG=K.blob(1,14,.3,1.6,4);rockG.scale(1,.6,1);const cb=K.get('concrete');
 inst(rockG,K.M({map:cb.map,normalMap:cb.normalMap,color:0x9a9890,roughness:.95}),off(.6,45,90,rr),(o,s)=>{const sc=.2+s[2]*.6;o.position.set(s[0],height(s[0],s[1])-.05,s[1]);o.rotation.set(0,s[2]*6,0);o.scale.set(sc,sc,sc);});
 const bush=K.merge([[K.blob(.6,14,.25,2,1),K.mat4(0,.35,0)],[K.blob(.45,12,.25,2,2),K.mat4(.45,.3,.1)],[K.blob(.4,12,.25,2,3),K.mat4(-.4,.28,-.1)]]);const lf=K.get('leaf');
 inst(bush,K.M({map:lf.map,normalMap:lf.normalMap,color:0xb8d8a0,roughness:.85}),off(.5,30,80,rr),(o,s)=>{o.position.set(s[0],height(s[0],s[1])-.05,s[1]);o.rotation.set(0,s[2]*6,0);o.scale.setScalar(.5+s[2]*.6);});
 if(window.CC_MODELS&&CC_MODELS.grassTuft){const G=CC_MODELS.grassTuft();const spots=[];for(let k=0;k<9000;k++){const x=(rr()-.5)*EXT*1.4,z=(rr()-.5)*EXT*1.4;const onB=Math.abs(x)<BW/2-.3&&Math.abs(z)<BD/2-.3;
   if(onB)continue;
   spots.push([x,z,.35+rr()*.45,rr()*7]);}
  inst(G.geo,G.mat,spots,(o,s)=>{o.position.set(s[0],height(s[0],s[1])-.02,s[1]);o.rotation.set(0,s[3],0);o.scale.set(s[2],s[2],s[2]);},false);}
 // mountain ring (fog turns these into silhouettes)
 const mparts=[];for(let i=0;i<26;i++){const a=i/26*Math.PI*2+rr()*.1,rad=85+rr()*30;const hgt=14+rr()*26;const l=K.lathe([[0,0],[hgt*.9,0],[hgt*.55,hgt*.45],[hgt*.2,hgt*.85],[0,hgt]],18);K.warp(l,hgt*.12,.08,i);mparts.push([l,K.mat4(Math.cos(a)*rad,-4,Math.sin(a)*rad,0,rr()*6,0,1,1,.8+rr()*.5)]);}
 scene.add(new T.Mesh(K.merge(mparts),K.M({color:0x6a7a6a,roughness:1})));
 return{height,water};};
})();
