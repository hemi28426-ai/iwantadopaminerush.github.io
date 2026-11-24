/* Trench War - first-person view arm: brown leather gloved hand + WWI wool tunic sleeve.
   TWM.viewArm(THREE, {sleeve, cuff, side}) -> build(hand, elbow) -> THREE.Object3D (gun-local).
   All surfaces are sculpted ring-tubes with per-ring radius profiles + displacement and
   seam-free finite-difference normals (smooth shading, no flatShading). */
(function(){
window.TWM=window.TWM||{};
var TWM=window.TWM;
var CACHE={tex:{},mat:{},geo:{},geoKeys:[]};
var PI=Math.PI,TAU=Math.PI*2;

function rng(seed){var s=(seed>>>0)||1;return function(){s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
function clamp(x,a,b){return x<a?a:(x>b?b:x);}
function sstep(a,b,x){var t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);}
function gauss(x,s){return Math.exp(-(x*x)/(s*s));}
function band(x,a,b,e){return sstep(a-e,a+e,x)*(1-sstep(b-e,b+e,x));}

/* ---------------- procedural textures (seamless, grayscale: material colour tints them) ---------------- */
function makeCanvas(S){var c=document.createElement('canvas');c.width=c.height=S;return c;}
function wrap9(S,x,y,m,fn){for(var ox=-S;ox<=S;ox+=S)for(var oy=-S;oy<=S;oy+=S){var X=x+ox,Y=y+oy;if(X>-m&&X<S+m&&Y>-m&&Y<S+m)fn(X,Y);}}
function finishTex(THREE,c){var t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;t.needsUpdate=true;return t;}
function blotches(g,S,R,n,r0,r1,a0,a1){
  for(var i=0;i<n;i++){(function(x,y,r,dark,a){
    wrap9(S,x,y,r,function(X,Y){var gr=g.createRadialGradient(X,Y,0,X,Y,r);
      gr.addColorStop(0,dark?'rgba(30,30,30,'+a+')':'rgba(255,255,255,'+a+')');gr.addColorStop(1,'rgba(128,128,128,0)');
      g.fillStyle=gr;g.fillRect(X-r,Y-r,r*2,r*2);});
  })(R()*S,R()*S,r0+R()*(r1-r0),R()<0.55,a0+R()*(a1-a0));}
}

function leatherTex(THREE,stitched){
  var key='lea'+(stitched?1:0);if(CACHE.tex[key])return CACHE.tex[key];
  var S=256,c=makeCanvas(S),g=c.getContext('2d'),R=rng(stitched?913:377),i;
  g.fillStyle='#d7d7d7';g.fillRect(0,0,S,S);
  blotches(g,S,R,26,18,60,0.05,0.12);                       // oil / wear mottling
  for(i=0;i<5200;i++){(function(x,y,r,dark,a){             // pebble grain: pores + raised cells
    g.fillStyle=dark?'rgba(35,35,35,'+a+')':'rgba(255,255,255,'+a+')';
    wrap9(S,x,y,3,function(X,Y){g.beginPath();g.arc(X,Y,r,0,TAU);g.fill();});
  })(R()*S,R()*S,0.5+R()*1.5,R()<0.5,0.05+R()*0.12);}
  g.lineCap='round';
  for(i=0;i<80;i++){(function(x,y,len,ang,w,jit,a){         // flex creases running around fingers/palm
    g.strokeStyle='rgba(28,24,20,'+a+')';g.lineWidth=w;
    wrap9(S,x,y,len,function(X,Y){g.beginPath();g.moveTo(X,Y);
      g.quadraticCurveTo(X+Math.cos(ang)*len*0.5,Y+Math.sin(ang)*len*0.5+jit,X+Math.cos(ang)*len,Y+Math.sin(ang)*len);g.stroke();});
  })(R()*S,R()*S,10+R()*40,(R()-0.5)*0.5,0.6+R()*1.0,(R()-0.5)*5,0.10+R()*0.18);}
  if(stitched){                                             // side seams (u=.25/.75 = finger flanks)
    [0.25,0.75].forEach(function(u){var x=u*S,y;
      g.fillStyle='rgba(20,15,10,0.45)';g.fillRect(x-1.5,0,3,S);
      g.fillStyle='rgba(255,255,255,0.22)';g.fillRect(x+1.5,0,1,S);
      for(y=0;y<S;y+=8){g.fillStyle='rgba(245,235,210,0.75)';g.fillRect(x+3,y+1,1.6,5);
        g.fillStyle='rgba(20,15,10,0.35)';g.fillRect(x+4.6,y+1,0.8,5);}
    });
  }
  return (CACHE.tex[key]=finishTex(THREE,c));
}

function woolTex(THREE){
  if(CACHE.tex.wool)return CACHE.tex.wool;
  var S=256,c=makeCanvas(S),g=c.getContext('2d'),R=rng(4242),cell=4,N=S/cell,x,y,i;
  g.fillStyle='#dedede';g.fillRect(0,0,S,S);
  for(y=0;y<N;y++)for(x=0;x<N;x++){                         // 2/2 serge twill: diagonal ribs
    var over=((x+y)&3)<2,l=(over?238:200)+(R()-0.5)*22;l=l|0;
    g.fillStyle='rgb('+l+','+l+','+l+')';g.fillRect(x*cell,y*cell,cell,cell);
    g.fillStyle='rgba(0,0,0,0.11)';
    if(over)g.fillRect(x*cell,y*cell+cell-1,cell,1);else g.fillRect(x*cell+cell-1,y*cell,1,cell);
  }
  g.lineWidth=0.6;
  for(i=0;i<2800;i++){(function(fx,fy,a,len,lt,al){         // loose fibres / fuzz
    g.strokeStyle=lt?'rgba(255,255,255,'+al+')':'rgba(30,30,30,'+al+')';
    wrap9(S,fx,fy,len,function(X,Y){g.beginPath();g.moveTo(X,Y);g.lineTo(X+Math.cos(a)*len,Y+Math.sin(a)*len);g.stroke();});
  })(R()*S,R()*S,R()*TAU,2+R()*7,R()<0.5,0.05+R()*0.10);}
  blotches(g,S,R,22,20,70,0.03,0.08);                       // dye / wear unevenness
  return (CACHE.tex.wool=finishTex(THREE,c));
}

function materials(THREE,sleeve,cuff){
  var key=sleeve+'_'+cuff;if(CACHE.mat[key])return CACHE.mat[key];
  var lt=leatherTex(THREE,false),ls=leatherTex(THREE,true),wt=woolTex(THREE);
  var m={
    glove:new THREE.MeshStandardMaterial({color:0x7d5434,map:lt,bumpMap:lt,bumpScale:0.0032,roughness:0.58,metalness:0}),
    finger:new THREE.MeshStandardMaterial({color:0x7d5434,map:ls,bumpMap:ls,bumpScale:0.0032,roughness:0.58,metalness:0}),
    wool:new THREE.MeshStandardMaterial({color:sleeve,map:wt,bumpMap:wt,bumpScale:0.0028,roughness:0.96,metalness:0,side:THREE.DoubleSide}),
    band:new THREE.MeshStandardMaterial({color:cuff,map:wt,bumpMap:wt,bumpScale:0.0026,roughness:0.9,metalness:0}),
    brass:new THREE.MeshStandardMaterial({color:0xc9a050,roughness:0.34,metalness:0.6})
  };
  return (CACHE.mat[key]=m);
}

/* ---------------- sculpted ring-tube core ----------------
   rings: [{c:centre, T:unit tangent, rx:radius toward D (dorsal), ry:radius toward L (lateral),
            e:superellipse exponent, v:tex v, s:arc length, dfac:displacement scale, pole:+1 end/-1 start}]
   Frame: L = hint projected off T, D = L x T. disp(i,theta,cos,sin,ring) adds radial offset. */
function ringTube(THREE,rings,rad,Lhint,uRep,disp){
  var V=THREE.Vector3,n=rings.length,cols=rad+1,grid=new Array(n*rad);
  var L=new V(),D=new V(),prev=new V(),i,j;
  for(i=0;i<n;i++){
    var R=rings[i],T=R.T,e=R.e||1,df=(R.dfac==null?1:R.dfac);
    L.copy(Lhint);L.addScaledVector(T,-L.dot(T));
    if(L.lengthSq()<1e-12){if(i>0)L.copy(prev);else{L.set(0,1,0);L.addScaledVector(T,-T.y);if(L.lengthSq()<1e-12)L.set(1,0,0);}}
    L.normalize();prev.copy(L);
    D.crossVectors(L,T).normalize();
    for(j=0;j<rad;j++){
      var th=j/rad*TAU,cs=Math.cos(th),sn=Math.sin(th);
      var px=cs<0?-Math.pow(-cs,e):Math.pow(cs,e),py=sn<0?-Math.pow(-sn,e):Math.pow(sn,e);
      var d=disp?disp(i,th,cs,sn,R)*df:0;
      grid[i*rad+j]=new V().copy(R.c).addScaledVector(D,px*(R.rx+d)).addScaledVector(L,py*(R.ry+d));
    }
  }
  var pos=new Float32Array(n*cols*3),nor=new Float32Array(n*cols*3),uv=new Float32Array(n*cols*2);
  var a=new V(),b=new V(),nn=new V(),out=0,isPole=[];
  for(i=0;i<n;i++){
    var i0=i>0?i-1:0,i1=i<n-1?i+1:n-1,pl=rings[i].pole||0;
    for(j=0;j<=rad;j++){
      var jj=j%rad,p=grid[i*rad+jj],k=i*cols+j;
      a.subVectors(grid[i*rad+(jj+1)%rad],grid[i*rad+(jj+rad-1)%rad]);
      b.subVectors(grid[i1*rad+jj],grid[i0*rad+jj]);
      nn.crossVectors(a,b);
      if(pl||nn.lengthSq()<1e-18){nn.copy(rings[i].T);if(pl<0)nn.negate();isPole[k]=1;}
      else out+=nn.x*(p.x-rings[i].c.x)+nn.y*(p.y-rings[i].c.y)+nn.z*(p.z-rings[i].c.z);
      nn.normalize();
      pos[k*3]=p.x;pos[k*3+1]=p.y;pos[k*3+2]=p.z;
      nor[k*3]=nn.x;nor[k*3+1]=nn.y;nor[k*3+2]=nn.z;
      uv[k*2]=j/rad*uRep;uv[k*2+1]=rings[i].v||0;
    }
  }
  var idx=[];
  for(i=0;i<n-1;i++)for(j=0;j<rad;j++){
    var A=i*cols+j,B=(i+1)*cols+j,C=B+1,Dd=A+1;
    if(rings[i].pole)idx.push(Dd,C,B);
    else if(rings[i+1].pole)idx.push(A,Dd,B);
    else idx.push(A,Dd,B,Dd,C,B);
  }
  if(out<0){                                               // left-handed frame guard: flip normals + winding
    for(i=0;i<n*cols;i++)if(!isPole[i]){nor[i*3]*=-1;nor[i*3+1]*=-1;nor[i*3+2]*=-1;}
    for(i=0;i<idx.length;i+=3){var t=idx[i+1];idx[i+1]=idx[i+2];idx[i+2]=t;}
  }
  var g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  g.setAttribute('normal',new THREE.BufferAttribute(nor,3));
  g.setAttribute('uv',new THREE.BufferAttribute(uv,2));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

/* rings sampled on a curve at chosen arc lengths (dense at knuckles), prof(s,len)->[rx,ry,e] */
function ringsAt(cv,len,sl,prof,vScale){
  sl=sl.filter(function(s){return s>=0&&s<=len;}).sort(function(x,y){return x-y;});
  var keep=[];
  sl.forEach(function(s){if(!keep.length||s-keep[keep.length-1]>=0.0012)keep.push(s);});
  if(len-keep[keep.length-1]>1e-6){if(len-keep[keep.length-1]<0.0012)keep[keep.length-1]=len;else keep.push(len);}
  return keep.map(function(s){var t=s/len,p=prof(s,len);
    return {c:cv.getPointAt(t),T:cv.getTangentAt(t).normalize(),rx:p[0],ry:p[1],e:p[2]||1,v:s/vScale,s:s};});
}
function capRings(rings,k,capLen,vScale){
  var last=rings[rings.length-1];
  for(var q=1;q<=k;q++){var ph=q/k*PI/2,f=Math.cos(ph),f2=q===k?0:Math.pow(f,0.75),ds=capLen*Math.sin(ph);
    rings.push({c:last.c.clone().addScaledVector(last.T,ds),T:last.T.clone(),rx:last.rx*f2,ry:last.ry*f2,e:last.e,
      v:last.v+ds/vScale,s:last.s+ds,dfac:f2,pole:q===k?1:0});}
  return rings;
}
/* displaced ellipsoid (knuckles, button-free bumps) */
function blob(THREE,c,T,L,rT,rL,rD,rad,nr,amp,seed){
  var rings=[];
  for(var i=0;i<=nr;i++){var ph=-PI/2+i/nr*PI,f=(i===0||i===nr)?0:Math.cos(ph);
    rings.push({c:c.clone().addScaledVector(T,rT*Math.sin(ph)),T:T,rx:rD*f,ry:rL*f,e:1,v:i/nr,dfac:f,pole:i===0?-1:(i===nr?1:0)});}
  return ringTube(THREE,rings,rad,L,1,function(i,th){return amp*Math.sin(3*th+seed+i*1.7);});
}
function keyInterp(K,x){
  if(x<=K[0][0])return K[0];
  for(var i=1;i<K.length;i++)if(x<=K[i][0]){var a=K[i-1],b=K[i],t=sstep(a[0],b[0],x);
    return [x,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t,a[3]+(b[3]-a[3])*t];}
  return K[K.length-1];
}

/* ---------------- finger curl solver: bend joints until the glove grips the cylinder ---------------- */
function axisDist(p,cyl){var u=cyl.u,dx=p.x-cyl.c.x,dy=p.y-cyl.c.y,dz=p.z-cyl.c.z,t=dx*u.x+dy*u.y+dz*u.z;
  dx-=u.x*t;dy-=u.y*t;dz-=u.z*t;return Math.sqrt(dx*dx+dy*dy+dz*dz);}
function chain(p0,d0,ax,lens,fl){
  var pts=[p0.clone()],d=d0.clone(),p=p0;
  for(var k=0;k<3;k++){d.applyAxisAngle(ax,fl[k]);p=p.clone().addScaledVector(d,lens[k]);pts.push(p);}
  return pts;
}
function solveFinger(THREE,p0,d0,ax,lens,r,cyl,o){
  var best=null,bs=1e9,tmp=new THREE.Vector3(),target=cyl.R+r-0.0012+(o.loose||0),cw=o.cw==null?3:o.cw,dip=o.dip||0.62;
  for(var m=0;m<=o.mMax+1e-6;m+=0.06)for(var q=0;q<=o.pMax+1e-6;q+=0.06){
    var pts=chain(p0,d0,ax,lens,[m,q,q*dip]),pen=0,k,s,dd;
    for(k=0;k<3;k++)for(s=(k===0?0.35:0.25);s<=1.0001;s+=0.25){tmp.lerpVectors(pts[k],pts[k+1],s);dd=target-axisDist(tmp,cyl);if(dd>0)pen+=dd*dd;}
    var gt=Math.max(0,axisDist(pts[3],cyl)-target),gd=Math.max(0,axisDist(pts[2],cyl)-target-0.003);
    var sc=600*pen+cw*gt*gt+gd*gd+0.00004*(m-o.mPref)*(m-o.mPref)+0.00002*q*q;
    if(o.up){var hgt=tmp.subVectors(pts[3],cyl.c).dot(o.up)-o.upMax;if(hgt>0)sc+=5*hgt*hgt;}
    if(sc<bs){bs=sc;best=pts;}
  }
  return best;
}
function mid(a,b){return a.clone().add(b).multiplyScalar(0.5);}

/* ---------------- hand: palm/wrist/gauntlet body, curled fingers, thumb, knuckles ---------------- */
// b = position across the palm (index -> pinky), da = knuckle-line offset, r = gloved finger radius, L = phalanges
var FING=[{b:-0.0315,da:0.000,r:0.0093,L:[0.042,0.025,0.020]},
          {b:-0.0105,da:0.003,r:0.0097,L:[0.046,0.028,0.021]},
          {b: 0.0105,da:-0.001,r:0.0091,L:[0.043,0.027,0.021]},
          {b: 0.0305,da:-0.009,r:0.0081,L:[0.034,0.020,0.018]}];
var ROPT=[{loose:0.011,mMax:0.85,pMax:1.15,mPref:0.55,cw:0.6,dip:0.5},   // trigger finger
          {mMax:1.25,pMax:1.7,mPref:0.85},{mMax:1.3,pMax:1.7,mPref:0.9},{mMax:1.4,pMax:1.7,mPref:0.95}];
// body profile keyed by distance from the wrist joint: [ds, rx(dorsal-palmar), ry(width), superellipse e]
var BODY=[[-0.050,0.0335,0.0365,1.0],[-0.030,0.0285,0.0330,1.0],[-0.012,0.0222,0.0298,1.0],[0.000,0.0200,0.0292,0.95],
          [0.018,0.0168,0.0365,0.75],[0.040,0.0142,0.0418,0.6],[0.065,0.0136,0.0428,0.58],[0.090,0.0128,0.0422,0.6]];

function fingerProf(r,sJ,base){return function(s){
  var rr=r*(base-0.20*sstep(0,sJ[3],s)+0.05*gauss(s-sJ[0],0.008)+0.045*gauss(s-sJ[1],0.006)+0.03*gauss(s-sJ[2],0.005));
  return [rr*0.9,rr*1.04,0.9];};}
function fingerDisp(r,sJ){return function(i,th,cs,sn,R){
  var s=R.s,dors=cs>0?cs*cs:0,palm=cs<0?cs*cs:0;
  return r*0.13*dors*(gauss(s-sJ[1],0.0055)+0.7*gauss(s-sJ[2],0.0045))       // knuckle humps
        +r*0.07*palm*(gauss(s-(sJ[1]+sJ[2])*0.5,0.008)+gauss(s-(sJ[2]+sJ[3])*0.5,0.006)) // finger pads
        -r*0.05*palm*(gauss(s-sJ[1],0.003)+gauss(s-sJ[2],0.003));              // joint creases
};}
function digitGeo(THREE,pts,sJ,r,base,L,rad){
  var cv=new THREE.CatmullRomCurve3(pts,false,'centripetal'),len=cv.getLength(),k;
  var sc=len/sJ[3];sJ=sJ.map(function(x){return x*sc;});
  var sl=[];for(k=0;k<=8;k++)sl.push(k/8*len);
  [sJ[1],sJ[2]].forEach(function(s){sl.push(s-0.0045,s,s+0.0045);});
  var rings=capRings(ringsAt(cv,len,sl,fingerProf(r,sJ,base),0.05),3,r*0.82,0.05);
  return ringTube(THREE,rings,rad,L,1,fingerDisp(r,sJ));
}

function buildHand(THREE,hs,F,out){
  var V=THREE.Vector3,e1=F.e1,e2=F.e2,e3=F.e3,O=F.O,P=F.P,k;
  function W(a,b,c){return O.clone().addScaledVector(e1,a).addScaledVector(e2,b).addScaledVector(e3,c);}
  var Lh=e2.clone().multiplyScalar(hs),bend=e2.clone().multiplyScalar(-hs),thumbSide=-hs;
  // --- wrist + palm + glove gauntlet as one continuous sculpted body
  var Wp=F.Wp,Mp=W(P.M[0],0,P.M[1]),Kp=W(P.K[0],0,P.K[1]);
  var cv=new THREE.CatmullRomCurve3([Wp.clone().addScaledVector(F.uf,0.05),Wp,Mp,Kp],false,'centripetal');
  var len=cv.getLength(),sw=cv.getLengths(60)[20],sl=[];
  for(k=0;k<=14;k++)sl.push(k/14*len);
  sl.push(sw-0.015,sw-0.012,sw-0.0045,sw-0.0015);
  var body=ringsAt(cv,len,sl,function(s){var q=keyInterp(BODY,s-sw);return [q[1],q[2],q[3]];},0.05);
  capRings(body,3,0.0115,0.05);
  out.glove.push(ringTube(THREE,body,14,Lh,4,function(i,th,cs,sn,R){
    var ds=R.s-sw,d=0,ts=sn*thumbSide;
    if(ds<-0.014)d+=0.0011*sstep(-0.014,-0.024,ds)*(Math.sin(3*th+ds*90+0.7)+0.6*Math.sin(5*th-ds*150+2.1)); // gauntlet lumps
    d+=0.0015*band(ds,-0.0135,-0.003,0.0012);                                   // wrist strap
    if(cs>0)d+=0.0011*cs*cs*sstep(0.01,0.05,ds);                                // domed back of hand
    if(ts>0&&cs<0.4)d+=0.0032*gauss(ds-0.02,0.018)*Math.pow(ts,1.5)*(0.4-cs)/1.4; // thenar pad
    return d;}));
  // --- four curled fingers + knuckle humps
  FING.forEach(function(f,fi){
    var mcp=W(P.K[0]+f.da,f.b,P.K[1]);
    var o=hs>0?ROPT[fi]:{mMax:1.05,pMax:1.45,mPref:0.6,up:e3.clone().negate(),upMax:0.55*F.cyl.R};
    var J=solveFinger(THREE,mcp,e1,bend,f.L,f.r,F.cyl,o);
    var pts=[mcp.clone().addScaledVector(e1,-0.013),J[0],mid(J[0],J[1]),J[1],mid(J[1],J[2]),J[2],mid(J[2],J[3]),J[3]];
    var sJ=[0.013,0.013+f.L[0],0.013+f.L[0]+f.L[1],0.013+f.L[0]+f.L[1]+f.L[2]];
    out.finger.push(digitGeo(THREE,pts,sJ,f.r,1.06,Lh,8));
    out.glove.push(blob(THREE,mcp.clone().addScaledVector(e3,f.r*0.5).addScaledVector(e1,0.0015),e1,Lh,
      f.r*0.8,f.r*0.74,f.r*0.55,6,4,0.00025,fi*1.3));
  });
  // --- thumb
  var tp=P.thumb.map(function(q){return W(q[0],q[1],q[2]);});
  var td=tp[1].clone().sub(tp[0]).normalize();
  var tpts=[tp[0].clone().addScaledVector(td,-0.012),tp[0],tp[1],mid(tp[1],tp[2]),tp[2],mid(tp[2],tp[3]),tp[3]];
  var l1=tp[0].distanceTo(tp[1]),l2=tp[1].distanceTo(tp[2]),l3=tp[2].distanceTo(tp[3]);
  var Tavg=tp[3].clone().sub(tp[0]).normalize(),tL=new V().crossVectors(Tavg,P.thumbUp);
  if(tL.lengthSq()<1e-8)tL.copy(Lh);tL.normalize();
  out.finger.push(digitGeo(THREE,tpts,[0.012,0.012+l1,0.012+l1+l2,0.012+l1+l2+l3],0.0108,1.12,tL,8));
}

/* ---------------- sleeve: tapered wool tube with folds, turned-back cuff, brass button, armband ---------------- */
var CUFF=[[-0.0032,0.0338],[-0.0048,0.0392],[-0.0035,0.0452],[0.0005,0.0494],[0.012,0.0504],[0.030,0.0509],
          [0.0415,0.0510],[0.0458,0.0496],[0.0476,0.0455]];
var BTN=[[0,0.0066],[0.0011,0.0071],[0.0023,0.0059],[0.0032,0.0035],[0.0036,0]];
function buildSleeve(THREE,hs,F,elbow,out){
  var V=THREE.Vector3,uS=F.uf,S0=F.Wp.clone().addScaledVector(uS,0.026),LsE=Math.max(0.12,elbow.distanceTo(S0)),SC=0.046;
  var up=new V(0,1,0),Ls=new V().crossVectors(uS,up);if(Ls.lengthSq()<1e-6)Ls.set(1,0,0);Ls.normalize();
  var Ds=new V().crossVectors(Ls,uS).normalize(),gD=-Ds.y,gL=-Ls.y,UB0=0.56,UB1=0.68;
  function U(s){return clamp((s-SC)/(LsE-SC),0,1.3);}
  function rad(s){var u=Math.min(U(s),1);return 0.0445+0.0205*Math.pow(u,0.9)+0.0032*Math.sin(PI*Math.pow(u,0.8));}
  function folds(s,th,cs,sn){
    if(s<SC)return 0;
    var u=U(s),g=cs*gD+sn*gL,d=0;
    d+=0.0034*gauss(u-0.10,0.05)*(0.55+0.45*Math.cos(th-0.6));        // bunching above the cuff
    d+=0.0028*gauss(u-0.24,0.055)*(0.55+0.45*Math.cos(th+2.2));
    d+=0.0022*gauss(u-0.40,0.06)*(0.5+0.5*Math.cos(th-2.8));
    d+=0.0016*Math.sin(2*th+9*u+1.3)*Math.sin(PI*Math.min(u,1));       // diagonal twist folds
    d+=0.0010*Math.sin(3*th-13*u+0.4)*(0.4+0.6*u);
    if(g>0)d+=0.0030*g*g*(0.35+0.65*Math.sin(PI*Math.min(u,1)));       // wool sagging underneath
    d+=0.0022*gauss(u-0.86,0.07)*Math.sin(5*th+1.1)*Math.max(0,Math.cos(th-1.9)); // elbow creases
    return d*(1-0.75*band(u,UB0,UB1,0.01))*sstep(0,0.04,u);
  }
  function ring(s,r,v){return {c:S0.clone().addScaledVector(uS,s),T:uS,rx:r,ry:r,e:1,v:v==null?s/0.07:v,s:s};}
  function sOf(u){return SC+u*(LsE-SC);}
  var sl=[0,SC-0.004,SC],i;
  for(i=1;i<=12;i++)sl.push(sOf(Math.pow(i/12,1.4)));
  sl.push(sOf(UB0-0.012),sOf(UB0+0.006),sOf(UB1-0.006),sOf(UB1+0.012),LsE+0.045);
  sl.sort(function(a,b){return a-b;});
  var rs=[];sl.forEach(function(s){if(!rs.length||s-rs[rs.length-1].s>0.002)rs.push(ring(s,rad(s)));});
  out.wool.push(ringTube(THREE,rs,14,Ls,5,function(i,th,cs,sn,R){return folds(R.s,th,cs,sn);}));
  // turned-back cuff: rolled lip at the wrist, top edge tucked under the sleeve surface
  out.wool.push(ringTube(THREE,CUFF.map(function(q,k){return ring(q[0],q[1],k*0.07);}),14,Ls,5,
    function(i,th){return i===0?0:0.0004*Math.sin(2*th+0.8)+0.0003*Math.sin(3*th+i);}));
  // armband stripe hugging the folded wool near the elbow end
  var bu=[[UB0-0.004,-0.0009],[UB0+0.002,0.0021],[UB0+0.03,0.0026],[UB1-0.03,0.0026],[UB1-0.002,0.0021],[UB1+0.004,-0.0009]];
  out.band.push(ringTube(THREE,bu.map(function(q){var s=sOf(q[0]);return ring(s,rad(s)+q[1]);}),14,Ls,5,
    function(i,th,cs,sn,R){return folds(R.s,th,cs,sn);}));
  // brass cuff button on the outer, camera-facing side
  var ow=(hs>0?F.e3.clone():F.e1.clone().negate()).addScaledVector(up,0.9);ow.addScaledVector(uS,-ow.dot(uS));
  if(ow.lengthSq()<1e-6)ow.copy(Ds);ow.normalize();
  var bc=S0.clone().addScaledVector(uS,0.024).addScaledVector(ow,0.0509-0.0008);
  out.brass.push(ringTube(THREE,BTN.map(function(q,k){return {c:bc.clone().addScaledVector(ow,q[0]),T:ow,rx:q[1],ry:q[1],e:1,v:k/4,s:q[0],pole:k===BTN.length-1?1:0};}),10,uS,1,null));
}

/* ---------------- frames + assembly ---------------- */
function buildGeos(THREE,side,hand,elbow){
  var V=THREE.Vector3,hs=side==='left'?-1:1,F={};
  hand=new V().copy(hand);elbow=new V().copy(elbow);
  if(hs>0){   // right: fist round a pistol grip, back of hand to +X, thumb over the top
    var A=new V(0,-0.12,0.04).normalize(),G0=hand.clone().add(new V(0,-0.04,0));
    F.e1=new V(0,0,-1);F.e1.addScaledVector(A,-F.e1.dot(A)).normalize();
    F.e3=new V(1,0,0);F.e2=new V().crossVectors(F.e1,F.e3);
    F.O=G0.clone().addScaledVector(A,0.042);F.cyl={c:G0,u:A,R:0.019};
    F.P={W:[-0.070,0.025],M:[-0.030,0.031],K:[0.010,0.029],thumbUp:F.e2.clone().negate(),
         thumb:[[-0.040,-0.030,0.024],[-0.026,-0.052,0.012],[-0.008,-0.058,-0.016],[0.014,-0.050,-0.030]]};
  }else{      // left: palm up under a handguard along Z, fingers up the far side, thumb up the near side
    var sx=(elbow.x-hand.x)>0?-1:1;
    F.e1=new V(sx,0,0);F.e3=new V(0,-1,0);F.e2=new V().crossVectors(F.e3,F.e1);
    F.O=hand.clone();F.cyl={c:hand.clone(),u:new V(0,0,1),R:0.026};
    F.P={W:[-0.064,0.048],M:[-0.028,0.044],K:[0.008,0.040],thumbUp:F.e1.clone().negate(),
         thumb:[[-0.034,-0.020,0.040],[-0.042,-0.036,0.024],[-0.039,-0.052,0.000],[-0.031,-0.068,-0.016]]};
  }
  F.Wp=F.O.clone().addScaledVector(F.e1,F.P.W[0]).addScaledVector(F.e3,F.P.W[1]);
  var uf=elbow.clone().sub(F.Wp);
  if(uf.length()<0.08||uf.dot(F.e1)>0){uf=F.e1.clone().negate().add(new V(0,-0.6,0)).normalize();elbow=F.Wp.clone().addScaledVector(uf,0.26);}
  F.uf=uf.normalize();
  var out={glove:[],finger:[],wool:[],band:[],brass:[]};
  buildHand(THREE,hs,F,out);
  buildSleeve(THREE,hs,F,elbow,out);
  var U=THREE.BufferGeometryUtils,res={};
  Object.keys(out).forEach(function(k){
    var arr=out[k],m=null;
    if(arr.length>1&&U&&U.mergeBufferGeometries){try{m=U.mergeBufferGeometries(arr);}catch(e){m=null;}}
    if(m){arr.forEach(function(g){g.dispose();});res[k]=[m];}else res[k]=arr;
  });
  return res;
}

TWM.viewArm=function(THREE,opts){
  opts=opts||{};
  var sleeve=opts.sleeve!=null?opts.sleeve:0x6b5b3e,cuff=opts.cuff!=null?opts.cuff:0x8c2a22,side=opts.side==='left'?'left':'right';
  var M=materials(THREE,sleeve,cuff);
  return function build(hand,elbow){
    var key=side+'|'+[hand.x,hand.y,hand.z,elbow.x,elbow.y,elbow.z].map(function(v){return (+v).toFixed(4);}).join(',');
    var geos=CACHE.geo[key];
    if(!geos){
      geos=CACHE.geo[key]=buildGeos(THREE,side,hand,elbow);CACHE.geoKeys.push(key);
      if(CACHE.geoKeys.length>32)delete CACHE.geo[CACHE.geoKeys.shift()];
    }
    var grp=new THREE.Group();grp.name='viewArm_'+side;
    ['glove','finger','wool','band','brass'].forEach(function(k){
      geos[k].forEach(function(g){var m=new THREE.Mesh(g,M[k]);m.castShadow=false;m.receiveShadow=false;m.name='arm_'+k;grp.add(m);});
    });
    return grp;
  };
};
})();
