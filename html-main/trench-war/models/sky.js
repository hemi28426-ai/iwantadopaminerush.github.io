// Trench War - procedural dark, smoky overcast sky dome (gritty war-shooter look) (three.js r128, WebGL1-safe).
// TWM.sky(THREE) -> THREE.Mesh. Copy the camera position onto it each frame and call
// mesh.userData.update(elapsedSeconds) every frame (drives the cloud drift via uTime).
(function () {
  window.TWM = window.TWM || {};
  var TWM = window.TWM;

  var VERT = [
    'varying vec3 vDir;',
    'void main() {',
    '  vDir = normalize(position);',
    '  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
    '  p.z = p.w * 0.99999;', // pin to the far plane: never clipped, whatever camera.far is
    '  gl_Position = p;',
    '}'
  ].join('\n');

  var FRAG = [
    'uniform float uTime;',
    'uniform vec3 uSunDir;',
    'uniform vec3 uHorizon;',
    'uniform vec3 uZenith;',
    'uniform vec3 uFogColor;',
    'varying vec3 vDir;',
    '',
    'const mat2 ROT = mat2(0.80, 0.60, -0.60, 0.80);',
    '',
    'float hash12(vec2 p) {',
    '  vec3 p3 = fract(vec3(p.xyx) * 0.1031);',
    '  p3 += dot(p3, p3.yzx + 33.33);',
    '  return fract((p3.x + p3.y) * p3.z);',
    '}',
    '',
    'float vnoise(vec2 p) {',
    '  vec2 i = floor(p);',
    '  vec2 f = fract(p);',
    '  vec2 u = f * f * (3.0 - 2.0 * f);',
    '  float a = hash12(i);',
    '  float b = hash12(i + vec2(1.0, 0.0));',
    '  float c = hash12(i + vec2(0.0, 1.0));',
    '  float d = hash12(i + vec2(1.0, 1.0));',
    '  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);',
    '}',
    '',
    // 5-octave fbm; "detail" fades the fine octaves to their mean near the horizon (anti-shimmer,
    // flatter distant clouds) without shifting the average density.
    'float fbm(vec2 p, float detail) {',
    '  float s = 0.0;',
    '  float a = 0.5;',
    '  for (int i = 0; i < 5; i++) {',
    '    float w = mix(1.0, detail, clamp(float(i) * 0.5, 0.0, 1.0));',
    '    s += a * mix(0.5, vnoise(p), w);',
    '    p = ROT * p * 2.03 + vec2(1.73, 9.21);',
    '    a *= 0.5;',
    '  }',
    '  return s;',
    '}',
    '',
    'void main() {',
    '  vec3 dir = normalize(vDir);',
    '  vec3 sun = normalize(uSunDir);',
    '  float h = dir.y;',
    '  float hUp = max(h, 0.0);',
    '',
    // overcast gradient: warm dusty horizon -> cool grey-blue zenith
    '  vec3 sky = mix(uHorizon, uZenith, pow(hUp, 0.5));',
    // low smoky orange band on the horizon, strongest under the sun
    '  vec2 az = normalize(dir.xz + vec2(0.0001, 0.0));',
    '  float sAz = max(dot(az, normalize(sun.xz + vec2(0.0001, 0.0))), 0.0);',
    '  float band = pow(1.0 - hUp, 9.0) * (0.25 + 0.75 * pow(sAz, 3.0));',
    '  sky += vec3(0.30, 0.15, 0.06) * band;',
    '',
    // sun: broad warm glow, tighter halo, small bright disc
    '  float sd = max(dot(dir, sun), 0.0);',
    '  vec3 glowCol = vec3(1.0, 0.66, 0.38);',
    '  float glow = 0.10 * pow(sd, 2.5) + 0.12 * pow(sd, 20.0) + 0.16 * pow(sd, 250.0) + 0.10 * pow(sd, 3000.0);',
    '  vec3 col = sky + glowCol * glow;',
    '  float disc = smoothstep(0.99965, 0.99988, sd);',
    '  col = mix(col, vec3(1.0, 0.86, 0.66), disc);',
    '',
    '  if (h > 0.02) {',
    '    float t = uTime;',
    // project the view ray onto a flat cloud plane
    '    vec2 uv = dir.xz / max(h, 0.04);',
    '    vec2 p = uv * 1.3 + vec2(t * 0.0075, t * 0.0030);',
    // slow domain warp so the shapes evolve while they drift
    '    vec2 wq = vec2(vnoise(p * 0.55 + vec2(0.0, t * 0.004)),',
    '                   vnoise(p * 0.55 + vec2(5.2 - t * 0.0032, 1.3)));',
    '    p += (wq - 0.5) * 0.9;',
    '',
    '    float detail = smoothstep(0.05, 0.32, h);',
    '    float n = fbm(p, detail);',
    '    vec2 sun2 = normalize(sun.xz + vec2(0.0001, 0.0));',
    '    float n2 = fbm(p + sun2 * 0.16, detail);',
    '',
    '    float nz = (n - 0.484) * 9.0;',
    '    float horizonT = 1.0 - smoothstep(0.0, 0.45, h);',
    '    float zc = mix(-0.85, -1.5, horizonT);', // more / thicker cover toward the horizon
    '    float alpha = smoothstep(zc, zc + 0.95, nz);',
    '    float thick = smoothstep(zc + 0.4, zc + 2.4, nz);',
    '',
    // lighting: dark grey-brown bases, sunlit rims where the sun-ward side is thinner
    '    float sunPhase = pow(sd, 5.0);',
    '    float lit = clamp((n - n2) * 6.0, 0.0, 1.0);',
    '    float shade = clamp((n2 - n) * 4.0, 0.0, 1.0);',
    '    vec3 cBase = vec3(0.115, 0.115, 0.122);',
    '    vec3 cMid = vec3(0.285, 0.283, 0.288);',
    '    vec3 cRim = vec3(1.0, 0.68, 0.40);',
    '    vec3 cc = mix(cMid, cBase, thick);',
    '    cc *= 1.0 - 0.16 * shade;',
    '    float rim = lit * (1.0 - 0.5 * thick) * (0.22 + 0.78 * sunPhase);',
    '    cc += cRim * rim * 0.34;',
    '    cc += cRim * (1.0 - thick) * sunPhase * 0.12;',
    '    cc *= mix(0.90, 1.04, 0.5 + 0.5 * dot(dir, sun));',
    '',
    // distant clouds melt into the horizon haze
    '    float haze = 1.0 - smoothstep(0.02, 0.38, h);',
    '    cc = mix(cc, sky + glowCol * glow * 0.5, haze * 0.7);',
    '    alpha *= smoothstep(0.025, 0.17, h);',
    '    col = mix(col, cc, alpha);',
    // sun shining through thin cloud edges
    '    col += glowCol * pow(sd, 18.0) * 0.12 * alpha * (1.0 - thick);',
    '  }',
    '',
    // below the horizon: fade quickly to the ground fog colour
    '  col = mix(col, uFogColor, smoothstep(0.0, 0.05, -h));',
    // dither against gradient banding
    '  col += (hash12(gl_FragCoord.xy) - 0.5) * (1.0 / 255.0);',
    '  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);',
    '}'
  ].join('\n');

  TWM.sky = function (THREE) {
    var uniforms = {
      uTime: { value: 0 },
      uSunDir: { value: new THREE.Vector3(0.45, 0.32, 0.35).normalize() },
      uHorizon: { value: new THREE.Color(0.33, 0.33, 0.335) },
      uZenith: { value: new THREE.Color(0.12, 0.135, 0.16) },
      uFogColor: { value: new THREE.Color(0x4c4f53) }
    };

    var mat = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      fog: false,
      toneMapped: false
    });

    var mesh = new THREE.Mesh(new THREE.SphereGeometry(460, 48, 24), mat);
    mesh.name = 'TWM.sky';
    mesh.renderOrder = -1;
    mesh.frustumCulled = false;
    mesh.userData.uniforms = uniforms;
    mesh.userData.sunDir = uniforms.uSunDir.value; // normalized; handy for aligning the sun light
    mesh.userData.update = function (seconds) {
      if (typeof seconds === 'number' && isFinite(seconds)) uniforms.uTime.value = seconds;
    };
    return mesh;
  };
})();
