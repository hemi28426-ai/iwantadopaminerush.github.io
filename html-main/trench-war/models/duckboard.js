// Trench War - WWI trench duckboard section (1 m x 1 m cell, base y=0, top ~0.07).
// TWM.duckboard(THREE) -> {geometry, material} (cached, same objects every call).
(function(){
window.TWM=window.TWM||{};
var CACHE=null,BANDS=10,RX=0.21,CRACK=4;

function mulberry32(a){return function(){a|=0;a=(a+0x6D2B79F5)|0;var t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}
function hash(x,y,s){var h=(Math.imul(x,374761393)+Math.imul(y,668265263)+Math.imul(s,1442695041))|0;h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;h=Math.imul(h^(h>>>15),0x2c1b3c6d);h^=h>>>12;return(h>>>0)/4294967296;}
// value noise, optionally periodic in x (period p) so texture bands tile along u
function vn(x,y,s,p){var ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,ix1=ix+1;if(p){ix=((ix%p)+p)%p;ix1=((ix1%p)+p)%p;}fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);var a=hash(ix,iy,s),b=hash(ix1,iy,s),c=hash(ix,iy+1,s),d=hash(ix1,iy+1,s);return a+(b-a)*fx+(c-a)*fy+(a-b-c+d)*fx*fy;}
function fbm(x,y,s,p,o){var v=0,a=0.5,n=0;for(var i=0;i<o;i++){v+=a*vn(x,y,s+i*17,p);n+=a;x*=2;y*=2;p*=2;a*=0.5;}return v/n;}
function ss(a,b,x){var t=(x-a)/(b-a);t=t<0?0:t>1?1:t;return t*t*(3-2*t);}
function mix(a,b,t){return a+(b-a)*t;}

// ---------------------------------------------------------------- geometry
function buildGeo(THREE){
  var R=mulberry32(1916070);
  function rr(a,b){return a+(b-a)*R();}
  var P=[],UV=[],IX=[],spots={};
  function vt(x,y,z,u,v){P.push(x,y,z);UV.push(u,v);return P.length/3-1;}
  // triangle wound so its face normal points along (ox,oy,oz)
  function tri(a,b,c,ox,oy,oz){
    var a3=a*3,b3=b*3,c3=c*3,
      ux=P[b3]-P[a3],uy=P[b3+1]-P[a3+1],uz=P[b3+2]-P[a3+2],
      wx=P[c3]-P[a3],wy=P[c3+1]-P[a3+1],wz=P[c3+2]-P[a3+2];
    var nx=uy*wz-uz*wy,ny=uz*wx-ux*wz,nz=ux*wy-uy*wx;
    if(nx*ox+ny*oy+nz*oz<0)IX.push(a,c,b);else IX.push(a,b,c);
  }
  // profile: 0 bottom-back, 1-2 worn back edge, 3-4 worn front edge, 5 bottom-front, 6/7 = bottom face copies
  var TK=[0,0.08,0.14,0.76,0.82,0.9,0.9,1],SEG=[[0,1],[1,2],[2,3],[3,4],[4,5],[6,7]];
  function V(band,t){return(band+0.04+0.92*t)/BANDS;}
  // lofted plank: stations along X (slats) or Z (runners), warped/twisted/worn cross-sections
  function beam(st,alongX,band,jit){
    var n=st.length,L=[],i,k;
    for(i=0;i<n;i++){
      var s=st[i],T=s.T,j=s.j===0?0:jit,cs=Math.cos(s.tw),sn=Math.sin(s.tw);
      var pts=[[-s.wb,0],[-s.wb,T-s.rb],[-s.wb+s.rb,T],[s.wf-s.rf,T],[s.wf,T-s.rf],[s.wf,0]],ring=[],idx=[];
      for(k=0;k<6;k++){
        var l=pts[k][0],h=pts[k][1];
        if(j&&k>0&&k<5){l+=(R()-0.5)*j;h+=(R()-0.5)*j*0.7;}
        var dh=h-T/2,l2=l*cs-dh*sn,h2=l*sn+dh*cs+T/2,y=s.yb+h2,la=s.c+l2;
        ring.push(alongX?[s.a,y,la]:[la,y,s.a]);
      }
      for(k=0;k<8;k++){var q=ring[k===6?5:k===7?0:k];idx.push(vt(q[0],q[1],q[2],s.u,V(band,TK[k])));}
      L.push({idx:idx,ring:ring,cy:s.yb+T/2,cl:s.c});
    }
    for(i=0;i<n-1;i++){
      var A0=L[i],B0=L[i+1],cy=(A0.cy+B0.cy)/2,cl=(A0.cl+B0.cl)/2;
      for(k=0;k<6;k++){
        var k0=SEG[k][0],k1=SEG[k][1],a=A0.idx[k0],b=B0.idx[k0],c=B0.idx[k1],d=A0.idx[k1];
        var my=(P[a*3+1]+P[c*3+1])/2-cy,ml=alongX?(P[a*3+2]+P[c*3+2])/2-cl:(P[a*3]+P[c*3])/2-cl;
        if(alongX){tri(a,b,c,0,my,ml);tri(a,c,d,0,my,ml);}else{tri(a,b,c,ml,my,0);tri(a,c,d,ml,my,0);}
      }
    }
    for(var e=0;e<2;e++){ // sawn end caps
      var S=L[e?n-1:0],s2=st[e?n-1:0],dir=e?1:-1,ci=[];
      for(k=0;k<6;k++){var q2=S.ring[k];ci.push(vt(q2[0],q2[1],q2[2],s2.u+dir*0.006*(q2[1]-s2.yb)/s2.T,V(band,TK[k])));}
      for(k=1;k<5;k++){if(alongX)tri(ci[0],ci[k],ci[k+1],dir,0,0);else tri(ci[0],ci[k],ci[k+1],0,0,dir);}
    }
  }
  function topAt(st,x,l){
    var k=0;while(k<st.length-2&&x>st[k+1].a)k++;
    var A=st[k],B=st[k+1],f=(x-A.a)/(B.a-A.a);f=f<0?0:f>1?1:f;
    var yb=mix(A.yb,B.yb,f),T=mix(A.T,B.T,f),tw=mix(A.tw,B.tw,f),c=mix(A.c,B.c,f);
    return{y:yb+T/2+l*Math.sin(tw)+T/2*Math.cos(tw),z:c+l*Math.cos(tw),wb:mix(A.wb,B.wb,f),wf:mix(A.wf,B.wf,f),rb:mix(A.rb,B.rb,f),rf:mix(A.rf,B.rf,f)};
  }

  // slats: 8 across X, pitch 0.125 (half gap at each cell edge so cells butt seamlessly)
  var slats=[],i,k,e;
  for(i=0;i<8;i++){
    var w=rr(0.084,0.096),zc=-0.4375+i*0.125+rr(-0.003,0.003),T0=rr(0.021,0.024);
    var xa=-rr(0.438,0.452),xb=rr(0.438,0.452),twA=rr(-0.05,0.05),twB=rr(-0.05,0.05);
    var xs=i===CRACK?[xa,-RX,0,RX,0.3,0.37,xb]:[xa,-RX,0,RX,xb],st=[];
    for(k=0;k<xs.length;k++){
      var x=xs[k],end=k===0||k===xs.length-1,ax=Math.abs(x),f=ax<=RX?0.1:0.1+0.9*(ax-RX)/(Math.abs(x<0?xa:xb)-RX);
      var yo=end?rr(-0.0025,0.0045):ax===RX?rr(0,0.0006):rr(-0.0015,0.0012);
      st.push({a:x,c:zc+(end?rr(-0.004,0.004):rr(-0.0015,0.0015)),wb:w/2+rr(-0.0018,0.0018),wf:w/2+rr(-0.0018,0.0018),
        yb:0.045+yo,T:T0+rr(-0.0007,0.0007),rb:rr(0.0055,0.009),rf:rr(0.0055,0.009),tw:(x<0?twA:twB)*f,u:x+0.5});
    }
    if(i===CRACK){ // chunk broken out of the front edge at the +X end; broken part sags and twists
      var hw=w/2;
      st[5].wf=hw*0.42;st[5].rf=0.0025;st[5].yb-=0.0015;
      st[6].wf=hw*0.3;st[6].rf=0.002;st[6].yb-=0.003;st[6].tw-=0.03;
    }
    slats.push(st);
    beam(st,true,i,0.0014);
  }
  // runners along Z, identical end sections so neighbouring cells line up
  for(e=0;e<2;e++){
    var zs=[-0.5,-0.25,0,0.25,0.5],st2=[];
    for(k=0;k<5;k++){
      var en=k===0||k===4;
      st2.push({a:zs[k],c:(e?RX:-RX)+(en?0:rr(-0.003,0.003)),wb:en?0.0275:0.0275+rr(-0.0015,0.0015),wf:en?0.0275:0.0275+rr(-0.0015,0.0015),
        yb:0,T:en?0.045:0.045+rr(-0.0008,0.0003),rb:0.007,rf:0.007,tw:en?0:rr(-0.02,0.02),u:e?0.5-zs[k]:zs[k]+0.5,j:en?0:1});
    }
    beam(st2,false,8,0.0012);
  }
  // nail heads (one per slat/runner crossing) + rust stain spots for the texture
  for(i=0;i<8;i++){
    for(e=0;e<2;e++){
      var st3=slats[i],nx=(e?RX:-RX)+rr(-0.008,0.008),nl=rr(-0.016,0.016),tp=topAt(st3,nx,nl);
      var ny=tp.y,nz=tp.z,ang=R()*6.2832,rad=rr(0.0042,0.0052),rg=[];
      var ap=vt(nx,ny+rr(0.0018,0.0026),nz,0.12,9.5/BANDS);
      for(k=0;k<5;k++){var an=ang+k*1.25664;rg.push(vt(nx+Math.cos(an)*rad,ny-0.0005,nz+Math.sin(an)*rad,0.12+Math.cos(an)*0.03,(9.5+Math.sin(an)*0.3)/BANDS));}
      for(k=0;k<5;k++)tri(ap,rg[k],rg[(k+1)%5],0,1,0);
      var t0=-tp.wb+tp.rb,t1=tp.wf-tp.rf;
      (spots[i]=spots[i]||[]).push({u:nx+0.5,t:0.14+0.62*(nl-t0)/(t1-t0)});
    }
  }
  // caked mud lumps on a few slats
  var LU=[[1,-0.06],[5,0.13],[6,-0.36]];
  for(var q=0;q<3;q++){
    var stq=slats[LU[q][0]],lx=LU[q][1]+rr(-0.02,0.02),ll=rr(-0.006,0.006),ax2=rr(0.032,0.05),az2=rr(0.016,0.024);
    var c0=topAt(stq,lx,ll),apx=vt(lx+rr(-0.006,0.006),c0.y+rr(0.005,0.009),c0.z,0.75,9.5/BANDS),rg2=[],a0=R()*6.2832;
    for(k=0;k<6;k++){
      var an2=a0+k*1.0472,jr=rr(0.75,1.15),dx=Math.cos(an2)*ax2*jr,dl=Math.sin(an2)*az2*jr,tq=topAt(stq,lx+dx,ll+dl);
      rg2.push(vt(lx+dx,tq.y-0.0015,tq.z,0.75+dx*3,(9.5+dl*10)/BANDS));
    }
    for(k=0;k<6;k++)tri(apx,rg2[k],rg2[(k+1)%6],0,1,0);
  }

  var geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(P,3));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(UV,2));
  geo.setIndex(IX);
  geo.computeVertexNormals(); // indexed -> smooth, area-weighted normals
  geo.computeBoundingBox();geo.computeBoundingSphere();
  return{g:geo,spots:spots};
}

// ---------------------------------------------------------------- textures
// Atlas: 10 bands along v. 0-7 = slats, 8 = runners, 9 = utility (iron left, mud right).
// u runs along each plank's length; t (0..1 inside a band) runs around the cross-section,
// top face = t 0.14..0.76. Colour canvas + data canvas (R = bump height, G = roughness).
function paint(spots){
  var W=512,H=1024,i;
  var c1=document.createElement('canvas'),c2=document.createElement('canvas');
  c1.width=c2.width=W;c1.height=c2.height=H;
  var g1=c1.getContext('2d'),g2=c2.getContext('2d');
  var d1=g1.createImageData(W,H),d2=g2.createImageData(W,H),A=d1.data,B=d2.data;
  var KN={1:[0.31,0.42],3:[0.68,0.55],6:[0.22,0.36],8:[0.55,0.5]};
  for(var py=0;py<H;py++){
    var v=1-(py+0.5)/H,bv=v*BANDS,b=Math.floor(bv),t=(bv-b-0.04)/0.92;
    t=t<0?0:t>1?1:t;
    var sp=spots[b]||[],kn=KN[b],s=b*31+7,tone=0.88+0.24*hash(b,3,77),warm=hash(b,5,91);
    for(var px=0;px<W;px++){
      var u=(px+0.5)/W,o=(py*W+px)*4,r,g,bl,ht,ro;
      if(b>=9){
        if(u<0.5){var n=fbm(u*16,t*4,301,16,2),ru=ss(0.42,0.7,n);r=mix(54,116,ru);g=mix(47,64,ru);bl=mix(43,34,ru);ht=0.45+0.3*n;ro=0.62+0.3*ru;}
        else{var m=fbm(u*10,t*3,333,10,3),dr=ss(0.42,0.68,m);r=mix(60,114,dr);g=mix(48,97,dr);bl=mix(36,76,dr);ht=0.35+0.6*m;ro=mix(0.5,1,dr);}
      }else{
        // grain: long streaks along u, warped, with late-wood lines standing proud (weathered)
        var warp=fbm(u*3,t*1.3+b*2.7,s,3,2),rg=t*(b===8?7:9.5)+warp*2.6+0.35*Math.sin(u*6.2832+b*1.3),kd=9;
        if(kn){var du=(u-kn[0])/0.014,dt=(t-kn[1])*0.126/0.009;kd=du*du+dt*dt;rg+=1.6*Math.exp(-kd*0.35);}
        var ln=0.5+0.5*Math.cos(rg*6.2832);ln=ln*ln*ln;
        var fib=vn(u*64,t*150+b*5,s+5,64),gy=fbm(u*2,t*0.7+b*1.1,s+9,2,2);
        var k=(0.8+0.2*fib-0.3*ln)*tone;
        r=(128+10*warm)*k;g=(103+4*warm)*k;bl=(77-6*warm)*k;
        var gw=ss(0.42,0.75,gy)*0.55;r=mix(r,116*k,gw);g=mix(g,109*k,gw);bl=mix(bl,98*k,gw); // silver weathering
        ht=0.42+0.34*ln+0.14*fib;
        if(kn&&kd<1.2){var kc=ss(1.2,0.3,kd);r=mix(r,62,kc);g=mix(g,42,kc);bl=mix(bl,28,kc);ht+=0.1*kc;}
        // wet dark wood (blotches + sides/bottom near the floor water)
        var wv=fbm(u*3+0.5,t*0.9+b*0.37,s+13,3,2);
        var wet=ss(0.4,0.68,wv)+((t<0.1||t>0.8)?0.35:0)+(b===8?0.3:0);wet=wet>1?1:wet;
        var dk=1-0.42*wet;r*=dk;g*=dk;bl*=dk*1.02;ro=0.96-0.36*wet;
        // iron stains around nail heads
        for(i=0;i<sp.length;i++){var su=u-sp[i].u,st=(t-sp[i].t)*0.126,dd=Math.sqrt(su*su+st*st);
          if(dd<0.013){var sk=ss(0.013,0.003,dd);r*=1-0.5*sk;g*=1-0.55*sk;bl*=1-0.6*sk;r+=14*sk;ht-=0.18*sk;ro-=0.1*sk;}}
        if(b===CRACK){ // split along the grain running into the broken-off chunk
          if(u>0.5&&u<0.83){var ct=0.53+0.012*Math.sin(u*47)+(vn(u*90,3.3,51,0)-0.5)*0.025,wd=0.0025+0.007*ss(0.5,0.8,u),cd=Math.abs(t-ct);
            if(cd<wd){var cf=1-cd/wd;cf=cf*cf*(3-2*cf);r=mix(r,26,cf);g=mix(g,19,cf);bl=mix(bl,13,cf);ht=mix(ht,0.04,cf);ro=mix(ro,0.8,cf);}}
          if(u>0.79&&u<0.96&&t>0.75&&t<0.91){var fr=0.65+0.35*fib;r=mix(r,152*fr,0.75);g=mix(g,118*fr,0.75);bl=mix(bl,80*fr,0.75);ht=0.3+0.6*vn(u*180,t*60,77,0);ro=0.97;}
        }
        // caked mud: wet dark rims, dry pale crust inside, heavier toward the slat ends
        var eb=b<8?Math.max(0,1-Math.min(u,1-u)/0.13):0.3;
        var mv=fbm(u*7,t*2.3+b*0.9,s+21,7,3)+eb*0.28+(b===8?0.06:0),md=ss(0.53,0.6,mv);
        if(md>0){var inr=ss(0.6,0.74,mv),mf=0.85+0.3*fib;
          r=mix(r,mix(60,110,inr)*mf,md);g=mix(g,mix(48,94,inr)*mf,md);bl=mix(bl,mix(36,73,inr)*mf,md);
          ht=mix(ht,0.62+0.3*inr+0.08*fib,md);ro=mix(ro,mix(0.5,1,inr),md);}
      }
      A[o]=r;A[o+1]=g;A[o+2]=bl;A[o+3]=255;
      B[o]=ht*255;B[o+1]=ro*255;B[o+2]=0;B[o+3]=255;
    }
  }
  g1.putImageData(d1,0,0);g2.putImageData(d2,0,0);
  return[c1,c2];
}
function makeTex(THREE,cv,srgb){
  var t=new THREE.CanvasTexture(cv);
  t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;
  if(srgb&&THREE.sRGBEncoding!==undefined)t.encoding=THREE.sRGBEncoding;
  t.needsUpdate=true;return t;
}

window.TWM.duckboard=function(THREE){
  if(CACHE)return CACHE;
  var built=buildGeo(THREE),cv=paint(built.spots),data=makeTex(THREE,cv[1],false);
  var mat=new THREE.MeshStandardMaterial({map:makeTex(THREE,cv[0],true),roughnessMap:data,bumpMap:data,bumpScale:0.0012,roughness:0.9,metalness:0});
  mat.name='duckboard';built.g.name='duckboard';
  CACHE={geometry:built.g,material:mat};
  return CACHE;
};
})();
