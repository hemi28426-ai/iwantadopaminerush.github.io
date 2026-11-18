// Trench War - sculpted WWI burlap sandbag: one filled, heavy sack lying flat, long axis X.
// Flat spread underside, soft domed top that sags mid-length, bulging uneven sides,
// folded/tucked-under end (-X), gathered + cord-tied end with a frilly tuft (+X).
(function(){
window.TWM=window.TWM||{};
var CACHE=null;

function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

// seeded smooth 3D value noise, returns roughly -1..1
function makeNoise(seed){
  var R=mulberry32(seed),P=new Uint8Array(512),G=new Float32Array(256),i,j,t;
  for(i=0;i<256;i++){P[i]=i;G[i]=R()*2-1;}
  for(i=255;i>0;i--){j=(R()*(i+1))|0;t=P[i];P[i]=P[j];P[j]=t;}
  for(i=0;i<256;i++)P[i+256]=P[i];
  function h(x,y,z){return G[P[P[P[x&255]+(y&255)]+(z&255)]];}
  return function(x,y,z){
    var xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z);
    var xf=x-xi,yf=y-yi,zf=z-zi;
    var u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf),w=zf*zf*(3-2*zf);
    var a=h(xi,yi,zi),b=h(xi+1,yi,zi),c=h(xi,yi+1,zi),d=h(xi+1,yi+1,zi);
    var e=h(xi,yi,zi+1),f=h(xi+1,yi,zi+1),g=h(xi,yi+1,zi+1),k=h(xi+1,yi+1,zi+1);
    var x1=a+(b-a)*u,x2=c+(d-c)*u,x3=e+(f-e)*u,x4=g+(k-g)*u;
    var y1=x1+(x2-x1)*v,y2=x3+(x4-x3)*v;
    return y1+(y2-y1)*w;
  };
}
var NA=makeNoise(1907),NB=makeNoise(4417),NC=makeNoise(7723);
function ss(a,b,x){var t=(x-a)/(b-a);t=t<0?0:t>1?1:t;return t*t*(3-2*t);}
function lerp(a,b,t){return a+(b-a)*t;}
function spow(v,e){return v<0?-Math.pow(-v,e):Math.pow(v,e);}

// ring stations along the sack: [x, cross-section scale]; first/last are poles
var PROF=[
 [-0.452,0.00],[-0.459,0.36],[-0.452,0.62],[-0.437,0.80],[-0.412,0.92],[-0.375,0.975],[-0.31,0.995],
 [-0.22,1.0],[-0.13,1.0],[-0.04,1.0],[0.05,1.0],[0.14,0.995],[0.22,0.975],
 [0.275,0.92],[0.318,0.80],[0.350,0.62],[0.373,0.44],[0.390,0.29],
 [0.401,0.21],[0.412,0.20],                       // cord-tied neck
 [0.425,0.28],[0.441,0.32],[0.454,0.25],[0.462,0.10],[0.464,0.0] // gathered tuft
];
var NU=PROF.length-1,NV=17,COLS=NV+1;   // 2*NV*(NU-1) = 782 triangles

function smoothNormals(geo){
  geo.computeVertexNormals();
  var N=geo.attributes.normal.array,i,j,a,b,x,y,z,l;
  for(i=0;i<=NU;i++){
    if(i===0||i===NU){
      x=y=z=0;
      for(j=0;j<COLS;j++){a=(i*COLS+j)*3;x+=N[a];y+=N[a+1];z+=N[a+2];}
      l=Math.sqrt(x*x+y*y+z*z)||1;x/=l;y/=l;z/=l;
      for(j=0;j<COLS;j++){a=(i*COLS+j)*3;N[a]=x;N[a+1]=y;N[a+2]=z;}
    }else{
      a=i*COLS*3;b=(i*COLS+NV)*3;
      x=N[a]+N[b];y=N[a+1]+N[b+1];z=N[a+2]+N[b+2];
      l=Math.sqrt(x*x+y*y+z*z)||1;
      N[a]=N[b]=x/l;N[a+1]=N[b+1]=y/l;N[a+2]=N[b+2]=z/l;
    }
  }
  geo.attributes.normal.needsUpdate=true;
}

function buildGeometry(THREE){
  var rows=NU+1,n=rows*COLS,pos=new Float32Array(n*3),uv=new Float32Array(n*2);
  var W=0.215,crPh=1.7,frPh=4.1,i,j,k,q;
  for(i=0;i<rows;i++){
    var px=PROF[i][0],r=PROF[i][1];
    var g=ss(0.22,0.395,px);                 // gathering toward the tie
    var tuft=ss(0.403,0.424,px);             // fabric beyond the cord
    var fold=1-ss(-0.42,-0.30,px);           // folded-under end
    var ear=ss(-0.40,-0.445,px)*(r>0?1:0);
    var sag=1-0.09*Math.exp(-Math.pow((px+0.03)/0.17,2));   // top slumps mid-length
    var wb=1+0.05*Math.exp(-Math.pow((px+0.02)/0.2,2));     // ...so the sides bulge there
    var hb=r*lerp(0.08,0.17,g);
    var ht=r*lerp(0.22,0.17,g)*sag*(1-0.25*tuft);
    var lift=0.034*ss(0.30,0.40,px)-0.03*ss(0.41,0.464,px); // neck lifts, tuft droops
    var yc=-0.15+hb+lift;
    var bz1=1+0.05*NA(px*5,0.3,1.7),bz2=1+0.05*NB(px*5+2,2.1,0.4);
    for(j=0;j<NV;j++){
      var th=j/NV*Math.PI*2,cz=Math.sin(th),cy=-Math.cos(th),top=cy>0;
      var e=top?lerp(1.0,1.0,g):lerp(0.5,0.95,g);
      var sz=spow(cz,e),sy=spow(cy,e),m=1;
      var ca=0.17*g*(1-tuft);
      if(ca>0){var cc=0.5+0.5*Math.cos(4*th+crPh+px*9);m-=ca*(cc*cc*cc-0.25);}  // radiating creases
      if(tuft>0)m+=tuft*(0.28*Math.sin(3*th+frPh)+0.5*NC(Math.cos(th)*1.3,Math.sin(th)*1.3,px*30));
      if(fold>0&&cy<-0.2)m+=0.07*fold*ss(-0.2,-0.5,cy);  // tucked flap ledge
      if(ear>0)m+=0.07*ear*(Math.exp(-Math.pow((th-1.3)/0.35,2))+Math.exp(-Math.pow((th-(Math.PI*2-1.3))/0.35,2)));
      var side=1+0.04*(1-Math.abs(cy));
      var zz=sz*W*r*m*wb*side*(cz>0?bz1:bz2)*(top?1-0.08*sy*(1-g):1);
      var yy=yc+sy*(top?ht:hb)*m;
      var xx=px-0.015*fold*(sy+0.3)*r+tuft*r*0.05*(m-1);   // top rolls over the folded end
      zz+=0.016*(1-px*px/0.2116)+0.022*(px/0.46)*((yy+0.15)/0.3); // slight bend + twist
      k=i*COLS+j;
      pos[k*3]=xx;pos[k*3+1]=yy;pos[k*3+2]=zz;
      uv[k*2]=i/NU;uv[k*2+1]=j/NV;
    }
    k=i*COLS+NV;q=i*COLS*3;
    pos[k*3]=pos[q];pos[k*3+1]=pos[q+1];pos[k*3+2]=pos[q+2];
    uv[k*2]=i/NU;uv[k*2+1]=1;
  }
  var idx=[];
  for(i=0;i<NU;i++)for(j=0;j<NV;j++){
    var a=i*COLS+j,b=a+COLS,c=a+1,d=b+1;
    if(i>0)idx.push(a,b,c);
    if(i<NU-1)idx.push(b,d,c);
  }
  var geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));
  geo.setIndex(idx);
  smoothNormals(geo);
  // lumpy earth fill pushed out along the normals (less on the pressed underside / tight neck)
  var N=geo.attributes.normal.array;
  for(k=0;k<n;k++){
    var x=pos[k*3],y=pos[k*3+1],z=pos[k*3+2];
    var l=0.65*NA(x*7.5+3.1,y*7.5,z*7.5)+0.35*NB(x*16,y*16+1.7,z*16);
    var w=(0.25+0.75*ss(-0.14,-0.08,y))*(1-0.65*ss(0.37,0.40,x)*(1-ss(0.413,0.43,x)));
    var amp=0.022*l*w;
    pos[k*3]+=N[k*3]*amp;pos[k*3+1]+=N[k*3+1]*amp;pos[k*3+2]+=N[k*3+2]*amp;
  }
  // flat heavy contact patch, then fit exactly 0.92 x 0.30 x 0.46 centred on the origin
  var mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9],DIM=[0.92,0.30,0.46];
  for(k=0;k<n;k++){
    if(pos[k*3+1]<-0.15)pos[k*3+1]=-0.15;
    for(q=0;q<3;q++){var v=pos[k*3+q];if(v<mn[q])mn[q]=v;if(v>mx[q])mx[q]=v;}
  }
  for(k=0;k<n;k++)for(q=0;q<3;q++)pos[k*3+q]=(pos[k*3+q]-(mn[q]+mx[q])/2)*DIM[q]/(mx[q]-mn[q]);
  geo.attributes.position.needsUpdate=true;
  smoothNormals(geo);
  geo.computeBoundingBox();geo.computeBoundingSphere();
  return geo;
}

function buildMaterial(THREE){
  var S=512,cv=document.createElement('canvas'),bv=document.createElement('canvas');
  cv.width=cv.height=bv.width=bv.height=S;
  var cx=cv.getContext('2d'),bx=bv.getContext('2d');
  var img=cx.createImageData(S,S),bim=bx.createImageData(S,S),D=img.data,B=bim.data;
  var R=mulberry32(8812),i,PI=Math.PI;
  var wJ=new Float32Array(256),fJ=new Float32Array(256),hJ=new Float32Array(256);
  for(i=0;i<256;i++){wJ[i]=0.84+0.28*R();fJ[i]=0.84+0.28*R();if(R()<0.09)wJ[i]*=0.78;if(R()<0.09)fJ[i]*=0.8;hJ[i]=R();}
  var pu=5.2,pv=4;   // thread pitch (px); pv divides 512 so the wrap seam is invisible
  for(var py=0;py<S;py++){
    var V=(py+0.5)/S,an=V*PI*2,ca=Math.cos(an),sa=Math.sin(an),dv=Math.min(V,1-V); // dv: 0 bottom, .5 top
    for(var px=0;px<S;px++){
      var U=(px+0.5)/S,o=(py*S+px)*4;
      var n1=NA(U*5,ca*1.5,sa*1.5),n2=NB(U*18,ca*4.5+7.1,sa*4.5),n3=NC(U*64,ca*15,sa*15+3.3);
      // coarse plain-weave jute
      var wy=py/pv+0.5*n2,wx=px/pu+0.35*n3+0.3*n2;
      var iy=Math.floor(wy),ix=Math.floor(wx),ty=wy-iy,tx=wx-ix;
      var sy=Math.sin(PI*ty),sx=Math.sin(PI*tx),th,hu;
      if((ix+iy)&1){th=Math.sqrt(sy)*(0.62+0.38*sx)*wJ[iy&255];hu=hJ[iy&255];}
      else{th=Math.sqrt(sx)*(0.62+0.38*sy)*fJ[ix&255];hu=hJ[(ix*7+13)&255];}
      var b=(0.6+0.42*th)*(0.93+0.14*R())*(0.94+0.12*(n3+0.5));
      var r_=lerp(190,166,hu)*b,g_=lerp(171,157,hu)*b,b_=lerp(120,130,hu)*b;
      var hgt=0.5+0.4*(th-0.55);
      // irregular dirt stains, grubbier toward both ends
      var dirt=Math.min(1,ss(0.16,0.55,n1*0.75+n2*0.35)*0.85+(ss(0.2,0.04,U)+ss(0.7,0.96,U))*0.3*Math.max(0,0.7+0.6*n2));
      r_=lerp(r_,118*b,dirt*0.6);g_=lerp(g_,100*b,dirt*0.6);b_=lerp(b_,72*b,dirt*0.6);
      // damp mud soaked up the lower half, wettest at the ground, splashes above the line
      var edge=0.25+0.045*n2+0.03*n1;
      var mud=1-ss(edge-0.035,edge+0.012,dv);
      if(n3>0.42&&dv<edge+0.08)mud=Math.max(mud,0.6*ss(0.42,0.6,n3));
      var wet=1-ss(0.03,0.2,dv),mf=(0.86+0.28*(n3*0.5+0.5))*(0.82+0.3*th),mq=mud*0.88;
      r_=lerp(r_,lerp(100,62,wet)*mf,mq);g_=lerp(g_,lerp(84,52,wet)*mf,mq);b_=lerp(b_,lerp(62,40,wet)*mf,mq);
      hgt=lerp(hgt,0.5+0.1*n3,mud*0.55);
      // faint stitched side seam (one side only)
      if(U>0.23&&U<0.73){
        var sd=Math.abs(V-0.30)*S;
        if(sd<1.4){var f=1-sd/1.4;r_*=1-0.13*f;g_*=1-0.13*f;b_*=1-0.13*f;hgt+=0.18*f;}
        var sd2=Math.abs(V-0.30-2.6/S)*S;
        if(sd2<1.0&&(px%9)<5){r_=lerp(r_,206,0.28);g_=lerp(g_,192,0.28);b_=lerp(b_,152,0.28);hgt+=0.12;}
      }
      // fabric creases radiating from the tie, and crumpled tuft
      var cf=ss(0.5,0.735,U)*(1-ss(0.735,0.75,U))+0.8*ss(0.80,0.84,U);
      if(cf>0){
        var cl=Math.abs(Math.sin(an*6+n1*2.4+U*5+(U>0.8?n2*3:0)));
        var cr=(1-ss(0,0.25,cl))*cf;
        r_*=1-0.3*cr;g_*=1-0.3*cr;b_*=1-0.3*cr;hgt-=0.4*cr;
      }
      // edge of the flap folded under the -X end
      if(U<0.26){
        var fe=1-ss(0.2,0.26,U),fd=(dv-0.185-0.012*n2)*S;
        if(fd>-2&&fd<3){var sh=fd<0?1+fd/2:1-fd/3;r_*=1-0.32*sh*fe;g_*=1-0.32*sh*fe;b_*=1-0.32*sh*fe;hgt-=0.35*sh*fe;}
      }
      // twisted hemp cord binding the neck
      if(U>0.735&&U<0.80){
        var cw=ss(0.735,0.745,U)*(1-ss(0.79,0.80,U));
        var tw=(px+py*0.6)/3.4,tf=tw-Math.floor(tw),ts=Math.sin(PI*tf);
        var cb=(0.5+0.55*ts)*(0.9+0.2*n3);
        r_=lerp(r_,112*cb,cw);g_=lerp(g_,93*cb,cw);b_=lerp(b_,62*cb,cw);
        hgt=lerp(hgt,0.55+0.4*ts,cw);
      }
      D[o]=r_;D[o+1]=g_;D[o+2]=b_;D[o+3]=255;
      var hv=hgt*255;B[o]=hv;B[o+1]=hv;B[o+2]=hv;B[o+3]=255;
    }
  }
  cx.putImageData(img,0,0);bx.putImageData(bim,0,0);
  // stray jute fibres / hairs
  cx.lineCap=bx.lineCap='round';
  for(i=0;i<1300;i++){
    var x0=R()*S,y0=R()*S,a=(R()<0.5?0:PI/2)+(R()-0.5)*0.9,l=2+R()*7,light=R()<0.6;
    var dvv=Math.min(y0/S,1-y0/S);
    if(light&&dvv<0.22&&R()<0.7)continue;
    var x1=x0+Math.cos(a)*l,y1=y0+Math.sin(a)*l,qx=(x0+x1)/2+(R()-0.5)*2.5,qy=(y0+y1)/2+(R()-0.5)*2.5;
    cx.strokeStyle=light?'rgba(224,208,162,'+(0.16+0.22*R()).toFixed(3)+')':'rgba(76,62,42,'+(0.14+0.2*R()).toFixed(3)+')';
    cx.lineWidth=bx.lineWidth=0.5+R()*0.7;
    bx.strokeStyle=light?'rgba(255,255,255,0.28)':'rgba(0,0,0,0.18)';
    cx.beginPath();cx.moveTo(x0,y0);cx.quadraticCurveTo(qx,qy,x1,y1);cx.stroke();
    bx.beginPath();bx.moveTo(x0,y0);bx.quadraticCurveTo(qx,qy,x1,y1);bx.stroke();
  }
  // water / dirt tide-mark blotches on the upper sack
  cx.globalCompositeOperation='multiply';
  for(i=0;i<10;i++){
    var gx=R()*S,gy=(0.32+R()*0.36)*S,gr=10+R()*38;
    var gg=cx.createRadialGradient(gx,gy,gr*0.15,gx,gy,gr);
    gg.addColorStop(0,'rgba(205,190,155,0.25)');
    gg.addColorStop(0.78,'rgba(128,108,78,0.45)');
    gg.addColorStop(1,'rgba(255,255,255,0)');
    cx.fillStyle=gg;cx.beginPath();cx.ellipse(gx,gy,gr,gr*(0.6+0.5*R()),R()*PI,0,PI*2);cx.fill();
  }
  cx.globalCompositeOperation='source-over';
  function mk(c){var t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return t;}
  var mat=new THREE.MeshStandardMaterial({color:0xffffff,map:mk(cv),bumpMap:mk(bv),bumpScale:0.005,roughness:1,metalness:0});
  mat.name='sandbag';
  return mat;
}

TWM.sandbag=function(THREE){
  if(CACHE)return CACHE;
  CACHE={geometry:buildGeometry(THREE),material:buildMaterial(THREE)};
  return CACHE;
};
})();
