// Fishing Unblocked v2 - per-species look overrides + custom geometry for the 'grotto' group.
// L[id] = look patch (merged into the fish's look). B[id] = function(api){...} adds custom geometry (see fishx/README.md).
(function () {
  var X = window.FFISHX = window.FFISHX || { B: {}, L: {} };
  var L = {}, B = {};


  // ---- helpers ----
  function sp(a, buf, p, d, len, w, col, tip) { // cone from surface point p pointing along d
    var dd = a.norm(d); buf.geo(a.P.cone4, a.Mdir(a.add(p, a.sub([0,0,0], a.sub([0,0,0], dd.map(function (v) { return -v * .02; })))), dd, [w, len, w]), function (x, y) { return y > .6 && tip ? tip : col; });
  }
  function ball(a, buf, p, r, col) { buf.geo(a.P.sphS, a.M(p, null, [r, r, r]), col); }
  function rib(a, buf, pts, r, col, n) { a.tubeX(buf, pts, function () { return r; }, n || 3, function () { return col; }); }

  // ---- add entries below ----
  // Glowmoth Fry: big glowing moth wings + feather antennae
  B['grotto-glowmoth'] = function (a) {
    [1, -1].forEach(function (s) {
      var r = a.side(.38, s, 1.1, .02), r2 = a.side(.52, s, 1.1, .02);
      var tipU = a.add(r, [-.1, .34, s * .42]), tipL = a.add(r2, [-.34, -.12, s * .4]);
      [[r, tipU, r2], [r2, tipU, tipL]].forEach(function (t, q) { var c = q ? [0xc0fff0, 0x60ffe0, 0x40c8b0] : [0xffffff, 0x60ffe0, 0xc0fff0]; a.glowA.tri(t[0], t[1], t[2], c[0], c[1], c[2]); a.glowA.tri(t[0], t[2], t[1], c[0], c[2], c[1]); });
      ball(a, a.glowA, a.add(tipU, [0, 0, 0]), .035, 0xffffff);
      var h = a.side(a.eyesP ? .2 : .2, s, .1, 0), t = [];
      for (var i = 0; i <= 3; i++) t.push(a.add(h, [i * .03, .1 + i * .07, s * (.03 + i * .05)]));
      rib(a, a.tubesA, t, .008, 0xc0fff0);
    });
  };
  // Dripscale: teardrops hanging from belly, spiny dorsal
  L['grotto-dripscale'] = { c: 0x3e5e86, b: 0xa8c8ec };
  B['grotto-dripscale'] = function (a) {
    for (var i = 0; i < 4; i++) { var u = .35 + i * .12, p = a.bot(u); sp(a, a.solid, p, [0.1, -1, 0], .1 + .03 * (i & 1), .03, 0x78a0c8, 0xdff4ff); ball(a, a.glowA, a.add(p, [.02, -.2 - .03 * (i & 1), 0]), .022, 0xaee4ff); }
    for (var j = 0; j < 5; j++) { var q = a.top(.3 + j * .1); sp(a, a.fins, q, [-.5, 1, 0], .13 - j * .01, .03, 0x365270, 0x78a0c8); }
  };
  // Blind Pearl: strings of pearls, no fins
  B['grotto-blindpearl'] = function (a) {
    for (var i = 0; i < 9; i++) { var th = i * 2.4, u = .3 + (i % 4) * .13, p = a.surf(u, th, .02); ball(a, a.solid, p, .045 + .01 * (i % 3), i & 1 ? 0xffffff : 0xdcd0f4); }
  };
  // Stalactite Eel: stone cone ridge + conical pointed look
  L['grotto-stalactite-eel'] = { c: 0x8a8070, b: 0xc8c0b0, pat: 'bands', pc: 0x4a4238, f: 0x6a6252, x: [] };
  B['grotto-stalactite-eel'] = function (a) {
    for (var i = 0; i < 10; i++) { var u = .12 + i * .075, p = a.top(u), h = .16 * (1 - Math.abs(i - 4) / 7); sp(a, a.solid, p, [0, -1, 0].map(function (v) { return -v; }), h + .03, .06 - i * .002, 0x8a8070, 0xd8d0c0); }
    for (var j = 0; j < 5; j++) { var b = a.bot(.2 + j * .13); sp(a, a.solid, b, [0, -1, 0], .08 + .03 * (j & 1), .035, 0x6a6252, 0xb0a898); }
  };
  // Lumen Ray: glowing spots as lamps and long whip tail
  B['grotto-lumenray'] = function (a) {
    [1, -1].forEach(function (s) { [[.45, .45], [.6, .7], [.36, .7], [.7, .35]].forEach(function (c) { var p = a.side(c[0], s, c[1] * 1.2, .01); a.glowA.geo(a.P.sphS, a.M(p, null, [.045, .01, .045]), 0xc8e0ff); }); });
    var t = []; for (var i = 0; i <= 6; i++) t.push(a.add(a.surf(.97, 0, 0), [-i * .12, Math.sin(i) * .02, 0]));
    rib(a, a.tubesA, t, .012, 0x60a0ff, 3);
    ball(a, a.glowA, t[6], .025, 0xffffff);
  };
  // Chasm Carp: tall sail dorsal and plated hump
  L['grotto-cavecarp'] = { c: 0x4a4a52, b: 0x9a9a9a, pc: 0x7a7a88 };
  B['grotto-cavecarp'] = function (a) {
    var base = [], tip = [];
    for (var i = 0; i < 7; i++) { var u = .3 + i * .07, p = a.top(u); base.push(a.add(p, [0, -.01, 0])); tip.push(a.add(p, [-.04 * i, .3 * Math.sin((i + .5) / 7 * Math.PI) + .04, 0])); }
    a.strip(a.fins, base, tip, 0x2a3644, 0x6a7a90, .8);
    for (var k = 0; k < 5; k++) { var q = a.surf(.3 + k * .09, .55, .015); ball(a, a.solid, q, .04, 0x6a6a74); var q2 = a.surf(.3 + k * .09, a.TAU - .55, .015); ball(a, a.solid, q2, .04, 0x6a6a74); }
  };
  // Glass Eel: ribbon fin with glowing spine dots
  B['grotto-glasseel'] = function (a) {
    var base = [], tip = [];
    for (var i = 0; i < 12; i++) { var p = a.top(.1 + i * .075); base.push(p); tip.push(a.add(p, [-.02, .08 + .02 * Math.sin(i), 0])); }
    a.strip(a.fins, base, tip, 0xb8e8f8, 0xffffff, .8);
    for (var j = 0; j < 9; j++) ball(a, a.glowA, a.surf(.14 + j * .095, 0, 0), .018, 0x90f0ff);
  };
  // Echo Shark: sonar rings in front + fin blades
  B['grotto-echoshark'] = function (a) {
    [1, -1].forEach(function (s) {
      for (var k = 0; k < 3; k++) { var c = a.side(.2 - k * 0, s, 1.1, .05), pts = []; for (var i = 0; i <= 10; i++) { var t = -1 + i / 5; if (Math.abs(t) > 1.0001) continue; var an = t * 1.0; pts.push(a.add(c, [.05 + k * .09 + Math.cos(an) * 0 + 0, Math.sin(an * 1) * (.14 + k * .06), s * (.06 + k * .08) + Math.cos(an) * 0])); } 
        rib(a, a.glowA, pts, .008, 0x80fff4, 3); }
    });
    for (var j = 0; j < 4; j++) { var q = a.top(.55 + j * .1); sp(a, a.fins, q, [-1, .5, 0], .14 - j * .02, .035, 0x1c2836, 0x48f0e8); }
  };
  // Hollow Jelly: glowing rim ring + inner sphere lantern
  B['grotto-dripping-jelly'] = function (a) {
    var c = a.surf(.0, 0, 0);
    a.glowA.geo(a.P.sphS, a.M(a.add(c, [0, -.1, 0]), null, [.16, .2, .16]), 0xfff0ff);
    var pts = []; for (var i = 0; i <= 12; i++) { var t = i / 12 * a.TAU; pts.push(a.add(a.surf(.85, 0, 0), [0, 0, 0])); }
    for (var k = 0; k < 6; k++) { var q = a.surf(.7, k * a.TAU / 6, .01); ball(a, a.glowA, q, .055, 0xffffff); }
  };
  // Moonquill Squid: crescent moon fin on the mantle + stars
  B['grotto-moonquill'] = function (a) {
    var base = [], tip = [];
    for (var i = 0; i <= 8; i++) { var t = i / 8, u = .35 + t * .45, p = a.top(u); base.push(p); tip.push(a.add(p, [-.05 * t, .05 + .2 * Math.sin(t * Math.PI), 0])); }
    a.strip(a.fins, base, tip, 0x8a88d8, 0xf0f0ff, .8);
    [1, -1].forEach(function (s) { for (var k = 0; k < 4; k++) ball(a, a.glowA, a.side(.4 + k * .1, s, 1.0 + (k & 1) * .4, .01), .02, 0xffffff); });
  };
  // Crag Gar: tall stalagmite ridge and rock plates
  L['grotto-cragmaw-gar'] = { c: 0x5a584c, b: 0xa8a090, f: 0x3c3a30, pc: 0x7c7a6a };
  B['grotto-cragmaw-gar'] = function (a) {
    for (var i = 0; i < 7; i++) { var u = .25 + i * .09, p = a.top(u); sp(a, a.solid, p, [-.2, 1, 0], .14 + .12 * Math.sin((i + .5) / 7 * Math.PI), .05, 0x4a4a40, 0xb8b0a0); }
    for (var j = 0; j < 4; j++) { var q = a.bot(.3 + j * .14); sp(a, a.solid, q, [-.3, -1, 0], .07, .03, 0x6a6a5a, 0x9a9a8a); }
  };
  // Dawnchoir: organ pipe dorsal with sunrise colours
  L['grotto-dawnchoir'] = { c: 0xf4b8d0, b: 0xfff0e0, pc: 0xffe090 };
  B['grotto-dawnchoir'] = function (a) {
    for (var i = 0; i < 6; i++) { var p = a.top(.3 + i * .07), h = .1 + .2 * Math.sin((i + .5) / 6 * Math.PI); a.solid.geo(a.P.cyl, a.M(a.add(p, [0, h / 2 - .02, 0]), null, [.028, h, .028]), i & 1 ? 0xffd8a0 : 0xffb8d8); ball(a, a.glowA, a.add(p, [0, h - .02, 0]), .026, 0xfff0c0); }
  };
  // Prism Leviathan: crystal prisms of many colours
  B['grotto-prism-leviathan'] = function (a) {
    var cols = [0xff80f0, 0x80ffe8, 0xa8a0ff, 0xffe080, 0x80d0ff];
    for (var i = 0; i < 9; i++) { var th = (i % 3 - 1) * .6, u = .3 + (i / 9) * .4, p = a.surf(u, th, 0); a.glowA.geo(a.P.cone6, a.Mdir(a.add(p, [0, -.02, 0]), a.norm([-.3, Math.cos(th), Math.sin(th)]), [.07, .2 + .1 * (i % 3), .07]), cols[i % 5]); }
    [1, -1].forEach(function (s) { for (var k = 0; k < 3; k++) a.glowA.geo(a.P.oct, a.M(a.side(.55 + k * .1, s, 1.3, .02), null, [.05, .07, .03]), cols[(k + 2) % 5]); });
  };
  // Lantern King: antler-like lamp stalk with big glowing bulb + golden crown fins
  B['grotto-lanternking'] = function (a) {
    var p0 = a.top(.2), pts = [];
    for (var i = 0; i <= 5; i++) pts.push(a.add(p0, [.22 * Math.sin(i / 5 * 1.6), .08 + i * .06, 0]));
    rib(a, a.tubesA, pts, .014, 0xe89828, 4);
    a.glowA.geo(a.P.sph, a.M(a.add(pts[5], [0, .05, 0]), null, [.09, .09, .09]), function () { return 0xfff0a0; });
    for (var j = 0; j < 4; j++) { var q = a.top(.4 + j * .1); sp(a, a.fins, q, [-.7, 1, 0], .16, .04, 0xe89828, 0xfff4c0); }
  };
  // Abyssal Serpent: long ribbon dorsal and horn crest
  B['grotto-abyssal-serpent'] = function (a) {
    var base = [], tip = [];
    for (var i = 0; i < 16; i++) { var p = a.top(.12 + i * .055); base.push(p); tip.push(a.add(p, [-.03, .1 + .06 * Math.sin(i * .8), 0])); }
    a.strip(a.fins, base, tip, 0x0a1020, 0x48d8ff, .75);
    [1, -1].forEach(function (s) { var h = a.side(.08, s, 1.1, 0); sp(a, a.solid, h, [-.8, .6, s * .5], .22, .04, 0x182440, 0x48d8ff); });
  };
  // Vault Spirit: ghost light wisps and floating shroud
  B['grotto-vaultspirit'] = function (a) {
    for (var k = 0; k < 5; k++) { var st = a.surf(.5, k * 1.26, 0), pts = []; for (var i = 0; i <= 5; i++) pts.push(a.add(st, [Math.sin(i + k) * .05, -.1 - i * .16, Math.cos(i + k * 2) * .05])); rib(a, a.glowA, pts, .024 - .002 * k, 0xffe8a0); ball(a, a.glowA, pts[5], .04, 0xfff8d0); }
    ball(a, a.glowA, a.add(a.surf(.1, 0, 0), [0, .1, 0]), .05, 0xffffff);
  };
  // Sunken Star: big five-point star on each flank
  B['grotto-sunken-star'] = function (a) {
    [1, -1].forEach(function (s) {
      var c = a.side(.5, s, 1.35, .02), R = .3, r = .12, pts = [];
      for (var i = 0; i < 10; i++) { var an = i / 10 * a.TAU + .3, rr = i & 1 ? r : R; pts.push(a.add(c, [Math.cos(an) * rr, Math.sin(an) * rr, 0])); }
      for (var j = 0; j < 10; j++) a.glowA.tri(a.add(c, [0, 0, s * .01]), pts[j], pts[(j + 1) % 10], 0xffe060, j & 1 ? 0xff9a40 : 0x3a6ad0, j & 1 ? 0x3a6ad0 : 0xff9a40);
    });
  };
  // Cavernheart: crystal geode cluster on a dark body with violet veins
  B['grotto-cavernheart'] = function (a) {
    for (var i = 0; i < 7; i++) { var th = (i - 3) * .35, u = .35 + (i % 3) * .1, p = a.surf(u, th, 0); a.glowA.geo(a.P.cone6, a.Mdir(a.add(p, [0, -.03, 0]), a.norm([-.2, Math.cos(th), Math.sin(th)]), [.06, .24 + .08 * (i % 2), .06]), function (x, y) { return y > .6 ? 0xe8c8ff : 0x9050e0; }); }
    for (var k = 0; k < 3; k++) { var pts = []; for (var j = 0; j <= 5; j++) pts.push(a.side(.25 + j * .1, k & 1 ? 1 : -1, .6 + k * .35 + Math.sin(j) * .1, .01)); rib(a, a.glowA, pts, .01, 0xc890ff); }
  };
  // Hollow Oracle: big glowing eye sigil on each flank + ring
  B['grotto-hollow-oracle'] = function (a) {
    [1, -1].forEach(function (s) {
      var c = a.side(.45, s, 1.3, .02);
      a.glowA.geo(a.P.sph, a.M(c, null, [.14, .09, .02]), 0xffffff);
      a.glowA.geo(a.P.sph, a.M(a.add(c, [0, 0, s * .012]), null, [.06, .06, .02]), 0x4a5ae0);
    });
    var ring = [], hp = a.add(a.top(.5), [0, .3, 0]); for (var i = 0; i <= 14; i++) { var an = i / 14 * a.TAU; ring.push(a.add(hp, [Math.cos(an) * .2, Math.sin(an) * .03, Math.sin(an) * .2])); }
    rib(a, a.glowA, ring, .012, 0xd0e0ff);
  };

  Object.keys(B).forEach(function (id) { X.B[id] = B[id]; });
  (window.FWFISH || []).forEach(function (f) {
    var p = L[f.id]; if (p) for (var k in p) f.look[k] = p[k];
    if (B[f.id]) f.look.cx = f.id;
  });
})();
