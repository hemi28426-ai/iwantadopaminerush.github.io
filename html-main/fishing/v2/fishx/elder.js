// Fishing Unblocked v2 - per-species look overrides + custom geometry for the 'elder' group.
// L[id] = look patch (merged into the fish's look). B[id] = function(api){...} adds custom geometry (see fishx/README.md).
(function () {
  var X = window.FFISHX = window.FFISHX || { B: {}, L: {} };
  var L = {}, B = {};

  // ---- add entries below ----
  function cone(a, buf, p, d, r, h, col) { buf.geo(a.P.cone4, a.Mdir(p, d, [r, h, r]), col); }
  function box(a, buf, p, d, s, col) { buf.geo(a.P.box, a.Mdir(p, d, s), col); }
  // a leaf: two-triangle quad lying out from p along d
  function leaf(a, p, d, len, w, c0, c1) { var n = a.norm(d), s = a.norm(a.sub([0, 0, 1], a.add([0, 0, 0], [n[0] * 0, 0, 0]))), t = [0, 0, 1];
    var m = a.add(p, a.add([n[0] * len * .5, n[1] * len * .5, n[2] * len * .5], [0, w * .5, 0])), m2 = a.add(p, a.add([n[0] * len * .5, n[1] * len * .5, n[2] * len * .5], [0, -w * .5, 0]));
    var tip = a.add(p, [n[0] * len, n[1] * len, n[2] * len]);
    a.fins.tri(p, m, tip, c0); a.fins.tri(p, tip, m2, c1 || c0); }
  function sail(a, u0, u1, h, c0, c1, th) { var n = 8, b = [], t = []; for (var i = 0; i <= n; i++) { var q = i / n, p = a.top(u0 + (u1 - u0) * q); b.push(a.add(p, [0, -.02, 0])); t.push(a.add(p, [-.1 * q, h * Math.sin(Math.PI * Math.min(1, .15 + q * .85)) * (1 - .25 * q), 0])); } a.strip(a.fins, b, t, c0, c1, .85); }
  function pill(a, s, u, th, h, col, cap) { var p = a.surf(u, th), n = a.nrm(u, th); box(a, a.solid, a.add(p, [n[0] * -.02, n[1] * -.02, n[2] * -.02]), n, [.05, h, .05], col); }
  function stoneC(y) { return y > .7 ? 0xa8aa98 : 0x7c7e70; }

  L['elder-mosscarp'] = { c: 0x4f7a34, b: 0xb8d088, pc: 0x86b050, H: 1.15, tail: 'fan' };
  B['elder-mosscarp'] = function (a) { var r = a.rng;
    for (var i = 0; i < 7; i++) { var u = .2 + .6 * (i / 6), th = (i % 2 ? 1 : -1) * (.05 + r() * .9); th = th < 0 ? a.TAU + th : th; if (!(a.TAU === undefined)) {} 
      var p = a.surf(u, th), n = a.nrm(u, th), k = .05 + r() * .05; a.solid.geo(a.P.sph, a.M(a.add(p, [n[0] * -.01, n[1] * -.01, n[2] * -.01]), null, [k * 1.5, k * .8, k * 1.4]), i % 3 ? 0x3e6a28 : 0x7ab048);
      for (var j = 0; j < 2; j++) cone(a, a.solid, a.add(p, [(j - .5) * .03, 0, (r() - .5) * .04]), [(j - 1) * .3, 1, (r() - .5) * .5], .014, .07 + r() * .04, 0x8ac058); }
    sail(a, .3, .62, .2, 0x486030, 0x7a9a52); };

  L['elder-runefin'] = { c: 0x6c7c6a, pat: 'none', tail: 'fork', H: .9, L: 1.1 };
  B['elder-runefin'] = function (a) { var gl = 0xd8f090;
    [1, -1].forEach(function (s) { [.3, .45, .6].forEach(function (u, i) { var p = a.side(u, s, 1.25, -.005);
      var g = function (dx, dy, w, h) { a.glowA.geo(a.P.box, a.M(a.add(p, [dx, dy, s * .012]), null, [w, h, .012]), gl); };
      g(0, 0, .012, .1); if (i === 0) g(.03, .03, .05, .012); if (i === 1) { g(.025, .035, .04, .012); g(.025, -.03, .04, .012); } if (i === 2) { g(-.03, .02, .05, .012); g(0, -.04, .06, .012); } }); });
    for (var i = 0; i < 4; i++) { var p = a.top(.25 + i * .11); cone(a, a.fins, p, [-.3, 1, 0], .03, .14, 0xa8b8a0); }
    sail(a, .28, .66, .16, 0x5c6a5a, 0xd8e8a0); };

  L['elder-vinesprat'] = { c: 0x3a8a48, pat: 'bands', pc: 0x2a6a34, L: .8 };
  B['elder-vinesprat'] = function (a) { var r = a.rng;
    for (var i = 0; i < 6; i++) { var u = .2 + i * .11, p = a.top(u); leaf(a, p, [(i % 2 ? .2 : -.1), .8, (i % 2 ? .6 : -.6)], .13, .06, 0x58c860, 0x2a8a38); }
    var pts = [], p0 = a.top(.2); for (var j = 0; j <= 6; j++) { var t = j / 6; pts.push(a.add(p0, [.05 * t, .08 + .1 * Math.sin(t * 3), .12 * Math.sin(t * 6)])); }
    a.tubeX(a.solid, pts, function (t) { return .012 * (1 - t * .6); }, 4, function () { return 0x2e6a30; });
    leaf(a, pts[6], [.2, .5, .3], .1, .05, 0xa8e868); };

  L['elder-jungleperch'] = { c: 0x2a8a68, H: 1.15, tail: 'fan' };
  B['elder-jungleperch'] = function (a) {
    sail(a, .26, .7, .32, 0x1a6a50, 0xf8e858);
    [1, -1].forEach(function (s) { var st = a.side(.38, s, 2.3, -.01), b = [], t = []; for (var i = 0; i <= 5; i++) { var q = i / 5; b.push(a.add(st, [-.1 * q, -.01, s * .02 * q])); t.push(a.add(st, [-.16 - .1 * q, -.1 - .04 * Math.sin(q * 3), s * (.14 + .06 * q)])); } a.strip(a.fins, b, t, 0x1a6a50, 0xc8f060, .9); });
    for (var i = 0; i < 3; i++) leaf(a, a.top(.4 + i * .1), [-.2, .9, i % 2 ? .3 : -.3], .12, .05, 0xf8e858); };

  L['elder-aqueduct-eel'] = { c: 0x8a8a6a, pat: 'bands', pc: 0x5c5c42, L: 1.3 };
  B['elder-aqueduct-eel'] = function (a) { var r = a.rng;
    for (var i = 0; i < 9; i++) { var u = .14 + i * .08, p = a.top(u);
      box(a, a.solid, a.add(p, [0, .035, .0]), [0, 1, 0], [.08, .09, .1], stoneC); // block
      a.solid.geo(a.P.box, a.M(a.add(p, [0, .005, 0]), null, [.075, .05, .13]), 0x5c5a48); // arch gap shadow
      if (i % 3 === 1) cone(a, a.solid, a.add(p, [0, .07, 0]), [0, 1, 0], .02, .06, 0x5c8a38); } };

  L['elder-idolfish'] = { c: 0x7a7a70, pat: 'none', x: [], H: 1.2, W: 1.2, tail: 'fan' };
  B['elder-idolfish'] = function (a) { var r = a.rng, p = a.top(a.look.k === 'disc' ? .42 : .45);
    [0, 1, 2].forEach(function (i) { var w = .22 - i * .045; box(a, a.solid, a.add(p, [-.02, .06 + i * .07, 0]), [0, 1, 0], [w, .07, w * .9], i === 1 ? 0xa0a290 : 0x8a8c7c); });
    box(a, a.solid, a.add(p, [-.02, .28, 0]), [0, 1, 0], [.06, .06, .06], 0xd8b84a);
    [1, -1].forEach(function (s) { var q = a.side(.5, s, 1.4, -.01); box(a, a.solid, a.add(q, [0, 0, s * .02]), [0, 0, s], [.14, .14, .04], 0x6a6c60); a.glowA.geo(a.P.sph, a.M(a.add(q, [0, 0, s * .045]), null, [.03, .03, .02]), 0xd8d060); });
    for (var i = 0; i < 4; i++) cone(a, a.solid, a.top(.55 + i * .08), [-.2, 1, 0], .04, .1, 0x6a8a48); };

  L['elder-ringray'] = { c: 0x8a9a78, pat: 'spots', pc: 0xc8d89a, H: 2.2, W: 1.15 };
  B['elder-ringray'] = function (a) { var r = a.rng;
    for (var i = 0; i < 7; i++) { var ang = i / 7 * a.TAU, c = a.top(.5); var p = a.add(c, [Math.cos(ang) * .3 - .0, 0, Math.sin(ang) * .36]);
      box(a, a.solid, a.add(p, [0, .07, 0]), [0, 1, 0], [.07, .16, .05], i % 2 ? 0x9a9c8a : 0x7c7e70); if (i % 2) box(a, a.solid, a.add(p, [0, .17, 0]), [0, 1, 0], [.09, .03, .06], 0xaab09a); }
    cone(a, a.solid, a.surf(.97, 0), [-1, 0, 0], .02, .5, 0x6a7a5a); };

  L['elder-oathscale'] = { c: 0x58602a, pc: 0xe8d878, pat: 'scales', H: 1.1 };
  B['elder-oathscale'] = function (a) { var r = a.rng;
    for (var row = 0; row < 2; row++) for (var i = 0; i < 8; i++) { var u = .22 + i * .07 + row * .03, th = row ? .5 : 0, th2 = row ? a.TAU - .5 : 0, p = a.surf(u, row ? th : 0), n = a.nrm(u, row ? th : 0);
      a.glowA.geo(a.P.oct || a.P.cone4, a.Mdir(a.add(p, [n[0] * .005, n[1] * .005, n[2] * .005]), n, [.05, .03, .06]), i % 2 ? 0xe8d060 : 0xc8a838); }
    sail(a, .28, .66, .18, 0x424a1c, 0xe8d060); };

  L['elder-statuegar'] = { c: 0x7a8a7a, pat: 'bands', pc: 0x4a5a4a, L: 1.5, x: [] };
  B['elder-statuegar'] = function (a) { var r = a.rng;
    for (var i = 0; i < 10; i++) { var u = .16 + i * .07, p = a.top(u); box(a, a.solid, a.add(p, [0, .01, 0]), [0, 1, 0], [.07, .05 + (i & 1) * .03, .1], i % 3 === 0 ? 0x5e7a5a : stoneC); }
    [1, -1].forEach(function (s) { for (var i = 0; i < 4; i++) { var q = a.side(.3 + i * .12, s, 1.2, -.005); a.solid.geo(a.P.box, a.M(a.add(q, [0, 0, s * .01]), [0, 0, .5 * s * (i % 2 ? 1 : -1)], [.012, .09, .012]), 0x3c4a3a); } });
    for (var i = 0; i < 4; i++) cone(a, a.solid, a.top(.3 + i * .12), [0, 1, 0], .02, .06, 0x5aa058); };

  L['elder-pilgrimray'] = { c: 0x4a7a78, pc: 0xe8f4c8, H: 2.2, W: 1.1 };
  B['elder-pilgrimray'] = function (a) { var c = a.top(.55);
    [1, -1].forEach(function (s) { var b = [], t = [], st = a.side(.7, s, 1.1, -.01); for (var i = 0; i <= 5; i++) { var q = i / 5; b.push(a.add(st, [-.1 * q, 0, s * .005])); t.push(a.add(st, [-.5 * q - .1, -.02 + Math.sin(q * 5 + (s > 0 ? 0 : 2)) * .05, s * .035])); } a.strip(a.fins, b, t, 0xe8f4c8, 0x4a7a78, .8); });
    for (var i = 0; i < 3; i++) { var p = a.add(c, [-.1 + i * .2, 0, 0]); a.glowA.geo(a.P.box, a.M(a.add(a.top(.35 + i * .12), [0, .005, 0]), null, [.05, .01, .05]), 0xe8f4c8); }
    cone(a, a.solid, a.top(.52), [-.2, 1, 0], .05, .16, 0xe8f4c8); };

  L['elder-jadeking'] = { c: 0x1a9a68, pc: 0x90ffc8, H: 1.2, tail: 'fan' };
  B['elder-jadeking'] = function (a) {
    for (var i = 0; i < 7; i++) { var u = .2 + i * .06, p = a.top(u), h = .22 - Math.abs(i - 3) * .02; a.glowA.geo(a.P.cone4, a.Mdir(a.add(p, [0, -.02, 0]), [-.15, 1, 0], [.04, h * 1.4, .04]), i === 3 ? 0xc8ffe0 : 0x58e8a0); }
    sail(a, .3, .75, .24, 0x1a8a5a, 0x90ffc8);
    [1, -1].forEach(function (s) { var q = a.side(.45, s, 1.2, -.005); a.solid.geo(a.P.box, a.M(a.add(q, [0, 0, s * .012]), null, [.1, .1, .02]), 0x0e6a44); a.glowA.geo(a.P.sph, a.M(a.add(q, [0, 0, s * .03]), null, [.03, .03, .015]), 0xc8ffe0); }); };

  L['elder-oldgod-koi'] = { c: 0xe8e8d0, pat: 'spots', pc: 0x588a48, W: 1.2, H: 1.2, L: 1.2 };
  B['elder-oldgod-koi'] = function (a) { var r = a.rng;
    for (var i = 0; i < 5; i++) { var th = (i % 2 ? .4 : -.4); th = th < 0 ? a.TAU + th : th; var p = a.surf(.25 + i * .1, th); a.solid.geo(a.P.sph, a.M(a.add(p, [0, -.005, 0]), null, [.09, .03, .09]), i % 2 ? 0x2a5a2a : 0x588a48); }
    [1, -1].forEach(function (s) { var st = a.side(.7, s, 1.9, -.01), b = [], t = []; for (var i = 0; i <= 6; i++) { var q = i / 6; b.push(a.add(st, [-.1 * q, 0, 0])); t.push(a.add(st, [-.7 * q - .05, -.1 - .15 * q + Math.sin(q * 7 + s) * .06, s * (.1 + .1 * q)])); } a.strip(a.fins, b, t, 0xf0d080, 0xfff4d0, .9);
      var st2 = a.side(.38, s, 2.2, -.01), b2 = [], t2 = []; for (var i = 0; i <= 5; i++) { var q = i / 5; b2.push(a.add(st2, [-.1 * q, 0, 0])); t2.push(a.add(st2, [-.3 - .2 * q, -.12 - .08 * q, s * (.2 + .06 * q)])); } a.strip(a.fins, b2, t2, 0xf0d080, 0xffffff, .85); });
    sail(a, .3, .7, .22, 0xf0d080, 0xffffff); };

  L['elder-rootwyrm'] = { c: 0x4a3a20, pat: 'bands', pc: 0x68a048, L: 2.2 };
  B['elder-rootwyrm'] = function (a) { var r = a.rng;
    for (var i = 0; i < 8; i++) { var u = .14 + i * .09, s = i % 2 ? 1 : -1, p = a.side(u, s, 1.0, -.01), pts = [];
      for (var j = 0; j <= 4; j++) { var t = j / 4; pts.push(a.add(p, [-.04 * t, -.02 - .11 * t, s * .09 * t + s * .02 * Math.sin(t * 5)])); }
      a.tubeX(a.solid, pts, function (t) { return .02 * (1 - t * .75) + .004; }, 4, function (t) { return t > .8 ? 0x8a6a38 : 0x3a2a14; }); }
    for (var i = 0; i < 6; i++) { var p = a.top(.16 + i * .1); cone(a, a.solid, p, [-.2, 1, (i % 2 - .5) * .4], .03, .1, 0x3a2a14); leaf(a, a.add(p, [0, .07, 0]), [0, .7, i % 2 ? .6 : -.6], .1, .05, 0x68a048, 0x3a7a2a); } };

  L['elder-sunstone-seraph'] = { c: 0xffe090, pc: 0xffffff, H: 1.15 };
  B['elder-sunstone-seraph'] = function (a) {
    for (var k = 0; k < 3; k++) [1, -1].forEach(function (s) { var st = a.side(.42, s, 1.0, -.01), b = [], t = []; for (var i = 0; i <= 5; i++) { var q = i / 5; b.push(a.add(st, [-.04 * q, .03 * q + k * .02, s * .005])); t.push(a.add(st, [-.15 - .2 * q - k * .08, .3 - k * .12 + .22 * q * (1 - k * .5), s * (.3 + .25 * q - k * .07)])); } a.strip(a.fins, b, t, k ? 0xf8c860 : 0xfff4c8, 0xffffff, .88); });
    for (var i = 0; i < 9; i++) { var an = (i - 4) / 4 * 1.1, p = a.top(.5); a.glowA.geo(a.P.cone4, a.Mdir(a.add(p, [0, .02, 0]), [-Math.sin(an) * .5, Math.cos(an), Math.sin(an) * 1.2], [.025, .3, .025]), 0xffe8a0); }
    cone(a, a.glowA, a.surf(.98, 0), [-1, .2, 0], .03, .3, 0xffe8a0); };

  L['elder-forgotten-name'] = { c: 0x242a20, pat: 'bands', pc: 0x98e898, L: 1.3, H: 1.3 };
  B['elder-forgotten-name'] = function (a) { var r = a.rng;
    for (var i = 0; i < 8; i++) { var an = i / 8 * a.TAU, p = a.add(a.top(.5), [Math.cos(an) * .22, 0, Math.sin(an) * .3]), h = .22 + (i % 3) * .08;
      box(a, a.solid, a.add(p, [0, h * .5, 0]), [Math.cos(an) * .2, 1, Math.sin(an) * .2], [.06, h, .04], 0x2a302a); a.glowA.geo(a.P.box, a.M(a.add(p, [0, h * .6, 0]), null, [.02, .05, .045]), 0x70ff98); }
    [1, -1].forEach(function (s) { var q = a.side(.5, s, 1.5, -.005); a.glowA.geo(a.P.sph, a.M(a.add(q, [0, 0, s * .02]), null, [.05, .05, .02]), 0x98ffb8); [-1, 1].forEach(function (k) { a.glowA.geo(a.P.box, a.M(a.add(q, [0, k * .1, s * .01]), null, [.14, .012, .012]), 0x70ff98); }); }); };

  Object.keys(B).forEach(function (id) { X.B[id] = B[id]; });
  (window.FWFISH || []).forEach(function (f) {
    var p = L[f.id]; if (p) for (var k in p) f.look[k] = p[k];
    if (B[f.id]) f.look.cx = f.id;
  });
})();
