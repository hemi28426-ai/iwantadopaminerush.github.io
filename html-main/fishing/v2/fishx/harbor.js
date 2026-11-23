// Fishing Unblocked v2 - per-species look overrides + custom geometry for the 'harbor' group.
// L[id] = look patch (merged into the fish's look). B[id] = function(api){...} adds custom geometry (see fishx/README.md).
(function () {
  var X = window.FFISHX = window.FFISHX || { B: {}, L: {} };
  var L = {}, B = {};

  // ---- add entries below ----
  function nubs(a, u0, u1, n, ths, r, col, h) {
    for (var i = 0; i < n; i++) { var u = u0 + (u1 - u0) * i / Math.max(1, n - 1); ths.forEach(function (t, j) {
      var uu = u + ((i + j) % 2 ? .012 : -.01), p = a.surf(uu, t, 0), nn = a.nrm(uu, t), rr = r * (.7 + .5 * ((i * 7 + j * 3) % 5) / 5);
      a.solid.geo(a.P.oct, a.M([p[0] + nn[0] * rr * .3, p[1] + nn[1] * rr * .3, p[2] + nn[2] * rr * .3], null, [rr, rr * (h || .8), rr]), col); }); }
  }
  function ridge(a, u0, u1, n, hh, col, tip, w) {
    var b = [], t = [];
    for (var i = 0; i <= n; i++) { var s = i / n, u = u0 + (u1 - u0) * s, p = a.top(u), h = hh * (w ? w(s, i) : Math.sin(Math.PI * s) * .8 + .2); b.push([p[0], p[1] - .01, p[2]]); t.push([p[0] - .04 * s, p[1] + h, p[2]]); }
    a.strip(a.fins, b, t, col, tip, .9);
  }
  function stalk(a, p, h, r, col) { a.solid.geo(a.P.cyl, a.M([p[0], p[1] + h / 2 - .01, p[2]], null, [r, h, r]), col); }
  function ring(a, u, r, col) { for (var i = 0; i < 7; i++) { var t = i / 7 * Math.PI * 2, p = a.surf(u, t, 0), n = a.nrm(u, t); a.solid.geo(a.P.oct, a.M([p[0] + n[0] * r * .2, p[1] + n[1] * r * .2, p[2] + n[2] * r * .2], null, [r, r, r]), col); } }
  function dots(a, u0, u1, n, th, r, col, buf) { for (var i = 0; i < n; i++) { var u = u0 + (u1 - u0) * i / (n - 1); [1, -1].forEach(function (s) { (buf || a.solid).geo(a.P.oct, a.M(a.side(u, s, th, -.004), null, [r, r, r]), col); }); } }
  function box(a, p, s, col, rot) { a.solid.geo(a.P.box, a.M(p, rot || [0, 0, 0], s), col); }
  var UP = [0, 1, 0];

  // Pierling: barnacle crust on a silver piling-fish
  L['harbor-pierling'] = { c: 0x7e8f9e, pc: 0xb4c0c8 };
  B['harbor-pierling'] = function (a) {
    nubs(a, .3, .72, 6, [.5, 1.1, 2.2, 5.2], .028, 0xd8d4c4, .9);
    nubs(a, .35, .6, 3, [.3, 6.0], .02, 0xefeadc, 1);
    ridge(a, .3, .62, 6, .07, 0x6b7a88, 0x95a4b2);
  };
  // Tarnfin: iron-grey, rivets and a tall rusty sail
  L['harbor-tarnfin'] = { c: 0x4a5a66, pc: 0x2a343c, f: 0x7a4a30, L: 0.95 };
  B['harbor-tarnfin'] = function (a) {
    ridge(a, .28, .66, 8, .2, 0x8a5636, 0xc8854a, function (s) { return Math.sin(Math.PI * Math.pow(s, .7)) * .9 + .1; });
    dots(a, .25, .62, 5, 1.4, .014, 0xb0705a);
    a.fins.tri(a.bot(.5), a.add(a.bot(.55), [-.04, -.12, 0]), a.bot(.6), 0x7a4a30);
  };
  // Rope Eel: twisted hemp coils, frayed tail tuft
  L['harbor-ropeeel'] = { pat: 'bands', pc: 0x6a5834, c: 0x9a8760 };
  B['harbor-ropeeel'] = function (a) {
    for (var i = 0; i < 7; i++) ring(a, .12 + i * .12, .026, i % 2 ? 0xb8a374 : 0x7a6a44);
    for (var j = 0; j < 4; j++) { var p = a.surf(.995, j * 1.57, 0); a.fins.tri(p, a.add(p, [-.09, .05 * (j - 1.5), .03 * (j % 2 ? 1 : -1)]), a.add(p, [-.1, -.02, .02 * (j - 1.5)]), 0xc8b98a); }
  };
  // Buoyfish: marker buoy mast with ring and lamp
  B['harbor-buoyfish'] = function (a) {
    var p = a.top(.45); stalk(a, p, .17, .012, 0xe8e8e8);
    a.solid.geo(a.P.sphS, a.M([p[0], p[1] + .19, p[2]], null, [.04, .04, .04]), 0xffffff);
    a.glowA.geo(a.P.sphS, a.M([p[0], p[1] + .19, p[2]], null, [.03, .03, .03]), 0xffe27a);
    a.fins.tri([p[0], p[1] + .17, p[2]], [p[0] - .09, p[1] + .13, p[2]], [p[0], p[1] + .09, p[2]], 0xd24a3a);
    a.fins.tri([p[0], p[1] + .17, p[2]], [p[0], p[1] + .09, p[2]], [p[0] - .09, p[1] + .13, p[2]], 0xd24a3a);
    ring(a, .5, .02, 0xffffff);
  };
  // Silverlamp: a glowing street-lamp lure plus photophore row
  L['harbor-silverlamp'] = { H: 1.1 };
  B['harbor-silverlamp'] = function (a) {
    var p = a.top(.3); stalk(a, p, .1, .01, 0x9fb4c6);
    box(a, [p[0], p[1] + .12, p[2]], [.05, .06, .05], 0xdde8f0);
    a.glowA.geo(a.P.sphS, a.M([p[0], p[1] + .12, p[2]], null, [.04, .045, .04]), 0xcce4ff);
    dots(a, .3, .8, 8, 2.3, .013, 0xeaf6ff, a.glowA);
    ridge(a, .45, .7, 4, .05, 0x9fb4c6, 0xdfeaf4);
  };
  // Bargeback: broad plated deck with cargo hatch ribs
  L['harbor-bargeback'] = { c: 0x5c6b50 };
  B['harbor-bargeback'] = function (a) {
    for (var i = 0; i < 7; i++) { var u = .2 + i * .09, p = a.top(u); box(a, [p[0], p[1] + .008, p[2]], [.07, .022, .17], i % 2 ? 0x6e7e60 : 0x4a5840); }
    box(a, a.add(a.top(.45), [0, .04, 0]), [.11, .05, .1], 0x7a6a4a);
    [1, -1].forEach(function (s) { for (var i = 0; i < 4; i++) box(a, a.side(.3 + i * .12, s, 1.2, -.004), [.05, .035, .02], 0x8a8a6a); });
  };
  // Gull Ray: white gull body, black wing tips, tail streamer
  L['harbor-gullray'] = { pc: 0x3a4450 };
  B['harbor-gullray'] = function (a) {
    [1, -1].forEach(function (s) {
      var p = a.side(.5, s, 1.5), q = a.side(.62, s, 1.5);
      a.fins.tri(a.add(p, [.05, .02, s * .1]), a.add(p, [-.03, .02, s * .32]), a.add(q, [-.05, .02, s * .08]), 0x2a3038);
      a.fins.tri(a.add(p, [.05, .02, s * .1]), a.add(q, [-.05, .02, s * .08]), a.add(p, [-.03, .02, s * .32]), 0x2a3038);
    });
    [1, -1].forEach(function (s) {
      var p = a.side(.4, s, 1.5), q = a.side(.62, s, 1.5);
      a.fins.tri(a.add(p, [0, .02, 0]), a.add(p, [-.1, .1, s * .55]), a.add(q, [0, .02, 0]), 0xf4f6f8, 0x2a3038);
      a.fins.tri(a.add(p, [0, .02, 0]), a.add(q, [0, .02, 0]), a.add(p, [-.1, .1, s * .55]), 0xf4f6f8, 0x2a3038);
    });
    ridge(a, .3, .5, 3, .05, 0xe4e8ec, 0xffffff);
    var t = a.surf(.98, 0, 0), b = [], c = [];
    for (var i = 0; i <= 5; i++) { b.push([t[0] - i * .07, t[1] - .01, t[2] - .012]); c.push([t[0] - i * .07, t[1] - .01, t[2] + .012]); }
    a.strip(a.fins, b, c, 0xc4ccd4, 0x8a96a2, .9);
  };
  // Lantern Roach: golden lantern dangling on a stalk
  B['harbor-lanternroach'] = function (a) {
    var p = a.top(.28); stalk(a, p, .1, .009, 0xc08a28);
    var c = [p[0] + .03, p[1] + .12, p[2]];
    box(a, c, [.045, .06, .045], 0xffe49a);
    a.glowA.geo(a.P.sphS, a.M(c, null, [.045, .05, .045]), 0xffd060);
    a.solid.geo(a.P.oct, a.M([c[0], c[1] + .05, c[2]], null, [.04, .02, .04]), 0x7a5a1a);
    dots(a, .3, .75, 5, 1.3, .016, 0xfff2a0, a.glowA);
  };
  // Mudscale Carp: mossy silt crust, barbels hang from chin area
  L['harbor-mudscale'] = { pc: 0x8e8a58, W: 1.1 };
  B['harbor-mudscale'] = function (a) {
    nubs(a, .25, .75, 7, [.3, 1.0, 5.4, 6.0], .034, 0x5a7a38, .5);
    ridge(a, .25, .75, 8, .13, 0x585530, 0x8e8a58);
    [1, -1].forEach(function (s) { var p = a.side(.12, s, 2.3); a.fins.tri(p, a.add(p, [.07, -.1, s * .02]), a.add(p, [.02, -.01, s * .03]), 0x4a4a28); });
  };
  // Reedglass: glassy body sprouting reed blades
  L['harbor-reedglass'] = { o: 0.55 };
  B['harbor-reedglass'] = function (a) {
    for (var i = 0; i < 5; i++) { var p = a.top(.3 + i * .1), h = .3 + .08 * (i % 3), lean = (i % 2 ? 1 : -1) * .06, c = i % 2 ? 0x2f9a58 : 0x58d088,
        A = [p[0], p[1] - .005, p[2] - .016], B2 = [p[0], p[1] - .005, p[2] + .016], T = [p[0] - .03 + lean, p[1] + h, p[2]];
      a.fins.tri(A, B2, T, c); a.fins.tri(B2, A, T, c); }
    dots(a, .3, .7, 4, 1.0, .01, 0x3a8a6a);
  };
  // Brine Bream: tall spiny dorsal, salt-crust belly nubs
  L['harbor-brinebream'] = { c: 0x3e6a8a, pc: 0x1e3c58, H: 1.25 };
  B['harbor-brinebream'] = function (a) {
    for (var i = 0; i < 6; i++) { var p = a.top(.25 + i * .07), h = .2 - .018 * i; a.fins.tri([p[0] + .02, p[1] - .01, p[2]], [p[0] - .02, p[1] - .01, p[2]], [p[0] - .05, p[1] + h, p[2]], 0x1e3c58); }
    ridge(a, .27, .62, 6, .13, 0x2c5070, 0x6a9ac0);
    nubs(a, .35, .7, 4, [3.3, 2.9], .02, 0xe8f0f4, .7);
  };
  // Wickeljack: rope-wound brawler
  L['harbor-wickeljack'] = { c: 0x7a5a3a, pat: 'spots', pc: 0x3e2c1a };
  B['harbor-wickeljack'] = function (a) {
    for (var i = 0; i < 5; i++) ring(a, .28 + i * .1, .04, i % 2 ? 0xc8a874 : 0x9a7a4a);
    var p = a.top(.2); a.solid.geo(a.P.oct, a.M([p[0], p[1] + .03, p[2]], null, [.05, .05, .05]), 0x3e2c1a);
  };
  // Foghorn Eel: brass horn flared on the head, side vents
  B['harbor-foghorn'] = function (a) {
    var p = a.top(.72);
    a.solid.geo(a.P.cyl, a.M([p[0] + .05, p[1] + .1, p[2]], [0, 0, -.7], [.045, .26, .045]), 0xb08a42);
    a.solid.geo(a.P.cyl, a.M([p[0] + .17, p[1] + .2, p[2]], [0, 0, -.7], [.11, .08, .11]), 0xe0bc5e);
    a.glowA.geo(a.P.sphS, a.M([p[0] + .19, p[1] + .22, p[2]], null, [.05, .05, .05]), 0xffd878);
    ring(a, .3, .022, 0x8a9aaa); ring(a, .5, .02, 0x8a9aaa);
    ridge(a, .18, .65, 8, .05, 0x44525e, 0x8a9aaa);
  };
  // Old Tollkeeper: gold coins on flanks and a toll-gate bar crown
  B['harbor-oldtollkeeper'] = function (a) {
    [1, -1].forEach(function (s) { for (var i = 0; i < 5; i++) { var p = a.side(.3 + i * .09, s, 1.35 + (i % 2) * .5, 0);
      a.solid.geo(a.P.cyl, a.M([p[0], p[1], p[2] + s * .005], [Math.PI / 2, 0, 0], [.04, .012, .04]), i % 2 ? 0xe8c25a : 0xc8a03a); } });
    var p = a.top(.4);
    box(a, [p[0], p[1] + .07, p[2]], [.03, .12, .03], 0xb0b0a0);
    box(a, [p[0], p[1] + .12, p[2]], [.03, .025, .22], 0xd8c05a);
    box(a, [p[0] - .13, p[1] + .12, p[2]], [.03, .025, .22], 0xd8c05a);
  };
  // Wreckwhale Pup: ship ribs, snapped mast, barnacles
  B['harbor-wreckwhale'] = function (a) {
    var p = a.top(.4); stalk(a, p, .3, .02, 0x5a4a38);
    box(a, [p[0] + .0, p[1] + .22, p[2]], [.03, .02, .22], 0x6a5a44, [0, 0, .2]);
    a.fins.tri([p[0], p[1] + .3, p[2]], [p[0] - .12, p[1] + .2, p[2]], [p[0], p[1] + .14, p[2]], 0x8a8a7a);
    a.fins.tri([p[0], p[1] + .3, p[2]], [p[0], p[1] + .14, p[2]], [p[0] - .12, p[1] + .2, p[2]], 0x8a8a7a);
    for (var i = 0; i < 5; i++) { var q = a.top(.55 + i * .07); box(a, [q[0], q[1] + .01, q[2]], [.02, .04, .2], 0x5a4a38, [0, 0, 0]); }
    nubs(a, .2, .6, 6, [1.0, 5.3, 2.0], .03, 0xd0ccb8, .8);
  };
  // Beacon Koi: lighthouse beam on its crown
  B['harbor-beaconkoi'] = function (a) {
    var p = a.top(.3); stalk(a, p, .09, .012, 0xffd890);
    a.glowA.geo(a.P.sphS, a.M([p[0], p[1] + .12, p[2]], null, [.04, .04, .04]), 0xffe8a0);
    for (var i = 0; i < 6; i++) { var t = i / 6 * Math.PI * 2; a.fins.tri([p[0], p[1] + .12, p[2]], [p[0] + Math.cos(t) * .1, p[1] + .12 + Math.sin(t) * .1, p[2]], [p[0] + Math.cos(t + .15) * .09, p[1] + .12 + Math.sin(t + .15) * .09, p[2]], 0xfff0b0); }
    dots(a, .3, .75, 5, 1.2, .018, 0xe84a2a);
  };
  // The Ledgerfish: gilt ledger pages fanned on the flanks, book spine along the back
  B['harbor-ledgerfish'] = function (a) {
    [1, -1].forEach(function (s) { for (var i = 0; i < 4; i++) { var p = a.side(.3 + i * .1, s, 1.3, 0);
      box(a, [p[0], p[1], p[2] + s * .012], [.07, .08, .008], i % 2 ? 0xd4b25a : 0xe8d9a0, [0, 0, .1 * (i - 1.5)]); } });
    for (var i = 0; i < 7; i++) { var q = a.top(.25 + i * .07); box(a, [q[0], q[1] + .012, q[2]], [.05, .03, .1], 0x2a2a40); a.glowA.geo(a.P.box, a.M([q[0], q[1] + .03, q[2]], null, [.03, .006, .08]), 0xd4b25a); }
  };

  Object.keys(B).forEach(function (id) { X.B[id] = B[id]; });
  (window.FWFISH || []).forEach(function (f) {
    var p = L[f.id]; if (p) for (var k in p) f.look[k] = p[k];
    if (B[f.id]) f.look.cx = f.id;
  });
})();
