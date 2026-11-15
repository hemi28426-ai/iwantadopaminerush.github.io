/* Trench War - WWI barbed-wire entanglement section.
   TWM.wireSection(THREE, seed) -> THREE.Group, a 2.5 m run from the origin to x=2.5, ground at y=0.
   Even seeds: corkscrew screw picket. Odd seeds: rough bark stake with staples.
   Strands end exactly on the eyelets/staples of post (seed+1), so sections placed in seed
   order join up. Geometries and materials are shared between sections: do not dispose them per section. */
(function(){
window.TWM=window.TWM||{};
var TWM=window.TWM;
var PI=Math.PI,TAU=PI*2,SPAN=2.5,NV=6,NC=5;
var HB=[0.30,0.56,0.83,1.08];
var C=null;

function mulberry32(a){return function(){a|=0;a=(a+0x6D2B79F5)|0;var t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}

function add(a,b){return[a[0]+b[0],a[1]+b[1],a[2]+b[2]];}
function sub(a,b){return[a[0]-b[0],a[1]-b[1],a[2]-b[2]];}
function mul(a,s){return[a[0]*s,a[1]*s,a[2]*s];}
function mad(a,b,s){return[a[0]+b[0]*s,a[1]+b[1]*s,a[2]+b[2]*s];}
function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
function len(a){return Math.sqrt(dot(a,a));}
function norm(a){var l=len(a);return l>1e-12?[a[0]/l,a[1]/l,a[2]/l]:[0,1,0];}
function lerp(a,b,t){return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];}
function perp(t){return norm(cross(Math.abs(t[1])<0.95?[0,1,0]:[1,0,0],t));}
function sstep(a,b,x){var t=(x-a)/(b-a);t=t<0?0:t>1?1:t;return t*t*(3-2*t);}
var NT=(function(){var r=mulberry32(90210),a=[];for(var i=0;i<256;i++)a.push(r());return a;})();
function vn(x){var i=Math.floor(x),f=x-i;f=f*f*(3-2*f);var a=NT[i&255],b=NT[(i+1)&255];return a+(b-a)*f;}
function ring(m){var a=[];for(var j=0;j<m;j++)a.push([Math.cos(TAU*j/m),Math.sin(TAU*j/m)]);return a;}
var R3=ring(3),R4=ring(4),R5=ring(5),R6=ring(6),R12=ring(12);
/* square-ish bar section: flats with chamfered corners (smooth normals give rounded edges) */
var SQ8=[[1,-0.62],[1,0.62],[0.62,1],[-0.62,1],[-1,0.62],[-1,-0.62],[-0.62,-1],[0.62,-1]];

/* rust mottling multiplier on #4a3a2c; g = mud near the ground */
function rust(f,g){var r=0.78+0.62*f,G=0.8+0.3*f,b=0.86+0.06*f;g*=0.6;return[r+(0.95-r)*g,G+(0.86-G)*g,b+(0.78-b)*g];}

/* indexed geometry builder: position, color, uv; smooth normals computed once */
function Bld(){this.p=[];this.c=[];this.u=[];this.i=[];this.n=0;}
Bld.prototype.v=function(p,c,u,w){this.p.push(p[0],p[1],p[2]);this.c.push(c[0],c[1],c[2]);this.u.push(u,w);return this.n++;};
Bld.prototype.t=function(a,b,c){this.i.push(a,b,c);};
Bld.prototype.geo=function(THREE){
  var g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(this.p,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(this.c,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(this.u,2));
  g.setIndex(this.i);g.computeVertexNormals();g.computeBoundingSphere();
  return g;
};

/* sweep a closed profile along a polyline with parallel-transport frames (+ optional twist, caps) */
function sweep(B,pts,prof,rad,tw,col,capS,capE){
  var n=pts.length,m=prof.length,i,j,T=[],N=[],Bn=[],nn,base=B.n,k;
  for(i=0;i<n;i++)T.push(norm(sub(pts[i<n-1?i+1:i],pts[i>0?i-1:i])));
  nn=perp(T[0]);
  for(i=0;i<n;i++){
    if(i>0){nn=sub(nn,mul(T[i],dot(nn,T[i])));nn=dot(nn,nn)>1e-10?norm(nn):perp(T[i]);}
    N.push(nn);Bn.push(cross(T[i],nn));
  }
  for(i=0;i<n;i++){
    var th=tw?tw(i):0,cs=Math.cos(th),sn=Math.sin(th);
    for(j=0;j<m;j++){
      var px=prof[j][0]*cs-prof[j][1]*sn,py=prof[j][0]*sn+prof[j][1]*cs,s=rad(i,j);
      B.v(add(mad(pts[i],N[i],px*s),mul(Bn[i],py*s)),col(i,j),j/m,i/(n-1));
    }
  }
  for(i=0;i<n-1;i++)for(j=0;j<m;j++){
    var a=base+i*m+j,b=base+i*m+(j+1)%m,c=base+(i+1)*m+(j+1)%m,d=base+(i+1)*m+j;
    B.t(a,b,d);B.t(b,c,d);
  }
  if(capE){k=B.v(mad(pts[n-1],T[n-1],capE),col(n-1,0),0.5,1);for(j=0;j<m;j++)B.t(base+(n-1)*m+j,base+(n-1)*m+(j+1)%m,k);}
  if(capS){k=B.v(mad(pts[0],T[0],-capS),col(0,0),0.5,0);for(j=0;j<m;j++)B.t(base+(j+1)%m,base+j,k);}
  return base;
}

/* 4-point barb: two short wires twisted round the strand, points splayed both ways */
function barb(B,P,T,r,col){
  var N=perp(T),W=cross(T,N),rot=r()*TAU,k,q;
  for(k=0;k<4;k++){
    var a=rot+k*PI/2+(r()-0.5)*0.5,tl=(k&1?1:-1)*(0.15+r()*0.4);
    var d=norm(add(add(mul(N,Math.cos(a)),mul(W,Math.sin(a))),mul(T,tl)));
    var o=mad(P,T,(k&1?1:-1)*0.0028),e1=perp(d),e2=cross(d,e1),b0=B.n,tq=r()*TAU;
    for(q=0;q<3;q++){var an=tq+q*TAU/3;B.v(add(mad(o,d,0.0015),add(mul(e1,Math.cos(an)*0.0022),mul(e2,Math.sin(an)*0.0022))),col,0,0);}
    var ti=B.v(mad(o,d,0.015+r()*0.007),col,0,1);
    B.t(b0,b0+1,ti);B.t(b0+1,b0+2,ti);B.t(b0+2,b0,ti);
  }
}
function addBarbs(B,pts,maxN,r,col){
  var L=[0],i,seg=0;for(i=1;i<pts.length;i++)L.push(L[i-1]+len(sub(pts[i],pts[i-1])));
  var tot=L[L.length-1],nb=Math.min(maxN,Math.floor((tot-0.08)/0.12));
  for(var b=0;b<nb;b++){
    var s=0.05+(b+0.5)*(tot-0.1)/nb+(r()-0.5)*0.025;
    while(seg<pts.length-2&&L[seg+1]<s)seg++;
    var f=(s-L[seg])/((L[seg+1]-L[seg])||1);
    barb(B,lerp(pts[seg],pts[seg+1],f),norm(sub(pts[seg+1],pts[seg])),r,col);
  }
}

/* post variant v: even = screw picket, odd = wooden stake. Returns geometry + 4 wire attach points */
function makePost(THREE,v){
  var r=mulberry32(1013+v*104729),B=new Bld(),pk=(v%2===0),i,j,k;
  var lx=(r()-0.5)*0.07,lz=(r()-0.5)*0.09,yt=pk?1.17+r()*0.06:1.18+r()*0.1;
  var bw=pk?0.02:0.045,bx=(r()-0.5)*bw,bz=(r()-0.5)*bw,b2x=pk?0:(r()-0.5)*0.03,b2z=pk?0:(r()-0.5)*0.03;
  var ax=function(y){var s1=Math.sin(PI*y/yt),s2=Math.sin(TAU*y/yt);return[lx*y+bx*s1+b2x*s2,y,lz*y+bz*s1+b2z*s2];};
  var axd=function(y){return norm(sub(ax(y+0.01),ax(y-0.01)));};
  var hs=[],att=[];for(k=0;k<4;k++)hs.push(HB[k]+(r()-0.5)*0.03);
  var off=r()*100;
  if(pk){
    /* corkscrew foot (top turn shows at the ground) + twisted square bar shaft */
    var rod=0.0082,pts=[],yj=0.06,yb=-0.2,rc=0.032,ps0=r()*TAU;
    for(i=0;i<=9;i++){var q=i/9,y=yb+(yj-yb)*q,ps=ps0+TAU*1.25*q,rr=rc*(1-sstep(0.7,1,q)),a=ax(y);pts.push([a[0]+Math.cos(ps)*rr,y,a[2]+Math.sin(ps)*rr]);}
    for(i=1;i<=22;i++)pts.push(ax(yj+(yt-yj)*i/22));
    var S=[0];for(i=1;i<pts.length;i++)S.push(S[i-1]+len(sub(pts[i],pts[i-1])));
    var tr=TAU/(0.62+r()*0.16),toff=r()*TAU;
    sweep(B,pts,SQ8,
      function(i){return rod*(i<9?0.6+0.4*sstep(0,0.5,i/9):1)*(1-0.12*sstep(yt-0.05,yt,pts[i][1]));},
      function(i){return toff+S[i]*tr;},
      function(i,j){return rust(vn(S[i]*7+off+j*0.35),sstep(0.18,-0.02,pts[i][1]));},
      rod*0.5,rod*0.6);
    /* pigtail eyelets bent from the bar, hole axis along X so the strands thread through */
    var sf=r()<0.5?1:-1,Re=0.024;
    for(k=0;k<4;k++){
      var h=hs[k],A=ax(h),w=axd(h),sd=(k%2?1:-1)*sf;
      var Z=norm(sub([0,0,1],mul(w,w[2]))),Cc=mad(A,Z,sd*Re*0.8),ep=[];
      for(i=0;i<=8;i++){var al=0.55+(TAU-1.1)*i/8,p=add(mad(Cc,Z,-sd*Re*Math.cos(al)),mul(w,Re*Math.sin(al)));p[0]+=-0.005+0.01*i/8;ep.push(p);}
      var ko=off+k*7.3;
      sweep(B,ep,R5,function(){return 0.0062;},null,function(i){return rust(vn(i*0.6+ko),0);},0,0);
      att.push(mad(Cc,w,-0.0105));
    }
  }else{
    /* rough stake: crooked axis, bark ridges, peeled patches, axe-cut top, broken branch stub */
    var m=12,ns=17,yb2=-0.15,R0=0.043+r()*0.011,cutA=r()*TAU,slope=0.45+r()*0.4,ell=0.05+r()*0.07,ela=r()*PI,spts=[];
    for(i=0;i<=ns;i++)spts.push(ax(yb2+(yt-yb2)*i/ns));
    var Rr=function(y){return R0*(1-0.16*Math.max(0,y)/yt);};
    var peel=function(i,j){return sstep(0.68,0.8,vn(j*0.9+spts[i][1]*2.5+off+80))*sstep(0.15,0.45,spts[i][1]);};
    var sb=sweep(B,spts,R12,
      function(i,j){var y=spts[i][1];
        return Rr(y)*(0.93+0.12*vn(j*1.15+off+y*1.2)+0.05*(vn(j*3.1+i*2.3+off*0.7)-0.5))*(1+ell*Math.cos(2*(TAU*j/m-ela)))*(1-0.05*peel(i,j));},
      null,
      function(i,j){var y=spts[i][1],f=vn(j*1.15+off+y*1.2),l=sstep(0.6,0.85,vn(j*0.6+y*4+off+40))*0.55,p=peel(i,j),md=sstep(0.15,-0.02,y);
        var c=[0.30+0.09*f,0.245+0.065*f,0.195+0.045*f];
        c=[c[0]+(0.37-c[0])*l,c[1]+(0.38-c[1])*l,c[2]+(0.32-c[2])*l];
        c=[c[0]+(0.58-c[0])*p,c[1]+(0.49-c[1])*p,c[2]+(0.36-c[2])*p];
        return[c[0]*(1-0.35*md),c[1]*(1-0.38*md),c[2]*(1-0.42*md)];},
      0,0);
    var top=spts[ns],cd=[Math.cos(cutA),Math.sin(cutA)],lb=sb+ns*m,rim=[],cc=[0,0,0];
    for(j=0;j<m;j++){var ix=(lb+j)*3;B.p[ix+1]+=slope*((B.p[ix]-top[0])*cd[0]+(B.p[ix+2]-top[2])*cd[1])+(r()-0.5)*0.005;rim.push([B.p[ix],B.p[ix+1],B.p[ix+2]]);cc=add(cc,rim[j]);}
    cc=mul(cc,1/m);cc[1]+=0.003;
    var c0=B.n;for(j=0;j<m;j++)B.v(rim[j],[0.44+r()*0.05,0.39+r()*0.04,0.32+r()*0.03],0,0);
    var ci=B.v(cc,[0.62,0.56,0.46],0.5,0.5);
    for(j=0;j<m;j++)B.t(c0+j,c0+(j+1)%m,ci);
    var gk=Math.floor(r()*3),yk=(hs[gk]+hs[gk+1])/2+(r()-0.5)*0.05,ak=r()*TAU,Ak=ax(yk),Rk=Rr(yk);
    var hd=[Math.cos(ak),0,Math.sin(ak)],dk=norm([hd[0],0.4+r()*0.35,hd[2]]),kb=mad(Ak,hd,Rk*0.5);
    sweep(B,[kb,mad(kb,dk,Rk*0.55+0.012),mad(kb,dk,Rk*0.55+0.03)],R6,function(i){return[0.017,0.0125,0.0085][i];},null,
      function(i){return i<2?[0.26,0.21,0.165]:[0.5,0.42,0.31];},0,0.004);
    /* strands lie on one face, held by iron staples */
    var ss=r()<0.5?1:-1;
    for(k=0;k<4;k++){
      var h2=hs[k],A2=ax(h2),ih=Math.round((h2-yb2)/(yt-yb2)*ns),best=0;
      for(j=0;j<m;j++){var dd=(B.p[(sb+ih*m+j)*3+2]-spts[ih][2])*ss;if(dd>best)best=dd;}
      var Rh=best*0.97,Zs=[0,0,ss],dn=[0,-0.0095,0],up=[0,0.0095,0];
      att.push(mad(A2,Zs,Rh+0.0065));
      sweep(B,[mad(add(A2,dn),Zs,Rh-0.006),mad(add(A2,dn),Zs,Rh+0.0125),mad(A2,Zs,Rh+0.016),mad(add(A2,up),Zs,Rh+0.0125),mad(add(A2,up),Zs,Rh-0.006)],
        R3,function(){return 0.0018;},null,function(){return[0.19,0.17,0.16];},0,0);
    }
  }
  return{geo:B.geo(THREE),att:att};
}

/* strands + barbs for variant v: from post v's attach points to post v+1's (shifted to x=2.5) */
function makeWire(THREE,v){
  var r=mulberry32(3001+v*7919),B=new Bld(),P0=C.att[v],P1=C.att[(v+1)%NV],k,i,q;
  var skip=r()<0.4?1+Math.floor(r()*2):-1,slack=r()<0.5;
  for(k=0;k<4;k++){
    if(k===skip)continue;
    var A=P0[k],E=add(P1[k],[SPAN,0,0]);
    var sag=0.05+r()*0.08+(k===0?0.02:0);
    if(k===0&&slack)sag=(A[1]+E[1])*0.5+0.01-r()*0.04;
    var dr=(r()-0.5)*0.09,off=r()*100,nk=1+Math.floor(r()*2),kt=[],ka=[],kd=[];
    for(q=0;q<nk;q++){kt.push(0.15+r()*0.7);ka.push(0.012+r()*0.02);var an=r()*TAU;kd.push([0,Math.cos(an),Math.sin(an)]);}
    var pts=[];
    for(i=0;i<=16;i++){
      var t=i/16,p=lerp(A,E,t),s=Math.sin(PI*t);
      p[1]+=-sag*4*t*(1-t)+s*0.028*(vn(t*6+off)-0.5);
      p[2]+=dr*s+s*0.028*(vn(t*6+off+33)-0.5);
      for(q=0;q<nk;q++)p=mad(p,kd[q],ka[q]*Math.exp(-Math.pow((t-kt[q])/0.045,2)));
      if(p[1]<-0.03)p[1]=-0.03+(p[1]+0.03)*0.3;
      pts.push(p);
    }
    var tn=[0.9+r()*0.2,0.9+r()*0.14,0.9+r()*0.1],o2=off+50;
    sweep(B,pts,R4,function(){return 0.007;},null,function(i){var f=vn(i*0.8+o2);return[tn[0]*(0.8+0.5*f),tn[1]*(0.82+0.34*f),tn[2]*(0.86+0.22*f)];},0.003,0.003);
    addBarbs(B,pts,18,r,[tn[0]*0.88,tn[1]*0.86,tn[2]*0.86]);
  }
  return B.geo(THREE);
}

/* loose, crushed concertina coil lying on the ground; both ends meet at (0|2.5, -0.02, 0) */
function makeCoil(THREE,ci){
  var r=mulberry32(7001+ci*977),B=new Bld(),NL=6,SPL=14,NS=NL*SPL,pts=[],i;
  var a1=(r()-0.5)*0.16,a2=(r()-0.5)*0.1,a3=(r()-0.5)*0.07,tl=(r()-0.5)*0.14,cr=0.78+r()*0.14,off=r()*100;
  for(i=0;i<=NS;i++){
    var u=i/NS,ph=PI+TAU*NL*u,w=1-Math.pow(1-Math.sin(PI*u),4),cy=Math.cos(ph),sz=Math.sin(ph);
    var rs=1+w*0.26*(vn(u*NL*1.7+off)-0.5);
    var yc=0.29+w*0.08*(vn(u*5+off+9)-0.5),zc=w*0.12*(vn(u*3.3+off+21)-0.5);
    var ry=0.31*rs*(cy>0?1-(1-cr)*w:1);
    var x=SPAN*u+a1*Math.sin(PI*u)+a2*Math.sin(TAU*u)+a3*Math.sin(3*PI*u)+tl*sz*w;
    var y=yc+ry*cy+w*0.024*(vn(i*0.9+off+40)-0.5),z=zc+0.36*rs*sz+w*0.024*(vn(i*0.9+off+70)-0.5);
    if(y<-0.022)y=-0.022+(y+0.022)*0.25;
    pts.push([x,y,z]);
  }
  var o2=off+3;
  sweep(B,pts,R3,function(){return 0.0062;},null,function(i){var f=vn(i*0.35+o2);return[0.82+0.5*f,0.84+0.3*f,0.88+0.12*f];},0,0);
  addBarbs(B,pts,16,r,[0.95,0.9,0.88]);
  return B.geo(THREE);
}

function init(THREE){
  C={};
  C.iron=new THREE.MeshStandardMaterial({color:0x4a3a2c,metalness:0.6,roughness:0.75,vertexColors:true});
  C.wood=new THREE.MeshStandardMaterial({color:0xffffff,metalness:0,roughness:0.93,vertexColors:true});
  C.post=[];C.att=[];C.wire=[];C.coil=[];
  var v;
  for(v=0;v<NV;v++){var pr=makePost(THREE,v);C.post.push(pr.geo);C.att.push(pr.att);}
  for(v=0;v<NV;v++)C.wire.push(makeWire(THREE,v));
  for(v=0;v<NC;v++)C.coil.push(makeCoil(THREE,v));
}

TWM.wireSection=function(THREE,seed){
  if(!C)init(THREE);
  var s=Math.abs(Math.floor(+seed||0)),v=s%NV;
  var g=new THREE.Group();g.name='wireSection';
  var post=new THREE.Mesh(C.post[v],v%2===0?C.iron:C.wood);
  post.castShadow=true;post.receiveShadow=true;g.add(post);
  var wire=new THREE.Mesh(C.wire[v],C.iron);
  wire.castShadow=false;wire.receiveShadow=true;g.add(wire);
  var coil=new THREE.Mesh(C.coil[(s*3+1)%NC],C.iron);
  coil.castShadow=false;coil.receiveShadow=true;g.add(coil);
  return g;
};
})();
