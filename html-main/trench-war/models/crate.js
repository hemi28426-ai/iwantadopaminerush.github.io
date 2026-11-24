// Trench War model: WWI wooden S.A.A. ammunition crate stack (two crates, one merged geometry, one material).
// TWM.crate(THREE) -> {geometry, material}; footprint x,z in [-0.5,0.5], y 0..1 (base y=0). Same objects every call.
(function(){
window.TWM=window.TWM||{};
var CACHE=null;
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
// Atlas (u,v): G grain 0-.5 x 0-1 (12 plank bands) | S front stencil .5-1 x .75-1 | S2 back stencil .5-1 x .5-.75
// B batten wood .5-1 x .25-.5 (3 bands) | R rope .5-.875 x 0-.25 | M iron .875-1 x .125-.25 | D dark .875-1 x 0-.125
var MU=0.9375,MV=0.1875,DU=0.9375,DV=0.0625;
function makeTexture(THREE){
  var S=1024,cv=document.createElement('canvas');cv.width=cv.height=S;
  var c=cv.getContext('2d'),r=mulberry32(1916),TAU=Math.PI*2,i;
  function wood(x,y,w,h,rgb,knots,grey){
    c.save();c.beginPath();c.rect(x,y,w,h);c.clip();
    c.fillStyle='rgb('+rgb.join(',')+')';c.fillRect(x,y,w,h);
    var i,k,n=Math.floor(h*0.8);
    for(i=0;i<h;i+=2){c.fillStyle=(r()<0.5?'rgba(255,236,200,':'rgba(40,24,10,')+(r()*0.07).toFixed(3)+')';c.fillRect(x,y+i,w,2);}
    for(i=0;i<n;i++){
      var yy=y+r()*h,a=0.04+r()*0.17,amp=0.4+r()*2.4,f=0.004+r()*0.018,ph=r()*7;
      c.strokeStyle='rgba(48,28,12,'+a.toFixed(3)+')';c.lineWidth=0.4+r()*1.3;c.beginPath();
      for(var xx=0;xx<=w+16;xx+=16){var yv=yy+Math.sin(xx*f+ph)*amp+Math.sin(xx*f*3.3+ph*2)*amp*0.35;if(xx)c.lineTo(x+xx,yv);else c.moveTo(x,yv);}
      c.stroke();
    }
    for(i=0;i<knots;i++){
      var kx=x+r()*w,ky=y+h*(0.25+r()*0.5),kr=2.5+r()*4.5;
      for(k=6;k>0;k--){c.strokeStyle='rgba(55,32,14,'+(0.1+0.04*(6-k)).toFixed(3)+')';c.lineWidth=1.1;c.beginPath();c.ellipse(kx,ky,kr*(1+k*1.1),kr*(0.6+k*0.3),0,0,TAU);c.stroke();}
      c.fillStyle='rgba(42,24,10,0.8)';c.beginPath();c.ellipse(kx,ky,kr,kr*0.65,0,0,TAU);c.fill();
      c.fillStyle='rgba(18,10,5,0.6)';c.beginPath();c.arc(kx+kr*0.2,ky,kr*0.35,0,TAU);c.fill();
    }
    var blot=Math.floor(w*h/700);
    for(i=0;i<blot;i++){c.fillStyle=(r()<grey?'rgba(160,154,142,':'rgba(32,22,12,')+(r()*0.06).toFixed(3)+')';c.beginPath();c.arc(x+r()*w,y+r()*h,3+r()*24,0,TAU);c.fill();}
    var sc=Math.floor(w*h/4000);
    for(i=0;i<sc;i++){var sx=x+r()*w,sy=y+r()*h;c.strokeStyle='rgba(230,210,175,'+(0.08+r()*0.18).toFixed(3)+')';c.lineWidth=0.5+r()*0.6;c.beginPath();c.moveTo(sx,sy);c.lineTo(sx+(r()-0.5)*44,sy+(r()-0.5)*7);c.stroke();}
    var sp=Math.floor(w*h/60);
    for(i=0;i<sp;i++){c.fillStyle='rgba(20,12,5,'+(r()*0.12).toFixed(3)+')';c.fillRect(x+r()*w,y+r()*h,1,1);}
    var g=c.createLinearGradient(0,y,0,y+h);
    g.addColorStop(0,'rgba(28,18,8,0.55)');g.addColorStop(0.07,'rgba(28,18,8,0)');g.addColorStop(0.93,'rgba(28,18,8,0)');g.addColorStop(1,'rgba(28,18,8,0.6)');
    c.fillStyle=g;c.fillRect(x,y,w,h);
    c.restore();
  }
  function tone(k){var b=(0.82+r()*0.36)*(k||1),gr=r()<0.25;return gr?[Math.round(122*b),Math.round(112*b),Math.round(96*b)]:[Math.round(132*b),Math.round(97*b),Math.round(60*b)];}
  for(i=0;i<12;i++)wood(0,Math.round(i*S/12),S/2,Math.round(S/12)+1,tone(),1+Math.floor(r()*2),0.45);
  for(i=0;i<4;i++)wood(S/2,i*128,S/2,128,tone(),1,0.5);
  for(i=0;i<3;i++)wood(S/2,512+Math.round(i*S/12),S/2,Math.round(S/12)+1,tone(0.8),1,0.55);
  // rope: 3-strand hemp twist
  c.save();c.beginPath();c.rect(512,768,384,256);c.clip();
  c.fillStyle='rgb(152,130,90)';c.fillRect(512,768,384,256);
  for(i=-4;i<18;i++){var x0=512+i*28;
    c.fillStyle='rgba(72,54,30,0.55)';c.beginPath();c.moveTo(x0,768);c.lineTo(x0+8,768);c.lineTo(x0+92,1024);c.lineTo(x0+84,1024);c.fill();
    c.strokeStyle='rgba(215,196,150,0.4)';c.lineWidth=3;c.beginPath();c.moveTo(x0+14,768);c.lineTo(x0+98,1024);c.stroke();}
  for(i=0;i<1500;i++){var fx=512+r()*384,fy=768+r()*256;c.strokeStyle='rgba('+(r()<0.5?'60,44,24':'200,180,140')+','+(r()*0.3).toFixed(3)+')';c.lineWidth=0.6;c.beginPath();c.moveTo(fx,fy);c.lineTo(fx+3+r()*6,fy+8+r()*10);c.stroke();}
  c.restore();
  // iron (nail heads) + dark interior
  c.fillStyle='rgb(62,58,54)';c.fillRect(896,768,128,128);
  for(i=0;i<60;i++){c.fillStyle='rgba('+(r()<0.5?'120,62,28':'30,28,26')+','+(0.2+r()*0.4).toFixed(3)+')';c.beginPath();c.arc(896+r()*128,768+r()*128,2+r()*8,0,TAU);c.fill();}
  c.fillStyle='rgb(20,14,9)';c.fillRect(896,896,128,128);
  // stencilled markings: bridged letters, broad arrow, worn paint (painted across the plank faces)
  function stencil(ox,oy,items){
    var t=document.createElement('canvas');t.width=512;t.height=256;var q=t.getContext('2d'),j;
    q.fillStyle=q.strokeStyle='rgb(24,20,16)';q.textBaseline='middle';
    items.forEach(function(it){
      if(it[0]==='^'){var ax=it[1],ay=it[2],L=it[3];q.lineWidth=L*0.17;q.lineCap='butt';q.beginPath();
        q.moveTo(ax,ay+L);q.lineTo(ax,ay+L*0.1);q.moveTo(ax-L*0.42,ay+L*0.52);q.lineTo(ax,ay);q.lineTo(ax+L*0.42,ay+L*0.52);q.stroke();return;}
      var s=it[0],sz=it[3],gap=sz*0.12,tw=0,k;q.font='bold '+sz+'px Impact,"Arial Black",sans-serif';
      for(k=0;k<s.length;k++)tw+=q.measureText(s[k]).width+gap;
      var cx=it[1]-(tw-gap)/2;
      for(k=0;k<s.length;k++){var ch=s[k],cw=q.measureText(ch).width;q.fillText(ch,cx,it[2]);
        if('1I.T-LJ '.indexOf(ch)<0){var bw=Math.max(2,sz*0.06);q.save();q.globalCompositeOperation='destination-out';
          q.fillRect(cx+cw/2-bw/2,it[2]-sz*0.6,bw,sz*0.4);q.fillRect(cx+cw/2-bw/2,it[2]+sz*0.2,bw,sz*0.4);q.restore();}
        cx+=cw+gap;}
    });
    q.globalCompositeOperation='destination-out';
    for(j=0;j<2600;j++){q.fillStyle='rgba(0,0,0,'+(0.25+r()*0.75).toFixed(3)+')';q.fillRect(r()*512,r()*256,1+r()*3.5,1+r()*2);}
    for(j=0;j<14;j++){q.fillStyle='rgba(0,0,0,'+(0.2+r()*0.4).toFixed(3)+')';q.beginPath();q.arc(r()*512,r()*256,6+r()*30,0,TAU);q.fill();}
    c.globalAlpha=0.85;c.drawImage(t,ox,oy);c.globalAlpha=1;
  }
  stencil(512,0,[['^',92,26,74],['S.A.A.',278,64,64],['1000 ROUNDS  .303',256,166,27],['MK VII  CORDITE',256,203,21],['L.4  9/16',402,234,15]]);
  stencil(512,256,[['No 7',128,56,42],['^',96,90,30],['1916',398,214,32],['B.17',398,176,18]]);
  var tex=new THREE.CanvasTexture(cv);
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.anisotropy=4;tex.needsUpdate=true;
  return tex;
}
function bgeo(THREE,pos,uv,idx){
  var g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  g.setIndex(idx);g.computeVertexNormals();return g;
}
// Board: length L along +x, width W along +y, thickness Th along +z (z=Th is the outer face; inner side open).
// Chamfered profile with shared verts -> smooth worn edges; bow/cup/twist warp; skewed, jittered sawn ends; uneven long edges.
function plank(THREE,r,L,W,Th,o){
  var c=Math.min(o.c||0.005,W*0.3,Th*0.45),segs=o.segs||1,n=6,
    P=[[-W/2,0],[-W/2,Th-c],[-W/2+c,Th],[W/2-c,Th],[W/2,Th-c],[W/2,0]],
    rs=function(m){return (r()-0.5)*2*(m||0);},
    bow=rs(o.bow),cup=rs(o.cup),tw=rs(o.tw),ej=o.ej||0.004,
    E=[[rs(ej/2),rs(ej/2)],[rs(ej/2),rs(ej/2)]],
    pos=[],uv=[],idx=[],i,j,s,y,x,t,dl,dr,v;
  function wz(s,y){var q=2*s-1,w=y/(W/2);return bow*(1-q*q)+cup*w*w+tw*q*w;}
  for(i=0;i<=segs;i++){
    s=i/segs;dl=rs(0.0012);dr=rs(0.0012);
    for(j=0;j<n;j++){
      y=P[j][0];x=-L/2+L*s;
      if(i===0)x+=E[0][0]+E[0][1]*(y/W)*2+rs(ej*0.15);
      if(i===segs)x+=E[1][0]+E[1][1]*(y/W)*2+rs(ej*0.15);
      t=o.uv(s,(y+W/2)/W);
      pos.push(x,y+(j<3?dl:dr),P[j][1]+wz(s,y));uv.push(t[0],t[1]);
    }
  }
  for(i=0;i<segs;i++)for(j=0;j<n-1;j++){v=i*n+j;idx.push(v,v+n,v+1,v+1,v+n,v+n+1);}
  function vtx(k){return [pos[k*3],pos[k*3+1],pos[k*3+2]];}
  function add(list,uvs,tris){var b=pos.length/3,k;for(k=0;k<list.length;k++){pos.push(list[k][0],list[k][1],list[k][2]);uv.push(uvs[k][0],uvs[k][1]);}for(k=0;k<tris.length;k++)idx.push(b+tris[k]);}
  [0,segs].forEach(function(ri){ // sawn end caps: own verts -> crisp, darker end grain
    var L2=[],U2=[],T2=[],j2;
    for(j2=0;j2<n;j2++){L2.push(vtx(ri*n+j2));U2.push([0.52+0.04*(P[j2][0]/W+0.5),0.27+0.03*P[j2][1]/Th]);}
    for(j2=1;j2<n-1;j2++){if(ri===0)T2.push(0,j2,j2+1);else T2.push(0,j2+1,j2);}
    add(L2,U2,T2);
  });
  if(o.under)for(i=0;i<segs;i++){
    add([vtx(i*n),vtx(i*n+5),vtx(i*n+n),vtx(i*n+n+5)],[o.uv(i/segs,0),o.uv(i/segs,1),o.uv((i+1)/segs,0),o.uv((i+1)/segs,1)],[0,1,2,1,3,2]);
  }
  (o.nails||[]).forEach(function(nl){ // domed iron nail heads
    var cx=-L/2+nl[0]*L,cy=-W/2+nl[1]*W,cz=Th+wz(nl[0],cy),L3=[[cx,cy,cz+0.0034]],U3=[[MU,MV]],T3=[],k,a0=r()*6.28;
    for(k=0;k<5;k++){var an=a0+k*1.2566;L3.push([cx+Math.cos(an)*0.0068,cy+Math.sin(an)*0.0068,cz-0.0006]);U3.push([MU+Math.cos(an)*0.02,MV+Math.sin(an)*0.02]);}
    for(k=0;k<5;k++)T3.push(0,1+k,1+(k+1)%5);
    add(L3,U3,T3);
  });
  return bgeo(THREE,pos,uv,idx);
}
function frame(THREE,A,N,o){
  var a=new THREE.Vector3(A[0],A[1],A[2]).normalize(),n=new THREE.Vector3(N[0],N[1],N[2]).normalize(),b=new THREE.Vector3().crossVectors(n,a);
  return new THREE.Matrix4().makeBasis(a,b,n).setPosition(o[0],o[1],o[2]);
}
function merge(THREE,list){
  var U=THREE.BufferGeometryUtils;
  if(U&&U.mergeBufferGeometries){var m=U.mergeBufferGeometries(list,false);if(m)return m;}
  var out=new THREE.BufferGeometry();
  ['position','normal','uv'].forEach(function(nm){
    var tot=0,o=0,arr;list.forEach(function(g){tot+=g.attributes[nm].array.length;});
    arr=new Float32Array(tot);list.forEach(function(g){arr.set(g.attributes[nm].array,o);o+=g.attributes[nm].array.length;});
    out.setAttribute(nm,new THREE.BufferAttribute(arr,list[0].attributes[nm].itemSize));
  });
  return out;
}
// One crate: plank walls (2 courses), dark core behind the gaps, corner battens, diagonal brace, end cleats with
// rope handles, overhanging 3-board lid, nails; optional skids. k: {hx,hz,y0,bh,M,skids,flip}
function crate(THREE,r,parts,k){
  var hx=k.hx,hz=k.hz,y0=k.y0,bh=k.bh,top=y0+bh,pt=0.024,lt=0.03,gap=0.005,pw=(bh-gap)/2,bw=0.062,M=k.M,
    f,i,e,L,b0,jf,sd,sten,reg;
  function put(g,A,N,o){g.applyMatrix4(frame(THREE,A,N,o).premultiply(M));parts.push(g);}
  function gUV(L){var band=Math.floor(r()*12),v0=1-(band+1)/12+0.0015,dv=1/12-0.003,u0=r()*Math.max(0.005,0.49-L*0.42);return function(s,w){return [u0+s*L*0.42,v0+w*dv];};}
  function bUV(L){var band=Math.floor(r()*3),v0=0.5-(band+1)/12+0.0015,dv=1/12-0.003,u0=0.5+r()*Math.max(0.005,0.49-L*0.42);return function(s,w){return [u0+s*L*0.42,v0+w*dv];};}
  for(f=0;f<2;f++){
    sd=f?-1:1;sten=(sd===1)!==!!k.flip;reg=sten?0.75:0.5;
    // long walls (stencil painted across both boards via planar UVs)
    for(i=0;i<2;i++){
      L=2*hx+(r()-0.5)*0.008;b0=i*(pw+gap);jf=(r()-0.5)*0.004;
      put(plank(THREE,r,L,pw,pt,{segs:2,bow:0.003,cup:0.0015,tw:0.002,ej:0.007,
        uv:function(s,w){return [0.5+0.5*(hx+jf-L/2+s*L)/(2*hx),reg+0.25*(b0+w*pw)/bh];}}),
        [sd,0,0],[0,0,sd],[sd*jf,y0+b0+pw/2,sd*(hz-pt)]);
    }
    // end walls, butted between the long walls
    for(i=0;i<2;i++){
      L=2*(hz-pt)-0.002+(r()-0.5)*0.003;b0=i*(pw+gap);
      put(plank(THREE,r,L,pw,pt,{segs:1,cup:0.0015,tw:0.002,ej:0.004,uv:gUV(L)}),[0,0,-sd],[sd,0,0],[sd*(hx-pt),y0+b0+pw/2,0]);
    }
    // corner battens standing proud, nailed top and bottom
    for(e=-1;e<=1;e+=2){
      L=bh-0.006+(r()-0.5)*0.004;
      put(plank(THREE,r,L,bw,0.02,{segs:1,cup:0.001,tw:0.0015,ej:0.004,c:0.006,uv:bUV(L),nails:[[0.07,0.5],[0.93,0.5]]}),
        [0,1,0],[0,0,sd],[e*(hx-bw/2-0.006),y0+bh/2-0.003,sd*hz]);
    }
    // diagonal cross brace on the unstencilled face, ends tucked under the battens
    if(!sten){
      var xc=hx-bw/2-0.006,Y1=y0+0.045,Y2=top-0.045,dx=2*xc,dy=Y2-Y1;L=Math.sqrt(dx*dx+dy*dy);
      put(plank(THREE,r,L,0.058,0.016,{segs:1,cup:0.001,ej:0.003,uv:bUV(L),nails:[[0.5,0.5]]}),[sd*dx,dy,0],[0,0,sd],[0,(Y1+Y2)/2,sd*hz]);
    }
    // end cleat + rope handle threaded through it
    var yc=y0+bh*0.64;L=2*hz-0.03;
    put(plank(THREE,r,L,0.056,0.022,{segs:1,cup:0.001,tw:0.002,ej:0.004,c:0.006,uv:bUV(L),nails:[[0.06,0.5],[0.94,0.5]]}),[0,0,-sd],[sd,0,0],[sd*hx,yc,0]);
    var R=[[0.011,0.012,-0.1],[0.0115,-0.04,-0.104],[0.012,-0.083,-0.07],[0.012,-0.1,0],[0.012,-0.083,0.07],[0.0115,-0.04,0.104],[0.011,0.012,0.1]],
      pts=[],sag=(r()-0.5)*0.03;
    for(i=0;i<R.length;i++)pts.push(new THREE.Vector3(sd*(hx+R[i][0]),yc+R[i][1]*(i===3?1.05:1),-sd*(R[i][2]+(i>0&&i<6?sag*0.3:0))));
    var tube=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),8,0.0105,4,false),tu=tube.attributes.uv;
    for(i=0;i<tu.count;i++)tu.setXY(i,0.5+0.375*tu.getX(i),0.25*tu.getY(i));
    tube.applyMatrix4(M);parts.push(tube);
  }
  // lid: three warped boards overhanging every side, nailed into the end walls
  var ov=0.026,Z=2*(hz+ov),lg=0.004,W=(Z-2*lg)/3;
  for(i=0;i<3;i++){
    L=2*(hx+0.02)+(r()-0.5)*0.014;jf=(r()-0.5)*0.006;
    var zc=-(hz+ov)+W/2+i*(W+lg)+(r()-0.5)*0.002,s0=(L/2-jf-hx+pt/2)/L,s1=(L/2-jf+hx-pt/2)/L;
    put(plank(THREE,r,L,W,lt,{segs:2,bow:0.0035,cup:0.002,tw:0.003,ej:0.01,c:0.006,under:true,uv:gUV(L),
      nails:[[s0,0.5+(r()-0.5)*0.2],[s1,0.5+(r()-0.5)*0.2]]}),[1,0,0],[0,1,0],[jf,top,zc]);
  }
  // dark core: shows through the plank gaps instead of daylight
  var core=new THREE.BoxGeometry(2*(hx-pt*0.5),bh-0.004,2*(hz-pt*0.5)),cu=core.attributes.uv;
  for(i=0;i<cu.count;i++)cu.setXY(i,DU+(i%2)*0.01,DV);
  core.translate(0,y0+bh/2,0);core.applyMatrix4(M);parts.push(core);
  if(k.skids)for(e=-1;e<=1;e+=2){
    L=2*hx-0.03+(r()-0.5)*0.01;
    put(plank(THREE,r,L,0.07,0.03,{segs:1,cup:0.001,ej:0.008,c:0.007,uv:bUV(L)}),[1,0,0],[0,-1,0],[(r()-0.5)*0.01,0.03,e*(hz-0.1)]);
  }
}
window.TWM.crate=function(THREE){
  if(CACHE)return CACHE;
  var r=mulberry32(4242),parts=[];
  crate(THREE,r,parts,{hx:0.43,hz:0.36,y0:0.03,bh:0.44,M:new THREE.Matrix4().makeRotationY(-0.012),skids:true,flip:false});
  crate(THREE,r,parts,{hx:0.415,hz:0.345,y0:0.5,bh:0.465,M:new THREE.Matrix4().makeRotationY(0.06).setPosition(0.012,0,-0.018),flip:true});
  var list=parts.map(function(g){
    var n=g.index?g.toNonIndexed():g;
    Object.keys(n.attributes).forEach(function(a){if(a!=='position'&&a!=='normal'&&a!=='uv')n.deleteAttribute(a);});
    return n;
  });
  var geometry=merge(THREE,list);
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  var tex=makeTexture(THREE);
  var material=new THREE.MeshStandardMaterial({map:tex,bumpMap:tex,bumpScale:0.02,roughness:0.9,metalness:0});
  CACHE={geometry:geometry,material:material};
  return CACHE;
};
})();
