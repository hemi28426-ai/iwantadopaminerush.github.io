// Sword swoosh trail: additive ribbon following the blade during swings.
(function(){
window.UBXA=window.UBXA||{};
var N=10,FADE=0.15;
var vA=new THREE.Vector3(),vB=new THREE.Vector3(),vH=new THREE.Vector3(),tmpC=new THREE.Color();
var IDX=[];for(var i=0;i<N-1;i++){var a=2*i,b=2*i+1,c=2*i+2,d=2*i+3;IDX.push(a,b,c,b,d,c);}
function make(o,c){
 var g=new THREE.BufferGeometry();
 var pos=new THREE.BufferAttribute(new Float32Array(N*6),3);
 var col=new THREE.BufferAttribute(new Float32Array(N*6),3);
 pos.setUsage(THREE.DynamicDrawUsage);col.setUsage(THREE.DynamicDrawUsage);
 g.setAttribute('position',pos);g.setAttribute('color',col);g.setIndex(IDX);
 var m=new THREE.MeshBasicMaterial({color:0xffffff,vertexColors:true,transparent:true,opacity:1,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,depthWrite:false,fog:false});
 var mesh=new THREE.Mesh(g,m);mesh.frustumCulled=false;mesh.renderOrder=5;
 (scene||c.root.parent).add(mesh);
 return {mesh:mesh,g:g,m:m,pos:pos,col:col,n:0,fade:1,live:false,scene:scene};
}
function kill(o){
 var t=o._trail;if(!t)return;
 if(t.mesh.parent)t.mesh.parent.remove(t.mesh);
 t.g.dispose();t.m.dispose();o._trail=null;
}
function sample(t,c){
 var b=c.blade;b.updateWorldMatrix(true,false);
 vA.set(0,-1.5,0).applyMatrix4(b.matrixWorld);
 vB.set(0,1.5,0).applyMatrix4(b.matrixWorld);
 (c.sw||b).getWorldPosition(vH);
 if(vA.distanceToSquared(vH)>vB.distanceToSquared(vH)){var x=vA;vA=vB;vB=x;} // vA=base, vB=tip
 var p=t.pos.array;
 if(t.n===0){for(var i=0;i<N;i++){p.set([vA.x,vA.y,vA.z,vB.x,vB.y,vB.z],i*6);}}
 else p.copyWithin(6,0,(N-1)*6);
 p[0]=vA.x;p[1]=vA.y;p[2]=vA.z;p[3]=vB.x;p[4]=vB.y;p[5]=vB.z;
 if(t.n<N)t.n++;
}
function paint(t,c){
 var base=c.blade&&c.blade.material&&c.blade.material.color;
 if(base)tmpC.copy(base);else tmpC.setRGB(1,1,1);
 var ca=t.col.array;
 for(var i=0;i<N;i++){
  var f=1-i/(N-1);f=f*f*(i<t.n?1:0);
  var k=f*0.9;
  // tip brighter, base dimmer
  ca[i*6]=tmpC.r*k*.5;ca[i*6+1]=tmpC.g*k*.5;ca[i*6+2]=tmpC.b*k*.5;
  ca[i*6+3]=Math.min(1,tmpC.r*k+k*.25);ca[i*6+4]=Math.min(1,tmpC.g*k+k*.25);ca[i*6+5]=Math.min(1,tmpC.b*k+k*.25);
 }
 t.col.needsUpdate=true;t.pos.needsUpdate=true;
}
UBXA.trail=function(o,c,dt){
 if(!c||!c.blade){return;}
 var t=o._trail;
 var on=o.swing>0&&!o.ko;
 if(t&&(t.scene!==scene||!t.mesh.parent)){kill(o);t=null;}
 if(on){
  if(!t){t=o._trail=make(o,c);}
  t.live=true;t.fade=1;t.m.opacity=1;
  sample(t,c);paint(t,c);
 }else if(t){
  if(t.live){t.live=false;}
  t.fade-=dt/FADE;
  if(t.fade<=0){kill(o);return;}
  t.m.opacity=t.fade;
 }
};
})();
