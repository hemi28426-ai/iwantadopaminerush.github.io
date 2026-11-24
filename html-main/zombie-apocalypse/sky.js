// zombie-apocalypse/sky.js — night sky dome for Hollow Creek, ported from Trench War's models/sky.js.
// BackSide shader sphere that follows the camera: murky horizon band that IS the fog colour (so distant fogged geometry melts
// into it), dark blue-grey zenith, moon disc + halo, faint twinkling stars behind the cloud gaps, slow drifting fbm clouds lit
// silver on the moon side. Tone-mapped like the rest of the scene so the horizon and the fog really match.
// Same uniform names as TWM.sky (uTime, uSunDir, uHorizon, uZenith, uFogColor) plus uCloud, so fx.js's night/rain/boss/fog
// palettes drive it unchanged. Installs itself by swapping window._sky (the html copies the camera position onto it and calls
// userData.update every frame); if anything fails the old sky stays.
(function(){
'use strict';
try{
if(typeof THREE==='undefined'||typeof scene==='undefined'||!window._sky)return;
const VERT=[
'varying vec3 vDir;',
'void main(){',
'  vDir=normalize(position);',
'  vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.0);',
'  p.z=p.w*0.99999;', // far plane: never clipped
'  gl_Position=p;',
'}'].join('\n');
const FRAG=[
'uniform float uTime;',
'uniform vec3 uSunDir;',   // the moon
'uniform vec3 uHorizon;',
'uniform vec3 uZenith;',
'uniform vec3 uFogColor;',
'uniform vec3 uCloud;',
'uniform float uStars;',
'varying vec3 vDir;',
'const mat2 ROT=mat2(0.80,0.60,-0.60,0.80);',
'float hash12(vec2 p){vec3 p3=fract(vec3(p.xyx)*0.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}',
'float hash13(vec3 p3){p3=fract(p3*0.1031);p3+=dot(p3,p3.zyx+31.32);return fract((p3.x+p3.y)*p3.z);}',
'float vnoise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);',
'  return mix(mix(hash12(i),hash12(i+vec2(1.0,0.0)),u.x),mix(hash12(i+vec2(0.0,1.0)),hash12(i+vec2(1.0,1.0)),u.x),u.y);}',
'float fbm(vec2 p,float detail){float s=0.0,a=0.5;for(int i=0;i<5;i++){float w=mix(1.0,detail,clamp(float(i)*0.5,0.0,1.0));s+=a*mix(0.5,vnoise(p),w);p=ROT*p*2.03+vec2(1.73,9.21);a*=0.5;}return s;}',
'void main(){',
'  vec3 dir=normalize(vDir);',
'  vec3 moon=normalize(uSunDir);',
'  float h=dir.y,hUp=max(h,0.0);',
// fog colour right at the horizon -> slightly lighter murky band -> dark blue-grey zenith
'  vec3 sky=mix(uFogColor,uHorizon,smoothstep(0.0,0.09,hUp));',
'  sky=mix(sky,uZenith,smoothstep(0.05,0.75,pow(hUp,0.8)));',
// moon: cold halo, tight bloom, cratered disc
'  float md=max(dot(dir,moon),0.0);',
'  vec3 moonCol=vec3(0.78,0.84,0.95);',
'  float glow=0.05*pow(md,6.0)+0.10*pow(md,60.0)+0.22*pow(md,900.0);',
'  vec3 col=sky+moonCol*glow;',
'  float disc=smoothstep(0.99935,0.99955,md);',
'  vec3 mx=normalize(cross(moon,vec3(0.0,1.0,0.0))),my=cross(mx,moon);',
'  vec2 mp=vec2(dot(dir,mx),dot(dir,my))*900.0;',
'  float mare=vnoise(mp*0.18+3.1)*0.6+vnoise(mp*0.5)*0.4;',
'  col=mix(col,moonCol*(1.55-0.55*smoothstep(0.45,0.75,mare)),disc);',
// stars: one candidate per 3D cell on the sky sphere, faint, twinkling; fade out toward the murky horizon
'  vec3 sp=dir*260.0;vec3 cell=floor(sp);float sh=hash13(cell);',
'  float star=0.0;',
'  if(sh>0.965){vec3 c=cell+0.25+0.5*vec3(hash13(cell+7.1),hash13(cell+3.7),hash13(cell+1.9));',
'    float d=length(sp-c);float tw=0.65+0.35*sin(uTime*(1.5+sh*7.0)+sh*90.0);',
'    star=smoothstep(0.32,0.0,d)*tw*(sh-0.965)/0.035;}',
'  star*=smoothstep(0.06,0.4,h)*(1.0-disc)*uStars;',
'  col+=vec3(0.55,0.6,0.72)*star;',
'  if(h>0.015){',
'    float t=uTime;',
'    vec2 uv=dir.xz/max(h,0.04);',
'    vec2 p=uv*1.1+vec2(t*0.006,t*0.0024);',
'    vec2 wq=vec2(vnoise(p*0.55+vec2(0.0,t*0.003)),vnoise(p*0.55+vec2(5.2-t*0.0025,1.3)));',
'    p+=(wq-0.5)*0.9;',
'    float detail=smoothstep(0.05,0.32,h);',
'    float n=fbm(p,detail);',
'    vec2 m2=normalize(moon.xz+vec2(0.0001,0.0));',
'    float n2=fbm(p+m2*0.16,detail);',
'    float nz=(n-0.484)*9.0;',
'    float horizonT=1.0-smoothstep(0.0,0.45,h);',
'    float zc=mix(-0.35,-1.2,horizonT);',
'    float alpha=smoothstep(zc,zc+1.1,nz);',
'    float thick=smoothstep(zc+0.4,zc+2.4,nz);',
'    float moonPh=pow(md,4.0);',
'    float lit=clamp((n-n2)*6.0,0.0,1.0);',
'    vec3 cc=uCloud*mix(0.62,0.30,thick);',               // thin edges catch the sky light, thick bellies go dark
'    cc+=moonCol*uCloud*lit*(1.0-0.5*thick)*(0.35+1.6*moonPh);', // silver rims toward the moon
'    cc+=moonCol*0.09*pow(md,10.0)*(1.0-thick);',           // moonlight through thin cloud
'    float haze=1.0-smoothstep(0.02,0.35,h);',
'    cc=mix(cc,sky,haze*0.75);',
'    alpha*=smoothstep(0.02,0.16,h)*0.92;',
'    col=mix(col,cc,alpha*(1.0-disc*0.6));',
'  }',
'  col=mix(col,uFogColor,smoothstep(0.0,0.04,-h));',
'  col+=(hash12(gl_FragCoord.xy)-0.5)*(1.0/255.0);',
'  gl_FragColor=vec4(max(col,0.0),1.0);',
'  #include <tonemapping_fragment>',
'}'].join('\n');
const old=window._sky,ou=old.userData&&old.userData.uniforms;
const U={uTime:{value:0},uSunDir:{value:ou&&ou.uSunDir?ou.uSunDir.value:new THREE.Vector3(.45,.32,.35).normalize()},
 uHorizon:{value:new THREE.Color(.05,.058,.07)},uZenith:{value:new THREE.Color(.012,.016,.03)},uFogColor:{value:scene.fog?scene.fog.color.clone():new THREE.Color(.04,.05,.06)},
 uCloud:{value:new THREE.Color(.13,.14,.17)},uStars:{value:1}};
const mat=new THREE.ShaderMaterial({uniforms:U,vertexShader:VERT,fragmentShader:FRAG,side:THREE.BackSide,depthWrite:false,depthTest:false,fog:false,toneMapped:true});
const mesh=new THREE.Mesh(new THREE.SphereGeometry(460,48,24),mat);mesh.name='ZA.nightSky';mesh.renderOrder=-1;mesh.frustumCulled=false;
mesh.userData.uniforms=U;mesh.userData.sunDir=U.uSunDir.value;mesh.userData.moon=true;mesh.userData.sky=1;
mesh.userData.update=s=>{if(typeof s==='number'&&isFinite(s))U.uTime.value=s};
// compile check: if the shader fails on this GPU, keep the old sky
const R0=window.R||(typeof R!=='undefined'?R:null);
if(R0&&R0.compile){
 try{const cam0=new THREE.PerspectiveCamera();const tmp=new THREE.Scene();tmp.add(mesh);R0.compile(tmp,cam0);tmp.remove(mesh);
  const p=R0.properties.get(mat);if(p&&p.program&&p.program.diagnostics&&!p.program.diagnostics.runnable)throw new Error('night sky shader failed')}catch(e){console.warn('[ZA sky]',e);return}}
scene.remove(old);mesh.position.copy(old.position);scene.add(mesh);window._sky=mesh;window.ZA_SKY=mesh;
}catch(e){console.warn('[ZA sky] fallback to old sky',e)}
})();
