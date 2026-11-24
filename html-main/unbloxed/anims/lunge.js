// Unbloxed sword lunge: coil -> explosive thrust -> held stab -> recovery
(function(){
  window.UBXA = window.UBXA || {};
  var H = Math.PI / 2;
  // [t, armR angle, armR z, armL angle, armL z, legR, legL, lean, twist(y), legSpread z]
  var K = [
    [0.00, H,    0,    0,     0,    0,    0,     0,     0,    0],
    [0.20, 0.35, 0.10, 0.55,  0.15, -0.25, 0.45, -0.28, -0.45, 0.10],
    [0.34, H+0.08, 0,  -1.05, 0.30, 1.0, -0.85,  0.42,  0.32, 0.12],
    [0.42, H+0.04, 0,  -1.15, 0.32, 1.05, -0.9,  0.46,  0.36, 0.14],
    [0.62, H+0.02, 0,  -1.05, 0.28, 0.95, -0.82, 0.40,  0.30, 0.12],
    [0.82, H,    0,    -0.35, 0.10, 0.40, -0.30, 0.15,  0.10, 0.04],
    [1.00, H,    0,    0,     0,    0,    0,     0,     0,    0]
  ];
  function sm(x){ return x * x * (3 - 2 * x); }
  function sample(f){
    var i = 1;
    while (i < K.length - 1 && f > K[i][0]) i++;
    var a = K[i - 1], b = K[i], u = (f - a[0]) / (b[0] - a[0]);
    u = u < 0 ? 0 : u > 1 ? 1 : u;
    // the thrust segment snaps fast (ease-out), others ease in/out
    u = (i === 2) ? 1 - (1 - u) * (1 - u) * (1 - u) : sm(u);
    var r = [];
    for (var k = 1; k < a.length; k++) r.push(a[k] + (b[k] - a[k]) * u);
    return r;
  }
  UBXA.lunge = function(c, f, o){
    f = f < 0 ? 0 : f > 1 ? 1 : f;
    var s = sample(f);
    c.aR.rotation.x = -s[0]; c.aR.rotation.z = s[1];
    c.aL.rotation.x = -s[2]; c.aL.rotation.z = s[3];
    c.lR.rotation.x = -s[4]; c.lL.rotation.x = -s[5];
    c.lR.rotation.z = -s[8]; c.lL.rotation.z = s[8];
    c.body.rotation.x = s[6];
    c.body.rotation.y = s[7];
    c.body.rotation.z = 0;
  };
})();
