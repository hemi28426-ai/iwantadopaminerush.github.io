// Unblocked Rocketry: 3D map view (replaces the 2D map when `map` is true)
(function(){
if(!window.THREE)return;
window.MAP3D=true;
let S=null;
function init(){if(S)return S;const g=init3D();if(!g)return null;
 const sc=new THREE.Scene(),cam=new THREE.PerspectiveCamera(50,1,.5,1e7);sc.add(new THREE.AmbientLight(0xffffff,.35));const sun=new THREE.PointLight(0xfff4e0,1.6,0,0);sc.add(sun);
 const sg=new THREE.SphereGeometry(1,48,24),bodies3=new Map();
 for(const b of BL){const grp=g.bm.get(b);const mat=b.n=='Sun'?new THREE.MeshBasicMaterial({color:'#ffd27a'}):grp?grp.userData.mat:new THREE.MeshStandardMaterial({color:b.col});
  const m=new THREE.Mesh(sg,mat);sc.add(m);let orb=null;
  if(b.p){const pts=[];for(let i=0;i<=256;i++){const a=i/256*Math.PI*2;pts.push(new THREE.Vector3(Math.cos(a),Math.sin(a),0))}
   orb=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:b.col,transparent:true,opacity:.45}));sc.add(orb)}
  bodies3.set(b,{m,orb})}
 if(bodies3.get(bodies.Sun)){const gl=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex('#ffb040'),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));bodies3.get(bodies.Sun).m.add(gl);gl.scale.setScalar(5)}
 const N=800,tg=new THREE.BufferGeometry();tg.setAttribute('position',new THREE.BufferAttribute(new Float32Array(N*3),3));
 const traj=new THREE.Line(tg,new THREE.LineBasicMaterial({color:'#5dffa8'}));sc.add(traj);
 const glow=new THREE.Line(tg,new THREE.LineBasicMaterial({color:'#3ee08a',transparent:true,opacity:.35,blending:THREE.AdditiveBlending}));glow.scale.setScalar(1.002);sc.add(glow);
 const soiPts=[];for(let i=0;i<=128;i++){const a=i/128*Math.PI*2;soiPts.push(new THREE.Vector3(Math.cos(a),Math.sin(a),0))}
 const soi=new THREE.Line(new THREE.BufferGeometry().setFromPoints(soiPts),new THREE.LineDashedMaterial({color:'#4fc3ff',dashSize:.03,gapSize:.03,transparent:true,opacity:.5}));soi.computeLineDistances();sc.add(soi);
 const mk=c=>{const m=new THREE.Mesh(new THREE.ConeGeometry(1,2.2,12),new THREE.MeshBasicMaterial({color:c}));m.rotation.x=Math.PI;sc.add(m);return m};
 const ship=new THREE.Mesh(new THREE.ConeGeometry(1,3,4),new THREE.MeshBasicMaterial({color:'#5dffa8'}));sc.add(ship);
 const stars=g.stars3.clone();sc.add(stars);
 S={g,sc,cam,sun,bodies3,traj,glow,tg,N,soi,ap:mk('#4fc3ff'),pe:mk('#ff9a2e'),ship,stars};return S}
let yaw=0,pitch=.9,drag=false,lx=0,ly=0,wasMap=false,saved=null;
cv.addEventListener('mousedown',e=>{if(map){drag=true;lx=e.clientX;ly=e.clientY}});addEventListener('mouseup',()=>drag=false);
addEventListener('mousemove',e=>{if(!drag||!map)return;yaw-=(e.clientX-lx)*.006;pitch=Math.max(.05,Math.min(1.55,pitch+(e.clientY-ly)*.006));lx=e.clientX;ly=e.clientY});
const v3=new THREE.Vector3();
function loop(){requestAnimationFrame(loop);
 if(map&&R&&!wasMap)saved=[camYaw,camPitch];if(!map&&wasMap&&saved){[camYaw,camPitch]=saved}wasMap=map&&!!R;
 if(!map||!R)return;const s=init();if(!s)return;if(map&&saved){camYaw=saved[0];camPitch=saved[1]}
 const{g,sc,cam}=s,ren=g.ren;if(g.gl.width!==Math.round(W*ren.getPixelRatio())||g.gl.height!==Math.round(H*ren.getPixelRatio())){ren.setSize(W,H,false)}
 cam.aspect=W/H;cam.updateProjectionMatrix();g.gl.style.display='block';cx.clearRect(0,0,W,H);
 const Z=mapZ,[gx,gy]=gpos(),P=(X,Y)=>[(X-gx)*Z,(Y-gy)*Z];
 const dist=(H/2)/Math.tan(25*Math.PI/180);
 cam.position.set(Math.sin(yaw)*Math.sin(pitch)*dist,-Math.cos(yaw)*Math.sin(pitch)*dist,Math.cos(pitch)*dist);cam.up.set(0,0,1);if(pitch<.06)cam.up.set(-Math.sin(yaw),Math.cos(yaw),0);cam.lookAt(0,0,0);
 cam.near=dist*.002;cam.far=dist*1e4;cam.updateProjectionMatrix();s.stars.position.copy(cam.position);s.stars.scale.setScalar(dist*50/1e12);
 const labels=[];
 for(const[b,o]of s.bodies3){const[x,y]=P(...bpos(b,t));const r=Math.max(b.R*Z,b.n=='Sun'?6:3);o.m.position.set(x,y,0);o.m.scale.setScalar(r);
  if(b.n=='Sun')s.sun.position.set(x,y,0);
  if(o.orb){const[px,py]=P(...bpos(b.p,t)),ra=b.a*Z;o.orb.visible=ra>Math.max(b.p.R*Z,3)+4&&ra<1e6;o.orb.position.set(px,py,0);o.orb.scale.setScalar(ra);o.orb.material.opacity=b===R.b?.9:.4}
  o.m.visible=Math.hypot(x,y)<5e6;if(o.m.visible)labels.push([b,o.m.position,r])}
 // trajectory
 const bp=bpos(R.b,t),pts=predict(),arr=s.tg.attributes.position.array;let n=Math.min(pts.length,s.N),A=null,Pe=null,mx=-1,mn=1e99;
 for(let i=0;i<n;i++){const[x,y]=P(bp[0]+pts[i][0],bp[1]+pts[i][1]);arr[i*3]=x;arr[i*3+1]=y;arr[i*3+2]=0;const r=Math.hypot(pts[i][0],pts[i][1]);if(r>mx){mx=r;A=[x,y]}if(r<mn){mn=r;Pe=[x,y]}}
 s.tg.setDrawRange(0,n);s.tg.attributes.position.needsUpdate=true;s.tg.computeBoundingSphere();
 const o=orbit(),ms=dist*.006;
 s.ap.visible=!!A&&o.e<1&&isFinite(o.ap);if(s.ap.visible){s.ap.position.set(A[0],A[1],ms*1.2);s.ap.scale.setScalar(ms)}
 s.pe.visible=!!Pe;if(Pe){s.pe.position.set(Pe[0],Pe[1],ms*1.2);s.pe.scale.setScalar(ms)}
 s.ship.position.set(0,0,0);s.ship.scale.setScalar(ms*1.2);s.ship.rotation.set(0,0,-R.ang);
 const[cbx,cby]=P(...bp),sr=R.b.soi*Z;s.soi.visible=isFinite(sr)&&sr>4&&sr<1e6;if(s.soi.visible){s.soi.position.set(cbx,cby,0);s.soi.scale.setScalar(sr)}
 ren.setClearColor(0x02040a);ren.render(sc,cam);
 // DOM-free labels on the transparent 2D canvas
 const L=(p,txt,col,font)=>{v3.copy(p).project(cam);if(v3.z>1)return;const sx=(v3.x+1)/2*W,sy=(1-v3.y)/2*H;if(sx<-60||sx>W+60||sy<-30||sy>H+30)return;cx.font=font;cx.fillStyle='#000a';cx.fillText(txt,sx+9,sy+5);cx.fillStyle=col;cx.fillText(txt,sx+8,sy+4)};
 for(const[b,p]of labels)L(p,b.n,b===R.b?'#4fc3ff':'#e8f1ff','600 12px Rajdhani,system-ui');
 if(s.ap.visible)L(s.ap.position,'Ap '+fmt(o.ap),'#4fc3ff','700 11px Orbitron,system-ui');if(Pe)L(s.pe.position,'Pe '+fmt(o.pe),'#ff9a2e','700 11px Orbitron,system-ui');
 cx.font='700 12px Orbitron,system-ui';cx.fillStyle='#4fc3ff';cx.fillText('MAP · '+R.b.n.toUpperCase()+(o.e>=1?' · ESCAPE':'')+' · drag to rotate, wheel to zoom',16,92)}
// start after ui.js's loop so our clear of cx wipes its 2D map overlay
requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(loop)));
})();
