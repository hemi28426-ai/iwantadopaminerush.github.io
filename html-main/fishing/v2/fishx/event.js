// Fishing Unblocked v2 - per-species look overrides + custom geometry for the 'event' group.
// L[id] = look patch (merged into the fish's look). B[id] = function(api){...} adds custom geometry (see fishx/README.md).
(function () {
  var X = window.FFISHX = window.FFISHX || { B: {}, L: {} };
  var L = {}, B = {};

  // ---- add entries below ----

  // helpers
  function cones(a, buf, pts, dirs, w, h, col) { pts.forEach(function (p, i) { buf.geo(a.P.cone4, a.Mdir(p, dirs[i] || dirs[0], [w, h[i] != null ? h[i] : h[0], w]), col); }); }
  function helix(a, buf, u0, u1, turns, off, r, col, n) {
    var pts = [], i, t, p; n = n || 16;
    for (i = 0; i <= n; i++) { t = i / n; p = a.surf(a.lerp3 ? a.lerp3([u0], [u1], t)[0] : u0 + (u1 - u0) * t, (t * turns * a.TAU + off) % a.TAU, .012); pts.push(p); }
    a.tubeX(buf, pts, function () { return r; }, 3, function () { return col; });
  }

  // Stardust Minnow: tiny, fan of starlight spines on the back and a sparkly comet tail-plume
  L['meteor-stardust-minnow'] = { tail: 'fan', H: 1.2, x: ['stars'] };
  B['meteor-stardust-minnow'] = function (a) {
    var i, pts = [], ds = [], hs = [];
    for (i = 0; i < 5; i++) { var u = .3 + i * .1; pts.push(a.top(u)); ds.push(a.norm([-.5 - i * .1, 1, 0])); hs.push(.2 - i * .025); }
    cones(a, a.glowA, pts, ds, .035, hs, 0xd8d0ff);
    for (i = 0; i < 4; i++) a.glowA.geo(a.P.oct, a.M(a.add(a.surf(.9 + i * .03, 0, 0), [-.05 - i * .09, .08 * Math.sin(i * 2), (i % 2 ? .08 : -.08)]), null, [.03, .03, .03]), 0xffffff);
  };

  // Slagfin Skate: molten ridge spine, two obsidian horns, lava seams
  L['meteor-slagfin'] = { W: 1.1, H: 1.6 };
  B['meteor-slagfin'] = function (a) {
    var i;
    for (i = 0; i < 7; i++) { var u = .3 + i * .09, h = .16 - Math.abs(i - 2) * .018; a.solid.geo(a.P.cone4, a.Mdir(a.top(u), [-.3, 1, 0], [.06, h, .06]), i % 2 ? 0x5a3a34 : 0x2a1a18); a.glowA.geo(a.P.cone4, a.Mdir(a.top(u), [-.3, 1, 0], [.025, h * 1.1, .025]), 0xff7a30); }
    [1, -1].forEach(function (s) { a.solid.geo(a.P.cone6, a.Mdir(a.side(.18, s, 1.15), [.7, .7, s * .4], [.05, .3, .05]), 0x1c1210); });
  };

  // Comet Eel: bright comet head halo and a long glowing ion trail of streamers
  L['meteor-comet-eel'] = { x: ['stars'] };
  B['meteor-comet-eel'] = function (a) {
    var s, j;
    a.glowA.geo(a.P.sph, a.M(a.add(a.surf(.04, 0, 0), [.02, -.02, 0]), null, [.1, .1, .1]), 0xffffff);
    [-1, 0, 1].forEach(function (s) {
      var base = [], tip = [];
      for (j = 0; j <= 6; j++) { var t = j / 6, p = a.surf(.12 + t * .7, a.PI / 2 + s * .5, 0); base.push(p); tip.push(a.add(p, [-.05 - .25 * t, .05 + .07 * Math.sin(t * 6) + s * .02, 0])); }
      a.strip(a.glowA, base, tip, 0x7aa0ff, 0xeaf4ff, 1);
    });
    for (j = 0; j < 4; j++) a.glowA.geo(a.P.oct, a.M(a.add(a.top(.82 + j * .04), [-.1 * j, .08, 0]), null, [.03, .03, .03]), 0xffffff);
  };

  // Fallen Sovereign: a heavy jagged shard-crown halo around the dorsal ridge, shard shoulder spikes
  L['meteor-fallen-sovereign'] = { tail: 'fan' };
  B['meteor-fallen-sovereign'] = function (a) {
    var i;
    for (i = 0; i < 7; i++) { var u = .2 + i * .1, h = .24 + .12 * Math.sin(i / 6 * Math.PI); a.solid.geo(a.P.cone4, a.Mdir(a.top(u), [-.15, 1, 0], [.07, h, .07]), 0x4a3a78); a.glowA.geo(a.P.cone4, a.Mdir(a.top(u), [-.15, 1, 0], [.03, h * .9, .03]), 0xffe070); a.glowA.geo(a.P.oct, a.M(a.add(a.top(u), [-.15 * h, h, 0]), null, [.03, .03, .03]), 0xfff6c0); }
    [1, -1].forEach(function (s) { for (i = 0; i < 3; i++) a.solid.geo(a.P.cone4, a.Mdir(a.side(.35 + i * .13, s, 1.1), [-.3, .3, s], [.05, .2, .05]), 0x3a2a60); });
  };

  // Spindlefish: a bright helical ribbon wound around a needle body, spinning fins
  L['whirl-spindle'] = { H: .8, W: .8, L: 1.5 };
  B['whirl-spindle'] = function (a) {
    helix(a, a.solid, .12, .92, 3.5, 0, .028, 0xe8f4ff, 28);
    helix(a, a.solid, .12, .92, 3.5, a.PI, .028, 0x78b8e8, 28);
  };

  // Vortex Ray: a glowing spiral swirl on the back, plus spiral-tipped whip tail
  L['whirl-vortexray'] = { H: 1.7 };
  B['whirl-vortexray'] = function (a) {
    var pts = [], i, c = a.top(.45), n = 22;
    for (i = 0; i <= n; i++) { var t = i / n, ang = t * 3.2 * a.TAU, r = .06 + .5 * t; pts.push([c[0] + Math.cos(ang) * r * .8, c[1] + .02, c[2] + Math.sin(ang) * r * .9]); }
    a.tubeX(a.glowA, pts, function (t) { return .02 - .008 * t; }, 3, function (t) { return t < .5 ? 0xe8ffff : 0x60d0ff; });
  };

  // Maelstrom Colossus: spiral shell whorl crest on the back, rings of whirlpool spikes
  B['whirl-maelstrom-colossus'] = function (a) {
    var pts = [], i, n = 26, c = a.top(.5);
    for (i = 0; i <= n; i++) { var t = i / n, ang = t * 3 * a.TAU, r = .05 + .4 * t; pts.push([c[0] + Math.cos(ang) * r, c[1] + .03 + .05 * t, c[2] + Math.sin(ang) * r * .8]); }
    a.tubeX(a.glowA, pts, function (t) { return .03; }, 4, function (t) { return t < .5 ? 0xb0f0ff : 0x40b8f0; });
    for (i = 0; i < 8; i++) { var t2 = i / 7; a.solid.geo(a.P.cone4, a.Mdir(a.top(.2 + .6 * t2), [-.4, 1, 0], [.09, .25 + .2 * Math.sin(t2 * Math.PI), .09]), 0x16405f); }
    [1, -1].forEach(function (s) { var b = [], t2 = []; for (i = 0; i <= 5; i++) { var t = i / 5; b.push(a.side(.3 + t * .1, s, 1.4)); t2.push(a.add(a.side(.3 + t * .1, s, 1.4), [-.3 * t - .1, -.25 - .3 * Math.sin(t * 3), s * .35])); } a.strip(a.fins, b, t2, 0x0e3556, 0x2a6a98, .8); });
  };

  // Tideglow Bass: tall sail dorsal fan and long streamer pelvic fins, lateral glow dots
  L['surge-tideglow'] = { H: 1.1 };
  B['surge-tideglow'] = function (a) {
    var b = [], t = [], i;
    for (i = 0; i <= 8; i++) { var q = i / 8; b.push(a.top(.28 + q * .4)); t.push(a.add(a.top(.28 + q * .4), [-.08 - .12 * q, .42 * Math.sin(Math.PI * (.15 + q * .8)), 0])); }
    a.strip(a.fins, b, t, 0x20b0a8, 0xa0fff0, .8);
    [1, -1].forEach(function (s) {
      var p = []; for (i = 0; i <= 5; i++) { var q = i / 5; p.push(a.add(a.side(.42, s, 2.1), [-.5 * q, -.1 * q - .1 * Math.sin(q * 3), s * .1 * q])); }
      a.tubeX(a.glowA, p, function (q) { return .03 * (1 - q) + .006; }, 3, function () { return 0x80fff0; });
      for (i = 0; i < 5; i++) a.glowA.geo(a.P.oct, a.M(a.side(.3 + i * .1, s, 1.6, .005), null, [.022, .022, .022]), 0xffffff);
    });
  };

  // Bountyfin: gold coins studding the flank, a big coin on the brow, fat gleaming tail
  B['surge-bountyfin'] = function (a) {
    var i, j;
    [1, -1].forEach(function (s) {
      for (i = 0; i < 6; i++) { var p = a.side(.3 + i * .08, s, 1.3 + .1 * (i % 2)); a.solid.geo(a.P.cyl, a.Mdir(p, [0, 0, s], [.065, .02, .065]), i % 2 ? 0xffe060 : 0xf0b020); }
    });
    for (i = 0; i < 4; i++) a.solid.geo(a.P.cyl, a.Mdir(a.top(.3 + i * .12), [0, 0, 1], [.1, .025, .1]), i % 2 ? 0xffd040 : 0xf0a820);
    a.glowA.geo(a.P.oct, a.M(a.add(a.top(.12), [0, .08, 0]), null, [.05, .05, .05]), 0xfff4b0);
  };

  // Abundance Whale: golden flukes, flippers, a ridge of pearl bumps
  B['surge-abundance'] = function (a) {
    var i;
    [1, -1].forEach(function (s) {
      var b = [], t = [], q;
      for (i = 0; i <= 5; i++) { q = i / 5; b.push(a.side(.34 + q * .12, s, 2.0)); t.push(a.add(a.side(.34 + q * .12, s, 2.0), [-.4 * q - .1, -.3 - .25 * Math.sin(q * 3), s * .6 * Math.sin(Math.PI * (q * .9 + .1)) ])); }
      a.strip(a.fins, b, t, 0xe8c870, 0xfff0c8, .85);
    });
    for (i = 0; i < 5; i++) a.glowA.geo(a.P.sph, a.M(a.top(.25 + i * .1), null, [.07, .07, .07]), i % 2 ? 0xffffff : 0xffe898);
    for (i = 0; i < 0; i++) a.glowA.geo(a.P.sph, a.M(a.side(.55 + i * .08, i % 2 ? 1 : -1, 1.0, .01), null, [.04, .04, .04]), 0xffffff);
  };

  // Crimson Ray: barbed spike rows and two long hook-barbs from the wing tips
  L['blood-crimsonray'] = { H: 1.7 };
  B['blood-crimsonray'] = function (a) {
    var i;
    [1, -1].forEach(function (s) {
      for (i = 0; i < 5; i++) a.solid.geo(a.P.cone4, a.Mdir(a.side(.35 + i * .07, s, 1.1 - i * .03), [-.2, .8, s], [.04, .16, .04]), 0xe05050);
      var p = []; for (i = 0; i <= 5; i++) { var q = i / 5; p.push(a.add(a.side(.4, s, 1.3), [-.1 * q, .1 * q, s * (.05 + .5 * q)])); }
      a.tubeX(a.solid, p, function (q) { return .03 * (1 - q) + .006; }, 3, function () { return 0x6a1010; });
    });
    a.glowA.geo(a.P.sph, a.M(a.top(.35), null, [.05, .05, .05]), 0xff4040);
  };

  // Tideshark Reaver: giant scythe dorsal blade, bladed tail-fin edge, blood stripes of glow
  B['blood-reaver'] = function (a) {
    var b = [], t = [], i;
    for (i = 0; i <= 6; i++) { var q = i / 6; b.push(a.top(.34 + q * .22)); t.push(a.add(a.top(.34 + q * .22), [-.3 * q * q - .1 + .1 * (1 - q), .62 * Math.pow(Math.sin(Math.PI * (.05 + q * .75)), .8) * (q > .7 ? .6 : 1), 0])); }
    a.strip(a.fins, b, t, 0x3a0808, 0xc01818, .8);
    [1, -1].forEach(function (s) {
      var bb = [], tt = [];
      for (i = 0; i <= 4; i++) { var q = i / 4; bb.push(a.side(.34 + q * .1, s, 2.1)); tt.push(a.add(a.side(.34 + q * .1, s, 2.1), [-.5 * q - .1, -.3 * Math.sin(Math.PI * q) - .05, s * .3 * Math.sin(Math.PI * q) ])); }
      a.strip(a.fins, bb, tt, 0x601010, 0xe03030, .85);
    });
  };

  // Bloodmoon Leviathan: a huge glowing blood-moon ring behind the head, horn crown, ridged back
  B['blood-leviathan'] = function (a) {
    var c = a.add(a.top(.4), [-.05, .36, 0]);
    a.glowA.geo(a.P.torusF, a.M(c, [0, 0, 0], [.36, .36, .1]), function (x, y) { return y > 0 ? 0xff3030 : 0xc01010; });
    a.glowA.geo(a.P.sph, a.M(c, null, [.2, .2, .03]), 0x9a1010);
    var i;
    for (i = 0; i < 6; i++) a.solid.geo(a.P.cone4, a.Mdir(a.top(.5 + i * .08), [-.5, 1, 0], [.1, .26 - i * .025, .1]), 0x2a0404);
    [1, -1].forEach(function (s) { a.solid.geo(a.P.cone6, a.Mdir(a.side(.18, s, 1.2), [.4, .9, s * .7], [.06, .4, .06]), 0xe8d8c0); });
  };


  Object.keys(B).forEach(function (id) { X.B[id] = B[id]; });
  (window.FWFISH || []).forEach(function (f) {
    var p = L[f.id]; if (p) for (var k in p) f.look[k] = p[k];
    if (B[f.id]) f.look.cx = f.id;
  });
})();
