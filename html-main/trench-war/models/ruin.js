// Trench War model: shell-shattered brick farmhouse pier segment (TWM.ruin)
// 1x1 footprint, base y=0, height 1 (game stretches Y 1.5-3.5). One geometry, one material.
(function(){
window.TWM=window.TWM||{};
var CACHE=null;

function mulberry32(a){return function(){a|=0;a=(a+0x6D2B79F5)|0;var t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;};}
function hash3(x,y,z,s){var h=(Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+Math.imul(z|0,1274126177)+Math.imul(s|0,1103515245))|0;h=Math.imul(h^(h>>>13),1274126177);h=h^(h>>>16);return (h>>>0)/4294967296;}
function fade(t){return t*t*(3-2*t);}
function vnoise(x,y,z,s){
  var xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z),u=fade(x-xi),v=fade(y-yi),w=fade(z-zi);
  var a=hash3(xi,yi,zi,s),b=hash3(xi+1,yi,zi,s),c=hash3(xi,yi+1,zi,s),d=hash3(xi+1,yi+1,zi,s);
  var e=hash3(xi,yi,zi+1,s),f=hash3(xi+1,yi,zi+1,s),g=hash3(xi,yi+1,zi+1,s),h=hash3(xi+1,yi+1,zi+1,s);
  var x1=a+(b-a)*u,x2=c+(d-c)*u,x3=e+(f-e)*u,x4=g+(h-g)*u,y1=x1+(x2-x1)*v,y2=x3+(x4-x3)*v;
  return (y1+(y2-y1)*w)*2-1;
}
function fbm(x,y,z,s){return 0.55*vnoise(x,y,z,s)+0.3*vnoise(x*2.07,y*2.07,z*2.07,s+17)+0.15*vnoise(x*4.13,y*4.13,z*4.13,s+31);}
function sstep(a,b,x){var t=(x-a)/(b-a);t=t<0?0:(t>1?1:t);return t*t*(3-2*t);}
function cl(v,m){return v<-m?-m:(v>m?m:v);}

// ---------------- texture: 8 brick courses x 4 bricks, running bond ----------------
var TS=512,TROWS=8,TCOLS=4,CH=TS/TROWS,CW=TS/TCOLS,MJ=4;

function brickPath(ctx,x,y,w,h,R){
  var k=[],i;for(i=0;i<4;i++)k.push(R()<0.45?2+R()*8:0.6);
  function j(){return (R()-0.5)*1.6;}
  ctx.beginPath();
  ctx.moveTo(x+j(),y+k[0]+j());
  ctx.lineTo(x+k[0]+j(),y+j());
  ctx.lineTo(x+w*0.5+j(),y+j());
  ctx.lineTo(x+w-k[1]+j(),y+j());
  ctx.lineTo(x+w+j(),y+k[1]+j());
  ctx.lineTo(x+w+j(),y+h-k[2]+j());
  ctx.lineTo(x+w-k[2]+j(),y+h+j());
  ctx.lineTo(x+w*0.5+j(),y+h+j());
  ctx.lineTo(x+k[3]+j(),y+h+j());
  ctx.lineTo(x+j(),y+h-k[3]+j());
  ctx.closePath();
}

function drawBrick(g,b,r,c,dx){
  var off=(r&1)?CW/2:0,x=c*CW+off+MJ+dx,y=r*CH+MJ,w=CW-2*MJ,h=CH-2*MJ;
  var R=mulberry32(1000+r*37+c*101),t=R(),hue,sat,lit,i;
  if(t<0.13){hue=4+R()*8;sat=22+R()*14;lit=15+R()*7;}          // over-fired clinker
  else if(t<0.24){hue=17+R()*7;sat=46+R()*12;lit=37+R()*8;}    // pale orange
  else{hue=6+R()*10;sat=40+R()*18;lit=24+R()*12;}              // common red-brown
  var ps=(R()*1e9)|0;
  g.save();
  brickPath(g,x,y,w,h,mulberry32(ps));
  g.fillStyle='hsl('+hue.toFixed(1)+','+sat.toFixed(1)+'%,'+lit.toFixed(1)+'%)';
  g.fill();g.clip();
  var gr=g.createLinearGradient(0,y,0,y+h);
  gr.addColorStop(0,'rgba(255,214,178,0.09)');gr.addColorStop(1,'rgba(22,8,4,0.2)');
  g.fillStyle=gr;g.fillRect(x-3,y-3,w+6,h+6);
  for(i=0;i<3;i++){
    var bx=x+R()*w,by=y+R()*h,br=8+R()*26,dk=R()<0.55,rg=g.createRadialGradient(bx,by,0,bx,by,br);
    rg.addColorStop(0,dk?'rgba(30,12,6,0.24)':'rgba(232,160,118,0.15)');rg.addColorStop(1,'rgba(0,0,0,0)');
    g.fillStyle=rg;g.fillRect(bx-br,by-br,br*2,br*2);
  }
  for(i=0;i<80;i++){
    var d2=R()<0.6,ss=0.8+R()*1.8;
    g.fillStyle=d2?'rgba(25,10,6,'+(0.15+R()*0.25).toFixed(2)+')':'rgba(236,176,140,'+(0.08+R()*0.15).toFixed(2)+')';
    g.fillRect(x+R()*w,y+R()*h,ss,ss);
  }
  if(R()<0.28){
    g.strokeStyle='rgba(18,8,5,0.6)';g.lineWidth=1;g.beginPath();
    var cx=x+R()*w,cy=y;g.moveTo(cx,cy);
    for(i=0;i<4;i++){cx+=(R()-0.5)*14;cy+=h/4;g.lineTo(cx,cy);}
    g.stroke();
  }
  g.restore();
  g.save();brickPath(g,x,y,w,h,mulberry32(ps));g.strokeStyle='rgba(20,8,4,0.38)';g.lineWidth=1.6;g.stroke();g.restore();
  // bump: raised brick face, bevelled arrises, porous pits
  brickPath(b,x,y,w,h,mulberry32(ps));
  var bl=(185+R()*45)|0;b.fillStyle='rgb('+bl+','+bl+','+bl+')';b.fill();
  b.strokeStyle='rgb(125,125,125)';b.lineWidth=4;b.stroke();
  for(i=0;i<45;i++){var pv=(80+R()*90)|0,pz=1+R()*2.2;b.fillStyle='rgba('+pv+','+pv+','+pv+',0.6)';b.fillRect(x+4+R()*(w-8),y+4+R()*(h-8),pz,pz);}
}

function makeTextures(THREE){
  var cv=document.createElement('canvas');cv.width=cv.height=TS;var g=cv.getContext('2d');
  var bc=document.createElement('canvas');bc.width=bc.height=TS;var b=bc.getContext('2d');
  var R=mulberry32(77123),i,r,c,o,ox,oy;
  g.fillStyle='rgb(112,107,98)';g.fillRect(0,0,TS,TS);
  b.fillStyle='rgb(55,55,55)';b.fillRect(0,0,TS,TS);
  for(i=0;i<6000;i++){
    var v=(70+R()*90)|0,s=1+R()*2;
    g.fillStyle='rgba('+v+','+(v-3)+','+(v-9)+',0.4)';g.fillRect(R()*TS,R()*TS,s,s);
    var bv=(30+R()*60)|0;b.fillStyle='rgba('+bv+','+bv+','+bv+',0.5)';b.fillRect(R()*TS,R()*TS,s,s);
  }
  for(r=0;r<TROWS;r++)for(c=0;c<TCOLS;c++)for(o=-1;o<=1;o++)drawBrick(g,b,r,c,o*TS);
  // soot + scorch (multiply, tiled)
  g.globalCompositeOperation='multiply';
  for(i=0;i<9;i++){
    var sx=R()*TS,sy=R()*TS,sr=40+R()*120,sa=0.25+R()*0.45;
    for(ox=-1;ox<=1;ox++)for(oy=-1;oy<=1;oy++){
      var X=sx+ox*TS,Y=sy+oy*TS,rg=g.createRadialGradient(X,Y,0,X,Y,sr);
      rg.addColorStop(0,'rgba(38,30,26,'+sa.toFixed(2)+')');rg.addColorStop(0.6,'rgba(90,75,65,'+(sa*0.4).toFixed(2)+')');rg.addColorStop(1,'rgba(255,255,255,0)');
      g.fillStyle=rg;g.fillRect(X-sr,Y-sr,sr*2,sr*2);
    }
  }
  for(i=0;i<14;i++){
    var lx=R()*TS,ly=R()*TS,lw=4+R()*16,lh=60+R()*200,la=0.2+R()*0.3;
    for(ox=-1;ox<=1;ox++)for(oy=-1;oy<=1;oy++){
      var X2=lx+ox*TS,Y2=ly+oy*TS;
      for(var q=0;q<3;q++){
        var ww=lw*(1-q*0.33),lg=g.createLinearGradient(0,Y2,0,Y2-lh);
        lg.addColorStop(0,'rgba(40,32,28,'+(la/2.2).toFixed(2)+')');lg.addColorStop(1,'rgba(255,255,255,0)');
        g.fillStyle=lg;g.fillRect(X2-ww/2,Y2-lh,ww,lh);
      }
    }
  }
  g.globalCompositeOperation='source-over';
  var id=g.getImageData(0,0,TS,TS),dd=id.data,nn;
  for(i=0;i<dd.length;i+=4){nn=(R()-0.5)*18;dd[i]+=nn;dd[i+1]+=nn*0.95;dd[i+2]+=nn*0.9;}
  g.putImageData(id,0,0);
  var bd=b.getImageData(0,0,TS,TS),be=bd.data;
  for(i=0;i<be.length;i+=4){nn=(R()-0.5)*22;be[i]+=nn;be[i+1]+=nn;be[i+2]+=nn;}
  b.putImageData(bd,0,0);
  var tex=new THREE.CanvasTexture(cv);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.anisotropy=4;
  var btex=new THREE.CanvasTexture(bc);btex.wrapS=btex.wrapT=THREE.RepeatWrapping;btex.anisotropy=4;
  return {map:tex,bump:btex};
}

// ---------------- geometry ----------------
var HX=0.415,HZ=0.325,RC=0.07,NP=36,CPU=6,GJ=0.013,GROOVE=0.017,BRICK=0.36;
var YR=[0,0.055];(function(){for(var k=1;k<CPU;k++)YR.push(k/CPU-GJ,k/CPU,k/CPU+GJ);YR.push(1);})();
var NR=YR.length;

function buildLoop(){
  var dense=[],cs=[[HX-RC,HZ-RC],[-(HX-RC),HZ-RC],[-(HX-RC),-(HZ-RC)],[HX-RC,-(HZ-RC)]],ci,j,i,p;
  for(ci=0;ci<4;ci++)for(j=0;j<=8;j++){var a=(ci+j/8)*Math.PI/2;dense.push([cs[ci][0]+RC*Math.cos(a),cs[ci][1]+RC*Math.sin(a)]);}
  var n=dense.length,cum=[0];
  for(i=1;i<=n;i++){var A=dense[i-1],B=dense[i%n],dx=B[0]-A[0],dz=B[1]-A[1];cum.push(cum[i-1]+Math.sqrt(dx*dx+dz*dz));}
  var L=cum[n],s0=RC*Math.PI/4,pts=[];
  for(p=0;p<NP;p++){
    var s=(s0+p*L/NP)%L,sg=0;
    while(sg<n-1&&cum[sg+1]<s)sg++;
    var A2=dense[sg],B2=dense[(sg+1)%n],len=cum[sg+1]-cum[sg],t=len>0?(s-cum[sg])/len:0;
    pts.push({x:A2[0]+(B2[0]-A2[0])*t,z:A2[1]+(B2[1]-A2[1])*t,s:p*L/NP});
  }
  for(p=0;p<NP;p++){
    var P0=pts[(p+NP-1)%NP],P1=pts[(p+1)%NP],tx=P1.x-P0.x,tz=P1.z-P0.z,tl=Math.sqrt(tx*tx+tz*tz)||1,q=pts[p];
    q.nx=tz/tl;q.nz=-tx/tl;q.th=Math.atan2(q.z,q.x);q.corner=Math.abs(q.x)>HX-0.1&&Math.abs(q.z)>HZ-0.1;
  }
  return {pts:pts,L:L};
}

function arrGeo(THREE,pos,uv,col,idx){
  var g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  g.setIndex(idx);g.computeVertexNormals();
  return g;
}

function mergeAll(THREE,list){
  var names=['position','normal','uv','color'],sizes=[3,3,2,3],tot=0,i,k,out=new THREE.BufferGeometry();
  for(i=0;i<list.length;i++)tot+=list[i].attributes.position.count;
  for(k=0;k<names.length;k++){
    var arr=new Float32Array(tot*sizes[k]),o=0;
    for(i=0;i<list.length;i++){var a=list[i].attributes[names[k]].array;arr.set(a,o);o+=a.length;}
    out.setAttribute(names[k],new THREE.BufferAttribute(arr,sizes[k]));
  }
  return out;
}

function build(THREE){
  var R=mulberry32(19160701);
  var lp=buildLoop(),pts=lp.pts,L=lp.L,TU=L/Math.max(1,Math.round(L/(4*BRICK)));
  var phi=R()*Math.PI*2,phiLow=phi+Math.PI+(R()-0.5)*0.8;
  var p,i,k,c,r;

  // jagged broken top: sheared high side, broken at mortar lines, missing bricks, standing teeth
  var tops=[];
  for(p=0;p<NP;p++){
    var th=pts[p].th;
    var h=0.79+0.17*Math.cos(th-phi)+0.055*Math.sin(2*th+1.3)+0.07*fbm(Math.cos(th)*1.7+3,Math.sin(th)*1.7,0.37,5);
    tops.push(Math.round(h*12)/12);
  }
  for(k=0;k<4;k++){var p0=(R()*NP)|0,wd=2+((R()*3)|0),dp=(1+((R()*2)|0))/12;for(i=0;i<wd;i++)tops[(p0+i)%NP]-=dp;}
  for(k=0;k<2;k++)tops[(R()*NP)|0]+=1/12;
  var mx=-1,mi=0;
  for(p=0;p<NP;p++){tops[p]=Math.max(0.42,Math.min(1,tops[p]));if(tops[p]>mx){mx=tops[p];mi=p;}}
  for(p=0;p<NP;p++)tops[p]-=R()*0.012;
  tops[mi]=1;

  var dents=[];for(k=0;k<3;k++)dents.push({s:R()*L,y:0.22+R()*0.42,r:0.13+R()*0.09,d:0.04+R()*0.035});
  var chips=[];for(k=0;k<4;k++){var crow=[];for(i=0;i<CPU;i++)crow.push(R()<0.42?0.02+R()*0.035:0);chips.push(crow);}

  // ---- masonry shell (grid around the loop, rows on brick-course grooves) ----
  var pos=[],uv=[],col=[],idx=[],map=[],topPos=[];
  for(c=0;c<=NP;c++){
    p=c%NP;
    var P=pts[p],top=tops[p],su=(c===NP)?L:P.s,rTop=NR-1;
    for(r=0;r<NR;r++){if(YR[r]>=top-0.01){rTop=r;break;}}
    var ci=[];
    for(r=0;r<=rTop;r++){
      var y=(r===rTop)?top:YR[r],off=0.022*(1-sstep(0,0.09,y));
      if(r>=2&&r<NR-1&&(r-2)%3===1&&r!==rTop)off-=GROOVE*(0.75+0.5*hash3(p,r,3,9));
      var kc=Math.min(CPU-1,Math.floor(y*CPU+1e-6));
      off+=(hash3(Math.floor(P.s/BRICK+(kc&1)*0.5),kc,5,7)-0.45)*0.011;
      off+=0.016*fbm(P.x*5+1.3,y*3.2,P.z*5,11)+0.006*vnoise(P.x*14,y*9,P.z*14,4);
      var soot=0;
      for(i=0;i<dents.length;i++){
        var D=dents[i],ds=Math.abs(P.s-D.s);if(ds>L/2)ds=L-ds;
        var dy=(y-D.y)*2.2,dist=Math.sqrt(ds*ds+dy*dy);
        if(dist<D.r){var f=1-dist/D.r;off-=D.d*f*f*(3-2*f)*(0.7+0.3*(vnoise(P.x*9,y*7,P.z*9,2)+1));}
        soot+=0.55*sstep(D.r*1.7,D.r*0.4,dist);
      }
      if(P.corner)off-=chips[(P.x>0?1:0)+(P.z>0?2:0)][kc];
      off-=0.022*sstep(top-0.13,top,y)*(0.5+0.5*vnoise(P.x*11,y*6,P.z*11,8));
      if(r===rTop)off-=0.026+0.014*hash3(p,7,7,3);
      var x=cl(P.x+P.nx*off,0.49),z=cl(P.z+P.nz*off,0.49);
      ci.push(pos.length/3);pos.push(x,y,z);uv.push(su/TU,y*CPU/4);
      soot+=0.42*sstep(top-0.32,top,y)+0.32*sstep(0.1,0.6,fbm(P.x*2.3,y*1.4,P.z*2.3,21));
      soot=Math.min(0.75,soot);
      var dust=1-sstep(0,0.16,y),vr=0.93+0.12*hash3(p,r,1,1);
      col.push((1-soot)*vr+dust*0.08,(1-soot*1.03)*vr+dust*0.07,(1-soot*1.06)*vr+dust*0.06);
      if(r===rTop&&c<NP)topPos.push([x,y,z]);
    }
    for(r=rTop+1;r<NR;r++)ci.push(ci[rTop]);
    map.push(ci);
  }
  function tri(a,b,d){if(a!==b&&b!==d&&a!==d)idx.push(a,b,d);}
  for(c=0;c<NP;c++)for(r=0;r<NR-1;r++){
    var qa=map[c][r],qb=map[c+1][r],qc=map[c+1][r+1],qd=map[c][r+1];
    tri(qa,qc,qb);tri(qa,qd,qc);
  }
  var wall=arrGeo(THREE,pos,uv,col,idx);
  var nr=wall.attributes.normal;
  for(r=0;r<NR;r++){
    if(r>0&&map[0][r]===map[0][r-1])break;
    var i0=map[0][r],i1=map[NP][r];
    var nx=nr.getX(i0)+nr.getX(i1),ny=nr.getY(i0)+nr.getY(i1),nz=nr.getZ(i0)+nr.getZ(i1),nl=Math.sqrt(nx*nx+ny*ny+nz*nz)||1;
    nr.setXYZ(i0,nx/nl,ny/nl,nz/nl);nr.setXYZ(i1,nx/nl,ny/nl,nz/nl);
  }

  // ---- broken top surface (fresh fractured brick, hard edge to the faces) ----
  var cp=[],cu=[],cc=[],cx=[],avg=0;
  for(p=0;p<NP;p++)avg+=tops[p];avg/=NP;
  for(p=0;p<NP;p++){var T=topPos[p];cp.push(T[0],T[1],T[2]);}
  for(p=0;p<NP;p++){
    var T2=topPos[p],fr=0.5+0.08*vnoise(p*0.7,1.3,2.1,4),ix=T2[0]*fr,iz=T2[2]*fr;
    cp.push(ix,tops[p]*0.55+avg*0.45-0.02+0.035*vnoise(ix*9,3.1,iz*9,6),iz);
  }
  cp.push(0.02,avg-0.035,-0.01);
  for(i=0;i<cp.length;i+=3){
    var X=cp[i],Y=cp[i+1],Z=cp[i+2];
    cu.push((X*0.93+Z*0.37)/TU,(Z*0.93-X*0.37)*1.5);
    var sh=0.72+0.28*(vnoise(X*7,Y*5,Z*7,13)*0.5+0.5);
    cc.push(1.06*sh,0.95*sh,0.86*sh);
  }
  for(p=0;p<NP;p++){var q=(p+1)%NP;cx.push(NP+p,q,p, NP+p,NP+q,q, 2*NP,NP+q,NP+p);}
  var cap=arrGeo(THREE,cp,cu,cc,cx);

  // ---- rubble heap skirt (inside the footprint, heavier on the side the wall fell) ----
  var hp=[],hu=[],hc=[],hx=[],M=NP/2,HD=[],j;
  for(j=0;j<M;j++){
    var Pq=pts[j*2],reach=0.2;
    if(Pq.nx>0.05)reach=Math.min(reach,(0.485-Pq.x)/Pq.nx);
    if(Pq.nx<-0.05)reach=Math.min(reach,(-0.485-Pq.x)/Pq.nx);
    if(Pq.nz>0.05)reach=Math.min(reach,(0.485-Pq.z)/Pq.nz);
    if(Pq.nz<-0.05)reach=Math.min(reach,(-0.485-Pq.z)/Pq.nz);
    var hh=0.035+0.11*Math.pow(Math.max(0,Math.cos(Pq.th-phiLow)),1.5)+0.03*R();
    hh=Math.min(hh,reach*1.2+0.02);
    HD.push({P:Pq,reach:reach,hh:hh});
    var ring=[[-0.03,hh],[0.25*reach,hh*0.85],[0.6*reach,hh*0.45],[reach,-0.012]];
    for(k=0;k<4;k++){
      var dd=ring[k][0],yy=ring[k][1];
      if(k===1||k===2){dd+=(R()-0.5)*0.12*reach;yy+=(R()-0.3)*0.02;}
      var tj=(k>0&&k<3)?(R()-0.5)*0.025:0;
      var hxp=cl(Pq.x+Pq.nx*dd-Pq.nz*tj,0.49),hzp=cl(Pq.z+Pq.nz*dd+Pq.nx*tj,0.49);
      hp.push(hxp,yy,hzp);hu.push((hxp*0.8-hzp*0.6)*2.1,(hzp*0.8+hxp*0.6)*2.1);
      var s2=(0.74+0.26*R())*(k===3?0.8:1);hc.push(s2,0.9*s2,0.82*s2);
    }
  }
  for(j=0;j<M;j++){var j2=(j+1)%M;for(k=0;k<3;k++){var a0=j*4+k,o0=a0+1,a1=j2*4+k,o1=a1+1;hx.push(a0,o1,o0, a0,a1,o1);}}
  var heap=arrGeo(THREE,hp,hu,hc,hx);

  // ---- loose / jutting bricks (hard-edged, chipped, mapped to a single brick of the atlas) ----
  function piece(o){
    var g=new THREE.BoxGeometry(o.w,o.h,o.d,1,1,1);g.clearGroups();
    var pa=g.attributes.position,ua=g.attributes.uv,Rp=mulberry32(o.seed),n,sd=o.seed%997;
    var sx=Rp()<0.5?-1:1,sy=Rp()<0.5?-1:1,sz=Rp()<0.5?-1:1;
    for(n=0;n<pa.count;n++){
      var X1=pa.getX(n),Y1=pa.getY(n),Z1=pa.getZ(n);
      if(o.chip&&(X1>0?1:-1)===sx&&(Y1>0?1:-1)===sy&&(Z1>0?1:-1)===sz){X1*=1-o.chip;Y1*=1-o.chip*0.7;Z1*=1-o.chip;}
      var n1=vnoise(X1*31+sd,Y1*31,Z1*31,sd),n2=vnoise(X1*29,Y1*29+sd,Z1*29,sd+1),n3=vnoise(X1*27,Y1*27,Z1*27+sd,sd+2);
      pa.setXYZ(n,X1*(1+0.07*n1),Y1*(1+0.06*n2),Z1*(1+0.07*n3));
    }
    var of2=(o.row&1)?CW/2:0,u0=(o.colm*CW+of2+MJ+7)/TS,u1=((o.colm+1)*CW+of2-MJ-7)/TS,v0=1-((o.row+1)*CH-MJ-6)/TS,v1=1-(o.row*CH+MJ+6)/TS;
    for(n=0;n<ua.count;n++)ua.setXY(n,u0+ua.getX(n)*(u1-u0),v0+ua.getY(n)*(v1-v0));
    var m=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(o.rx,o.ry,o.rz));m.setPosition(o.x,o.y,o.z);
    g.applyMatrix4(m);g.computeVertexNormals();
    var cols=[];for(n=0;n<pa.count;n++){var s3=o.shade*(0.9+0.1*Rp());cols.push(s3,s3*0.96,s3*0.92);}
    g.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));
    return g.toNonIndexed();
  }
  var pieces=[],cands=[],used=[],att;
  for(p=0;p<NP;p++)if(tops[p]>=0.7&&!pts[p].corner)cands.push(p);
  for(att=0;att<14&&used.length<3&&cands.length;att++){
    var pick=cands[(R()*cands.length)|0],ok=true;
    for(i=0;i<used.length;i++){var dpp=Math.abs(used[i]-pick);if(Math.min(dpp,NP-dpp)<5)ok=false;}
    if(!ok)continue;
    used.push(pick);
    var Pt=pts[pick],len=0.3,hb=0.072;
    var axisMax=Math.abs(Pt.nx)>Math.abs(Pt.nz)?(0.485-Math.abs(Pt.x))/Math.abs(Pt.nx):(0.485-Math.abs(Pt.z))/Math.abs(Pt.nz);
    var jut=Math.min(0.06+R()*0.05,axisMax-0.015),co=jut-len/2;
    pieces.push(piece({w:len,h:hb,d:0.15,x:Pt.x+Pt.nx*co,y:tops[pick]+hb*0.1,z:Pt.z+Pt.nz*co,
      rx:(R()-0.5)*0.1,ry:Math.atan2(-Pt.nz,Pt.nx)+(R()-0.5)*0.35,rz:-(0.04+R()*0.14),
      row:(R()*8)|0,colm:(R()*4)|0,seed:(R()*1e6)|0,chip:R()<0.5?0.45:0,shade:0.72}));
  }
  var fc=[];for(p=0;p<NP;p++)if(Math.abs(pts[p].nz)>0.95&&tops[p]>0.62)fc.push(p);
  if(fc.length){
    var Pf=pts[fc[(R()*fc.length)|0]];
    pieces.push(piece({w:0.3,h:0.07,d:0.14,x:Pf.x+Pf.nx*(0.05-0.15),y:0.375,z:Pf.z+Pf.nz*(0.05-0.15),
      rx:0,ry:Math.atan2(-Pf.nz,Pf.nx)+(R()-0.5)*0.2,rz:(R()-0.5)*0.08,
      row:(R()*8)|0,colm:(R()*4)|0,seed:(R()*1e6)|0,chip:0,shade:0.85}));
  }
  var wide=[];for(j=0;j<M;j++)if(HD[j].reach>=0.12)wide.push(HD[j]);
  for(k=0;k<6&&wide.length;k++){
    var e1=wide[(R()*wide.length)|0],e2=wide[(R()*wide.length)|0];
    var best=Math.cos(e1.P.th-phiLow)>Math.cos(e2.P.th-phiLow)?e1:e2;
    var fq=0.25+R()*0.45,dq=fq*best.reach;
    var hq=best.hh*(fq<0.6?0.85-0.4*(fq-0.25)/0.35:0.45*(1-(fq-0.6)/0.4));
    var fw=0.12+R()*0.08,fh=0.045+R()*0.02,fdp=0.08+R()*0.04;
    pieces.push(piece({w:fw,h:fh,d:fdp,x:cl(best.P.x+best.P.nx*dq,0.485-fw*0.5),y:hq+fh*0.15,z:cl(best.P.z+best.P.nz*dq,0.485-fw*0.5),
      rx:(R()-0.5)*0.7,ry:R()*Math.PI*2,rz:(R()-0.5)*0.7,
      row:(R()*8)|0,colm:(R()*4)|0,seed:(R()*1e6)|0,chip:0.35+R()*0.3,shade:0.82+R()*0.15}));
  }

  var geo=mergeAll(THREE,[wall.toNonIndexed(),cap.toNonIndexed(),heap.toNonIndexed()].concat(pieces));
  wall.dispose();cap.dispose();heap.dispose();
  geo.computeBoundingBox();geo.computeBoundingSphere();
  geo.name='twm-ruin';
  return geo;
}

window.TWM.ruin=function(THREE){
  if(CACHE)return CACHE;
  var T=makeTextures(THREE);
  var mat=new THREE.MeshStandardMaterial({map:T.map,bumpMap:T.bump,bumpScale:0.02,roughness:0.92,metalness:0,vertexColors:true});
  mat.name='twm-ruin';
  CACHE={geometry:build(THREE),material:mat};
  return CACHE;
};
})();
