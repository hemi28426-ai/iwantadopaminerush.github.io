/* Trench War - ground material (seamless procedural dirt map + Sobel normal map) and merged rain puddles.
   three.js r128, global THREE. Exports: TWM.groundMaterial(THREE), TWM.puddles(THREE, api). */
(function(){
window.TWM=window.TWM||{};
var TWM=window.TWM;

function mulberry32(a){
  a=a>>>0;
  return function(){
    a=(a+0x6D2B79F5)|0;
    var t=Math.imul(a^(a>>>15),1|a);
    t=(t+Math.imul(t^(t>>>7),61|t))^t;
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}
function sstep(e0,e1,x){var t=(x-e0)/(e1-e0);t=t<0?0:(t>1?1:t);return t*t*(3-2*t);}

var N=512,M=511,NN=N*N;
var groundCache=null,alphaCache=null;

/* ------------------------------------------------------------------ ground textures */
function buildGround(THREE){
  var R=mulberry32(0x5EED7A11);
  var x,y,k,ci,cj;

  // periodic gradient noise: lattice period P cells across the 512px tile -> wraps seamlessly
  function lat(P){
    var n=P*P,gx=new Float32Array(n),gy=new Float32Array(n);
    for(var q=0;q<n;q++){var a=R()*6.283185307;gx[q]=Math.cos(a);gy[q]=Math.sin(a);}
    return {P:P,gx:gx,gy:gy,ox:R()*P,oy:R()*P,s:P/N};
  }
  function pn(L,px,py){
    px=px*L.s+L.ox;py=py*L.s+L.oy;
    var P=L.P,xi=Math.floor(px),yi=Math.floor(py),fx=px-xi,fy=py-yi;
    xi%=P;if(xi<0)xi+=P;yi%=P;if(yi<0)yi+=P;
    var x1=xi+1;if(x1>=P)x1=0;
    var y1=yi+1;if(y1>=P)y1=0;
    var gx=L.gx,gy=L.gy,r0=yi*P,r1=y1*P,a00=r0+xi,a10=r0+x1,a01=r1+xi,a11=r1+x1;
    var a=gx[a00]*fx+gy[a00]*fy,b=gx[a10]*(fx-1)+gy[a10]*fy,
        c=gx[a01]*fx+gy[a01]*(fy-1),d=gx[a11]*(fx-1)+gy[a11]*(fy-1);
    var u=fx*fx*fx*(fx*(fx*6-15)+10),v=fy*fy*fy*(fy*(fy*6-15)+10);
    var ab=a+(b-a)*u;
    return ab+(c+(d-c)*u-ab)*v;
  }
  var Lw1=lat(4),Lw2=lat(8),Lw3=lat(4),Lw4=lat(8),Ll1=lat(4),Ll2=lat(8),Lm1=lat(16),Lm2=lat(32),
      Lf1=lat(64),Lf2=lat(128),Lf3=lat(256),Lt1=lat(8),Lt2=lat(16),Lmo=lat(4),Ld1=lat(4),Ld2=lat(8),
      Lh=lat(8),Lc1=lat(32),Lc2=lat(32);

  // low-frequency fields on a 128x128 grid (wrapping), bilinearly upsampled
  var Q=128,QS=N/Q,QM=Q-1,QQ=Q*Q;
  var cLOW=new Float32Array(QQ),cDR=new Float32Array(QQ),cMO=new Float32Array(QQ),cTN=new Float32Array(QQ),cHU=new Float32Array(QQ);
  for(var qy=0;qy<Q;qy++)for(var qx=0;qx<Q;qx++){
    var X=qx*QS,Y=qy*QS,qi=qy*Q+qx;
    var WX=X+22*(pn(Lw1,X,Y)+0.5*pn(Lw2,X,Y)),WY=Y+22*(pn(Lw3,X,Y)+0.5*pn(Lw4,X,Y));
    cLOW[qi]=pn(Ll1,WX,WY)+0.55*pn(Ll2,WX,WY);
    cDR[qi]=sstep(0.10,0.30,pn(Ld1,X,Y)+0.5*pn(Ld2,X,Y));
    cMO[qi]=sstep(0.04,0.34,pn(Lmo,WX,WY));
    cTN[qi]=pn(Lt1,WX,WY)+0.5*pn(Lt2,WX,WY);
    cHU[qi]=pn(Lh,X,Y);
  }
  function up(A,px,py){
    var fx=px/QS,fy=py/QS,ix=fx|0,iy=fy|0;fx-=ix;fy-=iy;
    var ix1=(ix+1)&QM,iy1=(iy+1)&QM,r0=iy*Q,r1=iy1*Q;
    var a=A[r0+ix],b=A[r0+ix1],c=A[r1+ix],d=A[r1+ix1],ab=a+(b-a)*fx;
    return ab+(c+(d-c)*fx-ab)*fy;
  }

  var H=new Float32Array(NN),F=new Float32Array(NN),CL=new Float32Array(NN),CUT=new Float32Array(NN),DRY=new Float32Array(NN);
  var CR=new Float32Array(NN),CG=new Float32Array(NN),CB=new Float32Array(NN);

  // 1) base churned soil: warped billowy lumps + fine grain, tone / moisture / dryness
  for(y=0;y<N;y++)for(x=0;x<N;x++){
    k=y*N+x;
    var wx=x+22*(pn(Lw1,x,y)+0.5*pn(Lw2,x,y)),wy=y+22*(pn(Lw3,x,y)+0.5*pn(Lw4,x,y));
    var dr=up(cDR,x,y),mo=up(cMO,x,y)*(1-dr);
    var mid=Math.abs(pn(Lm1,wx,wy))+0.5*Math.abs(pn(Lm2,wx,wy));
    var fine=pn(Lf1,wx,wy)+0.45*pn(Lf2,x,y)+0.22*pn(Lf3,x,y);
    H[k]=9*up(cLOW,x,y)+5.5*mid*(1-0.45*dr);
    F[k]=1.7*fine*(1-0.5*dr);
    DRY[k]=dr;
    var Lum=(0.9+0.24*up(cTN,x,y))*(1-0.26*mo)*(1+0.10*dr)*(0.94+0.12*R());
    var hu=0.5+up(cHU,x,y)*1.4;hu=hu<0?0:(hu>1?1:hu);
    CR[k]=Lum*(1.0-0.04*hu+0.02*mo);
    CG[k]=Lum*(0.93+0.02*hu);
    CB[k]=Lum*(0.83+0.09*hu-0.03*mo);
  }

  // 2) desiccation cracks in dry patches: two wrapped Voronoi networks, warped so edges wander
  function vor(G){
    var n=G*G,sx=new Float32Array(n),sy=new Float32Array(n),cs=N/G;
    for(var gy=0;gy<G;gy++)for(var gx=0;gx<G;gx++){var q=gy*G+gx;sx[q]=(gx+0.1+0.8*R())*cs;sy[q]=(gy+0.1+0.8*R())*cs;}
    return {G:G,cs:cs,sx:sx,sy:sy};
  }
  function edge(V,px,py){
    px%=N;if(px<0)px+=N;py%=N;if(py<0)py+=N;
    var G=V.G,cs=V.cs,cx=Math.floor(px/cs),cy=Math.floor(py/cs);if(cx>=G)cx=G-1;if(cy>=G)cy=G-1;
    var d1=1e9,d2=1e9,ax=0,ay=0,bx=0,by=0;
    for(var oy=-1;oy<=1;oy++){
      var gy=cy+oy,wy=0;if(gy<0){gy+=G;wy=-N;}else if(gy>=G){gy-=G;wy=N;}
      for(var ox=-1;ox<=1;ox++){
        var gx=cx+ox,wx=0;if(gx<0){gx+=G;wx=-N;}else if(gx>=G){gx-=G;wx=N;}
        var q=gy*G+gx,sx=V.sx[q]+wx,sy=V.sy[q]+wy,ddx=sx-px,ddy=sy-py,dd=ddx*ddx+ddy*ddy;
        if(dd<d1){d2=d1;bx=ax;by=ay;d1=dd;ax=sx;ay=sy;}else if(dd<d2){d2=dd;bx=sx;by=sy;}
      }
    }
    var ex=bx-ax,ey=by-ay,el=Math.sqrt(ex*ex+ey*ey)||1;
    return (d2-d1)/(2*el); // distance to the cell border
  }
  var VA=vor(14),VB=vor(33);
  for(k=0;k<NN;k++){
    var dd0=DRY[k];if(dd0<0.02)continue;
    x=k&M;y=k>>9;
    var px=x+3.4*pn(Lc1,x,y),py=y+3.4*pn(Lc2,x,y);
    var e1=edge(VA,px,py),e2=edge(VB,px+7.3,py-4.1);
    var w1=0.45+1.5*dd0,w2=0.3+0.7*dd0;
    var c1=e1<w1?1-e1/w1:0;
    var c2=e2<w2?(1-e2/w2)*0.65*sstep(0.35,0.8,dd0):0;
    var cc=c1>c2?c1:c2;
    H[k]+=0.8*dd0*sstep(5,0,e1)-3.2*dd0*cc;   // curled plate edges, V-shaped crack
    var dk=1-0.6*dd0*cc;CR[k]*=dk;CG[k]*=dk;CB[k]*=dk;
  }

  // 3) hobnailed boot prints pressed into the soft mud
  function soleE(lx,ly){
    var a=(lx-8)/16,b=ly/8.5,e=Math.sqrt(a*a+b*b),e2;
    a=(lx+6)/10;b=(ly-0.6)/5.6;e2=Math.sqrt(a*a+b*b);if(e2<e)e=e2;
    a=(lx+17)/7.2;b=ly/6.6;e2=Math.sqrt(a*a+b*b);
    return e2<e?e2:e;
  }
  function cut(px,py,r,dp){
    var x0=Math.floor(px-r),x1=Math.ceil(px+r),y0=Math.floor(py-r),y1=Math.ceil(py+r),rr=r*r;
    for(var yy=y0;yy<=y1;yy++)for(var xx=x0;xx<=x1;xx++){
      var ddx=xx-px,ddy=yy-py,q=(ddx*ddx+ddy*ddy)/rr;if(q>=1)continue;
      var v=dp*(1-q),kk=(yy&M)*N+(xx&M);if(v>CUT[kk])CUT[kk]=v;
    }
  }
  var nails=[],tt;
  for(tt=0;tt<6.28;tt+=0.37)nails.push([8+12.8*Math.cos(tt),6.8*Math.sin(tt)]);
  for(var lx0=-1;lx0<=17;lx0+=4.3)for(var ly0=-3.3;ly0<=3.4;ly0+=3.3){var na=(lx0-8)/10.3,nb=ly0/5.5;if(na*na+nb*nb<1)nails.push([lx0,ly0]);}
  nails.push([-17,-2.3],[-17,2.3],[-14.2,0],[-19.8,0]);
  function bootPrint(cx,cy,ang,mir,q,hq){
    var ca=Math.cos(ang),sa=Math.sin(ang),RR=30,dx,dy,lx,ly,e,kk,sum=0,cnt=0,n,t2;
    for(dy=-RR;dy<=RR;dy+=3)for(dx=-RR;dx<=RR;dx+=3){
      lx=dx*ca+dy*sa;ly=(dy*ca-dx*sa)*mir;
      if(soleE(lx,ly)<1){sum+=H[((cy+dy)&M)*N+((cx+dx)&M)];cnt++;}
    }
    var fl=(cnt?sum/cnt:0)-(1.6+2.2*q);
    for(dy=-RR;dy<=RR;dy++)for(dx=-RR;dx<=RR;dx++){
      lx=dx*ca+dy*sa;ly=(dy*ca-dx*sa)*mir;e=soleE(lx,ly);if(e>1.5)continue;
      kk=((cy+dy)&M)*N+((cx+dx)&M);
      var wq=lx<-10?hq:1,a=sstep(1.05,0.84,e)*q*wq,nh=H[kk]+(fl-H[kk])*a;
      if(nh<H[kk])H[kk]=nh;
      F[kk]*=1-0.75*a;                                   // compressed, smoother mud
      var rm=e-1.13;H[kk]+=1.0*q*wq*Math.exp(-rm*rm/0.014); // squeezed-up rim
      var pdk=1-0.15*a;CR[kk]*=pdk;CG[kk]*=pdk;CB[kk]*=pdk*0.985;
    }
    for(n=0;n<nails.length;n++){
      lx=nails[n][0];ly=nails[n][1]*mir;var w=(lx<-10?hq:1)*q;if(w<0.3)continue;
      cut(cx+lx*ca-ly*sa,cy+lx*sa+ly*ca,1.2,1.0*w);
    }
    if(hq*q>0.3)for(t2=1.5708;t2<=4.7124;t2+=0.08){ // heel iron
      lx=-17+6.0*Math.cos(t2);ly=5.7*Math.sin(t2)*mir;
      cut(cx+lx*ca-ly*sa,cy+lx*sa+ly*ca,0.95,0.7*q*hq);
    }
  }
  for(var pi=0,tries=0;pi<6&&tries<80;tries++){
    var bx=(R()*N)|0,by=(R()*N)|0;if(DRY[by*N+bx]>0.25)continue;
    bootPrint(bx,by,R()*6.2832,R()<0.5?1:-1,0.45+0.55*R(),R()<0.3?0.25:0.6+0.4*R());pi++;
  }

  // 4) clods: rounded irregular lumps, clustered (churned ground), fewer on dry crust
  function clod(cx,cy,r,h,tone){
    var p1=R()*6.2832,p2=R()*6.2832,a1=0.1+0.16*R(),a2=0.05+0.1*R(),RR=Math.ceil(r*1.3)+1,dx,dy;
    for(dy=-RR;dy<=RR;dy++)for(dx=-RR;dx<=RR;dx++){
      var th=Math.atan2(dy,dx),rr=r*(1+a1*Math.sin(3*th+p1)+a2*Math.sin(5*th+p2)),q=Math.sqrt(dx*dx+dy*dy)/rr;
      if(q>=1)continue;
      var kk=((cy+dy)&M)*N+((cx+dx)&M),b=h*Math.pow(1-q*q,0.7);
      if(b>CL[kk])CL[kk]=b;
      var f=1+(tone-1)*sstep(1,0.55,q);CR[kk]*=f;CG[kk]*=f;CB[kk]*=f;
    }
  }
  for(ci=0;ci<28;ci++){
    var gx0=R()*N,gy0=R()*N,nc=8+((R()*22)|0);
    for(cj=0;cj<nc;cj++){
      var an=R()*6.2832,ds=Math.pow(R(),0.6)*28,qx2=((gx0+Math.cos(an)*ds)|0)&M,qy2=((gy0+Math.sin(an)*ds)|0)&M;
      if(R()<DRY[qy2*N+qx2])continue;
      var cr=2+R()*R()*7.5;clod(qx2,qy2,cr,cr*(0.45+0.45*R()),0.84+0.26*R());
    }
  }
  for(ci=0;ci<300;ci++){
    var qx3=(R()*N)|0,qy3=(R()*N)|0;if(R()<DRY[qy3*N+qx3]*0.8)continue;
    var cr3=1.4+R()*3;clod(qx3,qy3,cr3,cr3*(0.4+0.4*R()),0.88+0.22*R());
  }

  // 5) pebbles: flint, dark flint, ochre sandstone, chalk lumps, brown stone
  var PC=[[0.64,0.65,0.68],[0.64,0.65,0.68],[0.45,0.45,0.47],[0.98,0.84,0.62],[1.12,1.1,1.04],[1.12,1.1,1.04],[0.8,0.72,0.62],[0.9,0.88,0.84]];
  function pebble(cx,cy,r){
    var ar=0.55+0.45*R(),an2=R()*3.1416,ca=Math.cos(an2),sa=Math.sin(an2),col=PC[(R()*PC.length)|0],
        hg=r*(0.55+0.3*R())+0.5,RR=Math.ceil(r)+1,sh=0.9+0.2*R(),dx,dy;
    for(dy=-RR;dy<=RR;dy++)for(dx=-RR;dx<=RR;dx++){
      var lx=(dx*ca+dy*sa)/r,ly=(dy*ca-dx*sa)/(r*ar),q=lx*lx+ly*ly;if(q>=1)continue;
      var kk=((cy+dy)&M)*N+((cx+dx)&M),b=hg*Math.sqrt(1-q);
      if(b>CL[kk])CL[kk]=b;
      var al=sstep(1,0.6,Math.sqrt(q)),g=sh*(0.92+0.16*R());
      CR[kk]+=(col[0]*g-CR[kk])*al;CG[kk]+=(col[1]*g-CG[kk])*al;CB[kk]+=(col[2]*g-CB[kk])*al;
    }
  }
  for(ci=0;ci<380;ci++)pebble((R()*N)|0,(R()*N)|0,1.0+R()*R()*3.4);

  // 6) dry grass blades / straw
  var SC=[[1.2,1.06,0.7],[1.1,1.02,0.76],[0.84,0.72,0.5],[0.9,0.9,0.58],[1.15,1.0,0.66]];
  function blade(x0,y0,len,ang,w,col,hb){
    var cur=(R()-0.5)*0.07,bxp=x0,byp=y0,s,xx,yy;
    for(s=0;s<len;s+=0.5){
      ang+=cur;bxp+=Math.cos(ang)*0.5;byp+=Math.sin(ang)*0.5;
      var ww=w*(1-0.55*s/len),sh=0.82+0.3*(s/len),
          xa=Math.floor(bxp-ww-1),xb=Math.ceil(bxp+ww+1),ya=Math.floor(byp-ww-1),yb=Math.ceil(byp+ww+1);
      for(yy=ya;yy<=yb;yy++)for(xx=xa;xx<=xb;xx++){
        var ex=xx-bxp,ey=yy-byp,a=ww+0.5-Math.sqrt(ex*ex+ey*ey);if(a<=0)continue;if(a>1)a=1;
        var kk=(yy&M)*N+(xx&M);
        CR[kk]+=(col[0]*sh-CR[kk])*a;CG[kk]+=(col[1]*sh-CG[kk])*a;CB[kk]+=(col[2]*sh-CB[kk])*a;
        var hh=hb*a;if(hh>CL[kk])CL[kk]=hh;
      }
    }
  }
  for(ci=0;ci<240;ci++)blade(R()*N,R()*N,5+R()*R()*20,R()*6.2832,0.35+0.5*R(),SC[(R()*SC.length)|0],0.9+0.8*R());

  // 7) specks: straw bits and charcoal / organic dark bits
  for(ci=0;ci<700;ci++){
    var sx2=(R()*N)|0,sy2=(R()*N)|0,k2=sy2*N+sx2,col2,al2;
    if(ci<380){col2=SC[(R()*SC.length)|0];al2=0.55+0.4*R();}
    else{var dv=0.32+0.15*R();col2=[dv,dv*0.96,dv*0.9];al2=0.5+0.4*R();}
    CR[k2]+=(col2[0]-CR[k2])*al2;CG[k2]+=(col2[1]-CG[k2])*al2;CB[k2]+=(col2[2]-CB[k2])*al2;
    if(R()<0.4){var k3=sy2*N+((sx2+1)&M),a3=al2*0.6;CR[k3]+=(col2[0]-CR[k3])*a3;CG[k3]+=(col2[1]-CG[k3])*a3;CB[k3]+=(col2[2]-CB[k3])*a3;}
  }

  // final height + cavity occlusion baked into the albedo
  var HF=new Float32Array(NN);
  for(k=0;k<NN;k++)HF[k]=H[k]+F[k]+CL[k]-CUT[k];
  function blur(src,r){
    var tmp=new Float32Array(NN),out=new Float32Array(NN),inv=1/(2*r+1),bx2,by2,s,j,row;
    for(by2=0;by2<N;by2++){
      row=by2*N;s=0;for(j=-r;j<=r;j++)s+=src[row+(j&M)];
      for(bx2=0;bx2<N;bx2++){tmp[row+bx2]=s*inv;s+=src[row+((bx2+r+1)&M)]-src[row+((bx2-r)&M)];}
    }
    for(bx2=0;bx2<N;bx2++){
      s=0;for(j=-r;j<=r;j++)s+=tmp[(j&M)*N+bx2];
      for(by2=0;by2<N;by2++){out[by2*N+bx2]=s*inv;s+=tmp[((by2+r+1)&M)*N+bx2]-tmp[((by2-r)&M)*N+bx2];}
    }
    return out;
  }
  var B1=blur(blur(HF,2),2),B2=blur(blur(HF,9),9);
  for(k=0;k<NN;k++){
    var ao=1+0.085*(HF[k]-B1[k])+0.03*(HF[k]-B2[k]);ao=ao<0.5?0.5:(ao>1.18?1.18:ao);
    CR[k]*=ao;CG[k]*=ao;CB[k]*=ao;
  }

  // normalise so the average colour is a light neutral (#d8d0c0) - vertex colours carry the tint
  var TR=216/255,TG=208/255,TB=192/255;
  for(var it=0;it<4;it++){
    var sr=0,sg=0,sb=0;
    for(k=0;k<NN;k++){sr+=CR[k];sg+=CG[k];sb+=CB[k];}
    var fr=TR*NN/sr,fg=TG*NN/sg,fb=TB*NN/sb;
    for(k=0;k<NN;k++){var vv=CR[k]*fr;CR[k]=vv>1?1:vv;vv=CG[k]*fg;CG[k]=vv>1?1:vv;vv=CB[k]*fb;CB[k]=vv>1?1:vv;}
  }

  function canvas(){var c=document.createElement('canvas');c.width=c.height=N;return c;}
  var cA=canvas(),xa=cA.getContext('2d'),ia=xa.createImageData(N,N),da=ia.data;
  for(k=0;k<NN;k++){var o=k<<2;da[o]=CR[k]*255+0.5|0;da[o+1]=CG[k]*255+0.5|0;da[o+2]=CB[k]*255+0.5|0;da[o+3]=255;}
  xa.putImageData(ia,0,0);

  // tangent-space normal map, Sobel on the (wrapping) height field; flat = (128,128,255)
  var cN=canvas(),xn=cN.getContext('2d'),inn=xn.createImageData(N,N),dn=inn.data,S=0.125;
  for(y=0;y<N;y++){
    var ym=((y-1)&M)*N,y0=y*N,yp=((y+1)&M)*N;
    for(x=0;x<N;x++){
      var xm=(x-1)&M,xp=(x+1)&M;
      var tl=HF[ym+xm],tc=HF[ym+x],tr=HF[ym+xp],ml=HF[y0+xm],mr=HF[y0+xp],bl=HF[yp+xm],bc=HF[yp+x],br=HF[yp+xp];
      var sgx=(tr+2*mr+br)-(tl+2*ml+bl),sgy=(bl+2*bc+br)-(tl+2*tc+tr);
      var nx=-sgx*S,ny=sgy*S,il=1/Math.sqrt(nx*nx+ny*ny+1),o2=(y0+x)<<2; // canvas y is down, texture v is up (flipY)
      dn[o2]=(nx*il*0.5+0.5)*255+0.5|0;dn[o2+1]=(ny*il*0.5+0.5)*255+0.5|0;dn[o2+2]=(il*0.5+0.5)*255+0.5|0;dn[o2+3]=255;
    }
  }
  xn.putImageData(inn,0,0);

  function tex(c){
    var tx=new THREE.CanvasTexture(c);
    tx.wrapS=tx.wrapT=THREE.RepeatWrapping;
    tx.anisotropy=8;
    tx.generateMipmaps=true;
    tx.minFilter=(THREE.LinearMipmapLinearFilter!==undefined)?THREE.LinearMipmapLinearFilter:THREE.LinearMipMapLinearFilter;
    tx.magFilter=THREE.LinearFilter;
    tx.needsUpdate=true;
    return tx;
  }
  return {map:tex(cA),normalMap:tex(cN)};
}

TWM.groundMaterial=function(THREE){
  if(!groundCache||groundCache.T!==THREE){var g=buildGround(THREE);g.T=THREE;groundCache=g;}
  return new THREE.MeshStandardMaterial({
    vertexColors:true,map:groundCache.map,normalMap:groundCache.normalMap,
    normalScale:new THREE.Vector2(1.2,1.2),roughness:0.95,metalness:0
  });
};

/* ------------------------------------------------------------------ puddles */
function puddleAlpha(THREE){
  if(alphaCache&&alphaCache.T===THREE)return alphaCache.tex;
  var S=128,c=document.createElement('canvas');c.width=c.height=S;
  var ctx=c.getContext('2d'),im=ctx.createImageData(S,S),d=im.data,Rn=mulberry32(0xA17A),p1=Rn()*6.2832,p2=Rn()*6.2832;
  for(var y=0;y<S;y++)for(var x=0;x<S;x++){
    var u=(x+0.5)/S-0.5,v=(y+0.5)/S-0.5,r=Math.sqrt(u*u+v*v)*2,th=Math.atan2(v,u);
    var e=0.97+0.025*Math.sin(9*th+p1)+0.02*Math.sin(14*th+p2);
    var a=sstep(e,e-0.4,r)*0.82+0.18*sstep(e,e-0.08,r); // soft wet shoreline
    var o=(y*S+x)*4,g=a*255+0.5|0;d[o]=g;d[o+1]=g;d[o+2]=g;d[o+3]=255;
  }
  ctx.putImageData(im,0,0);
  var t=new THREE.CanvasTexture(c);t.needsUpdate=true;
  alphaCache={T:THREE,tex:t};
  return t;
}

TWM.puddles=function(THREE,api){
  var grp=new THREE.Group();grp.name='puddles';
  if(!api||!api.C||!api.GB)return grp;
  var W=api.W|0,D=api.D|0,X0=+api.X0||0,Z0=+api.Z0||0,C=api.C,GB=api.GB;
  if(!W||!D)return grp;
  var seed=0x2545F491;
  if(typeof api.rnd==='function')seed=(api.rnd()*4294967296)>>>0;
  var R=mulberry32(seed^0x51ED270B);
  function kd(i,j){return(i<0||j<0||i>=W||j>=D)?-1:C[j*W+i];}
  function inT(i,j){var c=kd(i,j);return c===1||c===2;}
  function cellAt(x,z){
    if(typeof api.cell==='function')return api.cell(x,z);
    var i=Math.floor(x-X0),j=Math.floor(z-Z0);return(i<0||j<0||i>=W||j>=D)?-1:j*W+i;
  }

  // candidates
  var tc=[],cc=[],i,j,k;
  for(j=0;j<D;j++)for(i=0;i<W;i++){
    k=j*W+i;var c=C[k];
    if(c===1){
      if(inT(i-1,j)&&inT(i+1,j)&&inT(i,j-1)&&inT(i,j+1)){
        var full=inT(i-1,j-1)&&inT(i+1,j-1)&&inT(i-1,j+1)&&inT(i+1,j+1);
        tc.push([i,j,full?0.9:0.6]);
      }
    }else if(c===4){
      var g=GB[k],ok=true,hi=false,all4=true;
      for(var dj=-1;dj<=1&&ok;dj++)for(var di=-1;di<=1;di++){
        if(!di&&!dj)continue;
        var ii=i+di,jj=j+dj;
        if(ii<0||jj<0||ii>=W||jj>=D){ok=false;break;}
        var kk=jj*W+ii,n=GB[kk];
        if(n<g-1e-4){ok=false;break;}
        if(n>g+0.01)hi=true;
        if(C[kk]!==4)all4=false;
      }
      if(ok&&(hi||all4))cc.push([i,j]);
    }
  }
  function shuf(a){for(var q=a.length-1;q>0;q--){var s=(R()*(q+1))|0,t=a[q];a[q]=a[s];a[s]=t;}}
  shuf(tc);shuf(cc);

  var placed=[],parts=[],ti=0,ci=0,TARGET=120,tCount=0;
  function free(x,z,r){
    for(var q=0;q<placed.length;q++){var p=placed[q],dx=p.x-x,dz=p.z-z,m=p.e+r+0.35;if(dx*dx+dz*dz<m*m)return false;}
    return true;
  }
  function tryTrench(){
    while(ti<tc.length){
      var t=tc[ti++],a=t[0],b=t[1],rmax=t[2];
      var r=0.32+R()*(rmax-0.32),jit=Math.min(0.2,rmax-r);
      var x=X0+a+0.5+(R()*2-1)*jit,z=Z0+b+0.5+(R()*2-1)*jit;
      var lx=0,lz=0;
      for(var s=1;s<=3;s++){if(inT(a-s,b))lx++;if(inT(a+s,b))lx++;if(inT(a,b-s))lz++;if(inT(a,b+s))lz++;}
      var ax=lx>=lz,st=(ax?(inT(a-2,b)&&inT(a+2,b)):(inT(a,b-2)&&inT(a,b+2)))?1.25:1.0;
      var sx=ax?st:0.8,sz=ax?0.8:st,e=(r+jit)*Math.max(sx,sz);
      if(!free(x,z,e))continue;
      placed.push({x:x,z:z,e:e});
      parts.push({x:x,y:0.02,z:z,r:r,sx:sx,sz:sz,rot:(R()-0.5)*0.25,lo:0.68});
      return true;
    }
    return false;
  }
  function craterOK(x,z,r,y,g0){
    var c0=cellAt(x,z);if(c0<0||(C[c0]!==4&&GB[c0]<y+0.08))return false;
    for(var a=0;a<16;a++){
      var th=a*0.3927,cs=Math.cos(th),sn=Math.sin(th);
      for(var f=0.5;f<=1.001;f+=0.5){
        var c=cellAt(x+cs*r*f,z+sn*r*f);if(c<0)return false;
        var gb=GB[c];
        if(C[c]===4){if(gb<g0-0.06)return false;}else if(gb<y+0.08)return false;
      }
    }
    return true;
  }
  function tryCrater(){
    while(ci<cc.length){
      var t=cc[ci++],i0=t[0],j0=t[1],g0=GB[j0*W+i0],y=g0+0.03;
      var x=X0+i0+0.5+(R()-0.5)*0.4,z=Z0+j0+0.5+(R()-0.5)*0.4;
      var r=0.5+R()*1.1,sx=0.85+0.3*R(),sz=1.0;
      while(r>=0.5&&!craterOK(x,z,r*Math.max(sx,sz),y,g0))r-=0.15;
      if(r<0.5)continue;
      var e=r*Math.max(sx,sz);
      if(!free(x,z,e))continue;
      placed.push({x:x,z:z,e:e});
      parts.push({x:x,y:y,z:z,r:r,sx:sx,sz:sz,rot:R()*6.2832,lo:0.6});
      return true;
    }
    return false;
  }
  while(parts.length<TARGET){
    var did=false;
    if(tCount<72&&tryTrench()){tCount++;did=true;}
    if(parts.length<TARGET&&tryCrater())did=true;
    if(!did){if(tryTrench()){tCount++;continue;}break;}
  }
  if(!parts.length)return grp;

  // build each puddle from a noisy CircleGeometry and merge everything into one mesh
  var pos=[],nor=[],uvs=[],col=[],idx=[],base=0;
  for(var pi=0;pi<parts.length;pi++){
    var p=parts[pi],geo=new THREE.CircleGeometry(1,32),P=geo.attributes.position,cnt=P.count,v,m;
    var ph=[],am=[];
    for(m=1;m<=6;m++){ph.push(R()*6.2832);am.push((m===1?0.4:1)*(0.4+R())/Math.pow(m,0.85));}
    var vals=[],mx=1e-6;
    for(v=1;v<cnt;v++){
      var th=Math.atan2(P.getY(v),P.getX(v)),sum=0;
      for(m=0;m<6;m++)sum+=am[m]*Math.sin((m+1)*th+ph[m]);
      vals[v]=sum;if(sum>mx)mx=sum;if(-sum>mx)mx=-sum;
    }
    for(v=1;v<cnt;v++){var fk=p.lo+(1-p.lo)*(vals[v]/mx+1)*0.5;P.setXY(v,P.getX(v)*fk,P.getY(v)*fk);}
    geo.rotateX(-Math.PI/2);
    geo.scale(p.r*p.sx,1,p.r*p.sz);
    geo.rotateY(p.rot);
    geo.translate(p.x,p.y,p.z);
    var pa=geo.attributes.position.array,ua=geo.attributes.uv.array,ixa=geo.index.array;
    for(v=0;v<cnt;v++){
      pos.push(pa[v*3],pa[v*3+1],pa[v*3+2]);nor.push(0,1,0);uvs.push(ua[v*2],ua[v*2+1]);
      if(v===0)col.push(0.8,0.8,0.82);else col.push(1.16,1.1,0.98); // deeper centre, muddy rim
    }
    for(v=0;v<ixa.length;v++)idx.push(ixa[v]+base);
    base+=cnt;
    geo.dispose();
  }
  var bg=new THREE.BufferGeometry();
  bg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  bg.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));
  bg.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  bg.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  bg.setIndex(idx);
  bg.computeBoundingBox();bg.computeBoundingSphere();
  var mat=new THREE.MeshStandardMaterial({
    color:0x3a352c,roughness:0.12,metalness:0.5,transparent:true,opacity:0.88,depthWrite:false,
    polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4,vertexColors:true,alphaMap:puddleAlpha(THREE)
  });
  var mesh=new THREE.Mesh(bg,mat);
  mesh.name='puddlesMesh';mesh.receiveShadow=true;mesh.castShadow=false;mesh.renderOrder=-1;
  grp.add(mesh);
  grp.userData.count=parts.length;
  return grp;
};
})();
