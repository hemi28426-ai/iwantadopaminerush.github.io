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
          w.y+=sin(w.x*.35+uT*1.3)*.035+sin(w.z*.42-uT*1.1)*.03;
          vW=w.xyz; vXZ=w.xz; vec4 mvPosition=viewMatrix*w; gl_Position=projectionMatrix*mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `
        uniform float uT,uR; uniform vec3 uSun,uShallow,uDeep,uSky,uZen; varying vec3 vW; varying vec2 vXZ;
        #include <fog_pars_fragment>
        float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
        float waves(vec2 p){ return n(p*.9+vec2(uT*.35,uT*.2))*.5+n(p*2.1-vec2(uT*.3,-uT*.45))*.3+n(p*5.3+vec2(uT*.8,uT*.6))*.2; }
        void main(){
          float e=.08; vec2 p=vXZ;
          float a=waves(p),bx=waves(p+vec2(e,0.)),bz=waves(p+vec2(0.,e));
          vec3 N=normalize(vec3((a-bx)*2.2,1.,(a-bz)*2.2));
          vec3 V=normalize(cameraPosition-vW);
          float fr=.04+.96*pow(1.-max(dot(N,V),0.),5.);
          float r=length(vXZ)/uR;
          vec3 body=mix(uDeep,uShallow,smoothstep(.75,.18,1.-r)*.0+smoothstep(.3,1.,r));
          vec3 R=reflect(-V,N); vec3 sky=mix(uSky,uZen,pow(max(R.y,0.),.6));
          vec3 col=mix(body,sky*.85,clamp(fr*.9,0.,.8));
          float sp=pow(max(dot(reflect(-uSun,N),V),0.),180.); col+=vec3(1.,.92,.75)*sp*2.5;
          float foam=smoothstep(.955,1.,r)*(.55+.45*n(p*3.+uT));
          col=mix(col,vec3(.95,.97,.97),foam*.6);
          gl_FragColor=vec4(col,mix(.86,.97,fr)*(1.-smoothstep(.995,1.,r)*.0));
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
})();
