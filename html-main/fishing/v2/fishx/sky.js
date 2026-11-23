// Fishing Unblocked v2 - per-species look overrides + custom geometry for the 'sky' group.
// L[id] = look patch (merged into the fish's look). B[id] = function(api){...} adds custom geometry (see fishx/README.md).
(function () {
  var X = window.FFISHX = window.FFISHX || { B: {}, L: {} };
  var L = {}, B = {};

  // ---- add entries below ----
  L['sky-gustray'] = { H: 1.8, L: 1.2 }; L['sky-seraph-ray'] = { H: 1.8, L: 1.2 }; L['sky-stormkite'] = { L: 1.35, H: 1.5 };
  L['sky-cumulus-eel'] = { c: 0x9cd0f2, b: 0xffffff, f: 0xe8f4ff, pc: 0xffffff, pat: 'bands', o: 1, y: [] }; L['sky-skywhale'] = { c: 0x7fb4e4, b: 0xf4f9ff, f: 0xa8cdf0, pc: 0xd8ecfb, pat: 'gradient', o: 1, y: [] }; L['sky-cloudpuff'] = { c: 0xa8d8f8, b: 0xffffff, f: 0xeaf5ff, pc: 0xffffff, pat: 'gradient', o: 1, y: [] };

  // ---- helpers ----
  var SM = false;
  function blob(a, p, r, col, sy) { a.solid.geo((SM ? a.P.sphS : (a.P.sphT||a.P.sph)), a.M(p, null, [r, r * (sy || 1), r]), col); }
  function bumps(a, u0, u1, n, r, col, th, sink) { // lumps sitting on the skin along u
    for (var i = 0; i < n; i++) { var t = n === 1 ? .5 : i / (n - 1), u = u0 + (u1 - u0) * t, T = th === undefined ? 0 : th;
      var q = a.surf(u, T + (i % 2 ? .25 : -.25) * (th === undefined ? 0 : 0)); var rr = r * (.75 + .5 * Math.sin(i * 2.3 + 1) * Math.sin(i * 1.7 + 2) + .25);
      blob(a, [q[0], q[1] + rr * (sink || .5), q[2]], Math.abs(rr), typeof col === 'function' ? col(i) : col, .85); }
  }
  function bumpsSide(a, u0, u1, n, r, col) {
    for (var i = 0; i < n; i++) { var t = n === 1 ? .5 : i / (n - 1), u = u0 + (u1 - u0) * t, s = i % 2 ? 1 : -1, q = a.side(u, s, 1.15 + .2 * (i % 3) * .5, r * .3);
      blob(a, q, r * (.8 + .3 * ((i * 7) % 3) / 2), col, .85); }
  }
  function blades(a, u0, u1, n, h, w, c0, c1, lean) { // spiky/leaf fins standing on the back
    for (var i = 0; i < n; i++) { var t = n === 1 ? .5 : i / (n - 1), u = u0 + (u1 - u0) * t, b = a.top(u), hh = typeof h === 'function' ? h(t) : h, ll = lean === undefined ? -.5 : lean;
      var tip = [b[0] + ll * hh, b[1] + hh, b[2]]; a.fins.tri([b[0] + w, b[1] - .02, b[2]], [b[0] - w, b[1] - .02, b[2]], tip, c0, c0, c1);
      a.fins.tri([b[0], b[1] - .02, b[2] + w * .7], [b[0], b[1] - .02, b[2] - w * .7], tip, c0, c0, c1); }
  }
  function dfin(a, u0, u1, hf, c0, c1, lean, n) { // continuous dorsal fin
    n = n || 8; var B = [], Tp = [];
    for (var i = 0; i <= n; i++) { var t = i / n, u = u0 + (u1 - u0) * t, b = a.top(u), h = hf(t); B.push([b[0], b[1] - .02, b[2]]); Tp.push([b[0] + (lean === undefined ? -.3 : lean) * h, b[1] + h, b[2]]); }
    for (var j = 0; j < n; j++) a.fins.quad(B[j], B[j + 1], Tp[j + 1], Tp[j], c0, c0, c1, c1);
  }
  function ribbon(a, p0, len, wid, c0, c1, ph, amp, dir, segs) { // wavy trailing ribbon
    segs = segs || 6; dir = dir || [-1, 0, 0]; var prev = null;
    for (var i = 0; i <= segs; i++) { var t = i / segs, w = wid * (1 - .75 * t), y = Math.sin(t * 4 + ph) * amp * t, z = Math.cos(t * 3 + ph) * amp * .5 * t;
      var c = [p0[0] + dir[0] * len * t, p0[1] + dir[1] * len * t + y, p0[2] + dir[2] * len * t + z];
      var A = [c[0], c[1] + w, c[2]], Bp = [c[0], c[1] - w, c[2]];
      if (prev) a.fins.quad(prev[0], prev[1], Bp, A, i < 2 ? c0 : c0, c0, c1, c1); prev = [A, Bp]; }
  }
  function pec(a, u, s, len, wid, c0, c1, th) { var r = a.side(u, s, th || 1.9), t = [r[0] - len, r[1] - len * .4, r[2] + s * wid];
    a.fins.tri(r, [r[0] - len * .5, r[1] - .04, r[2]], t, c0, c0, c1); a.fins.tri(r, [r[0] + len * .1, r[1], r[2]], t, c0, c0, c1); }
  function bolt(a, u0, u1, th, amp, col, wd) { // zig-zag glow strip over the back/flank
    var n = 8, prev = null;
    for (var i = 0; i <= n; i++) { var u = u0 + (u1 - u0) * i / n, T = th + (i & 1 ? amp : -amp), p = a.surf(u, T, .012), q = a.surf(u, T + wd, .012);
      if (prev) a.glowA.quad(prev[0], prev[1], q, p, col, col, col, col); prev = [p, q]; }
  }
  function horn(a, u, s, len, col, th) { var b = a.side(u, s, th || .6, .0), t = [b[0] + len * .25, b[1] + len, b[2] + s * len * .5], w = len * .12;
    a.solid.geo((a.P.sphS||a.P.sph), a.M(b, null, [w * 1.5, w * 1.5, w * 1.5]), col); a.fins.tri([b[0] - w, b[1], b[2]], [b[0] + w, b[1], b[2]], t, col, col, col); a.fins.tri([b[0], b[1], b[2] - w], [b[0], b[1], b[2] + w], t, col, col, col); }
  function starBeads(a, u0, u1, n, r, col) { for (var i = 0; i < n; i++) { var u = u0 + (u1 - u0) * (i + .5) / n, th = (i * 2.1) % 1.4 - .2 + (i & 1 ? 0 : 0), p = a.surf(u, th, .02);
    a.glowA.geo((a.P.sphT||a.P.sph), a.M(p, null, [r, r, r]), col); } }

  var CL = 0xffffff;
  B['sky-breezeling'] = function (a) { var p = a.surf(.04, 0); ribbon(a, [p[0], p[1] + .02, p[2]], .5, .09, 0xffffff, 0xb8d8f0, 0, .1); ribbon(a, [p[0], p[1] - .03, p[2]], .4, .08, 0xe8f4ff, 0xb8d8f0, 2, .1); pec(a, .6, 1, .2, .12, 0xffffff, 0xd8ecf8); pec(a, .6, -1, .2, .12, 0xffffff, 0xd8ecf8); };
  B['sky-falldart'] = function (a) { dfin(a, .3, .68, function (t) { return .5 * Math.sin(Math.PI * (.1 + .8 * t)) * (1 - .3 * t); }, 0x4898d0, 0xe8f8ff, -.9); dfin(a, .08, .24, function (t) { return .18; }, 0x4898d0, 0xb8e0ff, -.5, 3); pec(a, .62, 1, .3, .12, 0x70b8e8, 0xe8f8ff); pec(a, .62, -1, .3, .12, 0x70b8e8, 0xe8f8ff); };
  B['sky-marblefin'] = function (a) { dfin(a, .25, .72, function (t) { return .55 * Math.pow(Math.sin(Math.PI * (.05 + .9 * t)), .6); }, 0xd0ccc0, 0xf8f6f0, -.1, 10); blades(a, .12, .22, 2, .2, .03, 0xa8a498, 0xeceae4); pec(a, .6, 1, .32, .2, 0xeceae4, 0xa8a498); pec(a, .6, -1, .32, .2, 0xeceae4, 0xa8a498); };
  // scalloped, flat cloud-edged fin: base p0->p1, rim bulges along d
  function cloudFin(a, p0, p1, d, h, n, c0, c1) {
    for (var i = 0; i < n; i++) { var ta = i / n, tb = (i + 1) / n, A = [0, 1, 2].map(function (k) { return p0[k] + (p1[k] - p0[k]) * ta; }), Bq = [0, 1, 2].map(function (k) { return p0[k] + (p1[k] - p0[k]) * tb; }),
      m = [0, 1, 2].map(function (k) { return (A[k] + Bq[k]) / 2; }), e = [0, 1, 2].map(function (k) { return (Bq[k] - A[k]) / 2; }), hh = h * (.8 + .2 * Math.sin(i * 2.1 + 1)), prev = A;
      for (var j = 1; j <= 4; j++) { var t = Math.PI - Math.PI * j / 4, q = [0, 1, 2].map(function (k) { return m[k] + e[k] * Math.cos(t) * 1.08 + d[k] * hh * Math.sin(t); });
        a.fins.tri(m, prev, q, c0, c1, c1); prev = q; } }
  }
  B['sky-cloudpuff'] = function (a) { var T = a.top(.62), U = a.top(.34), r = a.side(.5, 1, 1.5), l = a.side(.5, -1, 1.5);
    cloudFin(a, [T[0], T[1] - .03, T[2]], [U[0], U[1] - .03, U[2]], [0, 1, 0], .2, 3, 0xeaf6ff, 0xffffff);
    [[r, 1], [l, -1]].forEach(function (q) { var s = q[1], b = q[0]; cloudFin(a, [b[0] + .08, b[1] - .02, b[2]], [b[0] - .1, b[1] - .06, b[2]], [-.3, -.5, s * .85], .22, 3, 0xcfe6fa, 0xffffff); });
    var p = a.surf(.03, 0); ribbon(a, [p[0], p[1] + .03, p[2]], .3, .08, 0xffffff, 0xbfe0f8, 0, .04); ribbon(a, [p[0], p[1] - .04, p[2]], .25, .06, 0xeaf6ff, 0xa8d8f8, 2, .04); };
  B['sky-spraysprat'] = function (a) { for (var i = 0; i < 6; i++) { var p = a.surf(.25 + i * .09, 0.1 * (i & 1 ? 1 : -1), .0); blob(a, [p[0], p[1] + .13 + .05 * (i % 3), p[2] + (i & 1 ? .05 : -.05)], .03 + .01 * (i % 2), 0xffffff, 1.3); }
    dfin(a, .4, .6, function (t) { return .18 * Math.sin(Math.PI * t); }, 0x2f8f8a, 0xeafff9, -.3, 4); pec(a, .6, 1, .18, .1, 0x4fb3ad, 0xffffff); pec(a, .6, -1, .18, .1, 0x4fb3ad, 0xffffff); };
  B['sky-mossgudgeon'] = function (a) { bumps(a, .22, .75, 7, .1, function (i) { return i % 2 ? 0x55702a : 0x7da23e; }, 0, .3); bumpsSide(a, .3, .7, 5, .09, 0x6d8a38); pec(a, .6, 1, .22, .18, 0x55702a, 0xa3c64e); pec(a, .6, -1, .22, .18, 0x55702a, 0xa3c64e); };
  B['sky-vaporfin'] = function (a) { var p = a.surf(.05, 0); for (var i = 0; i < 2; i++) ribbon(a, [p[0], p[1] + (i - .5) * .09, p[2]], .6 - .1 * i, .1, 0xe4f0fa, 0xa8c8e8, i * 1.3, .15); dfin(a, .3, .75, function (t) { return .5 * Math.sin(Math.PI * t) + .1; }, 0xe4f0fa, 0xa8c8e8, -.9, 8); };
  B['sky-gustray'] = function (a) { var p = a.surf(.02, 0); ribbon(a, p, 1.5, .03, 0x90b8e0, 0xffffff, 0, .12, [-1, 0, 0], 10); for (var s = -1; s <= 1; s += 2) { var q = a.side(.25, s, 1.45); ribbon(a, q, .5, .06, 0xffffff, 0x90b8e0, s, .05, [-.4, 0, s * .9], 4); } };
  B['sky-templekoi'] = function (a) { var e = a.top(.8); blob(a, [e[0] + .03, e[1] - .02, e[2]], .14, 0xe03a2a, .45); var q = a.top(.45); blob(a, [q[0], q[1] - .03, q[2]], .17, 0xe86a38, .35); dfin(a, .3, .6, function (t) { return .22 * Math.sin(Math.PI * t); }, 0xf8f0e0, 0xf0c868, -.3, 5); pec(a, .62, 1, .35, .22, 0xf8f0e0, 0xf0c868); pec(a, .62, -1, .35, .22, 0xf8f0e0, 0xf0c868); };
  B['sky-pebblechub'] = function (a) { bumps(a, .2, .78, 7, .13, function (i) { return [0x6c665c, 0x9a9384, 0x8a8378][i % 3]; }, 0, .2); bumpsSide(a, .25, .75, 6, .11, 0x756f64); };
  B['sky-reedrunner'] = function (a) { blades(a, .15, .8, 6, function (t) { return .3 + .15 * Math.sin(t * 5); }, .035, 0x46661f, 0xa8c85a, -.7); var p = a.surf(.02, 0); ribbon(a, p, .35, .08, 0x6b8a35, 0xf0f5cc, 0, .03); };
  B['sky-cumulus-eel'] = function (a) { var T = a.top(.9), U = a.top(.1); cloudFin(a, [T[0], T[1] - .03, T[2]], [U[0], U[1] - .03, U[2]], [0, 1, 0], .16, 9, 0xd8ecfb, 0xffffff);
    var b = a.bot(.8), c = a.bot(.15); cloudFin(a, [b[0], b[1] + .02, b[2]], [c[0], c[1] + .02, c[2]], [0, -1, 0], .1, 7, 0xd8ecfb, 0xffffff); };
  B['sky-stormkite'] = function (a) { var p = a.surf(.02, 0); var c = [p[0] - .1, p[1], p[2]]; a.fins.tri(c, [c[0] - .8, c[1] + .35, c[2]], [c[0] - .6, c[1], c[2]], 0x363e58, 0x363e58, 0xf8e868); a.fins.tri(c, [c[0] - .8, c[1] - .35, c[2]], [c[0] - .6, c[1], c[2]], 0x363e58, 0x363e58, 0xf8e868); ribbon(a, [c[0] - .6, c[1], c[2]], 1, .04, 0xf8e868, 0xffffff, 0, .12, [-1, 0, 0], 8); bolt(a, .3, .75, 0, .3, 0xfff08a, .12); };
  B['sky-pillarpike'] = function (a) { for (var i = 0; i < 5; i++) { var u = .2 + i * .13, s = a.surf(u, 0, .01); blob(a, [s[0], s[1] + .01, s[2]], .06, 0xe0e8ee, .5); }
    dfin(a, .08, .26, function (t) { return .3 * (1 - .4 * t); }, 0x68788a, 0x485664, -.2, 3); var b = a.bot(.1); a.fins.tri([b[0] + .2, b[1], b[2]], [b[0] - .05, b[1], b[2]], [b[0] - .1, b[1] - .25, b[2]], 0x68788a, 0x68788a, 0x485664); pec(a, .62, 1, .22, .12, 0x8a9aa8, 0x485664); pec(a, .62, -1, .22, .12, 0x8a9aa8, 0x485664); };
  B['sky-plungebass'] = function (a) { dfin(a, .3, .7, function (t) { return .38 * Math.sin(Math.PI * (.1 + .8 * t)); }, 0x1e505a, 0x9adfe6, -.2, 8); blades(a, .32, .68, 5, .55 * .6, .02, 0x9adfe6, 0xffffff, -.1); pec(a, .6, 1, .3, .22, 0x2e6c78, 0x9adfe6); pec(a, .6, -1, .3, .22, 0x2e6c78, 0x9adfe6); };
  B['sky-wetstoneloach'] = function (a) { bumps(a, .15, .85, 9, .07, function (i) { return i % 2 ? 0x93a493 : 0x34443c; }, 0, .2); dfin(a, .12, .85, function (t) { return .08; }, 0x34443c, 0x93a493, 0, 8); };
  B['sky-skywhale'] = function (a) { var p = a.top(.72), cA = 0xf4faff, cB = 0xa8d4f4;
    for (var i = -1; i <= 1; i++) { var dz = i * .1, pts = []; for (var j = 0; j <= 5; j++) { var t = j / 5; pts.push([p[0] + (-.08 + 0.2 * t) * (i ? 1 : .6) * (1 - 0) - .0, p[1] + .08 + .38 * Math.sin(Math.PI * .5 * t * 1.15) - .1 * t * t, p[2] + dz * t * 2]); }
      for (var j = 0; j < 5; j++) { var w = .03 * (1 - j / 6); a.fins.quad([pts[j][0], pts[j][1], pts[j][2] - w], [pts[j][0], pts[j][1], pts[j][2] + w], [pts[j + 1][0], pts[j + 1][1], pts[j + 1][2] + w], [pts[j + 1][0], pts[j + 1][1], pts[j + 1][2] - w], cA, cA, cB, cB); } }
    [1, -1].forEach(function (s) { var b = a.side(.6, s, 2.0); cloudFin(a, [b[0] + .1, b[1], b[2]], [b[0] - .25, b[1] - .1, b[2]], [-.2, -.6, s * .8], .42, 3, 0x8fc0ec, 0xe8f4ff); });
    var T = a.top(.5), U = a.top(.3); cloudFin(a, [T[0], T[1] - .03, T[2]], [U[0], U[1] - .03, U[2]], [-.3, 1, 0], .15, 2, 0x8fc0ec, 0xe8f4ff); };
  B['sky-halcyon'] = function (a) { var p = a.surf(.03, 0); ribbon(a, p, 1.3, .05, 0xf8f0a8, 0xffffff, 0, .1, [-1, 0, 0], 8); ribbon(a, [p[0], p[1] - .06, p[2]], 1.0, .04, 0x3aa8e8, 0xffffff, 1.5, .1); };
  B['sky-prismspray'] = function (a) { var cols = [0xff6a8a, 0xffb35c, 0xf8f06a, 0x6adf8a, 0x56c4f8, 0xc08cff]; var u0 = .28, u1 = .72, n = 6; for (var i = 0; i < n; i++) { var u = u0 + (u1 - u0) * i / (n - 1), b = a.top(u), h = .3 * Math.sin(Math.PI * (.1 + .8 * i / (n - 1))) + .08; a.fins.tri([b[0] + .06, b[1] - .02, b[2]], [b[0] - .06, b[1] - .02, b[2]], [b[0] - .08, b[1] + h, b[2]], cols[i], cols[i], 0xffffff); }
    pec(a, .6, 1, .3, .2, 0x56c4c8, 0xc08cff); pec(a, .6, -1, .3, .2, 0x56c4c8, 0xc08cff); };
  B['sky-celestine'] = function (a) { horn(a, .88, 1, .3, 0xfff0b8, .7); horn(a, .88, -1, .3, 0xfff0b8, .7); blades(a, .15, .9, 12, function (t) { return .25 * (1 - .5 * t) + .08; }, .04, 0xffe898, 0xffffff, -.6); var p = a.surf(.02, 0); ribbon(a, p, 1, .12, 0x88c0f8, 0xffffff, 0, .1, [-1, 0, 0], 8); };
  B['sky-moonspill'] = function (a) { var s = a.side(.62, 1, 1.3, .012), r = .17, n = 10, prev = null; for (var i = 0; i <= n; i++) { var t = -1.1 + 2.2 * i / n, c = [s[0] + Math.cos(t) * r, s[1] + Math.sin(t) * r, s[2] + .0], c2 = [s[0] + Math.cos(t) * r * .55 + r * .35, s[1] + Math.sin(t) * r * .8, s[2]]; if (prev) a.glowA.quad(prev[0], prev[1], c2, c, 0xe4f6ff, 0xe4f6ff, 0xe4f6ff, 0xe4f6ff); prev = [c, c2]; }
    for (var j = 0; j < 5; j++) { var q = a.top(.25 + j * .1); blob(a, [q[0], q[1] + .12 + .06 * (j % 2), q[2]], .035, 0xbfe6ff, 1.4); a.glowA.geo((a.P.sphT||a.P.sph), a.M([q[0], q[1] + .22 + .06 * (j % 2), q[2]], null, [.02, .02, .02]), 0xe4f6ff); } dfin(a, .25, .7, function (t) { return .3 * Math.sin(Math.PI * t); }, 0x122636, 0x9cbcd2, -.3, 6); };
  B['sky-thunderwyrm'] = function (a) { horn(a, .9, 1, .35, 0xf8f070, .6); horn(a, .9, -1, .35, 0xf8f070, .6); bolt(a, .1, .85, 0, .22, 0xfff070, .14); blades(a, .15, .85, 9, .22, .05, 0x1a1c3a, 0x7a84b8, -.9); };
  B['sky-seraph-ray'] = function (a) { var p = a.surf(.02, 0); for (var i = -2; i <= 2; i++) ribbon(a, [p[0], p[1], p[2] + i * .05], 1.1 - Math.abs(i) * .2, .05, 0xffe8a0, 0xffffff, i, .08, [-1, 0, i * .12], 6); };
  B['sky-starwell-leviathan'] = function (a) { starBeads(a, .15, .85, 14, .04, 0xffffff); starBeads(a, .25, .75, 8, .03, 0x8aa8ff); bumps(a, .2, .8, 4, .1, 0x3a4890, 0, .3); };

  Object.keys(B).forEach(function (id) { X.B[id] = B[id]; });
  (window.FWFISH || []).forEach(function (f) {
    var p = L[f.id]; if (p) for (var k in p) f.look[k] = p[k];
    if (B[f.id]) f.look.cx = f.id;
  });
})();
