// Unbloxed: DISASTER ISLAND — natural-disaster survival rounds on the island from unbloxed/disaster-map.json.
// Loaded after the main inline script of unbloxed.html: uses its globals (scene, chars, me, spawn, physics, near, ...).
// Plugs in through window.MODES.disaster (tick / bot / spawnFor / attack).
(function () {
  if (typeof THREE === 'undefined' || typeof LIST === 'undefined') return;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = L => L[Math.random() * L.length | 0];
  const NAMES = ['Blox', 'Nub', 'Zed', 'Kiko', 'Rusty', 'Pip', 'Vex', 'Moxy', 'Tank', 'Lumo', 'Gritz', 'Dax', 'Pokk', 'Fenn', 'Bolt', 'Mira', 'Juno', 'Sprock'];
  const DIS = {
    flood: { n: 'FLOOD', ic: '🌊', col: '#5cc8ff', tip: 'Get to high ground! Hold Space to swim.' },
    meteor: { n: 'METEOR SHOWER', ic: '☄️', col: '#ff8a3a', tip: 'Run from the red circles!' },
    tornado: { n: 'TORNADO', ic: '🌪️', col: '#c8d0da', tip: 'Run away from the funnel!' },
    quake: { n: 'EARTHQUAKE', ic: '🫨', col: '#e0b070', tip: 'Get away from buildings, they are collapsing!' },
    acid: { n: 'ACID RAIN', ic: '☣️', col: '#9dff4a', tip: 'Get under a roof!' }
  };
  const KINDS = Object.keys(DIS);
  const LOBBY_T = 15, CALM_T = 7, END_T = 5, STAM = 14;
  let G = 44.4, C = V(100, 44.4, -118), SEA = 31, FLOOD_Y = 54.5, LOB = V(-171.6, 176.5, 222), LOBSP = [];
  let D = null;// all round state

  // ---------- helpers ----------
  function remSolid(b) {
    const i = solids.indexOf(b); if (i >= 0) solids.splice(i, 1);
    for (let x = Math.floor(b.min.x / CELL); x <= Math.floor(b.max.x / CELL); x++) for (let z = Math.floor(b.min.z / CELL); z <= Math.floor(b.max.z / CELL); z++) {
      const l = GRID.get(x + ',' + z); if (l) { const j = l.indexOf(b); if (j >= 0) l.splice(j, 1); }
    }
  }
  function groundAt(x, z, maxY) {
    let top = -1e9;
    for (const b of near(x, z)) if (x >= b.min.x && x <= b.max.x && z >= b.min.z && z <= b.max.z && b.max.y <= maxY + .05 && b.max.y > top) top = b.max.y;
    return top;
  }
  function roofOver(o) {// any solid above the head = shelter
    const x = o.pos.x, z = o.pos.z, y = o.pos.y + 4.4;
    for (const b of near(x, z)) if (x > b.min.x && x < b.max.x && z > b.min.z && z < b.max.z && b.min.y >= y && b.min.y < y + 60) return true;
    return false;
  }
  function freeAt(x, z, y) {
    for (const b of near(x, z)) if (x > b.min.x - 1.4 && x < b.max.x + 1.4 && z > b.min.z - 1.4 && z < b.max.z + 1.4 && b.max.y > y + .5 && b.min.y < y + 5) return false;
    return true;
  }
  const onIsland = o => o.alive && D && (D.st === 'calm' || D.st === 'dis');
  function tp(o, v) { o.pos.set(v.x + rnd(-1.5, 1.5), v.y + 1, v.z + rnd(-1.5, 1.5)); o.vel.set(0, 0, 0); o.path = null; o.route = null; o.flee = null; }
  const fmtT = s => { s = Math.max(0, Math.ceil(s)); return (s / 60 | 0) + ':' + String(s % 60).padStart(2, '0'); };

  // ---------- town pieces (rebuilt every round) ----------
  const GLASS = M('#8fdcff', { emissive: '#1d5a80', emissiveIntensity: .45, roughness: .1, metalness: .5 });
  const LEAF = [M('#3fae4a', { roughness: .8 }), M('#59c14f', { roughness: .8 }), M('#2e8f45', { roughness: .8 })];
  const BALL = new THREE.SphereGeometry(1, 16, 12), CYL = new THREE.CylinderGeometry(1, 1, 1, 18);
  let TOWN = null;
  function pc(x, y0, z, w, h, d, col, q, nocol) {// box piece, y0 = bottom
    const m = new THREE.Mesh(UBOX, typeof col === 'string' ? MC(col) : col); m.scale.set(w, h, d); m.position.set(x, y0 + h / 2, z); m.castShadow = m.receiveShadow = true; TOWN.add(m);
    const p = { mesh: m, w, h, d, q: !!q, box: null };
    if (!nocol) { p.box = new THREE.Box3(V(x - w / 2, y0, z - d / 2), V(x + w / 2, y0 + h, z + d / 2)); addSolid(p.box); }
    D.pieces.push(p); return p;
  }
  function deco(p, dx, dy, dz, w, h, d, mat, geo) {// visual child that follows its piece when it falls
    const m = new THREE.Mesh(geo || UBOX, mat); m.position.set(dx / p.w, dy / p.h, dz / p.d); m.scale.set(w / p.w, h / p.h, d / p.d); m.castShadow = true; p.mesh.add(m); return m;
  }
  function vis(geo, mat, x, y, z, sx, sy, sz) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = m.receiveShadow = true; TOWN.add(m); return m; }
  // wall along x (at z) or along z (at x) with door gaps [[a,b,height]]
  function wall(ax, a0, a1, c, y0, h, t, col, gaps, q, win) {
    gaps = (gaps || []).slice().sort((p, r) => p[0] - r[0]);
    let s = a0; const segs = [];
    for (const g of gaps) { if (g[0] > s) segs.push([s, g[0]]); const gh = g[2] || 4; if (gh < h) segs.push([g[0], g[1], gh]); s = g[1]; }
    if (s < a1) segs.push([s, a1]);
    for (const sg of segs) {
      const len = sg[1] - sg[0], mid = (sg[0] + sg[1]) / 2, yb = sg[2] ? y0 + sg[2] : y0, hh = sg[2] ? h - sg[2] : h;
      if (len < .05 || hh < .05) continue;
      const p = ax === 'x' ? pc(mid, yb, c, len, hh, t, col, q) : pc(c, yb, mid, t, hh, len, col, q);
      if (win && !sg[2] && len > 3.2 && hh >= 4) {// windows on both faces
        const n = Math.floor(len / 3.4);
        for (let k = 0; k < n; k++) {
          const off = -len / 2 + (k + .5) * len / n;
          for (const sd of [-1, 1]) {
            if (ax === 'x') deco(p, off, .4, sd * (t / 2 + .04), 1.8, 1.8, .08, GLASS); else deco(p, sd * (t / 2 + .04), .4, off, .08, 1.8, 1.8, GLASS);
          }
        }
      }
    }
  }
  function flight(x, z, dx, dz, n, y0, w, col) {// straight stair of thin treads (rise .9, run 1.3)
    for (let k = 0; k < n; k++) {
      const cx = x + dx * (1.3 * k + .65), cz = z + dz * (1.3 * k + .65), top = y0 + .9 * (k + 1);
      pc(cx, top - .5, cz, dx ? 1.3 : w, .5, dz ? 1.3 : w, col, 0);
    }
    return { a: V(x - dx * 1.6, y0, z - dz * 1.6), b: V(x + dx * (1.3 * n - .65), y0 + .9 * n, z + dz * (1.3 * n - .65)) };
  }
  function sign(text, bg, fg, w, h) {
    const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w); const g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); g.strokeStyle = '#fff'; g.lineWidth = 10; g.strokeRect(8, 8, c.width - 16, c.height - 16);
    let z = c.height * .62; g.font = `900 ${z}px system-ui,sans-serif`; while (g.measureText(text).width > c.width - 40 && z > 12) { z -= 4; g.font = `900 ${z}px system-ui,sans-serif`; }
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, c.width / 2, c.height / 2 + 4);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
    return new THREE.MeshBasicMaterial({ map: t });
  }
  function tree(x, z, s) {
    s = s || 1; const tr = pc(x, G, z, .7 * s, 4 * s, .7 * s, '#7a4a2a', 1);
    const L = pick(LEAF);
    deco(tr, 0, 2.3 * s, 0, 3.2 * s, 2.8 * s, 3.2 * s, L, BALL);
    deco(tr, .9 * s, 1.3 * s, .5 * s, 2.2 * s, 2 * s, 2.2 * s, L, BALL);
    deco(tr, -.8 * s, 1.5 * s, -.6 * s, 2.3 * s, 2 * s, 2.3 * s, L, BALL);
    return tr;
  }

  function buildTown() {
    if (TOWN) scene.remove(TOWN);
    for (const p of D.pieces) if (p.box && !p.fallen) remSolid(p.box);
    D.pieces = []; D.falling = []; D.high = []; D.shelter = [];
    TOWN = new THREE.Group(); scene.add(TOWN);
    let seed = 11; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

    // --- two-storey house (55,-80): door south, outside stair east up to the roof, door into floor 2 ---
    {
      const x = 55, z = -80, W = '#f6dca6', T = '#d9644a';
      wall('x', x - 7, x + 7, z - 6, G, 5, .6, W, [[x - 1.5, x + 1.5, 4]], 0, 1);
      wall('x', x - 7, x + 7, z + 6, G, 5, .6, W, [], 0, 1);
      wall('z', z - 6, z + 6, x - 7, G, 5, .6, W, [], 0, 1);
      wall('z', z - 6, z + 6, x + 7, G, 5, .6, W, [], 0, 1);
      pc(x, G + 5, z, 14.4, .6, 12.4, '#efe6d2', 1);
      wall('x', x - 7, x + 7, z - 6, G + 5.6, 4.6, .6, '#ffe9bd', [], 1, 1);
      wall('x', x - 7, x + 7, z + 6, G + 5.6, 4.6, .6, '#ffe9bd', [], 1, 1);
      wall('z', z - 6, z + 6, x - 7, G + 5.6, 4.6, .6, '#ffe9bd', [], 1, 1);
      wall('z', z - 6, z + 6, x + 7, G + 5.6, 4.6, .6, '#ffe9bd', [[z - 2.2, z + .8, 4]], 1, 0);
      const roof = pc(x, G + 10.2, z, 15, .6, 13, T, 1);
      deco(roof, 0, .45, 0, 15.2, .3, 13.2, MC('#b84c38'));
      pc(x - 4, G + 10.8, z + 3, 1.6, 2.6, 1.6, '#9a5a44', 1);// chimney
      const dr = pc(x, G, z - 6.45, 2.8, .2, .3, '#7a4a2a', 0, 1); dr.mesh.position.y = G + .1;// doorstep
      const f = flight(x + 8.6, z - 8, 0, 1, 12, G, 2.6, '#c98a52');
      D.high.push([f.a, V(f.a.x, G, z - 5), f.b, V(x + 1, G + 10.8, z + 1)]);
      D.shelter.push([V(x, G, z - 9), V(x, G, z - 3), V(x + rnd(-3, 3), G, z + rnd(0, 3))]);
      for (const [tx, tz] of [[x - 10, z - 9], [x - 11, z + 4]]) tree(tx, tz, 1.1);
    }
    // --- school (140,-75): brick, flat roof, sign, clock turret, roof stair on the west side ---
    {
      const x = 140, z = -75, B = '#d8573f', T = '#f3e3c4';
      wall('x', x - 14, x + 14, z - 8, G, 8, .7, B, [[x - 2.2, x + 2.2, 4.4]], 0, 1);
      wall('x', x - 14, x + 14, z + 8, G, 8, .7, B, [], 0, 1);
      wall('z', z - 8, z + 8, x - 14, G, 8, .7, B, [], 0, 1);
      wall('z', z - 8, z + 8, x + 14, G, 8, .7, B, [], 0, 1);
      const roof = pc(x, G + 8, z, 29, .6, 17, '#5f7186', 1);
      deco(roof, 0, .5, -8.3, 29, .5, .4, MC(T)); deco(roof, 0, .5, 8.3, 29, .5, .4, MC(T));
      const sg = pc(x, G + 4.6, z - 8.5, 11, 2.6, .3, '#24407a', 1, 1);
      deco(sg, 0, 0, -.18, 10.4, 2.2, .02, sign('SCHOOL', '#24407a', '#ffe14a', 10.4, 2.2));
      const tw = pc(x, G + 8.6, z, 4, 4, 4, T, 1);
      deco(tw, 0, .3, -2.03, 2.4, 2.4, .06, sign('🕒', '#ffffff', '#222', 2.4, 2.4));
      deco(tw, 0, 2.6, 0, 4.6, 1.2, 4.6, MC('#5f7186'));
      const pole = pc(x + 18, G, z - 10, .25, 11, .25, '#dcdcdc', 1);
      deco(pole, .9, 4.6, 0, 1.8, 1.1, .05, MC('#e33b3b'));
      const f = flight(x - 15.6, z - 9, 0, 1, 10, G, 2.6, '#8a96a6');
      D.high.push([f.a, f.b, V(x - 6, G + 8.6, z)]);
      D.shelter.push([V(x, G, z - 11), V(x, G, z - 5), V(x + rnd(-10, 10), G, z + rnd(-3, 5))]);
      for (let k = 0; k < 3; k++) pc(x - 9 + k * 9, G, z + 3, 3, 1.2, 1.4, '#c89a5a', 0);// desks
    }
    // --- prison (60,-165): concrete yard, barred front with a gate, roofed cell block, guard tower + stair ---
    {
      const x = 60, z = -165, Cc = '#9ea4ab', bar = M('#3b3f46', { metalness: .7, roughness: .3 });
      wall('x', x - 12, x + 12, z - 12, G, 7, .8, Cc, [], 0, 0);
      wall('z', z - 12, z + 12, x - 12, G, 7, .8, Cc, [], 0, 0);
      wall('z', z - 12, z + 12, x + 12, G, 7, .8, Cc, [], 0, 0);
      for (const [a, b] of [[x - 12, x - 3], [x + 3, x + 12]]) {// bars fence
        pc((a + b) / 2, G, z + 12, b - a, 6, .3, '#5a5f66', 0, 0).mesh.visible = false;
        for (let bx = a + .3; bx < b; bx += .75) vis(CYL, bar, bx, G + 3, z + 12, .09, 6, .09);
        vis(UBOX, bar, (a + b) / 2, G + 6.1, z + 12, b - a, .3, .35);
      }
      const gs = pc(x, G + 6.2, z + 12.2, 8, 1.6, .3, '#2b2f36', 1, 1);
      deco(gs, 0, 0, .18, 7.6, 1.3, .02, sign('PRISON', '#2b2f36', '#ff9a3a', 7.6, 1.3));
      // cell block along the back
      pc(x, G + 6, z - 8, 24, .6, 8.4, '#7f868e', 1);
      for (const cx of [x - 6, x, x + 6]) pc(cx, G, z - 8, .5, 6, 8, Cc, 0);
      for (let k = 0; k < 4; k++) {
        const cx = x - 9 + k * 6;
        for (const s of [-1, 1]) { pc(cx + s * 2.2, G, z - 4, 1.6, 6, .3, '#5a5f66', 0).mesh.visible = false; for (let bx = -.7; bx <= .7; bx += .7) vis(CYL, bar, cx + s * 2.2 + bx, G + 3, z - 4, .08, 6, .08); }
        vis(UBOX, MC('#e8e2d0'), cx, G + .35, z - 10, 2.4, .7, 1.4);// bed
      }
      // guard tower outside the front-left corner
      const tx = 42, tz = -150;
      for (const [lx, lz] of [[-2.6, -2.6], [2.6, -2.6], [-2.6, 2.6], [2.6, 2.6]]) pc(tx + lx, G, tz + lz, .6, 12, .6, '#6b5040', 1);
      pc(tx, G + 12, tz, 6, .6, 6, '#7d5a44', 1);
      for (const [lx, lz, w, d] of [[0, 2.9, 6, .2], [2.9, 0, .2, 6], [0, -2.9, 6, .2]]) pc(tx + lx, G + 12.6, tz + lz, w, 1.2, d, '#5a4030', 1);
      for (const [lx, lz] of [[-2.8, -2.8], [2.8, -2.8], [-2.8, 2.8], [2.8, 2.8]]) pc(tx + lx, G + 12.6, tz + lz, .3, 4, .3, '#5a4030', 1);
      const tr = pc(tx, G + 16.6, tz, 7, .5, 7, '#3e4a56', 1);
      const lamp = deco(tr, 0, -.6, 0, .8, .5, .8, new THREE.MeshBasicMaterial({ color: '#fff3a0' }));
      lamp.castShadow = false;
      const f = flight(tx - 4.6, tz + 18.2, 0, -1, 14, G, 2.6, '#8a7060');
      D.high.push([f.a, f.b, V(tx, G + 12.6, tz)]);
      D.shelter.push([V(x, G, z + 15), V(x, G, z + 2), V(x - 9 + 6 * (Math.random() * 4 | 0), G, z - 9)]);
    }
    // --- gas station (150,-165): canopy over pumps, little shop, tall sign ---
    {
      const x = 150, z = -165;
      for (const [lx, lz] of [[-7, 2], [7, 2], [-7, 10], [7, 10]]) pc(x + lx, G, z + lz, .7, 6, .7, '#e8e8e8', 1);
      const can = pc(x, G + 6, z + 6, 17, .7, 11, '#f4f4f4', 1);
      deco(can, 0, 0, 0, 17.2, .4, 11.2, MC('#e3342f'));
      for (const px of [x - 3, x + 3]) { const pu = pc(px, G, z + 6, 1.2, 2.2, .9, '#e3342f', 1); deco(pu, 0, .5, -.47, .8, .6, .04, GLASS); }
      wall('x', x - 6, x + 6, z - 3, G, 5, .5, '#f0c94a', [[x - 1.8, x + 1.8, 4]], 0, 1);
      wall('x', x - 6, x + 6, z - 11, G, 5, .5, '#f0c94a', [], 0, 0);
      wall('z', z - 11, z - 3, x - 6, G, 5, .5, '#f0c94a', [], 0, 0);
      wall('z', z - 11, z - 3, x + 6, G, 5, .5, '#f0c94a', [], 0, 0);
      pc(x, G + 5, z - 7, 13, .5, 9, '#3b4a5a', 1);
      const sp = pc(x + 11, G, z + 12, .5, 9, .5, '#9aa3ad', 1);
      deco(sp, 0, 5.4, 0, 4.4, 2.4, .4, MC('#1f6fd1'));
      deco(sp, 0, 5.4, -.22, 4, 2, .02, sign('GAS', '#1f6fd1', '#ffffff', 4, 2));
      deco(sp, 0, 5.4, .22, 4, 2, .02, sign('GAS', '#1f6fd1', '#ffffff', 4, 2));
      D.shelter.push([V(x + rnd(-4, 4), G, z + 6)], [V(x, G, z), V(x, G, z - 7)]);
    }
    // --- office tower (165,-118): glass tower, lobby door west, outside switchback stairs to the roof ---
    {
      const x = 165, z = -118, F = '#2f3b4c';
      wall('z', z - 5, z + 5, x - 5, G, 24, .6, F, [[z - 1.5, z + 1.5, 4]], 0, 0);
      wall('z', z - 5, z + 5, x + 5, G, 24, .6, F, [], 0, 0);
      wall('x', x - 5, x + 5, z - 5, G, 24, .6, F, [], 0, 0);
      wall('x', x - 5, x + 5, z + 5, G, 24, .6, F, [], 0, 0);
      for (let fl = 0; fl < 4; fl++) {
        const y = G + 1.2 + fl * 6 + (fl ? 0 : 2.6), h = fl ? 4.2 : 1.6;
        vis(UBOX, GLASS, x, y + h / 2, z - 5.33, 9, h, .06); vis(UBOX, GLASS, x, y + h / 2, z + 5.33, 9, h, .06);
        vis(UBOX, GLASS, x + 5.33, y + h / 2, z, .06, h, 9);
        if (fl) vis(UBOX, GLASS, x - 5.33, y + h / 2, z, .06, h, 9);
      }
      const roof = pc(x, G + 23.7, z, 11, .6, 11, '#47566a', 1);
      deco(roof, 0, .32, 0, 5, .04, 5, sign('H', '#ffb21e', '#222', 5, 5));
      pc(x + 3.5, G + 24.3, z + 3.5, .3, 6, .3, '#c8c8c8', 1);// antenna
      const f1 = flight(x - 7, z - 6.6, 1, 0, 9, G, 2.6, '#9aa3ad');
      pc(x + 6.7, G + 7.6, z - 6.6, 2.8, .5, 2.8, '#9aa3ad', 0);
      const f2 = flight(x + 6.6, z - 5.2, 0, 1, 9, G + 8.1, 2.6, '#9aa3ad');
      pc(x + 6.6, G + 15.7, z + 7.9, 2.8, .5, 2.8, '#9aa3ad', 0);
      const f3 = flight(x + 5.2, z + 7, -1, 0, 9, G + 16.2, 2.6, '#9aa3ad');
      D.high.push([f1.a, f1.b, V(x + 6.7, G + 8.1, z - 6.6), f2.b, V(x + 6.6, G + 16.2, z + 7.9), f3.b, V(x - 1, G + 24.3, z + 2)]);
      D.shelter.push([V(x - 8, G, z), V(x - 2, G, z), V(x + rnd(-2, 3), G, z + rnd(-3, 3))]);
    }
    // --- park in the middle: fountain, benches, trees ---
    {
      const x = C.x, z = C.z;
      vis(CYL, MC('#8fd16a'), x, G + .03, z, 20, .06, 20).castShadow = false;
      vis(CYL, MC('#e6dcc6'), x, G + .06, z, 10.5, .06, 10.5).castShadow = false;
      pc(x, G, z, 6, .8, 6, '#cfd6de', 0).mesh.visible = false;
      vis(CYL, MC('#cfd6de'), x, G + .4, z, 3.6, .8, 3.6);
      vis(CYL, M('#4fb8ff', { emissive: '#1a5a90', emissiveIntensity: .4, roughness: .1 }), x, G + .82, z, 3.2, .05, 3.2).castShadow = false;
      const col = pc(x, G + .8, z, .8, 2.4, .8, '#cfd6de', 1);
      deco(col, 0, 1.4, 0, 2.2, .5, 2.2, MC('#cfd6de'), CYL);
      for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283 + .3; tree(x + Math.sin(a) * 15, z + Math.cos(a) * 15, 1 + r() * .4); }
      for (let k = 0; k < 4; k++) { const a = k / 4 * 6.283 + .7, bx = x + Math.sin(a) * 9, bz = z + Math.cos(a) * 9; const b = pc(bx, G, bz, 2.6, .9, 1, '#a8703c', 0); b.mesh.rotation.y = a; }
    }
    // scattered trees + lamp posts around the island (not on buildings, spawn ring or stairs)
    const keep = [[55, -80, 17], [140, -75, 22], [60, -165, 18], [42, -140, 14], [150, -162, 15], [165, -118, 14], [C.x, C.z, 33]];
    for (let k = 0, made = 0; k < 160 && made < 26; k++) {
      const a = r() * 6.283, rr = 35 + r() * 62, tx = C.x + Math.sin(a) * rr, tz = C.z + Math.cos(a) * rr;
      if (keep.some(([kx, kz, kr]) => Math.hypot(tx - kx, tz - kz) < kr)) continue;
      if (groundAt(tx, tz, G + 1) < G - .3 || !freeAt(tx, tz, G)) continue;
      tree(tx, tz, .9 + r() * .6); made++;
    }
  }

  // ---------- map ----------
  function buildDisaster() {
    scene = skyScene(false); solids.length = 0; GRID.clear(); pickups.length = 0; SPAWNS = []; PORTALS = [];
    sun.position.set(20, 40, 20); sun.color.set('#fff4e0');
    const m = window.UBX_MAPS && UBX_MAPS.disaster;
    if (m && m.parts && m.parts.length) {
      const base = m.parts.find(p => p[13] === 'Base');
      if (base) { G = base[1] + base[4] / 2; C = V(base[0], G, base[2]); }
      const wl = m.parts.find(p => p[13] === 'WaterLevel'); if (wl) SEA = Math.max(wl[1] + 10, G - 13.4);
      buildFromRoblox({ parts: m.parts.filter(p => p[13] !== 'WaterLevel' && p[13] !== 'SpawnLocation' && p[13] !== 'Center'), spawns: [] });
      LOBSP = (m.spawns || []).map(s => V(s[0], s[1], s[2]));
      if (LOBSP.length) { LOB = LOBSP.reduce((a, b) => a.add(b), V(0, 0, 0)).multiplyScalar(1 / LOBSP.length); LOB.y += 1; }
    } else {// fallback island + lobby if the map is missing
      G = 44.4; C = V(100, G, -118); SEA = 31;
      block(C.x, G - 6, C.z, 230, 12, 230, '#3fa04a');
      block(LOB.x, LOB.y - .5, LOB.z, 90, 1, 90, '#74869d');
      for (const [dx, dz, w, d] of [[45, 0, 1, 90], [-45, 0, 1, 90], [0, 45, 90, 1], [0, -45, 90, 1]]) block(LOB.x + dx, LOB.y + 3, LOB.z + dz, w, 7, d, '#dfe6ef');
      LOBSP = []; for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; LOBSP.push(V(LOB.x + Math.sin(a) * 30, LOB.y - 1, LOB.z + Math.cos(a) * 30)); }
    }
    FLOOD_Y = G + 10.1;
    SPAWNS = LOBSP.slice();
    // the sea: water surface + sandy floor so nobody falls forever
    const wm = new THREE.Mesh(new THREE.PlaneGeometry(1800, 1800), new THREE.MeshStandardMaterial({ color: '#2a8fd8', transparent: true, opacity: .78, roughness: .12, metalness: .15, depthWrite: false }));
    wm.rotation.x = -Math.PI / 2; wm.position.set(C.x, SEA, C.z); wm.renderOrder = 2; scene.add(wm);
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(1800, 1800), MC('#c9b27a')); sand.rotation.x = -Math.PI / 2; sand.position.set(C.x, 0, C.z); sand.receiveShadow = true; scene.add(sand);
    addSolid(new THREE.Box3(V(C.x - 380, -20, C.z - 380), V(C.x + 380, 0, C.z + 380)));
    D.water = wm; D.waterY = SEA; D.pieces = [];
    buildTown();
    // spawn ring around the park, wander spots, open spots (away from buildings)
    D.isl = []; for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; D.isl.push(V(C.x + Math.sin(a) * 26, G, C.z + Math.cos(a) * 26)); }
    D.spots = []; D.open = [];
    const bld = [[55, -80], [140, -75], [60, -165], [150, -165], [165, -118], [42, -150]];
    for (let x = C.x - 92; x <= C.x + 92; x += 8) for (let z = C.z - 92; z <= C.z + 92; z += 8) {
      if (Math.hypot(x - C.x, z - C.z) > 92) continue;
      if (Math.abs(groundAt(x, z, G + 1) - G) > .6 || !freeAt(x, z, G)) continue;
      const v = V(x, G, z); D.spots.push(v);
      if (bld.every(([bx, bz]) => Math.hypot(x - bx, z - bz) > 22)) D.open.push(v);
    }
    if (!D.spots.length) D.spots = D.isl.slice();
    if (!D.open.length) D.open = D.spots.slice();
  }

  // ---------- bots ----------
  function mkBot(i) {
    const nm = NAMES[i % NAMES.length];
    const a = { name: '🤖 ' + nm, head: PAL[i % 4], torso: PAL[4 + i * 2 % 10], arms: PAL[i % 4], legs: PAL[10 + i % 6], hat: i % 6, face: i % 5, sword: i % 5, hair: (i * 3) % 11, hairColor: PAL[(i * 5) % 16] };
    const o = spawn(a, true); o.ni = i; o.smart = rnd(.35, .95); o.wins = Math.random() * 4 | 0; o.air = 3; o.stam = STAM; o.alive = false; o.think = Math.random();
    return o;
  }
  function addBot(announce) {
    const used = new Set(chars.filter(o => o.bot).map(o => o.ni));
    const free = NAMES.map((_, i) => i).filter(i => !used.has(i)); if (!free.length) return null;
    const o = mkBot(pick(free)); if (announce) log(`${esc(o.a.name)} joined`); return o;
  }
  function nearestRoute(o, L) {
    let best = null, bd = 1e9;
    for (const R of L) { const d = Math.hypot(R[0].x - o.pos.x, R[0].z - o.pos.z); if (d < bd) { bd = d; best = R; } }
    return best;
  }
  function plan(o) {
    if (!onIsland(o)) {
      o.route = null; o.flee = null;
      if (!o.path || !o.path.length) {
        if ((o.idle = (o.idle || 0) - .5) > 0) return;
        const a = Math.random() * 6.283, rr = rnd(20, 46); o.path = [V(LOB.x + Math.sin(a) * rr, LOB.y, LOB.z + Math.cos(a) * rr)]; o.idle = rnd(1, 6);
      }
      return;
    }
    o.flee = null;
    if (D.st === 'dis' && !o.careless) {
      const k = D.dis;
      if (k === 'flood' || k === 'acid') {
        if (!o.route) { const L = k === 'flood' ? D.high : D.shelter; o.route = nearestRoute(o, L) || [pick(D.spots)]; o.path = o.route.map(v => v.clone().add(V(rnd(-.5, .5), 0, rnd(-.5, .5)))); }
        return;
      }
      if (k === 'meteor') {
        for (const mt of D.mets) { const dx = o.pos.x - mt.to.x, dz = o.pos.z - mt.to.z, d = Math.hypot(dx, dz) || .01; if (d < 10) { o.flee = V(dx / d, 0, dz / d); o.path = null; return; } }
      }
      if (k === 'tornado' && D.torn) {
        const dx = o.pos.x - D.torn.pos.x, dz = o.pos.z - D.torn.pos.z, d = Math.hypot(dx, dz) || .01;
        if (d < 42) {
          let fx = dx / d, fz = dz / d; const cx = C.x - o.pos.x, cz = C.z - o.pos.z, cd = Math.hypot(cx, cz) || 1;
          if (cd > 60) { fx += cx / cd * 1.3; fz += cz / cd * 1.3; }
          const l = Math.hypot(fx, fz) || 1; o.flee = V(fx / l, 0, fz / l); o.path = null; return;
        }
      }
      if (k === 'quake') { if (!o.path || !o.path.length) o.path = [pick(D.open)]; return; }
    }
    if (!o.path || !o.path.length) { if ((o.idle = (o.idle || 0) - .5) > 0) return; o.path = [pick(D.spots)]; o.idle = rnd(.5, 4); }
  }
  function bot(o, dt) {
    if (!D) { physics(o, dt, 0, 0, false, false); return; }
    o.think -= dt;
    if (o.think <= 0) {
      o.think = .45 + Math.random() * .3;
      // stuck check: jump, then side-step, then give up on the waypoint
      if (o.path && o.path.length && o.lastP) {
        if (o.lastP.distanceTo(o.pos) < .5) {
          o.stuck = (o.stuck || 0) + 1;
          if (o.stuck === 3) { const w = o.path[0], dx = w.x - o.pos.x, dz = w.z - o.pos.z, l = Math.hypot(dx, dz) || 1, s = Math.random() < .5 ? 1 : -1; o.path.unshift(V(o.pos.x - dz / l * 6 * s, o.pos.y, o.pos.z + dx / l * 6 * s)); }
          if (o.stuck > 7) { o.path = null; o.route = o.route ? [] : null; o.stuck = 0; }
        } else o.stuck = 0;
      }
      o.lastP = (o.lastP || V(0, 0, 0)).copy(o.pos);
      plan(o);
    }
    let mx = 0, mz = 0, jump = false, sprint = D.st === 'dis' && onIsland(o);
    if (o.flee) { mx = o.flee.x; mz = o.flee.z; sprint = true; }
    else if (o.path && o.path.length) {
      const w = o.path[0], dx = w.x - o.pos.x, dz = w.z - o.pos.z, d = Math.hypot(dx, dz);
      if (d < 1.4) { o.path.shift(); if (!o.path.length) o.idle = rnd(1, 5); }
      else { const sl = d < 4 ? .55 : 1; mx = dx / d * sl; mz = dz / d * sl; }
      if (o.stuck >= 1 && o.ground && Math.random() < .5) jump = true;
    }
    if (mx || mz) o.yaw = Math.atan2(mx, mz);
    o.swimUp = o.inWater;
    physics(o, dt, mx, mz, jump, sprint);
  }

  // ---------- deaths ----------
  function die(o, why) {
    if (o.ko) return;
    o.ko = 2.5; o.deaths = (o.deaths || 0) + 1; o.alive = false;
    log(`💀 ${esc(o.a.name)} ${why}`);
    if (o === me) { $('dead').style.display = 'flex'; banner('💀 You died', 'You will play again next round', '#ff6a6a', 2.5); }
  }
  function hurt(o, n, why) { if (o.ko || !onIsland(o)) return; if (o.shield > 0) n *= .3; o.hp -= n; if (o.hp <= 0) die(o, why); }

  // ---------- banner + overlays ----------
  function el(id, css) { let e = $(id); if (!e) { e = document.createElement('div'); e.id = id; e.style.cssText = css; document.body.appendChild(e); } return e; }
  function banner(t, sub, col, sec) {
    const b = el('di-banner', 'position:fixed;left:0;right:0;top:17%;text-align:center;pointer-events:none;z-index:30;font:900 50px system-ui,sans-serif;color:#fff;text-shadow:0 4px 0 #0008,0 0 26px #000b;transition:opacity .35s;opacity:0');
    b.innerHTML = `<div style="color:${col || '#fff'}">${t}</div>` + (sub ? `<div style="font-size:20px;font-weight:800;margin-top:6px;color:#fff">${sub}</div>` : '');
    b.style.opacity = '1'; if (D) D.banT = sec || 3;
  }
  function hideOverlays() { const b = $('di-banner'); if (b) b.style.opacity = '0'; const u = $('di-uw'); if (u) u.style.display = 'none'; const a = $('di-acid'); if (a) a.style.display = 'none'; }
  if ($('back')) $('back').addEventListener('click', hideOverlays);

  // ---------- round flow ----------
  function aliveList() { return chars.filter(o => o.alive && !o.ko); }
  function toLobby() {
    clearDisaster();
    D.st = 'lobby'; D.t = LOBBY_T;
    let i = 0; for (const o of chars) { o.alive = false; if (!o.ko) tp(o, LOBSP[i++ % LOBSP.length] || LOB); }
    banner('🏝️ Intermission', 'Next round in ' + LOBBY_T + ' s', '#ffe14a', 2.5);
  }
  function startRound() {
    buildTown();
    D.st = 'calm'; D.t = CALM_T; D.round++; D.waterY = SEA;
    let i = Math.random() * 12 | 0;
    for (const o of chars) {
      if (o.ko) { o.alive = false; continue; }
      o.alive = true; o.hp = 100; o.air = 3; o.stam = STAM; o.careless = o.bot && Math.random() > o.smart;
      tp(o, D.isl[i++ % D.isl.length]); o.shield = 2;
    }
    log(`🏝️ Round ${D.round}: everyone to the island!`);
    banner('🏝️ To the island!', 'A disaster is coming…', '#7dff9a', 3);
  }
  function beginDis(k, dur) {
    D.dis = k; D.st = 'dis'; D.t = dur || rnd(45, 60); D.last = k;
    const d = DIS[k];
    log(`⚠️ <b style="color:${d.col}">${d.n}!</b>`);
    banner(`⚠️ ${d.ic} ${d.n}!`, d.tip, d.col, 4);
    for (const o of chars) { o.route = null; o.path = null; }
    if (k === 'meteor') { D.mets = []; D.metT = 1; }
    if (k === 'tornado') makeTornado();
    if (k === 'quake') { D.qT = 1.5; D.shake = 0; }
    if (k === 'acid') makeRain('#9dff4a', 1);
  }
  function endRound() {
    const surv = aliveList();
    for (const o of surv) o.wins = (o.wins || 0) + 1;
    if (surv.length) log(`🏆 Survived: ${surv.map(o => `<b>${esc(o.a.name)}</b>`).join(', ')}`); else log('💀 Nobody survived!');
    if (me.alive && !me.ko) { addBux(15); D.earned += 15; banner('🎉 You survived!', '+15 🟩 Bux', '#7dff9a', 4); }
    else banner(surv.length ? '🏁 Round over' : '💀 Nobody survived!', surv.length + ' survivor' + (surv.length === 1 ? '' : 's'), '#ffe14a', 4);
    D.st = 'end'; D.t = END_T;
    for (const o of chars) if (!o.ko && o.alive) o.vel.set(0, 0, 0);
  }
  function clearDisaster() {
    if (D.torn) { scene.remove(D.torn.g); D.torn = null; }
    if (D.rain) { scene.remove(D.rain.m); D.rain = null; }
    for (const mt of D.mets || []) { scene.remove(mt.rock); scene.remove(mt.ring); }
    D.mets = []; D.shake = 0; D.dis = null;
    if (D.junk) scene.remove(D.junk); D.junk = new THREE.Group(); scene.add(D.junk);
    if (scene.fog) { scene.fog.color.set('#c8d8ec'); scene.fog.near = 120; scene.fog.far = 700; }
    const a = $('di-acid'); if (a) a.style.display = 'none';
  }
  function pickDis() { const L = KINDS.filter(k => k !== D.last); return pick(L); }

  // ---------- collapsing pieces ----------
  function collapse(p, v) {
    if (p.fallen) return; p.fallen = 1;
    if (p.box) remSolid(p.box);
    p.v = v || V(rnd(-2, 2), rnd(0, 2), rnd(-2, 2)); p.av = V(rnd(-1.8, 1.8), rnd(-1, 1), rnd(-1.8, 1.8)); p.hit = new Set();
    D.falling.push(p);
  }
  function fallTick(dt) {
    for (let i = D.falling.length - 1; i >= 0; i--) {
      const p = D.falling[i], m = p.mesh;
      p.v.y -= 34 * dt; m.position.addScaledVector(p.v, dt);
      m.rotation.x += p.av.x * dt; m.rotation.y += p.av.y * dt; m.rotation.z += p.av.z * dt;
      const sp = p.v.length(), rad = Math.max(p.w, p.d) / 2 + .6;
      if (sp > 7) for (const o of chars) {
        if (p.hit.has(o) || o.ko) continue;
        if (Math.abs(o.pos.x - m.position.x) < rad && Math.abs(o.pos.z - m.position.z) < rad && m.position.y > o.pos.y - 1 && m.position.y < o.pos.y + 5.5) { p.hit.add(o); hurt(o, 45 + p.w * p.h * p.d * .4, 'was crushed by falling debris'); o.vel.y = Math.max(o.vel.y, 4); }
      }
      const gy = Math.max(groundAt(m.position.x, m.position.z, m.position.y + .5), 0);
      const half = Math.min(p.w, p.h, p.d) / 2;
      if (m.position.y - half <= gy) { m.position.y = gy + half; m.rotation.x = rnd(-.25, .25); m.rotation.z = rnd(-.25, .25); D.falling.splice(i, 1); }
      if (m.position.y < -50) D.falling.splice(i, 1);
    }
  }

  // ---------- disasters ----------
  const METGEO = new THREE.IcosahedronGeometry(1.7, 1), METMAT = M('#5a2a18', { emissive: '#ff5a10', emissiveIntensity: .9, roughness: .9 });
  const GLOWMAT = new THREE.MeshBasicMaterial({ color: '#ffb040', transparent: true, opacity: .45, depthWrite: false });
  const RINGGEO = new THREE.RingGeometry(3.6, 4.4, 36), CRATER = new THREE.CircleGeometry(3.4, 20), CRMAT = M('#3a2a22', { roughness: 1 });
  const ROCKMAT = M('#5b4a40', { roughness: .95 }), BOOMGEO = new THREE.SphereGeometry(1, 18, 12);
  function meteor() {
    let tx, tz; const al = aliveList();
    if (al.length && Math.random() < .4) { const o = pick(al); tx = o.pos.x + rnd(-5, 5); tz = o.pos.z + rnd(-5, 5); }
    else { const a = Math.random() * 6.283, rr = Math.sqrt(Math.random()) * 98; tx = C.x + Math.sin(a) * rr; tz = C.z + Math.cos(a) * rr; }
    const gy = groundAt(tx, tz, 150); if (gy < SEA - 2) return;
    const ring = new THREE.Mesh(RINGGEO, new THREE.MeshBasicMaterial({ color: '#ff2a2a', transparent: true, opacity: .85, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(tx, gy + .12, tz); scene.add(ring);
    const rock = new THREE.Mesh(METGEO, METMAT); const glow = new THREE.Mesh(BOOMGEO, GLOWMAT); glow.scale.setScalar(2.6); rock.add(glow);
    const from = V(tx + rnd(-40, 40), gy + 150, tz + rnd(-40, 40)); rock.position.copy(from); scene.add(rock);
    D.mets.push({ ring, rock, from, to: V(tx, gy, tz), t: 0, T: rnd(1.9, 2.6) });
  }
  function boom(p, r) {
    const b = new THREE.Mesh(BOOMGEO, new THREE.MeshBasicMaterial({ color: '#ffcf6a', transparent: true, opacity: .9, depthWrite: false }));
    b.position.copy(p); D.junk.add(b); D.fx.push({ m: b, t: 0, T: .5, r });
    const cr = new THREE.Mesh(CRATER, CRMAT); cr.rotation.x = -Math.PI / 2; cr.position.set(p.x, p.y + .07, p.z); cr.scale.setScalar(r / 4.5); D.junk.add(cr);
    for (let k = 0; k < 5; k++) { const d = new THREE.Mesh(METGEO, ROCKMAT); d.scale.setScalar(rnd(.2, .45)); d.position.set(p.x + rnd(-3.5, 3.5), p.y + .3, p.z + rnd(-3.5, 3.5)); d.rotation.set(rnd(0, 6), rnd(0, 6), 0); d.castShadow = true; D.junk.add(d); }
  }
  function metTick(dt) {
    if ((D.metT -= dt) <= 0) { D.metT = rnd(.22, .55); meteor(); }
    for (let i = D.mets.length - 1; i >= 0; i--) {
      const mt = D.mets[i]; mt.t += dt; const f = Math.min(1, mt.t / mt.T);
      mt.rock.position.lerpVectors(mt.from, mt.to, f); mt.rock.rotation.x += dt * 4; mt.rock.rotation.z += dt * 3;
      mt.ring.material.opacity = .45 + .45 * Math.abs(Math.sin(mt.t * 9)); mt.ring.scale.setScalar(1.15 - f * .25);
      if (f >= 1) {
        scene.remove(mt.rock); scene.remove(mt.ring); mt.ring.material.dispose(); D.mets.splice(i, 1);
        boom(mt.to, 7);
        for (const o of chars) {
          if (o.ko) continue; const dx = o.pos.x - mt.to.x, dy = o.pos.y - mt.to.y, dz = o.pos.z - mt.to.z, d = Math.hypot(dx, dy * .6, dz);
          if (d < 8) { const k = 1 - d / 8, l = Math.hypot(dx, dz) || 1; o.vel.x += dx / l * 26 * k; o.vel.z += dz / l * 26 * k; o.vel.y = Math.max(o.vel.y, 12 * k); hurt(o, 140 * k, 'was hit by a meteor'); }
        }
        for (const p of D.pieces) if (!p.fallen && p.q && p.mesh.position.distanceTo(mt.to) < 6.5) collapse(p, V(rnd(-4, 4), rnd(4, 9), rnd(-4, 4)));
        if (me && me.pos.distanceTo(mt.to) < 40) D.shake = Math.max(D.shake, .5);
      }
    }
  }
  function makeTornado() {
    const g = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: '#8a9098', transparent: true, opacity: .5, side: THREE.DoubleSide, depthWrite: false, roughness: 1 });
    const layers = [];
    for (let k = 0; k < 9; k++) {
      const y = k * 8, r0 = 1.6 + k * k * .27, r1 = 1.6 + (k + 1) * (k + 1) * .27;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, 8.4, 20, 1, true), mat); m.position.y = y + 4; g.add(m); layers.push(m);
    }
    const dmat = M('#6a5040'), bits = [];
    for (let k = 0; k < 26; k++) { const b = new THREE.Mesh(UBOX, dmat); b.scale.set(rnd(.4, 1.2), rnd(.3, .8), rnd(.4, 1.2)); b.userData = { a: rnd(0, 6.3), r: rnd(3, 14), y: rnd(1, 40), s: rnd(2, 5) }; g.add(b); bits.push(b); }
    const a = Math.random() * 6.283, st = V(C.x + Math.sin(a) * 85, G, C.z + Math.cos(a) * 85);
    g.position.copy(st); scene.add(g);
    D.torn = { g, layers, bits, pos: g.position, wp: pick(D.spots).clone(), t: 0 };
  }
  function tornTick(dt) {
    const T = D.torn; if (!T) return; T.t += dt;
    const dx = T.wp.x - T.pos.x, dz = T.wp.z - T.pos.z, d = Math.hypot(dx, dz);
    if (d < 4) T.wp = (Math.random() < .35 && aliveList().length ? pick(aliveList()).pos : pick(D.spots)).clone();
    else { const sp = 10.5; T.pos.x += dx / d * sp * dt; T.pos.z += dz / d * sp * dt; }
    T.pos.y = Math.max(G, groundAt(T.pos.x, T.pos.z, G + 1));
    T.layers.forEach((m, i) => { m.rotation.y += dt * (5 - i * .3); m.position.x = Math.sin(T.t * 1.7 + i * .6) * i * .35; m.position.z = Math.cos(T.t * 1.3 + i * .5) * i * .35; });
    for (const b of T.bits) { const u = b.userData; u.a += dt * u.s; b.position.set(Math.sin(u.a) * u.r, u.y + Math.sin(T.t + u.a) * 2, Math.cos(u.a) * u.r); b.rotation.x += dt * 3; b.rotation.y += dt * 2; }
    for (const o of chars) {
      if (o.ko || !onIsland(o)) continue;
      const ox = o.pos.x - T.pos.x, oz = o.pos.z - T.pos.z, od = Math.hypot(ox, oz) || .01;
      if (od > 18 || o.pos.y > T.pos.y + 70) continue;
      const k = 1 - od / 18;
      o.vel.x += (-oz / od * 34 - ox / od * 16) * k * dt * 3; o.vel.z += (ox / od * 34 - oz / od * 16) * k * dt * 3; o.vel.y += 46 * k * dt;
      if (od < 5 && !(o.flung > 0)) { o.flung = 1.2; o.vel.set(ox / od * 34 + rnd(-6, 6), 30 + rnd(0, 10), oz / od * 34 + rnd(-6, 6)); if (o === me) D.shake = Math.max(D.shake, .6); }
      hurt(o, 16 * k * dt, 'was swept away by the tornado');
    }
    for (const p of D.pieces) {
      if (p.fallen || !p.q) continue; const m = p.mesh.position, px = m.x - T.pos.x, pz = m.z - T.pos.z, pd = Math.hypot(px, pz);
      if (pd < 9 && m.y < T.pos.y + 40) collapse(p, V(px / (pd || 1) * 18 - pz / (pd || 1) * 12, rnd(12, 22), pz / (pd || 1) * 18 + px / (pd || 1) * 12));
    }
  }
  function quakeTick(dt) {
    D.shake = Math.max(D.shake, .55 + .25 * Math.sin(D.clock * 1.3));
    for (const o of chars) if (onIsland(o) && !o.ko && o.ground && Math.random() < dt * 6) { o.vel.x += rnd(-6, 6); o.vel.z += rnd(-6, 6); }
    if ((D.qT -= dt) <= 0) {
      D.qT = rnd(.5, 1.2);
      const st = D.pieces.filter(p => p.q && !p.fallen);
      for (let k = 0; k < 2 + (Math.random() * 2 | 0) && st.length; k++) collapse(st.splice(Math.random() * st.length | 0, 1)[0]);
    }
  }
  function makeRain(col, acid) {
    const N = 1400, pos = new Float32Array(N * 6);
    for (let i = 0; i < N; i++) { const x = rnd(-70, 70), y = rnd(0, 80), z = rnd(-70, 70); pos.set([x, y, z, x + .25, y + 2.2, z], i * 6); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: .65 })); m.frustumCulled = false; scene.add(m);
    D.rain = { m, pos, N };
    if (acid && scene.fog) { scene.fog.color.set('#a8c48a'); scene.fog.near = 50; scene.fog.far = 420; }
  }
  function rainTick(dt) {
    const Rn = D.rain; if (!Rn) return; const p = Rn.pos;
    for (let i = 0; i < Rn.N; i++) { const j = i * 6; let y = p[j + 1] - 75 * dt; if (y < 0) y += 80; p[j + 1] = y; p[j + 4] = y + 2.2; }
    Rn.m.geometry.attributes.position.needsUpdate = true; Rn.m.position.set(cam.position.x, Math.max(G - 10, cam.position.y - 40), cam.position.z);
    for (const o of chars) {
      if (o.ko || !onIsland(o)) { o.acid = 0; continue; }
      o.acid = roofOver(o) ? 0 : 1;
      if (o.acid) hurt(o, 9.5 * dt, 'melted in the acid rain');
    }
  }
  // swimming + drowning for everyone (the sea and the flood)
  function swimTick(o, dt, up) {
    const wy = D.waterY, sub = wy - o.pos.y;
    o.inWater = sub > 1.5;
    if (o.inWater) {
      o.vel.x *= 1 - 1.6 * dt; o.vel.z *= 1 - 1.6 * dt;
      if (up && o.stam > 0) { o.stam -= dt; const tgt = wy - 3.7; o.vel.y += ((tgt - o.pos.y) * 3 - o.vel.y) * Math.min(1, dt * 5) + 34 * dt; o.vel.y = Math.min(o.vel.y, 9); o.ground = true; }
      else { o.vel.y += 27 * dt; o.vel.y *= 1 - 2.2 * dt; }
    } else if (o.ground) o.stam = Math.min(STAM, o.stam + dt * 2.5);
    if (o.pos.y + 4.5 < wy) { o.air -= dt; if (o.air <= 0) { if (onIsland(o)) die(o, 'drowned'); else { o.air = 3; o.vel.y = 10; } } }
    else o.air = Math.min(3, o.air + dt * 1.5);
  }

  // ---------- population: bots come and go ----------
  function popTick(dt) {
    if ((D.popT -= dt) > 0) return;
    D.popT = rnd(18, 40);
    const bots = chars.filter(o => o.bot);
    if (bots.length < 6 || (bots.length < 9 && Math.random() < .55)) addBot(true);
    else {
      const L = bots.filter(o => !o.alive); if (!L.length) return;
      const o = pick(L); log(`${esc(o.a.name)} left`); scene.remove(o.c.root); chars.splice(chars.indexOf(o), 1);
    }
  }

  // ---------- HUD ----------
  function hud() {
    const al = aliveList(), sd = D.dis && DIS[D.dis];
    let head;
    if (D.st === 'lobby') head = `⏳ Intermission — next round in <b>${fmtT(D.t)}</b>`;
    else if (D.st === 'calm') head = `🏝️ Round ${D.round} — disaster in <b>${fmtT(D.t)}</b>`;
    else if (D.st === 'dis') head = `<b style="color:${sd.col}">${sd.ic} ${sd.n}</b> — survive <b>${fmtT(D.t)}</b>`;
    else head = '🏁 Round over';
    const st = o => o.ko ? '💀' : (o.alive && D.st !== 'lobby') ? '🟢' : '⏳';
    $('score').innerHTML = `<b>🌋 Disaster Island</b><br><small>${head}</small><br><small>Alive on the island: <b>${D.st === 'lobby' ? 0 : al.length}</b> / ${chars.length}</small><br>` +
      [...chars].sort((a, b) => (b.wins || 0) - (a.wins || 0)).map(o => `${st(o)} ${o === me ? '⭐ ' : ''}${esc(o.a.name)} — ${o.wins || 0} 🏆`).join('<br>');
    let w;
    if (D.st === 'dis') w = `<b style="color:${sd.col};font-size:20px">⚠️ ${sd.ic} ${sd.n}!</b><br><small>${sd.tip} · ${fmtT(D.t)}</small>`;
    else if (D.st === 'calm') w = `<b>🏝️ Get ready…</b><br><small>Disaster in ${fmtT(D.t)}</small>`;
    else if (D.st === 'lobby') w = `<b>⏳ Next round in ${fmtT(D.t)}</b><br><small>${me.alive ? '' : 'Wait in the lobby'}</small>`;
    else w = '<b>🏁 Round over</b>';
    if (D.st !== 'lobby' && !me.alive) w += `<br><small style="color:#ffb0b0">You're out — you play again next round</small>`;
    $('wep').innerHTML = w;
    let it = `🟩 +${D.earned} Bux here`;
    if (me.inWater || me.air < 3) it += ` · 🫧 ${'▮'.repeat(Math.max(0, Math.ceil(me.air * 2)))}`;
    if (me.inWater) it += ` · 🏊 ${'▮'.repeat(Math.max(0, Math.ceil(me.stam / 2)))}${me.stam <= 0 ? ' too tired!' : ''}`;
    if (me.acid) it += ' · <b style="color:#9dff4a">☣️ Find a roof!</b>';
    $('items').innerHTML = it;
  }

  // ---------- main tick ----------
  function tick(dt) {
    if (!D || !me) return;
    D.t -= dt; D.clock += dt;
    if (D.banT > 0 && (D.banT -= dt) <= 0) { const b = $('di-banner'); if (b) b.style.opacity = '0'; }
    for (const o of chars) if (o.ko && o.alive) o.alive = false;
    if (D.st === 'lobby') { if (D.t <= 0) startRound(); }
    else if (D.st === 'calm') { if (D.t <= 0) beginDis(pickDis()); }
    else if (D.st === 'dis') {
      const k = D.dis;
      if (k === 'flood') D.waterY = Math.min(FLOOD_Y, D.waterY + dt * (FLOOD_Y - SEA) / 16);
      if (k === 'meteor') metTick(dt);
      if (k === 'tornado') tornTick(dt);
      if (k === 'quake') quakeTick(dt);
      if (k === 'acid') rainTick(dt);
      if (D.t <= 0 || !aliveList().length) endRound();
    } else if (D.st === 'end') { if (D.t <= 0) toLobby(); }
    if (D.st !== 'dis' || D.dis !== 'flood') D.waterY = Math.max(SEA, D.waterY - dt * 5);
    if (D.water) { D.water.position.y = D.waterY + Math.sin(D.clock * 1.2) * .08; }
    for (const o of chars) { if (o.flung > 0) o.flung -= dt; if (!o.ko) swimTick(o, dt, o === me ? !!K.Space : !!o.swimUp); }
    fallTick(dt);
    for (let i = D.fx.length - 1; i >= 0; i--) { const f = D.fx[i]; f.t += dt; const k = f.t / f.T; f.m.scale.setScalar(f.r * (.3 + k)); f.m.material.opacity = .9 * (1 - k); if (k >= 1) { D.junk.remove(f.m); f.m.material.dispose(); D.fx.splice(i, 1); } }
    popTick(dt);
    // camera shake (earthquake / impacts), only while you are on the island
    if (D.shake > 0) { if (onIsland(me)) { const s = D.shake; cam.position.x += rnd(-s, s); cam.position.y += rnd(-s, s) * .6; cam.position.z += rnd(-s, s); } if (D.dis !== 'quake' || D.st !== 'dis') D.shake = Math.max(0, D.shake - dt * 1.5); }
    const uw = el('di-uw', 'position:fixed;inset:0;pointer-events:none;z-index:4;background:rgba(20,100,180,.38);display:none');
    uw.style.display = cam.position.y < D.waterY - .2 ? 'block' : 'none';
    const ac = el('di-acid', 'position:fixed;inset:0;pointer-events:none;z-index:4;box-shadow:inset 0 0 120px 30px rgba(120,255,40,.55);display:none');
    ac.style.display = me.acid && !me.ko ? 'block' : 'none';
    hud();
  }

  // ---------- start ----------
  function startDisaster() {
    GAME = 'disaster'; mode = 'game'; $('hub').style.display = 'none'; $('hud').style.display = 'block'; $('cross').style.display = 'block'; feed.length = 0; $('feed').innerHTML = '';
    D = { st: 'lobby', t: LOBBY_T, clock: 0, round: 1 + (Math.random() * 30 | 0), dis: null, last: null, pieces: [], falling: [], fx: [], mets: [], high: [], shelter: [], torn: null, rain: null, shake: 0, earned: 0, banT: 0, popT: rnd(15, 30), junk: null };
    buildDisaster(); clearDisaster();
    chars = [];
    me = spawn(av, false); equip(me, -1); me.wins = 0; me.air = 3; me.stam = STAM; me.alive = false;
    // the server is already running: 6-9 bots, either waiting in the lobby or mid-round on the island
    const n = 6 + (Math.random() * 4 | 0); for (let k = 0; k < n; k++) addBot(false);
    if (Math.random() < .5) {
      D.st = 'lobby'; D.t = rnd(5, 13);
      banner('🏝️ Intermission', 'Next round starts soon', '#ffe14a', 3);
    } else {
      const k = pick(KINDS); let i = 0;
      D.st = 'calm';// so onIsland() works while placing
      for (const o of chars) if (o.bot && Math.random() < .7) { o.alive = true; o.air = 3; o.stam = STAM; o.careless = Math.random() > o.smart; tp(o, D.isl[i++ % D.isl.length]); }
      const left = rnd(14, 28); beginDis(k, left);
      if (k === 'flood') D.waterY = SEA + (FLOOD_Y - SEA) * .6;
      banner(`${DIS[k].ic} Round in progress`, `${DIS[k].n} — you join the next round`, DIS[k].col, 3.5);
    }
    log(`🌐 Joined server #${(window.UBX_SERVER && UBX_SERVER.id) || '0000'} — ${chars.length} players`);
    R.domElement.requestPointerLock();
  }

  window.MODES = window.MODES || {};
  MODES.disaster = {
    tick,
    bot,
    spawnFor(o) { if (!D) return null; if (onIsland(o)) return pick(D.isl); return LOBSP.length ? pick(LOBSP) : LOB; },
    attack() { return false; }
  };

  // ---------- game card ----------
  LIST.push({ id: 'disaster', t: 'Disaster Island', d: 'Survive the disasters. Last one standing wins Bux.', ic: '🌋', bg: 'linear-gradient(160deg,#5a3a2a,#ff7a2a)', play: function () { joinServer('disaster', this, startDisaster); } });
  const si = SOON.findIndex(g => g.t === 'Natural Disasters'); if (si >= 0) SOON.splice(si, 1);
  try { cards(); } catch (e) { }
  window.startDisaster = startDisaster;
})();
