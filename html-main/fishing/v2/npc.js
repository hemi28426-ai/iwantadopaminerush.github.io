// Fishing Unblocked v2 — NPC characters + dialog window (contract §6). Classic script, needs THREE (r128).
// window.FN = { make(look), LOOKS, NAMES, ROLES, GREET, place(scene, island, heightAt), nearest(pos, maxDist), mark(id, on),
//               talk(npcId, opts), close(), isOpen(), update(t, dt, playerPos), list }
// Each NPC = at most 3 meshes (body Lambert, head Lambert, glow Basic) sharing 2 materials, <= 800 triangles, plus a name
// label sprite and a '!' marker sprite. Idle animation only transforms groups (done in onBeforeRender, so off-screen NPCs cost 0).
// Model faces +Z at yaw 0 (group.rotation.y = yaw). Height ≈ 3 world units (same as the player avatar).
// Unbloxed mode (?ubx=1: FUX.on and makeChar from unbloxed/avatar.js): FN.make(look, id) builds every NPC as an Unbloxed R6
// character instead (see makeR6 below); same API, placement, labels, markers, dialog. Standalone mode is unchanged.
(function () {
  'use strict';
  const FN = window.FN = window.FN || {};
  const T = THREE;
  let MAT = null, GLOW = null;
  function mats() { if (!MAT) { MAT = new T.MeshLambertMaterial({ vertexColors: true }); MAT.userData.lin = 1; GLOW = new T.MeshBasicMaterial({ vertexColors: true }); GLOW.userData.lin = 1; } }

  // ---------- tiny geometry kit ----------
  const _e = new T.Euler(), _q = new T.Quaternion(), _c = new T.Color(), _up = new T.Vector3(0, 1, 0);
  function M(x, y, z, rx, ry, rz, sx, sy, sz) {
    _e.set(rx || 0, ry || 0, rz || 0); _q.setFromEuler(_e);
    if (sx === undefined) sx = 1; if (sy === undefined) sy = sx; if (sz === undefined) sz = sx;
    return new T.Matrix4().compose(new T.Vector3(x || 0, y || 0, z || 0), _q.clone(), new T.Vector3(sx, sy, sz));
  }
  const G = {
    box: (w, h, d) => new T.BoxGeometry(w, h, d),
    cyl: (rt, rb, h, s, open) => new T.CylinderGeometry(rt, rb, h, s || 8, 1, !!open),
    cone: (r, h, s) => new T.ConeGeometry(r, h, s || 8),
    sph: (r, w, h, ps, pl, ts, tl) => new T.SphereGeometry(r, w || 8, h || 6, ps || 0, pl === undefined ? Math.PI * 2 : pl, ts || 0, tl === undefined ? Math.PI : tl),
    oct: (r) => new T.OctahedronGeometry(r, 0),
    ico: (r) => new T.IcosahedronGeometry(r, 0),
    tor: (r, t, a, b, arc) => new T.TorusGeometry(r, t, Math.min(a || 3, 3), Math.min(b || 8, 8), arc === undefined ? Math.PI * 2 : arc),
    ring: (r1, r2, s) => new T.RingGeometry(r1, r2, s || 8, 1),
    disc: (r, s) => new T.CircleGeometry(r, s || 8),
  };
  // a builder holds 4 buckets; head parts are written in head space (origin = neck)
  function Builder(fixedHead, neckY) { this.b = { body: [], head: [], gb: [], gh: [] }; this.neckY = neckY; }
  Builder.prototype.put = function (bucket, geo, col, m, flat) {
    let g = geo.index ? geo.toNonIndexed() : geo; geo !== g && geo.dispose();
    g.applyMatrix4(m); if (flat) g.computeVertexNormals();
    _c.setHex(col).convertSRGBToLinear(); const n = g.attributes.position.count, c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { c[i * 3] = _c.r; c[i * 3 + 1] = _c.g; c[i * 3 + 2] = _c.b; }
    g.setAttribute('color', new T.BufferAttribute(c, 3)); this.b[bucket].push(g);
  };
  function merge(geos) {
    let n = 0; geos.forEach(g => n += g.attributes.position.count);
    const P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3); let o = 0;
    geos.forEach(g => { P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); C.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; g.dispose(); });
    const R = new T.BufferGeometry(); R.setAttribute('position', new T.BufferAttribute(P, 3)); R.setAttribute('normal', new T.BufferAttribute(N, 3)); R.setAttribute('color', new T.BufferAttribute(C, 3));
    R.computeBoundingSphere(); return R;
  }

  // ---------- character builder ----------
  // look: {s,g,legL,torL,skin,hair,hairStyle,beard,beardC,brow,top,coat,coatEnd,robe,pants,boots,belt,glove,hat:{k,c,c2,c3},
  //        armL,armR (pose), itemL,itemR ({k,c,c2,g}), acc:[{k,c,c2}], eye, eyeGlow, cheek, nose, bare (bare arms)}
  FN.make = function (look, id) {
    // Unbloxed mode: an R6 character (built now, or as soon as unbloxed/avatar.js is there). Resolved through window.FN at
    // call time and never throws, so a missing piece can only ever cost the R6 look, not the NPC.
    const r6 = window.FN && window.FN._r6;
    if (r6) { try { const g = r6.route(look || {}, id); if (g) return g; } catch (e) { console.warn('[npc] R6 build failed, using the v2 model', id, e); } }
    return makeV2(look, id);
  };
  function makeV2(look, id) {
    mats(); look = look || {};
    const g = look.g || 1, L = look.legL || 1, TL = look.torL || .9, s = look.s || 1;
    const skin = look.skin || 0xe8b48a, top = look.top || 0x3a6ea5, pants = look.pants || 0x34405a, boots = look.boots || 0x3a2a1e;
    const coat = look.coat, robe = look.robe, sleeve = look.bare ? skin : (coat || robe || top), glove = look.glove || skin;
    const hunch = look.hunch || 0;
    const neckY = L + TL, shY = L + TL - .1, sx = .4 * g + .08;
    const B = new Builder(false, neckY), body = (geo, col, m, f) => B.put('body', geo, col, m, f), gl = (geo, col, m) => B.put('gb', geo, col, m);
    const head = (geo, col, m, f) => B.put('head', geo, col, m, f), gh = (geo, col, m) => B.put('gh', geo, col, m);
    const limb = (bk, a, b, r1, r2, col, seg) => { const d = new T.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length(); d.normalize();
      const q = new T.Quaternion().setFromUnitVectors(_up, d), m = new T.Matrix4().compose(new T.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), q, new T.Vector3(1, 1, 1));
      B.put(bk, G.cyl(r2, r1, len, Math.min(seg || 5, 5), true), col, m); };

    // --- legs / feet ---
    const hideLegs = !!robe;
    if (!hideLegs) {
      for (const k of [-1, 1]) {
        limb('body', [k * .17 * g, L + .02, 0], [k * .18 * g, .2, .02], .14 * Math.min(g, 1.2), .115, pants, 6);
        if (look.fins) { body(G.box(.3, .08, .62), look.fins, M(k * .19 * g, .05, .2, 0, k * -.12, 0)); body(G.box(.24, .16, .26), boots, M(k * .18 * g, .12, .02)); }
        else { body(G.box(.27, .2, .4), boots, M(k * .18 * g, .1, .07));  }
      }
      body(G.cyl(.32 * g, .3 * g, .26, 7, true), pants, M(0, L - .02, 0, 0, 0, 0, 1, 1, .78));
    } else {
      for (const k of [-1, 1]) body(G.box(.24, .14, .3), boots, M(k * .15 * g, .07, .14));
    }
    // --- torso ---
    const torCol = coat || robe || top;
    body(G.cyl(.4 * g, .33 * g, TL, 8, true), torCol, M(0, L + TL / 2 - .02, -hunch * .15, hunch * .35, 0, 0, 1, 1, .74));
    body(G.sph(.4 * g, 8, 2, 0, Math.PI * 2, 0, Math.PI / 2), torCol, M(0, L + TL - .02, -hunch * .3, hunch * .35, 0, 0, 1, .32, .74)); // rounded shoulders
    if (coat || robe) { // open front showing the shirt + skirt part of the coat
      if (coat && look.coatOpen !== false) body(G.box(.2 * g, TL * .8, .05), top, M(0, L + TL * .5, .3 * g * .74 + .02 - hunch * .15, hunch * .35));
      const end = robe ? .06 : (look.coatEnd || .5), len = L + .05 - end;
      body(G.cyl(.34 * g, (robe ? .5 : .46) * g, len, 8, true), torCol, M(0, end + len / 2, 0, 0, 0, 0, 1, 1, .8));
            if (look.hem) body(G.cyl((robe ? .5 : .46) * g + .015, (robe ? .52 : .48) * g, .1, 8, true), look.hem, M(0, end + .05, 0, 0, 0, 0, 1, 1, .8));
      if (look.hemGlow) gl(G.cyl((robe ? .5 : .46) * g + .03, (robe ? .52 : .48) * g + .03, .04, 8, true), look.hemGlow, M(0, end + .2, 0, 0, 0, 0, 1, 1, .8));
    }
    if (look.belt) body(G.cyl(.355 * g, .35 * g, .1, 8, true), look.belt, M(0, L + .12, 0, 0, 0, 0, 1, 1, .78));
    if (look.buckle) body(G.box(.14, .1, .04), look.buckle, M(0, L + .12, .35 * g * .78 + .01));
    // neck
    body(G.cyl(.13, .14, .18, 5, true), skin, M(0, neckY - .02, 0));

    // --- arms ---
    const P = {
      down: k => [[k * (sx + .05), shY - .42, -.02], [k * (sx + .07), shY - .8, .06]],
      hold: k => [[k * (sx + .02), shY - .42, -.04], [k * (sx - .03), shY - .56, .36]],
      hip: k => [[k * (sx + .3), shY - .34, -.08], [k * (.36 * g + .06), L + .2, .02]],
      staff: k => [[k * (sx + .12), shY - .38, .06], [k * (sx + .14), shY - .44, .36]],
      low: k => [[k * (sx + .08), shY - .42, .02], [k * (sx + .16), shY - .72, .24]],
      wave: k => [[k * (sx + .34), shY - .02, .04], [k * (sx + .4), shY + .42, .14]],
      shoulder: k => [[k * (sx + .14), shY - .38, .12], [k * (sx + .02), shY - .1, .3]],
      behind: k => [[k * (sx + .06), shY - .4, -.16], [k * .18, L + .26, -.34 * g]],
    };
    const ar = .105 * (look.arm || 1), hands = {};
    for (const [side, k] of [['L', 1], ['R', -1]]) {
      const pose = P[look['arm' + side] || 'down'](k), sh = [k * (sx - .06), shY + .02, -hunch * .3];
      limb('body', sh, pose[0], ar * 1.15, ar, sleeve, 6); body(G.sph(ar * 1.05, 4, 3), sleeve, M(...pose[0]));
      limb('body', pose[0], pose[1], ar, ar * .9, look.bare ? skin : sleeve, 6);
      if (look.cuff) { const c = pose[1].map((v, i) => FWl(pose[0][i], v, .78)); body(G.cyl(ar * 1.2, ar * 1.2, .08, 5, true), look.cuff, M(c[0], c[1], c[2], 0, 0, 0, 1, .7, 1)); }
      body(G.sph(ar * 1.15, 5, 3), glove, M(...pose[1]));
      hands[side] = pose[1];
    }
    // --- items in hands ---
    for (const side of ['L', 'R']) { const it = look['item' + side]; if (it) ITEM[it.k] && ITEM[it.k](B, hands[side], it, side === 'L' ? 1 : -1, { neckY, L, g, body, gl, limb }); }
    // --- accessories on body ---
    (look.acc || []).forEach(a => ACC[a.k] && ACC[a.k](B, a, { neckY, L, TL, g, sx, shY, body, gl, head, gh, limb, hunch, skin }));

    // --- head (head space: origin at neck) ---
    const hs = look.hs || 1, hr = .4 * hs, hc = .4 * hs; // head radius, centre height above neck
    head(G.sph(hr, 8, 6), skin, M(0, hc, 0, 0, 0, 0, 1, 1.04, .96));
    if (look.ears) for (const k of [-1, 1]) head(G.sph(.08, 5, 4), skin, M(k * hr * .97, hc, -.02, 0, 0, 0, .6, 1, .9));
    // face
    const ez = hr * .88, ey = hc + .02 * hs, ex = .14 * hs, eyeC = look.eye || 0x1d1a22;
    for (const k of [-1, 1]) {
      if (look.eyeGlow) { gh(G.sph(.07, 5, 3), look.eyeGlow, M(k * ex, ey, ez, 0, 0, 0, .8, 1.15, .5)); }
      else { head(G.sph(.07, 5, 3), eyeC, M(k * ex, ey, ez, 0, k * .3, 0, .85, 1.3, .55)); head(G.disc(.022, 3), 0xffffff, M(k * ex + .018, ey + .04, ez + .04, 0, k * .3, 0)); }
      if (look.brow !== null) { const bc = look.browC || look.hair || 0x3a2a1a, ba = look.brow || 0;
        head(new T.PlaneGeometry(.14, .04), bc, M(k * ex, ey + .12, ez + .025, -.15, k * .3, k * -ba)); }
      if (look.cheek !== 0) head(new T.CircleGeometry(.065, 6), look.cheek || 0xf08a7a, M(k * .2 * hs, hc - .1, hr * .86, 0, k * .48, 0, 1, .6, 1));
    }
    if (look.mouth !== 0 && look.beard !== 'full' && look.beard !== 'long' && !(look.hat && look.hat.veil)) head(new T.RingGeometry(.045, .07, 3, 1, Math.PI * 1.1, Math.PI * .8), look.mouthC || 0x5a2a24, M(0, hc - .17, hr * .9, -.25, 0, 0, 1, .8, 1));
    head(G.sph(.065 * (look.nose || 1), 5, 3), shade(skin, .9), M(0, hc - .06, hr * .98, 0, 0, 0, 1, 1.05, 1));
    // hair
    const hair = look.hair || 0x4a2e1c, hst = look.hairStyle || 'short';
    if (hst !== 'bald' && hst !== 'none') {
      const capped = look.hat && look.hat.k !== 'band';
      head(G.sph(hr * 1.06, capped ? 6 : 8, capped ? 3 : 4, 0, Math.PI * 2, 0, Math.PI * .56), hair, M(0, hc + .02, -.03, -.32, 0, 0, 1, 1.02, 1.04));
      if (hst === 'long') head(G.box(hr * 1.8, .7, .3), hair, M(0, hc - .3, -.22, .1, 0, 0));
      if (hst === 'bun') head(G.sph(.17, 6, 4), hair, M(0, hc + .38, -.22));
      if (hst === 'braids') for (const k of [-1, 1]) { head(G.cyl(.06, .08, .7, 5, true), hair, M(k * .3, hc - .45, .02, 0, 0, k * -.12)); head(G.sph(.08, 4, 3), look.tie || 0xd04040, M(k * .34, hc - .8, .02)); }
      if (hst === 'spiky') for (let i = 0; i < 5; i++) head(G.cone(.09, .32, 4), hair, M(0, hc + .35 - Math.abs(i - 2) * .05, .2 - i * .14, -.5 + i * .3, 0, 0), true);
      if (hst === 'side') for (const k of [-1, 1]) head(G.sph(.14, 5, 3), hair, M(k * hr * .9, hc - .05, -.08, 0, 0, 0, .6, 1, 1));
    } else if (hst === 'bald' && look.tufts) for (const k of [-1, 1]) head(G.sph(.13, 6, 4), hair, M(k * hr * .92, hc - .02, -.1, 0, 0, 0, .55, .9, 1));
    // beard
    const bc = look.beardC || hair;
    if (look.beard === 'full' || look.beard === 'long') {
      head(G.sph(hr * .9, 8, 3, 0, Math.PI * 2, Math.PI * .45, Math.PI * .55), bc, M(0, hc - .02, .04, 0, 0, 0, 1.08, 1.05, 1.02));
      head(G.cone(.26, look.beard === 'long' ? .75 : .4, 6), bc, M(0, hc - (look.beard === 'long' ? .62 : .44), .2, Math.PI + .25, 0, 0), true);
    }
    if (look.beard === 'full' || look.beard === 'long' || look.beard === 'mustache') for (const k of [-1, 1]) head(G.sph(.1, 4, 3), bc, M(k * .1, hc - .14, hr * .95, 0, 0, k * .4, 1.3, .6, .7));
    if (look.beard === 'chops') for (const k of [-1, 1]) head(G.box(.1, .3, .22), bc, M(k * hr * .88, hc - .1, .08, 0, 0, k * -.1));
    // hat
    if (look.hat) HAT[look.hat.k] && HAT[look.hat.k](head, look.hat, hr, hc, gh);
    (look.acc || []).forEach(a => HACC[a.k] && HACC[a.k](head, a, hr, hc, gh));

    // ---------- assemble ----------
    const root = new T.Group(), rig = new T.Group(), hp = new T.Group(); root.add(rig); rig.add(hp); hp.position.set(0, neckY, -hunch * .35);
    const fixed = B.b.gh.length && B.b.gb.length; // can't have glow in both groups (3-mesh cap) -> bake the head into the body
    if (fixed) { const off = M(0, neckY, -hunch * .35); B.b.head.forEach(q => { q.applyMatrix4(off); B.b.body.push(q); }); B.b.gh.forEach(q => { q.applyMatrix4(off); B.b.gb.push(q); }); B.b.head = []; B.b.gh = []; }
    const bm = new T.Mesh(merge(B.b.body), MAT); rig.add(bm);
    let hm = null, gm = null;
    if (B.b.head.length) { hm = new T.Mesh(merge(B.b.head), MAT); hp.add(hm); }
    if (B.b.gb.length) { gm = new T.Mesh(merge(B.b.gb), GLOW); rig.add(gm); }
    else if (B.b.gh.length) { gm = new T.Mesh(merge(B.b.gh), GLOW); hp.add(gm); }
    let tris = 0; root.traverse(o => { if (o.isMesh) tris += o.geometry.attributes.position.count / 3; });
    rig.scale.setScalar(s);
    root.userData = { rig, head: hp, body: bm, glow: gm, tris, meshes: (hm ? 1 : 0) + 1 + (gm ? 1 : 0), top: (neckY + hc + hr + (look.hat ? .45 : .1)) * s, phase: Math.random() * 10, look, s0: s };
    bm.onBeforeRender = animHook(root);
    return root;
  }
  function FWl(a, b, t) { return a + (b - a) * t; }
  function shade(hex, f) { const r = Math.min(255, ((hex >> 16) & 255) * f) | 0, g = Math.min(255, ((hex >> 8) & 255) * f) | 0, b = Math.min(255, (hex & 255) * f) | 0; return (r << 16) | (g << 8) | b; }

  // ---------- hats (head space) ----------
  const HAT = {
    souwester(h, o, r, c) { h(G.sph(r * 1.1, 8, 4, 0, Math.PI * 2, 0, Math.PI * .55), o.c, M(0, c + .04, -.02, -.12, 0, 0, 1, 1.05, 1.05));
      h(G.cyl(.6, .66, .06, 8), o.c, M(0, c + .2, -.1, -.22, 0, 0, 1, 1, 1.15)); h(G.cyl(r * 1.08, r * 1.1, .07, 8, true), o.c2 || shade(o.c, .75), M(0, c + .26, -.03, -.12, 0, 0, 1, 1, 1.03)); },
    captain(h, o, r, c) { h(G.cyl(.47, .4, .26, 8), o.c, M(0, c + .44, -.02, -.1)); h(G.cyl(.405, .405, .1, 8, true), o.c2, M(0, c + .32, 0, -.1));
      h(G.cyl(.3, .32, .04, 6, false), 0x111418, M(0, c + .28, .26, -.35, 0, 0, 1, 1, .7)); h(G.oct(.07), 0xe0b443, M(0, c + .37, .41, -.1, 0, 0, 1, 1, .5), true); },
    beanie(h, o, r, c) { h(G.sph(r * 1.08, 8, 4, 0, Math.PI * 2, 0, Math.PI * .5), o.c, M(0, c + .08, 0, -.15)); h(G.cyl(r * 1.1, r * 1.1, .14, 8, true), o.c2 || o.c, M(0, c + .1, .0, -.15)); h(G.sph(.12, 6, 4), o.c3 || 0xffffff, M(0, c + .55, -.08)); },
    cap(h, o, r, c) { h(G.sph(r * 1.07, 8, 4, 0, Math.PI * 2, 0, Math.PI * .5), o.c, M(0, c + .08, 0, -.12)); h(G.box(.46, .04, .3), o.c2 || o.c, M(0, c + .14, r + .08, -.15)); h(G.box(.3, .2, .05), o.c3 || 0xffffff, M(0, c + .32, r * .85, -.45)); },
    hood(h, o, r, c) { const ps = Math.PI / 2 + .95, pl = Math.PI * 2 - 1.9;
      h(G.sph(r * 1.32, 8, 5, ps, pl, 0, Math.PI * .78), o.c, M(0, c + .05, -.06, 0, 0, 0, 1, 1.08, 1.05));
      h(G.sph(r * 1.12, 6, 4), o.c2 || 0x16141c, M(0, c + .06, -.15));
      if (o.peak) h(G.cone(.2, .5, 6), o.c, M(0, c + .55, -.36, -.9), true);
      if (o.fur) h(G.tor(r * 1.15, .1, 4, 9, Math.PI * 1.25), o.fur, M(0, c + .08, .2, 0, 0, -Math.PI * .125 - Math.PI / 2 + Math.PI * .5, 1, 1.12, 1), false); },
    wide(h, o, r, c) { h(G.cyl(.82, .86, .05, 10), o.c, M(0, c + .3, 0, .08, 0, -.06)); h(G.cyl(.18, .38, .52, 7, true), o.c, M(0, c + .55, -.04, -.12, 0, .1));
      h(G.cone(.18, .3, 6), o.c, M(.06, c + .92, -.14, -.6, 0, .3), true); h(G.cyl(.385, .385, .08, 7, true), o.c2, M(0, c + .36, -.01, -.12, 0, .1));
      if (o.shroom) { h(G.sph(.26, 7, 3, 0, Math.PI * 2, 0, Math.PI / 2), o.shroom, M(.42, c + .4, .12, 0, 0, -.2, 1, .8, 1)); h(G.cyl(.06, .08, .14, 5, true), 0xf2ead8, M(.42, c + .33, .12));
        for (const p of [[.36, .58, .2], [.52, .55, .02], [.32, .55, -.02]]) h(G.oct(.045), 0xfff4e4, M(p[0], c + p[1], p[2])); } },
    pith(h, o, r, c) { h(G.sph(r * 1.12, 8, 4, 0, Math.PI * 2, 0, Math.PI * .5), o.c, M(0, c + .1, 0, -.06, 0, 0, 1, 1.05, 1.1)); h(G.cyl(.62, .66, .05, 8), o.c, M(0, c + .14, .02, -.08, 0, 0, 1, 1, 1.12));
      h(G.cyl(r * 1.13, r * 1.13, .08, 8, true), o.c2, M(0, c + .2, 0, -.06, 0, 0, 1, 1, 1.1)); h(G.sph(.05, 4, 3), o.c, M(0, c + .55, -.02)); },
    helmet(h, o, r, c, gh) { h(G.sph(r * 1.12, 8, 4, 0, Math.PI * 2, 0, Math.PI * .5), o.c, M(0, c + .08, 0, -.1)); h(G.cyl(.52, .54, .05, 8), o.c, M(0, c + .1, .02, -.1, 0, 0, 1, 1, 1.08));
      h(G.box(.06, .2, .55), shade(o.c, .8), M(0, c + .5, 0, -.1)); h(G.cyl(.11, .12, .12, 6, true), 0x3a3a40, M(0, c + .3, r + .06, Math.PI / 2 - .2)); gh(G.disc(.1, 6), 0xfff2b0, M(0, c + .31, r + .12, -.2)); },
    wrap(h, o, r, c) { for (let i = 0; i < 3; i++) h(G.cyl(r * (1.12 - i * .1), r * (1.16 - i * .1), .16, 8, true), i % 2 ? o.c : shade(o.c, .9), M(0, c + .12 + i * .14, -.02, -.12 + i * .05, 0, (i - 1) * .08));
      h(G.sph(r * .95, 8, 3, 0, Math.PI * 2, 0, Math.PI / 2), o.c, M(0, c + .48, -.04, -.1, 0, 0, 1, .55, 1));
      h(G.box(.3, .34, .08), o.c, M(.0, c - .12, -.42, .3)); // tail down the back
      if (o.veil) h(G.sph(r * 1.0, 7, 3, Math.PI / 2 - 1.3 + Math.PI, 2.6, Math.PI * .52, Math.PI * .4), o.veil, M(0, c, .02, 0, Math.PI, 0, 1.06, 1.05, 1.06)); },
    band(h, o, r, c) { h(G.cyl(r * 1.04, r * 1.05, .1, 8, true), o.c, M(0, c + .2, 0, -.12)); if (o.leaf) for (let i = 0; i < 7; i++) { const a = -1.4 + i * .47; h(G.cone(.07, .22, 4), o.leaf, M(Math.sin(a) * r, c + .32, Math.cos(a) * r - .02, .4 * Math.cos(a), 0, -.4 * Math.sin(a)), true); } },
    scarf(h, o, r, c) { h(G.sph(r * 1.08, 8, 4, 0, Math.PI * 2, 0, Math.PI * .55), o.c, M(0, c + .06, -.04, -.35)); h(G.sph(.1, 6, 4), o.c, M(.0, c + .1, -.44)); h(G.box(.12, .28, .05), o.c, M(.06, c - .1, -.44, .2, 0, .3)); if (o.dots) for (const p of [[.2, .38, .25], [-.22, .3, .27], [0, .48, .15], [.32, .1, .1], [-.34, .12, .05]]) h(G.box(.06, .06, .06), o.dots, M(p[0], c + p[1], p[2])); },
  };
  // ---------- head accessories ----------
  const HACC = {
    goggles(h, a, r, c) { const y = c + (a.y || .26); h(G.cyl(r * 1.06, r * 1.06, .07, 8, true), a.c2 || 0x2a2420, M(0, y, -.01, -.15));
      for (const k of [-1, 1]) { h(G.cyl(.1, .11, .12, 6, true), a.c || 0x8a6a3a, M(k * .13, y + .02, r * .9, Math.PI / 2 - .25)); h(G.disc(.1, 6), a.lens || 0x6ad0e0, M(k * .13, y + .035, r * .9 + .06, -.25)); } },
    glasses(h, a, r, c) { for (const k of [-1, 1]) h(G.ring(.07, .095, 8), a.c || 0xc8a040, M(k * .14, c + .02, r * .95, 0, k * .3, 0)); h(G.box(.1, .02, .02), a.c || 0xc8a040, M(0, c + .04, r * .95)); },
    snorkel(h, a, r, c) { h(G.cyl(.04, .04, .7, 6), a.c, M(-r * 1.02, c + .2, .05, 0, 0, .08)); h(G.cyl(.04, .04, .2, 6), a.c, M(-r * .85, c - .15, .15, 1.1, 0, -.5)); },
    flower(h, a, r, c) { for (let i = 0; i < 5; i++) { const t = i / 5 * 6.28; h(G.disc(.07, 5), a.c, M(.3 + Math.cos(t) * .07, c + .3 + Math.sin(t) * .07, .2, 0, 0, 0, 1, 1, .5)); } h(G.disc(.045, 5), a.c2 || 0xffe060, M(.3, c + .3, .24)); },
    pencil(h, a, r, c) { h(G.cyl(.02, .02, .34, 5), 0xf2c23a, M(r * .95, c + .1, .1, .3, 0, .9)); },
  };
  // ---------- body accessories ----------
  const ACC = {
    apron(B, a, o) { o.body(G.box(.62 * o.g, o.TL * .78 + o.L * .55, .05), a.c, M(0, o.L + o.TL * .4 - o.L * .27, .3 * o.g + .02, .02)); if (a.c2) o.body(G.box(.24, .18, .03), a.c2, M(.12, o.L - .1, .3 * o.g + .055)); o.body(G.box(.06, .4, .04), a.c, M(-.18 * o.g, o.L + o.TL - .1, .27 * o.g, -.3, 0, -.15)); o.body(G.box(.06, .4, .04), a.c, M(.18 * o.g, o.L + o.TL - .1, .27 * o.g, -.3, 0, .15)); },
    scarf(B, a, o) { o.body(G.cyl(.25, .3, .2, 7, true), a.c, M(0, o.neckY - .04, 0)); o.body(G.box(.16, .55, .05), a.c, M(.12, o.neckY - .32, .3, .1, 0, .08)); if (a.trail) o.body(G.box(.18, .05, .95), a.c, M(-.15, o.neckY + .05, -.75, -.35, -.25, .1)); if (a.c2) o.body(G.box(.17, .05, .055), a.c2, M(.12, o.neckY - .52, .33, .1, 0, .08)); },
    collar(B, a, o) { o.body(G.tor(.3, .11, 4, 8), a.c, M(0, o.neckY - .06, 0, Math.PI / 2)); },
    backpack(B, a, o) { o.body(G.box(.6 * o.g, .7, .3), a.c, M(0, o.L + o.TL * .55, -.36 * o.g)); o.body(G.cyl(.13, .13, .66 * o.g, 7), a.c2 || 0x7aa070, M(0, o.L + o.TL * .55 + .42, -.36 * o.g, 0, 0, Math.PI / 2)); o.body(G.box(.34, .22, .06), shade(a.c, .8), M(0, o.L + o.TL * .4, -.36 * o.g - .17)); },
    satchel(B, a, o) { o.body(G.box(.36, .3, .14), a.c, M(-.4 * o.g, o.L + .05, .06)); o.body(G.box(.07, o.TL * 1.22, .05), shade(a.c, .8), M(-.02, o.L + o.TL * .5, .29 * o.g, .05, 0, .66)); o.body(G.box(.07, o.TL * 1.22, .05), shade(a.c, .8), M(-.02, o.L + o.TL * .5, -.29 * o.g, -.05, 0, .66)); },
    pouch(B, a, o) { o.body(G.sph(.13, 5, 3), a.c, M(a.x || .3 * o.g, o.L + .02, .2)); o.body(G.cyl(.05, .07, .06, 5, true), a.c2 || shade(a.c, .7), M(a.x || .3 * o.g, o.L + .14, .2)); },
    creel(B, a, o) { o.body(G.box(.34, .3, .24), a.c, M(-.42 * o.g, o.L + .04, -.04)); o.body(G.box(.36, .05, .26), shade(a.c, .8), M(-.42 * o.g, o.L + .2, -.04)); },
    buttons(B, a, o) { for (let i = 0; i < 3; i++) for (const k of [-1, 1]) o.body(G.disc(.035, 5), a.c, M(k * .13 * o.g, o.L + o.TL * (.75 - i * .22), .3 * o.g + .025)); },
    cape(B, a, o) { const len = o.neckY - (a.end || .5); o.body(G.box(.88 * o.g, len, .05), a.c, M(0, o.neckY - len / 2 - .05, -.36 * o.g, .1)); o.body(G.cyl(.36 * o.g, .42 * o.g, .16, 8, true), a.c, M(0, o.neckY - .14, -.02, 0, 0, 0, 1, 1, .85)); },
    sash(B, a, o) { o.body(G.box(.12, o.TL * 1.4, .05), a.c, M(0, o.L + o.TL * .5, .3 * o.g + .01, 0, 0, -.7)); o.body(G.box(.14, .4, .04), a.c, M(.32 * o.g, o.L - .18, .2, 0, 0, .15)); },
    stripes(B, a, o) { for (let i = 0; i < (a.n || 2); i++) o.body(G.cyl(.405 * o.g - i * .01 * o.g, .39 * o.g, .07, 8, true), a.c, M(0, o.L + o.TL * (.32 + i * .26), 0, 0, 0, 0, 1, 1, .75)); },
    vest(B, a, o) { for (const k of [-1, 1]) o.body(G.box(.24 * o.g, o.TL * .85, .06), a.c, M(k * .18 * o.g, o.L + o.TL * .5, .27 * o.g, 0, k * -.25, 0)); o.body(G.cyl(.41 * o.g, .35 * o.g, o.TL * .85, 8, true, 0, 0), a.c, M(0, o.L + o.TL * .5, -.02, 0, 0, 0, 1, 1, .74)); },
    overalls(B, a, o) { o.body(G.box(.42 * o.g, o.TL * .55, .05), a.c, M(0, o.L + o.TL * .32, .29 * o.g)); for (const k of [-1, 1]) { o.body(G.box(.07, o.TL * .6, .04), a.c, M(k * .14 * o.g, o.L + o.TL * .75, .26 * o.g, -.2)); o.body(G.disc(.04, 5), 0xd8b040, M(k * .14 * o.g, o.L + o.TL * .55, .32 * o.g)); } },
    whistle(B, a, o) { o.body(G.box(.03, .4, .02), a.c2 || 0xe04040, M(.08, o.neckY - .26, .3 * o.g, -.15, 0, .2)); o.body(G.cyl(.04, .04, .14, 6), a.c || 0xd8d8e0, M(.12, o.neckY - .48, .33 * o.g, 0, 0, Math.PI / 2)); },
    runes(B, a, o) { for (let i = 0; i < 4; i++) { const t = -.9 + i * .6; o.gl(G.box(.07, .2, .02), a.c, M(Math.sin(t) * .5 * o.g, .55, Math.cos(t) * .5 * o.g * .8 + .02, 0, t, 0)); } },
    spots(B, a, o) { const pts = [[.3, 1.6, .3], [-.32, 1.2, .3], [.38, .7, .25], [-.2, .45, .38], [.05, 1.9, -.36], [-.35, .9, -.25]]; pts.forEach(p => o.gl(G.ico(.05), a.c, M(p[0] * o.g, p[1], p[2] * o.g))); },
    shoulderMoss(B, a, o) { o.body(G.sph(.2, 6, 4), a.c, M(.42 * o.g, o.shY + .12, 0, 0, 0, 0, 1, .5, 1), true); o.gl(G.sph(.07, 5, 3, 0, Math.PI * 2, 0, Math.PI / 2), a.c2, M(.4 * o.g, o.shY + .22, .06)); o.body(G.cyl(.02, .025, .1, 4), 0xe0e8f0, M(.4 * o.g, o.shY + .17, .06)); },
    fishTag(B, a, o) { o.body(G.box(.24, .12, .03), a.c, M(-.18 * o.g, o.L + o.TL * .78, .3 * o.g + .02)); },
    pauldron(B, a, o) { o.body(G.sph(.22, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2), a.c, M(-o.sx, o.shY + .06, 0, 0, 0, .35, 1, .7, 1), true); },
  };
  // ---------- held items (H = hand position, k = side sign) ----------
  const ITEM = {
    rod(B, H, it, k, o) { const a = [H[0] + k * .02, H[1] - .32, H[2] - .2], tip = [H[0] - k * .5, H[1] + 2.5, H[2] + 1.1];
      o.limb('body', a, [H[0], H[1] + .1, H[2] + .05], .04, .04, 0x5a3a24, 6); o.limb('body', [H[0], H[1] + .1, H[2] + .05], tip, .03, .012, it.c || 0x2a4a6a, 5);
      o.body(G.cyl(.07, .07, .06, 6), 0xb8bcc4, M(H[0] + k * .08, H[1] - .12, H[2] - .06, 0, 0, Math.PI / 2));
      o.limb('body', tip, [tip[0], tip[1] - 1.6, tip[2] + .1], .006, .006, 0xf0f0f0, 3);
      o.body(G.sph(.07, 5, 3), 0xe0402a, M(tip[0], tip[1] - 1.66, tip[2] + .1)); o.body(G.sph(.07, 5, 2, 0, Math.PI * 2, 0, Math.PI / 2), 0xf8f8f8, M(tip[0], tip[1] - 1.64, tip[2] + .1)); },
    lantern(B, H, it, k, o) { const x = H[0], y = H[1] - .32, z = H[2]; o.body(G.box(.03, .14, .03), 0x2a2a2a, M(x, H[1] - .06, z));
      o.body(G.cone(.15, .12, 6), it.c || 0x2c2a26, M(x, y + .2, z)); o.body(G.box(.24, .04, .24), it.c || 0x2c2a26, M(x, y - .16, z));
      o.gl(G.box(.17, .26, .17), it.g || 0xffd27a, M(x, y, z)); o.gl(G.oct(.07), 0xffffff, M(x, y, z)); },
    staff(B, H, it, k, o) { const top = o.neckY + (it.h || .9); o.limb('body', [H[0], .02, H[2]], [H[0], top, H[2]], .045, .04, it.c || 0x6a4a2a, 6);
      if (it.top === 'crystal') { o.gl(G.oct(.16), it.g || 0x7ff0ff, M(H[0], top + .2, H[2], 0, .4, 0, .8, 1.5, .8)); for (let i = 0; i < 3; i++) { const t = i / 3 * 6.28; o.body(G.cone(.03, .26, 4), it.c2 || 0x8a7a5a, M(H[0] + Math.cos(t) * .1, top + .04, H[2] + Math.sin(t) * .1, Math.sin(t) * .5, 0, -Math.cos(t) * .5)); } }
      else if (it.top === 'orb') { o.gl(G.ico(.16), it.g || 0xe8f6ff, M(H[0], top + .22, H[2])); o.body(G.tor(.2, .025, 3, 10), it.c2 || 0xd8b040, M(H[0], top + .22, H[2], 0, .6, 0)); }
      else if (it.top === 'bell') { o.body(G.tor(.16, .03, 3, 6, Math.PI * 1.4), it.c, M(H[0] + .12, top + .02, H[2], 0, 0, -.6)); o.body(G.cone(.09, .14, 6), it.c2 || 0xd8a840, M(H[0] + .24, top - .14, H[2])); for (let i = 0; i < 2; i++) o.body(G.box(.06, .2, .02), [0xc84a3a, 0x3a8ac8][i], M(H[0] - .06 + i * .1, top - .3, H[2] + .06, 0, 0, .2 - i * .4)); }
      else if (it.top === 'knob') { o.body(G.ico(.13), it.c, M(H[0], top + .08, H[2]), true); o.body(G.cone(.05, .3, 4), it.c, M(H[0] + .1, top - .25, H[2], 0, 0, -.8), true); if (it.g) o.gl(G.sph(.06, 5, 3), it.g, M(H[0] + .05, top + .2, H[2] + .05)); }
      else if (it.top === 'auger') { o.limb('body', [H[0] - .24, top, H[2]], [H[0] + .24, top, H[2]], .04, .04, 0x2a2a2a, 6); o.body(G.cone(.12, .5, 6), 0xb8c0c8, M(H[0], .25, H[2], Math.PI, 0, 0), true); for (let i = 0; i < 3; i++) o.body(G.box(.3, .03, .1), 0xa8b0b8, M(H[0], .42 + i * .16, H[2], 0, i * 1.1, .3)); } },
    book(B, H, it, k, o) { o.body(G.box(.42, .06, .32), it.c || 0x6a2a2a, M(H[0] - k * .06, H[1] + .04, H[2] + .04, -.5, 0, 0)); o.body(G.box(.38, .07, .28), 0xf4ead0, M(H[0] - k * .06, H[1] + .08, H[2] + .06, -.5, 0, 0)); },
    spyglass(B, H, it, k, o) { o.limb('body', [H[0], H[1] - .02, H[2] - .32], [H[0], H[1] + .02, H[2] + .3], .045, .065, 0xc8a040, 7); o.body(G.cyl(.07, .07, .06, 7), 0x5a3a24, M(H[0], H[1], H[2] - .05, Math.PI / 2)); },
    map(B, H, it, k, o) { o.body(G.cyl(.07, .07, .62, 7), it.c || 0xf0e2b8, M(H[0], H[1] + .02, H[2] + .04, 0, 0, Math.PI / 2 - .2)); o.body(G.cyl(.075, .075, .06, 7), 0xc04a3a, M(H[0], H[1] + .02, H[2] + .04, 0, 0, Math.PI / 2 - .2)); },
    shell(B, H, it, k, o) { o.body(G.cone(.14, .38, 6), it.c || 0xf4a49a, M(H[0], H[1] + .12, H[2] + .06, -.3, 0, k * .6), true); o.body(G.sph(.12, 5, 3), it.c2 || 0xfbe0d6, M(H[0], H[1], H[2] + .06)); },
    hammer(B, H, it, k, o) { const e = [H[0] + k * .02, H[1] + .75, H[2] - .55]; o.limb('body', [H[0], H[1] - .25, H[2] + .2], e, .05, .05, 0x6a4428, 5);
      o.body(G.box(.34, .34, .6), it.c || 0x4a4c52, M(e[0], e[1], e[2], .6, 0, 0)); o.body(G.box(.38, .38, .08), 0x2a2a30, M(e[0], e[1] + .17, e[2] + .25, .6, 0, 0)); o.body(G.box(.38, .38, .08), 0x2a2a30, M(e[0], e[1] - .17, e[2] - .25, .6, 0, 0)); },
    tongs(B, H, it, k, o) { o.limb('body', [H[0], H[1], H[2]], [H[0] - k * .05, H[1] - .25, H[2] + .55], .025, .025, 0x2a2a2a, 4); o.limb('body', [H[0] + .04, H[1], H[2]], [H[0] - k * .05 + .06, H[1] - .22, H[2] + .55], .025, .025, 0x2a2a2a, 4);
      o.gl(G.box(.26, .1, .16), it.g || 0xff8a2a, M(H[0] - k * .04, H[1] - .26, H[2] + .66, 0, .3, 0)); o.gl(G.box(.18, .05, .1), 0xffe28a, M(H[0] - k * .04, H[1] - .2, H[2] + .66, 0, .3, 0)); },
    magnifier(B, H, it, k, o) { o.limb('body', [H[0], H[1] - .1, H[2]], [H[0] - k * .05, H[1] + .22, H[2] + .08], .03, .03, 0x5a3a24, 5); o.body(G.cyl(.155, .155, .05, 9, true), 0xc8a040, M(H[0] - k * .08, H[1] + .38, H[2] + .1, Math.PI / 2, 0, k * -.5)); o.body(G.disc(.13, 9), 0xcfe8f0, M(H[0] - k * .08, H[1] + .38, H[2] + .1, 0, -k * .5, 0)); o.body(G.disc(.13, 9), 0xcfe8f0, M(H[0] - k * .08, H[1] + .38, H[2] + .1, 0, Math.PI - k * .5, 0)); },
    jar(B, H, it, k, o) { o.gl(G.cyl(.15, .15, .3, 8), it.g || 0x8ffcf0, M(H[0], H[1] + .02, H[2] + .08)); o.body(G.cyl(.16, .16, .06, 8), 0x5a4a3a, M(H[0], H[1] + .2, H[2] + .08)); o.gl(G.oct(.08), 0xffffff, M(H[0], H[1] + .02, H[2] + .2)); },
    crystal(B, H, it, k, o) { o.body(G.oct(.15), it.c || 0xb07af0, M(H[0], H[1] + .14, H[2] + .06, 0, .3, .2, .8, 1.6, .8), true); o.body(G.oct(.09), shade(it.c || 0xb07af0, 1.2), M(H[0] + k * .1, H[1] + .1, H[2] + .1, 0, 0, -k * .5, .7, 1.4, .7), true); },
    pickaxe(B, H, it, k, o) { o.limb('body', [H[0], H[1] - .5, H[2] + .02], [H[0], H[1] + .5, H[2] + .06], .04, .04, 0x6a4a2a, 6); o.body(G.cone(.07, .5, 4), 0x7a8088, M(H[0] + .24, H[1] + .5, H[2] + .06, 0, 0, -1.4), true); o.body(G.cone(.07, .5, 4), 0x7a8088, M(H[0] - .24, H[1] + .5, H[2] + .06, 0, 0, 1.4), true); },
  };

  // =================================================================================================================
  // Unbloxed mode: every NPC is an Unbloxed R6 character, built with makeChar (unbloxed/avatar.js; no sword) in its LOOKS
  // colours and dressed for its role. To stay cheap on Chromebooks the parts are baked into a few merged vertex-coloured
  // meshes in R6 stud space with ONE shared material (no lights, no shadows): body (torso, legs, outfit), head (head, hair,
  // hat; the face decal is one shared material per face), one mesh per arm with what that hand holds, and the glowing
  // bits (MeshBasic). Rough cost per NPC: 4-7 draw calls, ~2.5k triangles; NPCs far from the camera are not drawn.
  // =================================================================================================================
  const R6S = .36; // studs -> world units: the scale of the player's own R6 avatar (fishing/ubx/avatar.js S6)
  // Unbloxed mode? FUX (page head) says so; before FUX exists the URL does, the same test the page uses
  function ubxOn() { try { return window.FUX ? !!window.FUX.on : /[?&]ubx=1/.test(location.search); } catch (e) { return false; } }
  function r6Ready() { try { return typeof makeChar === 'function' && typeof R6 !== 'undefined'; } catch (e) { return false; } }
  // FN.make's Unbloxed route: null outside Unbloxed mode (the v2 model). Inside it, the R6 NPC, or, if unbloxed/avatar.js has
  // not run yet, a stand-in group (FN.place puts it in the scene as usual) that becomes the R6 NPC as soon as it has
  // (the v2 model if it never comes within 20 s), so no island ever loses its NPCs to load order.
  const R6WAIT = []; let r6Timer = 0, r6T0 = 0;
  FN._r6 = { route(look, id) { if (!ubxOn()) return null; return r6Ready() ? makeR6(look, id) : r6Later(look, id); }, ready: r6Ready, pending: () => R6WAIT.length };
  function r6Later(look, id) {
    const root = new T.Group(), rig = new T.Group(), hp = new T.Group(); root.add(rig); rig.add(hp);
    root.userData = { rig, head: hp, arms: [], top: 3.2 * (1 + ((look.s || 1) - 1) * .7), phase: 0, look, s0: 1, pending: 1 };
    R6WAIT.push({ root, look, id }); if (!r6Timer) { r6T0 = performance.now(); r6Timer = setTimeout(r6Poll, 100); }
    return root;
  }
  function r6Poll() {
    r6Timer = 0; const ready = r6Ready(), late = performance.now() - r6T0 > 20000;
    if (!ready && !late) { r6Timer = setTimeout(r6Poll, 200); return; }
    if (!ready) console.warn('[npc] the Unbloxed R6 code did not load, NPCs use the v2 models');
    for (const w of R6WAIT.splice(0)) {
      let g = null;
      if (ready) try { g = makeR6(w.look, w.id); } catch (e) { console.warn('[npc] R6 build failed, using the v2 model', w.id, e); }
      if (!g) try { g = makeV2(w.look, w.id); } catch (e) { console.warn('[npc] v2 build failed', w.id, e); }
      if (g) try { adopt(w.root, g); } catch (e) { console.warn('[npc] could not finish', w.id, e); }
    }
  }
  // move a finished NPC into its stand-in, keeping what FN.place gave it (id, name label, '!' marker, position, yaw)
  function adopt(root, g) {
    const u = root.userData; root.remove(u.rig); while (g.children.length) root.add(g.children[0]);
    const v = root.userData = Object.assign({}, g.userData, { id: u.id, label: u.label, marker: u.marker });
    v.s0 = v.rig.scale.y; if (v.label) v.label.position.y = v.top + .45; if (v.marker) { v.my = v.top + 1.45; v.marker.position.y = v.my; }
    if (v.body) v.body.onBeforeRender = v.r6 ? animR6(root) : animHook(root);
  }
  let R6MAT = null; const R6FACE = {};
  function r6mat() { if (!R6MAT) { mats(); R6MAT = new T.MeshStandardMaterial({ vertexColors: true, roughness: .6, metalness: 0 }); R6MAT.userData.lin = 1; } return R6MAT; }
  const hx = n => '#' + ('00000' + ((n >>> 0) & 0xffffff).toString(16)).slice(-6);
  const V3 = (x, y, z) => new T.Vector3(x, y, z);
  // buckets: body (char space: feet at 0, studs), head (neck space), aL/aR (shoulder space), g* = glowing parts of each
  function R6B() { this.b = { body: [], head: [], aL: [], aR: [], gbody: [], ghead: [], gaL: [], gaR: [] }; }
  R6B.prototype.put = function (bk, geo, col, m, keep, flat) {
    // keep: geo is shared (the R6 body parts of unbloxed/avatar.js) or still needed, so bake a copy
    let g = geo.index ? geo.toNonIndexed() : (keep ? geo.clone() : geo);
    if (!keep && g !== geo) geo.dispose();
    Object.keys(g.attributes).forEach(k => { if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); });
    g.applyMatrix4(m); if (flat || !g.attributes.normal) g.computeVertexNormals();
    if (typeof col === 'number') _c.setHex(col).convertSRGBToLinear(); else _c.copy(col); // numbers are sRGB hex, Colors are linear already
    const n = g.attributes.position.count, c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { c[i * 3] = _c.r; c[i * 3 + 1] = _c.g; c[i * 3 + 2] = _c.b; }
    g.setAttribute('color', new T.BufferAttribute(c, 3)); this.b[bk].push(g);
  };
  // a cylinder from a to b (radius r1 at a, r2 at b), its matrix optionally mapped by m0 (char space -> arm space)
  function r6stick(B, bk, a, b, r1, r2, col, seg, m0) {
    const d = new T.Vector3().subVectors(b, a), len = d.length(); d.normalize();
    const m = new T.Matrix4().compose(a.clone().add(b).multiplyScalar(.5), new T.Quaternion().setFromUnitVectors(_up, d), V3(1, 1, 1));
    if (m0) m.premultiply(m0); B.put(bk, G.cyl(r2, r1, len, seg || 6), col, m);
  }
  // makeChar's hair is smooth (up to 10k triangles): the same shapes with fewer segments
  function lowPoly(g) {
    const p = g.parameters; if (!p) return null;
    if (g.type === 'SphereGeometry') return new T.SphereGeometry(p.radius, Math.min(p.widthSegments, 14), Math.min(p.heightSegments, 9), p.phiStart, p.phiLength, p.thetaStart, p.thetaLength);
    if (g.type === 'ConeGeometry') return new T.ConeGeometry(p.radius, p.height, Math.min(p.radialSegments, 7), 1, p.openEnded, p.thetaStart, p.thetaLength);
    if (g.type === 'CylinderGeometry') return new T.CylinderGeometry(p.radiusTop, p.radiusBottom, p.height, Math.min(p.radialSegments, 10), 1, p.openEnded, p.thetaStart, p.thetaLength);
    return null;
  }
  // glowing eyes (Glim): an unlit face decal drawn where makeChar's faces put their eyes
  function glowFace(col) {
    const key = 'glow' + col; if (R6FACE[key]) return R6FACE[key];
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d'), r = (col >> 16) & 255, g = (col >> 8) & 255, b = col & 255;
    for (const ex of [44, 84]) { const gr = x.createRadialGradient(ex, 52, 1, ex, 52, 17); gr.addColorStop(0, '#ffffff'); gr.addColorStop(.38, `rgba(${r},${g},${b},1)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
      x.fillStyle = gr; x.beginPath(); x.ellipse(ex, 52, 14, 17, 0, 0, 7); x.fill(); }
    const t = new T.CanvasTexture(cv); t.encoding = T.sRGBEncoding;
    const m = new T.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }); m.userData.lin = 1; return (R6FACE[key] = m);
  }
  // arm poses [forward (negative = forward/up), outward] for a LEFT arm; mirrored for the right one
  const R6POSE = { down: [0, .05], hold: [-.95, -.05], hip: [.16, .28], staff: [-.3, .04], low: [-.45, .05], wave: [-.12, 2.55], shoulder: [-1.3, -.2], behind: [.42, -.07] };
  function armFrame(c, bk, p) {
    const arm = c[bk], k = bk === 'aL' ? 1 : -1, q = new T.Quaternion().setFromEuler(new T.Euler(p[0], 0, p[1] * k));
    const piv = V3(arm.position.x, arm.position.y + c.body.position.y, arm.position.z), A = new T.Matrix4().compose(piv, q, V3(1, 1, 1));
    return { bk, k, rx: p[0], rz: p[1] * k, piv, A, inv: A.clone().invert(), H: V3(0, -1.38, 0).applyMatrix4(A) };
  }
  // ---------- R6 outfit pieces ----------
  // body accessories, char space (torso x ±1, y 2..4, z ±.5; legs y 0..2): o = {body, gbody, look}
  const R6ACC = {
    apron(a, o) { const lo = o.look.robe ? .58 : .53; o.body(G.box(1.5, 1.72, .05), a.c, M(0, 2.86, .53)); o.body(G.box(1.5, 1.05, .05), a.c, M(0, 1.5, lo));
      for (const k of [-1, 1]) o.body(G.box(.14, .5, .05), a.c, M(k * .55, 3.82, .52, 0, 0, k * .12)); if (a.c2) o.body(G.box(.55, .4, .04), a.c2, M(.32, 1.62, lo + .04)); },
    scarf(a, o) { o.body(G.box(1.36, .34, 1.14), a.c, M(0, 4.04, 0)); o.body(G.box(.34, 1.0, .08), a.c, M(.36, 3.45, .58, .06, 0, .05));
      if (a.c2) o.body(G.box(.35, .16, .09), a.c2, M(.37, 3.0, .6, .06, 0, .05)); if (a.trail) o.body(G.box(.32, .08, 1.7), a.c, M(-.4, 3.92, -1.25, -.42, -.2, .06)); },
    collar(a, o) { o.body(G.box(1.5, .3, 1.16), a.c, M(0, 4.04, 0)); },
    backpack(a, o) { o.body(G.box(1.5, 1.55, .72), a.c, M(0, 3.05, -.88)); o.body(G.cyl(.27, .27, 1.62, 8), a.c2 || 0x7aa070, M(0, 3.98, -.88, 0, 0, Math.PI / 2)); o.body(G.box(.9, .55, .12), shade(a.c, .8), M(0, 2.62, -1.28)); },
    satchel(a, o) { o.body(G.box(.72, .62, .3), a.c, M(.7, 2.0, .62)); o.body(G.box(.74, .14, .32), shade(a.c, .8), M(.7, 2.27, .63)); o.body(G.box(.15, 2.75, .05), shade(a.c, .8), M(0, 3.0, .53, 0, 0, -.72)); o.body(G.box(.15, 2.75, .05), shade(a.c, .8), M(0, 3.0, -.53, 0, 0, -.72)); },
    pouch(a, o) { o.body(G.box(.38, .34, .22), a.c, M(.62, 2.08, .6)); o.body(G.box(.4, .1, .24), a.c2 || shade(a.c, .7), M(.62, 2.25, .6)); },
    creel(a, o) { o.body(G.box(.78, .66, .52), a.c, M(-.66, 1.98, .7)); o.body(G.box(.82, .1, .56), shade(a.c, .78), M(-.66, 2.33, .7)); o.body(G.box(.15, 2.75, .05), shade(a.c, .7), M(0, 3.0, .53, 0, 0, .72)); },
    buttons(a, o) { for (let i = 0; i < 3; i++) for (const k of [-1, 1]) o.body(G.box(.13, .13, .05), a.c, M(k * .42, 3.62 - i * .48, .53)); },
    cape(a, o) { const end = Math.max(.3, (a.end || .5) / R6S), h = 4.05 - end; o.body(G.box(2.06, h, .08), a.c, M(0, end + h / 2, -.58, .05)); o.body(G.box(2.1, .2, 1.18), a.c, M(0, 3.96, -.02)); },
    sash(a, o) { o.body(G.box(.32, 2.7, .06), a.c, M(0, 3.0, .54, 0, 0, -.68)); o.body(G.box(.32, 2.7, .06), a.c, M(0, 3.0, -.54, 0, 0, .68)); o.body(G.box(.3, .7, .05), a.c, M(.72, 1.75, .57, 0, 0, .12)); },
    stripes(a, o) { for (let i = 0; i < (a.n || 2); i++) o.body(G.box(2.04, .2, 1.04), a.c, M(0, 2 + 2 * (.32 + i * .26), 0)); },
    vest(a, o) { for (const k of [-1, 1]) o.body(G.box(.72, 1.92, .06), a.c, M(k * .64, 3.0, .53)); o.body(G.box(2.04, 1.92, .06), a.c, M(0, 3.0, -.53)); for (const k of [-1, 1]) o.body(G.box(.06, 1.92, 1.04), a.c, M(k * 1.0, 3.0, 0)); },
    overalls(a, o) { o.body(G.box(1.12, 1.05, .05), a.c, M(0, 2.52, .53)); for (const k of [-1, 1]) { o.body(G.box(.17, 1.0, .05), a.c, M(k * .4, 3.5, .53)); o.body(G.box(.15, .15, .06), 0xd8b040, M(k * .4, 3.02, .56)); } o.body(G.box(.5, .35, .04), shade(a.c, .85), M(0, 2.6, .565)); },
    whistle(a, o) { o.body(G.box(.06, .9, .04), a.c2 || 0xe04040, M(.14, 3.55, .53, 0, 0, .15)); o.body(G.cyl(.08, .08, .3, 6), a.c || 0xd8d8e0, M(.22, 3.1, .58, 0, 0, Math.PI / 2)); },
    runes(a, o) { for (let i = 0; i < 4; i++) o.gbody(G.box(.12, .36, .04), a.c, M(-.66 + i * .44, .95 + (i % 2) * .22, .6)); },
    spots(a, o) { [[.6, 3.3, .53], [-.55, 2.6, .53], [.7, 1.4, .58], [-.3, .8, .58], [.1, 3.6, -.53], [-.6, 1.7, -.58]].forEach(p => o.gbody(G.ico(.09), a.c, M(p[0], p[1], p[2]))); },
    shoulderMoss(a, o) { o.body(G.sph(.36, 7, 4), a.c, M(1.45, 4.02, 0, 0, 0, 0, 1, .5, 1), true); o.gbody(G.sph(.13, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2), a.c2, M(1.4, 4.28, .12)); o.body(G.cyl(.04, .05, .2, 4), 0xe0e8f0, M(1.4, 4.18, .12)); },
  };
  // head accessories, neck space (head centre (0,.5,0), half-size .6, eyes ~.6, front z .6): o = {head, ghead}
  const R6HACC = {
    goggles(a, o) { const y = .88 + Math.max(0, (a.y === undefined ? .26 : a.y) - .26) * .8, r = y > 1.02 ? .73 : .63;
      o.head(G.cyl(r, r, .13, 12, true), a.c2 || 0x2a2420, M(0, y, -.02, -.08)); for (const k of [-1, 1]) { o.head(G.cyl(.16, .17, .18, 8), a.c || 0x8a6a3a, M(k * .22, y + .01, r - .02, Math.PI / 2 - .08)); o.head(G.disc(.135, 8), a.lens || 0x6ad0e0, M(k * .22, y + .02, r + .075, -.08)); } },
    glasses(a, o) { for (const k of [-1, 1]) o.head(G.ring(.12, .16, 8), a.c || 0xc8a040, M(k * .22, .6, .64)); o.head(G.box(.16, .04, .03), a.c || 0xc8a040, M(0, .62, .64)); },
    snorkel(a, o) { r6stick(B6, 'head', V3(-.72, .3, .2), V3(-.74, 1.35, .05), .06, .06, a.c, 6); r6stick(B6, 'head', V3(-.72, .3, .2), V3(-.38, .22, .62), .06, .06, a.c, 6); },
    flower(a, o) { for (let i = 0; i < 5; i++) { const t = i / 5 * 6.28; o.head(G.sph(.1, 5, 3), a.c, M(.55 + Math.cos(t) * .1, .98 + Math.sin(t) * .1, .3, 0, 0, 0, 1, 1, .5)); } o.head(G.sph(.07, 5, 3), a.c2 || 0xffe060, M(.56, .98, .35)); },
    pencil(a, o) { o.head(G.cyl(.035, .035, .55, 5), 0xf2c23a, M(.63, .72, .1, .3, 0, .9)); },
  };
  let B6 = null; // the builder in use (for the few helpers that need it directly)
  // hats, neck space
  const R6HAT = {
    souwester(h, o) { h(G.sph(.74, 12, 5, 0, Math.PI * 2, 0, Math.PI * .5), o.c, M(0, .8, -.03, -.08, 0, 0, 1, .62, 1.02));
      h(G.cyl(1.0, 1.04, .07, 14), o.c, M(0, .8, -.16, -.15, 0, 0, 1, 1, 1.12)); h(G.cyl(.75, .76, .14, 12, true), o.c2 || shade(o.c, .75), M(0, .87, -.03, -.08)); },
    captain(h, o, gh) { h(G.cyl(.8, .66, .38, 12), o.c, M(0, 1.15, -.03, -.06)); h(G.cyl(.665, .665, .18, 12, true), o.c2, M(0, .9, -.01, -.05));
      h(new T.CylinderGeometry(.56, .56, .05, 10, 1, false, -Math.PI / 2, Math.PI), 0x111418, M(0, .84, .4, -.28, 0, 0, 1, 1, 1.05)); h(G.oct(.11), 0xe0b443, M(0, 1.04, .68, 0, 0, 0, 1, 1, .5), true); },
    cap(h, o) { h(G.sph(.72, 12, 5, 0, Math.PI * 2, 0, Math.PI * .5), o.c, M(0, .82, -.02, -.06, 0, 0, 1, .66, 1.02)); h(G.box(.9, .06, .58), o.c2 || o.c, M(0, .86, .78, -.1)); h(G.box(.56, .3, .06), o.c3 || 0xffffff, M(0, 1.04, .62, -.36)); },
    hood(h, o) { const ps = Math.PI / 2 + .95, pl = Math.PI * 2 - 1.9;
      h(G.sph(.86, 10, 6, ps, pl, 0, Math.PI * .8), o.c, M(0, .58, -.05, 0, 0, 0, 1, 1.06, 1.04)); h(G.sph(.72, 8, 5), o.c2 || 0x16141c, M(0, .56, -.16));
      if (o.peak) h(G.cone(.3, .8, 6), o.c, M(0, 1.36, -.62, -.95), true);
      if (o.fur) h(G.tor(.74, .15, 4, 10), o.fur, M(0, .55, .36, 0, 0, 0, .98, 1.08, 1)); },
    wide(h, o) { h(G.cyl(1.28, 1.32, .07, 14), o.c, M(0, .9, 0, .05, 0, -.05)); h(G.cyl(.34, .62, .8, 9, true), o.c, M(0, 1.32, -.04, -.1, 0, .08));
      h(G.cone(.34, .6, 7), o.c, M(.1, 1.96, -.16, -.55, 0, .3), true); h(G.cyl(.63, .64, .15, 9, true), o.c2, M(0, .99, -.01, -.1, 0, .08));
      if (o.shroom) { h(G.sph(.36, 8, 3, 0, Math.PI * 2, 0, Math.PI / 2), o.shroom, M(.78, .96, .3, 0, 0, -.2, 1, .8, 1)); h(G.cyl(.08, .11, .2, 5, true), 0xf2ead8, M(.78, .88, .3));
        for (const p of [[.68, 1.2, .4], [.95, 1.12, .2], [.66, 1.16, .14]]) h(G.oct(.06), 0xfff4e4, M(p[0], p[1], p[2])); } },
    pith(h, o) { h(G.sph(.76, 12, 5, 0, Math.PI * 2, 0, Math.PI * .5), o.c, M(0, .82, 0, -.05, 0, 0, 1, .74, 1.06)); h(G.cyl(.98, 1.02, .06, 14), o.c, M(0, .83, .02, -.06, 0, 0, 1, 1, 1.12));
      h(G.cyl(.77, .77, .13, 12, true), o.c2, M(0, .9, 0, -.05, 0, 0, 1, 1, 1.06)); h(G.sph(.09, 5, 3), o.c, M(0, 1.38, -.02)); },
    helmet(h, o, gh) { h(G.sph(.75, 12, 5, 0, Math.PI * 2, 0, Math.PI * .5), o.c, M(0, .84, -.01, -.08, 0, 0, 1, .74, 1.02)); h(G.cyl(.86, .88, .06, 14), o.c, M(0, .85, .03, -.08, 0, 0, 1, 1, 1.08));
      h(G.box(.14, .34, .95), shade(o.c, .8), M(0, 1.3, -.02, -.08)); h(G.cyl(.18, .2, .22, 8, true), 0x3a3a40, M(0, 1.06, .72, Math.PI / 2 - .2)); gh(G.disc(.17, 8), 0xfff2b0, M(0, 1.08, .84, -.2)); },
    wrap(h, o) { for (let i = 0; i < 3; i++) h(G.cyl(.72 - i * .07, .74 - i * .07, .25, 12, true), i % 2 ? o.c : shade(o.c, .9), M(0, .86 + i * .2, -.02, -.1 + i * .04, 0, (i - 1) * .06));
      h(G.sph(.58, 10, 4, 0, Math.PI * 2, 0, Math.PI / 2), o.c, M(0, 1.3, -.05, -.08, 0, 0, 1, .48, 1)); h(G.box(.44, .55, .1), o.c, M(0, .48, -.7, .22));
      if (o.veil) h(new T.CylinderGeometry(.67, .69, .5, 12, 1, true, -Math.PI * .55, Math.PI * 1.1), o.veil, M(0, .2, 0)); },
    band(h, o) { h(G.cyl(.66, .67, .12, 12, true), o.c, M(0, .98, -.02, -.1)); if (o.leaf) for (let i = 0; i < 7; i++) { const a = -1.4 + i * .47; h(G.cone(.09, .34, 4), o.leaf, M(Math.sin(a) * .66, 1.12, Math.cos(a) * .66 - .03, .4 * Math.cos(a), 0, -.4 * Math.sin(a)), true); } },
  };
  // things held in a hand, built in char space at the hand (I.H) and stored in that arm's space: I = {P(geo,col,m,glow,flat), S(a,b,r1,r2,col,seg), H, k}
  const R6ITEM = {
    rod(I, it) { const H = I.H, d = V3(I.k * .2, .72, 1).normalize(), tip = H.clone().addScaledVector(d, 4.9);
      I.S(H.clone().addScaledVector(d, -.95), H.clone().addScaledVector(d, .3), .13, .12, 0x6a4428, 8); I.S(H.clone().addScaledVector(d, .3), tip, .075, .03, it.c || 0x2a4a6a, 6);
      const rp = H.clone().addScaledVector(d, -.25); I.P(G.cyl(.18, .18, .24, 8), 0xb8bcc4, M(rp.x, rp.y - .3, rp.z, 0, 0, Math.PI / 2));
      const end = tip.clone().add(V3(0, -2.5, 0)); I.S(tip, end, .02, .02, 0xf0f0f0, 3);
      I.P(G.sph(.17, 8, 3, 0, Math.PI * 2, 0, Math.PI / 2), 0xe0402a, M(end.x, end.y - .1, end.z)); I.P(G.sph(.17, 8, 3, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), 0xf8f8f8, M(end.x, end.y - .1, end.z)); },
    book(I, it) { const H = I.H, x = H.x - I.k * .05; I.P(G.box(1.0, .2, .78), it.c || 0x6a2a2a, M(x, H.y + .22, H.z + .2, -.6, 0, 0)); I.P(G.box(.9, .14, .82), 0xf4ead0, M(x, H.y + .25, H.z + .19, -.6, 0, 0)); },
    spyglass(I) { const H = I.H, a = H.clone().add(V3(0, -.02, -.5)), b = H.clone().add(V3(0, .18, 1.55)); I.S(a, b, .13, .19, 0xc8a040, 8); I.S(b, b.clone().add(V3(0, .01, .1)), .2, .2, 0x3a3a3a, 8); I.P(G.cyl(.155, .155, .16, 8), 0x5a3a24, M(H.x, H.y, H.z + .05, Math.PI / 2, 0, 0)); },
    map(I, it) { const H = I.H; I.P(G.cyl(.17, .17, 1.55, 8), it.c || 0xf0e2b8, M(H.x, H.y + .04, H.z + .06, 0, 0, Math.PI / 2 - .2)); I.P(G.cyl(.185, .185, .14, 8), 0xc04a3a, M(H.x, H.y + .04, H.z + .06, 0, 0, Math.PI / 2 - .2)); },
    shell(I, it) { const H = I.H; I.P(G.cone(.3, .8, 7), it.c || 0xf4a49a, M(H.x, H.y + .55, H.z + .1, -.25, 0, I.k * .45), false, true); I.P(G.sph(.27, 7, 4), it.c2 || 0xfbe0d6, M(H.x, H.y + .2, H.z + .1)); },
    staff(I, it) { const H = I.H, x = H.x, z = H.z, top = 4.15 + (it.h || 1) * 1.1, o = I.k;
      I.S(V3(x, .05, z), V3(x, top, z), .1, .09, it.c || 0x6a4a2a, 7);
      if (it.top === 'crystal') { I.P(G.oct(.3), it.g || 0x7ff0ff, M(x, top + .42, z, 0, .4, 0, .8, 1.5, .8), true); for (let i = 0; i < 3; i++) { const t = i / 3 * 6.28; I.P(G.cone(.06, .5, 4), it.c2 || 0x8a7a5a, M(x + Math.cos(t) * .18, top + .1, z + Math.sin(t) * .18, Math.sin(t) * .5, 0, -Math.cos(t) * .5), false, true); } }
      else if (it.top === 'orb') { I.P(G.ico(.3), it.g || 0xe8f6ff, M(x, top + .38, z), true); I.P(G.tor(.4, .05, 3, 12), it.c2 || 0xd8b040, M(x, top + .38, z, 0, .6, 0)); }
      else if (it.top === 'bell') { I.P(G.tor(.3, .05, 3, 8, Math.PI * 1.4), it.c, M(x + o * .22, top + .02, z, 0, o > 0 ? 0 : Math.PI, -.6)); I.P(G.cone(.17, .26, 6), it.c2 || 0xd8a840, M(x + o * .46, top - .3, z));
        [0xc84a3a, 0x3a8ac8].forEach((cc, i) => I.P(G.box(.1, .42, .03), cc, M(x - .1 + i * .2, top - .5, z + .12, 0, 0, .2 - i * .4))); }
      else if (it.top === 'knob') { I.P(G.ico(.24), it.c, M(x, top + .14, z), false, true); I.P(G.cone(.09, .5, 4), it.c, M(x + o * .18, top - .42, z, 0, 0, -o * .8), false, true); if (it.g) I.P(G.sph(.1, 5, 3), it.g, M(x + o * .08, top + .38, z + .08), true); }
      else if (it.top === 'auger') { I.S(V3(x - .45, top, z), V3(x + .45, top, z), .08, .08, 0x2a2a2a, 6); I.P(G.cone(.22, .9, 6), 0xb8c0c8, M(x, .45, z, Math.PI, 0, 0), false, true); for (let i = 0; i < 3; i++) I.P(G.box(.56, .05, .18), 0xa8b0b8, M(x, .78 + i * .28, z, 0, i * 1.1, .3)); } },
    lantern(I, it) { const H = I.H, x = H.x, y = H.y - .82, z = H.z + .04; I.P(G.box(.05, .5, .05), 0x2a2a2a, M(x, H.y - .32, z));
      I.P(G.cone(.33, .26, 6), it.c || 0x2c2a26, M(x, y + .43, z), false, true); I.P(G.box(.5, .08, .5), it.c || 0x2c2a26, M(x, y - .34, z));
      I.P(G.box(.38, .58, .38), it.g || 0xffd27a, M(x, y, z), true); I.P(G.oct(.14), 0xffffff, M(x, y, z), true); },
    hammer(I, it) { // held upright beside the body: a T that reads from any side
      const H = I.H, d = V3(0, 1, .2).normalize(), e = H.clone().addScaledVector(d, 1.7); I.S(H.clone().addScaledVector(d, -.45), e, .09, .09, 0x6a4428, 6);
      const q = new T.Quaternion().setFromEuler(new T.Euler(Math.atan2(.2, 1), I.k * .45, 0, 'YXZ'));
      I.P(G.box(1.1, .56, .56), it.c || 0x4a4c52, new T.Matrix4().compose(e, q, V3(1, 1, 1)));
      for (const s of [-1, 1]) I.P(G.box(.1, .62, .62), 0x2a2a30, new T.Matrix4().compose(e.clone().add(V3(s * .55, 0, 0).applyQuaternion(q)), q, V3(1, 1, 1))); },
    tongs(I, it) { const H = I.H, e = H.clone().add(V3(-I.k * .06, -.45, 1.0)); for (const s of [-1, 1]) I.S(H.clone().add(V3(s * .07, 0, 0)), e.clone().add(V3(s * .07, 0, 0)), .05, .05, 0x2a2a2a, 4);
      I.P(G.box(.46, .2, .3), it.g || 0xff8a2a, M(e.x, e.y - .06, e.z + .12, 0, .3, 0), true); I.P(G.box(.3, .08, .18), 0xffe28a, M(e.x, e.y + .05, e.z + .12, 0, .3, 0), true); },
    magnifier(I) { const H = I.H, b = H.clone().add(V3(-I.k * .05, .62, .08)); I.S(H.clone().add(V3(0, -.2, 0)), b, .07, .07, 0x5a3a24, 6); const c = b.clone().add(V3(0, .4, .02));
      I.P(G.tor(.33, .055, 3, 12), 0xc8a040, M(c.x, c.y, c.z)); I.P(G.disc(.31, 10), 0xcfe8f0, M(c.x, c.y, c.z + .01)); I.P(G.disc(.31, 10), 0xcfe8f0, M(c.x, c.y, c.z - .01, 0, Math.PI, 0)); },
    jar(I, it) { const H = I.H, y = H.y + .42; I.P(G.cyl(.3, .3, .56, 8), it.g || 0x8ffcf0, M(H.x, y, H.z + .05), true); I.P(G.cyl(.32, .32, .1, 8), 0x5a4a3a, M(H.x, y + .33, H.z + .05)); I.P(G.oct(.15), 0xffffff, M(H.x, y, H.z + .05), true); },
    crystal(I, it) { const H = I.H, c = it.c || 0xb07af0; I.P(G.oct(.3), c, M(H.x, H.y + .52, H.z + .1, 0, .3, .2, .8, 1.6, .8), false, true); I.P(G.oct(.18), shade(c, 1.25), M(H.x + I.k * .22, H.y + .4, H.z + .2, 0, 0, -I.k * .5, .7, 1.4, .7), false, true); },
  };
  // per NPC: makeChar face (0 Smile, 1 Grin, 2 Cool, 3 Mad, 4 Wink, 5 Shocked, 6 Sleepy, 7 Silly) and arm pose overrides
  FN.R6 = {
    angler: { face: 0, aR: [-1.15, -.05] }, shopkeep: { face: 1, aR: [-1.05, -.06] }, harbormaster: { face: 0, aR: [-.95, -.04] }, guide: { face: 1 },
    'npc-coral': { face: 0, aR: [-1.15, -.05] }, 'npc-frost': { face: 2 }, keeper: { face: 6 }, 'npc-dunes': { face: 0 }, 'npc-mire': { face: 7 },
    'npc-crystal': { face: 5, aL: [-1.2, -.05], gogY: .26 }, 'npc-ember': { face: 1, aL: [-.8, -.05], aR: [-.62, .1] }, 'npc-sky': { face: 0 },
    'npc-elder': { face: 4, aL: [-1.05, -.08], aR: [-1.25, -.05] }, 'npc-grotto': { face: 0, aL: [-1.0, -.05] },
  };
  function makeR6(look, id) {
    r6mat(); const X = FN.R6[id] || {};
    const skin = look.skin || 0xe8b48a, top = look.top || 0x3a6ea5, pants = look.pants || 0x34405a, boots = look.boots || 0x3a2a1e;
    const coat = look.coat, robe = look.robe, sleeve = look.bare ? skin : (coat || robe || top), glove = look.glove || skin, hat = look.hat || null;
    const covered = hat && (hat.k === 'hood' || hat.k === 'wrap'); // nothing of the hair shows
    const hair = covered ? 0 : X.hair !== undefined ? X.hair : ({ short: 1, side: 1, long: 3, bun: 4, braids: 9, spiky: 2 })[look.hairStyle || 'short'] || 0;
    const c = makeChar({ head: hx(skin), torso: hx(coat || robe || top), arms: hx(sleeve), legs: hx(robe || pants), hairColor: hx(look.hair || 0x4a2e1c), hat: 0, hats: [], hair, face: X.face | 0, sword: 0, bt: 0 });
    if (c.sw && c.sw.parent) c.sw.parent.remove(c.sw); // no sword
    c.root.updateMatrixWorld(true);
    const B = B6 = new R6B(), neckY = c.body.position.y + 1, toHead = new T.Matrix4().makeTranslation(0, -neckY, 0), col = o => o.material.color;
    const body = (g, cl, m, f) => B.put('body', g, cl, m, false, f), gbody = (g, cl, m) => B.put('gbody', g, cl, m);
    const head = (g, cl, m, f) => B.put('head', g, cl, m, false, f), ghead = (g, cl, m) => B.put('ghead', g, cl, m);
    // the R6 body
    B.put('body', c.torso.geometry, col(c.torso), c.torso.matrixWorld, true);
    for (const l of [c.lL, c.lR]) B.put('body', l.geometry, col(l), l.matrixWorld, true);
    B.put('head', c.head.geometry, col(c.head), toHead.clone().multiply(c.head.matrixWorld), true);
    c.HG.traverse(o => { if (!o.isMesh) return; const lp = lowPoly(o.geometry); B.put('head', lp || o.geometry, col(o), toHead.clone().multiply(o.matrixWorld), !lp); });
    // hair crown: the shared R6 hair cap tilts back and leaves the top of the head bare (Coralie), so cover the crown
    if (!hat && [1, 2, 3, 4, 7].includes(hair)) { const hb = new T.Box3().setFromObject(c.head), rx = (hb.max.x - hb.min.x) / 2, rz = (hb.max.z - hb.min.z) / 2, cx = (hb.min.x + hb.max.x) / 2, cz = (hb.min.z + hb.max.z) / 2, top = hb.max.y - neckY, hcol = look.hair || 0x4a2e1c;
      const dome = new T.SphereGeometry(1, 14, 5, 0, Math.PI * 2, 0, Math.PI / 2); dome.scale(rx * 1.01, .14, rz * 1.01); head(dome, hcol, M(cx, top - .04, cz - rz * .04));
      const band = new T.CylinderGeometry(rx * 1.0, rx * 1.06, .26, 14, 1, true); band.scale(1, 1, rz / rx); head(band, hcol, M(cx, top - .1, cz - rz * .04)); }
    for (const bk of ['aL', 'aR']) B.put(bk, c[bk].geometry, col(c[bk]), new T.Matrix4(), true); // R6 arms hang from their shoulder joint
    // legs: robe or coat skirt, boots / flippers
    if (robe) {
      body(G.box(2.1, 2.0, 1.12), robe, M(0, 1.02, 0)); if (look.hem) body(G.box(2.14, .22, 1.16), look.hem, M(0, .18, 0));
      if (look.hemGlow) gbody(G.box(2.16, .08, 1.18), look.hemGlow, M(0, .4, 0));
      for (const k of [-1, 1]) body(G.box(.8, .24, .3), boots, M(k * .5, .12, .62));
    } else {
      for (const k of [-1, 1]) { if (look.fins) { body(G.box(1.04, .34, 1.06), boots, M(k * .5, .17, 0)); body(G.box(.9, .1, 1.6), look.fins, M(k * .52, .05, .95)); } else body(G.box(1.05, .56, 1.07), boots, M(k * .5, .27, .015)); }
      if (coat) { const end = Math.max(1.05, (look.coatEnd || .5) / R6S), h = 2.02 - end; body(G.box(2.08, h, 1.1), coat, M(0, end + h / 2, 0)); if (look.hem) body(G.box(2.12, .17, 1.14), look.hem, M(0, end + .085, 0)); }
    }
    // torso: open coat front, belt and buckle
    if (coat && look.coatOpen !== false) body(G.box(.58, 1.98, .05), top, M(0, 3.0, .505));
    if (look.belt) body(G.box(2.06, .22, 1.06), look.belt, M(0, 2.12, 0));
    if (look.buckle) body(G.box(.34, .26, .07), look.buckle, M(0, 2.12, .55));
    // arms: hands (bare skin or gloves) and cuffs
    for (const bk of ['aL', 'aR']) { if (glove !== sleeve) B.put(bk, G.box(1.04, .44, 1.04), glove, M(0, -1.29, 0)); if (look.cuff) B.put(bk, G.box(1.06, .16, 1.06), look.cuff, M(0, glove !== sleeve ? -.98 : -1.12, 0)); }
    // outfit pieces
    const oa = { body, gbody, head, ghead, look };
    (look.acc || []).forEach(a => { if (R6ACC[a.k]) R6ACC[a.k](a, oa); if (R6HACC[a.k]) R6HACC[a.k](a.k === 'goggles' && X.gogY !== undefined ? Object.assign({}, a, { y: X.gogY }) : a, oa); });
    // face extras: beard, moustache, glowing eyes
    const bc = look.beardC || look.hair || 0x3a2a1a;
    if (look.beard === 'full' || look.beard === 'long') { head(G.box(1.04, .5, .3), bc, M(0, .12, .5)); head(G.box(.7, .2, .25), bc, M(0, -.1, .55)); if (look.beard === 'long') head(G.box(.66, .42, .22), bc, M(0, -.3, .6, -.12)); }
    if (look.beard === 'full' || look.beard === 'long' || look.beard === 'mustache') for (const k of [-1, 1]) head(G.box(.36, .13, .12), bc, M(k * .17, .37, .63, 0, 0, k * -.12));
    if (look.beard === 'chops') for (const k of [-1, 1]) head(G.box(.12, .5, .4), bc, M(k * .62, .4, .2));
    if (look.hairStyle === 'braids' && covered) for (const k of [-1, 1]) { head(G.box(.24, .9, .24), look.hair || 0xf0d48a, M(k * .58, -.05, .2, 0, 0, k * -.06)); head(G.box(.28, .14, .28), look.tie || 0xd04040, M(k * .6, -.46, .2)); }
    if (hat && R6HAT[hat.k]) R6HAT[hat.k](head, hat, ghead);
    // arms: pose + what each hand holds
    const F = { aL: armFrame(c, 'aL', X.aL || R6POSE[look.armL] || R6POSE.down), aR: armFrame(c, 'aR', X.aR || R6POSE[look.armR] || R6POSE.down) };
    for (const bk of ['aL', 'aR']) {
      const it = look['item' + bk.slice(1)], f = F[bk]; if (!it || !R6ITEM[it.k]) continue;
      R6ITEM[it.k]({ H: f.H, k: f.k, P: (g, cl, m, glow, flat) => B.put((glow ? 'g' : '') + bk, g, cl, f.inv.clone().multiply(m), false, flat), S: (a, b, r1, r2, cl, seg) => r6stick(B, bk, a, b, r1, r2, cl, seg, f.inv) }, it);
      f.held = true;
    }
    // ---------- assemble: rig (studs, scaled) > body mesh, head pivot (neck), arm pivots (shoulders) ----------
    const sc = 1 + ((look.s || 1) - 1) * .7, root = new T.Group(), rig = new T.Group(); root.add(rig); rig.scale.setScalar(R6S * sc);
    const bm = new T.Mesh(merge(B.b.body), R6MAT); rig.add(bm);
    const hp = new T.Group(); hp.position.set(0, neckY, 0); rig.add(hp); hp.add(new T.Mesh(merge(B.b.head), R6MAT));
    let fm = look.eyeGlow ? glowFace(look.eyeGlow) : R6FACE[X.face | 0];
    if (!fm) { fm = R6FACE[X.face | 0] = c.face.material; fm.userData.lin = 1; } // the first NPC with this face lends its decal to the rest
    const face = new T.Mesh(c.face.geometry, fm); face.applyMatrix4(toHead.clone().multiply(c.face.matrixWorld)); face.renderOrder = 1; hp.add(face);
    let gm = null; if (B.b.gbody.length) { gm = new T.Mesh(merge(B.b.gbody), GLOW); rig.add(gm); } if (B.b.ghead.length) hp.add(new T.Mesh(merge(B.b.ghead), GLOW));
    const arms = [];
    for (const bk of ['aL', 'aR']) { const f = F[bk], g = new T.Group(); g.position.copy(f.piv); g.rotation.set(f.rx, 0, f.rz); rig.add(g);
      g.add(new T.Mesh(merge(B.b[bk]), R6MAT)); if (B.b['g' + bk].length) g.add(new T.Mesh(merge(B.b['g' + bk]), GLOW));
      arms.push({ g, rx: f.rx, rz: f.rz, k: f.k, held: !!f.held, wave: (bk === 'aL' ? look.armL : look.armR) === 'wave' }); }
    B6 = null;
    // free what makeChar made for this NPC alone (its R6 body geometries are shared; one face decal per face is kept)
    c.root.traverse(o => { if (!o.isMesh) return; const m = o.material; if (m && m !== fm && !Object.values(R6FACE).includes(m)) { if (m.map) m.map.dispose(); m.dispose(); } });
    c.HG.traverse(o => { if (o.isMesh) o.geometry.dispose(); }); c.sw.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
    root.updateMatrixWorld(true); const box = new T.Box3().setFromObject(rig);
    let tris = 0; root.traverse(o => { if (o.isMesh) tris += o.geometry.index ? o.geometry.index.count / 3 : o.geometry.attributes.position.count / 3; });
    let meshes = 0; root.traverse(o => { if (o.isMesh) meshes++; });
    root.userData = { rig, head: hp, body: bm, glow: gm, arms, tris: Math.round(tris), meshes, top: Math.max(box.max.y, 3.2 * sc), phase: Math.random() * 10, look, s0: rig.scale.y, r6: 1, yawMax: look.beard === 'full' || look.beard === 'long' ? .7 : 1.1 };
    bm.onBeforeRender = animR6(root);
    if (!r6CullOn && window.FUX && FUX.add) { r6CullOn = true; FUX.add('tick', r6Cull); }
    return root;
  }
  function mePos() { try { return typeof me !== 'undefined' && me && me.pos ? me.pos : null; } catch (e) { return null; } }
  // R6 idle: looks around and turns its head to you when you come close, arms drift a little (a hand that holds
  // something barely moves), the free arm gestures while talking, the guide waves when you are near
  function animR6(root) {
    return function (r, s, cam) {
      const u = root.userData, t = performance.now() / 1000 + u.phase, hp = u.head;
      const d2 = cam ? (cam.position.x - root.position.x) ** 2 + (cam.position.z - root.position.z) ** 2 : 0;
      if (u.label) labelFit(u, cam, d2);
      if (d2 > 160 * 160) return;
      const talk = FN._talking === u.id;
      let yaw = Math.sin(t * .35) * .45 + Math.sin(t * 1.3) * .05, tilt = Math.sin(t * .5) * .04, near = false;
      const pp = FN._pp || mePos();
      if (pp) { const dx = pp.x - root.position.x, dz = pp.z - root.position.z; if (dx * dx + dz * dz < 14 * 14) { near = true; let a = Math.atan2(dx, dz) - root.rotation.y; a = Math.atan2(Math.sin(a), Math.cos(a)); yaw = Math.max(-u.yawMax, Math.min(u.yawMax, a)); tilt = talk ? Math.sin(t * 6) * .07 : -.05; } }
      hp.rotation.y += (yaw - hp.rotation.y) * .08; hp.rotation.x = tilt; hp.rotation.z = Math.sin(t * .8) * .03;
      for (const a of u.arms) {
        if (a.wave) { const w = near || talk ? 1 : .25; a.g.rotation.z = a.rz + a.k * (Math.sin(t * 7) * .2 * w - .1 * (1 - w)); a.g.rotation.x = a.rx + Math.sin(t * 3.5) * .05; continue; }
        a.g.rotation.x = a.rx + Math.sin(t * 1.6 + a.k) * (a.held ? .02 : .05) + (talk && !a.held ? Math.sin(t * 5) * .12 - .14 : 0);
        a.g.rotation.z = a.rz + Math.sin(t * 1.1 + a.k * 2) * .02 * a.k;
      }
      u.rig.rotation.z = Math.sin(t * .7) * .012;
      if (u.glow) u.glow.scale.setScalar(1 + Math.sin(t * 9) * .006);
      if (u.marker && u.marker.visible) u.marker.position.y = u.my + Math.sin(t * 3) * .15;
    };
  }
  // far NPCs are not drawn at all (the fog hides them long before this)
  let r6CullOn = false;
  function r6Cull() {
    let cam = null; try { cam = camera; } catch (e) { return; } if (!cam || !cam.position) return;
    for (const n of FN.list) { const u = n.g.userData; if (!u.r6) continue; const dx = cam.position.x - n.g.position.x, dz = cam.position.z - n.g.position.z, vis = dx * dx + dz * dz < 300 * 300;
      if (u.rig.visible !== vis) { u.rig.visible = vis; if (!vis && u.label) u.label.visible = false; } }
  }

  // ---------- idle animation ----------
  FN._pp = null; FN._talking = null;
  function animHook(root) {
    return function (r, scene, cam) {
      const u = root.userData, t = performance.now() / 1000 + u.phase, rig = u.rig, hp = u.head;
      const d2 = cam ? (cam.position.x - root.position.x) ** 2 + (cam.position.z - root.position.z) ** 2 : 0;
      if (u.label) labelFit(u, cam, d2);
      if (d2 > 160 * 160) return;
      const talk = FN._talking === u.id, b = Math.sin(t * (talk ? 4 : 1.9));
      rig.scale.y = u.s0 * (1 + b * (talk ? .02 : .012)); rig.rotation.z = Math.sin(t * .7) * .018;
      let yaw = Math.sin(t * .35) * .45 + Math.sin(t * 1.3) * .05, tilt = Math.sin(t * .5) * .06;
      const pp = FN._pp; if (pp) { const dx = pp.x - root.position.x, dz = pp.z - root.position.z; if (dx * dx + dz * dz < 14 * 14) { let a = Math.atan2(dx, dz) - root.rotation.y; a = Math.atan2(Math.sin(a), Math.cos(a)); yaw = Math.max(-1, Math.min(1, a)); tilt = talk ? Math.sin(t * 6) * .07 : -.05; } }
      hp.rotation.y += (yaw - hp.rotation.y) * .08; hp.rotation.x = tilt; hp.rotation.z = Math.sin(t * .8) * .04;
      if (u.glow) u.glow.scale.setScalar(1 + Math.sin(t * 9) * .006);
      if (u.marker && u.marker.visible) { u.marker.position.y = u.my + Math.sin(t * 3) * .15; }
    };
  }

  // ---------- labels & markers ----------
  function rr(x, X, y, w, h, r) { x.beginPath(); x.moveTo(X + r, y); x.arcTo(X + w, y, X + w, y + h, r); x.arcTo(X + w, y + h, X, y + h, r); x.arcTo(X, y + h, X, y, r); x.arcTo(X, y, X + w, y, r); x.closePath(); }
  function labelSprite(name, role, acc) {
    const c = document.createElement('canvas'), x = c.getContext('2d'), F1 = '700 40px Oswald, Impact, "Arial Narrow", system-ui, sans-serif', F2 = '600 22px Inter, system-ui, sans-serif';
    x.font = F1; const w1 = x.measureText(name).width; x.font = F2; const w2 = x.measureText(role.toUpperCase()).width;
    const W = Math.min(512, Math.ceil(Math.max(w1, w2 * 1.08) + 44)), Hh = 96; c.width = W; c.height = Hh;
    x.fillStyle = 'rgba(8,20,30,.72)'; rr(x, 0, 2, W, 86, 20); x.fill(); x.fillStyle = acc; rr(x, 0, 80, W, 8, 4); x.fill();
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = F1; x.lineWidth = 6; x.lineJoin = 'round'; x.strokeStyle = 'rgba(0,0,0,.5)'; x.strokeText(name, W / 2, 30); x.fillStyle = '#fff'; x.fillText(name, W / 2, 30);
    x.font = F2; x.fillStyle = acc; x.fillText(role.toUpperCase(), W / 2, 63);
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.isLabel = true; t.minFilter = T.LinearFilter; t.generateMipmaps = false;
    const m = new T.SpriteMaterial({ map: t, depthWrite: false, transparent: true }); m.userData.lin = 1; const s = new T.Sprite(m); s.scale.set(W / Hh * .72, .72, 1); s.userData.k = W / Hh; s.userData.a = 1; s.renderOrder = 5; return s;
  }
  // one tag style for every NPC: plate keeps a sane on-screen size (grows with distance, clamped), fades out far away,
  // and the farther of two overlapping tags is hidden (checked 4x a second, see labelOverlap)
  function labelFit(u, cam, d2) {
    const L = u.label;
    if (d2 > 70 * 70 || !cam) { L.visible = false; return; }
    const d = Math.sqrt(d2) + 1, px = d < 10 ? 46 : 46 - 16 * Math.min(1, (d - 10) / 50), fov = (cam.fov || 60) * Math.PI / 360;
    const hs = Math.max(.42, Math.min(2.6, px * d * 2 * Math.tan(fov) / (window.innerHeight || 768) * 1.0));
    const k = L.userData.k || 1; L.scale.set(hs * k, hs, 1);
    const far = d < 45 ? 1 : Math.max(0, (70 - d) / 25), a = far * (u.labHide ? 0 : 1);
    L.userData.a += (a - L.userData.a) * .25; if (Math.abs(a - L.userData.a) < .02) L.userData.a = a;
    L.material.opacity = L.userData.a; L.visible = L.userData.a > .03;
  }
  let ovT = 0;
  function labelOverlap() {
    let cam = null; try { cam = camera; } catch (e) { return; } if (!cam || !cam.projectionMatrix) return;
    const W = window.innerWidth, H = window.innerHeight, v = new T.Vector3(), c = [];
    for (const n of FN.list) { const u = n.g.userData, L = u.label; if (!L) continue; u.labHide = false;
      L.getWorldPosition(v); const dd = v.distanceTo(cam.position); v.project(cam); if (v.z > 1 || v.z < -1 || dd > 70) continue;
      const hh = L.scale.y / (2 * dd * Math.tan((cam.fov || 60) * Math.PI / 360)) * H, ww = hh * L.scale.x / L.scale.y;
      c.push({ u, d: dd, x: (v.x * .5 + .5) * W, y: (.5 - v.y * .5) * H, w: ww, h: hh }); }
    c.sort((a, b) => a.d - b.d);
    for (let i = 1; i < c.length; i++) for (let j = 0; j < i; j++) { if (c[j].u.labHide) continue;
      if (Math.abs(c[i].x - c[j].x) < (c[i].w + c[j].w) / 2 + 4 && Math.abs(c[i].y - c[j].y) < (c[i].h + c[j].h) / 2 + 2) { c[i].u.labHide = true; break; } }
  }
  if (!ovT) ovT = setInterval(labelOverlap, 250);
  let MK = null;
  function markerSprite() {
    if (!MK) { const c = document.createElement('canvas'); c.width = 64; c.height = 96; const x = c.getContext('2d');
      x.fillStyle = '#ffd23a'; x.strokeStyle = '#5a3a00'; x.lineWidth = 5; x.beginPath(); x.moveTo(32, 92); x.lineTo(18, 70); x.arc(32, 36, 30, Math.PI * .78, Math.PI * .22); x.closePath(); x.fill(); x.stroke();
      x.fillStyle = '#3a2400'; x.font = '900 52px Impact, system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('!', 32, 40);
      const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.isLabel = true; MK = new T.SpriteMaterial({ map: t, depthWrite: false, transparent: true }); MK.userData.lin = 1; }
    const s = new T.Sprite(MK); s.scale.set(.8, 1.2, 1); s.renderOrder = 6; return s;
  }

  // ---------- registry / placement ----------
  FN.list = FN.list || [];
  FN.place = function (scene, island, heightAt) {
    const out = [], H = heightAt || (window.FW && FW.heightAt) || (() => 0);
    (island.npcs || []).forEach(d => { try { // one NPC that fails never takes the rest of its island with it
      const old = FN.list.findIndex(n => n.id === d.id); if (old >= 0) { const o = FN.list[old]; o.g.parent && o.g.parent.remove(o.g); FN.list.splice(old, 1); }
      const look = FN.LOOKS[d.id] || FN.LOOKS.guide, y = H(d.x, d.z) || 0;
      let g = null; try { g = FN.make(look, d.id); } catch (e) { console.warn('[npc] build failed, using the v2 model', d.id, e); g = makeV2(look, d.id); }
      g.position.set(d.x, y, d.z);
      let yaw = d.yaw; if (yaw === undefined && island.c) yaw = Math.atan2(island.c[0] - d.x, island.c[1] - d.z); g.rotation.y = yaw || 0;
      const u = g.userData; u.id = d.id; u.s0 = u.rig.scale.y;
      const lab = labelSprite(FN.NAMES[d.id] || d.id, FN.ROLES[d.id] || '', '#' + (FN.ACC[d.id] || 0x2ad4c4).toString(16).padStart(6, '0'));
      lab.position.y = u.top + .45; g.add(lab); u.label = lab;
      const mk = markerSprite(); u.my = u.top + 1.45; mk.position.y = u.my; mk.visible = false; g.add(mk); u.marker = mk;
      g.name = 'npc:' + d.id; scene.add(g);
      const e = { id: d.id, name: FN.NAMES[d.id] || d.id, isl: island.id, x: d.x, y, z: d.z, g, def: d }; FN.list.push(e); out.push(e);
    } catch (err) { console.warn('[npc] could not place', d && d.id, err); } });
    return out;
  };
  FN.nearest = function (pos, maxDist) { if (pos) FN._pp = pos; let best = null, bd = maxDist === undefined ? 6 : maxDist;
    for (const n of FN.list) { if (!n.g.parent || !n.g.visible) continue; const d = Math.hypot(pos.x - n.g.position.x, pos.z - n.g.position.z); if (d < bd) { bd = d; best = n; } } return best; };
  FN.mark = function (id, on) { const n = FN.list.find(q => q.id === id); if (n) n.g.userData.marker.visible = !!on; };
  FN.update = function (t, dt, playerPos) { if (playerPos) FN._pp = playerPos; };
  FN.get = id => FN.list.find(q => q.id === id) || null;

  // ---------- dialog window ----------
  let D = null, typer = 0, cur = null;
  const CSS = `
.fn-dlg{position:fixed;left:50%;bottom:max(clamp(14px,4vh,36px),68px);transform:translate(-50%,16px);width:min(760px,94vw);z-index:30;opacity:0;pointer-events:none;transition:opacity .18s,transform .18s;
 background:linear-gradient(180deg,rgba(20,42,58,.96),rgba(10,22,33,.97));border:1px solid rgba(255,255,255,.14);border-top:3px solid var(--fn-acc,#2ad4c4);border-radius:18px;
 box-shadow:0 18px 50px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.07);padding:30px 26px 18px;color:#eef6f8;font-family:Inter,system-ui,"Segoe UI",Arial,sans-serif;user-select:none}
.fn-dlg.on{opacity:1;transform:translate(-50%,0);pointer-events:auto}
.fn-tab{position:absolute;left:20px;top:-22px;display:flex;align-items:center;gap:10px;background:var(--fn-acc,#2ad4c4);color:#06161c;border-radius:12px;padding:6px 16px 6px 8px;box-shadow:0 6px 18px rgba(0,0,0,.35)}
.fn-ico{width:30px;height:30px;border-radius:9px;background:rgba(0,0,0,.18);display:grid;place-items:center;font-size:18px}
.fn-name{font:700 21px/1 Oswald,Impact,"Arial Narrow",system-ui,sans-serif;letter-spacing:.6px;text-transform:uppercase}
.fn-role{font:600 11.5px/1 Inter,system-ui,sans-serif;letter-spacing:1.2px;text-transform:uppercase;opacity:.72;margin-left:2px}
.fn-x{position:absolute;right:12px;top:10px;width:30px;height:30px;border-radius:9px;border:0;background:rgba(255,255,255,.08);color:#cfe3ea;font:700 15px system-ui;cursor:pointer}
.fn-x:hover{background:rgba(255,90,90,.55);color:#fff}
.fn-txt{font-size:18.5px;line-height:1.55;min-height:3.1em;color:#f2f8fa;white-space:pre-wrap;cursor:pointer;text-shadow:0 1px 0 rgba(0,0,0,.3)}
.fn-txt b{color:var(--fn-acc,#2ad4c4)}
.fn-more{position:absolute;right:24px;bottom:14px;color:var(--fn-acc,#2ad4c4);font-size:14px;animation:fnb .8s ease-in-out infinite alternate;display:none}
@keyframes fnb{to{transform:translateY(4px)}}
.fn-opts{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
.fn-opts:empty{display:none}
.fn-opt{display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);color:#eef6f8;border-radius:11px;padding:9px 16px 9px 9px;cursor:pointer;
 font:700 15px/1 Oswald,Impact,"Arial Narrow",system-ui,sans-serif;letter-spacing:.5px;text-transform:uppercase;transition:background .12s,transform .12s;animation:fnin .22s both}
.fn-opt:hover,.fn-opt:focus-visible{background:var(--fn-acc,#2ad4c4);color:#06161c;transform:translateY(-1px);outline:none}
.fn-opt.main{background:var(--fn-acc,#2ad4c4);color:#06161c;border-color:transparent}
.fn-opt.main:hover{filter:brightness(1.1)}
.fn-opt.dim{background:transparent;color:#a9c0c8}
.fn-k{min-width:22px;height:22px;border-radius:6px;background:rgba(0,0,0,.28);display:grid;place-items:center;font:700 12px/1 Inter,system-ui,sans-serif;color:inherit}
@keyframes fnin{from{opacity:0;transform:translateY(5px)}}
@media (max-width:520px){.fn-dlg{padding:28px 16px 14px}.fn-txt{font-size:16px}.fn-name{font-size:18px}}`;
  function ensure() {
    if (D) return D;
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    D = document.createElement('div'); D.className = 'fn-dlg'; D.id = 'fn-dlg';
    D.innerHTML = '<div class="fn-tab"><span class="fn-ico"></span><span class="fn-name"></span><span class="fn-role"></span></div><button class="fn-x" title="Close (Esc)">✕</button><div class="fn-txt"></div><div class="fn-more" title="Click or press Space to continue"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></div><div class="fn-opts"></div>';
    document.body.appendChild(D);
    D.querySelector('.fn-x').onclick = () => FN.close();
    D.querySelector('.fn-txt').onclick = advance;
    window.addEventListener('keydown', e => {
      if (!cur) return; const k = e.key;
      if (k === 'Escape') { FN.close(); } else if (k === ' ' || k === 'Enter') { if (!cur.done || cur.i < cur.lines.length - 1) advance(); else { const b = D.querySelector('.fn-opt'); b && b.click(); } }
      else if (/^[1-9]$/.test(k)) { const b = D.querySelectorAll('.fn-opt')[+k - 1]; if (b && cur.done && cur.i >= cur.lines.length - 1) b.click(); else return; } else return;
      e.preventDefault(); e.stopImmediatePropagation();
    }, true);
    return D;
  }
  function esc(s) { return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
  function showLine() {
    const tx = D.querySelector('.fn-txt'), more = D.querySelector('.fn-more'), op = D.querySelector('.fn-opts'); clearInterval(typer);
    const raw = String(cur.lines[cur.i] || ''), plain = raw.replace(/\*\*/g, ''); let n = 0; cur.done = false; more.style.display = 'none'; op.innerHTML = '';
    const fmt = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    const fin = () => { clearInterval(typer); cur.done = true; tx.innerHTML = fmt(raw); if (cur.i < cur.lines.length - 1) more.style.display = 'block'; else opts(); };
    if (cur.instant) return fin();
    typer = setInterval(() => { n += 2; if (n >= plain.length) return fin(); tx.textContent = plain.slice(0, n); }, 22);
    cur.fin = fin;
  }
  function advance() { if (!cur) return; if (!cur.done) { cur.fin && cur.fin(); return; } if (cur.i < cur.lines.length - 1) { cur.i++; showLine(); } }
  function opts() {
    const op = D.querySelector('.fn-opts'); op.innerHTML = '';
    const list = cur.options && cur.options.length ? cur.options : [{ label: 'Goodbye' }];
    list.forEach((o, i) => { const b = document.createElement('button'); b.className = 'fn-opt' + (o.main || (i === 0 && list.length > 1 && o.main !== false) ? ' main' : '') + (o.dim ? ' dim' : ''); b.style.animationDelay = (i * .05) + 's';
      b.innerHTML = '<span class="fn-k">' + (i + 1) + '</span>' + esc(o.label); b.disabled = !!o.disabled;
      b.onclick = () => { if (o.keep) { o.fn && o.fn(); return; } FN.close(true); o.fn && o.fn(); };
      op.appendChild(b); });
  }
  // opts: {text|lines, options:[{label, fn, keep?, main?, dim?}], name?, role?, icon?, instant?, onClose?}
  FN.talk = function (npcId, opts) {
    opts = opts || {}; ensure();
    let lines = opts.lines || (opts.text !== undefined ? [opts.text] : null);
    if (!lines) { const g = FN.GREET[npcId] || ['...']; lines = [g[Math.floor(Math.random() * g.length)]]; }
    if (!Array.isArray(lines)) lines = [lines];
    const acc = '#' + (FN.ACC[npcId] || 0x2ad4c4).toString(16).padStart(6, '0');
    D.style.setProperty('--fn-acc', acc);
    D.querySelector('.fn-ico').textContent = opts.icon || FN.ICON[npcId] || '';
    D.querySelector('.fn-name').textContent = opts.name || FN.NAMES[npcId] || npcId;
    D.querySelector('.fn-role').textContent = opts.role !== undefined ? opts.role : (FN.ROLES[npcId] || '');
    const prev = cur; cur = { id: npcId, lines, i: 0, options: opts.options, instant: opts.instant, onClose: opts.onClose };
    if (prev && prev.onClose && prev.id !== npcId) prev.onClose();
    FN._talking = npcId; D.classList.add('on'); showLine(); return D;
  };
  FN.close = function (silent) { if (!D || !cur) return; clearInterval(typer); const c = cur; cur = null; FN._talking = null; D.classList.remove('on'); if (c.onClose && !silent) c.onClose(); };
  FN.isOpen = () => !!cur;

  // ---------- the cast ----------
  FN.NAMES = {
    angler: 'Old Bram', shopkeep: 'Marigold', harbormaster: 'Cpt. Brask', guide: 'Juni',
    'npc-coral': 'Coralie', 'npc-frost': 'Greta Rimeholt', keeper: 'Vesper', 'npc-dunes': 'Kesh',
    'npc-mire': 'Granny Fenwick', 'npc-crystal': 'Quill Shardwick', 'npc-ember': 'Tova Anvilheart', 'npc-sky': 'Aeris',
    'npc-elder': 'Prof. Mossgrave', 'npc-grotto': 'Glim',
  };
  FN.ROLES = {
    angler: 'Harbor Angler', shopkeep: 'Bait & Tackle', harbormaster: 'Harbormaster', guide: 'Island Guide',
    'npc-coral': 'Reef Diver', 'npc-frost': 'Ice Fisher', keeper: 'Keeper of the Door', 'npc-dunes': 'Dune Nomad',
    'npc-mire': 'Bog Herbalist', 'npc-crystal': 'Gem Prospector', 'npc-ember': 'Forgemaster', 'npc-sky': 'Cloud Warden',
    'npc-elder': 'Relic Scholar', 'npc-grotto': 'Grotto Hermit',
  };
  FN.ICON = { angler: '', shopkeep: '', harbormaster: '', guide: '', 'npc-coral': '', 'npc-frost': '', keeper: '', 'npc-dunes': '',
    'npc-mire': '', 'npc-crystal': '', 'npc-ember': '', 'npc-sky': '', 'npc-elder': '', 'npc-grotto': '' };
  FN.ACC = { angler: 0xf2c230, shopkeep: 0xf07a5a, harbormaster: 0x7fb2ff, guide: 0x2ad4c4, 'npc-coral': 0xff8a7a, 'npc-frost': 0x9fe0ff, keeper: 0x7ff0e0, 'npc-dunes': 0xf0b45a,
    'npc-mire': 0x9ad85a, 'npc-crystal': 0xc89aff, 'npc-ember': 0xff8a3a, 'npc-sky': 0xbfe4ff, 'npc-elder': 0xb8d86a, 'npc-grotto': 0x8ffcf0 };
  FN.PERSONA = {
    angler: 'Gruff old sea-dog with a story for every scar; secretly delighted whenever a newcomer lands a big one.',
    shopkeep: 'Bubbly bargain-lover who names every lure and cannot resist a fish pun.',
    harbormaster: 'Stiff, by-the-book captain who pretends not to love his boats (he talks to them).',
    guide: 'Fast-talking, endlessly upbeat young explorer who has mapped every island twice.',
    'npc-coral': 'Sun-soaked, unhurried reef diver; fiercely protective of her lagoon.',
    'npc-frost': 'Stoic ice fisher with bone-dry humour who claims to hate the cold.',
    keeper: 'Centuries-old warden of the sealed mountain door; speaks in riddles and patience.',
    'npc-dunes': 'Calm nomad who reads the stars and the wind ripples in the sand.',
    'npc-mire': 'Cackling, kindly swamp grandmother who brews things nobody should drink.',
    'npc-crystal': 'Jittery prospector who talks to gems like old friends.',
    'npc-ember': 'Booming, fearless smith who laughs at lava and forges rods by the volcano.',
    'npc-sky': 'Serene, dreamy warden of Skyfall Pond who watches the falls and rides the updraft to the cloud isle above.',
    'npc-elder': 'Scatterbrained scholar obsessed with the giant statues and their relics.',
    'npc-grotto': 'Tiny, glowing hermit who has lived in the dark so long they shine; whispers.',
  };
  FN.GREET = {
    angler: ['Hrmph. Another greenhorn with a shiny rod. Let\'s see if you can actually **catch** something.', 'Fifty years on these docks and the sea still surprises me. Got work for you, if you\'re up for it.', 'The tide\'s turning. Fish bite when the water moves — remember that.', 'Bring me something worth bragging about and I\'ll make it worth your while.'],
    shopkeep: ['Welcome, welcome! Fresh bait, shiny rods, and prices so low they\'re practically **bottom-feeders**!', 'Ooh, is that a catch I smell? I\'ll buy it — scales, fins and all!', 'Every lure in here has a name. That one\'s Gerald. Gerald has never failed me.', 'Sell big, buy bigger! That\'s the Marigold way.'],
    harbormaster: ['Harbor rules: no running on the pier, no fish in the ticket office, and **respect the boats**.', 'Need a vessel? Sign here, here and... here. She\'s a good boat. Don\'t tell her I said so.', 'The sea is wide, sailor. Islands out there you\'ve never dreamed of — if your hull can take it.', 'Fog rolling in from the north. Keep your lantern lit if you sail tonight.'],
    guide: ['Hey hey! New here? I\'m **Juni** — I\'ll get you from zero to master angler in no time!', 'Pro tip: fish care about the weather, the time, and where you cast. Mix it up!', 'I\'ve mapped every island twice. Well — every island I\'ve *found*...', 'Stuck? Come find me anytime. I literally never stop talking about fishing.'],
    'npc-coral': ['Easy, friend. The lagoon likes slow movers. Breathe, cast, wait.', 'See that wreck on the sand? Something still lives in its belly. Something **shiny**.', 'Treat the reef kindly and it gives back. Stomp on it and... well, it remembers.', 'Sun\'s good, water\'s warm. Best office in the world.'],
    'npc-frost': ['Cold? This is a warm day. Drill a hole, drop a line, stop complaining.', 'I came here for one season. That was nineteen winters ago.', 'The ice sings at night. When it does, the strange fish come up to listen.', 'Mind the door in the mountain. The old one there doesn\'t like visitors who rush.'],
    keeper: ['The door has been shut since before the ice. It opens for patience — not for force.', 'Many knock. Few listen. Which are you, little angler?', 'Beneath the mountain, a pond glows that has never seen the sun. Prove you are worthy of it.', 'I have watched this door for longer than your grandmother\'s grandmother has had a name.'],
    'npc-dunes': ['The wind writes on the dunes. Tonight it says the oasis will be generous.', 'Out here water is treasure, and the fish that live in it are kings.', 'Walk soft. The old temple sleeps under the sand, and it dreams of the sea.', 'Peace, traveler. Share my shade a while.'],
    'npc-mire': ['Heh heh heh! A visitor! Mind the bog, dearie — it bites back.', 'Mushroom tea? No? More for Granny, then.', 'The swamp glows at night, and the fish follow the glow. Silly things. Delicious things.', 'Bring Granny something slimy and she\'ll brew you something **wonderful**.'],
    'npc-crystal': ['Shh! Shh! Don\'t startle them — the crystals, I mean. They\'re very sensitive.', 'This one\'s Bertrand. That one\'s Lady Violet. The lake? The lake is the **queen**.', 'The light in the hollow bends funny. So do the fish. Wonderful, isn\'t it?!', 'Careful where you swing that rod, everything in here is worth a fortune!'],
    'npc-ember': ['HA! Another brave one! Most folk turn back at the smell of sulfur!', 'Rods forged in volcano-fire don\'t snap. Neither do I!', 'The sea boils near the lava falls. The fish there are tougher than my anvil.', 'Bring me heat-loving fish and I\'ll hammer you something legendary.'],
    'npc-sky': ['Welcome to Skyfall Pond. The wind told me you were coming.', 'See the falls tumbling from the cloud isle? The updraft beside them can carry you up — I will show you how.', 'When the wind changes, the cloud fish change. Listen, and you will know.', 'Sit by the water a while. Even the falls sound like they are whispering.'],
    'npc-elder': ['Careful! That rock is four thousand years old! ...Actually, so is that one. And that one.', 'The statues are not just statues. Offer them what the sea gives back, and they **answer**.', 'I\'ve catalogued nine hundred carvings. Nine hundred and one — you\'re standing on one.', 'Relics, friend! The old builders threw their treasures into the sea. Fish them up!'],
    'npc-grotto': ['...oh! a visitor. nobody visits. hello. hello hello.', 'the pond hums when you are quiet. listen...', 'i was a fisher once. then the light got in. now i glow. it\'s nice.', 'the fish here have never seen the sun. be gentle with them.'],
  };

  // looks: see FN.make for the schema
  FN.LOOKS = {
    angler: { g: 1.18, legL: .95, skin: 0xd99a68, hair: 0xe8e2d8, beard: 'full', beardC: 0xeeeae2, brow: .25, browC: 0xf4f0ea, nose: 1.5, hairStyle: 'side', cheek: 0xe07a5a,
      top: 0x2c3f66, coat: 0xf0b928, coatEnd: .45, hem: 0xc8921a, pants: 0x3d5a3a, boots: 0x2f4a2c, glove: 0xd99a68,
      hat: { k: 'souwester', c: 0xf2c230, c2: 0xc89a1c }, armR: 'hold', armL: 'down', itemR: { k: 'rod', c: 0x2a4a6a }, acc: [{ k: 'creel', c: 0x9a7040 }] },
    shopkeep: { g: 1.32, legL: .82, torL: .85, skin: 0xf3c8a4, hair: 0xb5482a, hairStyle: 'bun', brow: -.1, cheek: 0xf27a7a, eye: 0x2a1a14,
      top: 0xd04a3c, robe: 0x2a8a84, hem: 0xf2c94a, pants: 0x2a8a84, boots: 0x5a3020,
      armL: 'hip', armR: 'hold', itemR: { k: 'book', c: 0x8a5a2a }, acc: [{ k: 'apron', c: 0xf7f0e2, c2: 0xe8d9b8 }, { k: 'glasses', c: 0xd8a830 }, { k: 'pouch', c: 0xe0b03a, x: .44 }, { k: 'pencil' }, { k: 'flower', c: 0xffd23a, c2: 0xf07a3a }] },
    harbormaster: { g: 1.05, legL: 1.12, torL: .98, skin: 0xe3b391, hair: 0x9a9a9a, hairStyle: 'side', beard: 'mustache', beardC: 0xb4b4b4, brow: .32, browC: 0xc8c8c8, nose: 1.2,
      top: 0xf2f2ee, coat: 0x1f2d4f, coatEnd: .62, hem: 0x16223e, pants: 0x2a2a32, boots: 0x15151a, belt: 0x15151a, buckle: 0xd8b040, cuff: 0xd8b040,
      hat: { k: 'captain', c: 0xf4f4f0, c2: 0x15151a }, armL: 'behind', armR: 'hold', itemR: { k: 'spyglass' }, acc: [{ k: 'buttons', c: 0xe0b443 }] },
    guide: { s: .93, g: .95, skin: 0x8d5a3b, hair: 0x1a120e, hairStyle: 'short', brow: -.15, cheek: 0xc0604a,
      top: 0xf47a2a, pants: 0x3b5a7a, boots: 0x6a4428, belt: 0x4a3020,
      hat: { k: 'cap', c: 0x16a89a, c2: 0x0e7a70, c3: 0xf6f2e8 }, armL: 'wave', armR: 'hold', itemR: { k: 'map' },
      acc: [{ k: 'backpack', c: 0x8a5a32, c2: 0x5a8a6a }, { k: 'whistle' }, { k: 'stripes', c: 0xf6f2e8, n: 1 }, { k: 'collar', c: 0xf6f2e8 }] },
    'npc-coral': { g: .92, legL: 1.02, skin: 0xc98a5c, hair: 0x2d1b14, hairStyle: 'long', brow: -.1, cheek: 0xe86a5a,
      top: 0xff7a6b, pants: 0xff7a6b, boots: 0x1a8a8a, fins: 0x2ad4c4, belt: 0x1a8a8a,
      armL: 'hip', armR: 'hold', itemR: { k: 'shell', c: 0xf7a8a0 },
      acc: [{ k: 'stripes', c: 0x2ad4c4, n: 2 }, { k: 'goggles', c: 0xf2c230, c2: 0x1a8a8a, lens: 0x8ae8ff, y: .3 }, { k: 'snorkel', c: 0xf2c230 }, { k: 'flower', c: 0xff5a8a }] },
    'npc-frost': { g: 1.2, legL: .92, skin: 0xf2d0b8, hair: 0xf0d48a, hairStyle: 'braids', tie: 0x3a6aa8, brow: .05, cheek: 0xf06070, nose: 1.15,
      top: 0xe8e2d4, coat: 0xb3402f, coatEnd: .42, coatOpen: false, hem: 0xf2ece0, pants: 0x4a4e5a, boots: 0x5a4030, glove: 0x3a5f8a, cuff: 0xf2ece0,
      hat: { k: 'hood', c: 0xb3402f, c2: 0x2a1a1a, fur: 0xf6f2ea }, armL: 'down', armR: 'staff', itemR: { k: 'staff', top: 'auger', c: 0x6a6e78, h: .55 },
      acc: [{ k: 'collar', c: 0xf6f2ea }] },
    keeper: { s: 1.12, g: 1.0, legL: 1.05, skin: 0xd8c0a8, hair: 0xe8eef0, hairStyle: 'none', beard: 'long', beardC: 0xeef2f4, brow: .2, browC: 0xf4f6f8, cheek: 0,
      top: 0x3a4456, robe: 0x4a5568, hem: 0x2a3242, hemGlow: 0x6ff0e0,
      hat: { k: 'hood', c: 0x3e4a5c, c2: 0x0e1018, peak: true }, armR: 'staff', armL: 'down', itemR: { k: 'staff', top: 'crystal', c: 0x4a3a2a, c2: 0x8a8a7a, g: 0x6ff0e0, h: 1.1 },
      acc: [{ k: 'cape', c: 0x2e3646, end: .3 }, { k: 'collar', c: 0x6a7282 }, { k: 'runes', c: 0x6ff0e0 }] },
    'npc-dunes': { g: 1.0, legL: 1.08, skin: 0xa8714a, hair: 0x1a120e, hairStyle: 'none', brow: .05, cheek: 0, eye: 0x1a120e,
      top: 0xe6d2a8, robe: 0xc77d3a, hem: 0x8a4a22, pants: 0x8a5a32, boots: 0x6a4428,
      hat: { k: 'wrap', c: 0xeedcb4, veil: 0x34466e }, armR: 'staff', armL: 'down', itemR: { k: 'staff', top: 'bell', c: 0x7a5232, c2: 0xd8a840, h: 1.0 },
      acc: [{ k: 'sash', c: 0xa83a2a }, { k: 'goggles', c: 0x8a6a3a, c2: 0x5a3a20, lens: 0xf0a030, y: .5 }, { k: 'cape', c: 0xb06a30, end: .25 }] },
    'npc-mire': { s: .86, g: 1.15, legL: .82, torL: .85, hunch: .5, skin: 0xd9b48f, hair: 0xb8b8b0, hairStyle: 'long', brow: -.25, browC: 0xd8d8d0, nose: 1.9, cheek: 0xd88a7a,
      top: 0x6a4a7a, robe: 0x3a4a3a, hem: 0x2a3426,
      hat: { k: 'wide', c: 0x4a5a32, c2: 0x6a4a7a, shroom: 0xd0402a }, armL: 'low', armR: 'staff', itemL: { k: 'lantern', g: 0xa8ff6a, c: 0x2a3020 }, itemR: { k: 'staff', top: 'knob', c: 0x5a4028, h: .5 },
      acc: [{ k: 'cape', c: 0x6a4a7a, end: .9 }, { k: 'pouch', c: 0x7a5a3a, x: .42 }] },
    'npc-crystal': { s: .9, g: 1.05, legL: .9, skin: 0xefc29a, hair: 0xc0602a, hairStyle: 'side', beard: 'mustache', beardC: 0xd06a2a, brow: -.2, nose: 1.4, cheek: 0xe07a6a,
      top: 0xd9a441, pants: 0x4a5e7a, boots: 0x4a3220, glove: 0x8a5a32, belt: 0x3a2a1a,
      hat: { k: 'helmet', c: 0xe8c040 }, armL: 'hold', armR: 'down', itemL: { k: 'crystal', c: 0xb07af0 },
      acc: [{ k: 'overalls', c: 0x4a5e7a }, { k: 'goggles', c: 0x4a4a52, c2: 0x2a2420, lens: 0xc89aff, y: .02 }, { k: 'satchel', c: 0x7a5232 }] },
    'npc-ember': { s: 1.1, g: 1.38, legL: .98, arm: 1.35, bare: true, skin: 0xb5704a, hair: 0xe0542a, hairStyle: 'spiky', brow: .3, cheek: 0xd05a3a, nose: 1.3,
      top: 0x3a3030, pants: 0x3a3030, boots: 0x1e1a18, glove: 0x4a3426, belt: 0x5a3a20, buckle: 0xb0b4bc,
      armR: 'shoulder', armL: 'hold', itemR: { k: 'hammer', c: 0x4a4c52 }, itemL: { k: 'tongs', g: 0xff7a1a },
      acc: [{ k: 'apron', c: 0x6a3e22, c2: 0x5a3018 }, { k: 'goggles', c: 0x3a3a3e, c2: 0x2a201a, lens: 0x3a2a24, y: .26 }] },
    'npc-sky': { g: .9, legL: 1.12, torL: .95, skin: 0xf0d0b4, hair: 0xdfe6f2, hairStyle: 'long', brow: 0, browC: 0xc8d0e0, eye: 0x2a3a6a, cheek: 0xf0a0b0,
      top: 0xeaf0f8, robe: 0xe2eaf6, hem: 0xd8a830, cuff: 0xd8a830,
      hat: { k: 'band', c: 0xd8b040, leaf: 0xf6f3ea }, armR: 'staff', armL: 'down', itemR: { k: 'staff', top: 'orb', c: 0xe8e4d8, c2: 0xd8b040, g: 0xd8f0ff, h: 1.05 },
      acc: [{ k: 'scarf', c: 0x3a96e8, c2: 0xd8a830, trail: true }, { k: 'goggles', c: 0xd8b040, c2: 0x7a5a3a, lens: 0x9ad8ff, y: .4 }, { k: 'sash', c: 0x3a96e8 }] },
    'npc-elder': { g: 1.0, legL: 1.0, skin: 0xe6b894, hair: 0xb0aaa0, hairStyle: 'bun', brow: -.18, browC: 0x8a847a, cheek: 0xe08a7a,
      top: 0xd8c38c, pants: 0x8a6f48, boots: 0x5a3a20, belt: 0x5a3a20, buckle: 0xc8a040,
      hat: { k: 'pith', c: 0xe2d2a4, c2: 0x6a4a2a }, armL: 'hold', armR: 'hold', itemR: { k: 'magnifier' }, itemL: { k: 'book', c: 0x3a5a3a },
      acc: [{ k: 'vest', c: 0x7a5a38 }, { k: 'glasses', c: 0x5a3a20 }, { k: 'satchel', c: 0x6a4a2a }] },
    'npc-grotto': { s: .8, g: .9, legL: .85, hs: .92, skin: 0x8a94b8, hair: 0xe0f4f8, hairStyle: 'none', eyeGlow: 0x8ffcf0, brow: null, mouth: 0, cheek: 0x9ad8e8, nose: .8,
      top: 0x2e2a4a, robe: 0x2e2a4a, hem: 0x1e1a34, boots: 0xd6e2ea,
      hat: { k: 'hood', c: 0x342e56, c2: 0x0a0814, peak: true }, armL: 'hold', armR: 'down', itemL: { k: 'jar', g: 0x8ffcf0 },
      acc: [{ k: 'spots', c: 0x8ffcf0 }, { k: 'shoulderMoss', c: 0x3a6a5a, c2: 0x8ffcf0 }, { k: 'cape', c: 0x26223e, end: .2 }] },
  };
})();
