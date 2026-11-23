// Fishing Unblocked v2 - per-species look overrides + custom geometry for the 'crystal' group.
// L[id] = look patch (merged into the fish's look). B[id] = function(api){...} adds custom geometry (see fishx/README.md).
(function () {
  var X = window.FFISHX = window.FFISHX || { B: {}, L: {} };
  var L = {}, B = {};

  // ---- add entries below ----
  // crystal helpers: spire(a, u, th, h, w, lean, cols, glow) = a faceted cone rooted on the body surface
  function spire(a, u, th, h, w, lean, c, gl, ds) {
    var p = a.surf(u, th), n = a.nrm(u, th), d = a.norm(a.add(n, [lean || 0, 0, ds || 0]));
    var col = function (x, y) { return y > .7 ? a.mix(c, 0xffffff, .55) : y > .3 ? c : a.shade(c, .6); };
    (gl ? a.glowA : a.solid).geo(a.P.cone6, a.Mdir(a.add(p, [-n[0] * .03, -n[1] * .03, -n[2] * .03]), d, [w, h, w]), col);
  }
  function row(a, us, th, h, w, c, gl, lean, ds) { us.forEach(function (u, i) { spire(a, u, th, h * (1 - .22 * Math.abs(i - (us.length - 1) / 2) / us.length * 2), w, lean, c, gl, ds); }); }
  var TOP = 0, PIH = Math.PI;

  L['crystal-prismling'] = { pat: 'rainbow', c: 0xd8e8ff, f: 0xf8c8f8 };
  B['crystal-prismling'] = function (a) {
    var p = a.top(.4);
    a.solid.geo(a.P.oct, a.M(a.add(p, [0, .03, 0]), null, [.07, .09, .035]), function (x, y) { return y > 0 ? 0xffd8f8 : 0xa8d8ff; });
    a.glowA.geo(a.P.oct, a.M(a.add(a.top(.52), [0, .02, 0]), null, [.04, .06, .025]), 0xc8f0ff);
  };

  L['crystal-geodeperch'] = { c: 0x6c5c84, pat: 'scales', pc: 0x9a88c8, W: 1.1 };
  B['crystal-geodeperch'] = function (a) {
    [.35, .5, .66].forEach(function (u, i) {
      [-1, 1].forEach(function (s) { spire(a, u, s > 0 ? .9 : Math.PI * 2 - .9, .13 - i * .02, .035, 0, 0xb890f0, false, s * .5); });
      spire(a, u, 0, .17 - i * .03, .045, -.2, 0xc8a0ff, false);
    });
  };

  L['crystal-quartzfin'] = { H: 1.15, L: 0.95 };
  B['crystal-quartzfin'] = function (a) {
    spire(a, .42, 0, .42, .055, -.45, 0xf4f8ff, false);
    spire(a, .55, 0, .26, .04, -.5, 0xe0ecff, false);
    spire(a, .3, 0, .2, .035, -.2, 0xe8f0ff, false);
    [-1, 1].forEach(function (s) { spire(a, .34, s > 0 ? 1.45 : Math.PI * 2 - 1.45, .16, .03, -.3, 0xdce8ff, false, s * .8); });
  };

  L['crystal-caveglint'] = { pat: 'spots', pc: 0xe8f0ff, glow: 0x7a98ff, L: .9 };
  B['crystal-caveglint'] = function (a) {
    for (var i = 0; i < 6; i++) { var u = .3 + i * .1; a.glowA.geo(a.P.sphS, a.M(a.side(u, 1, 1.25), null, [.022, .022, .022]), 0xd8e4ff); a.glowA.geo(a.P.sphS, a.M(a.side(u, -1, 1.25), null, [.022, .022, .022]), 0xd8e4ff); }
    spire(a, .2, 0, .1, .03, .9, 0x98b0ff, true);
    spire(a, .62, 0, .09, .03, -.2, 0x98b0ff, true);
  };

  L['crystal-amethystback'] = { H: 1.1, pat: 'bands' };
  B['crystal-amethystback'] = function (a) {
    row(a, [.28, .36, .44, .52, .6, .68], 0, .3, .06, 0xa84ae0, false, -.5);
    row(a, [.32, .48, .64], 0, .15, .04, 0xe0b0ff, false, -.5, 0);
  };

  L['crystal-emeraldray'] = { c: 0x1f9e68, pc: 0xa0ffd0, H: 1.9, W: 1.25 };
  B['crystal-emeraldray'] = function (a) {
    spire(a, .45, 0, .32, .08, 0, 0x40e098, false);
    spire(a, .35, 0, .18, .05, .3, 0x70f0b8, false, .3);
    spire(a, .55, 0, .2, .05, -.3, 0x70f0b8, false, -.3);
    spire(a, .92, 0, .2, .035, -1.2, 0x30c880, false);
  };

  L['crystal-shardshark'] = { c: 0x4c6488, H: 1.05 };
  B['crystal-shardshark'] = function (a) {
    spire(a, .36, 0, .42, .07, -.9, 0xbcd4f4, false);
    spire(a, .62, 0, .2, .045, -.9, 0xa0bce0, false);
    [-1, 1].forEach(function (s) { var th = s > 0 ? 1.55 : Math.PI * 2 - 1.55; spire(a, .3, th, .3, .04, -.9, 0xc8dcf8, false, s * 1); spire(a, .78, th, .14, .03, -.9, 0xa8c4e8, false, s * .5); });
    row(a, [.7, .78, .86], PIH, .14, .03, 0x8aa6d0, false, -.7);
  };

  L['crystal-echoeel'] = { pat: 'bands', pc: 0xe0f0ff };
  B['crystal-echoeel'] = function (a) {
    for (var i = 0; i < 9; i++) { var u = .2 + i * .08; spire(a, u, 0, .1, .03, -.4, 0x90b8ff, true); }
    for (var j = 0; j < 4; j++) a.glowA.geo(a.P.oct, a.M(a.side(.25 + j * .18, 1, 1.2), null, [.03, .03, .02]), 0xe8f4ff);
  };

  L['crystal-cavernsquid'] = { c: 0x9060d8 };
  B['crystal-cavernsquid'] = function (a) {
    row(a, [.3, .4, .5, .6], 0, .26, .06, 0xc8a0ff, true, -.4);
    [-1, 1].forEach(function (s) { var th = s > 0 ? 1.0 : Math.PI * 2 - 1.0; spire(a, .45, th, .18, .045, 0, 0xe8d0ff, true, s * .6); });
  };

  L['crystal-rosequartz-carp'] = { c: 0xf09ab8, W: 1.25, H: 1.1 };
  B['crystal-rosequartz-carp'] = function (a) {
    [[.4, .3], [.52, .36], [.64, .26]].forEach(function (q) {
      spire(a, q[0], 0, q[1], .07, -.3, 0xffb8d4, false);
      spire(a, q[0] + .04, .35, q[1] * .55, .045, 0, 0xffd8e8, false, .3);
      spire(a, q[0] + .04, Math.PI * 2 - .35, q[1] * .55, .045, 0, 0xffd8e8, false, -.3);
    });
  };

  L['crystal-spirecrown'] = { c: 0x1e58b8 };
  B['crystal-spirecrown'] = function (a) {
    var ue = .1;
    [[ue + .02, .46, -.6], [ue + .07, .38, -.3], [ue + .12, .5, -.9], [ue + .17, .34, -.5]].forEach(function (q, i) { spire(a, q[0], 0, q[1], .055, q[2], i & 1 ? 0x80c8ff : 0x4a9aff, true, (i - 1.5) * .25); });
    row(a, [.3, .4, .5, .6, .7, .8], 0, .22, .04, 0x3a80e8, false, -.7);
  };

  L['crystal-heartstone-whale'] = { c: 0x6a2096 };
  B['crystal-heartstone-whale'] = function (a) {
    spire(a, .45, 0, .7, .15, -.2, 0xd070ff, true);
    spire(a, .38, .3, .45, .1, .3, 0xb060f0, true, .5);
    spire(a, .38, Math.PI * 2 - .3, .45, .1, .3, 0xb060f0, true, -.5);
    spire(a, .55, .35, .42, .1, -.5, 0xe0a0ff, true, .5);
    spire(a, .55, Math.PI * 2 - .35, .42, .1, -.5, 0xe0a0ff, true, -.5);
    [-1, 1].forEach(function (s) { spire(a, .5, s > 0 ? 1.3 : Math.PI * 2 - 1.3, .25, .07, 0, 0xc080f0, false, s * .8); });
  };

  L['crystal-aurora-prism'] = { };
  B['crystal-aurora-prism'] = function (a) {
    var cols = [0xff98e8, 0xa8e8ff, 0xfff0a8, 0xa8ffd0, 0xd0b0ff];
    [-1, 1].forEach(function (s) { for (var i = 0; i < 5; i++) { var th = s > 0 ? 1.15 : Math.PI * 2 - 1.15; spire(a, .3 + i * .05, th, .55 - i * .07, .05, -.6 - i * .15, cols[i], false, s * (1.2 + i * .3)); } });
    for (var j = 0; j < 4; j++) spire(a, .32 + j * .1, 0, .3 - j * .04, .05, -.5, cols[(j + 2) % 5], true);
  };

  L['crystal-voidgeode'] = { };
  B['crystal-voidgeode'] = function (a) {
    spire(a, .5, 0, .6, .14, 0, 0xa060ff, true);
    [0, 1, 2, 3, 4].forEach(function (i) { spire(a, .5 + .09 * Math.cos(i * 1.26), i * 1.26 + .3, .3, .07, 0, i & 1 ? 0xc898ff : 0x7a3ad8, true); });
    a.glowA.geo(a.P.sph, a.M(a.add(a.top(.5), [0, .02, 0]), null, [.09, .06, .09]), 0xf0e0ff);
  };


  Object.keys(B).forEach(function (id) { X.B[id] = B[id]; });
  (window.FWFISH || []).forEach(function (f) {
    var p = L[f.id]; if (p) for (var k in p) f.look[k] = p[k];
    if (B[f.id]) f.look.cx = f.id;
  });
})();
