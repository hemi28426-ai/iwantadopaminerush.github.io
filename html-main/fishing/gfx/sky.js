// Sky dome: horizon->zenith gradient, sun disc + glow, slowly drifting fbm clouds. Follows the camera.
(function () {
  'use strict';
  const FG = window.FG = window.FG || {};
  FG.HORIZON = 0xcfe6f2; FG.ZENITH = 0x3f86cc;
  FG.makeSky = function (sunDir) {
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { uSun: { value: sunDir.clone().normalize() }, uT: { value: 0 },
        uHor: { value: new THREE.Color(FG.HORIZON).convertSRGBToLinear() }, uZen: { value: new THREE.Color(FG.ZENITH).convertSRGBToLinear() } },
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position = p.xyww; }`,
      fragmentShader: `
        uniform vec3 uSun,uHor,uZen; uniform float uT; varying vec3 vDir;
        float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
        float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*n(p);p*=2.03;a*=.5;}return s;}
        void main(){
          vec3 d=normalize(vDir); float y=max(d.y,0.);
          vec3 col=mix(uHor,uZen,pow(y,.55));
          col=mix(col,uHor*.85,smoothstep(0.,-.15,d.y));            // below horizon: hazy
          float s=max(dot(d,uSun),0.);
          col+=vec3(1.,.85,.6)*pow(s,8.)*.35+vec3(1.,.9,.7)*pow(s,64.)*.6;   // glow
          col=mix(col,vec3(1.,.97,.88)*3.,smoothstep(.9994,.9997,s));       // disc
          if(d.y>0.){ vec2 uv=d.xz/(d.y+.12)*1.4+vec2(uT*.006,uT*.002);
            float c=fbm(uv)*1.1-.0; c=smoothstep(.55,.85,c)*smoothstep(0.,.25,d.y);
            vec3 cc=mix(vec3(.82,.86,.92),vec3(1.,.98,.95),fbm(uv*1.7+3.));
            cc+=vec3(1.,.85,.6)*pow(s,6.)*.4; col=mix(col,cc,c*.85); }
          gl_FragColor=vec4(col,1.);
          #include <tonemapping_fragment>
          #include <encodings_fragment>
        }`
    });
    const m = new THREE.Mesh(new THREE.SphereGeometry(500, 48, 24), mat); m.frustumCulled = false; m.renderOrder = -10;
    m.userData.update = (cam, t) => { m.position.copy(cam.position); mat.uniforms.uT.value = t; };
    return m;
  };
})();
