// Fishing Unblocked v2 - per-species look overrides + custom geometry for the 'frost' group.
// L[id] = look patch (merged into the fish's look). B[id] = function(api){...} adds custom geometry (see fishx/README.md).
(function () {
  var X = window.FFISHX = window.FFISHX || { B: {}, L: {} };
  var L = {}, B = {};

  // ---- add entries below ----

  function cone(a, p, d, r, l, c, g) { (g ? a.glowA : a.solid).geo(a.P.cone4, a.Mdir(p, d, [r, l, r]), c); }
  function ctr(a, u) { var c = [0, 0, 0]; for (var i = 0; i < 4; i++) c = a.add(c, a.surf(u, i * a.PI / 2)); return [c[0] / 4, c[1] / 4, c[2] / 4]; }
  function nose(a) { return a.norm(a.sub(ctr(a, 1), ctr(a, .85))); }
  function tip(a) { return ctr(a, .99); }
  function crest(a, n, u0, u1, h, c, g) { for (var i = 0; i < n; i++) { var u = u0 + (u1 - u0) * i / Math.max(1, n - 1), s = h * (1 - .4 * Math.abs(i / Math.max(1, n - 1) - .4)); cone(a, a.top(u), [0, 1, -.15], s * .45, s, c, g); } }
  function gem(a, p, r, c, g) { (g ? a.glowA : a.solid).geo(a.P.oct, a.M(p, null, [r, r * 1.5, r]), c); }
  function ring(a, u, r, c) { for (var s = -1; s <= 1; s += 2) cone(a, a.side(u, s), [0, .3, s], r * .6, r * 1.6, c); }

  // small ice chip: crystal shards
  L['frost-icechip'] = { k: 'disc', H: 1.1, L: .8, tail: 'fan', pat: 'none' };
  B['frost-icechip'] = function (a) { crest(a, 3, .3, .6, .16, 0xe8f8ff); ring(a, .45, .06, 0xdff2ff); cone(a, a.bot(.5), [0, -1, 0], .05, .12, 0xdff2ff); };
  // snowperch: tall spiny dorsal, white speckle
  L['frost-snowperch'] = { H: 1.2, tail: 'fork' };
  B['frost-snowperch'] = function (a) { crest(a, 6, .3, .72, .2, 0xb8ccd8); cone(a, a.bot(.45), [0, -1, .1], .03, .12, 0xb8ccd8); };
  // slate cod: heavy, barbel-free chin ridge, plated back
  L['frost-slatecod'] = { H: 1.15, tail: 'round' };
  B['frost-slatecod'] = function (a) { for (var i = 0; i < 5; i++) { var u = .28 + i * .09; a.solid.geo(a.P.sph, a.M(a.top(u), null, [.07, .035, .09]), 0x3a4854); } ring(a, .35, .05, 0x44525e); };
  // pinesmelt: slim, pine-needle spiky dorsal + stripes
  L['frost-pinesmelt'] = { H: .7, L: 1, pat: 'stripes', tail: 'fork' };
  B['frost-pinesmelt'] = function (a) { crest(a, 8, .25, .75, .15, 0x2f6a40); for (var i = 0; i < 5; i++) cone(a, a.bot(.4 + i * .06), [0, -1, -.3], .02, .12, 0x24402e); };
  // glacierling: big blocky ice slabs along back
  L['frost-glacierling'] = { H: 1.15, W: 1.2, tail: 'round' };
  B['frost-glacierling'] = function (a) { for (var i = 0; i < 4; i++) { var u = .25 + i * .13, h = .2 - i * .03; a.solid.geo(a.P.oct, a.M(a.top(u), [0, i, .2], [.07, h, .06]), 0xe4f8ff); } ring(a, .5, .08, 0xcdeaf8); };
  // hoarfin: huge sugared-glass sail dorsal
  L['frost-hoarfin'] = { H: 1.05, tail: 'fan' };
  B['frost-hoarfin'] = function (a) { var u0 = .25, u1 = .7, pa = a.top(u0), pb = a.top(u1), t1 = a.add(pa, [0, .34, 0]), t2 = a.add(a.top(.5), [0, .5, 0]), t3 = a.add(a.top(.62), [0, .3, 0]);
    a.fins.tri(pa, t1, t2, 0xf4fcff); a.fins.tri(pa, t2, a.top(.5), 0xe0f2fc); a.fins.tri(a.top(.5), t2, t3, 0xf4fcff); a.fins.tri(a.top(.5), t3, pb, 0xc8e4f4);
    var qa = a.bot(.4), qb = a.bot(.62); a.fins.tri(qa, a.add(qa, [-.05, -.2, 0]), qb, 0xe8f6fc); };
  // blizzardback: humped storm-back with swept spikes
  L['frost-blizzardback'] = { H: 1.35, L: 1.05, tail: 'fork' };
  B['frost-blizzardback'] = function (a) { for (var i = 0; i < 5; i++) { var u = .22 + i * .1; cone(a, a.top(u), [.5, 1, 0], .05, .18 - Math.abs(i - 1.5) * .02, 0xffffff); } };
  // cairncarp: stacked stone cairn on back + deep body
  L['frost-keeperscarp'] = { H: 1.3, W: 1.15, tail: 'round' };
  B['frost-keeperscarp'] = function (a) { var p = a.top(.45), r = [.1, .08, .06], h = 0; for (var i = 0; i < 3; i++) { a.solid.geo(a.P.sph, a.M(a.add(p, [0, h + r[i] * .6, 0]), [0, i, 0], [r[i] * 1.2, r[i] * .7, r[i]]), [0x8a9a8a, 0x6c7a6c, 0x9aaa98][i]); h += r[i] * 1.3; }
    ring(a, .35, .05, 0x606e60); };
  // nightsleet: slender dark body, glowing lures along flank & dorsal
  L['frost-nightsleet'] = { H: .85, L: 1.1, tail: 'fork' };
  B['frost-nightsleet'] = function (a) { for (var i = 0; i < 5; i++) { var u = .25 + i * .12; for (var s = -1; s <= 1; s += 2) gem(a, a.side(u, s, 1.2), .016, 0xc8e0ff, true); }
    crest(a, 4, .3, .6, .12, 0x7aa8ff, true); };
  // rime ray: frosted rime spikes on tail + back
  L['frost-rimeray'] = { x: ['frost'], W: 1.5, H: 1.3 };
  B['frost-rimeray'] = function (a) { for (var i = 0; i < 4; i++) cone(a, a.top(.3 + i * .08), [0, 1, -.3], .03, .12, 0xffffff);
    for (var s = -1; s <= 1; s += 2) { var p1 = a.side(.72, s), p2 = a.side(.3, s), lat = a.norm(a.sub(a.side(.5, s), a.side(.5, -s))), w = .38, t = a.add(a.side(.45, s), [lat[0] * w, lat[1] * w, lat[2] * w]), t2 = a.add(a.side(.3, s), [lat[0] * w * .5, lat[1] * w * .5, lat[2] * w * .5]);
      a.fins.tri(p1, t, p2, 0xd8f0fc); a.fins.tri(p2, t, t2, 0xb8dcf0); } };
  // tusk shark: long spiral tusk on snout, dorsal fin
  L['frost-tuskshark'] = { x: ['armor'] };
  B['frost-tuskshark'] = function (a) { var p = tip(a), d = nose(a);
    for (var i = 0; i < 6; i++) { var q = [p[0] + d[0] * i * .08, p[1] + d[1] * i * .08, p[2] + d[2] * i * .08]; a.solid.geo(a.P.cone6, a.Mdir(q, d, [.05 - i * .006, .12, .05 - i * .006]), i & 1 ? 0xf6efda : 0xd8ccaa); }
    crest(a, 3, .35, .5, .2, 0x3a5266); };
  // boreal lancer: very long fish with straight spiral lance
  L['frost-narwhal-king'] = { x: ['frost'] };
  B['frost-narwhal-king'] = function (a) { var p = tip(a), d = nose(a);
    for (var i = 0; i < 6; i++) { var q = [p[0] + d[0] * i * .12, p[1] + d[1] * i * .12, p[2] + d[2] * i * .12], w = .05 * (1 - i * .12); a.solid.geo(a.P.cone6, a.Mdir(q, d, [w, .17, w]), i & 1 ? 0xf6efda : 0xc8d4e0); }
    crest(a, 5, .3, .65, .18, 0x90a8c0); };
  // whitegale wyrm: dragon-ish crest + whiskers, glowing mane
  L['frost-whitegale-wyrm'] = { x: ['frills', 'frost'] };
  B['frost-whitegale-wyrm'] = function (a) { crest(a, 12, .08, .7, .18, 0xb0d0e8); crest(a, 6, .1, .4, .1, 0x9ad0ff, true);
    for (var s = -1; s <= 1; s += 2) for (var k = 0; k < 2; k++) { var q = a.side(.93 - k * .04, s, 1.0), dir = [.5, -.3 - k * .2, s * .8]; for (var j = 0; j < 7; j++) { var d = a.norm([-.6 + j * .05, -.25 + j * .01 - k * .08, s * (.5 - j * .04)]); cone(a, q, d, .022 * (1 - j * .09), .13, 0xdff4ff); q = a.add(q, [d[0] * .12, d[1] * .12, d[2] * .12]); } }
    ring(a, .15, .06, 0xffffff); };
  // crystalis: faceted crystal cluster all over
  L['frost-crystalis'] = {};
  B['frost-crystalis'] = function (a) { for (var i = 0; i < 6; i++) { var u = .22 + i * .1, th = (i % 3 - 1) * .5; cone(a, a.surf(u, th, .0), [0, 1, th * .8], .05, .2 + (i % 2) * .08, 0xe8fcff); }
    cone(a, a.bot(.5), [0, -1, 0], .05, .14, 0xc8f0ff); };
  // frostbound heart: crystalline ice carapace shards
  L['frost-mountainsheart'] = {};
  B['frost-mountainsheart'] = function (a) { for (var i = 0; i < 7; i++) { var th = i / 7 * a.TAU, u = .3 + (i % 3) * .12; cone(a, a.surf(u, th), a.norm(a.nrm(u, th)), .06, .2, 0x70c0ff, true); } };
  // aurora ribbon: flowing glowing ribbon fin
  B['frost-aurora-ribbon'] = function (a) { for (var i = 0; i < 9; i++) { var u = .12 + i * .09, p = a.top(u), q = a.top(u + .09); a.fins.tri(p, a.add(p, [0, .12 + .05 * Math.sin(i), 0]), q, i & 1 ? 0xb878ff : 0x58f0b0); } };
  // polar lancer: lance of light + glowing stripes
  B['frost-aurora-lancer'] = function (a) { var p = tip(a), d = nose(a);
    for (var i = 0; i < 5; i++) { var q = [p[0] + d[0] * i * .12, p[1] + d[1] * i * .12, p[2] + d[2] * i * .12], w = .045 * (1 - i * .13); a.glowA.geo(a.P.cone6, a.Mdir(q, d, [w, .17, w]), i & 1 ? 0x90ffe0 : 0x78c8ff); }
    crest(a, 4, .3, .6, .15, 0xa878f8, true); };
  // aurorawyrm: crown of glowing spines
  B['frost-aurora-wyrm'] = function (a) { crest(a, 14, .06, .8, .2, 0xff80e8, true); ring(a, .2, .06, 0x60ffd8); };

  Object.keys(B).forEach(function (id) { X.B[id] = B[id]; });
  (window.FWFISH || []).forEach(function (f) {
    var p = L[f.id]; if (p) for (var k in p) f.look[k] = p[k];
    if (B[f.id]) f.look.cx = f.id;
  });
})();
