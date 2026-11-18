// Trench War - shell-shattered dead tree (procedural, seeded).
// TWM.deadTree(THREE, seed) -> THREE.Group with 2 merged meshes (bark + split inner wood).
(function(){
window.TWM=window.TWM||{};
var TWM=window.TWM,T3=null,TAU=Math.PI*2,texCache={},matCache=null;

function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function wrapA(a){return Math.atan2(Math.sin(a),Math.cos(a));}
function sstep(a,b,x){var t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);}

// ---------- procedural textures (tileable) ----------
function wavyLine(g,x0,W,Hh,amp,f,ph,w,wf,wph,col){
  g.strokeStyle=col;g.lineCap='round';
  for(var o=-W;o<=W;o+=W){
    var px=0,py=0;
    for(var k=0;k<=48;k++){
      var y=k*Hh/48,t=y/Hh*TAU;
      var x=x0+o+amp*Math.sin(t*f+ph)+amp*0.35*Math.sin(t*(f+2)+ph*1.7);
      if(k>0){g.lineWidth=Math.max(0.4,w*(0.55+0.45*Math.sin(t*wf+wph)));g.beginPath();g.moveTo(px,py);g.lineTo(x,y);g.stroke();}
      px=x;py=y;
    }
  }
}
function each9(W,Hh,fn){for(var ox=-W;ox<=W;ox+=W)for(var oy=-Hh;oy<=Hh;oy+=Hh)fn(ox,oy);}
function speckle(g,W,Hh,R,amt){var id=g.getImageData(0,0,W,Hh),d=id.data;for(var p=0;p<d.length;p+=4){var n=(R()-0.5)*amt;d[p]+=n;d[p+1]+=n;d[p+2]+=n;}g.putImageData(id,0,0);}
function finishTex(c){var t=new T3.CanvasTexture(c);t.wrapS=t.wrapT=T3.RepeatWrapping;t.anisotropy=4;t.needsUpdate=true;return t;}

function barkTexture(){
  if(texCache.bark)return texCache.bark;
  var W=256,Hh=256,c=document.createElement('canvas');c.width=W;c.height=Hh;
  var g=c.getContext('2d'),R=mulberry32(91731),i;
  g.fillStyle='rgb(72,64,56)';g.fillRect(0,0,W,Hh);
  // elongated bark plates / mottling
  for(i=0;i<420;i++){(function(x,y,rx,ry,col){g.fillStyle=col;each9(W,Hh,function(ox,oy){g.beginPath();g.ellipse(x+ox,y+oy,rx,ry,0,0,TAU);g.fill();});})(R()*W,R()*Hh,2+R()*7,6+R()*22,R()<0.5?'rgba(128,118,104,'+(0.05+R()*0.1).toFixed(3)+')':'rgba(32,27,22,'+(0.05+R()*0.12).toFixed(3)+')');}
  // deep vertical fissures with a lit ridge edge
  for(i=0;i<18;i++){
    var x0=R()*W,amp=2+R()*7,f=1+Math.floor(R()*3),ph=R()*TAU,w=1.5+R()*4,wf=1+Math.floor(R()*4),wph=R()*TAU,al=0.6+R()*0.35;
    wavyLine(g,x0+w*0.8,W,Hh,amp,f,ph,1.2,wf,wph,'rgba(150,138,120,0.22)');
    wavyLine(g,x0,W,Hh,amp,f,ph,w,wf,wph,'rgba(20,16,13,'+al.toFixed(3)+')');
  }
  // diagonal connecting fissures (interlaced network)
  for(i=0;i<70;i++){(function(x,y,dx,dy,col,lw){g.strokeStyle=col;g.lineWidth=lw;each9(W,Hh,function(ox,oy){g.beginPath();g.moveTo(x+ox,y+oy);g.quadraticCurveTo(x+ox+dx*0.2,y+oy+dy*0.5,x+ox+dx,y+oy+dy);g.stroke();});})(R()*W,R()*Hh,(R()-0.5)*18,8+R()*22,'rgba(24,19,15,'+(0.35+R()*0.4).toFixed(3)+')',0.8+R()*1.8);}
  // short horizontal checks
  for(i=0;i<45;i++){(function(x,y,l,col){g.strokeStyle=col;g.lineWidth=1;each9(W,Hh,function(ox,oy){g.beginPath();g.moveTo(x+ox,y+oy);g.lineTo(x+ox+l,y+oy+1.5);g.stroke();});})(R()*W,R()*Hh,3+R()*9,'rgba(22,18,14,0.55)');}
  // dusty grey-green lichen spots
  for(i=0;i<30;i++){(function(x,y,r,col){g.fillStyle=col;each9(W,Hh,function(ox,oy){g.beginPath();g.arc(x+ox,y+oy,r,0,TAU);g.fill();});})(R()*W,R()*Hh,1+R()*4,'rgba(120,124,112,'+(0.08+R()*0.12).toFixed(3)+')');}
  speckle(g,W,Hh,R,18);
  return (texCache.bark=finishTex(c));
}

function woodTexture(){
  if(texCache.wood)return texCache.wood;
  var W=256,Hh=256,c=document.createElement('canvas');c.width=W;c.height=Hh;
  var g=c.getContext('2d'),R=mulberry32(5521),i;
  g.fillStyle='rgb(190,164,124)';g.fillRect(0,0,W,Hh);
  // weathered grey streaks
  for(i=0;i<12;i++)wavyLine(g,R()*W,W,Hh,2+R()*5,1,R()*TAU,5+R()*12,1,R()*TAU,'rgba(150,140,124,'+(0.12+R()*0.15).toFixed(3)+')');
  // fine grain (dark + light fibres)
  for(i=0;i<70;i++){var dk=R()<0.7;wavyLine(g,R()*W,W,Hh,1+R()*4,1+Math.floor(R()*2),R()*TAU,0.5+R()*1.6,1+Math.floor(R()*3),R()*TAU,dk?'rgba(110,84,54,'+(0.18+R()*0.35).toFixed(3)+')':'rgba(238,220,182,'+(0.15+R()*0.25).toFixed(3)+')');}
  // split tears
  for(i=0;i<28;i++){(function(x,y,dx,l,col,lw){g.strokeStyle=col;g.lineWidth=lw;each9(W,Hh,function(ox,oy){g.beginPath();g.moveTo(x+ox,y+oy);g.lineTo(x+ox+dx,y+oy+l);g.stroke();});})(R()*W,R()*Hh,(R()-0.5)*4,10+R()*40,'rgba(66,48,30,'+(0.3+R()*0.4).toFixed(3)+')',0.6+R()*1.2);}
  speckle(g,W,Hh,R,14);
  return (texCache.wood=finishTex(c));
}

function mats(){
  if(matCache)return matCache;
  var bt=barkTexture(),wt=woodTexture();
  matCache={
    bark:new T3.MeshStandardMaterial({map:bt,bumpMap:bt,bumpScale:0.12,color:0xe8e2da,roughness:0.96,metalness:0}),
    wood:new T3.MeshStandardMaterial({map:wt,bumpMap:wt,bumpScale:0.06,color:0xffffff,roughness:0.86,metalness:0})
  };
  return matCache;
}

// ---------- geometry helpers ----------
function frames(curve,segs){
  var fr=curve.computeFrenetFrames(segs,false),P=[];
  for(var i=0;i<=segs;i++)P.push(curve.getPointAt(i/segs));
  return {P:P,T:fr.tangents,N:fr.normals,B:fr.binormals,len:curve.getLength(),segs:segs};
}
// Sweep a variable-radius ring along precomputed frames. rfn(i,theta,j) -> radius, tfn(i,j) -> offset along tangent.
function sweep(F,i0,i1,radial,th0,th1,rfn,uRep,vLen,tfn,closed){
  var cols=radial+1,pos=[],uv=[],idx=[],i,j;
  for(i=i0;i<=i1;i++){
    var P=F.P[i],N=F.N[i],B=F.B[i],T=F.T[i],s=F.len*i/F.segs;
    for(j=0;j<=radial;j++){
      var jj=(closed&&j===radial)?0:j,th=th0+(th1-th0)*j/radial;
      var r=rfn(i,th,jj),e=tfn?tfn(i,jj):0,c=Math.cos(th),sn=Math.sin(th);
      pos.push(P.x+(N.x*c+B.x*sn)*r+T.x*e,P.y+(N.y*c+B.y*sn)*r+T.y*e,P.z+(N.z*c+B.z*sn)*r+T.z*e);
      uv.push(j/radial*uRep,s/vLen);
    }
  }
  for(i=0;i<i1-i0;i++)for(j=0;j<radial;j++){
    var a=i*cols+j,b=(i+1)*cols+j,c2=(i+1)*cols+j+1,d=i*cols+j+1;
    idx.push(a,d,b,b,d,c2);
  }
  var g=new T3.BufferGeometry();
  g.setAttribute('position',new T3.Float32BufferAttribute(pos,3));
  g.setAttribute('uv',new T3.Float32BufferAttribute(uv,2));
  g.setIndex(idx);
  g.computeVertexNormals();
  if(closed){ // weld seam normals
    var n=g.attributes.normal.array;
    for(i=0;i<=i1-i0;i++){
      var p=i*cols*3,q=(i*cols+radial)*3,x=n[p]+n[q],y=n[p+1]+n[q+1],z=n[p+2]+n[q+2],l=Math.sqrt(x*x+y*y+z*z)||1;
      n[p]=n[q]=x/l;n[p+1]=n[q+1]=y/l;n[p+2]=n[q+2]=z/l;
    }
  }
  return g;
}
// Jagged cap of split wood closing a broken end (rim -> optional inner ring -> centre).
function capGeo(rim,inner,cen,Pc,N,B,sc){
  var pos=[],uv=[],idx=[],n=rim.length,j;
  function add(v){var dx=v.x-Pc.x,dy=v.y-Pc.y,dz=v.z-Pc.z;pos.push(v.x,v.y,v.z);uv.push((dx*N.x+dy*N.y+dz*N.z)/sc,(dx*B.x+dy*B.y+dz*B.z)/sc);}
  for(j=0;j<n;j++)add(rim[j]);
  if(inner)for(j=0;j<n;j++)add(inner[j]);
  add(cen);
  var ci=pos.length/3-1;
  for(j=0;j<n;j++){
    var j1=(j+1)%n;
    if(inner)idx.push(j,j1,n+j1,j,n+j1,n+j,n+j,n+j1,ci);
    else idx.push(ci,j,j1);
  }
  var g=new T3.BufferGeometry();
  g.setAttribute('position',new T3.Float32BufferAttribute(pos,3));
  g.setAttribute('uv',new T3.Float32BufferAttribute(uv,2));
  g.setIndex(idx);g.computeVertexNormals();
  return g.toNonIndexed();
}
function endCap(g,ring,radial,FR,rEnd,rng){
  var p=g.attributes.position.array,cols=radial+1,rim=[];
  for(var j=0;j<radial;j++){var o=(ring*cols+j)*3;rim.push(new T3.Vector3(p[o],p[o+1],p[o+2]));}
  var P=FR.P[ring],T=FR.T[ring];
  return capGeo(rim,null,P.clone().addScaledVector(T,(rng()-0.25)*rEnd*2.2),P,FR.N[ring],FR.B[ring],0.25);
}
function addMerged(grp,list,mat){
  if(!list.length)return;
  var U=T3.BufferGeometryUtils,g=null;
  try{g=(U&&U.mergeBufferGeometries)?U.mergeBufferGeometries(list):null;}catch(e){g=null;}
  if(g){for(var i=0;i<list.length;i++)list[i].dispose();list=[g];}
  for(var k=0;k<list.length;k++){var m=new T3.Mesh(list[k],mat);m.castShadow=true;m.receiveShadow=true;grp.add(m);}
}

// ---------- the tree ----------
TWM.deadTree=function(THREE,seed){
  T3=THREE||window.THREE;
  var rng=mulberry32(((seed||0)*1000003+7919)|0);rng();rng();
  var M=mats(),bark=[],wood=[],i,j,k;
  function V(x,y,z){return new T3.Vector3(x,y,z);}
  function jit(s){return V((rng()-0.5)*s,(rng()-0.5)*s,(rng()-0.5)*s);}

  var H=3+rng()*5,Hb=H*(0.84+rng()*0.08);
  var R0=0.21+0.012*H+rng()*0.05;
  var rTop=Math.max(0.08,R0*(1-Hb/11))*(0.9+rng()*0.2);
  var flare=0.38+rng()*0.25,nR=4+Math.floor(rng()*3),rootA0=rng()*TAU;

  // gnarled, leaning trunk axis (starts 0.22 m below ground)
  var lean=rng()*0.08,la=rng()*TAU,pts=[],ox=0,oz=0;
  for(i=0;i<6;i++){
    var y=-0.22+(Hb+0.22)*i/5;
    if(i>=2){ox+=(rng()-0.5)*0.2*Hb/5;oz+=(rng()-0.5)*0.2*Hb/5;}
    var yl=Math.max(0,y)*lean;
    pts.push(V(Math.cos(la)*yl+ox,y,Math.sin(la)*yl+oz));
  }
  var segs=Math.max(10,Math.min(22,Math.round(Hb*3)));
  var F=frames(new T3.CatmullRomCurve3(pts,false,'catmullrom',0.5),segs),ds=F.len/segs,radial=16;

  var nFl=3+Math.floor(rng()*3),fph=rng()*TAU,twist=(rng()-0.5)*0.6;
  var p1=rng()*TAU,p2=rng()*TAU,p3=rng()*TAU,p4=rng()*TAU,knots=[],nk=2+Math.floor(rng()*3);
  for(i=0;i<nk;i++)knots.push({th:rng()*TAU,s:0.6+rng()*(F.len-1.2),a:rng()<0.35?-0.1:0.08+rng()*0.1,w2:0.04+rng()*0.05});
  var nB=2+Math.floor(rng()*4),brs=[];
  for(i=0;i<nB;i++){
    var ib=Math.max(2,Math.min(segs-2,Math.round((0.35+rng()*0.5)*segs))),thb=i/nB*TAU+rng()*1.2;
    brs.push({ib:ib,th:thb});knots.push({th:thb,s:ib*ds,a:0.14,w2:0.05}); // branch collar swelling
  }
  var patch=rng()<0.7?{th:rng()*TAU,s:F.len*(0.25+rng()*0.4),wp:0.45+rng()*0.4,hp:0.35+rng()*0.4,ph:rng()*TAU}:null,depth=0.035;
  function pmask(th,s){
    if(!patch)return 0;
    var dx=wrapA(th-patch.th)/patch.wp,dy=(s-patch.s)/patch.hp;
    var q=Math.sqrt(dx*dx+dy*dy)*(1+0.18*Math.sin(3*Math.atan2(dy,dx)+patch.ph));
    return 1-sstep(0.55,1,q);
  }
  function rbAt(i){return R0+(rTop-R0)*Math.pow(i/segs,0.8);}
  function tParts(i,th){
    var s=i*ds,rb=rbAt(i),h=s-0.22,lob=Math.max(0,Math.cos(nR*(th-rootA0)));
    var fl=flare*Math.exp(-Math.max(h,-0.25)/0.38)*(0.4+0.6*lob*Math.sqrt(lob));
    var lump=0.09*Math.sin(2*th+p2+s*0.7)*Math.sin(s*1.9+p3)+0.05*Math.sin(3*th+p4-s*1.1);
    var flute=0.06*Math.sin(nFl*th+fph+twist*s+0.5*Math.sin(s*0.9+p1)),kn=0;
    for(var q=0;q<knots.length;q++){var K=knots[q],a=wrapA(th-K.th)*rb,b=s-K.s;kn+=K.a*Math.exp(-(a*a+b*b)/K.w2);}
    return {base:rb*(1+fl+lump),det:rb*(flute+kn),m:pmask(th,s)};
  }

  // trunk with a jagged shell-broken rim
  var topE=[];
  for(j=0;j<radial;j++)topE.push(rng()<0.38?0.1+rng()*0.3*(0.5+rTop*4):rng()*0.07);
  var tg=sweep(F,0,segs,radial,0,TAU,function(i,th){var q=tParts(i,th);return q.base+q.det*(1-q.m)-depth*q.m;},Math.max(1,Math.round(TAU*R0/0.9)),1.2,function(i,jj){return i===segs?topE[jj]:0;},true);
  var tp=tg.attributes.position.array,cols=radial+1,rim=[],inner=[];
  for(j=0;j<radial;j++){var o=(segs*cols+j)*3;rim.push(V(tp[o],tp[o+1],tp[o+2]));}
  bark.push(tg.toNonIndexed());
  tg.dispose();

  // splintered broken top: crater of split heartwood
  var Pt=F.P[segs],Nt=F.N[segs],Bt=F.B[segs],Tt=F.T[segs],rT=rbAt(segs);
  for(j=0;j<radial;j++){
    var ta=j/radial*TAU,rr=rT*(0.42+rng()*0.22),e=Math.pow(rng(),1.6)*0.32-0.06;
    inner.push(Pt.clone().addScaledVector(Nt,Math.cos(ta)*rr).addScaledVector(Bt,Math.sin(ta)*rr).addScaledVector(Tt,e));
  }
  wood.push(capGeo(rim,inner,Pt.clone().addScaledVector(Tt,rng()*0.22-0.1),Pt,Nt,Bt,0.45));

  // long jagged spikes of split wood
  var nS=3+Math.floor(rng()*4);
  for(k=0;k<nS;k++){
    var phi=rng()*TAU,outv=Nt.clone().multiplyScalar(Math.cos(phi)).addScaledVector(Bt,Math.sin(phi));
    var side=new T3.Vector3().crossVectors(Tt,outv).normalize();
    var sb=Pt.clone().addScaledVector(outv,rT*(0.35+rng()*0.4)).addScaledVector(Tt,-0.15);
    var Ls=k===0?(H-Hb)+0.15:(H-Hb)*(0.3+rng()*0.7)+0.12;
    var sdir=Tt.clone().addScaledVector(outv,0.1+rng()*0.3).addScaledVector(side,(rng()-0.5)*0.2).normalize();
    var smid=sb.clone().addScaledVector(sdir,Ls*0.5).addScaledVector(outv,(rng()-0.3)*0.05*Ls);
    var stip=sb.clone().addScaledVector(sdir,Ls).addScaledVector(outv,(rng()-0.2)*0.12*Ls).addScaledVector(side,(rng()-0.5)*0.08*Ls);
    var SF=frames(new T3.CatmullRomCurve3([sb,smid,stip]),5),sw0=rT*(0.3+rng()*0.35);
    var sth0=Math.atan2(side.dot(SF.B[0]),side.dot(SF.N[0])),nz=[];
    for(j=0;j<36;j++)nz.push(1+(rng()-0.5)*0.3);
    var sg=sweep(SF,0,5,5,0,TAU,(function(w0,t0,nz){return function(i,th,jj){var a=w0*Math.pow(1-i/5,0.85)+0.004,b=a*0.38,c=Math.cos(th-t0),s=Math.sin(th-t0);return a*b/Math.sqrt(b*b*c*c+a*a*s*s)*nz[i*6+jj];};})(sw0,sth0,nz),1,0.5,null,true);
    wood.push(sg.toNonIndexed());sg.dispose();
  }

  // flared roots diving into the ground
  var N0=F.N[0],B0=F.B[0];
  for(k=0;k<nR;k++){
    var ra=rootA0+k*TAU/nR+(rng()-0.5)*0.35;
    var d=N0.clone().multiplyScalar(Math.cos(ra)).addScaledVector(B0,Math.sin(ra));d.y=0;d.normalize();
    var sd=V(-d.z,0,d.x),reach=R0+0.5+rng()*0.7,sw=(rng()-0.5)*0.3;
    var rc=new T3.CatmullRomCurve3([
      V(0,0.55,0).addScaledVector(d,R0*0.25),
      V(0,0.27,0).addScaledVector(d,R0*0.95),
      V(0,0.05+rng()*0.06,0).addScaledVector(d,(R0+reach)*0.5).addScaledVector(sd,sw*0.5),
      V(0,-0.3,0).addScaledVector(d,reach).addScaledVector(sd,sw)]);
    var RF=frames(rc,7);
    var rg=sweep(RF,0,7,6,0,TAU,(function(r0,ph,L){return function(i,th){var f=i/7,s=f*L;return (r0*Math.pow(1-f,1.3)+0.025)*(1+0.1*Math.sin(2*th+ph+s*3)+0.06*Math.sin(3*th-s*5+ph));};})(R0*(0.4+rng()*0.12),rng()*TAU,RF.len),1,0.7,null,true);
    bark.push(rg.toNonIndexed());rg.dispose();
  }

  // bare broken branches, each forking once
  for(k=0;k<brs.length;k++){
    var bi=brs[k].ib,bth=brs[k].th,Pb=F.P[bi];
    var outb=F.N[bi].clone().multiplyScalar(Math.cos(bth)).addScaledVector(F.B[bi],Math.sin(bth));
    var rTr=rbAt(bi),elev=0.2+rng()*0.75;
    var dir=outb.clone().multiplyScalar(Math.cos(elev)).addScaledVector(F.T[bi],Math.sin(elev)).normalize();
    var L=(0.7+rng()*1.3)*(0.55+0.45*H/8),rb0=Math.min(0.13,rTr*0.5)*(0.75+rng()*0.25);
    var b0=Pb.clone().addScaledVector(outb,rTr*0.3),bend=(rng()-0.35)*0.3*L;
    var b1=b0.clone().addScaledVector(dir,L*0.34).add(jit(0.12*L));
    var b2=b0.clone().addScaledVector(dir,L*0.68).add(jit(0.14*L));b2.y+=bend*0.5;
    var b3=b0.clone().addScaledVector(dir,L).add(jit(0.14*L));b3.y+=bend;
    var BF=frames(new T3.CatmullRomCurve3([b0,b1,b2,b3]),7),bE=[];
    for(j=0;j<6;j++)bE.push(rng()*rb0*0.9*(rng()<0.35?2.4:1));
    var bg=sweep(BF,0,7,6,0,TAU,(function(r0,ph,Lb){return function(i,th){var f=i/7,s=f*Lb;return r0*(1-0.62*f)*(1+0.08*Math.sin(2*th+ph+s*4)+0.05*Math.sin(3*th-s*6));};})(rb0,rng()*TAU,BF.len),1,0.7,(function(E){return function(i,jj){return i===7?E[jj]:0;};})(bE),true);
    bark.push(bg.toNonIndexed());
    wood.push(endCap(bg,7,6,BF,rb0*0.38,rng));
    bg.dispose();
    // fork
    var fi=3+Math.floor(rng()*2),Pf=BF.P[fi],fa=0.55+rng()*0.4,fphi=rng()*TAU;
    var perp=BF.N[fi].clone().multiplyScalar(Math.cos(fphi)).addScaledVector(BF.B[fi],Math.sin(fphi));
    var fdir=BF.T[fi].clone().multiplyScalar(Math.cos(fa)).addScaledVector(perp,Math.sin(fa));
    fdir.y+=0.15;fdir.normalize();
    var rmf=rb0*(1-0.62*fi/7),Lf=L*(0.35+rng()*0.3),rf0=rmf*0.62;
    var f0=Pf.clone().addScaledVector(fdir,-rmf*0.3);
    var f1=Pf.clone().addScaledVector(fdir,Lf*0.5).add(jit(0.12*Lf));
    var f2=Pf.clone().addScaledVector(fdir,Lf).add(jit(0.15*Lf));f2.y+=(rng()-0.4)*0.25*Lf;
    var FF=frames(new T3.CatmullRomCurve3([f0,f1,f2]),5),fE=[];
    for(j=0;j<5;j++)fE.push(rng()*rf0*1.6);
    var fg=sweep(FF,0,5,5,0,TAU,(function(r0,ph){return function(i,th){var f=i/5;return r0*(1-0.6*f)*(1+0.07*Math.sin(2*th+ph+f*5));};})(rf0,rng()*TAU),1,0.7,(function(E){return function(i,jj){return i===5?E[jj]:0;};})(fE),true);
    bark.push(fg.toNonIndexed());
    wood.push(endCap(fg,5,5,FF,rf0*0.4,rng));
    fg.dispose();
  }

  // stripped bark patch: bare wood sitting in the depressed bark area
  if(patch){
    var pi0=Math.max(1,Math.floor((patch.s-patch.hp*1.3)/ds)),pi1=Math.min(segs-1,Math.ceil((patch.s+patch.hp*1.3)/ds));
    if(pi1>pi0){
      var pw=patch.wp*1.3;
      var pg=sweep(F,pi0,pi1,6,patch.th-pw,patch.th+pw,function(i,th){var q=tParts(i,th);return q.base-depth+0.01-(1-q.m)*0.045;},2*pw*rbAt((pi0+pi1)>>1)/0.5,0.6,null,false);
      wood.push(pg.toNonIndexed());pg.dispose();
    }
  }

  var grp=new T3.Group();grp.name='deadTree';
  addMerged(grp,bark,M.bark);
  addMerged(grp,wood,M.wood);
  grp.userData.height=H;
  return grp;
};
})();
