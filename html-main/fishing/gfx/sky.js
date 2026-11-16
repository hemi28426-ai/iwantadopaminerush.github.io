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
        float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}
        float fbm3(vec2 p){float s=0.,a=.5;for(int i=0;i<3;i++){s+=a*n(p);p=p*2.1+vec2(5.3,1.1);a*=.5;}return s;}
        float cum(vec2 uv){ float base=fbm(uv); float cov=fbm3(uv*.35+7.); return smoothstep(.48,.78,base+(cov-.5)*.35); }
        void main(){
          vec3 d=normalize(vDir); float y=max(d.y,0.);
          float lum=dot(uHor,vec3(.3,.59,.11));
          // sky gradient with gentle large-scale tint variation
          vec3 col=mix(uHor,uZen,pow(y,.5));
          col=mix(col,uZen*.8,smoothstep(.55,1.,y)*.35);
          col*=1.+(n(d.xz*2.5/(y+.4)+uT*.002)-.5)*.06;
          // horizon haze band
          float haze=exp(-y*7.);
          col=mix(col,uHor*1.08+vec3(.03),haze*.55);
          col=mix(col,uHor*.8,smoothstep(0.,-.15,d.y));
          float s=max(dot(d,uSun),0.);
          vec3 sunC=mix(vec3(1.,.82,.55),vec3(1.,.95,.85),smoothstep(0.,.5,uSun.y));
          // mie glow: tight near sun, broad and stronger toward the horizon
          float mie=pow(s,6.)*.28+pow(s,24.)*.3;
          col+=sunC*mie*(.6+haze*.9);
          col+=sunC*pow(s,160.)*.9;                                   // bloom core
          col+=vec3(1.,.9,.7)*pow(s,3.)*.08*haze;
          vec3 sunDisc=vec3(1.,.97,.88)*4.;
          float discM=smoothstep(.99935,.99965,s);
          if(d.y>0.){
            float ft=smoothstep(0.,.18,d.y);
            // high cirrus: stretched, thin, fast-ish drift
            vec2 cu=d.xz/(d.y+.25)*vec2(.9,2.4)+vec2(uT*.010,uT*.003);
            float ci=fbm(cu*1.3+11.)*fbm3(cu*.6+3.);
            ci=smoothstep(.12,.42,ci)*.5*smoothstep(.02,.3,d.y);
            vec3 cic=mix(uHor*1.1+.15,vec3(1.),.6)+sunC*pow(s,5.)*.45;
            col=mix(col,cic,ci);
            // cumulus layer: lit tops, shaded bottoms toward the sun
            vec2 uv=d.xz/(d.y+.14)*1.35+vec2(uT*.006,uT*.002);
            float c=cum(uv);
            vec2 sl=normalize(uSun.xz+1e-4)*.09;
            float cs=cum(uv+sl);                                       // density toward the sun
            float shade=clamp((c-cs)*3.2+.5,0.,1.);                    // 1 = lit side
            float thick=smoothstep(.0,.9,c);
            vec3 lit=mix(vec3(1.,.99,.96),uHor*1.2+.2,.18)+sunC*.18;
            vec3 dark=mix(uZen*.9+.12,uHor*.75,.45)*.85;
            vec3 cc=mix(dark,lit,shade*(1.-thick*.35)+.15);
            cc=mix(cc,lit,smoothstep(.6,.2,thick)*.4);                 // thin edges bright
            cc+=sunC*pow(s,8.)*.55*(1.-thick*.5);                       // silver lining
            cc=mix(cc,col,smoothstep(.12,.0,d.y)*.0+(1.-ft)*.6);        // fade into haze at horizon
            col=mix(col,cc,c*.92*ft);
          }
          col=mix(col,sunDisc,discM*step(0.,d.y+.02));
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
