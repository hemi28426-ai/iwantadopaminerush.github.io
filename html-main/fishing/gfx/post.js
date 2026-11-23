// Post-processing for Fishing Unblocked (three.js r128, no EffectComposer).
// Usage: const post = FG.makePost(renderer, scene, camera);
//   loop:   post ? post.render() : renderer.render(scene, camera);
//   resize: renderer.setSize(w,h); if (post) post.setSize(w,h);
(function () {
  window.FG = window.FG || {};

  var VERT = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}';

  var BRIGHT_FRAG = [
    'precision highp float;varying vec2 vUv;uniform sampler2D tDiffuse;uniform float threshold;',
    'void main(){vec3 c=texture2D(tDiffuse,vUv).rgb;',
    'c=min(c,vec3(8.0));',
    'float l=max(c.r,max(c.g,c.b));',
    'float k=smoothstep(threshold,threshold+0.8,l);',
    'gl_FragColor=vec4(c*k,1.0);}'
  ].join('\n');

  var BLUR_FRAG = [
    'precision highp float;varying vec2 vUv;uniform sampler2D tDiffuse;uniform vec2 dir;',
    'void main(){',
    'vec3 s=texture2D(tDiffuse,vUv).rgb*0.2270270270;',
    's+=texture2D(tDiffuse,vUv+dir*1.3846153846).rgb*0.3162162162;',
    's+=texture2D(tDiffuse,vUv-dir*1.3846153846).rgb*0.3162162162;',
    's+=texture2D(tDiffuse,vUv+dir*3.2307692308).rgb*0.0702702703;',
    's+=texture2D(tDiffuse,vUv-dir*3.2307692308).rgb*0.0702702703;',
    'gl_FragColor=vec4(s,1.0);}'
  ].join('\n');

  // ACES identical to three.js r128 ACESFilmicToneMapping (RRT+ODT fit, exposure/0.6)
  var FINAL_FRAG = [
    'precision highp float;varying vec2 vUv;',
    'uniform sampler2D tScene;uniform sampler2D tBloom;',
    'uniform float exposure;uniform float bloomStrength;uniform float time;uniform vec2 res;',
    'vec3 RRTAndODTFit(vec3 v){vec3 a=v*(v+0.0245786)-0.000090537;vec3 b=v*(0.983729*v+0.4329510)+0.238081;return a/b;}',
    'vec3 ACES(vec3 color){',
    ' const mat3 ACESInputMat=mat3(vec3(0.59719,0.07600,0.02840),vec3(0.35458,0.90834,0.13383),vec3(0.04823,0.01566,0.83777));',
    ' const mat3 ACESOutputMat=mat3(vec3(1.60475,-0.10208,-0.00327),vec3(-0.53108,1.10813,-0.07276),vec3(-0.07367,-0.00605,1.07602));',
    ' color*=exposure/0.6;',
    ' color=ACESInputMat*color;color=RRTAndODTFit(color);color=ACESOutputMat*color;',
    ' return clamp(color,0.0,1.0);}',
    'vec3 toSRGB(vec3 c){c=clamp(c,0.0,1.0);',
    ' return mix(c*12.92,1.055*pow(c,vec3(0.41666))-0.055,step(vec3(0.0031308),c));}',
    'float hash(vec2 p){p=fract(p*vec2(443.897,441.423));p+=dot(p,p+19.19);return fract(p.x*p.y);}',
    'void main(){',
    ' vec3 c=texture2D(tScene,vUv).rgb;',
    ' c=min(c,vec3(32.0));',
    ' c+=texture2D(tBloom,vUv).rgb*bloomStrength;',
    ' c=ACES(c);',
    ' c=toSRGB(c);',
    // grading in display space
    ' float l=dot(c,vec3(0.2126,0.7152,0.0722));',
    ' c=(c-0.5)*1.06+0.5;',
    ' c=mix(vec3(l),c,1.08);',
    ' c+=vec3(0.018,0.008,-0.012)*smoothstep(0.5,1.0,l);',   // warm highlights
    ' c+=vec3(-0.010,0.000,0.014)*(1.0-smoothstep(0.0,0.45,l));', // cool shadows
    // vignette
    ' vec2 q=vUv-0.5;q.x*=res.x/res.y;',
    ' float v=smoothstep(0.35,1.05,length(q)*1.15);',
    ' c*=1.0-0.28*v;',
    // film grain
    ' float g=hash(vUv*res+fract(time)*61.0)-0.5;',
    ' c+=g*0.02;',
    ' gl_FragColor=vec4(clamp(c,0.0,1.0),1.0);}'
  ].join('\n');

  FG.makePost = function (renderer, scene, camera) {
    try {
      if (!renderer || !window.THREE) return null;
      var T = THREE;
      var gl2 = !!(renderer.capabilities && renderer.capabilities.isWebGL2);
      var ext = renderer.extensions;
      var halfOK = gl2 ? (ext.has('EXT_color_buffer_float') || ext.has('EXT_color_buffer_half_float'))
                       : (ext.has('OES_texture_half_float') && ext.has('EXT_color_buffer_half_float'));
      // try to enable color-buffer extension for half float rendering
      if (!halfOK) { try { ext.get('EXT_color_buffer_float'); ext.get('EXT_color_buffer_half_float'); } catch (e) {} }
      var type = halfOK ? T.HalfFloatType : T.UnsignedByteType;

      var opts = { minFilter: T.LinearFilter, magFilter: T.LinearFilter, format: T.RGBAFormat, type: type, depthBuffer: true, stencilBuffer: true }; // stencil=true makes r128 allocate a 24-bit depth buffer (16-bit z-fights far away)
      var mkMain = function (w, h) {
        var rt;
        if (gl2 && T.WebGLMultisampleRenderTarget) { rt = new T.WebGLMultisampleRenderTarget(w, h, opts); rt.samples = 4; }
        else rt = new T.WebGLRenderTarget(w, h, opts);
        return rt;
      };
      var lowOpts = { minFilter: T.LinearFilter, magFilter: T.LinearFilter, format: T.RGBAFormat, type: type, depthBuffer: false, stencilBuffer: false };
      var mkLow = function (w, h) { return new T.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), lowOpts); };

      var tri = new T.BufferGeometry();
      tri.setAttribute('position', new T.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
      tri.setAttribute('uv', new T.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2));
      var quadScene = new T.Scene();
      var quadCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      var mesh = new T.Mesh(tri, null);
      mesh.frustumCulled = false;
      quadScene.add(mesh);

      var mat = function (frag, uniforms) {
        return new T.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms: uniforms, depthTest: false, depthWrite: false, toneMapped: false });
      };
      var matBright = mat(BRIGHT_FRAG, { tDiffuse: { value: null }, threshold: { value: 1.0 } });
      var matBlur = mat(BLUR_FRAG, { tDiffuse: { value: null }, dir: { value: new T.Vector2() } });
      var matFinal = mat(FINAL_FRAG, {
        tScene: { value: null }, tBloom: { value: null }, exposure: { value: 1.3 },
        bloomStrength: { value: 0.35 }, time: { value: 0 }, res: { value: new T.Vector2(1, 1) }
      });

      var main = null, a = null, b = null, c = null, d = null, e = null;
      var api = { enabled: true };
      var pass = function (m, target) {
        mesh.material = m;
        renderer.setRenderTarget(target);
        renderer.render(quadScene, quadCam);
      };
      var blur = function (src, tmp, dst, w, h) { // src -> tmp (H) -> dst (V)
        matBlur.uniforms.tDiffuse.value = src.texture; matBlur.uniforms.dir.value.set(1 / w, 0); pass(matBlur, tmp);
        matBlur.uniforms.tDiffuse.value = tmp.texture; matBlur.uniforms.dir.value.set(0, 1 / h); pass(matBlur, dst);
      };
      var W = 1, H = 1, bw = 1, bh = 1;

      api.setSize = function (w, h) {
        var pr = renderer.getPixelRatio();
        W = Math.max(1, Math.floor(w * pr)); H = Math.max(1, Math.floor(h * pr));
        bw = Math.max(1, W >> 1); bh = Math.max(1, H >> 1);
        if (main) { main.dispose(); a.dispose(); b.dispose(); c.dispose(); d.dispose(); e.dispose(); }
        main = mkMain(W, H);
        a = mkLow(bw, bh);                       // bright, half res
        b = mkLow(bw, bh);                       // blur tmp, half
        c = mkLow(bw >> 1, bh >> 1);             // quarter
        d = mkLow(bw >> 1, bh >> 1);
        e = mkLow(bw >> 2, bh >> 2);             // eighth (final bloom)
        matFinal.uniforms.res.value.set(W, H);
      };

      api.render = function () {
        if (!api.enabled || !main) { renderer.setRenderTarget(null); renderer.render(scene, camera); return; }
        var prevTM = renderer.toneMapping, prevXR = renderer.xr && renderer.xr.enabled;
        // render scene linear, no tonemap/encoding (RT path does this anyway; be explicit)
        renderer.toneMapping = T.NoToneMapping;
        renderer.setRenderTarget(main);
        renderer.clear();
        renderer.render(scene, camera);
        // bright pass (half res)
        matBright.uniforms.tDiffuse.value = main.texture;
        pass(matBright, a);
        // blur chain with decreasing res
        blur(a, b, a, bw, bh);
        // downsample a -> c, blur
        matBlur.uniforms.tDiffuse.value = a.texture; matBlur.uniforms.dir.value.set(0, 0);
        pass(matBlur, c);
        blur(c, d, c, bw >> 1, bh >> 1);
        matBlur.uniforms.tDiffuse.value = c.texture; matBlur.uniforms.dir.value.set(0, 0);
        pass(matBlur, e);
        blur(e, d, e, bw >> 2, bh >> 2);
        // final
        matFinal.uniforms.tScene.value = main.texture;
        matFinal.uniforms.tBloom.value = e.texture;
        matFinal.uniforms.exposure.value = (prevTM === T.ACESFilmicToneMapping) ? renderer.toneMappingExposure : 1.0;
        matFinal.uniforms.time.value = (performance.now() % 100000) / 1000;
        pass(matFinal, null);
        renderer.toneMapping = prevTM;
      };

      var s = renderer.getSize(new T.Vector2());
      api.setSize(s.x, s.y);
      return api;
    } catch (err) {
      if (window.console) console.warn('FG.makePost unsupported', err);
      return null;
    }
  };
})();
