// Trench War - bomb-site marker sign (site A / B). Plain script, three.js r128.
(function(){
window.TWM=window.TWM||{};
var T=null,C={},LET={},TAU=Math.PI*2;
function hash(x,y,z){var h=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return h-Math.floor(h);}
function lerp(a,b,t){return a+(b-a)*t;}
function noise3(x,y,z){
  var ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),fx=x-ix,fy=y-iy,fz=z-iz;
  fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);fz=fz*fz*(3-2*fz);
  return lerp(lerp(lerp(hash(ix,iy,iz),hash(ix+1,iy,iz),fx),lerp(hash(ix,iy+1,iz),hash(ix+1,iy+1,iz),fx),fy),
    lerp(lerp(hash(ix,iy,iz+1),hash(ix+1,iy,iz+1),fx),lerp(hash(ix,iy+1,iz+1),hash(ix+1,iy+1,iz+1),fx),fy),fz)*2-1;
}
function sstep(a,b,x){var t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);}
function rng(s){s=(s>>>0)||1;return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
// smooth normals across coincident vertices (seams, poles, non-indexed faces); th = min dot to merge
function weld(g,th,s,c){
  var p=g.attributes.position,n=g.attributes.normal,m={},i,j,k,L,o;
  th=th===undefined?-2:th;s=s||0;c=c||p.count;o=new Float32Array(c*3);
  function key(i){return Math.round(p.getX(i)*2e3)+'_'+Math.round(p.getY(i)*2e3)+'_'+Math.round(p.getZ(i)*2e3);}
  for(i=s;i<s+c;i++){k=key(i);(m[k]||(m[k]=[])).push(i);}
  for(i=s;i<s+c;i++){
    L=m[key(i)];var x=0,y=0,z=0,nx=n.getX(i),ny=n.getY(i),nz=n.getZ(i);
    for(j=0;j<L.length;j++){var q=L[j],ax=n.getX(q),ay=n.getY(q),az=n.getZ(q);if(ax*nx+ay*ny+az*nz>th){x+=ax;y+=ay;z+=az;}}
    var l=Math.sqrt(x*x+y*y+z*z)||1;o[(i-s)*3]=x/l;o[(i-s)*3+1]=y/l;o[(i-s)*3+2]=z/l;
  }
  for(i=0;i<c;i++)n.setXYZ(s+i,o[i*3],o[i*3+1],o[i*3+2]);
  n.needsUpdate=true;return g;
}
function tex(w,h,draw,rx,ry){
  var c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);
  var t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;t.repeat.set(rx||1,ry||1);return t;
}
function wrap(w,h,x,y,fn){for(var i=-1;i<2;i++)for(var j=-1;j<2;j++)fn(x+i*w,y+j*h);}
function blobs(g,w,h,R,n,rgb,a,r0,r1,sq){
  for(var i=0;i<n;i++){
    var x=R()*w,y=R()*h,rad=r0+R()*(r1-r0),c=rgb(R),s='rgba('+(c[0]|0)+','+(c[1]|0)+','+(c[2]|0)+',';
    wrap(w,h,x,y,function(X,Y){var gr=g.createRadialGradient(X,Y,0,X,Y,rad);gr.addColorStop(0,s+a+')');gr.addColorStop(1,s+'0)');
      g.fillStyle=gr;g.beginPath();g.ellipse(X,Y,rad,rad*(sq||1),0,0,TAU);g.fill();});
  }
}
// bark patches: shared by the post texture and the post geometry (raised bark)
function barkMask(u,v){var a=v*TAU,c=Math.cos(a),s=Math.sin(a);
  return sstep(0.04,0.2,noise3(u*7+3.1,c*1.3,s*1.3)*0.75+noise3(u*19,c*3+5,s*3)*0.35);}
function barkTex(){return tex(512,128,function(g,w,h){
  var id=g.createImageData(w,h),d=id.data,px,py;
  for(py=0;py<h;py++)for(px=0;px<w;px++){
    var u=px/w,v=1-py/h,a=v*TAU,c=Math.cos(a),s=Math.sin(a),m=barkMask(u,v);
    var gr=noise3(u*5,c*14,s*14)*0.5+noise3(u*40,c*30,s*30)*0.25,n=noise3(u*12+9,c*3,s*3);
    var R=118+n*14+gr*34,G=94+n*12+gr*27,B=70+n*10+gr*20;
    var k=0.35+0.3*sstep(-0.3,0.4,noise3(u*3,c*2+4,s*2));
    R=lerp(R,104+gr*22,k);G=lerp(G,98+gr*20,k);B=lerp(B,88+gr*17,k);
    var cr=Math.abs(noise3(u*9+1,c*10,s*10)),f=cr<0.07?0.45+0.55*cr/0.07:1;
    R=lerp(R,(58+n*10)*f,m);G=lerp(G,(47+n*8)*f,m);B=lerp(B,(38+n*6)*f,m);
    var rim=4*m*(1-m)*0.55;R=lerp(R,128,rim);G=lerp(G,80,rim);B=lerp(B,50,rim);
    var mud=(1-sstep(0.12,0.26,u+n*0.03))*0.85;R=lerp(R,48,mud);G=lerp(G,38,mud);B=lerp(B,28,mud);
    k=(py*w+px)*4;d[k]=R;d[k+1]=G;d[k+2]=B;d[k+3]=255;
  }
  g.putImageData(id,0,0);
},1,1);}
function earthTex(){return tex(128,128,function(g,w,h){var R=rng(11),i;
  g.fillStyle='#4a3a2b';g.fillRect(0,0,w,h);
  blobs(g,w,h,R,40,function(R){return R()<0.5?[32,24,17]:[98,80,60];},0.35,6,22,0.7);
  blobs(g,w,h,R,90,function(R){return R()<0.5?[60,47,35]:[80,64,47];},0.5,2,7,0.8);
  for(i=0;i<70;i++){(function(x,y,r,l,rt){wrap(w,h,x,y,function(X,Y){
    g.fillStyle='rgba(20,15,10,0.6)';g.beginPath();g.ellipse(X+0.6,Y+0.7,r,r*0.8,rt,0,TAU);g.fill();
    g.fillStyle='rgb('+l+','+(l-8)+','+(l-20)+')';g.beginPath();g.ellipse(X,Y,r,r*0.8,rt,0,TAU);g.fill();});
  })(R()*w,R()*h,0.6+R()*1.8,110+R()*50|0,R()*3);}
  g.lineCap='round';g.lineWidth=0.8;g.strokeStyle='rgba(120,98,62,0.55)';
  for(i=0;i<14;i++){(function(x,y,a,L){wrap(w,h,x,y,function(X,Y){g.beginPath();g.moveTo(X,Y);
    g.quadraticCurveTo(X+Math.cos(a+0.6)*L*0.5,Y+Math.sin(a+0.6)*L*0.5,X+Math.cos(a)*L,Y+Math.sin(a)*L);g.stroke();});
  })(R()*w,R()*h,R()*TAU,8+R()*16);}
},5,1);}
function burlapTex(){return tex(128,128,function(g,w,h){var R=rng(23),i;
  g.fillStyle='#86704e';g.fillRect(0,0,w,h);
  for(i=0;i<h;i+=4){g.fillStyle='rgba(50,38,22,'+(0.25+R()*0.2)+')';g.fillRect(0,i,w,1.3);}
  for(i=0;i<w;i+=4){g.fillStyle='rgba(175,150,105,'+(0.18+R()*0.15)+')';g.fillRect(i+1,0,1.4,h);}
  blobs(g,w,h,R,26,function(R){return R()<0.6?[52,40,26]:[150,128,92];},0.4,5,20,0.6);
},3,2);}
function stoneTex(){return tex(64,64,function(g,w,h){var R=rng(37);
  g.fillStyle='#74706a';g.fillRect(0,0,w,h);
  blobs(g,w,h,R,30,function(R){var l=80+R()*70;return [l,l-3,l-8];},0.5,3,12,1);
  blobs(g,w,h,R,10,function(){return [120,122,80];},0.35,2,6,0.8);
  blobs(g,w,h,R,40,function(){return [30,28,26];},0.5,0.6,1.8,1);
},2,2);}
function rustTex(){return tex(64,64,function(g,w,h){var R=rng(41);
  g.fillStyle='#3e352e';g.fillRect(0,0,w,h);
  blobs(g,w,h,R,30,function(R){return R()<0.5?[128,64,28]:[70,40,24];},0.55,2,10,1);
  blobs(g,w,h,R,20,function(){return [24,22,20];},0.5,1,5,1);
},1,1);}
function drawWood(g,w,h,R){
  var i,k,x,y,s=w/512;
  g.fillStyle='#3d2f23';g.fillRect(0,0,w,h);
  for(i=0;i<26;i++){var yy=R()*h,gr=g.createLinearGradient(0,yy-30*s,0,yy+30*s),c=R()<0.5?'60,46,34':'92,86,76';
    gr.addColorStop(0,'rgba('+c+',0)');gr.addColorStop(0.5,'rgba('+c+',0.35)');gr.addColorStop(1,'rgba('+c+',0)');
    g.fillStyle=gr;g.fillRect(0,yy-30*s,w,60*s);}
  for(i=0;i<240;i++){y=R()*h;var ph=R()*TAU,f=0.004+R()*0.01,am=(1+R()*5)*s,dark=R()<0.62;
    g.strokeStyle=dark?'rgba(22,15,10,'+(0.15+R()*0.35)+')':'rgba(140,128,110,'+(0.08+R()*0.18)+')';
    g.lineWidth=(0.5+R()*2.2)*s;g.beginPath();for(x=0;x<=w;x+=16*s)g.lineTo(x,y+Math.sin(x/s*f+ph)*am);g.stroke();}
  for(i=0;i<3;i++){x=R()*w;y=R()*h;for(k=5;k>0;k--){g.strokeStyle='rgba(20,12,8,'+(0.2+0.1*k)+')';g.lineWidth=1.5*s;
    g.beginPath();g.ellipse(x,y,k*5*s,k*2.2*s,0,0,TAU);g.stroke();}}
}
// ---- post: hewn, crooked, leaning; custom tube with bark patches and soft axe facets ----
var PTS=[[0,-0.35,0],[0.012,0.6,-0.01],[0.035,1.5,0.012],[0.075,2.35,0],[0.11,3.0,-0.012],[0.13,3.4,-0.016]];
function postCurve(){return C.curve||(C.curve=new T.CatmullRomCurve3(PTS.map(function(p){return new T.Vector3(p[0],p[1],p[2]);})));}
function postR(t){return (0.088-0.026*t)*(1+0.035*Math.sin(t*19+1.3));}
function postAtY(y){var cv=postCurve(),best=0,bd=1e9,P=new T.Vector3();
  for(var t=0;t<=1;t+=0.002){cv.getPointAt(t,P);var d=Math.abs(P.y-y);if(d<bd){bd=d;best=t;}}
  return {t:best,p:cv.getPointAt(best),tan:cv.getTangentAt(best)};}
function postGeo(){
  var cv=postCurve(),RS=9,ts=[],i,j,pos=[],uv=[],idx=[];
  for(i=0;i<=16;i++)ts.push(i/16*0.95);ts.push(0.968,0.982,0.993);
  var P=new T.Vector3(),Tg=new T.Vector3(),N=new T.Vector3(),B=new T.Vector3(),Z=new T.Vector3(0,0,1);
  for(i=0;i<ts.length;i++){var t=ts[i];cv.getPointAt(t,P);cv.getTangentAt(t,Tg);
    N.crossVectors(Tg,Z).normalize();B.crossVectors(Tg,N).normalize();
    var dome=t>0.95?Math.sqrt(Math.max(0,1-Math.pow((t-0.95)/0.05,2))):1;
    for(j=0;j<=RS;j++){var v=j/RS,a=v*TAU,c=Math.cos(a),s=Math.sin(a),m=barkMask(t,v);
      var r=postR(t)*dome*(1+(1-m)*(0.05*Math.cos(5*a+t*4)+0.03*Math.cos(3*a+1+t*7))+0.07*m+0.05*noise3(c*1.5,t*14,s*1.5));
      pos.push(P.x+(N.x*c+B.x*s)*r,P.y+(N.y*c+B.y*s)*r,P.z+(N.z*c+B.z*s)*r);uv.push(t,v);}}
  cv.getPointAt(1,P);pos.push(P.x,P.y+0.004,P.z);uv.push(1,0.5);
  var RW=RS+1,nr=ts.length,ap=nr*RW,top=(nr-1)*RW;
  for(i=0;i<nr-1;i++)for(j=0;j<RS;j++){var a0=i*RW+j,a1=a0+1,b0=a0+RW,b1=b0+1;idx.push(a0,a1,b0,a1,b1,b0);}
  for(j=0;j<RS;j++)idx.push(top+j,top+j+1,ap);
  var g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));
  g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return weld(g);
}
// ---- earth mound ----
var PROF=[[0.84,-0.04],[0.7,0.03],[0.56,0.09],[0.42,0.165],[0.28,0.24],[0.14,0.288],[0.001,0.3]];
function moundY(r){for(var i=PROF.length-1;i>0;i--){var a=PROF[i],b=PROF[i-1];if(r<=b[0])return lerp(a[1],b[1],(r-a[0])/(b[0]-a[0]));}return -0.05;}
function moundGeo(){
  var g=new T.LatheGeometry(PROF.map(function(p){return new T.Vector2(p[0],p[1]);}),16),p=g.attributes.position,i;
  for(i=0;i<p.count;i++){var x=p.getX(i),y=p.getY(i),z=p.getZ(i),r=Math.hypot(x,z),a=Math.atan2(z,x);
    var f=1+0.13*noise3(Math.cos(a)*1.4,4.2,Math.sin(a)*1.4)*sstep(0.1,0.5,r);
    y+=(0.03*noise3(x*4.5,1.7,z*4.5)+0.014*noise3(x*11,5.1,z*11))*sstep(0.05,0.25,r)*(1-sstep(0.7,0.84,r)*0.6);
    p.setXYZ(i,x*f,y,z*f);}
  g.computeVertexNormals();return weld(g);
}
// ---- slumped sandbag (tied neck at +x) ----
function bagGeo(sd){
  var g=new T.SphereGeometry(1,11,7),p=g.attributes.position,i;
  for(i=0;i<p.count;i++){var x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    var X=x*0.3,Y=y*0.12,Z=z*0.17*(1+0.18*(1-y));
    if(Y<0)Y*=0.35;else Y*=0.72+0.28*x*x;
    if(x>0.72){var f=Math.pow((x-0.72)/0.28,1.4);Y*=1-0.6*f;Z*=1-0.6*f;X+=0.05*f;}
    Y+=0.014*noise3(x*3+sd,y*3,z*3)*(y>-0.2?1:0.3)-0.03*x*x;Z+=0.01*noise3(x*5,y*5+sd,z*5);
    p.setXYZ(i,X,Y,Z);}
  g.computeVertexNormals();return weld(g);
}
// ---- field stones ----
function stoneGeo(sd,det){
  var g=new T.IcosahedronGeometry(1,det),p=g.attributes.position,i;
  for(i=0;i<p.count;i++){var x=p.getX(i),y=p.getY(i),z=p.getZ(i),f=1+0.28*noise3(x*1.3+sd,y*1.3,z*1.3)+0.08*noise3(x*3.5,y*3.5+sd,z*3.5);
    x*=f;y*=f;z*=f;if(y<-0.35)y=-0.35+(y+0.35)*0.25;p.setXYZ(i,x,y,z);}
  g.computeVertexNormals();return weld(g);
}
// ---- oil lantern + bent iron hook ----
function lathe(pts,seg){return new T.LatheGeometry(pts.map(function(p){return new T.Vector2(p[0],p[1]);}),seg);}
function lanternGeos(){
  if(C.lan)return C.lan;
  var parts=[lathe([[0.001,0],[0.055,0.002],[0.07,0.02],[0.064,0.045],[0.035,0.056]],10),
    lathe([[0.026,0.188],[0.05,0.196],[0.046,0.21],[0.02,0.232],[0.012,0.25]],10)];
  for(var k=0;k<3;k++){var a=k/3*TAU+0.5,c=Math.cos(a),s=Math.sin(a);
    parts.push(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(c*0.064,0.045,s*0.064),new T.Vector3(c*0.075,0.115,s*0.075),new T.Vector3(c*0.05,0.198,s*0.05)]),6,0.0028,3,false));}
  var bail=new T.TorusGeometry(0.06,0.0035,3,8,Math.PI);bail.rotateY(Math.PI/2);bail.translate(0,0.205,0);parts.push(bail);
  var fl=new T.SphereGeometry(0.011,6,4);fl.scale(1,2.2,1);fl.translate(0,0.088,0);
  return C.lan={metal:T.BufferGeometryUtils.mergeBufferGeometries(parts),
    glass:lathe([[0.034,0.054],[0.052,0.08],[0.061,0.115],[0.056,0.15],[0.04,0.178],[0.028,0.19]],12),flame:fl};
}
function hookGeo(c){
  var P=[[0,0,0],[0.11,0.012,0.004],[0.22,0,0.006],[0.285,-0.042,0.004],[0.315,-0.056,0],[0.34,-0.036,-0.002],[0.346,0,-0.002]];
  return new T.TubeGeometry(new T.CatmullRomCurve3(P.map(function(p){return new T.Vector3(c.x+p[0],c.y+p[1],c.z+p[2]);})),12,0.0075,5,false);
}
// ---- signboard: irregular shield cut into 3 planks with gaps ----
function outline(R){
  var pts=[],N=30;
  for(var i=0;i<N;i++){var th=i/N*TAU,c=Math.cos(th),s=Math.sin(th),x,y,sg=c<0?-1:1;
    if(s>=0){x=0.555*sg*Math.pow(Math.abs(c),0.72);y=0.405*Math.pow(s,0.85);}
    else{var q=Math.pow(-s,1.15);x=0.555*sg*Math.pow(Math.abs(c),0.9)*(1-0.3*q);y=-0.5*Math.pow(-s,0.9);}
    var k=1+0.028*noise3(c*1.7,s*1.7,3.3+R()*0.05)+(R()-0.5)*0.012;
    pts.push(new T.Vector2(x*k,y*k+0.03*x*x));}
  return pts;
}
function clipL(pts,y0,sl,above){var out=[],n=pts.length;
  for(var i=0;i<n;i++){var a=pts[i],b=pts[(i+1)%n],fa=a.y-y0-sl*a.x,fb=b.y-y0-sl*b.x,ia=above?fa>=0:fa<=0,ib=above?fb>=0:fb<=0;
    if(ia)out.push(a);if(ia!==ib){var t=fa/(fa-fb);out.push(new T.Vector2(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t));}}
  return out;}
function refine(pts,R){var o=[],n=pts.length,i,k;
  for(i=0;i<n;i++){var a=pts[i],b=pts[(i+1)%n],d=a.distanceTo(b);
    if(o.length&&o[o.length-1].distanceTo(a)<0.004)continue;o.push(a);
    if(d>0.25)for(k=1;k<3;k++){var t=k/3,j=(R()-0.5)*0.005;
      o.push(new T.Vector2(a.x+(b.x-a.x)*t-(b.y-a.y)/d*j,a.y+(b.y-a.y)*t+(b.x-a.x)/d*j));}}
  if(o.length>3&&o[0].distanceTo(o[o.length-1])<0.004)o.pop();return o;}
function sub(g,gr){var o=new T.BufferGeometry();
  ['position','normal','uv'].forEach(function(k){var a=g.attributes[k];
    o.setAttribute(k,new T.BufferAttribute(a.array.slice(gr.start*a.itemSize,(gr.start+gr.count)*a.itemSize),a.itemSize));});
  return o;}
function nailGeo(){var g=new T.CircleGeometry(0.011,7);g.attributes.position.setZ(0,0.0025);g.computeVertexNormals();return g;}
function letterTex(letter,R,bb,nails){return tex(512,512,function(g,w,h){
  var k,x,y,q,cx=(0-bb.minX)/bb.W*w,cy=(1-(0-bb.minY)/bb.H)*h;
  drawWood(g,w,h,R);
  blobs(g,w,h,R,14,function(){return [118,112,100];},0.16,40,110,0.6);
  var L=document.createElement('canvas');L.width=w;L.height=h;var l=L.getContext('2d');
  l.font='bold 420px Georgia,"Times New Roman",serif';l.textAlign='center';
  var mt=l.measureText(letter),yo=((mt.actualBoundingBoxAscent||290)-(mt.actualBoundingBoxDescent||0))/2;
  g.save();g.font=l.font;g.textAlign='center';g.fillStyle='rgba(18,11,6,0.35)';g.fillText(letter,cx+3,cy+yo+4);g.restore();
  l.fillStyle='#f0c040';
  for(k=0;k<6;k++){l.globalAlpha=k?0.4:1;l.save();l.translate(cx+(k?(R()-0.5)*12:0),cy+(k?(R()-0.5)*10:0));
    l.rotate((R()-0.5)*0.04);l.fillText(letter,0,yo);l.restore();}
  l.globalAlpha=1;l.globalCompositeOperation='source-atop';l.lineCap='round';
  for(k=0;k<300;k++){x=R()*w;y=R()*h;var len=20+R()*70,an=(R()-0.5)*0.6+(R()<0.5?0:Math.PI/2);
    l.strokeStyle=R()<0.5?'rgba(170,110,20,0.35)':'rgba(255,232,140,0.3)';l.lineWidth=0.8+R()*2.5;
    l.beginPath();l.moveTo(x,y);l.lineTo(x+Math.cos(an)*len,y+Math.sin(an)*len);l.stroke();}
  // drips from lower paint edges
  var id=l.getImageData(0,0,w,h).data,nd=0;l.globalCompositeOperation='source-over';
  for(k=0;k<80&&nd<15;k++){x=(cx-160+R()*320)|0;y=(70+R()*380)|0;if(x<0||x>=w||id[(y*w+x)*4+3]<128)continue;
    while(y<h-1&&id[(y*w+x)*4+3]>=128)y++;var dw=1.6+R()*3,dl=8+Math.pow(R(),1.5)*60;nd++;
    l.fillStyle=R()<0.5?'#e6b436':'#f0c040';l.beginPath();l.moveTo(x-dw,y-4);
    l.quadraticCurveTo(x-dw*0.5,y+dl*0.6,x-dw*0.45,y+dl);l.arc(x,y+dl,dw*0.45,Math.PI,0,true);
    l.quadraticCurveTo(x+dw*0.5,y+dl*0.6,x+dw,y-4);l.closePath();l.fill();
    l.beginPath();l.arc(x,y+dl,dw*0.75,0,TAU);l.fill();}
  // chips + weathered thinning along the grain
  l.globalCompositeOperation='destination-out';
  for(k=0;k<110;k++){x=R()*w;y=R()*h;var r=1.2+Math.pow(R(),2.2)*12,a0=R()*TAU;l.globalAlpha=R()<0.25?0.5:1;l.beginPath();
    for(q=0;q<7;q++){var aa=a0+q/7*TAU,rr=r*(0.45+R()*0.75);l.lineTo(x+Math.cos(aa)*rr,y+Math.sin(aa)*rr*0.75);}l.closePath();l.fill();}
  for(k=0;k<26;k++){l.globalAlpha=0.1+R()*0.2;l.lineWidth=2+R()*7;y=R()*h;l.beginPath();
    for(x=0;x<=w;x+=32)l.lineTo(x,y+(R()-0.5)*4);l.stroke();}
  l.globalAlpha=1;l.globalCompositeOperation='source-over';
  g.drawImage(L,0,0);
  g.globalCompositeOperation='multiply';
  for(k=0;k<90;k++){y=R()*h;var ph=R()*TAU;g.strokeStyle='rgba(90,70,50,'+(0.15+R()*0.25)+')';g.lineWidth=0.6+R()*1.6;
    g.beginPath();for(x=0;x<=w;x+=16)g.lineTo(x,y+Math.sin(x*0.01+ph)*3);g.stroke();}
  for(k=0;k<300;k++){g.fillStyle='rgba(60,45,30,'+(0.2+R()*0.4)+')';g.beginPath();g.arc(R()*w,R()*h,0.5+R()*1.6,0,TAU);g.fill();}
  g.globalCompositeOperation='source-over';
  nails.forEach(function(n){var nx=(n[0]-bb.minX)/bb.W*w,ny=(1-(n[1]-bb.minY)/bb.H)*h,gr=g.createLinearGradient(0,ny,0,ny+55);
    gr.addColorStop(0,'rgba(115,52,20,0.6)');gr.addColorStop(1,'rgba(115,52,20,0)');g.fillStyle=gr;
    g.beginPath();g.ellipse(nx,ny+24,4.5,28,0,0,TAU);g.fill();
    g.fillStyle='rgba(30,18,10,0.6)';g.beginPath();g.arc(nx,ny,9,0,TAU);g.fill();});
  var vg=g.createRadialGradient(w/2,h/2,w*0.3,w/2,h/2,w*0.62);vg.addColorStop(0,'rgba(15,10,6,0)');vg.addColorStop(1,'rgba(15,10,6,0.45)');
  g.fillStyle=vg;g.fillRect(0,0,w,h);
},1,1);}
function board(letter){
  if(LET[letter])return LET[letter];
  var R=rng(letter.charCodeAt(0)*7919+17),out=outline(R),i,b,q,bb={minX:1e9,maxX:-1e9,minY:1e9,maxY:-1e9};
  out.forEach(function(p){bb.minX=Math.min(bb.minX,p.x);bb.maxX=Math.max(bb.maxX,p.x);bb.minY=Math.min(bb.minY,p.y);bb.maxY=Math.max(bb.maxY,p.y);});
  bb.minX-=0.01;bb.minY-=0.01;bb.maxX+=0.01;bb.maxY+=0.01;bb.W=bb.maxX-bb.minX;bb.H=bb.maxY-bb.minY;
  var c1=0.13+(R()-0.5)*0.03,s1=(R()-0.5)*0.05,c2=-0.19+(R()-0.5)*0.03,s2=(R()-0.5)*0.05,gp=0.016+R()*0.008;
  var bands=[clipL(out,c1+gp/2,s1,true),clipL(clipL(out,c2+gp/2,s2,true),c1-gp/2,s1,false),clipL(out,c2-gp/2,s2,false)];
  var D=0.03,BT=0.006,caps=[],sides=[],nails=[],nailPts=[],m=new T.Matrix4(),e=new T.Euler(),U=T.BufferGeometryUtils;
  for(b=0;b<3;b++){
    var g=new T.ExtrudeGeometry(new T.Shape(refine(bands[b],R)),{depth:D,bevelEnabled:true,bevelThickness:BT,bevelSize:BT,bevelSegments:1,steps:1,curveSegments:1});
    var p=g.attributes.position,uv=g.attributes.uv,g0=g.groups[0],g1=g.groups[1];
    for(i=g0.start;i<g0.start+g0.count;i++)uv.setXY(i,(p.getX(i)-bb.minX)/bb.W,(p.getY(i)-bb.minY)/bb.H);
    uv.needsUpdate=true;weld(g,0.5,g1.start,g1.count);
    e.set((R()-0.5)*0.016,(R()-0.5)*0.016,(R()-0.5)*0.036);m.makeRotationFromEuler(e);
    m.setPosition((R()-0.5)*0.008,(R()-0.5)*0.006,(R()-0.5)*0.004);g.applyMatrix4(m);
    caps.push(sub(g,g0));sides.push(sub(g,g1));
    var yc=b===0?(c1+0.4)/2:b===1?(c1+c2)/2:(c2-0.4)/2;
    for(q=0;q<2;q++){var nx=q?0.03:-0.028,ny=yc+(q?-0.03:0.035)*(b===1?1:0.6);nailPts.push([nx,ny]);
      var ng=nailGeo();ng.translate(nx,ny,D+BT+0.0004);ng.applyMatrix4(m);nails.push(ng);}
  }
  var geo=U.mergeBufferGeometries([U.mergeBufferGeometries(caps),U.mergeBufferGeometries(sides)],true);
  var lt=letterTex(letter,R,bb,nailPts);
  return LET[letter]={geo:geo,nails:U.mergeBufferGeometries(nails),
    mat:new T.MeshStandardMaterial({map:lt,bumpMap:lt,bumpScale:0.012,roughness:0.82,metalness:0})};
}
// ---- assembly: base at y=0, ~3.4 m tall; letter readable from +Z and -Z (double-faced board) ----
TWM.siteSign=function(THREE,letter){
  T=THREE;letter=(String(letter||'A').toUpperCase().charAt(0))||'A';
  if(!C.mats){var bk=barkTex(),ea=earthTex(),bu=burlapTex(),st=stoneTex(),ru=rustTex();
    C.mats={post:new T.MeshStandardMaterial({map:bk,bumpMap:bk,bumpScale:0.025,roughness:0.92,metalness:0}),
      earth:new T.MeshStandardMaterial({map:ea,bumpMap:ea,bumpScale:0.04,roughness:1,metalness:0}),
      bag:new T.MeshStandardMaterial({map:bu,bumpMap:bu,bumpScale:0.02,roughness:0.97,metalness:0}),
      stone:new T.MeshStandardMaterial({map:st,bumpMap:st,bumpScale:0.02,roughness:0.86,metalness:0}),
      iron:new T.MeshStandardMaterial({map:ru,color:0xb0a090,roughness:0.68,metalness:0.55}),
      edge:new T.MeshStandardMaterial({map:tex(256,256,function(g,w,h){drawWood(g,w,h,rng(5));},2,2),roughness:0.9,metalness:0}),
      glass:new T.MeshStandardMaterial({color:0xffd9a0,emissive:0xff9a3c,emissiveIntensity:0.55,roughness:0.12,metalness:0,transparent:true,opacity:0.72,depthWrite:false}),
      flame:new T.MeshStandardMaterial({color:0xffc060,emissive:0xffa040,emissiveIntensity:2.2,roughness:1,metalness:0})};
    C.post=postGeo();C.mound=moundGeo();C.bags=[bagGeo(0),bagGeo(7.3)];C.stones=[stoneGeo(0,1),stoneGeo(5.5,1),stoneGeo(9.1,0)];
    C.pa=postAtY(2.62);C.ph=postAtY(1.98);C.hook=hookGeo(C.ph.p);}
  var M=C.mats,root=new T.Object3D(),Bd=board(letter);root.name='siteSign_'+letter;
  function add(g,m,par){var o=new T.Mesh(g,m);o.castShadow=true;o.receiveShadow=true;(par||root).add(o);return o;}
  add(C.post,M.post);add(C.mound,M.earth);
  [[0.42,0.6,1,0,0.07],[0.4,3.95,0.93,1,-0.06]].forEach(function(b){
    var r=b[0],a=b[1],o=add(C.bags[b[3]],M.bag),sl=(moundY(r-0.1)-moundY(r+0.1))/0.2;
    o.position.set(r*Math.cos(a),moundY(r)+0.015,r*Math.sin(a));o.rotation.order='YXZ';
    o.rotation.set(-Math.atan(sl)*0.8,-a-Math.PI/2,b[4]);o.scale.setScalar(b[2]);});
  [[0.62,2.25,0.085,0],[0.5,1.45,0.055,2],[0.68,4.85,0.07,1],[0.27,5.5,0.05,2]].forEach(function(s,i){
    var o=add(C.stones[s[3]],M.stone);o.position.set(s[0]*Math.cos(s[1]),moundY(s[0])+s[2]*0.15,s[0]*Math.sin(s[1]));
    o.scale.set(s[2]*1.25,s[2]*0.8,s[2]);o.rotation.set(0.2*i,i*1.9+0.4,0.15*(i-1.5));});
  // two identical boards nailed to front and back of the post (proper rotation, never mirrored)
  var pa=C.pa,bg=new T.Object3D();bg.position.copy(pa.p);bg.rotation.z=-Math.atan2(pa.tan.x,pa.tan.y)+0.045;root.add(bg);
  var zo=postR(pa.t)*1.1+0.008;
  for(var s=0;s<2;s++){var hd=new T.Object3D();hd.rotation.y=s?Math.PI:0;hd.rotation.z=s?0.012:0;bg.add(hd);
    add(Bd.geo,[Bd.mat,M.edge],hd).position.z=zo;add(Bd.nails,M.iron,hd).position.z=zo;}
  // bent iron hook under the board + hanging oil lantern (bail rests on the hook's low point)
  var hp=C.ph.p;add(C.hook,M.iron);
  var L=lanternGeos(),piv=new T.Object3D();piv.position.set(hp.x+0.315,hp.y-0.056+0.011,hp.z);piv.rotation.set(0.05,0.15,-0.035);root.add(piv);
  var lg=new T.Object3D();lg.position.y=-0.265;piv.add(lg);
  add(L.metal,M.iron,lg);add(L.glass,M.glass,lg);add(L.flame,M.flame,lg);
  return root;
};
})();
