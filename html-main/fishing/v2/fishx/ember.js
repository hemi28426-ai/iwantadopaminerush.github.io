// Fishing Unblocked v2 - per-species look overrides + custom geometry for the 'ember' group.
// L[id] = look patch (merged into the fish's look). B[id] = function(api){...} adds custom geometry (see fishx/README.md).
(function () {
  var X = window.FFISHX = window.FFISHX || { B: {}, L: {} };
  var L = {}, B = {};

  // ---- add entries below ----

  // helper: spike cone anchored on the body surface, pointing along the surface normal (+ optional back-lean)
  function sp(a, buf, u, th, h, w, col, lean, P6) {
    var p = a.surf(u, th), n = a.nrm(u, th), d = a.norm([n[0] + (lean || 0), n[1], n[2]]);
    var s = a.sub ? 0 : 0; void s;
    var q = [p[0] - d[0] * .03, p[1] - d[1] * .03, p[2] - d[2] * .03];
    buf.geo(P6 ? a.P.cone6 : a.P.cone4, a.Mdir(q, d, [w, h, w]), typeof col === 'function' ? col : function (x, y) { return y > .6 ? a.mix(col, 0xffffff, .3) : col; });
  }
  function ridge(a, buf, u0, u1, n, th, h, w, col, lean) { for (var i = 0; i < n; i++) { var t = n > 1 ? i / (n - 1) : 0; sp(a, buf, u0 + (u1 - u0) * t, th, h * (1 - .35 * Math.abs(t - .4)), w, col, lean); } }
  function tip(c, g) { return function (x, y) { return y > .55 ? g : c; }; }

  L['ember-ashfin'] = { c: 0x7a7a80, pat: 'spots', pc: 0x2c2c30, H: 0.85 };
  B['ember-ashfin'] = function (a) { // flaky ash crest + glowing ember specks on the back
    ridge(a, a.solid, .3, .62, 4, 0, .1, .035, 0x56565c, .5);
    [.35, .5, .62].forEach(function (u, i) { sp(a, a.glowA, u, .5 + i * .2, .04, .025, 0xff8a40, 0, 1); });
  };

  L['ember-steamling'] = { c: 0xf0dcc8, pat: 'gradient', pc: 0xffffff, H: 1.05 };
  B['ember-steamling'] = function (a) { // billowing steam puffs rising off the back
    [[.32, .1], [.46, .15], [.6, .1]].forEach(function (q, i) {
      var p = a.top(q[0]);
      a.solid.geo(a.P.sph, a.M([p[0], p[1] + q[1] * .6, p[2]], null, [q[1], q[1] * .8, q[1]]), 0xfff6ee);
      a.solid.geo(a.P.sph, a.M([p[0] - .02, p[1] + q[1] * 1.5, p[2]], null, [q[1] * .6, q[1] * .55, q[1] * .6]), 0xffffff);
    });
  };

  L['ember-basaltbarb'] = { c: 0x34343e, pat: 'scales', pc: 0x58586a, x: [] };
  B['ember-basaltbarb'] = function (a) { // hexagonal basalt columns, stepped heights, along back and flanks
    [.28, .38, .48, .58, .68].forEach(function (u, i) {
      var h = [.1, .16, .2, .15, .1][i];
      sp(a, a.solid, u, 0, h, .06, tip(0x2a2a34, 0x6a6a7c), 0, 1);
      sp(a, a.solid, u + .03, .55, h * .6, .045, 0x3a3a46, 0, 1);
      sp(a, a.solid, u + .03, 6.28 - .55, h * .6, .045, 0x3a3a46, 0, 1);
    });
  };

  L['ember-cinderperch'] = { c: 0xd8502a, pat: 'stripes', pc: 0x3a1610, H: 1.15 };
  B['ember-cinderperch'] = function (a) { // spiny perch dorsal with glowing tips
    ridge(a, a.solid, .26, .66, 7, 0, .24, .028, tip(0x982a14, 0xff9a50), .6);
    ridge(a, a.glowA, .3, .62, 5, 0, .06, .02, 0xffb060, .6);
  };

  L['ember-obsidianback'] = { c: 0x0e0e16, b: 0x34343f, pat: 'bands', pc: 0x8a2a2a, x: ['armor'] };
  B['ember-obsidianback'] = function (a) { // jagged glassy shards, red glow at the cracks
    [[.3, 0, .34, .5], [.42, 0, .5, .2], [.54, 0, .42, -.2], [.64, 0, .3, -.5], [.36, .7, .26, .3], [.5, .8, .3, 0], [.36, 5.58, .26, .3], [.5, 5.48, .3, 0], [.46, 3.14, .22, 0]].forEach(function (s) {
      sp(a, a.solid, s[0], s[1], s[2], .07, tip(0x14141e, 0x6a6a86), s[3]);
      sp(a, a.glowA, s[0], s[1], s[2] * .45, .03, 0xff3a20, s[3]);
    });
  };

  L['ember-magmaray'] = { c: 0x4a1c12, pat: 'spots', pc: 0xff8a30, L: 1.35, W: 1.2 };
  B['ember-magmaray'] = function (a) { // lava cracks (glow bars) over the wing, long whip tail
    var r = a.rng;
    for (var i = 0; i < 7; i++) { var u = .3 + r() * .3, th = (r() - .5) * 1.3, p = a.surf(u, th);
      a.glowA.geo(a.P.box, a.M([p[0], p[1] + .012, p[2]], [0, r() * 3, 0], [.12, .012, .018]), 0xff7a28); }
    var t = a.surf(.97, 0);
    a.solid.geo(a.P.cone4, a.Mdir([t[0], t[1], t[2]], [1, 0, 0], [.03, .5, .03]), tip(0x3a140c, 0xff7a28));
    sp(a, a.solid, .8, 0, .12, .03, 0x2a0e08, .8);
  };

  L['ember-sulfurdart'] = { c: 0xe8d838, pat: 'stripes', pc: 0x7a7010, H: 0.8, L: 1.2 };
  B['ember-sulfurdart'] = function (a) { // needle dorsal spike + yellow sulfur crystal clusters
    sp(a, a.solid, .36, 0, .38, .02, 0xb8a818, .9);
    ridge(a, a.solid, .45, .62, 3, 0, .1, .05, tip(0xf4e860, 0xffffc0), .3);
    sp(a, a.solid, .45, 3.14, .1, .04, 0xd8c828, -.2);
  };

  L['ember-lavasnapper'] = { c: 0xff5a20, pat: 'scales', pc: 0xffc040, x: [] };
  B['ember-lavasnapper'] = function (a) { // tall sail of flame fin, broad flame lobes
    var n = 8;
    for (var i = 0; i < n; i++) { var u0 = .26 + i * .05, u1 = u0 + .05, p0 = a.top(u0), p1 = a.top(u1), h = .3 * (1 - Math.abs(i - 3) / 5) + .05, m = [(p0[0] + p1[0]) / 2 + .1, (p0[1] + p1[1]) / 2 + h, 0];
      a.fins.tri(p0, p1, m, 0xffa030); a.fins.tri(p1, p0, m, 0xffa030);
      a.glowA.geo(a.P.cone4, a.Mdir(p0, [.25, 1, 0], [.03, h * 1.1, .03]), tip(0xff5a20, 0xffe070)); }
    sp(a, a.glowA, .6, 3.14, .12, .035, 0xff8a30, 0.5);
  };

  L['ember-forgeeel'] = { c: 0x3a1c0c, pat: 'bands', pc: 0xff8a18, b: 0xffd890 };
  B['ember-forgeeel'] = function (a) { // glowing anvil-hot rings & a ridge of hammered plates
    [.2, .32, .44, .56, .68, .8].forEach(function (u, i) {
      var p = a.top(u), q = a.bot(u);
      a.glowA.geo(a.P.box, a.M([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, 0], null, [.012, Math.abs(p[1] - q[1]) * .5 + .012, a.surf(u, 1.57)[2] * 1.08 + .01]), 0xff7a10);
      sp(a, a.solid, u, 0, .14, .05, tip(0x2a1008, 0xff9030), .4);
    });
  };

  L['ember-kilnshark'] = { c: 0x6a3a30, pat: 'gradient', pc: 0xff7a30, x: ['sail'] };
  B['ember-kilnshark'] = function (a) { // brick kiln stacks venting embers on the back
    [.17, .27].forEach(function (u, i) {
      var p = a.top(u), h = .3 - i * .05;
      a.solid.geo(a.P.cone6, a.M([p[0], p[1] - .03, p[2]], null, [.07, h, .07]), function (x, y) { return y > .85 ? 0x3a2018 : 0x9a4a32; });
      a.glowA.geo(a.P.sph, a.M([p[0], p[1] - .03 + h, p[2]], null, [.04, .02, .04]), 0xff8a30);
      a.solid.geo(a.P.sph, a.M([p[0] + .03, p[1] + h + .05, p[2]], null, [.05, .04, .05]), 0x6a6460);
    });
  };

  L['ember-calderaling'] = { c: 0xb82c20, pat: 'spots', pc: 0xffd860 };
  B['ember-calderaling'] = function (a) { // crater rim ringing the mantle, lava glow inside
    for (var i = 0; i < 8; i++) { var th = i / 8 * 6.283; sp(a, a.solid, .62, th, .12, .045, tip(0x7a1812, 0xff9040), -.3); }
    var p = a.top(.7);
    a.glowA.geo(a.P.sph, a.M([p[0], p[1] - .02, p[2]], null, [.07, .03, .07]), 0xffc050);
  };

  L['ember-phoenix-gar'] = { c: 0xff6a20, pat: 'scales', pc: 0xfff090, x: ['wings'] };
  B['ember-phoenix-gar'] = function (a) { // head crest plumes and long firebird tail feathers
    var cr = a.top(.12);
    [-.5, 0, .5].forEach(function (z, i) {
      a.glowA.geo(a.P.cone4, a.Mdir([cr[0], cr[1] - .02, z * .06], [.7, 1, z * .6], [.03, .28 - Math.abs(z) * .15, .03]), tip(0xff7a20, 0xffe060)); });
    [-.4, -.15, .15, .4].forEach(function (z) {
      var p = a.surf(.95, 0);
      a.fins.tri([p[0], p[1] - .02, 0], [p[0] + .05, p[1] + .04, 0], [p[0] + .65, p[1] + .1 + z * .5, z * .9], 0xffc030);
      a.fins.tri([p[0] + .05, p[1] + .04, 0], [p[0], p[1] - .02, 0], [p[0] + .65, p[1] + .1 + z * .5, z * .9], 0xffc030);
    });
    ridge(a, a.glowA, .3, .8, 6, 0, .12, .03, tip(0xff8a20, 0xfff090), .8);
  };

  L['ember-magmawyrm'] = { c: 0x24100c, pat: 'bands', pc: 0xff5a18 };
  B['ember-magmawyrm'] = function (a) { // horned head and a wall of lava-vein spines down the whole back
    ridge(a, a.solid, .15, .9, 14, 0, .26, .07, tip(0x1a0806, 0xff5a18), .6);
    ridge(a, a.glowA, .2, .88, 10, 0, .08, .03, 0xffa040, .6);
    sp(a, a.solid, .1, .7, .3, .05, 0x2a0e0a, -.9); sp(a, a.solid, .1, 6.28 - .7, .3, .05, 0x2a0e0a, -.9);
  };

  L['ember-suncore'] = { c: 0xffe878, pat: 'gradient', pc: 0xff8a28, x: ['gems'] };
  B['ember-suncore'] = function (a) { // sun-ray corona of glowing points all round the body
    for (var i = 0; i < 12; i++) { var th = i / 12 * 6.283; sp(a, a.glowA, .5, th, .26, .05, tip(0xffb838, 0xffffd0), 0, 1); }
    for (var j = 0; j < 8; j++) { var t2 = (j + .5) / 8 * 6.283; sp(a, a.glowA, .38, t2, .16, .04, tip(0xffc848, 0xffffff), -.4, 1); sp(a, a.glowA, .66, t2, .16, .04, tip(0xffc848, 0xffffff), .4, 1); }
  };

  L['ember-hollowforge'] = { c: 0x160a08, pat: 'bands', pc: 0xff7a20 };
  B['ember-hollowforge'] = function (a) { // anvil: flat slab and horn on top, chimney, glowing hollow
    var p = a.top(.5);
    a.solid.geo(a.P.box, a.M([p[0], p[1] + .03, 0], null, [.28, .04, .2]), 0x3a2a28);
    a.solid.geo(a.P.box, a.M([p[0], p[1] + .08, 0], null, [.12, .07, .1]), 0x4a3a38);
    a.solid.geo(a.P.box, a.M([p[0], p[1] + .15, 0], null, [.4, .05, .17]), function (x, y) { return y > .8 ? 0x7a7078 : 0x4a3a3c; });
    a.solid.geo(a.P.cone6, a.Mdir([p[0] - .2, p[1] + .15, 0], [-1, -.15, 0], [.06, .3, .06]), 0x3a2a28);
    a.solid.geo(a.P.cone6, a.M([p[0] + .18, p[1] + .15, 0], null, [.06, .24, .06]), tip(0x2a1a18, 0xff6a20));
    a.glowA.geo(a.P.sph, a.M([p[0] + .18, p[1] + .39, 0], null, [.045, .025, .045]), 0xffa040);
    ridge(a, a.solid, .3, .7, 3, 3.14, .12, .05, 0x2a1a18, 0);
  };

  Object.keys(B).forEach(function (id) { X.B[id] = B[id]; });
  (window.FWFISH || []).forEach(function (f) {
    var p = L[f.id]; if (p) for (var k in p) f.look[k] = p[k];
    if (B[f.id]) f.look.cx = f.id;
  });
})();
