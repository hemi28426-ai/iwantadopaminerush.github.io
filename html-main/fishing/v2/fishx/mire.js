// Fishing Unblocked v2 - per-species look overrides + custom geometry for the 'mire' group.
// L[id] = look patch (merged into the fish's look). B[id] = function(api){...} adds custom geometry (see fishx/README.md).
(function () {
  var X = window.FFISHX = window.FFISHX || { B: {}, L: {} };
  var L = {}, B = {};

  // ---- add entries below ----

  // helpers
  function out(a, u, th, push) { var p = a.surf(u, th), q = a.surf(u, th, .1); return { p: p, d: a.norm(a.sub(q, p)) }; }
  function cone(a, buf, u, th, len, r, col, lean, sink) { var o = out(a, u, th), d = a.norm([o.d[0] + (lean || 0), o.d[1], o.d[2]]), p = a.add(o.p, [d[0] * -(sink || .02), d[1] * -(sink || .02), d[2] * -(sink || .02)]);
    buf.geo(a.P.cone4, a.Mdir(p, d, [r, len, r]), col); return a.add(p, [d[0] * len, d[1] * len, d[2] * len]); }
  function ball(a, buf, u, th, r, col, lift, sy) { var o = out(a, u, th); buf.geo(a.P.sphS, a.M(a.add(o.p, [o.d[0] * (lift || 0), o.d[1] * (lift || 0), o.d[2] * (lift || 0)]), null, [r, r * (sy || 1), r]), col); }
  function mush(a, u, th, h, r, cap, glow) { var o = out(a, u, th), d = o.d, p = a.add(o.p, [d[0] * -.02, d[1] * -.02, d[2] * -.02]), top = a.add(p, [d[0] * h, d[1] * h, d[2] * h]);
    a.solid.geo(a.P.cone4, a.Mdir(p, d, [r * .3, h, r * .3]), 0xe8dcc0);
    (glow ? a.glowA : a.solid).geo(a.P.dome, a.Mdir(top, d, [r, r * .7, r]), function (x, y) { return y > .6 ? a.mix(cap, 0xffffff, .35) : cap; }); }
  function reed(a, u, th, h, lean, col) { var o = out(a, u, th), d = a.norm([o.d[0] + lean, o.d[1], o.d[2]]), p = a.add(o.p, [d[0] * -.02, d[1] * -.02, d[2] * -.02]);
    a.solid.geo(a.P.cone4, a.Mdir(p, d, [.018, h, .018]), function (x, y) { return y > .6 ? 0x6a4a2a : col; }); }
  function ridge(a, u0, u1, n, hgt, col, tipc) { for (var i = 0; i < n; i++) { var t = i / (n - 1), u = u0 + (u1 - u0) * t, w = (u1 - u0) / (n - 1) * .55;
      var p0 = a.top(u - w), p1 = a.top(u + w), q = a.top(u); a.fins.tri(a.add(p0, [0, -.01, 0]), a.add(p1, [0, -.01, 0]), a.add(q, [-.05, hgt * (1 + .4 * Math.sin(i * 1.7)), 0]), col, col, tipc || col); } }

  // Bog Minnow: tiny, round, dark with a rusty belly and a leaf-shaped tail spot
  L['mire-bogminnow'] = { b: 0xd89a58, H: 1.15, L: 0.75, pat: 'spots', pc: 0xa8b060 };
  B['mire-bogminnow'] = function (a) { ridge(a, .35, .6, 3, .12, 0x44522c, 0xa8b060); cone(a, a.fins, .2, a.PI, .1, .04, 0xd89a58, -.2); };

  // Mangrovekin: tall striped sail, prop-root legs hanging from belly
  L['mire-mangrovekin'] = { c: 0x8a9a58, b: 0xe0d4a0, H: 1.15, pc: 0x3a4220 };
  B['mire-mangrovekin'] = function (a) { ridge(a, .3, .72, 6, .2, 0x4e3c28, 0x8a6a40);
    [.34, .46, .58].forEach(function (u, i) { var e = cone(a, a.solid, u, a.PI, .16, .028, 0x4e3c28, 0, .01); a.solid.geo(a.P.cone4, a.Mdir(e, [i % 2 ? .5 : -.5, -1, 0], [.014, .08, .014]), 0x2e2418); }); };

  // Peatfin: peat-black, huge flowing dorsal and trailing pectoral ribbons
  L['mire-peatfin'] = { c: 0x2a1f19, pc: 0x0e0a08, b: 0x6a5a4c };
  B['mire-peatfin'] = function (a) { var A = a.top(.62), Bp = a.top(.3), Tp = a.add(a.top(.38), [-.22, .38, 0]);
    a.fins.tri(Bp, A, Tp, 0x2c221c, 0x2c221c, 0x6a5240); var m = a.add(a.top(.5), [-.1, .26, 0]); a.fins.tri(a.top(.5), A, m, 0x1c140e, 0x1c140e, 0x4a3828);
    [1, -1].forEach(function (s) { var r = a.side(.4, s, 1.1); a.fins.tri(r, a.side(.5, s, 1.1), a.add(r, [-.3, -.12, s * .14]), 0x2c221c, 0x2c221c, 0x6a5240); }); };

  // Stiltgar: long and slender with thin stilt legs and a narrow dorsal comb
  L['mire-stilt-gar'] = { H: 0.8, pat: 'bands' };
  B['mire-stilt-gar'] = function (a) { ridge(a, .2, .55, 8, .07, 0x6a7a46, 0xc0d080);
    [.35, .45, .6].forEach(function (u) { [1, -1].forEach(function (s) { var p = a.side(u, s, 2.2); a.solid.geo(a.P.cone4, a.Mdir(p, [-.15, -1, s * .3], [.016, .2, .016]), 0x4a5a2c); }); }); };

  // Sporeback: mushrooms on the back
  L['mire-sporeback'] = { x: [] };
  B['mire-sporeback'] = function (a) { [[.3, 0, .15, .1, 0xd878e8], [.45, .35, .2, .13, 0xe8a8f0], [.55, -.4, .12, .09, 0xb858c8], [.65, .2, .16, .1, 0xd878e8], [.4, -.7, .1, .08, 0xf0c8f8], [.7, 0, .09, .07, 0xe8a8f0]].forEach(function (m) { mush(a, m[0], m[1], m[2], m[3], m[4], true); }); };

  // Lilywing: a lily pad hat with a pink bloom, big green-spotted wings
  L['mire-lilywing'] = { L: 1.15, H: 1.5, W: 1.5 };
  B['mire-lilywing'] = function (a) { var p = a.add(a.top(.5), [0, .015, 0]);
    a.solid.geo(a.P.dome, a.M(p, null, [.26, .05, .23]), function (x, y) { return y > .6 ? 0x78b868 : 0x58984c; });
    [0, 1, 2, 3, 4].forEach(function (i) { var t = i / 5 * a.TAU; a.solid.geo(a.P.cone4, a.Mdir(a.add(p, [0, .03, 0]), [Math.cos(t) * .8, 1, Math.sin(t) * .8], [.05, .15, .03]), i % 2 ? 0xf8c0d8 : 0xffe0f0); });
    a.glowA.geo(a.P.sphS, a.M(a.add(p, [0, .05, 0]), null, [.04, .04, .04]), 0xfff0a0); };

  // Murk Eel: weedy fringe along the back, pale leech-like belly spots
  L['mire-murkeel'] = { c: 0x2c3a26 };
  B['mire-murkeel'] = function (a) { ridge(a, .1, .85, 12, .09, 0x384a30, 0x7a9468); for (var i = 0; i < 5; i++) ball(a, a.solid, .2 + i * .14, a.PI * .75, .03, 0xa8c878, 0, .6); };

  // Knotbark Perch: bark knots and a twig on the back
  L['mire-knotbark'] = { c: 0x6a4a2c, pat: 'bands', pc: 0x2e1c10 };
  B['mire-knotbark'] = function (a) { [[.32, .3], [.5, -.4], [.62, .5], [.42, 1.0], [.55, -1.1]].forEach(function (k) { ball(a, a.solid, k[0], k[1], .045, 0x4a3018, -.01, .7); ball(a, a.solid, k[0], k[1], .022, 0x2a180c, .02, .6); });
    var e = cone(a, a.solid, .4, 0, .2, .018, 0x5a3c22, -.5); a.solid.geo(a.P.cone4, a.Mdir(e, [-.5, 1, .4], [.012, .1, .012]), 0x5a3c22); a.solid.geo(a.P.sphS, a.M(a.add(e, [-.05, .09, .04]), null, [.04, .03, .02]), 0x5a8a3c); };

  // Lantern Gill: moth wings in glow, soft antennae
  L['mire-lanternmoth'] = {};
  B['mire-lanternmoth'] = function (a) { [1, -1].forEach(function (s) { var r = a.side(.45, s, .8), r2 = a.side(.62, s, .8), t1 = a.add(r, [.06, .34, s * .34]), t2 = a.add(r2, [-.18, .2, s * .3]);
      a.glowA.tri(r, r2, t1, 0x38b888, 0x38b888, 0xd0fff0); a.glowA.tri(r2, t2, t1, 0x38b888, 0xa0ffe0, 0xd0fff0); a.glowA.tri(r, t1, a.add(r, [.0, -.2, s * .25]), 0x38b888, 0xd0fff0, 0x60ffc8); }); };

  // Rootback Bream: gnarled root ridges and hanging rootlets
  L['mire-rotjaw'] = { H: 1.15 };
  B['mire-rotjaw'] = function (a) { for (var i = 0; i < 5; i++) { var e = cone(a, a.solid, .28 + i * .1, (i % 2 ? .5 : -.5), .16, .04, 0x5a3c1c, -.5, .03); a.solid.geo(a.P.cone4, a.Mdir(e, [-.6, 1, i % 2 ? .6 : -.6], [.025, .1, .025]), 0x3c2810); }
    [.4, .55].forEach(function (u) { cone(a, a.solid, u, a.PI, .12, .025, 0x4c3418, .2); }); };

  // Emberroot Eel: glowing ember knots and root tendril fringe
  L['mire-emberroot'] = {};
  B['mire-emberroot'] = function (a) { for (var i = 0; i < 9; i++) { var u = .1 + i * .09; ball(a, a.glowA, u, 0, .035, i % 2 ? 0xffa040 : 0xff6a20, 0, .8); cone(a, a.solid, u + .04, i % 2 ? .9 : -.9, .08, .02, 0x341c10, 0); } };

  // Hexscale: raised hexagonal sigil plates
  L['mire-hexscale'] = {};
  B['mire-hexscale'] = function (a) { [[.34, .6], [.34, 2.55], [.46, 1.1], [.46, 2.05], [.58, .6], [.58, 2.55], [.7, 1.1], [.46, 0], [.62, 0], [.3, 0]].forEach(function (k) { var o = out(a, k[0], k[1]);
      a.glowA.geo(a.P.cone6, a.Mdir(a.add(o.p, [o.d[0] * -.01, o.d[1] * -.01, o.d[2] * -.01]), o.d, [.06, .03, .06]), function (x, y) { return y > .6 ? 0xe8b0ff : 0x8a40d8; }); }); };

  // Bog Behemoth: moss hump, warty bumps, reeds
  L['mire-bogwhale'] = {};
  B['mire-bogwhale'] = function (a) { for (var i = 0; i < 12; i++) ball(a, a.solid, .25 + (i * .618 % 1) * .5, (i * 2.4) % 2.4 - 1.2, .05 + (i % 3) * .015, i % 2 ? 0x5a6a44 : 0x6a7a3c, -.01, .6);
    [.4, .5, .6].forEach(function (u, i) { reed(a, u, .15 * (i - 1), .26 - i * .03, -.2 + i * .15, 0x7a8a3c); }); ridge(a, .3, .7, 4, .06, 0x6a8a3c, 0x9aaa5c); };

  // Fenwraith: trailing veil of ghost ribbons
  L['mire-fenwraith'] = { c: 0x5ccf9c, b: 0xb8ffd8, f: 0x3a9a78, glow: 0x9affd0, x: ['eye-glow'], o: .9 };
  B['mire-fenwraith'] = function (a) {
    var r0 = a.surf(.04, 0), rim = Math.abs(a.surf(.04, 0)[2]) + Math.abs(a.surf(.04, 0)[0]) || .4, y0 = r0[1], R = a.PI * 2;
    rim *= .88;
    var N = 10, pts = [];
    // tattered shroud: ragged skirt hanging from the rim, long and short tails alternating
    for (var i = 0; i < N; i++) { var t0 = i / N * R, t1 = (i + 1) / N * R, tm = (t0 + t1) / 2, rr = rim * 1.02, long = i % 3 === 0 ? .85 : i % 3 === 1 ? .5 : .65, sway = .12 * Math.sin(i * 2.1);
      var A = [Math.cos(t0) * rr, y0 + .02, Math.sin(t0) * rr], B2 = [Math.cos(t1) * rr, y0 + .02, Math.sin(t1) * rr];
      var m = [Math.cos(tm) * rr * 1.12, y0 - long * .45, Math.sin(tm) * rr * 1.12], tip = [Math.cos(tm) * rr * (1.0 + sway), y0 - long, Math.sin(tm) * rr * (1.0 + sway)];
      var l = [Math.cos(t0) * rr * 1.08, y0 - long * .5 - .04, Math.sin(t0) * rr * 1.08], rg = [Math.cos(t1) * rr * 1.08, y0 - long * .55, Math.sin(t1) * rr * 1.08];
      a.fins.tri(A, B2, m, 0x3a9a78, 0x3a9a78, 0x78d8b0); a.fins.tri(A, m, l, 0x2e8a6a, 0x78d8b0, 0x3a9a78); a.fins.tri(B2, rg, m, 0x2e8a6a, 0x3a9a78, 0x78d8b0);
      a.fins.tri(l, m, tip, 0x3a9a78, 0x78d8b0, 0xc8ffe4); a.fins.tri(m, rg, tip, 0x78d8b0, 0x3a9a78, 0xc8ffe4); }
    // hanging weed/moss strands
    for (var k = 0; k < 3; k++) { var th = k / 3 * R + .3, pp = [];
      for (var j = 0; j <= 5; j++) { var tt = j / 5; pp.push([Math.cos(th) * rim * .55 * (1 - tt * .2) + Math.sin(tt * 5 + k) * .06, y0 - .02 - tt * (1.1 + (k % 2) * .35), Math.sin(th) * rim * .55 * (1 - tt * .2) + Math.cos(tt * 4 + k) * .06]); }
      a.tubeX(a.tubesA, pp, function (t) { return .035 * (1 - t * .7) + .008; }, 3, function (t) { return a.mix(0x3a7a48, 0x7affa0, t); }); }
    // glowing ribs up the hood
    for (var q = 0; q < 4; q++) { var tq = q / 4 * R + .5, rp = [];
      for (var u = .06; u <= .96; u += .2) { var sp = a.surf(u, tq, .02); rp.push(sp); }
      a.tubeX(a.glowA, rp, function (t) { return .02 * (1 - t * .6) + .006; }, 3, function (t) { return a.mix(0x6affc0, 0xe8fff4, t); }); }
    // will-o-wisps: glowing orbs inside the bell and trailing below
    var W = [[0, .12, 0, .13], [.2, .04, .1, .07], [-.18, .22, -.08, .07], [.0, -.5, .0, .09], [.3, -.95, -.1, .07], [-.28, -1.3, .12, .06]];
    W.forEach(function (w, i) { var x = w[0] * rim * 2, y = y0 + w[1], z = w[2] * rim * 2;
      a.glowA.geo(a.P.sphS, a.M([x, y, z], null, [w[3], w[3], w[3]]), 0xf0fff8);
      if (i < 3) a.glowA.geo(a.P.sphS, a.M([x, y, z], null, [w[3] * 1.7, w[3] * 1.7, w[3] * 1.7]), 0x40e8a0); });
  };

  // Amberheart: amber crystals on back and a warm inner ball
  L['mire-amberheart'] = {};
  B['mire-amberheart'] = function (a) { [[.4, 0, .22, -.3], [.55, 0, .3, 0], [.7, 0, .2, .3], [.5, .6, .15, 0], [.5, -.6, .15, 0]].forEach(function (k) { var o = out(a, k[0], k[1]), d = a.norm([k[3], o.d[1], o.d[2]]);
      a.glowA.geo(a.P.cone6, a.Mdir(a.add(o.p, [0, -.02, 0]), d, [.07, k[2], .07]), function (x, y) { return y > .6 ? 0xfff0b0 : 0xe8902c; }); }); };

  // Mycelium Serpent: rows of glowing mushrooms along its length
  L['mire-mycelium-eel'] = {};
  B['mire-mycelium-eel'] = function (a) { for (var i = 0; i < 9; i++) mush(a, .12 + i * .09, (i % 2 ? .5 : -.5), .09 + (i % 3) * .03, .06 + (i % 2) * .02, i % 2 ? 0xff68c8 : 0xe890ff, true); };

  // Saint of the Reeds: a fan of pale reeds behind the head like a halo-robe
  L['mire-swampsaint'] = {};
  B['mire-swampsaint'] = function (a) { for (var i = 0; i < 7; i++) { var t = (i - 3) / 3, o = out(a, .62, a.PI * .0 + t * .9), d = a.norm([-.35, 1, t * .8]), p = a.add(o.p, [0, -.02, 0]);
      a.solid.geo(a.P.cone4, a.Mdir(p, d, [.02, .3 - Math.abs(t) * .08, .02]), function (x, y) { return y > .7 ? 0xffffff : 0xb8d878; }); }
    var q = a.top(.3); a.glowA.geo(a.P.sphS, a.M(a.add(q, [0, .04, 0]), null, [.03, .03, .03]), 0xffffd0); };

  // The Thousand-Eyed: pale eyes all over its hide
  L['mire-thousandeyes'] = {};
  B['mire-thousandeyes'] = function (a) { for (var i = 0; i < 14; i++) { var u = .2 + (i * .618 % 1) * .6, th = (i * 2.399) % a.TAU, o = out(a, u, th), r = .035 + (i % 3) * .012;
      if (a.eyesP && a.nearEye && a.nearEye(o.p, 3.4)) continue;
      a.solid.geo(a.P.sphS, a.M(a.add(o.p, [o.d[0] * .005, o.d[1] * .005, o.d[2] * .005]), null, [r, r, r]), 0xf4eedc);
      a.glowA.geo(a.P.sphT, a.M(a.add(o.p, [o.d[0] * (r * .8), o.d[1] * (r * .8), o.d[2] * (r * .8)]), null, [r * .55, r * .55, r * .55]), 0xffd040); } };

  Object.keys(B).forEach(function (id) { X.B[id] = B[id]; });
  (window.FWFISH || []).forEach(function (f) {
    var p = L[f.id]; if (p) for (var k in p) f.look[k] = p[k];
    if (B[f.id]) f.look.cx = f.id;
  });
})();
