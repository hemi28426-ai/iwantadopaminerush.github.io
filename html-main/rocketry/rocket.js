// Unblocked Rocketry visual module: rocket (loaded after the main game script; override/wrap globals here)
(function(){
if(!window.THREE)return;
const TX=new Map(),PI=Math.PI;
const cvs=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h||w;return c};
const ctex=(c,srgb)=>{const t=new THREE.CanvasTexture(c);if(srgb)t.encoding=THREE.sRGBEncoding;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;return t};
const rnd=(s=>()=>(s=(s*16807)%2147483647)/2147483647)(12345);
function shade(col,k){const c=new THREE.Color(col);c.multiplyScalar(k);return '#'+c.getHexString()}
// ---------- hull textures: panels, welds, rivets, grime + matching bump ----------
function hullTex(col,kind){const key='h'+col+kind;if(TX.has(key))return TX.get(key);
  const N=512,c=cvs(N),g=c.getContext('2d'),b=cvs(N),gb=b.getContext('2d');
  g.fillStyle=col;g.fillRect(0,0,N,N);gb.fillStyle='#808080';gb.fillRect(0,0,N,N);
  const foam=kind=='foam',gold=kind=='gold';
  if(foam){for(let i=0;i<5000;i++){const x=rnd()*N,y=rnd()*N,r=1+rnd()*5,v=rnd();g.fillStyle=`rgba(${v<.5?90:255},${v<.5?40:200},${v<.5?0:140},${.05+rnd()*.08})`;g.beginPath();g.arc(x,y,r,0,7);g.fill();gb.fillStyle=`rgba(${v*255|0},${v*255|0},${v*255|0},.25)`;gb.fillRect(x,y,r,r)}
    for(let x=0;x<N;x+=32){g.fillStyle='rgba(60,25,0,.18)';g.fillRect(x,0,3,N);gb.fillStyle='#b0b0b0';gb.fillRect(x,0,3,N)}}
  else if(gold){const gr=g.createLinearGradient(0,0,N,N);gr.addColorStop(0,'#c99a2e');gr.addColorStop(.5,'#f5d36a');gr.addColorStop(1,'#a8781c');g.fillStyle=gr;g.fillRect(0,0,N,N);
    for(let i=0;i<900;i++){const x=rnd()*N,y=rnd()*N,s=8+rnd()*30,a=rnd()*7;g.fillStyle=`rgba(${rnd()<.5?'255,240,170':'110,70,10'},${.08+rnd()*.2})`;g.beginPath();g.moveTo(x,y);for(let k=0;k<3;k++)g.lineTo(x+Math.cos(a+k*2.1)*s,y+Math.sin(a+k*2.1)*s);g.fill();
      const v=rnd()*255|0;gb.fillStyle=`rgba(${v},${v},${v},.5)`;gb.beginPath();gb.moveTo(x,y);for(let k=0;k<3;k++)gb.lineTo(x+Math.cos(a+k*2.1)*s,y+Math.sin(a+k*2.1)*s);gb.fill()}}
  else{for(let i=0;i<2500;i++){g.fillStyle=`rgba(0,0,0,${rnd()*.035})`;g.fillRect(rnd()*N,rnd()*N,2+rnd()*14,2+rnd()*30)}
    if(kind=='tank'){g.fillStyle='rgba(15,15,20,.92)';g.fillRect(0,0,N/10,N);g.fillRect(N/2,0,N/10,N)}
    // welds + panel lines
    for(const y of[0,N/2]){g.fillStyle='rgba(0,0,0,.45)';g.fillRect(0,y,N,3);g.fillStyle='rgba(255,255,255,.25)';g.fillRect(0,y+3,N,1);gb.fillStyle='#202020';gb.fillRect(0,y,N,3);gb.fillStyle='#d0d0d0';gb.fillRect(0,y+3,N,2)}
    for(let x=0;x<N;x+=64){g.fillStyle='rgba(0,0,0,.18)';g.fillRect(x,0,2,N);gb.fillStyle='#404040';gb.fillRect(x,0,2,N)}
    for(let x=4;x<N;x+=10)for(const y of[8,N/2+8,N/2-8,N-8]){g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.arc(x,y,1.6,0,7);g.fill();g.fillStyle='rgba(255,255,255,.35)';g.fillRect(x-1,y-1.5,1,1);gb.fillStyle='#ffffff';gb.beginPath();gb.arc(x,y,2,0,7);gb.fill()}
    if(kind=='tank'){g.save();g.translate(N*.3,N*.36);g.fillStyle='#b8202a';g.fillRect(0,0,60,10);g.fillStyle='#1d3c8f';g.fillRect(0,10,60,10);g.fillStyle='#fff';g.font='bold 30px Arial';g.fillText('UR-1',0,52);g.restore()}
    // exhaust soot towards the bottom
    const gr=g.createLinearGradient(0,N*.7,0,N);gr.addColorStop(0,'rgba(20,15,10,0)');gr.addColorStop(1,'rgba(20,15,10,.12)');g.fillStyle=gr;g.fillRect(0,0,N,N)}
  const r={map:ctex(c,1),bump:ctex(b)};TX.set(key,r);return r}
function bellTex(kind){const key='bell'+kind;if(TX.has(key))return TX.get(key);const N=512,c=cvs(N),g=c.getContext('2d'),b=cvs(N),gb=b.getContext('2d');
  const gr=g.createLinearGradient(0,0,0,N);// top of canvas = throat (v=1)
  if(kind=='ntr'){gr.addColorStop(0,'#4a4f52');gr.addColorStop(1,'#20262a')}else{gr.addColorStop(0,'#b5652e');gr.addColorStop(.25,'#7a4a3a');gr.addColorStop(.45,'#4b4f6e');gr.addColorStop(.7,'#2c2c30');gr.addColorStop(1,'#141414')}
  g.fillStyle=gr;g.fillRect(0,0,N,N);gb.fillStyle='#808080';gb.fillRect(0,0,N,N);
  for(let x=0;x<N;x+=4){g.fillStyle='rgba(0,0,0,.28)';g.fillRect(x,0,1,N);g.fillStyle='rgba(255,220,180,.07)';g.fillRect(x+2,0,1,N);gb.fillStyle='#303030';gb.fillRect(x,0,1,N);gb.fillStyle='#e0e0e0';gb.fillRect(x+2,0,1,N)}
  for(const y of[N*.12,N*.5]){g.fillStyle='rgba(200,200,210,.35)';g.fillRect(0,y,N,6);gb.fillStyle='#fff';gb.fillRect(0,y,N,6)}
  const r={map:ctex(c,1),bump:ctex(b)};TX.set(key,r);return r}
function tileTex(){if(TX.has('tile'))return TX.get('tile');const N=512,c=cvs(N),g=c.getContext('2d'),b=cvs(N),gb=b.getContext('2d');g.fillStyle='#1c1814';g.fillRect(0,0,N,N);gb.fillStyle='#202020';gb.fillRect(0,0,N,N);
  for(let y=0;y<N;y+=24)for(let x=(y/24%2)*12;x<N;x+=24){const v=20+rnd()*30;g.fillStyle=`rgb(${v+18},${v+8},${v})`;g.fillRect(x+1,y+1,22,22);gb.fillStyle='#a0a0a0';gb.fillRect(x+1,y+1,22,22)}
  for(let i=0;i<300;i++){g.fillStyle=`rgba(120,70,30,${rnd()*.25})`;g.beginPath();g.arc(rnd()*N,rnd()*N,3+rnd()*16,0,7);g.fill()}
  const r={map:ctex(c,1),bump:ctex(b)};TX.set('tile',r);return r}
function hazardTex(){if(TX.has('hz'))return TX.get('hz');const c=cvs(256,64),g=c.getContext('2d');g.fillStyle='#2a2a2e';g.fillRect(0,0,256,64);
  g.fillStyle='#f0c020';for(let x=-64;x<256;x+=32){g.beginPath();g.moveTo(x,20);g.lineTo(x+16,20);g.lineTo(x+32,44);g.lineTo(x+16,44);g.fill()}g.fillStyle='rgba(0,0,0,.6)';g.fillRect(0,0,256,4);g.fillRect(0,60,256,4);
  const t=ctex(c,1);TX.set('hz',t);return t}
// ---------- geometry helpers ----------
function lathe(prof,seg){const g=new THREE.LatheGeometry(prof.map(q=>new THREE.Vector2(Math.max(0,q[0]),q[1])),seg||48);const p=g.attributes.position,uv=g.attributes.uv;let y0=1e9,y1=-1e9;
  for(let i=0;i<p.count;i++){y0=Math.min(y0,p.getY(i));y1=Math.max(y1,p.getY(i))}for(let i=0;i<p.count;i++)uv.setY(i,(p.getY(i)-y0)/((y1-y0)||1));return g}
const std=(o)=>new THREE.MeshStandardMaterial(Object.assign({side:THREE.DoubleSide,envMapIntensity:1.2},o));
function hullMat(col,kind,h,w,o){const t=hullTex(col,kind);const rep=Math.max(1,Math.round(h/Math.max(1.5,w*.8)));const m=t.map.clone(),bp=t.bump.clone();m.needsUpdate=bp.needsUpdate=true;m.repeat.set(kind=='gold'?2:1,rep);bp.repeat.copy(m.repeat);
  return std(Object.assign({color:'#fff',map:m,bumpMap:bp,bumpScale:.025,metalness:kind=='gold'?.95:.35,roughness:kind=='foam'?.85:kind=='gold'?.32:.42},o))}
const metal=(c,r)=>std({color:c,metalness:.85,roughness:r==null?.35:r});
function cyl(r1,r2,h,m,seg){return new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,seg||20),m)}
const hotMat=()=>new THREE.MeshBasicMaterial({color:'#ff8a3a',transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.BackSide});
// ---------- parts ----------
partMesh=function(p){const w=p.w,h=p.h,o=new THREE.Group(),add=(m,x,y,z)=>{m.position.set(x||0,y||0,z||0);o.add(m);return m};
  if(p.type=='tank'){const kind=w>=5?'foam':(p.name.includes('Battery')?'plain':'tank');
    add(new THREE.Mesh(lathe([[0,0],[w*.46,0],[w*.5,h*.015+.04],[w*.5,h-.04-h*.015],[w*.46,h],[0,h]],64),hullMat(kind=='foam'?shade(p.col,.95):p.col,kind,h,w)));
    // stringer bands top/bottom
    const bandM=metal('#9aa0a8',.4);add(cyl(w*.505,w*.505,Math.min(.25,h*.05),bandM,64),0,h-.12);add(cyl(w*.505,w*.505,Math.min(.25,h*.05),bandM,64),0,.12);
    if(h>4){const n=w>=5?2:1;for(let k=0;k<n;k++){const a=k*PI+.6,pipe=cyl(w*.025+.04,w*.025+.04,h*.94,metal('#c8ccd2',.3),8);add(pipe,Math.cos(a)*w*.52,h/2,Math.sin(a)*w*.52)}}
    if(p.name.includes('Battery')){for(let k=0;k<4;k++){const a=k*PI/2+PI/4,pn=new THREE.Mesh(new THREE.BoxGeometry(w*.5,h*.8,.04),std({color:'#1b2a6b',metalness:.6,roughness:.25,emissive:'#0a1030'}));pn.position.set(Math.cos(a)*w*.52,h/2,Math.sin(a)*w*.52);pn.rotation.y=-a+PI/2;o.add(pn)}}
    return o}
  if(p.type=='pod'){
    if(p.name.includes('Probe')){add(new THREE.Mesh(lathe([[0,0],[w*.5,0],[w*.5,h*.75],[w*.3,h],[0,h]],8),hullMat('#d4a540','gold',h,w)));
      add(cyl(w*.52,w*.52,.08,metal('#333',.5),8),0,.04);
      const dish=add(new THREE.Mesh(new THREE.SphereGeometry(w*.28,24,8,0,2*PI,0,PI*.32),std({color:'#eee',metalness:.3,roughness:.4})),w*.18,h+w*.05,0);dish.rotation.z=-.5;
      add(cyl(.02,.02,h*1.2,metal('#ddd')),-w*.25,h+h*.5,w*.1);add(new THREE.Mesh(new THREE.SphereGeometry(.05,8,6),new THREE.MeshBasicMaterial({color:'#f33'})),-w*.25,h*2.1,w*.1);return o}
    const sh=Math.min(.25,h*.08),prof=[[0,0],[w*.47,0],[w*.5,sh*.6],[w*.5,sh],[w*.45,sh*1.4],[w*.2,h*.86],[w*.19,h*.9],[0,h*.9]];
    const m=hullMat('#f0f0f4','pod',h,w);
    add(new THREE.Mesh(lathe(prof,64),m));
    add(new THREE.Mesh(lathe([[0,0],[w*.47,0],[w*.5,sh]],48),std({color:'#2a1d14',roughness:.9,metalness:.1})),0,-.01);
    add(cyl(w*.12,w*.14,h*.12,metal('#bfc4cc',.3),24),0,h*.94);add(new THREE.Mesh(new THREE.TorusGeometry(w*.13,.04,8,32),metal('#666')),0,h).rotation.x=PI/2;
    // windows
    const sl=Math.atan2(w*.3,h*.86-sh*1.4);for(let k=0;k<2;k++){const a=k*.7-.35,yy=h*.55,r=w*.5-(w*.3)*((yy-sh*1.4)/(h*.86-sh*1.4))+.01;
      const win=new THREE.Mesh(new THREE.CircleGeometry(w*.06,20),std({color:'#0b1426',metalness:1,roughness:.05,emissive:'#081530'}));win.position.set(Math.sin(a)*r,yy,Math.cos(a)*r);win.rotation.set(-sl,a,0,'YXZ');o.add(win);
      const fr=new THREE.Mesh(new THREE.TorusGeometry(w*.065,.025,6,24),metal('#888'));fr.position.copy(win.position);fr.rotation.copy(win.rotation);o.add(fr)}
    // RCS quads
    for(let k=0;k<4;k++){const a=k*PI/2+PI/4,yy=h*.62,r=w*.5-(w*.3)*((yy-sh*1.4)/(h*.86-sh*1.4));const q=new THREE.Group();q.add(new THREE.Mesh(new THREE.BoxGeometry(.18,.22,.12),metal('#ddd',.4)));
      for(const[dx,dy]of[[.12,0],[-.12,0],[0,.14],[0,-.14]]){const n=cyl(.02,.04,.07,metal('#333'),8);n.position.set(dx,dy,0);n.rotation.z=dx?PI/2:0;q.add(n)}q.position.set(Math.cos(a)*r,yy,Math.sin(a)*r);q.rotation.y=-a+PI/2;o.add(q)}
    return o}
  if(p.type=='eng')return engMesh(p);
  if(p.type=='dec'){const hm=hazardTex().clone();hm.needsUpdate=true;hm.repeat.set(Math.round(w*2),1);
    add(new THREE.Mesh(lathe([[0,0],[w*.5,0],[w*.5,h*.35],[w*.47,h*.42],[w*.47,h*.58],[w*.5,h*.65],[w*.5,h],[0,h]],64),std({color:'#fff',map:hm,metalness:.6,roughness:.45})));
    const bm=metal('#ccc',.3),n=Math.round(w*6);for(let k=0;k<n;k++){const a=k/n*2*PI;add(cyl(.03,.03,h*.25,bm,6),Math.cos(a)*w*.475,h/2,Math.sin(a)*w*.475)}return o}
  if(p.type=='chute'){add(new THREE.Mesh(lathe([[0,0],[w*.5,0],[w*.5,h*.2],[w*.42,h*.25],[w*.42,h*.55],[w*.36,h*.85],[w*.18,h],[0,h]],48),std({color:p.col,metalness:.2,roughness:.55})));
    add(cyl(w*.505,w*.505,h*.08,metal('#ddd',.3),48),0,h*.12);add(new THREE.Mesh(new THREE.TorusGeometry(w*.43,.03,6,48),metal('#eee')),0,h*.55).rotation.x=PI/2;return o}
  if(p.type=='shield'){const t=tileTex();add(new THREE.Mesh(lathe([[0,-h*.5],[w*.15,-h*.47],[w*.35,-h*.3],[w*.5,h*.15],[w*.5,h],[0,h]],64),std({color:'#fff',map:t.map,bumpMap:t.bump,bumpScale:.03,roughness:.95,metalness:0,side:THREE.DoubleSide})));
    add(cyl(w*.505,w*.505,h*.25,metal('#777',.5),64),0,h*.85);return o}
  if(p.type=='legs'){add(cyl(w*.22,w*.22,h,metal('#8a8f98',.4),24),0,h/2);const lm=metal(p.col,.3),dm=metal('#333',.5);
    for(let k=0;k<4;k++){const a=k*PI/2+PI/4,L=h*1.7,leg=new THREE.Group();const strut=cyl(.09,.12,L,lm,10);strut.position.y=-L/2;leg.add(strut);
      const pis=cyl(.05,.05,L*.6,metal('#eee',.15),8);pis.position.set(0,-L*.35,.18);leg.add(pis);const foot=cyl(.35,.42,.1,dm,16);foot.position.y=-L;foot.rotation.z=-.5;leg.add(foot);
      leg.position.set(Math.cos(a)*w*.22,h*.95,Math.sin(a)*w*.22);leg.rotation.order='YXZ';leg.rotation.y=-a;leg.rotation.z=.5;
      const pv=new THREE.Group();pv.add(leg);pv.rotation.y=0;o.add(pv);leg.rotation.set(0,0,0);
      leg.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),new THREE.Vector3(Math.cos(a)*.55,-.83,Math.sin(a)*.55));}
    return o}
  add(new THREE.Mesh(lathe([[0,0],[w/2,0],[w/2,h],[0,h]],32),metal(p.col,.4)));return o};
function engMesh(p){const w=p.w,h=p.h,o=new THREE.Group(),add=(m,x,y,z)=>{m.position.set(x||0,y||0,z||0);o.add(m);return m},n=p.name;o.userData.hot=[];
  const dark=metal('#3a3c40',.45),pipeM=metal('#c9a26a',.3),steel=metal('#9aa0a8',.35);
  const bell=(re,rt,y0,bh,kind)=>{const pts=[];for(let i=0;i<=16;i++){const s=i/16;pts.push([rt+(re-rt)*Math.pow(1-s,1.7),y0+s*bh])}const t=bellTex(kind);
    const m=new THREE.Mesh(lathe(pts,48),std({color:'#fff',map:t.map,bumpMap:t.bump,bumpScale:.02,metalness:.8,roughness:.38}));o.add(m);
    const ip=pts.map(q=>[q[0]*.97,q[1]+.01]);const hm=new THREE.Mesh(lathe(ip,40),hotMat());hm.visible=false;o.add(hm);o.userData.hot.push(hm);
    const lip=new THREE.Mesh(new THREE.TorusGeometry(re,Math.max(.02,re*.02),6,48),steel);lip.rotation.x=PI/2;lip.position.y=y0;o.add(lip)};
  if(n.includes('Ion')){add(cyl(w*.5,w*.45,h*.7,metal('#c8ccd8',.3),32),0,h*.65);const grid=add(cyl(w*.42,w*.42,.04,new THREE.MeshBasicMaterial({color:'#6ab0ff'}),32),0,h*.28);o.userData.hot.push(grid);grid.visible=true;
    add(new THREE.Mesh(new THREE.TorusGeometry(w*.45,.05,8,32),metal('#444')),0,h*.28).rotation.x=PI/2;
    for(let k=0;k<3;k++){const a=k*2.1;add(cyl(.04,.04,h*.5,pipeM,6),Math.cos(a)*w*.3,h*.1,Math.sin(a)*w*.3)}return o}
  if(n.includes('Aerospike')){add(cyl(w*.5,w*.5,h*.25,dark,48),0,h*.87);const t=bellTex('a');
    add(new THREE.Mesh(lathe([[w*.45,h*.75],[w*.38,h*.45],[w*.22,h*.15],[w*.1,0],[0,0]].reverse().map(q=>q),48),std({color:'#fff',map:t.map,bumpMap:t.bump,bumpScale:.02,metalness:.85,roughness:.35})));
    const n2=16;for(let k=0;k<n2;k++){const a=k/n2*2*PI,c=new THREE.Mesh(new THREE.BoxGeometry(w*.12,h*.12,w*.08),dark);c.position.set(Math.cos(a)*w*.46,h*.72,Math.sin(a)*w*.46);c.rotation.y=-a;o.add(c)}
    const hm=new THREE.Mesh(new THREE.TorusGeometry(w*.46,w*.03,6,48),new THREE.MeshBasicMaterial({color:'#ff9040',blending:THREE.AdditiveBlending,transparent:true}));hm.rotation.x=PI/2;hm.position.y=h*.66;hm.visible=false;o.add(hm);o.userData.hot.push(hm);return o}
  const ntr=n.includes('Atomic');
  // thrust structure
  add(new THREE.Mesh(lathe([[w*.5,h],[w*.5,h*.95],[w*.3,h*.8],[0,h*.8]],48),dark));
  if(ntr){add(cyl(w*.3,w*.3,h*.35,std({color:'#2f5f3a',metalness:.5,roughness:.4}),32),0,h*.62);for(let k=0;k<4;k++)add(new THREE.Mesh(new THREE.TorusGeometry(w*.305,.03,6,32),new THREE.MeshBasicMaterial({color:k%2?'#ffd000':'#222'})),0,h*(.48+k*.08)).rotation.x=PI/2}
  else{add(cyl(w*.15,w*.17,h*.22,steel,24),0,h*.68);
    for(let k=0;k<2;k++){const a=k*PI+.4;const tp=cyl(w*.07,w*.07,h*.22,pipeM,16);add(tp,Math.cos(a)*w*.28,h*.68,Math.sin(a)*w*.28);
      const ex=cyl(w*.03,w*.04,h*.5,dark,10);add(ex,Math.cos(a)*w*.38,h*.38,Math.sin(a)*w*.38);
      const pp=new THREE.Mesh(new THREE.TorusGeometry(w*.2,w*.018,6,24,PI),pipeM);pp.position.y=h*.6;pp.rotation.set(PI/2,0,a);o.add(pp)}
    add(new THREE.Mesh(new THREE.TorusGeometry(w*.19,w*.025,8,32),steel),0,h*.77).rotation.x=PI/2}
  const big=n.includes('Leviathan')||n.includes('Mammoth');
  if(big){const k=n.includes('Leviathan')?7:4;for(let i=0;i<k;i++){const a=i/k*2*PI,r=i?w*.32:0;if(i==0&&k==4)continue;
      const sub=new THREE.Group();o.add(sub);const prev=o;}
    // cluster of smaller bells
    const cnt=n.includes('Leviathan')?7:4,rr=cnt==7?w*.165:w*.22,ring=cnt==7?w*.33:w*.24;
    for(let i=0;i<cnt;i++){const center=cnt==7&&i==0,a=(i-(cnt==7?1:0))/(cnt==7?6:4)*2*PI+PI/4;const cx=center?0:Math.cos(a)*ring,cz=center?0:Math.sin(a)*ring;
      const pts=[];for(let j=0;j<=12;j++){const s=j/12;pts.push([rr*.32+(rr-rr*.32)*Math.pow(1-s,1.7),s*h*.6])}const t=bellTex('b');
      const m=new THREE.Mesh(lathe(pts,32),std({color:'#fff',map:t.map,bumpMap:t.bump,bumpScale:.02,metalness:.8,roughness:.38}));m.position.set(cx,0,cz);o.add(m);
      const hm=new THREE.Mesh(lathe(pts.map(q=>[q[0]*.96,q[1]+.01]),24),hotMat());hm.position.copy(m.position);hm.visible=false;o.add(hm);o.userData.hot.push(hm);
      add(cyl(rr*.4,rr*.4,h*.2,steel,16),cx,h*.68,cz)}
    return o}
  bell(w*.47,w*.15,0,h*.6,ntr?'ntr':'b');return o}
// ---------- plume ----------
const PV=`varying vec2 vUv;varying vec3 vN;varying vec3 vW;void main(){vUv=uv;vN=normalize(mat3(modelMatrix)*normal);vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
const PF=`uniform vec3 c0;uniform vec3 c1;uniform float time;uniform float op;uniform float dia;uniform float seed;uniform float pw;varying vec2 vUv;varying vec3 vN;varying vec3 vW;
void main(){float s=vUv.y;vec3 V=normalize(cameraPosition-vW);float f=abs(dot(V,normalize(vN)));float body=pow(f,pw);
float fl=.8+.2*sin(time*53.+s*31.+seed)*sin(time*37.-s*17.+seed*2.);float st=.88+.12*sin(vUv.x*6.2832*9.+time*24.-s*14.);
float a=pow(max(0.,1.-s),1.5)*smoothstep(0.,.06,s+.02);float d=1.+dia*2.2*pow(abs(cos(s*3.14159*4.5)),14.)*(1.-s*.8);
float I=clamp(body*a*fl*st*op*d,0.,3.);gl_FragColor=vec4(mix(c0,c1,smoothstep(0.,.75,s))*I,I);}`;
function plumeMat(c0,c1,op,dia,pw){return new THREE.ShaderMaterial({uniforms:{c0:{value:new THREE.Color(c0)},c1:{value:new THREE.Color(c1)},time:{value:0},op:{value:op},op0:{value:op},dia:{value:dia||0},seed:{value:Math.random()*9},pw:{value:pw||1.2}},
  vertexShader:PV,fragmentShader:PF,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide})}
function plume(r0,r1,L,mat,bulge){const pts=[];for(let i=0;i<=20;i++){const s=i/20;pts.push(new THREE.Vector2(r0+(r1-r0)*Math.pow(s,bulge||.8)+(bulge?0:Math.sin(s*PI)*r0*.15),-s*L))}
  const m=new THREE.Mesh(new THREE.LatheGeometry(pts,32),mat);return m}
let puff=null;function puffTex(){if(puff)return puff;const N=128,c=cvs(N),g=c.getContext('2d');for(let i=0;i<40;i++){const x=32+rnd()*64,y=32+rnd()*64,r=14+rnd()*26,gr=g.createRadialGradient(x,y,0,x,y,r);const v=200+rnd()*55|0;
  gr.addColorStop(0,`rgba(${v},${v},${v},.22)`);gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,N,N)}puff=new THREE.CanvasTexture(c);return puff}
const _rg=rocketGroup;
rocketGroup=function(parts){const g=new THREE.Group(),Ht=parts.reduce((s,p)=>s+p.h,0);let y=Ht/2;g.userData.hot=[];
  for(const p of parts){y-=p.h;const m=partMesh(p);m.position.y=y;g.add(m);if(m.userData.hot)g.userData.hot.push(...m.userData.hot)}
  const lp=parts[parts.length-1];if(lp&&lp.type=='eng'){const f=new THREE.Group(),w=lp.w,n=lp.name;
    let core='#fff6e0',mid='#ffb35a',tail='#ff5a12';if(n.includes('Ion')){core='#e0f0ff';mid='#6aa8ff';tail='#3050ff'}else if(n.includes('Atomic')){core='#f4f8ff';mid='#b8d0ff';tail='#6080ff'}else if(n.includes('Spark')){core='#fff';mid='#ffc0a0';tail='#ff6a8a'}
    const atm=new THREE.Group(),vac=new THREE.Group(),mats=[];const M=(a,b,o,d,pw)=>{const m=plumeMat(a,b,o,d,pw);mats.push(m);return m};
    const r0=n.includes('Aerospike')?w*.35:w*.44;
    atm.add(plume(r0*1.05,w*.9,w*7,M(mid,tail,1.1,0,.9),.7),plume(r0*.92,w*.42,w*4.2,M(core,mid,1.4,0,.7)),plume(r0*.72,w*.06,w*2.6,M('#ffffff',core,2,1,.5),1.2));
    vac.add(plume(r0,w*3.2,w*6,M(mid,tail,.7,0,1.3),.55),plume(r0*.9,w*1.6,w*4,M(core,mid,.9,0,1),.6),plume(r0*.7,w*.3,w*1.6,M('#ffffff',core,.9,0,.6),1));
    // shock diamonds (mach disks)
    const dm=new THREE.SpriteMaterial({map:glowTex('#ffd9a0'),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:.8}),dia=[];
    for(let i=0;i<4;i++){const s=new THREE.Sprite(dm.clone());s.position.y=-w*(.55+i*.58);s.scale.setScalar(w*(.9-i*.15));atm.add(s);dia.push(s)}
    const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex(mid),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:.9}));glow.scale.setScalar(w*2.4);glow.position.y=-w*.5;glow.material.opacity=.5;f.add(glow);
    if(n.includes('Ion')){atm.visible=false;vac.scale.set(.6,1.3,.6)}
    f.add(atm,vac);f.userData={atm,vac,mats,dia,glow,w};f.position.y=-Ht/2;f.visible=false;g.userData.flame=f;g.add(f)}
  return g};
// ---------- launch pad ----------
padGroup=function(){const g=new THREE.Group(),conc=std({color:'#77756f',roughness:.95,metalness:0,envMapIntensity:.4,side:THREE.FrontSide}),red=std({color:'#c8501e',roughness:.55,metalness:.6}),grey=metal('#7d8288',.5);
  const pc=cvs(512),pg=pc.getContext('2d');pg.fillStyle='#8f8d86';pg.fillRect(0,0,512,512);for(let i=0;i<4000;i++){const v=110+rnd()*60|0;pg.fillStyle=`rgba(${v},${v},${v-5},.25)`;pg.fillRect(rnd()*512,rnd()*512,2,2)}
  pg.strokeStyle='rgba(60,60,60,.5)';for(let x=0;x<512;x+=64){pg.beginPath();pg.moveTo(x,0);pg.lineTo(x,512);pg.moveTo(0,x);pg.lineTo(512,x);pg.stroke()}
  const sg=pg.createRadialGradient(256,256,10,256,256,200);sg.addColorStop(0,'rgba(20,15,10,.85)');sg.addColorStop(1,'rgba(20,15,10,0)');pg.fillStyle=sg;pg.fillRect(0,0,512,512);
  pg.strokeStyle='#e8c020';pg.lineWidth=6;pg.beginPath();pg.arc(256,256,170,0,7);pg.stroke();const ptx=ctex(pc,1);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(30,34,3,48),std({color:'#55534e',roughness:1,metalness:0,envMapIntensity:.3,side:THREE.FrontSide}));base.position.y=-1.48;g.add(base);
  const deckM=std({color:'#fff',map:ptx,roughness:.9,metalness:0,side:THREE.FrontSide});const deck=new THREE.Mesh(new THREE.BoxGeometry(22,2,22),[conc,conc,deckM,conc,conc,conc]);deck.position.y=-.94;g.add(deck);
  const tr=new THREE.Mesh(new THREE.BoxGeometry(6,.1,26),std({color:'#050505',roughness:1}));tr.position.y=.08;g.add(tr);
  for(const s of[-1,1]){const wall=new THREE.Mesh(new THREE.BoxGeometry(.6,1.2,26),conc);wall.position.set(s*3.3,.6,0);g.add(wall)}
  for(const[x,z]of[[-2.6,-2.6],[2.6,-2.6],[-2.6,2.6],[2.6,2.6]]){const c=new THREE.Mesh(new THREE.BoxGeometry(.7,1.4,.7),grey);c.position.set(x,.7,z);g.add(c)}
  // lattice tower via instancing
  const T=[],bar=(a,b,th)=>T.push([a,b,th||.14]);const tx=11,hw=1.6,TH=62,lv=3.1;
  const cs=[[-1,-1],[1,-1],[1,1],[-1,1]];for(const[cx,cz]of cs)bar([tx+cx*hw,0,cz*hw],[tx+cx*hw,TH,cz*hw],.3);
  for(let y=0;y<TH;y+=lv)for(let k=0;k<4;k++){const A=cs[k],B=cs[(k+1)%4];bar([tx+A[0]*hw,y,A[1]*hw],[tx+B[0]*hw,y,B[1]*hw]);bar([tx+A[0]*hw,y,A[1]*hw],[tx+B[0]*hw,y+lv,B[1]*hw],.1)}
  for(const H of[22,38,52]){for(const s of[-1,1]){bar([tx-hw,H,s*.7],[4.2,H,s*.7],.2);bar([tx-hw,H-2.2,s*.7],[6,H,s*.7],.12)}bar([4.2,H,-.7],[4.2,H,.7],.2)}
  const geo=new THREE.BoxGeometry(1,1,1),im=new THREE.InstancedMesh(geo,red,T.length),M4=new THREE.Matrix4(),q=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0);
  T.forEach(([a,b,th],i)=>{const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A),L=d.length();q.setFromUnitVectors(up,d.normalize());M4.compose(A.clone().add(B).multiplyScalar(.5),q,new THREE.Vector3(th,L,th));im.setMatrixAt(i,M4)});g.add(im);
  for(const H of[22,38,52]){const pl=new THREE.Mesh(new THREE.BoxGeometry(hw*2+.4,.15,hw*2+.4),grey);pl.position.set(tx,H,0);g.add(pl)}
  const cap=new THREE.Mesh(new THREE.ConeGeometry(.15,10,6),grey);cap.position.set(tx,TH+5,0);g.add(cap);
  const blink=new THREE.Mesh(new THREE.SphereGeometry(.35,10,8),new THREE.MeshBasicMaterial({color:'#ff2020'}));blink.position.set(tx,TH+10,0);g.add(blink);g.userData.blink=blink;
  // water tower + tanks
  const wt=new THREE.Group();wt.position.set(-26,0,-18);g.add(wt);const ws=new THREE.Mesh(new THREE.SphereGeometry(5,24,16),std({color:'#e8e8e8',metalness:.5,roughness:.4}));ws.position.y=22;wt.add(ws);
  for(let k=0;k<4;k++){const a=k*PI/2+.4,l=cyl(.25,.25,20,grey,8);l.position.set(Math.cos(a)*3.5,10,Math.sin(a)*3.5);wt.add(l)}
  for(const[x,z]of[[-22,14],[-16,18]]){const sp=new THREE.Mesh(new THREE.SphereGeometry(3,20,14),std({color:'#f2f2f2',metalness:.4,roughness:.35}));sp.position.set(x,3,z);g.add(sp)}
  for(const[x,z]of[[-16,-16],[16,16],[-16,16],[16,-16]]){const m=cyl(.12,.3,70,grey,6);m.position.set(x*1.5,35,z*1.5);g.add(m)}
  const lamp=new THREE.PointLight(0xffe0b0,.8,90,2);lamp.position.set(8,40,4);g.add(lamp);
  return g};
// ---------- scene extras ----------
const _i=init3D;let FX=null;
init3D=function(){const first=!G3,g=_i();if(first&&g){
  // smoke: soft billowy puffs
  const pt=puffTex();for(const p of g.smoke){p.s.material.map=pt;p.s.material.color.set('#eceae6');p.s.material.rotation=Math.random()*6.28;p.s.material.needsUpdate=true}
  // chute canopy with gores + shroud lines
  g.chute.clear();{const gm=[std({color:'#e03a2a',roughness:.85,metalness:0}),std({color:'#f5f2ea',roughness:.85,metalness:0})];
    for(let i=0;i<12;i++){const pts=[];for(let j=0;j<=10;j++){const a=j/10*PI*.46;pts.push(new THREE.Vector2(Math.sin(a)*(1-.04*Math.sin(j)),Math.cos(a)*.9-.0))}
      const seg=new THREE.Mesh(new THREE.LatheGeometry(pts,4,i*PI/6,PI/6),gm[i%2]);g.chute.add(seg)}
    const vent=new THREE.Mesh(new THREE.TorusGeometry(.08,.02,6,16),gm[1]);vent.rotation.x=PI/2;vent.position.y=.9;g.chute.add(vent);
    const lp=[];for(let i=0;i<12;i++){const a=i*PI/6,x=Math.sin(PI*.46)*Math.cos(a),z=Math.sin(PI*.46)*Math.sin(a),y=Math.cos(PI*.46)*.9;lp.push(x,y,z,0,-2.25,0)}
    const lg=new THREE.BufferGeometry();lg.setAttribute('position',new THREE.Float32BufferAttribute(lp,3));g.chute.add(new THREE.LineSegments(lg,new THREE.LineBasicMaterial({color:'#ddd'})))}
  // reentry plasma sheath
  const sm=plumeMat('#ffd0a0','#ff3a80',0,0,.7);sm.side=THREE.DoubleSide;const shp=[];for(let i=0;i<=20;i++){const s=i/20;shp.push(new THREE.Vector2(.05+Math.pow(s,.55)*.75,.9-s*2.6))}
  const sheath=new THREE.Mesh(new THREE.LatheGeometry(shp,40),sm);sheath.visible=false;g.sc.add(sheath);g.heat.material.map=glowTex('#ff5020');g.heat.material.color.set('#7a3418');
  // explosion pool
  const fire=glowTex('#ff8a20'),pt2=puffTex(),parts=[];for(let i=0;i<70;i++){const sm2=i<35;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:sm2?fire:pt2,blending:sm2?THREE.AdditiveBlending:THREE.NormalBlending,transparent:true,depthWrite:false,color:sm2?'#ffb060':'#2a2522'}));s.visible=false;g.sc.add(s);parts.push({s,fire:sm2,life:0})}
  const chunks=[];for(let i=0;i<14;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(1,.3,.7),metal(i%3?'#ccc':'#333',.5));m.visible=false;g.sc.add(m);chunks.push({m})}
  FX={sheath,parts,chunks,wasDead:false,T:0}}
  return g};
const _r=render3D;
render3D=function(gx,gy){const g=G3;if(g&&FX&&R){const b=R.b,rr=Math.hypot(R.x,R.y),alt=rr-b.R,now=performance.now()/1000,dt=1/60;
  const af=b.atm?Math.max(0,Math.min(1,1-alt/b.atm)):0;
  if(g.rocket){const f=g.rocket.userData.flame;for(const h of g.rocket.userData.hot||[])h.visible=!!R.burning||!!h.userData.always;
    if(f&&f.userData.mats){const u=f.userData,dens=Math.pow(af,.6);u.atm.visible=dens>.02&&!R.parts[R.parts.length-1].name.includes('Ion');u.vac.visible=dens<.98;
      const thr=.5+.5*(R.thr||0);u.mats.forEach((m,i)=>{m.uniforms.time.value=now;const inAtm=i<3;m.uniforms.op.value=m.uniforms.op0.value*thr*(inAtm?Math.max(.3,dens):Math.max(.25,1-dens))});
      u.dia.forEach((s,i)=>{s.material.opacity=dens*(.6+.3*Math.sin(now*60+i))*thr;s.visible=dens>.15});u.glow.material.opacity=.35+.2*Math.random();
      // unscale the shock spacing a bit so it reads as fixed diamonds
      u.atm.scale.set(1,1+.04*Math.sin(now*40),1)}}
  // push fresh exhaust smoke behind the visible plume so it doesn't smother the flame
  {const nx=Math.sin(R.ang),ny=Math.cos(R.ang),lw=R.parts.length?R.parts[R.parts.length-1].w:2;for(const p of g.smoke){if(p.life>.99&&!p._s){p.x-=nx*lw*4;p.y-=ny*lw*4;p._s=1}else if(p.life<=.99)p._s=0}}
  // pad blink
  if(g.pad.userData.blink)g.pad.userData.blink.visible=(now%1.4)<.7;
  // ground billow on lift-off
  if(R.burning&&R.pad&&R.pad.b===b&&alt<120&&b.atm&&!R.dead){const ux=R.x/rr,uy=R.y/rr,tx=uy,ty=-ux,w=R.parts[R.parts.length-1].w;
    for(let k=0;k<3;k++){const p=g.smoke[g.si++%g.smoke.length],sd=Math.random()<.5?-1:1,sp=20+Math.random()*40;p.x=b.R*Math.cos(R.pad.th)+ux*1.5+tx*sd*3;p.y=b.R*Math.sin(R.pad.th)+uy*1.5+ty*sd*3;p.z=(Math.random()-.5)*w*8;p.life=1;p.b=b;p.sz=w*2.5+Math.random()*4;
      p._s=1;p.vx=tx*sd*sp+ux*(2+Math.random()*6);p.vy=ty*sd*sp+uy*(2+Math.random()*6);p.s.material.rotation=Math.random()*6.28}}
  // reentry plasma
  const v=Math.hypot(R.vx,R.vy)||1,Ht=rocketH();const sh=FX.sheath;sh.visible=R.heatFx>0&&!R.dead;
  if(sh.visible){const k=Math.min(1,R.heatFx/12);sh.material.uniforms.op.value=.6+k*1.6;sh.material.uniforms.time.value=now;const W=Math.max(...R.parts.map(p=>p.w));
    sh.scale.set(W*1.1+k*W*.4,Ht*(.7+k*.6),W*1.1+k*W*.4);sh.position.set(R.vx/v*Ht*.1,R.vy/v*Ht*.1,0);sh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(R.vx/v,R.vy/v,0))}
  // explosion
  if(R.dead&&!FX.wasDead){FX.T=0;FX.bx=R.x;FX.by=R.y;FX.b=b;const S=Math.max(8,Ht*1.2);
    FX.parts.forEach((p,i)=>{const a=Math.random()*6.28,e=Math.random()*2-1,sp=(p.fire?.6:.35)*S*(.5+Math.random());p.x=0;p.y=0;p.z=0;p.vx=Math.cos(a)*Math.sqrt(1-e*e)*sp;p.vy=Math.sin(a)*Math.sqrt(1-e*e)*sp;p.vz=e*sp;p.life=p.fire?.8+Math.random()*.6:2+Math.random()*2;p.l0=p.life;p.sz=S*(p.fire?.4:.5)*(.5+Math.random());p.del=p.fire?Math.random()*.2:.1+Math.random()*.4});
    FX.chunks.forEach(c=>{c.m.visible=true;c.p=new THREE.Vector3();c.v=new THREE.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5).multiplyScalar(S*3);c.w=new THREE.Vector3(Math.random()*8,Math.random()*8,Math.random()*8);c.m.scale.setScalar(S*.12*(.5+Math.random()));c.life=3})}
  FX.wasDead=!!R.dead;
  if(FX.b){FX.T+=dt;const ox=FX.bx-R.x,oy=FX.by-R.y,live=R.dead&&FX.T<6;
    for(const p of FX.parts){if(!live||p.life<=0){p.s.visible=false;continue}if(p.del>0){p.del-=dt;p.s.visible=false;continue}p.life-=dt;const k=p.life/p.l0;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vx*=.95;p.vy*=.95;p.vz*=.95;p.sz*=1+dt*(p.fire?1.4:.6);
      p.s.visible=true;p.s.position.set(ox+p.x,oy+p.y,p.z);p.s.scale.setScalar(p.sz);p.s.material.opacity=p.fire?Math.min(1,k*1.6):Math.min(.75,k*.5);if(p.fire)p.s.material.color.setHSL(.05+.06*k,1,.35+.3*k)}
    for(const c of FX.chunks){if(!live||c.life<=0){c.m.visible=false;continue}c.life-=dt;c.p.addScaledVector(c.v,dt);c.m.position.set(ox+c.p.x,oy+c.p.y,c.p.z);c.m.rotation.x+=c.w.x*dt;c.m.rotation.y+=c.w.y*dt}
    if(!live)FX.b=null}
  if(R.dead)g.boom.material.opacity=Math.max(0,1-FX.T*.6)}
  _r(gx,gy)};
})();
