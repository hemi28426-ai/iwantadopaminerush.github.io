/* Trench War models: WWI wattle (woven brushwood hurdle) revetment panel + rough timber post.
   TWM.revetPanel(THREE) -> {geometry, material}   (same object every call, single indexed geometry)
   TWM.revetPost(THREE)  -> {geometry, material}
   Geometry carries position/normal/uv/color (baked AO + bark tints); materials use vertexColors. */
(function(){
window.TWM=window.TWM||{};
var TWM=window.TWM;
var _tex=null,_panel=null,_post=null;
var PI=Math.PI,TAU=PI*2;

function mulberry32(a){return function(){a|=0;a=(a+0x6D2B79F5)|0;var t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}
function clamp(v,a,b){return v<a?a:(v>b?b:v);}
function lerp(a,b,t){return a+(b-a)*t;}
function sub(a,b){return[a[0]-b[0],a[1]-b[1],a[2]-b[2]];}
function add(a,b){return[a[0]+b[0],a[1]+b[1],a[2]+b[2]];}
function mul(a,s){return[a[0]*s,a[1]*s,a[2]*s];}
function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
function norm(a){var l=Math.sqrt(dot(a,a))||1;return[a[0]/l,a[1]/l,a[2]/l];}

/* ---------- texture atlas: rows 0..255 (v 0.5..1) = withy/timber bark, u along the stick;
   rows 256..511 (v 0..0.5) = dark packed earth for the backing (canvas x = world up). ---------- */
function getTexture(THREE){
  if(_tex)return _tex;
  var W=512,BH=256,E=256,i,j,k;
  var cv=document.createElement('canvas');cv.width=W;cv.height=W;
  var g=cv.getContext('2d');
  var R=mulberry32(48271);
  function col(r,gg,b,a){return'rgba('+(clamp(r,0,255)|0)+','+(clamp(gg,0,255)|0)+','+(clamp(b,0,255)|0)+','+a.toFixed(3)+')';}
  function wrap(y0,x,y,mx,my,fn){
    var xs=[x],ys=[y],a,b;
    if(x<mx)xs.push(x+W);if(x>W-mx)xs.push(x-W);
    if(y-y0<my)ys.push(y+BH);if(y0+BH-y<my)ys.push(y-BH);
    for(a=0;a<xs.length;a++)for(b=0;b<ys.length;b++)fn(xs[a],ys[b]);
  }
  function blob(y0,x,y,rx,ry,c,a){
    wrap(y0,x,y,rx+1,ry+1,function(px,py){
      g.save();g.translate(px,py);g.scale(1,ry/rx);
      var gr=g.createRadialGradient(0,0,0,0,0,rx);
      gr.addColorStop(0,col(c[0],c[1],c[2],a));gr.addColorStop(1,col(c[0],c[1],c[2],0));
      g.fillStyle=gr;g.beginPath();g.arc(0,0,rx,0,TAU);g.fill();g.restore();
    });
  }
  /* ---- band A: bark of hazel / willow withies, weathered brown-grey ---- */
  g.save();g.beginPath();g.rect(0,0,W,BH);g.clip();
  g.fillStyle='rgb(100,90,77)';g.fillRect(0,0,W,BH);
  for(i=0;i<110;i++){k=R();blob(0,R()*W,R()*BH,18+R()*70,5+R()*20,k<0.4?[134,126,112]:(k<0.75?[76,60,46]:[114,95,74]),0.14+R()*0.22);}
  g.lineCap='round';
  for(i=0;i<1300;i++){
    var fx=R()*W,fy=R()*BH,fl=12+R()*110,fw=(R()-0.5)*2.5,lt=R()<0.5;
    var fc=lt?[150+R()*35,138+R()*30,118+R()*25]:[48+R()*22,40+R()*18,32+R()*15];
    g.strokeStyle=col(fc[0],fc[1],fc[2],0.10+R()*0.32);g.lineWidth=0.5+R()*1.4;
    wrap(0,fx,fy,fl+3,4,function(px,py){g.beginPath();g.moveTo(px,py);g.quadraticCurveTo(px+fl*0.5,py+fw,px+fl,py+fw*0.4);g.stroke();});
  }
  for(i=0;i<480;i++){ /* lenticels: short pale dashes across the stem */
    var lx=R()*W,ly=R()*BH,lh=2+R()*5,lw=0.7+R()*1.1,la=0.35+R()*0.45;
    wrap(0,lx,ly,4,lh+2,function(px,py){
      g.fillStyle=col(38,30,24,la*0.7);g.beginPath();g.ellipse(px+0.9,py+0.4,lw,lh,0,0,TAU);g.fill();
      g.fillStyle=col(182,170,150,la);g.beginPath();g.ellipse(px,py,lw,lh,0,0,TAU);g.fill();
    });
  }
  for(i=0;i<12;i++){ /* nodes / bud scars */
    var nx=R()*W,nw=1.5+R()*3,na=0.22+R()*0.25,ny=R()*BH;
    wrap(0,nx,BH*0.5,nw+3,0,function(px){
      g.fillStyle=col(46,36,28,na);g.beginPath();g.ellipse(px,BH*0.5,nw,BH*0.6,0,0,TAU);g.fill();
      g.fillStyle=col(160,146,124,na*0.6);g.fillRect(px+nw,0,1.2,BH);
    });
    blob(0,nx+2,ny,5,7,[34,26,20],0.7);
  }
  for(i=0;i<34;i++){ /* lichen */
    var cx=R()*W,cy=R()*BH,cn=5+((R()*14)|0);
    for(j=0;j<cn;j++){
      var ox=(cx+(R()-0.5)*26+W)%W,oy=((cy+(R()-0.5)*14)%BH+BH)%BH,orr=0.7+R()*2.2,oa=0.2+R()*0.35,og=R()<0.5;
      wrap(0,ox,oy,4,4,function(px,py){g.fillStyle=og?col(146,150,126,oa):col(170,164,140,oa);g.beginPath();g.arc(px,py,orr,0,TAU);g.fill();});
    }
  }
  for(i=0;i<40;i++)blob(0,R()*W,R()*BH,4+R()*14,2+R()*6,[58,44,32],0.25+R()*0.3);
  g.restore();
  /* ---- band B: dark trench earth behind the wattle (canvas x = world up, y = world across) ---- */
  g.save();g.beginPath();g.rect(0,E,W,BH);g.clip();
  g.fillStyle='rgb(44,35,27)';g.fillRect(0,E,W,BH);
  for(i=0;i<520;i++){k=R();var brx=4+R()*24;blob(E,R()*W,E+R()*BH,brx,brx*(0.35+R()*0.4),k<0.35?[72,58,44]:(k<0.7?[28,22,17]:[58,50,42]),0.18+R()*0.3);}
  g.lineCap='round';
  for(i=0;i<45;i++){ /* pale roots */
    var rx0=R()*W,ry0=E+R()*BH,ra=R()*TAU,rl=20+R()*70,rb=(R()-0.5)*30,rex=Math.cos(ra)*rl,rey=Math.sin(ra)*rl*0.5,rA=0.3+R()*0.35,rt=0.6+R()*1.4;
    wrap(E,rx0,ry0,rl+4,rl*0.5+4,function(px,py){
      g.strokeStyle=col(118,98,74,rA);g.lineWidth=rt;g.beginPath();g.moveTo(px,py);
      g.quadraticCurveTo(px+rex*0.5+rb,py+rey*0.5-rb*0.5,px+rex,py+rey);g.stroke();
    });
  }
  for(i=0;i<170;i++){ /* packed brushwood twigs lying across (world horizontal) */
    var tx=R()*W,ty=E+R()*BH,tl=14+R()*80,tt=1.2+R()*3.2,ts=(R()-0.5)*0.5,tw=(R()-0.5)*4,td=R();
    var tc=td<0.6?[58+R()*20,48+R()*16,38+R()*12]:[86+R()*24,74+R()*20,60+R()*16],ta=0.5+R()*0.4;
    wrap(E,tx,ty,tl*Math.abs(ts)+tt+4,tl+3,function(px,py){
      g.strokeStyle=col(16,12,9,ta*0.8);g.lineWidth=tt+1.6;
      g.beginPath();g.moveTo(px-1.2,py);g.quadraticCurveTo(px-1.2+tw+tl*ts*0.5,py+tl*0.5,px-1.2+tl*ts,py+tl);g.stroke();
      g.strokeStyle=col(tc[0],tc[1],tc[2],ta);g.lineWidth=tt;
      g.beginPath();g.moveTo(px,py);g.quadraticCurveTo(px+tw+tl*ts*0.5,py+tl*0.5,px+tl*ts,py+tl);g.stroke();
      g.strokeStyle=col(tc[0]+50,tc[1]+44,tc[2]+36,ta*0.45);g.lineWidth=Math.max(0.6,tt*0.3);
      g.beginPath();g.moveTo(px+tt*0.3,py);g.quadraticCurveTo(px+tt*0.3+tw+tl*ts*0.5,py+tl*0.5,px+tt*0.3+tl*ts,py+tl);g.stroke();
    });
  }
  for(i=0;i<130;i++){ /* pebbles and flints */
    var px0=R()*W,py0=E+R()*BH,prx=1.5+R()*5,pry=prx*(0.4+R()*0.25),pg=78+R()*50;
    wrap(E,px0,py0,prx+3,pry+3,function(px,py){
      g.fillStyle=col(14,11,8,0.6);g.beginPath();g.ellipse(px-1.2,py,prx,pry,0,0,TAU);g.fill();
      g.fillStyle=col(pg,pg*0.94,pg*0.86,0.75);g.beginPath();g.ellipse(px,py,prx,pry,0,0,TAU);g.fill();
      g.fillStyle=col(pg+50,pg+46,pg+40,0.35);g.beginPath();g.ellipse(px+prx*0.35,py,prx*0.4,pry*0.5,0,0,TAU);g.fill();
    });
  }
  for(i=0;i<70;i++)blob(E,R()*W,E+R()*BH,3+R()*5,1.5+R()*2.5,[96,64,38],0.5);
  g.restore();
  var t=new THREE.CanvasTexture(cv);
  t.wrapS=THREE.RepeatWrapping;t.wrapT=THREE.RepeatWrapping;
  t.anisotropy=4;t.needsUpdate=true;
  _tex=t;return t;
}

/* ---------- tiny mesh builder: hint-oriented winding, area-weighted smooth normals shared by key ---------- */
function Mesh(){this.P=[];this.H=[];this.U=[];this.C=[];this.K=[];this.I=[];this.nk=0;}
Mesh.prototype.keys=function(n){var k=this.nk;this.nk+=n;return k;};
Mesh.prototype.v=function(p,h,u,v,c,k){
  var i=this.P.length/3;
  this.P.push(p[0],p[1],p[2]);this.H.push(h[0],h[1],h[2]);this.U.push(u,v);this.C.push(c[0],c[1],c[2]);
  this.K.push(k===undefined?this.nk++:k);return i;
};
Mesh.prototype.tri=function(a,b,c){
  var P=this.P,H=this.H,a3=a*3,b3=b*3,c3=c*3;
  var ux=P[b3]-P[a3],uy=P[b3+1]-P[a3+1],uz=P[b3+2]-P[a3+2],vx=P[c3]-P[a3],vy=P[c3+1]-P[a3+1],vz=P[c3+2]-P[a3+2];
  var nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
  if(nx*nx+ny*ny+nz*nz<1e-22)return;
  var hx=H[a3]+H[b3]+H[c3],hy=H[a3+1]+H[b3+1]+H[c3+1],hz=H[a3+2]+H[b3+2]+H[c3+2];
  if(nx*hx+ny*hy+nz*hz<0)this.I.push(a,c,b);else this.I.push(a,b,c);
};
Mesh.prototype.quad=function(a,b,c,d){this.tri(a,b,c);this.tri(a,c,d);};
Mesh.prototype.build=function(THREE){
  var P=this.P,I=this.I,K=this.K,H=this.H,nv=P.length/3,acc=new Float64Array(this.nk*3),t,i,q;
  for(t=0;t<I.length;t+=3){
    var a=I[t]*3,b=I[t+1]*3,c=I[t+2]*3;
    var ux=P[b]-P[a],uy=P[b+1]-P[a+1],uz=P[b+2]-P[a+2],vx=P[c]-P[a],vy=P[c+1]-P[a+1],vz=P[c+2]-P[a+2];
    var nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
    for(q=0;q<3;q++){var kk=K[I[t+q]]*3;acc[kk]+=nx;acc[kk+1]+=ny;acc[kk+2]+=nz;}
  }
  var N=new Float32Array(nv*3);
  for(i=0;i<nv;i++){
    var k=K[i]*3,x=acc[k],y=acc[k+1],z=acc[k+2],l=Math.sqrt(x*x+y*y+z*z);
    if(!(l>1e-30)){x=H[i*3];y=H[i*3+1];z=H[i*3+2];l=Math.sqrt(x*x+y*y+z*z)||1;}
    N[i*3]=x/l;N[i*3+1]=y/l;N[i*3+2]=z/l;
  }
  var g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));
  g.setAttribute('normal',new THREE.BufferAttribute(N,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(this.U,2));
  g.setAttribute('color',new THREE.Float32BufferAttribute(this.C,3));
  g.setIndex(I);
  g.computeBoundingBox();g.computeBoundingSphere();
  return g;
};

/* ---------- wattle panel ---------- */
function buildPanel(THREE){
  var m=new Mesh(),R=mulberry32(1917),ZS=-0.006,i,j,s;
  function bulge(x,y){var a=1-(x/0.62)*(x/0.62),yy=(y+0.08)/0.6,b=1-yy*yy;return 0.009*Math.max(0,a)*Math.max(0,b);}
  /* three thin stakes the withies are woven round */
  var SX=[-0.34,0,0.34],st=[],maxR=0;
  for(s=0;s<3;s++){var so={x:SX[s]+(R()-0.5)*0.014,r:0.0165+R()*0.004,lean:(R()-0.5)*0.014,top:0.482+R()*0.012,ph:R()*TAU,u:R()};st.push(so);if(so.r>maxR)maxR=so.r;}
  function sX(o,y){return o.x+o.lean*y;}
  function sZ(o,y){return ZS-bulge(sX(o,y),y);}
  for(s=0;s<3;s++){
    var o=st[s],NS=6,ys=[-0.5,-0.18,0.15,o.top-0.016],rows=[];
    for(i=0;i<ys.length;i++){
      var y=ys[i],cx=sX(o,y),cz=sZ(o,y),kb=m.keys(NS),row=[];
      for(j=0;j<=NS;j++){
        var th=(j%NS)/NS*TAU+o.ph,ct=Math.cos(th),sn=Math.sin(th);
        var rr=o.r*(1+0.07*Math.sin(th*2+i*1.7+o.ph)+0.04*Math.sin(th*3+i*2.3))*(i===ys.length-1?0.92:1);
        var ao=(0.74+0.26*clamp(0.5-0.5*sn,0,1))*(y<-0.3?lerp(0.6,1,(y+0.5)/0.2):1);
        row.push(m.v([cx+ct*rr,y,cz+sn*rr*0.94],[ct,0,sn],o.u+(y+0.5)*2.76,0.505+0.49*j/NS,[0.9*ao,0.85*ao,0.78*ao],kb+(j%NS)));
      }
      rows.push(row);
    }
    for(i=0;i<rows.length-1;i++)for(j=0;j<NS;j++)m.quad(rows[i][j],rows[i][j+1],rows[i+1][j+1],rows[i+1][j]);
    var tip=m.v([sX(o,o.top)+(R()-0.5)*0.006,o.top,sZ(o,o.top)],[0,1,0],o.u+(o.top+0.5)*2.76,0.75,[1.05,0.96,0.8]);
    var last=rows[rows.length-1];
    for(j=0;j<NS;j++)m.tri(last[j],last[j+1],tip);
  }
  /* woven withies: 11 rods, alternate in front of / behind the stakes, oval in Y (round after x2.4 stretch) */
  var NR=11,prev=1,RSD=5;
  var tints=[[0.98,0.95,0.92],[1.03,0.9,0.78],[1.0,0.84,0.72],[0.86,0.86,0.84],[0.8,0.74,0.67]];
  for(var r=0;r<NR;r++){
    var yc=clamp(-0.466+r*(0.932/(NR-1))+(R()-0.5)*0.032,-0.476,0.476);
    var rz=0.0132+R()*0.0053,ry=rz*0.42;
    var sg=(r%2===0)?1:-1;if(r>0&&R()<0.14)sg=prev;prev=sg;
    var dir=R()<0.5?1:-1,xL=-0.506-R()*0.026,xR=0.506+R()*0.026;
    var p1=R()*TAU,p2=R()*TAU,tilt=(R()-0.5)*0.012,zj=(R()-0.5)*0.003,uo=R()*4,rth=R()*TAU;
    var tn=tints[(R()*tints.length)|0],br=0.88+R()*0.22;
    var s0=sX(st[0],yc),s1=sX(st[1],yc),s2=sX(st[2],yc);
    var wv=function(x){return x<=s1?Math.cos(PI*(x-s0)/(s1-s0)):-Math.cos(PI*(x-s1)/(s2-s1));};
    var cen=function(x){
      var y=yc+0.0055*Math.sin(x*3.3+p1)+0.0028*Math.sin(x*8.1+p2)+tilt*x;
      var t=(x-xL)/(xR-xL),tt=dir>0?t:1-t;
      var sc=lerp(1.07,0.82,tt)*(1+0.03*Math.sin(x*21+p2));
      var w=sg*wv(x);
      return{p:[x,y,ZS-bulge(x,y)-w*(maxR+rz*sc+0.0013)+zj],sc:sc,w:w};
    };
    var xs=[xL,s0-0.085,s0,s0+0.075,s1-0.075,s1,s1+0.075,s2-0.075,s2,s2+0.085,xR],C=[],rrows=[];
    for(i=0;i<xs.length;i++)C.push(cen(xs[i]));
    for(i=0;i<xs.length;i++){
      var c=C[i].p,csc=C[i].sc,pa=C[Math.max(0,i-1)].p,pb=C[Math.min(xs.length-1,i+1)].p;
      var tg=norm(sub(pb,pa)),ax=norm(sub([0,1,0],mul(tg,tg[1]))),bx=cross(tg,ax);
      var rkb=m.keys(RSD),rrow=[],ryy=ry*csc,rzz=rz*csc,qx=0;
      for(s=0;s<3;s++){var dx=c[0]-sX(st[s],c[1]);qx=Math.max(qx,Math.exp(-(dx*dx)/0.0009));}
      for(j=0;j<=RSD;j++){
        var a=(j%RSD)/RSD*TAU+rth,ca=Math.cos(a),sa=Math.sin(a);
        var p=[c[0]+ax[0]*ca*ryy+bx[0]*sa*rzz,c[1]+ax[1]*ca*ryy+bx[1]*sa*rzz,c[2]+ax[2]*ca*ryy+bx[2]*sa*rzz];
        var h=norm([ax[0]*ca/ryy+bx[0]*sa/rzz,ax[1]*ca/ryy+bx[1]*sa/rzz,ax[2]*ca/ryy+bx[2]*sa/rzz]);
        var hw=norm([h[0],h[1]/2.4,h[2]]);
        var fac=C[i].w>0?Math.max(0,hw[2]):Math.max(0,-hw[2]);
        var f=(0.64+0.36*clamp(0.5-0.6*hw[2],0,1))*lerp(1,0.66,clamp((p[2]+0.05)/0.095,0,1))*(hw[1]<0?1+0.22*hw[1]:1)*(1-qx*(0.1+0.35*fac))*br;
        rrow.push(m.v(p,h,uo+c[0]*2.1,0.505+0.49*j/RSD,[tn[0]*f,tn[1]*f,tn[2]*f],rkb+(j%RSD)));
      }
      rrows.push(rrow);
    }
    for(i=0;i<rrows.length-1;i++)for(j=0;j<RSD;j++)m.quad(rrows[i][j],rrows[i][j+1],rrows[i+1][j+1],rrows[i+1][j]);
    /* cut ends sticking out past the panel edge */
    var n1=xs.length-1,c0=C[0].p,t0=norm(sub(c0,C[1].p)),cN=C[n1].p,tN=norm(sub(cN,C[n1-1].p));
    var cut=[1.1*br,0.98*br,0.8*br];
    var e0=m.v(add(c0,mul(t0,rz*C[0].sc*0.6)),t0,uo+xL*2.1-0.01,0.75,cut);
    var e1=m.v(add(cN,mul(tN,rz*C[n1].sc*0.6)),tN,uo+xR*2.1+0.01,0.75,cut);
    var r0=rrows[0],rN=rrows[n1];
    for(j=0;j<RSD;j++){m.tri(r0[j],r0[j+1],e0);m.tri(rN[j],rN[j+1],e1);}
  }
  /* dark earth backing just behind the weave (faces the trench, -Z) */
  var BX=6,BY=3,BR=[];
  for(i=0;i<=BY;i++){
    var by=-0.5+i/BY,brow=[];
    for(j=0;j<=BX;j++){
      var bxx=-0.5+j/BX,edge=(j===0||j===BX);
      var bz=0.053-bulge(bxx,by)*0.6+0.0035*Math.sin(TAU*bxx+by*5.3+0.7)+(edge?0:(R()-0.5)*0.004);
      var sh=0.44+0.1*R();
      brow.push(m.v([bxx,by,bz],[0,0,-1],(by+0.5)*2.4+0.37,0.005+(bxx+0.5)*0.49,[sh,sh*0.96,sh*0.92]));
    }
    BR.push(brow);
  }
  for(i=0;i<BY;i++)for(j=0;j<BX;j++)m.quad(BR[i][j],BR[i][j+1],BR[i+1][j+1],BR[i+1][j]);
  return m.build(THREE);
}

/* ---------- rough timber post: bark, knots + stubs, slight bend, axe-sharpened split top ---------- */
function buildPost(THREE){
  var m=new Mesh(),R=mulberry32(5150),NS=8,i,j,k;
  var bx=0.013*(R()<0.5?1:-1),bz=(R()-0.5)*0.012,ph=R()*TAU;
  function ax(y){var t=y+0.5;return[bx*Math.sin(t*PI*0.95+0.2)-bx*0.4+0.003*Math.sin(t*9+ph),y,bz*Math.sin(t*PI*1.2+0.9)];}
  var knots=[{y:-0.2,th:((R()*NS)|0)/NS*TAU,s:0.006,stub:true},{y:0.1,th:((R()*NS)|0)/NS*TAU,s:0.005,stub:false},{y:0.3,th:((R()*NS)|0)/NS*TAU,s:0.006,stub:true}];
  function adiff(a,b){var d=(a-b)%TAU;if(d>PI)d-=TAU;if(d<-PI)d+=TAU;return d;}
  function rad(th,y){
    var r=0.061*(1-0.07*(y+0.5));
    r*=1+0.05*Math.sin(2*th+1.3+y*2.2)+0.032*Math.sin(3*th+0.7-y*4.1)+0.018*Math.sin(5*th+y*9.0+ph);
    for(var q=0;q<knots.length;q++){var kn=knots[q],d=adiff(th,kn.th),dy=(y-kn.y)*2.5;r+=kn.s*Math.exp(-d*d/0.5-dy*dy/0.03);}
    return r;
  }
  var rows=[],tint=[0.93,0.87,0.8];
  for(i=0;i<10;i++){
    var y=-0.5+i*0.1,c=ax(y),kb=m.keys(NS),row=[];
    for(j=0;j<=NS;j++){
      var th=(j%NS)/NS*TAU,ct=Math.cos(th),sn=Math.sin(th),r=rad(th,y);
      var f=(y<-0.32?lerp(0.55,1,(y+0.5)/0.18):1)*(0.92+0.08*Math.sin(th*3+y*7));
      for(k=0;k<knots.length;k++){var kn=knots[k],d=adiff(th,kn.th),dy=(y-kn.y)*2.5;f*=1-0.45*Math.exp(-d*d/0.3-dy*dy/0.02);}
      row.push(m.v([c[0]+ct*r,y,c[2]+sn*r],[ct,0,sn],0.13+(y+0.5)*2.1,0.505+0.49*j/NS,[tint[0]*f,tint[1]*f,tint[2]*f],kb+(j%NS)));
    }
    rows.push(row);
  }
  for(i=0;i<rows.length-1;i++)for(j=0;j<NS;j++)m.quad(rows[i][j],rows[i][j+1],rows[i+1][j+1],rows[i+1][j]);
  /* wedge top: two hewn facets meet in a ridge, with a split notch in the middle */
  var A=rows[rows.length-1],yr=0.488,kk=0.7,cB=ax(0.45),Bb=[],Bf=[],Cr=[];
  var kbB=m.keys(NS),kbF=m.keys(NS),kbC=m.keys(NS),wood=[1.26,1.12,0.92];
  for(j=0;j<=NS;j++){
    var bth=(j%NS)/NS*TAU,bct=Math.cos(bth),bsn=Math.sin(bth),br=rad(bth,0.45)*0.985;
    var yB=yr-kk*br*Math.abs(bsn),crack=Math.abs(bct)<0.2?0.6:1,split=Math.abs(bct)<0.2;
    var pB=[cB[0]+bct*br,yB,cB[2]+bsn*br],ub=0.13+(yB+0.5)*2.1,vb=0.505+0.49*j/NS;
    Bb.push(m.v(pB,[bct,0,bsn],ub,vb,[tint[0]*crack,tint[1]*crack,tint[2]*crack],kbB+(j%NS)));
    var hf=[bct*0.4,0.8,bsn];
    Bf.push(m.v(pB,hf,ub,vb,[wood[0]*0.9,wood[1]*0.9,wood[2]*0.9],kbF+(j%NS)));
    var rsym=0.5*(rad(bth,0.45)+rad(TAU-bth,0.45))*0.985;
    var yC=yr+0.004*Math.sin(7*bct+ph)-(split?0.022:0);
    Cr.push(m.v([cB[0]+bct*rsym*0.86,yC,cB[2]],hf,0.13+(yC+0.5)*2.1,vb,split?[0.5,0.42,0.34]:wood,kbC+(j%NS)));
  }
  for(j=0;j<NS;j++){m.quad(A[j],A[j+1],Bb[j+1],Bb[j]);m.quad(Bf[j],Bf[j+1],Cr[j+1],Cr[j]);}
  /* lopped branch stubs at two knots */
  for(k=0;k<knots.length;k++){
    var kn2=knots[k];if(!kn2.stub)continue;
    var kc=ax(kn2.y),kr=rad(kn2.th,kn2.y),kct=Math.cos(kn2.th),ksn=Math.sin(kn2.th);
    var out=norm([kct,0.12,ksn]),base=[kc[0]+kct*(kr-0.004),kn2.y,kc[2]+ksn*(kr-0.004)],tan=[-ksn,0,kct];
    var tp=add(base,mul(out,0.026));tp[1]=kn2.y+0.004;
    var stip=m.v(tp,out,0.3,0.75,[1.12,0.98,0.8]),ring=[],skb=m.keys(5);
    for(j=0;j<=5;j++){
      var sa2=j/5*TAU,cca=Math.cos(sa2),ssa=Math.sin(sa2);
      ring.push(m.v([base[0]+tan[0]*cca*0.013,base[1]+ssa*0.013/2.5,base[2]+tan[2]*cca*0.013],add(mul(out,0.3),[tan[0]*cca,ssa,tan[2]*cca]),0.3+cca*0.02,0.6+0.1*ssa,[0.45,0.38,0.32],skb+(j%5)));
    }
    for(j=0;j<5;j++)m.tri(ring[j],ring[j+1],stip);
  }
  return m.build(THREE);
}

TWM.revetPanel=function(THREE){
  if(_panel)return _panel;
  THREE=THREE||window.THREE;
  var mat=new THREE.MeshStandardMaterial({map:getTexture(THREE),vertexColors:true,roughness:0.94,metalness:0});
  mat.name='twm_revetPanel';
  _panel={geometry:buildPanel(THREE),material:mat};
  return _panel;
};
TWM.revetPost=function(THREE){
  if(_post)return _post;
  THREE=THREE||window.THREE;
  var mat=new THREE.MeshStandardMaterial({map:getTexture(THREE),vertexColors:true,roughness:0.9,metalness:0});
  mat.name='twm_revetPost';
  _post={geometry:buildPost(THREE),material:mat};
  return _post;
};
})();
