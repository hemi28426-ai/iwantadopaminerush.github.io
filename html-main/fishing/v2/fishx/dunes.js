// Fishing Unblocked v2 - per-species look overrides + custom geometry for the 'dunes' group.
// L[id] = look patch (merged into the fish's look). B[id] = function(api){...} adds custom geometry (see fishx/README.md).
(function () {
  var X = window.FFISHX = window.FFISHX || { B: {}, L: {} };
  var L = {}, B = {};

  // ---- add entries below ----

  // helpers: blade = two crossed triangles rooted on the body; sail = fin strip along the back
  function blade(a, p, dir, len, wid, c0, c1) {
    var t = a.add(p, dir), w = [0, 0, wid];
    var tip = a.add(p, [dir[0] * len, dir[1] * len, dir[2] * len]);
    a.fins.tri(a.add(p, [wid, 0, 0]), a.sub(p, [wid, 0, 0]), tip, c0, c0, c1);
    a.fins.tri(a.add(p, w), a.sub(p, w), tip, c0, c0, c1);
  }
  function sail(a, u0, u1, n, h, sweep, c0, c1, th) {
    var base = [], tip = [], i, t, u, hh;
    for (i = 0; i < n; i++) { t = i / (n - 1); u = u0 + (u1 - u0) * t; hh = typeof h === 'function' ? h(t) : h * Math.sin(Math.PI * Math.min(1, t * .9 + .05));
      base.push(a.surf(u, th || 0, -.01)); tip.push(a.add(a.surf(u, th || 0, 0), [-sweep * (.4 + t), hh, 0])); }
    a.strip(a.fins, base, tip, c0, c1, .88);
  }
  function legs(a, us, len, col) { // little walking legs under the body
    us.forEach(function (u, i) { [1, -1].forEach(function (s) {
      var r = a.side(u, s, 2.3, -.01), k = i % 2 ? -1 : 1;
      var pts = [r, a.add(r, [k * .03, -len * .5, s * len * .5]), a.add(r, [-k * .03, -len, s * len * .7])];
      a.tubeX(a.solid, pts, function (t) { return .016 * (1 - .5 * t); }, 4, function () { return col; });
    }); });
  }
  function flare(a, u, th, len, drop, c0, c1) { // hood / nemes: flat triangle fanned out each side behind the head
    [1, -1].forEach(function (s) {
      var r0 = a.side(u, s, th, -.01), r1 = a.side(u - .05, s, th, -.01), r2 = a.side(u - .05, s, th + .8, -.01);
      var o = [-len * .6, -drop, s * len];
      var t1 = a.add(r0, o), t2 = a.add(r1, [o[0] * 1.8, o[1] * 1.2, o[2] * .95]);
      a.fins.tri(r0, r1, t1, c0, c0, c1); a.fins.tri(r1, t2, t1, c0, c1, c1); a.fins.tri(r0, r2, t1, c0, c0, c1);
    });
  }

  L['dunes-sandskipper'] = { H: .85, L: 1.1, c: 0xe8cf8c, pc: 0x8f7038 };
  B['dunes-sandskipper'] = function (a) { sail(a, .38, .62, 5, .16, .05, 0xc8aa60, 0xf4e4a8); legs(a, [.35, .5, .65], .17, 0xa88848); };

  L['dunes-dustfin'] = { L: 1.15, H: 1.1, c: 0xb88c58, pc: 0x6e4c28 };
  B['dunes-dustfin'] = function (a) { sail(a, .3, .8, 8, .24, .12, 0x8a6838, 0xd8b078); sail(a, .3, .6, 5, .1, .1, 0x8a6838, 0xc8a068, Math.PI); };

  L['dunes-mirageperch'] = { H: 1.25, pc: 0xfff6c8 };
  B['dunes-mirageperch'] = function (a) {
    sail(a, .3, .52, 6, .14, .04, 0xe0a040, 0xfff0b0);
    for (var i = 0; i < 6; i++) { var u = .55 + i * .05; blade(a, a.top(u), [-.4, 1, 0], .16 - i * .012, .01, 0xe0a040, 0xffe890); }
  };

  L['dunes-oasiscarp'] = { H: 1.0, W: 1.15, b: 0xe8f0b0, pc: 0xb8e898 };
  B['dunes-oasiscarp'] = function (a) {
    sail(a, .3, .78, 9, .2, .1, 0x2f7a48, 0x68b878);
    for (var i = 0; i < 3; i++) { var u = .28 + i * .08; blade(a, a.top(u), [-.6, 1, 0], .16, .012, 0x3a8a50, 0xe8d880); } // palm-leaf crest
  };

  L['dunes-scarabfin'] = { c: 0x1f7e70, pc: 0xf0d050, W: 1.1 };
  B['dunes-scarabfin'] = function (a) {
    var p = a.surf(.12, 0, 0);
    a.fins.tri(a.add(p, [0, 0, .05]), a.add(p, [0, 0, -.05]), a.add(p, [.2, .06, 0]), 0x1a6a5c, 0x1a6a5c, 0xe8c850); // clypeus horn
    a.fins.tri(a.add(p, [.02, 0, .035]), a.add(p, [.02, 0, -.035]), a.add(p, [.14, .2, 0]), 0x103f38, 0x103f38, 0xf0d050);
    legs(a, [.35, .5, .65], .2, 0x103f38);
    for (var u = .3; u < .8; u += .1) a.solid.geo(a.P.sphS, a.M(a.top(u), null, [.03, .018, .045]), 0xe8c850);
  };

  L['dunes-ochrebass'] = { H: 1.3, L: 1.1, c: 0xc0622c };
  B['dunes-ochrebass'] = function (a) {
    sail(a, .28, .72, 9, .17, .06, 0x7a3414, 0xd8803c);
    for (var i = 0; i < 5; i++) blade(a, a.top(.3 + i * .08), [-.3, 1, 0], .2 - i * .015, .012, 0x6a2c10, 0xe0a060);
    a.solid.geo(a.P.sph, a.M(a.top(.28), null, [.1, .07, .1]), 0xb85a28);
  };

  L['dunes-sunreed'] = { L: 1.3, c: 0xd8a838 };
  B['dunes-sunreed'] = function (a) {
    for (var i = 0; i < 9; i++) { var u = .2 + i * .075, h = .2 - .008 * i;
      blade(a, a.top(u), [-.5 + (i % 2) * .9, 1, 0], h, .014, 0x9a7418, 0xf0d070); }
  };

  L['dunes-templeguard'] = { H: 1.2, c: 0x8a7a60, x: [] };
  B['dunes-templeguard'] = function (a) {
    for (var i = 0; i < 6; i++) { var u = .22 + i * .1, p = a.top(u);
      a.solid.geo(a.P.box, a.M(a.add(p, [0, .05, 0]), null, [.045, .09 - i * .006, .09]), i % 2 ? 0xa89a7c : 0x7c6e54); }
    [1, -1].forEach(function (s) { a.solid.geo(a.P.box, a.M(a.side(.45, s, 1.1, .02), null, [.14, .06, .02]), 0xc8b48a); }); // carved slabs
  };

  L['dunes-nightadder'] = { L: 1.5 };
  B['dunes-nightadder'] = function (a) {
    flare(a, .2, 1.2, .16, .02, 0x2a2230, 0xe8a830);
    sail(a, .3, .85, 10, .05, .05, 0x1a141e, 0x4a3a58);
  };

  L['dunes-dunewing'] = { c: 0xe0b468, pc: 0x8a6a30, W: 1.3, L: 1.1 };
  B['dunes-dunewing'] = function (a) {
    var pts = [], i;
    for (i = 0; i < 5; i++) pts.push(a.add(a.surf(.97, 0, 0), [-.08 - i * .1, -.02 - .015 * i, Math.sin(i) * .03]));
    a.tubeX(a.solid, pts, function (t) { return .03 * (1 - .8 * t); }, 5, function (t) { return a.mix(0xc8a058, 0x6a5028, t); });
    for (i = 0; i < 3; i++) a.solid.geo(a.P.sphS, a.M(a.top(.3 + i * .12), null, [.05, .02, .05]), 0x987838);
  };

  L['dunes-sirocco-shark'] = { c: 0xb88a58, x: ['sail'] };
  B['dunes-sirocco-shark'] = function (a) {
    var n = 6, base = [], tip = [], i, t;
    for (i = 0; i < n; i++) { t = i / (n - 1); base.push(a.top(.36 + t * .2)); tip.push(a.add(a.top(.36 + t * .2), [-.1 - .4 * t, .28 * Math.sin(Math.PI * (t * .7 + .1)) + .1, 0])); }
    a.strip(a.fins, base, tip, 0x946a3c, 0xc89a60, .9);
  };

  L['dunes-pharaoh-gar'] = { L: 1.7, c: 0xd8a830 };
  B['dunes-pharaoh-gar'] = function (a) {
    flare(a, .24, 1.0, .2, .04, 0x2a5aa0, 0xffd860); flare(a, .3, 1.1, .16, .04, 0xe8c040, 0x2a5aa0);
    for (var i = 0; i < 7; i++) a.solid.geo(a.P.oct, a.M(a.top(.28 + i * .08), null, [.035, .045, .035]), i % 2 ? 0xffe078 : 0xb88418);
    sail(a, .78, .92, 4, .12, .05, 0xb08418, 0xffe078);
  };

  L['dunes-glasswyrm'] = { L: 2.1 };
  B['dunes-glasswyrm'] = function (a) {
    for (var i = 0; i < 9; i++) { var u = .15 + i * .09, h = .12 + .08 * Math.sin(i * 1.3 + 1);
      var p = a.top(u), tip = a.add(p, [-.04, h, 0]);
      a.glowA.tri(a.add(p, [.03, 0, 0]), a.sub(p, [.03, 0, 0]), tip, 0xffd860, 0xffd860, 0xffffff);
      a.glowA.tri(a.add(p, [0, 0, .03]), a.sub(p, [0, 0, .03]), tip, 0xffd860, 0xffd860, 0xffffff); }
  };

  L['dunes-mirage-queen'] = { H: 1.15 };
  B['dunes-mirage-queen'] = function (a) {
    var k, pts, i;
    for (k = 0; k < 3; k++) { pts = [];
      for (i = 0; i < 7; i++) pts.push(a.add(a.top(.3 + k * .1), [-.1 - i * .08, .1 + .12 * k + Math.sin(i * .9 + k) * .06 - i * .015, 0]));
      a.tubeX(a.glowA, pts, function (t) { return .014 * (1 - t); }, 4, function (t) { return a.mix(0xffd890, 0xff6a50, t); }); }
    [1, -1].forEach(function (s) { pts = [];
      for (i = 0; i < 6; i++) pts.push(a.add(a.side(.45, s, 2.2, 0), [-.06 - i * .09, -.05 - i * .02, s * (.05 + .04 * i)]));
      a.tubeX(a.glowA, pts, function (t) { return .012 * (1 - t); }, 4, function (t) { return a.mix(0xffb860, 0xff8a60, t); }); });
  };

  L['dunes-buriedstar'] = { c: 0x14182e, pc: 0xffe890 };
  B['dunes-buriedstar'] = function (a) {
    var i, th, p, d;
    for (i = 0; i < 5; i++) { th = i / 5 * Math.PI * 2; d = [Math.cos(th) * .5 + .3, 0, Math.sin(th)];
      p = a.surf(.5, th * .5 + 0.0, 0);
    }
    for (i = 0; i < 6; i++) { p = a.top(.2 + i * .12); a.glowA.geo(a.P.oct, a.M(a.add(p, [0, .03, 0]), null, [.05, .07, .05]), i % 2 ? 0xffe070 : 0xfff4c0); }
    for (i = 0; i < 4; i++) { p = a.side(.35 + i * .12, i % 2 ? 1 : -1, .9, 0); a.solid.geo(a.P.sphS, a.M(p, null, [.07, .04, .07]), 0x6a5a3c); } // clinging sand crust
  };

  Object.keys(B).forEach(function (id) { X.B[id] = B[id]; });
  (window.FWFISH || []).forEach(function (f) {
    var p = L[f.id]; if (p) for (var k in p) f.look[k] = p[k];
    if (B[f.id]) f.look.cx = f.id;
  });
})();
