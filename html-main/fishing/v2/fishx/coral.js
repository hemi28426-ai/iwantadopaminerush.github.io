// Fishing Unblocked v2 - per-species look overrides + custom geometry for the 'coral' group.
// L[id] = look patch (merged into the fish's look). B[id] = function(api){...} adds custom geometry (see fishx/README.md).
(function () {
  var X = window.FFISHX = window.FFISHX || { B: {}, L: {} };
  var L = {}, B = {};

  // ---- add entries below ----
  // dorsal-style fin along the top (th=0) or bottom (th=PI) between u0..u1; hf(t) gives height
  function ridge(a, u0, u1, th, hgt, hf, c1, c2, n, back) {
    var base = [], tip = [], i, t, p, nr, h, q;
    for (i = 0; i <= (n || 8); i++) {
      t = i / (n || 8); p = a.surf(u0, th, 0); nr = a.nrm(u0 + (u1 - u0) * t, th);
      p = a.surf(u0 + (u1 - u0) * t, th, -.01); h = hgt * hf(t);
      base.push(p); tip.push([p[0] - (back || 0) * h + nr[0] * h, p[1] + nr[1] * h, p[2] + nr[2] * h]);
    }
    a.strip(a.fins, base, tip, c1, c2, .92);
  }
  var tri = function (t) { return Math.sin(Math.PI * Math.min(1, t * 1.15)) * (1 - .25 * t) + .08; };
  var sail = function (t) { return t < .15 ? .5 + t * 3.3 : 1 - (t - .15) * .8; };
  var rake = function (t) { return 1 - t * .85; };
  var ragged = function (t) { return .55 + .45 * Math.abs(Math.sin(t * 17)); };
  // spine cone from the surface at (u,th), pointing outward + backward
  function spine(a, u, th, len, rad, col, bk) {
    var p = a.surf(u, th, -.02), n = a.nrm(u, th), d = a.norm([n[0] - (bk == null ? .5 : bk), n[1], n[2]]);
    a.solid.geo(a.P.cone6, a.Mdir(p, d, [rad, len, rad]), function (x, y) { return y > .6 ? a.shade(col, 1.25) : col; });
  }
  // paired side fin (pectoral): strip fanning back from side(u,s)
  function pect(a, u, s, len, wid, c1, c2, droop) {
    var o = a.side(u, s, Math.PI / 2, -.01), base = [], tip = [], i, t;
    for (i = 0; i <= 5; i++) { t = i / 5; base.push([o[0] - .0 * t, o[1] - .02 * t, o[2]]);
      tip.push([o[0] - len * Math.sin(t * 1.5 + .2) * .9 - len * .1, o[1] - (droop || .06) * len - wid * (1 - t) * .3 + wid * .0, o[2] + s * wid * (.5 + t)]); }
    a.strip(a.fins, base, tip, c1, c2, .9);
  }
  function pearl(a, p, r, col) { a.solid.geo(a.P.sphS, a.M(p, null, [r, r, r]), function (x, y) { return y > .2 ? a.mix(col, 0xffffff, .5) : col; }); }
  function stalk(a, u, th, len, col, glow, bk) { // thin stalk with glow bead
    var p = a.surf(u, th, -.02), n = a.nrm(u, th), d = a.norm([n[0] - (bk == null ? .3 : bk), n[1], n[2]]), e = [p[0] + d[0] * len, p[1] + d[1] * len, p[2] + d[2] * len];
    a.solid.geo(a.P.cone6, a.Mdir(p, d, [.014, len, .014]), col);
    a.glowA.geo(a.P.sphS, a.M(e, null, [.03, .03, .03]), glow);
  }

  L['coral-sunstripe'] = { c: 0xffb830, pat: 'stripes', pc: 0xfff6d0, H: 1.15, L: 1.05 };
  B['coral-sunstripe'] = function (a) {
    ridge(a, .25, .72, 0, .5, sail, 0xff9020, 0xfff0a0, 9, .6);
    ridge(a, .6, .8, Math.PI, .22, tri, 0xff9020, 0xfff0a0, 5, .5);
    pect(a, .32, 1, .22, .12, 0xffd060, 0xfff0b0); pect(a, .32, -1, .22, .12, 0xffd060, 0xfff0b0);
  };

  L['coral-tidepip'] = { c: 0x40c8d8, pat: 'spots', pc: 0xffffff, L: .75, H: 1.1 };
  B['coral-tidepip'] = function (a) {
    ridge(a, .3, .6, 0, .26, tri, 0x20a0b8, 0xd8fff8, 5, .4);
    pect(a, .3, 1, .12, .08, 0x80e8f0, 0xffffff); pect(a, .3, -1, .12, .08, 0x80e8f0, 0xffffff);
  };

  L['coral-fanwrasse'] = { c: 0xe86a8a, pat: 'scales', pc: 0xff98b0, tail: 'fan', H: .95, L: 1.05 };
  B['coral-fanwrasse'] = function (a) {
    pect(a, .32, 1, .55, .5, 0xff90b0, 0xffe0e8, .02); pect(a, .32, -1, .55, .5, 0xff90b0, 0xffe0e8, .02);
    ridge(a, .2, .78, 0, .2, function (t) { return .7 + .3 * Math.sin(t * 6); }, 0xc84868, 0xffc0d0, 12, .3);
  };

  L['coral-lagoonling'] = { c: 0x58d0a8, pat: 'gradient', pc: 0x2a8a78, H: .85, L: 1.1 };
  B['coral-lagoonling'] = function (a) {
    ridge(a, .3, .55, 0, .2, rake, 0x38a888, 0xa0f0d0, 5, .5);
    ridge(a, .55, .82, 0, .2, tri, 0x38a888, 0xa0f0d0, 5, .4);
    ridge(a, .55, .85, Math.PI, .22, tri, 0x38a888, 0xa0f0d0, 5, .4);
    for (var i = 0; i < 2; i++) { var s = i ? -1 : 1, o = a.side(.96, s, Math.PI / 2, 0); a.strip(a.fins, [o, [o[0], o[1], o[2]]], [[o[0] - .5, o[1] + s * .06, o[2] + s * .05], [o[0] - .5, o[1] + s * .04 - .02, o[2] + s * .05]], 0xa0f0d0, 0x58d0a8, .85); }
  };

  L['coral-mossback'] = { c: 0x2aa888, pat: 'scales', pc: 0x58d8b8, f: 0xe858a0, H: 1.15 };
  B['coral-mossback'] = function (a) {
    var p = a.top(.2); a.solid.geo(a.P.sphS, a.M([p[0], p[1] - .02, p[2]], null, [.22, .17, .2]), function (x, y) { return y > 0 ? 0x58d8b8 : 0x2aa888; });
    ridge(a, .3, .8, 0, .22, tri, 0xe858a0, 0xffb0d8, 9, .3);
    pect(a, .34, 1, .3, .16, 0xe858a0, 0x58d8b8); pect(a, .34, -1, .3, .16, 0xe858a0, 0x58d8b8);
    for (var i = 0; i < 4; i++) pearl(a, a.top(.3 + i * .12), .035, 0x9be8c8);
  };

  L['coral-skiff-ray'] = { c: 0x5ab0d0, pat: 'spots', pc: 0xffffff, L: 1.5, W: 1.3, H: 1.2 };
  B['coral-skiff-ray'] = function (a) {
    var s = a.surf(.98, 0, 0), i; for (i = 0; i < 5; i++) { var t = i / 5; a.solid.geo(a.P.sphS, a.M([s[0] - .06 - t * .42, s[1] - .01, s[2]], null, [.09 * (1 - t) + .025, .045 * (1 - t) + .02, .045 * (1 - t) + .02]), i % 2 ? 0xf0fcff : 0x3a90b0); }
    ridge(a, .62, .9, 0, .12, rake, 0x3a90b0, 0xf0fcff, 4, .6);
  };

  L['coral-gilded-trigger'] = { c: 0xe8c040, pat: 'bands', pc: 0x286a8a, H: 1.35, L: .9 };
  B['coral-gilded-trigger'] = function (a) {
    spine(a, .3, 0, .42, .04, 0xffd860, .9); spine(a, .36, 0, .26, .03, 0xffd860, .6);
    ridge(a, .42, .82, 0, .34, tri, 0x30a8c8, 0x90e8f0, 8, .3);
    ridge(a, .5, .84, Math.PI, .3, tri, 0x30a8c8, 0x90e8f0, 8, .3);
  };

  L['coral-wreckwhisker'] = { c: 0x4a7a5a, pat: 'spots', pc: 0xd8e8a0, L: 1.4 };
  B['coral-wreckwhisker'] = function (a) {
    ridge(a, .2, .98, 0, .16, ragged, 0x365a42, 0xa8d0a0, 26, .4);
    ridge(a, .35, .98, Math.PI, .1, ragged, 0x365a42, 0xa8d0a0, 20, .4);
    for (var i = 0; i < 5; i++) { var p = a.top(.3 + i * .12); a.solid.geo(a.P.box, a.M([p[0], p[1] + .02, p[2]], [0, i * .5, .3], [.1, .016, .03]), 0xb8a070); }
  };

  L['coral-pearlmantle'] = { c: 0xf4ecf0, pat: 'gradient', pc: 0xc8a8d0 };
  B['coral-pearlmantle'] = function (a) {
    for (var i = 0; i < 7; i++) { var th = i % 2 ? .5 : -.5; pearl(a, a.surf(.25 + i * .08, th < 0 ? Math.PI*2 + th : th, .02), .045 + (i % 3) * .01, 0xfdf4fa); }
    pearl(a, a.top(.5), .085, 0xffffff);
    for (i = 0; i < 6; i++) { var t = i / 5, o = a.surf(.7 + t * .25, Math.PI, 0); a.strip(a.fins, [o, a.surf(.72 + t * .25, Math.PI, 0)], [[o[0] - .05, o[1] - .45, o[2] + (t - .5) * .2], [o[0] - .1, o[1] - .45, o[2] + (t - .5) * .2]], 0xf8e0f0, 0xe8d0e0, .6); }
  };

  L['coral-bloomsquid'] = { k: 'puffer', x: [], tail: 'round', c: 0xe85a98, b: 0xffc0d8, f: 0xf070b0, pat: 'spots', pc: 0xffe0f0, glow: 0xff80c0, L: 1.5, H: .82, W: .9 };
  B['coral-bloomsquid'] = function (a) {
    // a smooth bulb mantle opening into two rings of soft rounded petal-arms, like a coral flower
    var TAU = Math.PI * 2, ring = function (n, off, len, wid, rad, c1, c2, curl) {
      for (var i = 0; i < n; i++) {
        var th = i / n * TAU + off, ct = Math.cos(th), st = Math.sin(th), base = [], tip = [], j, t, w, cx, cy, cz;
        for (j = 0; j <= 8; j++) {
          t = j / 8; w = wid * Math.pow(Math.sin(Math.PI * (.04 + .92 * t)), .65) * (1 + .25 * t);
          cx = -.28 - len * t; cy = ct * (rad + len * .55 * t) - curl * t * t * .5; cz = st * (rad + len * .55 * t);
          base.push([cx - w * .2, cy - (-st) * w, cz - ct * w]); tip.push([cx - w * .2, cy + (-st) * w, cz + ct * w]);
        }
        a.strip(a.fins, base, tip, c1, c2, .96);
      }
    };
    ring(7, .2, .62, .16, .1, 0xf8689f, 0xffa8cc, .12);
    ring(7, .2 + Math.PI / 7, .4, .11, .06, 0xffb0d0, 0xffe6f2, .05);
    for (var i = 0; i < 7; i++) { var th = i / 7 * TAU + .2, e = [-.28 - .62 - .02, Math.cos(th) * (.1 + .34) - .06, Math.sin(th) * (.1 + .34)]; a.glowA.geo(a.P.sphS, a.M(e, null, [.035, .035, .035]), 0xfff0f8); }
    [[.62, .35], [.45, -.4], [.3, .5]].forEach(function (q) { var p = a.surf(q[0], q[1] < 0 ? TAU + q[1] : q[1], .01), r = .045; a.glowA.geo(a.P.sphS, a.M(p, null, [r, r * .8, r]), 0xfff0f8); });
  };

  L['coral-reefjudge'] = { c: 0x4a6a7a, pat: 'bands', pc: 0x2a404a, H: 1.1 };
  B['coral-reefjudge'] = function (a) {
    ridge(a, .38, .56, 0, .55, rake, 0x38525e, 0x6a8a98, 7, .9);
    ridge(a, .72, .8, 0, .16, rake, 0x38525e, 0x6a8a98, 4, .6);
    pect(a, .36, 1, .45, .22, 0x38525e, 0x6a8a98, .12); pect(a, .36, -1, .45, .22, 0x38525e, 0x6a8a98, .12);
  };

  L['coral-saltcrown'] = { c: 0x2858a8, pat: 'stripes', pc: 0x70b0f0, L: 1.6 };
  B['coral-saltcrown'] = function (a) {
    ridge(a, .3, .78, 0, .5, function (t) { return t < .1 ? .9 : (1 - t * .6) * (.8 + .2 * Math.cos(t * 30)); }, 0x1a3c78, 0x70b0f0, 16, .5);
    for (var i = 0; i < 5; i++) spine(a, .22 + i * .03, 0, .22 + (i === 2 ? .12 : 0), .03, 0xe8f4ff, 0);
    ridge(a, .5, .8, Math.PI, .18, tri, 0x1a3c78, 0x70b0f0, 6, .6);
    for (i = 0; i < 2; i++) { var s = i ? -1 : 1; pect(a, .3, s, .35, .12, 0x1a3c78, 0x70b0f0, .1); }
  };

  L['coral-tidewyrm'] = { c: 0x18808a, pat: 'scales', pc: 0x40c8b0, glow: 0x30e0c0, L: 2 };
  B['coral-tidewyrm'] = function (a) {
    for (var i = 0; i < 9; i++) { var u = .14 + i * .09; spine(a, u, 0, .26 - i * .012, .035, 0x30e0c0, .5); }
    ridge(a, .14, .98, 0, .12, function (t) { return .7 + .3 * Math.sin(t * 20); }, 0x106068, 0x80d8c8, 24, .4);
    for (i = 0; i < 2; i++) { var s = i ? -1 : 1, o = a.side(.18, s, Math.PI / 2, 0); a.strip(a.fins, [o, [o[0] - .05, o[1], o[2]], [o[0] - .1, o[1] + .03, o[2]]], [[o[0] - .25, o[1] + .05, o[2] + s * .5], [o[0] - .35, o[1] + .05, o[2] + s * .55], [o[0] - .45, o[1] + .02, o[2] + s * .5]], 0x30e0c0, 0x106068, .7); }
    spine(a, .1, .5, .22, .03, 0xe8fff8, 1.2); spine(a, .1, Math.PI*2 - .5, .22, .03, 0xe8fff8, 1.2);
  };

  L['coral-aurelia-throne'] = { c: 0xffd870, pat: 'scales', pc: 0xffffff, tail: 'fan', H: 1.1 };
  B['coral-aurelia-throne'] = function (a) {
    ridge(a, .22, .8, 0, .55, function (t) { return .6 + .4 * Math.sin(t * 3.14); }, 0xff9ac0, 0xffe898, 14, .6);
    ridge(a, .45, .85, Math.PI, .45, tri, 0xff9ac0, 0xffe898, 10, .5);
    pect(a, .3, 1, .5, .4, 0xff9ac0, 0xfff0c0, .05); pect(a, .3, -1, .5, .4, 0xff9ac0, 0xfff0c0, .05);
  };

  L['coral-drownedbell'] = { c: 0x2a5a6a, pat: 'bands', pc: 0x58c0b0, glow: 0x50e0d0, L: 1.2, H: 1.3 };
  B['coral-drownedbell'] = function (a) {
    var p = a.top(.5); a.solid.geo(a.P.sphS, a.M([p[0], p[1] - .06, p[2]], null, [.4, .3, .4]), function (x, y) { return y > .75 ? 0x7ac0b0 : y > .2 ? 0x58a0a0 : y > -.3 ? 0x3a7a78 : 0x7a8a6a; });
    a.solid.geo(a.P.sphS, a.M([p[0], p[1] + .25, p[2]], null, [.05, .05, .05]), 0x8ac0b0);
    for (var i = 0; i < 6; i++) { var th = i / 6 * Math.PI*2, q = a.surf(.5, th, -.01); a.glowA.geo(a.P.sphS, a.M([q[0], q[1] - .02, q[2]], null, [.03, .03, .03]), 0x50e0d0); }
    var b = a.bot(.5); a.glowA.geo(a.P.sphS, a.M([b[0], b[1] - .12, b[2]], null, [.07, .09, .07]), 0x80fff0);
    a.solid.geo(a.P.cyl, a.M([b[0], b[1] - .05, b[2]], null, [.012, .1, .012]), 0x3a7a78);
  };

  L['coral-triggerfish'] = { c: 0xd9863a, pat: 'scales', pc: 0x4a2e18 };
  B['coral-triggerfish'] = function (a) {
    spine(a, .3, 0, .5, .045, 0x5a3d22, .35);
    ridge(a, .4, .78, 0, .22, tri, 0x5a3d22, 0xf2c98e, 7, .3);
    ridge(a, .5, .8, Math.PI, .22, tri, 0x5a3d22, 0xf2c98e, 7, .3);
  };


  Object.keys(B).forEach(function (id) { X.B[id] = B[id]; });
  (window.FWFISH || []).forEach(function (f) {
    var p = L[f.id]; if (p) for (var k in p) f.look[k] = p[k];
    if (B[f.id]) f.look.cx = f.id;
  });
})();
