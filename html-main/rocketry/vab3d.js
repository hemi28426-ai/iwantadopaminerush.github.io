// Unblocked Rocketry: 3D hangar view for the VAB (replaces the 2D #vab preview)
(function(){
if(!window.THREE||typeof rocketGroup!=='function')return;
const vab=$('vab');const cvs=document.createElement('canvas');cvs.id='vab3d';cvs.style.cssText='margin-top:8px;cursor:grab;display:block;border-radius:8px;touch-action:none';
vab.parentNode.insertBefore(cvs,vab.nextSibling);vab.style.display='none';
const ren=new THREE.WebGLRenderer({canvas:cvs,antialias:true});ren.setPixelRatio(Math.min(2,devicePixelRatio||1));
ren.outputEncoding=THREE.sRGBEncoding;ren.toneMapping=THREE.ACESFilmicToneMapping;ren.toneMappingExposure=.75;ren.shadowMap.enabled=true;
const sc=new THREE.Scene(),cam=new THREE.PerspectiveCamera(45,1,.1,2000);sc.background=new THREE.Color('#0b1018');sc.fog=new THREE.Fog('#0b1018',120,320);
// env map
{const es=new THREE.Scene(),eg=new THREE.SphereGeometry(10,32,16),cols=[],pp=eg.attributes.position;
 for(let i=0;i<pp.count;i++){const y=pp.getY(i)/10;const c=y>0?new THREE.Color('#c8d4e8').lerp(new THREE.Color('#303848'),y):new THREE.Color('#807868').lerp(new THREE.Color('#202020'),-y);cols.push(c.r,c.g,c.b)}
 eg.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));es.add(new THREE.Mesh(eg,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide})));
 sc.environment=new THREE.PMREMGenerator(ren).fromScene(es).texture}
sc.add(new THREE.HemisphereLight(0xdde8ff,0x2a2520,.3));sc.add(new THREE.AmbientLight(0xffffff,.12));
const M=(c,o)=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.8,metalness:.2},o));
const hangar=new THREE.Group();sc.add(hangar);
// floor with markings
{const c=document.createElement('canvas');c.width=c.height=1024;const g=c.getContext('2d');g.fillStyle='#5a5d62';g.fillRect(0,0,1024,1024);
 for(let i=0;i<4000;i++){g.fillStyle=`rgba(${Math.random()<.5?0:255},${Math.random()<.5?0:255},${Math.random()<.5?0:255},.04)`;g.fillRect(Math.random()*1024,Math.random()*1024,3,3)}
 g.strokeStyle='#00000040';g.lineWidth=2;for(let x=0;x<=1024;x+=64){g.beginPath();g.moveTo(x,0);g.lineTo(x,1024);g.moveTo(0,x);g.lineTo(1024,x);g.stroke()}
 g.strokeStyle='#e8b020';g.lineWidth=10;g.beginPath();g.arc(512,512,150,0,7);g.stroke();g.lineWidth=6;g.beginPath();g.arc(512,512,190,0,7);g.stroke();
 for(let i=0;i<24;i++){g.fillStyle=i%2?'#e8b020':'#222';g.fillRect(100+i*34,60,34,26);g.fillRect(100+i*34,938,34,26)}
 g.fillStyle='#e8b020';g.font='bold 54px system-ui';g.textAlign='center';g.fillText('ASSEMBLY BAY 1',512,850);
 const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=8;
 const fl=new THREE.Mesh(new THREE.PlaneGeometry(120,120),M('#fff',{map:t,roughness:.6,metalness:.1}));fl.rotation.x=-Math.PI/2;fl.receiveShadow=true;hangar.add(fl)}
// walls + girders
const wallM=M('#1c222c',{roughness:.95,side:THREE.DoubleSide}),girM=M('#c8762a',{metalness:.6,roughness:.45}),greyM=M('#59606b',{metalness:.7,roughness:.4});
const WH=110;
for(const[x,z,ry]of[[0,-60,0],[0,60,Math.PI],[-60,0,Math.PI/2],[60,0,-Math.PI/2]]){const w=new THREE.Mesh(new THREE.PlaneGeometry(120,WH),wallM);w.position.set(x,WH/2,z);w.rotation.y=ry;hangar.add(w);
 for(let i=-50;i<=50;i+=20){const col=new THREE.Mesh(new THREE.BoxGeometry(1.4,WH,1.4),greyM);const v=new THREE.Vector3(i,WH/2,-58.5).applyAxisAngle(new THREE.Vector3(0,1,0),ry);col.position.copy(v);col.rotation.y=ry;hangar.add(col)}
 for(let y=12;y<WH;y+=18){const b=new THREE.Mesh(new THREE.BoxGeometry(120,.8,.8),greyM);const v=new THREE.Vector3(0,y,-58.6).applyAxisAngle(new THREE.Vector3(0,1,0),ry);b.position.copy(v);b.rotation.y=ry;hangar.add(b)}}
for(let i=-50;i<=50;i+=20){const tr=new THREE.Mesh(new THREE.BoxGeometry(120,1.6,1),greyM);tr.position.set(0,WH-2,i);hangar.add(tr)}
// work lights
for(const[x,z]of[[-30,-30],[30,-30],[-30,30],[30,30]]){const l=new THREE.SpotLight(0xfff0d8,.9,300,.7,.5,1);l.position.set(x,WH-6,z);l.target.position.set(0,10,0);hangar.add(l,l.target);
 const lamp=new THREE.Mesh(new THREE.CylinderGeometry(1.5,2.2,1.2,16),new THREE.MeshBasicMaterial({color:'#fff6e0'}));lamp.position.copy(l.position);hangar.add(lamp)}
const key=new THREE.DirectionalLight(0xffffff,1.1);key.position.set(25,60,35);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-40,right:40,top:40,bottom:-40,far:200});sc.add(key);
// assembly platform
const plat=new THREE.Mesh(new THREE.CylinderGeometry(7,7.5,.6,40),M('#3d434c',{metalness:.6,roughness:.5}));plat.position.y=.3;plat.receiveShadow=true;hangar.add(plat);
// gantry tower (height set per rocket)
const gantry=new THREE.Group();hangar.add(gantry);
function buildGantry(h){gantry.clear();const H=Math.max(10,h+4),x0=9;
 for(const[dx,dz]of[[0,-1.5],[3,-1.5],[0,1.5],[3,1.5]]){const p=new THREE.Mesh(new THREE.BoxGeometry(.4,H,.4),girM);p.position.set(x0+dx,H/2,dz);gantry.add(p)}
 for(let y=0;y<H;y+=3){for(const dz of[-1.5,1.5]){const d=new THREE.Mesh(new THREE.BoxGeometry(.18,4.24,.18),girM);d.position.set(x0+1.5,y+1.5,dz);d.rotation.z=Math.PI/4*(y/3%2?1:-1);gantry.add(d)}
  const r=new THREE.Mesh(new THREE.BoxGeometry(3.4,.2,3.4),girM);r.position.set(x0+1.5,y,0);gantry.add(r)}
 for(let y=6;y<h;y+=Math.max(6,h/4)){const arm=new THREE.Mesh(new THREE.BoxGeometry(x0-1.5,.35,1.2),greyM);arm.position.set((x0+1.5)/2+.2,y,0);gantry.add(arm)}}
// rocket
let rocket=null,rkey='',Ht=0,dist=40,yaw=.6,pitch=.25,selBox=null,shownSel=-2;
function rebuild(){const k=design.map(p=>[p.name,p.h,p.w,p.col,p.type].join()).join('|');if(k===rkey&&rocket)return;rkey=k;shownSel=-2;
 if(rocket){sc.remove(rocket)}Ht=design.reduce((s,p)=>s+p.h,0);rocket=rocketGroup(design);
 if(rocket.userData.flame)rocket.userData.flame.visible=false;rocket.traverse(o=>{if(o.isMesh)o.castShadow=true;if(o.isSprite)o.visible=false});
 rocket.position.y=.6+Ht/2;sc.add(rocket);buildGantry(Ht);const W=Math.max(4,...design.map(p=>p.w),1);dist=Math.max(14,Math.max(Ht,W*2)*2.6)}
function highlight(){if(!rocket||shownSel===sel)return;shownSel=sel;
 rocket.children.forEach((ch,i)=>ch.traverse(o=>{if(!o.isMesh||!o.material||!o.material.emissive)return;
  if(!o.userData.om){o.userData.om=o.material;}const on=i===sel&&i<design.length;
  if(on){o.material=o.userData.om.clone();o.material.emissive=new THREE.Color('#ffb020');o.material.emissiveIntensity=.35}else o.material=o.userData.om}));
 if(selBox){sc.remove(selBox);selBox=null}
 if(sel>=0&&sel<design.length&&rocket.children[sel]){rocket.updateMatrixWorld(true);selBox=new THREE.BoxHelper(rocket.children[sel],0xffe040);sc.add(selBox)}}
function size(){const H=Math.max(200,innerHeight-cvs.getBoundingClientRect().top-16),W=Math.max(260,Math.min(innerWidth-560,600));
 if(cvs.width!==Math.round(W*ren.getPixelRatio())||cvs.height!==Math.round(H*ren.getPixelRatio())){ren.setSize(W,H);cam.aspect=W/H;cam.updateProjectionMatrix()}}
const _draw=window.drawVAB;
window.drawVAB=function(){try{_draw()}catch(e){}vab.style.display='none';rebuild();shownSel=-2;highlight()};
// controls
let drag=false,moved=0,lx=0,ly=0;
cvs.addEventListener('pointerdown',e=>{drag=true;moved=0;lx=e.clientX;ly=e.clientY;cvs.style.cursor='grabbing';cvs.setPointerCapture(e.pointerId)});
cvs.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-lx,dy=e.clientY-ly;moved+=Math.abs(dx)+Math.abs(dy);yaw-=dx*.008;pitch=Math.max(-.2,Math.min(1.4,pitch+dy*.006));lx=e.clientX;ly=e.clientY});
cvs.addEventListener('pointerup',e=>{drag=false;cvs.style.cursor='grab';if(moved<5)pick(e)});
cvs.addEventListener('wheel',e=>{e.preventDefault();dist=Math.max(4,Math.min(250,dist*(e.deltaY>0?1.12:.89)))},{passive:false});
const rc=new THREE.Raycaster();
function pick(e){if(!rocket)return;const r=cvs.getBoundingClientRect();rc.setFromCamera({x:(e.clientX-r.left)/r.width*2-1,y:-(e.clientY-r.top)/r.height*2+1},cam);
 const hit=rc.intersectObjects(rocket.children.slice(0,design.length),true).find(h=>h.object.isMesh&&h.object.visible);let idx=-1;
 if(hit){let o=hit.object;while(o&&o.parent!==rocket)o=o.parent;idx=rocket.children.indexOf(o)}sel=idx;renderBuild()}
function loop(){requestAnimationFrame(loop);const b=$('build');if(!b||getComputedStyle(b).display=='none')return;size();if(!rocket)rebuild();highlight();
 const ty=.6+Ht*.45;cam.position.set(Math.sin(yaw)*Math.cos(pitch)*dist,ty+Math.sin(pitch)*dist,Math.cos(yaw)*Math.cos(pitch)*dist);
 if(cam.position.y<1)cam.position.y=1;cam.lookAt(0,ty,0);if(selBox)selBox.update();ren.render(sc,cam)}
requestAnimationFrame(loop);
})();
