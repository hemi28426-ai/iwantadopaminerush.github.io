// Pond water: gently waving surface, fresnel sky reflection, sun glint, darker deep middle, shoreline foam, fog.
(function () {
  'use strict';
  const FG = window.FG = window.FG || {};
  FG.makeWater = function (R, sunDir) {
    const lin = c => new THREE.Color(c).convertSRGBToLinear();
    const mat = new THREE.ShaderMaterial({
      transparent: true, fog: true,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
        uT: { value: 0 }, uSun: { value: sunDir.clone().normalize() }, uR: { value: R },
        uShallow: { value: lin(0x2f8ea6) }, uDeep: { value: lin(0x0c3d5c) }, uSky: { value: lin(FG.HORIZON) }, uZen: { value: lin(FG.ZENITH) } }]),
      vertexShader: `
        uniform float uT; varying vec3 vW; varying vec2 vXZ;
        #include <fog_pars_vertex>
        void main(){ vec3 p=position; vec4 w=modelMatrix*vec4(p,1.);
          w.y+=sin(w.x*.35+uT*1.3)*.035+sin(w.z*.42-uT*1.1)*.03+sin((w.x+w.z)*.6+uT*1.7)*.012;
          vW=w.xyz; vXZ=w.xz; vec4 mvPosition=viewMatrix*w; gl_Position=projectionMatrix*mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `
        uniform float uT,uR; uniform vec3 uSun,uShallow,uDeep,uSky,uZen; varying vec3 vW; varying vec2 vXZ;
        #include <fog_pars_fragment>
        float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
        float waves(vec2 p){ return n(p*.7+vec2(uT*.3,uT*.18))*.34+n(p*1.6-vec2(uT*.28,-uT*.4))*.26+n(p*3.7+vec2(uT*.7,uT*.5))*.22+n(p*8.3-vec2(uT*.9,uT*.6))*.18; }
        float caus(vec2 p){ float a=n(p*2.2+vec2(uT*.4,uT*.3)); float b=n(p*2.2*1.37-vec2(uT*.35,-uT*.28)+7.); float c=abs(a-b); return pow(1.-smoothstep(0.,.22,c),2.); }
        void main(){
          float e=.07; vec2 p=vXZ;
          float a=waves(p),bx=waves(p+vec2(e,0.)),bz=waves(p+vec2(0.,e));
          vec3 N=normalize(vec3((a-bx)*2.6,1.,(a-bz)*2.6));
          vec3 V=normalize(cameraPosition-vW);
          float ndv=max(dot(N,V),0.);
          float fr=.03+.97*pow(1.-ndv,5.);
          float r=length(vXZ)/uR;
          float depth=1.-smoothstep(.35,1.,r);
          vec3 body=mix(uShallow,uDeep,depth*depth*.9+.05);
          float cs=caus(p)*(.3+.7*depth)*(1.-fr);
          body+=uShallow*cs*.35+vec3(.04,.06,.05)*cs;
          vec3 R=reflect(-V,N); vec3 sky=mix(uSky,uZen,pow(max(R.y,0.),.55));
          vec3 col=mix(body,sky*.9,clamp(fr*.95,0.,.85));
          vec3 H=normalize(uSun+V);
          float sp=pow(max(dot(N,H),0.),260.)*3.+pow(max(dot(reflect(-uSun,N),V),0.),90.)*.6;
          float tw=step(.82,n(p*14.+floor(uT*3.)*3.1))*pow(max(dot(N,H),0.),40.);
          col+=vec3(1.,.93,.78)*(sp+tw*1.4);
          float edge=smoothstep(.955,.995,r);
          float fn=n(p*4.+uT*.6)*.6+n(p*9.-uT*.4)*.4;
          float ring=edge*smoothstep(.62,.9,fn+edge*.3);
          float foam=clamp(ring*.7+smoothstep(.99,1.,r)*.3,0.,1.);
          col=mix(col,vec3(.9,.95,.96),foam*.5);
          gl_FragColor=vec4(col,mix(.88,.98,max(fr,foam)));
          #include <tonemapping_fragment>
          #include <encodings_fragment>
          #include <fog_fragment>
        }`
    });
    const m = new THREE.Mesh(new THREE.CircleGeometry(R, 128, 0, Math.PI * 2), mat);
    m.geometry.rotateX(-Math.PI / 2); m.receiveShadow = false;
    // circle geo has few interior verts: subdivide via a polar ring geometry for the vertex waves
    m.geometry.dispose(); m.geometry = new THREE.RingGeometry(0.01, R, 128, 24); m.geometry.rotateX(-Math.PI / 2);
    m.userData.update = t => { mat.uniforms.uT.value = t; };
    return m;
  };
  // Ocean (pro): rolling swell + chop, crest whitecaps, sun glitter path, distance-darkened colour. Same contract as FG.makeOcean.
  FG.makeOceanPro = function (sunDir, lakes) {
    const lin = c => new THREE.Color(c).convertSRGBToLinear();
    const L = lakes.slice(0, 12); while (L.length < 12) L.push(new THREE.Vector3(1e6, 1e6, 0));
    const I = []; while (I.length < 12) I.push(new THREE.Vector3(1e6, 1e6, 0));
    const swell = `
      float swellH(vec2 p,float t){
        return sin(p.x*.045+p.y*.02+t*.55)*.26+sin(p.x*-.03+p.y*.055-t*.48)*.22+sin(p.x*.085-p.y*.07+t*.9)*.12+sin(p.x*.13+p.y*.11-t*1.15)*.06; }`;
    const mat = new THREE.ShaderMaterial({ transparent: true, fog: true,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uT: { value: 0 }, uSun: { value: sunDir.clone().normalize() },
        uShallow: { value: lin(0x2f8ea6) }, uDeep: { value: lin(0x0c3d5c) }, uSky: { value: lin(0xcfe6f2) }, uZen: { value: lin(0x3f86cc) }, uLakes: { value: L }, uIsl: { value: I } }]),
      vertexShader: `uniform float uT; varying vec3 vW;
        #include <fog_pars_vertex>
        ${swell}
        void main(){ vec4 w=modelMatrix*vec4(position,1.); w.y+=swellH(w.xz,uT); vW=w.xyz; vec4 mvPosition=viewMatrix*w; gl_Position=projectionMatrix*mvPosition;
        #include <fog_vertex>
        }`,
      fragmentShader: `uniform float uT; uniform vec3 uSun,uShallow,uDeep,uSky,uZen; uniform vec3 uLakes[12]; uniform vec3 uIsl[12]; varying vec3 vW;
        #include <fog_pars_fragment>
        ${swell}
        float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
        float chop(vec2 p){ return n(p*.35+vec2(uT*.25,uT*.15))*.4+n(p*.9-vec2(uT*.3,-uT*.35))*.3+n(p*2.3+vec2(uT*.6,uT*.4))*.2+n(p*5.1-vec2(uT*.8,uT*.5))*.1; }
        void main(){ for(int i=0;i<12;i++){ if(distance(vW.xz,uLakes[i].xy)<uLakes[i].z) discard; }
          vec2 p=vW.xz; float e=.12;
          float dist=length(cameraPosition-vW); float near=1.-smoothstep(60.,420.,dist);
          float a=chop(p),bx=chop(p+vec2(e,0.)),bz=chop(p+vec2(0.,e));
          float s0=swellH(p,uT),sx=swellH(p+vec2(e,0.),uT),sz=swellH(p+vec2(0.,e),uT);
          vec3 N=normalize(vec3((a-bx)*(1.6+near*1.4)+(s0-sx)*6.,1.,(a-bz)*(1.6+near*1.4)+(s0-sz)*6.));
          vec3 V=normalize(cameraPosition-vW);
          float fr=.03+.97*pow(1.-max(dot(N,V),0.),5.);
          float crest=smoothstep(.12,.55,s0+.35);
          vec3 body=mix(uDeep,uShallow,clamp(a*.8+crest*.35,0.,1.)*.55);
          float sh=0.; for(int i=0;i<12;i++){ float d=distance(vW.xz,uIsl[i].xy); sh=max(sh,1.-smoothstep(uIsl[i].z*.8,uIsl[i].z+110.,d)); }
          body=mix(body*.8,mix(body,uShallow*1.3+vec3(.01,.05,.04),.6),sh);
          body=mix(body,uDeep*.45,smoothstep(300.,2200.,dist)*.55);
          vec3 R=reflect(-V,N); vec3 sky=mix(uSky,uZen,pow(max(R.y,0.),.6));
          vec3 col=mix(body,sky*.88,clamp(fr+smoothstep(200.,2500.,dist)*.18,0.,.88));
          vec3 H=normalize(uSun+V); float nh=max(dot(N,H),0.);
          float glitter=pow(nh,320.)*3.2+pow(nh,40.)*.25*(.5+.5*n(p*.5+uT));
          float spk=step(.7,n(p*3.+floor(uT*2.)*5.3));
          col+=vec3(1.,.93,.78)*(glitter*(.6+.8*spk));
          float streak=n(vec2(p.x*.9+p.y*.35+uT*.5,p.y*.25-p.x*.1))*.6+n(p*2.2+vec2(uT*.4,-uT*.3))*.4;
          float cap=smoothstep(.62,.95,s0+.3+(n(p*.031+uT*.02)-.5)*.5)*smoothstep(.58,.85,streak)*(.15+.6*near)+smoothstep(.95,1.,chop(p*1.3+3.))*.14*near;
          col=mix(col,vec3(.95,.98,.99),clamp(cap,0.,1.)*.55);
          gl_FragColor=vec4(col,.94);
          #include <tonemapping_fragment>
          #include <encodings_fragment>
          #include <fog_fragment>
        }` });
    const g = new THREE.PlaneGeometry(5200, 5200, 260, 260); g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.position.y = -.3;
    m.userData.update = t => { mat.uniforms.uT.value = t; };
    m.userData.mat = mat; return m;
  };
})();
