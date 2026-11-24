// Starfall Frontier: space survival + industry for unbloxed.html (uses that page's globals: THREE, scene, chars, me, av, GAME, mode,
// solids, GRID, pickups, SPAWNS, PORTALS, sun, cam, R, K, spawn, equip, addSolid, addBux, toast, log, esc, joinServer, stTag, setTag,
// camYaw, camPitch, feed, $).
// You land on a random starter planet in a seeded universe of 3 galaxies (9,216 star systems, generated on demand from a seed, so only
// the planet you stand on is ever built). Drill deposits by clicking, build a base (auto drills, solar, smelters, refineries, silos,
// a lab, a trade terminal), research tech, upgrade your ship and fly to other planets, systems and galaxies.
// Bases keep running on every planet while you're away (offline time capped at 1 hour). Saves to localStorage only (no Supabase).
(function () {
  'use strict';
  var V = function (x, y, z) { return new THREE.Vector3(x, y, z); };
  var SAVE = 'unbloxed_starfall', WORLD_SEED = 7351, EDGE = 190, OFFLINE_CAP = 3600, BASE_CAP = 200, SILO_CAP = 400;
  var SF = null; // mode state

  // ---------- seeded random ----------
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function hseed() { var h = 2166136261; for (var i = 0; i < arguments.length; i++) { h ^= arguments[i] | 0; h = Math.imul(h, 16777619); h ^= h >>> 13; } return h >>> 0; }

  // ---------- items ----------
  var ITEMS = {
    iron: { n: 'Iron Ore', c: '#b9a49a', v: 1 }, copper: { n: 'Copper Ore', c: '#e08a4a', v: 1 }, ice: { n: 'Ice', c: '#bfefff', v: 1 },
    silica: { n: 'Silica', c: '#f2e6c4', v: 2 }, titan: { n: 'Titanium Ore', c: '#9fb4d8', v: 4 }, uran: { n: 'Uranium', c: '#9dff5a', v: 6 },
    crystal: { n: 'Crystal', c: '#d58cff', v: 8 }, ember: { n: 'Ember Shard', c: '#ff6a2a', v: 15 }, voidst: { n: 'Voidstone', c: '#7a6cff', v: 25 },
    ironb: { n: 'Iron Bar', c: '#d6d8de', v: 4 }, copb: { n: 'Copper Bar', c: '#ffa35c', v: 4 }, titb: { n: 'Titanium Bar', c: '#cfe0ff', v: 12 },
    glass: { n: 'Glass', c: '#bff6ff', v: 5 }, fuel: { n: 'Fuel Cell', c: '#ffd84a', v: 3 }
  };
  var ORDER = ['iron', 'copper', 'ice', 'silica', 'titan', 'uran', 'crystal', 'ember', 'voidst', 'ironb', 'copb', 'titb', 'glass', 'fuel'];
  var SMELT = { iron: 'ironb', copper: 'copb', titan: 'titb', silica: 'glass' };

  // ---------- planet types ----------
  // hz: hazard ('' none, cold, heat, magma, toxic, void); g: gravity
  var PT = {
    terra: { n: 'Rocky World', res: ['iron', 'copper', 'silica'], g: 1, hz: '', ground: ['#6e5a48', '#5e4c3e', '#7d6650'], rock: '#5a4a40', skyT: '#1f4f8a', skyH: '#d8b894', fog: '#b89c80' },
    moon: { n: 'Barren Moon', res: ['iron', 'ice'], g: .4, hz: '', ground: ['#8d8f95', '#9a9ca2', '#7c7e84'], rock: '#6b6d73', skyT: '#05060c', skyH: '#1d2130', fog: '#20232e' },
    frost: { n: 'Frost World', res: ['ice', 'iron'], g: .8, hz: 'cold', ground: ['#dbe9f5', '#c9dcec', '#eaf4fb'], rock: '#8fa7bd', skyT: '#3e6aa8', skyH: '#d7e8f7', fog: '#cfe2f2' },
    dune: { n: 'Desert World', res: ['silica', 'copper'], g: 1, hz: 'heat', ground: ['#d9a86a', '#cf9a5a', '#e3b77c'], rock: '#a8714a', skyT: '#c07a4a', skyH: '#f4d2a0', fog: '#efc995' },
    magma: { n: 'Lava World', res: ['titan', 'iron'], g: 1.2, hz: 'magma', ground: ['#3a2a26', '#2e2220', '#46302a'], rock: '#241a18', skyT: '#2a0e08', skyH: '#a8401a', fog: '#6a2a14' },
    toxic: { n: 'Toxic World', res: ['uran', 'copper'], g: .9, hz: 'toxic', ground: ['#5a6a2a', '#4e5e22', '#687a30'], rock: '#3f4a22', skyT: '#3a4a10', skyH: '#b8d060', fog: '#9fb04a' },
    crystal: { n: 'Crystal World', res: ['crystal', 'silica'], g: .6, hz: '', ground: ['#4a3a6a', '#56457a', '#3e305c'], rock: '#2e2448', skyT: '#120a2a', skyH: '#6a4aa8', fog: '#4a3a7a' },
    ember: { n: 'Ember World', res: ['ember', 'titan'], g: 1.1, hz: 'magma', ground: ['#4a1e14', '#5a2618', '#3a1810'], rock: '#2a100a', skyT: '#3a0a02', skyH: '#ff6a2a', fog: '#8a2a0a' },
    voidw: { n: 'Void World', res: ['voidst', 'crystal'], g: .5, hz: 'void', ground: ['#1a1830', '#22203c', '#141226'], rock: '#0c0a1a', skyT: '#000000', skyH: '#2a1a5a', fog: '#140c2a' }
  };
  var HZ = { cold: { n: 'Freezing', tech: 'thermal' }, heat: { n: 'Scorching', tech: 'thermal' }, magma: { n: 'Molten', tech: 'heat' }, toxic: { n: 'Toxic air', tech: 'hazmat' }, void: { n: 'Void radiation', tech: 'voidsuit' } };

  // ---------- galaxies (4096 + 3072 + 2048 = 9216 systems) ----------
  var GAL = [
    { n: 'Helix Reach', count: 4096, arms: 4, pool: ['terra', 'terra', 'moon', 'moon', 'frost', 'dune', 'magma', 'toxic', 'crystal'], col: '#9cc4ff' },
    { n: 'Ember Spiral', count: 3072, arms: 3, pool: ['moon', 'magma', 'magma', 'ember', 'ember', 'dune', 'crystal', 'toxic'], col: '#ff9a5a', need: 'galactic' },
    { n: 'Veil Cloud', count: 2048, arms: 2, pool: ['voidw', 'voidw', 'crystal', 'frost', 'moon', 'toxic'], col: '#b49cff', need: 'veil' }
  ];
  var STARS = [['#fff1c4', 'Yellow dwarf'], ['#ffc27a', 'Orange dwarf'], ['#ff8a6a', 'Red dwarf'], ['#f4f6ff', 'White star'], ['#a8c8ff', 'Blue giant']];
  var SYL = ['ka', 'ri', 'zo', 'vel', 'tor', 'an', 'mi', 'sar', 'qua', 'den', 'lo', 'tre', 'ux', 'pha', 'nim', 'cor', 'ys', 'bel', 'dra', 'eon', 'ka', 'th', 'or', 'ven'];
  var ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  var sysCache = {};
  function sysPos(g, i) {
    var G = GAL[g], r = rng(hseed(WORLD_SEED, g, i, 99)), arm = i % G.arms, d = Math.sqrt(r()) * 430 + 18;
    var a = arm * Math.PI * 2 / G.arms + d * .011 + (r() - .5) * (.55 - d / 1400);
    return { x: Math.cos(a) * d + (r() - .5) * 18, y: Math.sin(a) * d * .82 + (r() - .5) * 18 };
  }
  function system(g, i) {
    var k = g + ':' + i; if (sysCache[k]) return sysCache[k];
    var r = rng(hseed(WORLD_SEED, g, i)), G = GAL[g], p = sysPos(g, i);
    var nm = SYL[r() * SYL.length | 0] + SYL[r() * SYL.length | 0] + (r() < .5 ? SYL[r() * SYL.length | 0] : '');
    nm = nm.charAt(0).toUpperCase() + nm.slice(1);
    var st = STARS[r() * STARS.length | 0], np = 2 + (r() * 5 | 0), pl = [];
    for (var j = 0; j < np; j++) {
      var t = G.pool[r() * G.pool.length | 0];
      pl.push({ t: t, n: nm + ' ' + ROMAN[j], g: Math.round(PT[t].g * (0.85 + r() * .3) * 100) / 100, size: 1 + r() * 2 });
    }
    var S = { g: g, i: i, n: nm + (g ? '' : ''), x: p.x, y: p.y, star: st[0], sk: st[1], pl: pl };
    if (SF && SF.sv && SF.sv.home && SF.sv.home.g == g && SF.sv.home.s == i) homeSystem(S);
    return (sysCache[k] = S);
  }
  // your home system always has what you need to get started
  function homeSystem(S) {
    var T = ['terra', 'moon', 'dune', 'frost', 'toxic', 'magma'], G = [1, .4, 1, .8, .9, 1.2];
    S.star = STARS[0][0]; S.sk = STARS[0][1];
    S.pl = T.map(function (t, j) { return { t: t, n: S.n + ' ' + ROMAN[j], g: G[j], size: 1 + j * .3 }; });
    S.home = 1;
  }
  function pkey(g, s, p) { return g + ':' + s + ':' + p; }

  // ---------- buildings ----------
  var BLD = {
    drill: { n: 'Auto Drill', cost: { iron: 15, copper: 6 }, pw: -2, d: 'Place next to a deposit. Mines it forever.', r: 2.6 },
    solar: { n: 'Solar Panel', cost: { iron: 10, silica: 8 }, pw: 6, d: '+6 power.', r: 2.4 },
    silo: { n: 'Storage Silo', cost: { iron: 25, silica: 10 }, pw: 0, d: '+' + SILO_CAP + ' base storage.', r: 2.6 },
    smelter: { n: 'Smelter', cost: { iron: 30, copper: 10, silica: 10 }, pw: -4, d: 'Ore into bars. Silica into glass.', r: 2.8 },
    lab: { n: 'Research Lab', cost: { ironb: 10, copb: 6, glass: 4 }, pw: -2, d: 'Research tech (press T).', r: 3.2 },
    refinery: { n: 'Fuel Refinery', cost: { ironb: 12, copb: 8, ice: 20 }, pw: -3, d: 'Ice into Fuel Cells.', r: 2.8 },
    terminal: { n: 'Trade Terminal', cost: { ironb: 8, copb: 8, glass: 4 }, pw: -1, d: 'Sell goods and buy supplies.', r: 2.2 },
    fusion: { n: 'Fusion Reactor', cost: { titb: 20, glass: 15, uran: 15 }, pw: 40, d: '+40 power. Burns 1 Uranium a minute.', r: 3.4, need: 'fusion' },
    forge: { n: 'Star Forge', cost: { voidst: 60, ember: 60, titb: 120, crystal: 60 }, pw: -20, d: 'The end goal. Lights a new star.', r: 6, need: 'forge' }
  };
  var BORDER = ['drill', 'solar', 'silo', 'smelter', 'lab', 'refinery', 'terminal', 'fusion', 'forge'];

  // ---------- tech ----------
  var TECH = [
    { id: 'thermal', n: 'Thermal Lining', cost: { ironb: 20, copb: 10 }, d: 'Survive Frost and Desert worlds.' },
    { id: 'drill2', n: 'Drill Mk II', cost: { ironb: 30, glass: 10 }, d: 'Hand drill 3 per hit. Auto drills x2.' },
    { id: 'cargo2', n: 'Cargo Bay II', cost: { ironb: 30, copb: 10 }, d: 'Cargo 100 to 250.' },
    { id: 'tank2', n: 'Fuel Tank II', cost: { ironb: 20, copb: 15 }, d: 'Fuel tank 40 to 90.' },
    { id: 'warp1', n: 'Warp Drive I', cost: { ironb: 40, copb: 25, fuel: 20 }, d: 'Fly to nearby star systems.' },
    { id: 'hazmat', n: 'Hazmat Filter', cost: { copb: 30, glass: 20 }, d: 'Survive Toxic worlds.' },
    { id: 'heat', n: 'Heat Shield', cost: { copb: 25, glass: 20, ice: 30 }, d: 'Survive Lava and Ember worlds.' },
    { id: 'fusion', n: 'Fusion Power', cost: { titb: 15, uran: 10 }, d: 'Unlocks the Fusion Reactor.', req: ['heat', 'hazmat'] },
    { id: 'drill3', n: 'Drill Mk III', cost: { titb: 30, crystal: 10 }, d: 'Hand drill 6 per hit. Auto drills x4.', req: ['drill2'] },
    { id: 'cargo3', n: 'Cargo Bay III', cost: { titb: 30 }, d: 'Cargo 250 to 700.', req: ['cargo2'] },
    { id: 'tank3', n: 'Fuel Tank III', cost: { titb: 25, crystal: 5 }, d: 'Fuel tank 90 to 220.', req: ['tank2'] },
    { id: 'warp2', n: 'Warp Drive II', cost: { titb: 40, crystal: 20 }, d: 'Much longer warp range.', req: ['warp1'] },
    { id: 'galactic', n: 'Galactic Drive', cost: { titb: 80, crystal: 40, uran: 30 }, d: 'Jump to the Ember Spiral galaxy.', req: ['warp2', 'tank3'] },
    { id: 'voidsuit', n: 'Void Suit', cost: { ember: 30, crystal: 20 }, d: 'Survive Void worlds.', req: ['galactic'] },
    { id: 'veil', n: 'Veil Drive', cost: { ember: 60, crystal: 40, titb: 40 }, d: 'Jump to the Veil Cloud galaxy.', req: ['galactic'] },
    { id: 'forge', n: 'Star Forge Plans', cost: { voidst: 20, ember: 20 }, d: 'Unlocks the Star Forge. Build it to win.', req: ['veil', 'voidsuit'] }
  ];
  var TBY = {}; TECH.forEach(function (t) { TBY[t.id] = t; });
  var has = function (id) { return !!(SF && SF.sv.tech[id]); };
  var cargoCap = function () { return has('cargo3') ? 700 : has('cargo2') ? 250 : 100; };
  var tankCap = function () { return has('tank3') ? 220 : has('tank2') ? 90 : 40; };
  var handPow = function () { return has('drill3') ? 6 : has('drill2') ? 3 : 1; };
  var autoMul = function () { return has('drill3') ? 4 : has('drill2') ? 2 : 1; };
  var warpRange = function () { return has('warp2') ? 200 : has('warp1') ? 70 : 0; };

  // ---------- materials / helpers ----------
  var mats = {};
  function mat(c, o) { var k = c + JSON.stringify(o || 0); if (mats[k]) return mats[k]; var O = Object.assign({ roughness: .75 }, o || {}); O.color = lin(c); if (O.emissive) O.emissive = lin(O.emissive); return (mats[k] = new THREE.MeshStandardMaterial(O)); }
  function lin(c) { return new THREE.Color(c).convertSRGBToLinear(); }
  var BOX = new THREE.BoxGeometry(1, 1, 1), CYL = new THREE.CylinderGeometry(.5, .5, 1, 14), CONE = new THREE.ConeGeometry(.5, 1, 12), OCT = new THREE.OctahedronGeometry(.5, 0), ROCK = new THREE.DodecahedronGeometry(.5, 0), MTN = new THREE.ConeGeometry(.5, 1, 7), SPH = new THREE.SphereGeometry(.5, 16, 10);
  function mesh(g, geo, c, o, x, y, z, sx, sy, sz) { var m = new THREE.Mesh(geo, mat(c, o)); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = m.receiveShadow = true; g.add(m); return m; }
  function box3(x, y, z, w, h, d) { return new THREE.Box3(V(x - w / 2, y - h / 2, z - d / 2), V(x + w / 2, y + h / 2, z + d / 2)); }
  var fmt = function (n) { n = Math.floor(n); return n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : '' + n; };
  function tot(o) { var s = 0; for (var k in o) s += o[k]; return s; }

  // ---------- save ----------
  function freshSave() {
    var home = { g: 0, s: Math.random() * GAL[0].count | 0, p: 0 };
    return { v: 1, home: home, cur: { g: home.g, s: home.s, p: 0 }, cargo: {}, cr: 0, fuel: 30, tech: {}, pl: {}, seen: {}, sys: {}, gal: { 0: 1 }, t: 0, won: 0 };
  }
  function load() { try { var s = JSON.parse(localStorage.getItem(SAVE) || 'null'); if (s && s.v == 1 && s.home) return s; } catch (e) { } return null; }
  function save() { if (!SF) return; SF.sv.t = Date.now(); try { localStorage.setItem(SAVE, JSON.stringify(SF.sv)); } catch (e) { } }
  function pdata(k) { var P = SF.sv.pl[k]; if (!P) P = SF.sv.pl[k] = { b: [], st: {}, prog: {} }; if (!P.prog) P.prog = {}; return P; }
  function storeCap(P) { var n = 0; P.b.forEach(function (b) { if (b.k == 'silo') n++; }); return BASE_CAP + n * SILO_CAP; }
  function addTo(o, k, n, cap) { var room = cap - tot(o); n = Math.min(n, Math.max(0, room)); if (n <= 0) return 0; o[k] = (o[k] || 0) + n; return n; }

  // ---------- base simulation (every planet with buildings keeps working) ----------
  function simPlanet(P, dt) {
    if (!P.b.length) return;
    var gen = 0, use = 0, cnt = {};
    P.b.forEach(function (b) { cnt[b.k] = (cnt[b.k] || 0) + 1; var pw = BLD[b.k].pw; if (b.k == 'fusion') { if ((P.st.uran || 0) >= 0.001) gen += pw; } else if (pw > 0) gen += pw; else use -= pw; });
    var eff = use ? Math.min(1, gen / use) : 1, cap = storeCap(P);
    P.eff = eff; P.gen = gen; P.use = use;
    if (cnt.fusion) { P.st.uran = Math.max(0, (P.st.uran || 0) - cnt.fusion * dt / 60); if (!P.st.uran) delete P.st.uran; }
    P.b.forEach(function (b) {
      if (b.k == 'drill' && b.res) addTo(P.st, b.res, .25 * autoMul() * eff * dt, cap);
      else if (b.k == 'smelter') {
        var best = null, bn = 1.99; for (var o in SMELT) if ((P.st[o] || 0) > bn) { best = o; bn = P.st[o]; }
        if (best) { var n = Math.min(.2 * eff * dt, P.st[best] / 2); P.st[best] -= n * 2; if (P.st[best] < .001) delete P.st[best]; addTo(P.st, SMELT[best], n, cap + n * 2); }
      } else if (b.k == 'refinery') {
        var m = Math.min(.25 * eff * dt, (P.st.ice || 0) / 2); if (m > 0) { P.st.ice -= m * 2; if (P.st.ice < .001) delete P.st.ice; addTo(P.st, 'fuel', m, cap + m * 2); }
      }
    });
  }
  function simAll(dt, skip) { for (var k in SF.sv.pl) if (k !== skip) simPlanet(SF.sv.pl[k], dt); }

  // ---------- pops (floating numbers) ----------
  function pop(txt, col, p) {
    var s = SF.pops.find(function (q) { return q.t <= 0; });
    if (!s) { if (SF.pops.length > 8) return; s = { s: stTag(5, 1.1, 256, 56, false), t: 0 }; scene.add(s.s); SF.pops.push(s); }
    setTag(s.s, [txt, col]); s.s.position.set(p.x, p.y, p.z); s.s.visible = true; s.t = 1.2;
  }

  // ---------- sky ----------
  function makeSky(T, star, seed) {
    var r = rng(seed), bodyDir = V(r() - .5, .25 + r() * .35, r() - .5).normalize(), starDir = V(-.6, .55, .4).normalize();
    var bodyCol = new THREE.Color(['#d8c0a0', '#a8c8e8', '#c8a8e8', '#e8a888', '#b8d8a0'][r() * 5 | 0]);
    var m = new THREE.ShaderMaterial({
      side: 1, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(T.skyT) }, hor: { value: new THREE.Color(T.skyH) }, sc: { value: new THREE.Color(star) }, sd: { value: starDir }, bd: { value: bodyDir }, bc: { value: bodyCol }, ring: { value: r() < .5 ? 1 : 0 } },
      vertexShader: 'varying vec3 p;void main(){p=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'uniform vec3 top,hor,sc,sd,bd,bc;uniform float ring;varying vec3 p;' +
        'float h(vec3 q){return fract(sin(dot(q,vec3(12.9898,78.233,37.719)))*43758.5453);}' +
        'void main(){vec3 d=normalize(p);float y=d.y;vec3 c=mix(hor,top,smoothstep(-.05,.6,y));' +
        'float dk=smoothstep(.45,.05,dot(top,vec3(.33)));vec3 q=floor(d*260.);float s=h(q);float st=step(.9965,s)*smoothstep(.0,.25,y)*dk;c+=vec3(st)*(.5+.5*h(q+1.));' +
        'float a=dot(d,sd);c+=sc*(pow(max(a,0.),900.)*3.+pow(max(a,0.),12.)*.35);' +
        'float b=dot(d,bd);if(b>.9965){float l=clamp(dot(normalize(d-bd*b+vec3(0.,.0001,0.)),normalize(sd-bd))*.5+.6,.15,1.);c=mix(c,bc*l,smoothstep(.9965,.9972,b));}' +
        'if(ring>.5){vec3 n=normalize(vec3(.25,1.,.15));float dn=dot(d-bd*b,n);float rr=length(d-bd);if(abs(dn)<.0018&&rr>.09&&rr<.16&&b<.9972)c=mix(c,bc*.9,.55);}' +
        'gl_FragColor=vec4(c,1.);}'
    });
    var sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), m); sky.renderOrder = -1; return sky;
  }

  // ---------- models ----------
  function makeShip() {
    var g = new THREE.Group(), hull = '#e8ecf2', trim = '#2f6fd6', dark = '#2a2f3a';
    mesh(g, BOX, hull, { metalness: .3, roughness: .45 }, 0, 3.2, 0, 4.2, 2.6, 11);
    mesh(g, CONE, hull, { metalness: .3, roughness: .45 }, 0, 3.2, 7.6, 2.9, 4.2, 2.9).rotation.x = Math.PI / 2;
    mesh(g, BOX, '#7fd8ff', { emissive: '#1a5a8a', roughness: .15, metalness: .5 }, 0, 4.7, 3.6, 3.2, 1.2, 3.4);
    mesh(g, BOX, trim, {}, 0, 3.2, 0, 4.3, .5, 11.1);
    [-1, 1].forEach(function (s) {
      var w = mesh(g, BOX, hull, { metalness: .3, roughness: .45 }, s * 4.4, 2.6, -1.5, 5.2, .45, 5.5); w.rotation.z = s * -.08;
      mesh(g, BOX, trim, {}, s * 6.8, 2.5, -1.5, .4, .7, 5.6);
      mesh(g, CYL, dark, { metalness: .6 }, s * 1.4, 3.2, -6, 1.6, 1.6, 1.6).rotation.x = Math.PI / 2;
      var fl = mesh(g, CYL, '#7fe0ff', { emissive: '#3ad0ff', emissiveIntensity: 1.4 }, s * 1.4, 3.2, -6.85, 1.15, .1, 1.15); fl.rotation.x = Math.PI / 2;
      [-3.5, 2.5].forEach(function (z) { mesh(g, CYL, dark, {}, s * 1.8, .9, z, .35, 1.8, .35); mesh(g, BOX, dark, {}, s * 1.8, .1, z, 1.2, .2, 1.2); });
    });
    mesh(g, BOX, hull, {}, 0, 5.2, -4.2, .4, 2.2, 2.6);
    return g;
  }
  function makeDrillTool() {
    var g = new THREE.Group();
    mesh(g, BOX, '#ffcf3a', {}, 0, 0, .55, .45, .5, 1.1);
    mesh(g, BOX, '#2a2f3a', {}, 0, -.35, .2, .25, .5, .3);
    var bit = mesh(g, CONE, '#c9d2de', { metalness: .8, roughness: .25 }, 0, 0, 1.55, .38, 1.1, .38); bit.rotation.x = Math.PI / 2;
    g.userData.bit = bit; return g;
  }
  function makeBuilding(k) {
    var g = new THREE.Group(), u = g.userData, steel = '#c4cad4', dark = '#3a404c';
    if (k == 'drill') {
      mesh(g, BOX, dark, {}, 0, .4, 0, 4, .8, 4);
      [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]].forEach(function (p) { mesh(g, BOX, '#ffb21e', {}, p[0], 3, p[1], .35, 5, .35); });
      mesh(g, BOX, '#ffb21e', {}, 0, 5.4, 0, 3.4, .5, 3.4);
      mesh(g, BOX, steel, {}, 0, 4.4, 0, 1.6, 1.4, 1.6);
      u.spin = mesh(g, CONE, '#9aa4b0', { metalness: .8, roughness: .3 }, 0, 2, 0, 1, 2.6, 1); u.spin.rotation.x = Math.PI;
      u.light = mesh(g, SPH, '#3cff6a', { emissive: '#3cff6a', emissiveIntensity: 1.2 }, 0, 5.9, 0, .4, .4, .4);
    } else if (k == 'solar') {
      mesh(g, CYL, dark, {}, 0, 1.2, 0, .4, 2.4, .4);
      var p = mesh(g, BOX, '#1d3a7a', { metalness: .6, roughness: .2, emissive: '#0a1a44' }, 0, 2.6, 0, 4.4, .2, 3.2); p.rotation.x = -.5;
      for (var i = -1; i <= 1; i++) { var l = mesh(g, BOX, '#8fb0e8', {}, i * 1.47, 2.62, 0, .06, .22, 3.2); l.rotation.x = -.5; }
      u.panel = p;
    } else if (k == 'silo') {
      mesh(g, CYL, steel, { metalness: .4 }, 0, 3.5, 0, 4.4, 7, 4.4);
      mesh(g, SPH, steel, { metalness: .4 }, 0, 7, 0, 4.4, 2, 4.4);
      mesh(g, CYL, '#2f6fd6', {}, 0, 4.5, 0, 4.5, .5, 4.5);
      mesh(g, BOX, dark, {}, 0, 1.2, 2.2, 1.4, 2.4, .2);
    } else if (k == 'smelter') {
      mesh(g, BOX, '#6a5a52', {}, 0, 2, 0, 5, 4, 4.4);
      mesh(g, BOX, '#4a3e38', {}, 0, 4.2, 0, 5.2, .4, 4.6);
      mesh(g, CYL, '#4a3e38', {}, 1.4, 6, -1, .9, 3.6, .9);
      u.light = mesh(g, BOX, '#ff8a2a', { emissive: '#ff6a10', emissiveIntensity: 1.5 }, 0, 1.6, 2.22, 2.6, 1.4, .1);
      u.smoke = mesh(g, SPH, '#bbbbbb', { transparent: true, opacity: .45 }, 1.4, 8.2, -1, 1, 1, 1);
    } else if (k == 'lab') {
      mesh(g, CYL, '#e8ecf2', {}, 0, 1.5, 0, 6, 3, 6);
      mesh(g, SPH, '#9fe6ff', { transparent: true, opacity: .55, roughness: .1, emissive: '#2a6a8a' }, 0, 3, 0, 5.6, 5.6, 5.6);
      u.spin = mesh(g, OCT, '#d58cff', { emissive: '#8a3ad0', emissiveIntensity: 1 }, 0, 4.4, 0, 1.2, 1.6, 1.2);
      mesh(g, CYL, '#2f6fd6', {}, 0, 3.05, 0, 6.1, .3, 6.1);
    } else if (k == 'refinery') {
      [-1.3, 1.3].forEach(function (x) { mesh(g, CYL, '#e8ecf2', { metalness: .3 }, x, 2.6, 0, 2.2, 5.2, 2.2); mesh(g, SPH, '#e8ecf2', {}, x, 5.2, 0, 2.2, 1.2, 2.2); mesh(g, CYL, '#ffd84a', {}, x, 3.4, 0, 2.3, .5, 2.3); });
      mesh(g, CYL, dark, {}, 0, 4, 0, .5, .5, 2.6).rotation.z = Math.PI / 2;
      u.light = mesh(g, SPH, '#ffd84a', { emissive: '#ffb21e', emissiveIntensity: 1.2 }, 0, 6.2, 0, .45, .45, .45);
    } else if (k == 'terminal') {
      mesh(g, BOX, dark, {}, 0, 1.5, 0, 2.6, 3, 1.4);
      var sc = mesh(g, BOX, '#3ce0ff', { emissive: '#1aa0d0', emissiveIntensity: 1.2 }, 0, 2.2, .72, 2, 1.2, .05);
      mesh(g, BOX, '#ffcf3a', {}, 0, 3.2, 0, 2.8, .25, 1.6); u.light = sc;
    } else if (k == 'fusion') {
      mesh(g, CYL, dark, {}, 0, .8, 0, 6.4, 1.6, 6.4);
      u.spin = mesh(g, new THREE.TorusGeometry(2.2, .45, 10, 28), '#cfe0ff', { metalness: .7, roughness: .3 }, 0, 3.6, 0, 1, 1, 1);
      u.light = mesh(g, SPH, '#9dff5a', { emissive: '#6aff2a', emissiveIntensity: 1.6 }, 0, 3.6, 0, 2, 2, 2);
    } else if (k == 'forge') {
      mesh(g, CYL, '#1a1830', {}, 0, 1, 0, 12, 2, 12);
      [0, 1, 2, 3, 4, 5].forEach(function (i) { var a = i * Math.PI / 3; mesh(g, BOX, '#7a6cff', { emissive: '#3a2aa0' }, Math.cos(a) * 5, 6, Math.sin(a) * 5, .8, 10, .8); });
      u.light = mesh(g, SPH, '#fff1c4', { emissive: '#ffd84a', emissiveIntensity: 2 }, 0, 9, 0, 4, 4, 4);
      u.spin = mesh(g, new THREE.TorusGeometry(5.4, .35, 8, 40), '#ff6a2a', { emissive: '#ff3a0a' }, 0, 11, 0, 1, 1, 1);
    }
    return g;
  }
  function depositMesh(res, r) {
    var g = new THREE.Group(), it = ITEMS[res], T = SF.T;
    mesh(g, BOX, T.rock, {}, 0, .5, 0, 3.6 + r() * 1.2, 1.4, 3.2 + r() * 1.2).rotation.y = r() * 3;
    var n = 4 + (r() * 3 | 0);
    for (var i = 0; i < n; i++) {
      var s = .7 + r() * .9, a = r() * 6.28, d = r() * 1.2;
      var m = mesh(g, OCT, it.c, { emissive: it.c, emissiveIntensity: .35, roughness: .35, metalness: .2 }, Math.cos(a) * d, 1.4 + s * .5, Math.sin(a) * d, s * 1.1, s * 2, s * 1.1);
      m.rotation.set((r() - .5) * .7, r() * 3, (r() - .5) * .7);
    }
    return g;
  }

  // ---------- planet ----------
  function buildPlanet() {
    var sv = SF.sv, c = sv.cur, S = system(c.g, c.s), PL = S.pl[c.p], T = PT[PL.t], key = pkey(c.g, c.s, c.p), r = rng(hseed(WORLD_SEED, c.g, c.s, c.p, 7));
    SF.S = S; SF.PL = PL; SF.T = T; SF.key = key; SF.P = pdata(key); SF.deps = []; SF.blds = [];
    scene = new THREE.Scene(); solids.length = 0; GRID.clear(); pickups.length = 0; PORTALS = []; SPAWNS = [V(0, 0, 3)];
    scene.add(makeSky(T, S.star, hseed(c.g, c.s, c.p)));
    scene.fog = new THREE.Fog(lin(T.fog), 140, 560);
    scene.add(new THREE.HemisphereLight(lin(T.skyH), lin(T.ground[2]), .9));
    sun.color.copy(lin(S.star)); sun.intensity = PL.t == 'moon' || PL.t == 'voidw' ? 1.7 : 1.3; scene.add(sun); scene.add(sun.target);
    // ground: one big vertex-coloured plane (cheap) + the collision floor
    var gg = new THREE.PlaneGeometry(EDGE * 2 + 120, EDGE * 2 + 120, 64, 64), cols = [], gc = T.ground.map(function (h) { return lin(h); });
    for (var i = 0; i < gg.attributes.position.count; i++) { var cc = gc[r() * 3 | 0].clone().lerp(gc[r() * 3 | 0], r()); cols.push(cc.r, cc.g, cc.b); }
    gg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    var gm = new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95 })); gm.rotation.x = -Math.PI / 2; gm.receiveShadow = true; scene.add(gm);
    addSolid(box3(0, -1, 0, 1200, 2, 1200));
    // craters / dunes as flat discs, boulders and mesas (solid), border ridge
    for (i = 0; i < 26; i++) { var hot = T.hz == 'magma' && i % 2 == 0, cr = new THREE.Mesh(new THREE.CircleGeometry(3 + r() * 9, 18), hot ? mat('#ff5a10', { emissive: '#ff4a00', emissiveIntensity: 1.2 }) : mat(T.ground[2], { roughness: 1 })); cr.rotation.x = -Math.PI / 2; cr.position.set((r() - .5) * 360, .02 + i * .001, (r() - .5) * 360); cr.receiveShadow = true; scene.add(cr); }
    for (i = 0; i < 34; i++) {
      var x = (r() - .5) * 360, z = (r() - .5) * 360; if (Math.hypot(x, z) < 34) continue;
      var w = 3 + r() * 7, h = 2 + r() * (i < 8 ? 9 : 4), d = 3 + r() * 7;
      var b = mesh(scene, ROCK, T.rock, { flatShading: true }, x, h * .3, z, w, h, d); b.rotation.set(r(), r() * 6, r() * .4); addSolid(box3(x, h * .3, z, w * .7, h * .8, d * .7));
    }
    for (var a = 0; a < 56; a++) {
      var an = a / 56 * Math.PI * 2, rr = EDGE + 22 + r() * 18, hh = 20 + r() * 38, ww = 34 + r() * 26;
      var m = mesh(scene, MTN, T.rock, { flatShading: true }, Math.cos(an) * rr, hh / 2 - 1, Math.sin(an) * rr, ww, hh, ww); m.rotation.y = r() * 6; m.castShadow = false;
    }
    [[0, -EDGE, EDGE * 2, 2], [0, EDGE, EDGE * 2, 2], [-EDGE, 0, 2, EDGE * 2], [EDGE, 0, 2, EDGE * 2]].forEach(function (q) { addSolid(box3(q[0], 30, q[1], q[2], 80, q[3])); });
    // ship (landing site)
    SF.ship = makeShip(); SF.ship.position.set(0, 0, -12); SF.ship.rotation.y = Math.PI * .15; scene.add(SF.ship);
    addSolid(box3(0, 3, -12, 9, 6, 13));
    SF.shipTag = stTag(7, 1.5, 256, 56, true); SF.shipTag.position.set(0, 9, -12); scene.add(SF.shipTag); setTag(SF.shipTag, ['YOUR SHIP  [F]', '#7fe0ff']);
    // deposits: a few near the landing site, the rest spread out
    var nd = 14 + (r() * 6 | 0);
    for (i = 0; i < nd; i++) {
      var res = T.res[i < 6 ? i % T.res.length : (r() < .65 ? 0 : 1) % T.res.length];
      if (i >= 6 && T.res.length > 2 && r() < .3) res = T.res[2];
      var rad = i < 6 ? 24 + i * 4 + r() * 8 : 50 + r() * 120, ang = i < 6 ? i * 1.05 + 2 : r() * Math.PI * 2;
      var dx = Math.cos(ang) * rad, dz = Math.sin(ang) * rad;
      var dm = depositMesh(res, r); dm.position.set(dx, 0, dz); scene.add(dm);
      addSolid(box3(dx, .7, dz, 3.6, 1.4, 3.6));
      SF.deps.push({ res: res, x: dx, z: dz, g: dm, left: 40, max: 40 });
    }
    // your buildings
    SF.P.b.forEach(function (b) { placeMesh(b); });
    SF.ghost = null;
    if (!sv.seen[key]) { sv.seen[key] = 1; if (Object.keys(sv.seen).length > 1) { addBux(3); toast('New planet discovered: ' + PL.n + ' (+3 Bux)'); } }
    if (!sv.sys[c.g + ':' + c.s]) { sv.sys[c.g + ':' + c.s] = 1; if (Object.keys(sv.sys).length > 1) { addBux(10); log('New star system: <b>' + esc(S.n) + '</b> (+10 Bux)'); } }
    SF.suit = 100;
  }
  function placeMesh(b) {
    var g = makeBuilding(b.k); g.position.set(b.x, 0, b.z); g.rotation.y = b.ry || 0; scene.add(g);
    var R = BLD[b.k].r; var sol = box3(b.x, 2, b.z, R * 1.6, 4, R * 1.6); addSolid(sol);
    var o = { b: b, g: g, sol: sol }; SF.blds.push(o); return o;
  }

  // ---------- cargo + costs ----------
  function avail(k) { return Math.floor((SF.sv.cargo[k] || 0) + (SF.P.st[k] || 0)); }
  function canPay(cost) { for (var k in cost) if (avail(k) < cost[k]) return false; return true; }
  function pay(cost) {
    for (var k in cost) {
      var n = cost[k], c = SF.sv.cargo, take = Math.min(n, c[k] || 0); c[k] = (c[k] || 0) - take; if (c[k] <= .001) delete c[k];
      n -= take; if (n > 0) { SF.P.st[k] -= n; if (SF.P.st[k] <= .001) delete SF.P.st[k]; }
    }
  }
  function costHtml(cost) { return Object.keys(cost).map(function (k) { var ok = avail(k) >= cost[k]; return '<span style="color:' + (ok ? '#8dffa0' : '#ff8a8a') + '">' + cost[k] + ' ' + ITEMS[k].n + '</span>'; }).join(', '); }

  // ---------- mining (click) ----------
  function nearestDep(maxD) {
    var best = null, bd = maxD;
    SF.deps.forEach(function (d) { var dd = Math.hypot(d.x - me.pos.x, d.z - me.pos.z); if (dd < bd) { bd = dd; best = d; } });
    return best;
  }
  function mine() {
    if (me.cd > 0 || me.ko) return;
    me.cd = .32; me.swing = .3;
    var d = nearestDep(6.5);
    if (!d) { toast('Walk up to a glowing deposit to drill it'); return; }
    if (d.left < 1) { toast('This deposit is tapped out. It refills soon.'); return; }
    var n = Math.min(handPow(), Math.floor(d.left)), got = addTo(SF.sv.cargo, d.res, n, cargoCap());
    if (!got) { toast('Cargo full. Store it at your ship or a silo (press I).'); return; }
    d.left -= got; me.yaw = camYaw = Math.atan2(d.x - me.pos.x, d.z - me.pos.z);
    pop('+' + got + ' ' + ITEMS[d.res].n, ITEMS[d.res].c, V(d.x, 4.2, d.z));
    d.g.position.y = d.left > 0 ? 0 : -.9;
    if (SF.drillT !== undefined) SF.drillT = .35;
  }

  // ---------- build mode ----------
  function setGhost(k) {
    if (SF.ghost) { scene.remove(SF.ghost.g); SF.ghost = null; }
    if (!k) return;
    var g = makeBuilding(k); g.traverse(function (m) { if (m.material) { m.material = m.material.clone(); m.material.transparent = true; m.material.opacity = .5; m.castShadow = false; } });
    scene.add(g); SF.ghost = { k: k, g: g, ok: false };
    toast('Click to place ' + BLD[k].n + '. Q to cancel.');
  }
  function ghostSpot() {
    var k = SF.ghost.k, R = BLD[k].r, dist = R * 1.8 + 4;
    var x = Math.round((me.pos.x + Math.sin(camYaw) * dist) / 2) * 2, z = Math.round((me.pos.z + Math.cos(camYaw) * dist) / 2) * 2, why = '';
    if (k == 'drill') { var d = nearestDepAt(x, z, 9); if (d) { var a = Math.atan2(x - d.x, z - d.z); x = d.x + Math.sin(a) * 5; z = d.z + Math.cos(a) * 5; } else why = 'Must be next to a deposit'; if (d && SF.blds.some(function (o) { return o.b.k == 'drill' && o.b.di == SF.deps.indexOf(d); })) why = 'That deposit already has a drill'; SF.ghost.dep = d; }
    if (!why && (Math.abs(x) > EDGE - 8 || Math.abs(z) > EDGE - 8)) why = 'Too close to the edge';
    if (!why && Math.hypot(x - 0, z + 12) < 9 + R) why = 'Too close to your ship';
    if (!why && SF.blds.some(function (o) { return Math.hypot(o.b.x - x, o.b.z - z) < BLD[o.b.k].r + R + .5; })) why = 'Too close to another building';
    if (!why && k != 'drill' && SF.deps.some(function (d) { return Math.hypot(d.x - x, d.z - z) < R + 2.6; })) why = 'Too close to a deposit';
    if (!why && k == 'forge' && SF.blds.some(function (o) { return o.b.k == 'forge'; })) why = 'You already built one here';
    SF.ghost.x = x; SF.ghost.z = z; SF.ghost.why = why; SF.ghost.ok = !why;
    SF.ghost.g.position.set(x, 0, z);
    SF.ghost.g.traverse(function (m) { if (m.material && m.material.emissive) m.material.emissive.set(why ? '#a01010' : '#106a20'); });
  }
  function nearestDepAt(x, z, maxD) { var best = null, bd = maxD; SF.deps.forEach(function (d) { var dd = Math.hypot(d.x - x, d.z - z); if (dd < bd) { bd = dd; best = d; } }); return best; }
  function place() {
    var G = SF.ghost, B = BLD[G.k];
    if (!G.ok) { toast(G.why); return; }
    if (!canPay(B.cost)) { toast('Need ' + Object.keys(B.cost).filter(function (k) { return avail(k) < B.cost[k]; }).map(function (k) { return (B.cost[k] - avail(k)) + ' more ' + ITEMS[k].n; }).join(', ')); return; }
    pay(B.cost);
    var b = { k: G.k, x: G.x, z: G.z, ry: G.k == 'solar' ? 0 : Math.round(camYaw / (Math.PI / 2)) * Math.PI / 2 };
    if (G.k == 'drill') { b.res = G.dep.res; b.di = SF.deps.indexOf(G.dep); b.ry = Math.atan2(G.dep.x - b.x, G.dep.z - b.z); }
    SF.P.b.push(b); placeMesh(b); save();
    pop(B.n + ' built', '#8dffa0', V(b.x, 6, b.z));
    if (G.k == 'forge') winGame();
    if (!canPay(B.cost)) setGhost(null);
  }
  function demolish() {
    var best = null, bd = 9; SF.blds.forEach(function (o) { var d = Math.hypot(o.b.x - me.pos.x, o.b.z - me.pos.z); if (d < bd) { bd = d; best = o; } });
    if (!best) { toast('Stand next to a building to remove it'); return; }
    var B = BLD[best.b.k], cap = storeCap(SF.P);
    for (var k in B.cost) addTo(SF.P.st, k, Math.floor(B.cost[k] / 2), cap + 999);
    scene.remove(best.g); var si = solids.indexOf(best.sol); if (si >= 0) solids.splice(si, 1); rebuildGrid();
    SF.P.b.splice(SF.P.b.indexOf(best.b), 1); SF.blds.splice(SF.blds.indexOf(best), 1); save();
    toast(B.n + ' removed. Half the cost went to base storage.');
  }
  function rebuildGrid() { var all = solids.slice(); solids.length = 0; GRID.clear(); all.forEach(addSolid); }

  // ---------- UI panels ----------
  var CSS = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:60;background:#121a2b;color:#e8f0ff;border:2px solid #2f6fd6;border-radius:12px;box-shadow:0 10px 40px #000a;font:14px system-ui,sans-serif;max-height:84vh;overflow:auto;';
  function closePanel() { var p = document.getElementById('sf-panel'); if (p) p.remove(); if (SF) SF.panel = null; }
  function panel(title, html, w) {
    closePanel(); document.exitPointerLock();
    var d = document.createElement('div'); d.id = 'sf-panel'; d.style.cssText = CSS + 'width:min(' + (w || 560) + 'px,94vw);padding:16px 18px';
    d.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><b style="font-size:20px;letter-spacing:.5px">' + title + '</b><span data-x style="cursor:pointer;font-weight:900;font-size:18px;padding:2px 10px;background:#24314d;border-radius:6px">X</span></div>' + html;
    document.body.appendChild(d); d.querySelector('[data-x]').onclick = function () { closePanel(); if (mode == 'game') R.domElement.requestPointerLock(); };
    SF.panel = d; return d;
  }
  var BTN = 'display:inline-block;padding:6px 12px;border-radius:7px;font-weight:800;cursor:pointer;border:0;font-size:13px;';
  function btn(label, ok, data) { return '<button ' + data + ' style="' + BTN + 'background:' + (ok ? '#2fb85a' : '#3a4660') + ';color:' + (ok ? '#fff' : '#9aa6c0') + '">' + label + '</button>'; }

  function buildMenu() {
    var rows = BORDER.filter(function (k) { return !BLD[k].need || has(BLD[k].need); }).map(function (k) {
      var B = BLD[k], ok = canPay(B.cost);
      return '<div style="display:flex;gap:10px;align-items:center;padding:8px;border-radius:8px;background:#1a2540;margin-bottom:6px"><div style="flex:1"><b>' + B.n + '</b> <small style="color:#9fb4d8">' + (B.pw > 0 ? '+' + B.pw + ' power' : B.pw < 0 ? 'uses ' + (-B.pw) + ' power' : '') + '</small><br><small style="color:#b8c4dc">' + B.d + '</small><br><small>' + costHtml(B.cost) + '</small></div>' + btn('Place', ok, 'data-b="' + k + '"') + '</div>';
    }).join('');
    var d = panel('Build', '<div style="color:#9fb4d8;margin-bottom:8px">Costs come from your cargo and this planet\'s base storage. Stand next to a building and press X to remove it.</div>' + rows);
    d.querySelectorAll('[data-b]').forEach(function (e) { e.onclick = function () { var k = e.dataset.b; if (!canPay(BLD[k].cost)) { toast('Not enough materials yet'); return; } closePanel(); setGhost(k); R.domElement.requestPointerLock(); }; });
  }
  function itemRows(o, side) {
    var ks = ORDER.filter(function (k) { return (o[k] || 0) >= 1; });
    if (!ks.length) return '<div style="color:#7f8aa8;padding:6px">Empty</div>';
    return ks.map(function (k) { return '<div style="display:flex;align-items:center;gap:6px;padding:3px 0"><span style="width:10px;height:10px;border-radius:2px;background:' + ITEMS[k].c + '"></span><span style="flex:1">' + ITEMS[k].n + '</span><b>' + fmt(o[k]) + '</b> <button data-mv="' + side + ':' + k + '" style="' + BTN + 'padding:2px 8px;background:#2f6fd6;color:#fff">' + (side == 'c' ? '>' : '<') + '</button></div>'; }).join('');
  }
  function shipD() { return Math.hypot(Math.max(0, Math.abs(me.pos.x) - 5), Math.max(0, Math.abs(me.pos.z + 12) - 7)); }
  function nearStore() {
    if (shipD() < 8) return true;
    return SF.blds.some(function (o) { return o.b.k == 'silo' && Math.hypot(o.b.x - me.pos.x, o.b.z - me.pos.z) < 9; });
  }
  function cargoMenu() {
    var sv = SF.sv, P = SF.P, at = nearStore(), cap = storeCap(P);
    var html = '<div style="display:flex;gap:12px;flex-wrap:wrap"><div style="flex:1;min-width:220px;background:#1a2540;border-radius:8px;padding:10px"><b>Cargo</b> <small style="color:#9fb4d8">' + fmt(tot(sv.cargo)) + ' / ' + cargoCap() + '</small>' + (at ? '<button data-all="c" style="' + BTN + 'float:right;padding:2px 8px;background:#2f6fd6;color:#fff">Store all</button>' : '') + '<div style="margin-top:6px">' + itemRows(sv.cargo, 'c') + '</div></div>' +
      '<div style="flex:1;min-width:220px;background:#1a2540;border-radius:8px;padding:10px"><b>Base storage</b> <small style="color:#9fb4d8">' + fmt(tot(P.st)) + ' / ' + cap + '</small><div style="margin-top:6px">' + itemRows(P.st, 's') + '</div></div></div>' +
      '<div style="margin-top:10px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span>Ship fuel: <b>' + Math.floor(sv.fuel) + ' / ' + tankCap() + '</b></span>' + btn('Refuel ship from Fuel Cells', avail('fuel') > 0 && sv.fuel < tankCap(), 'data-refuel') +
      (at ? '' : '<span style="color:#ffb27a">Stand at your ship or a Storage Silo to move items.</span>') + '</div>';
    var d = panel('Cargo', html, 620);
    d.querySelectorAll('[data-mv]').forEach(function (e) {
      e.onclick = function () {
        if (!at) { toast('Stand at your ship or a Storage Silo'); return; }
        var p = e.dataset.mv.split(':'), from = p[0] == 'c' ? sv.cargo : P.st, to = p[0] == 'c' ? P.st : sv.cargo, k = p[1];
        var n = addTo(to, k, Math.floor(from[k] || 0), p[0] == 'c' ? cap : cargoCap()); from[k] -= n; if (from[k] < 1) { to[k] = (to[k] || 0) + from[k]; delete from[k]; }
        if (!n) toast('No room'); save(); cargoMenu();
      };
    });
    var all = d.querySelector('[data-all]'); if (all) all.onclick = function () { ORDER.forEach(function (k) { if (!sv.cargo[k]) return; var n = addTo(P.st, k, Math.floor(sv.cargo[k]), cap); sv.cargo[k] -= n; if (sv.cargo[k] < 1) { P.st[k] = (P.st[k] || 0) + sv.cargo[k]; delete sv.cargo[k]; } }); save(); cargoMenu(); };
    var rf = d.querySelector('[data-refuel]'); if (rf) rf.onclick = function () { var need = Math.min(tankCap() - sv.fuel, avail('fuel')); if (need <= 0) return; var c = {}; c.fuel = Math.floor(need); pay(c); sv.fuel += Math.floor(need); save(); cargoMenu(); };
  }
  function techMenu() {
    var lab = SF.blds.some(function (o) { return o.b.k == 'lab'; });
    var rows = TECH.map(function (t) {
      var done = has(t.id), locked = (t.req || []).some(function (q) { return !has(q); }), ok = lab && !done && !locked && canPay(t.cost);
      return '<div style="display:flex;gap:10px;align-items:center;padding:8px;border-radius:8px;background:' + (done ? '#173a26' : '#1a2540') + ';margin-bottom:6px;opacity:' + (locked ? .55 : 1) + '"><div style="flex:1"><b>' + t.n + '</b><br><small style="color:#b8c4dc">' + t.d + '</small><br><small>' + (done ? '<span style="color:#8dffa0">Researched</span>' : locked ? 'Needs ' + t.req.map(function (q) { return TBY[q].n; }).join(' + ') : costHtml(t.cost)) + '</small></div>' + (done ? '' : btn('Research', ok, 'data-t="' + t.id + '"')) + '</div>';
    }).join('');
    var d = panel('Research', (lab ? '' : '<div style="color:#ffb27a;margin-bottom:8px">Build a Research Lab on this planet to research.</div>') + rows, 600);
    d.querySelectorAll('[data-t]').forEach(function (e) {
      e.onclick = function () {
        var t = TBY[e.dataset.t]; if (!lab) { toast('Build a Research Lab here first'); return; } if (!canPay(t.cost) || (t.req || []).some(function (q) { return !has(q); })) { toast('Not enough materials yet'); return; }
        pay(t.cost); SF.sv.tech[t.id] = 1; save(); toast(t.n + ' researched!'); log('Researched <b>' + t.n + '</b>');
        if (t.id == 'galactic' || t.id == 'veil') { addBux(25); }
        techMenu();
      };
    });
  }
  var BUY = { fuel: 6, iron: 3, copper: 3, ice: 3, silica: 5 };
  function tradeMenu() {
    var sv = SF.sv, P = SF.P;
    var sell = ORDER.filter(function (k) { return avail(k) >= 1; }).map(function (k) { return '<div style="display:flex;align-items:center;gap:6px;padding:3px 0"><span style="flex:1">' + ITEMS[k].n + ' <small style="color:#9fb4d8">x' + avail(k) + '</small></span><small>' + ITEMS[k].v + ' cr each</small> ' + btn('Sell 10', true, 'data-s="' + k + ':10"') + btn('Sell all', true, 'data-s="' + k + ':all"') + '</div>'; }).join('') || '<div style="color:#7f8aa8">Nothing to sell</div>';
    var buy = Object.keys(BUY).map(function (k) { return '<div style="display:flex;align-items:center;gap:6px;padding:3px 0"><span style="flex:1">' + ITEMS[k].n + '</span><small>' + BUY[k] + ' cr each</small> ' + btn('Buy 10', sv.cr >= BUY[k] * 10, 'data-y="' + k + '"') + '</div>'; }).join('');
    var d = panel('Trade Terminal', '<div style="margin-bottom:8px">Credits: <b style="color:#ffd84a">' + fmt(sv.cr) + '</b></div><div style="display:flex;gap:12px;flex-wrap:wrap"><div style="flex:1;min-width:250px;background:#1a2540;border-radius:8px;padding:10px"><b>Sell</b>' + sell + '</div><div style="flex:1;min-width:220px;background:#1a2540;border-radius:8px;padding:10px"><b>Buy</b> <small style="color:#9fb4d8">(goes to base storage)</small>' + buy + '</div></div>', 640);
    d.querySelectorAll('[data-s]').forEach(function (e) { e.onclick = function () { var p = e.dataset.s.split(':'), k = p[0], n = p[1] == 'all' ? avail(k) : Math.min(10, avail(k)); var c = {}; c[k] = n; pay(c); sv.cr += n * ITEMS[k].v; save(); tradeMenu(); }; });
    d.querySelectorAll('[data-y]').forEach(function (e) { e.onclick = function () { var k = e.dataset.y; if (sv.cr < BUY[k] * 10) { toast('Not enough credits'); return; } var n = addTo(P.st, k, 10, storeCap(P)); if (!n) { toast('Base storage is full'); return; } sv.cr -= BUY[k] * n; save(); tradeMenu(); }; });
  }

  // ---------- star map ----------
  function travelCost(g, s, p) {
    var c = SF.sv.cur;
    if (g == c.g && s == c.s) return p == c.p ? null : { fuel: 4 };
    if (g != c.g) { if (!GAL[g].need || has(GAL[g].need)) return { fuel: 150, gal: 1 }; return { no: 'Needs ' + TBY[GAL[g].need].n }; }
    var A = system(c.g, c.s), B = system(g, s), d = Math.hypot(A.x - B.x, A.y - B.y);
    if (!warpRange()) return { no: 'Needs Warp Drive I' };
    if (d > warpRange()) return { no: 'Out of warp range' };
    return { fuel: Math.round(10 + d * .2) };
  }
  function starMap(g) {
    closePanel(); document.exitPointerLock();
    var sv = SF.sv; g = g == null ? sv.cur.g : g; var sel = SF.mapSel && SF.mapSel.g == g ? SF.mapSel.s : (g == sv.cur.g ? sv.cur.s : null);
    var d = document.createElement('div'); d.id = 'sf-panel'; d.style.cssText = CSS + 'width:min(1000px,96vw);padding:12px;display:flex;gap:12px;flex-wrap:wrap';
    var tabs = GAL.map(function (G, i) { var open = !G.need || has(G.need); return '<button data-g="' + i + '" style="' + BTN + 'background:' + (i == g ? '#2f6fd6' : '#24314d') + ';color:' + (open ? '#fff' : '#7f8aa8') + '">' + G.n + (open ? '' : ' (locked)') + '</button>'; }).join(' ');
    d.innerHTML = '<div style="flex:1 1 560px;min-width:280px"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px"><b style="font-size:20px">Star Map</b><span>' + tabs + '</span></div><canvas width="640" height="560" style="width:100%;background:#03050c;border-radius:8px;cursor:crosshair"></canvas><div style="color:#9fb4d8;font-size:12px;margin-top:4px">' + GAL[g].count.toLocaleString() + ' systems. Click a star to see its planets. Ring = your warp range.</div></div><div data-side style="flex:1 1 280px;min-width:240px"></div><span data-x style="position:absolute;right:12px;top:10px;cursor:pointer;font-weight:900;font-size:18px;padding:2px 10px;background:#24314d;border-radius:6px">X</span>';
    document.body.appendChild(d); SF.panel = d;
    d.querySelector('[data-x]').onclick = function () { closePanel(); R.domElement.requestPointerLock(); };
    d.querySelectorAll('[data-g]').forEach(function (e) { e.onclick = function () { SF.mapSel = null; starMap(+e.dataset.g); }; });
    var cv = d.querySelector('canvas'), cx = cv.getContext('2d'), W = cv.width, H = cv.height, sc = Math.min(W, H) / 980, ox = W / 2, oy = H / 2;
    var G = GAL[g], pts = [];
    for (var i = 0; i < G.count; i++) pts.push(sysPos(g, i));
    function draw() {
      cx.fillStyle = '#03050c'; cx.fillRect(0, 0, W, H);
      var grd = cx.createRadialGradient(ox, oy, 0, ox, oy, 120); grd.addColorStop(0, G.col + '55'); grd.addColorStop(1, '#0000'); cx.fillStyle = grd; cx.fillRect(0, 0, W, H);
      for (var i = 0; i < pts.length; i++) { var p = pts[i], v = sv.sys[g + ':' + i]; cx.fillStyle = v ? '#8dffa0' : (i * 7 % 5 == 0 ? G.col : '#c8d4ee'); cx.globalAlpha = v ? 1 : .55; cx.fillRect(ox + p.x * sc - (v ? 1.5 : .75), oy + p.y * sc - (v ? 1.5 : .75), v ? 3 : 1.5, v ? 3 : 1.5); }
      cx.globalAlpha = 1;
      if (g == sv.cur.g) { var c = pts[sv.cur.s]; cx.strokeStyle = '#ffd84a'; cx.lineWidth = 2; cx.beginPath(); cx.arc(ox + c.x * sc, oy + c.y * sc, 6, 0, 7); cx.stroke(); if (warpRange()) { cx.setLineDash([4, 4]); cx.strokeStyle = '#2f6fd6'; cx.beginPath(); cx.arc(ox + c.x * sc, oy + c.y * sc, warpRange() * sc, 0, 7); cx.stroke(); cx.setLineDash([]); } }
      if (g == sv.home.g) { var h = pts[sv.home.s]; cx.fillStyle = '#ffd84a'; cx.font = 'bold 11px system-ui'; cx.fillText('HOME', ox + h.x * sc + 7, oy + h.y * sc - 6); }
      if (sel != null) { var s = pts[sel]; cx.strokeStyle = '#fff'; cx.lineWidth = 2; cx.beginPath(); cx.arc(ox + s.x * sc, oy + s.y * sc, 9, 0, 7); cx.stroke(); }
    }
    function side() {
      var el = d.querySelector('[data-side]');
      if (sel == null) { el.innerHTML = '<div style="color:#9fb4d8;padding:8px">Pick a star system.<br><br>Fuel: <b>' + Math.floor(sv.fuel) + ' / ' + tankCap() + '</b></div>'; return; }
      var S = system(g, sel), here = g == sv.cur.g && sel == sv.cur.s;
      el.innerHTML = '<b style="font-size:17px">' + esc(S.n) + '</b>' + (S.home ? ' <small style="color:#ffd84a">HOME</small>' : '') + '<br><small style="color:#9fb4d8">' + S.sk + ' · ' + S.pl.length + ' planets · ' + GAL[g].n + '</small><div style="margin:6px 0;color:#b8c4dc">Ship fuel: <b>' + Math.floor(sv.fuel) + ' / ' + tankCap() + '</b></div>' +
        S.pl.map(function (P, j) {
          var T = PT[P.t], c = travelCost(g, sel, j), cur = here && j == sv.cur.p, hz = T.hz ? HZ[T.hz] : null, base = sv.pl[pkey(g, sel, j)] && sv.pl[pkey(g, sel, j)].b.length;
          var act = cur ? '<small style="color:#8dffa0">You are here</small>' : c.no ? '<small style="color:#ff8a8a">' + c.no + '</small>' : btn('Fly (' + c.fuel + ' fuel)', sv.fuel >= c.fuel, 'data-go="' + j + '"');
          return '<div style="background:#1a2540;border-radius:8px;padding:7px;margin-top:6px"><b>' + esc(P.n) + '</b> <small style="color:#9fb4d8">' + T.n + '</small>' + (base ? ' <small style="color:#8dffa0">BASE</small>' : '') + '<br><small>' + T.res.map(function (k) { return '<span style="color:' + ITEMS[k].c + '">' + ITEMS[k].n + '</span>'; }).join(', ') + ' · ' + P.g + 'g' + (hz ? ' · <span style="color:' + (has(hz.tech) ? '#8dffa0' : '#ffb27a') + '">' + hz.n + '</span>' : '') + '</small><div style="margin-top:4px">' + act + '</div></div>';
        }).join('') + (sv.fuel < 4 ? '<div style="margin-top:10px">' + btn('Out of fuel: tow me home (free)', true, 'data-tow') + '</div>' : '');
      el.querySelectorAll('[data-go]').forEach(function (e) {
        e.onclick = function () {
          var j = +e.dataset.go, c = travelCost(g, sel, j); if (!c || c.no) return;
          if (shipD() > 10) { toast('Walk back to your ship to take off'); return; }
          if (sv.fuel < c.fuel) { toast('Not enough fuel. Refine Ice into Fuel Cells and refuel (press I).'); return; }
          sv.fuel -= c.fuel; travel(g, sel, j, c.gal);
        };
      });
      var tw = el.querySelector('[data-tow]'); if (tw) tw.onclick = function () { sv.fuel = Math.max(sv.fuel, 10); travel(sv.home.g, sv.home.s, sv.home.p); };
    }
    cv.onclick = function (e) {
      var rc = cv.getBoundingClientRect(), mx = (e.clientX - rc.left) / rc.width * W, my = (e.clientY - rc.top) / rc.height * H, best = -1, bd = 14;
      for (var i = 0; i < pts.length; i++) { var dd = Math.hypot(ox + pts[i].x * sc - mx, oy + pts[i].y * sc - my); if (dd < bd) { bd = dd; best = i; } }
      if (best >= 0) { sel = best; SF.mapSel = { g: g, s: sel }; draw(); side(); }
    };
    draw(); side();
  }
  function travel(g, s, p, gal) {
    closePanel(); save();
    var ov = document.createElement('div'); ov.style.cssText = 'position:fixed;inset:0;z-index:70;background:radial-gradient(circle,#1a2a6a,#000 70%);color:#cfe0ff;display:flex;align-items:center;justify-content:center;font:900 28px system-ui;letter-spacing:2px;transition:opacity .4s';
    var S = system(g, s); ov.textContent = (gal ? 'GALACTIC JUMP: ' + GAL[g].n.toUpperCase() : 'WARPING TO ' + S.pl[p].n.toUpperCase()); document.body.appendChild(ov);
    setTimeout(function () {
      SF.sv.cur = { g: g, s: s, p: p };
      if (gal && !SF.sv.gal[g]) { SF.sv.gal[g] = 1; addBux(100); log('You reached the <b>' + GAL[g].n + '</b> galaxy! (+100 Bux)'); }
      enterPlanet(); save(); ov.style.opacity = 0; setTimeout(function () { ov.remove(); }, 450); R.domElement.requestPointerLock();
    }, 1300);
  }
  function enterPlanet() {
    var meA = av; buildPlanet(); chars = []; me = spawn(meA, false); equip(me, -1); fitDrill();
    me.pos.set(0, .5, 3); me.vel.set(0, 0, 0); camYaw = Math.PI; camPitch = .3;
    var PL = SF.PL, T = SF.T;
    log('Landed on <b>' + esc(PL.n) + '</b> (' + T.n + ')' + (T.hz && !has(HZ[T.hz].tech) ? ': <span style="color:#ffb27a">' + HZ[T.hz].n + '! Your suit drains away from the ship.</span>' : ''));
  }
  function fitDrill() {
    try { var sw = me.c.sw; SF.tool = makeDrillTool(); SF.tool.position.set(0, 0, -.2); sw.add(SF.tool); } catch (e) { SF.tool = null; }
  }
  function winGame() {
    if (SF.sv.won) return; SF.sv.won = 1; addBux(500); save();
    panel('A new star is born', '<div style="font-size:15px;line-height:1.6">Your Star Forge lit up the Veil Cloud. You beat <b>Starfall Frontier</b>!<br>+500 Bux. Your bases keep running, so keep exploring.</div><div style="margin-top:12px">' + btn('Keep playing', true, 'data-ok') + '</div>');
    SF.panel.querySelector('[data-ok]').onclick = function () { closePanel(); R.domElement.requestPointerLock(); };
  }

  // ---------- keys ----------
  addEventListener('keydown', function (e) {
    if (GAME != 'starfall' || mode != 'game' || !SF || !me) return;
    if (e.target && (e.target.tagName == 'INPUT' || e.target.tagName == 'TEXTAREA')) return;
    var c = e.code;
    if (c == 'Escape' || c == 'KeyQ') { if (SF.ghost) setGhost(null); if (SF.panel) closePanel(); return; }
    if (SF.panel) { if ((c == 'KeyB' || c == 'KeyI' || c == 'KeyT' || c == 'KeyM') && SF.panelKey == c) { closePanel(); R.domElement.requestPointerLock(); } return; }
    SF.panelKey = c;
    if (c == 'KeyB') { setGhost(null); buildMenu(); }
    else if (c == 'KeyI') cargoMenu();
    else if (c == 'KeyT') techMenu();
    else if (c == 'KeyM') starMap();
    else if (c == 'KeyF') {
      if (shipD() < 10) starMap();
      else { var t = SF.blds.find(function (o) { return o.b.k == 'terminal' && Math.hypot(o.b.x - me.pos.x, o.b.z - me.pos.z) < 8; }); if (t) tradeMenu(); else toast('Press F at your ship to fly, or at a Trade Terminal to trade'); }
    }
    else if (c == 'KeyX') demolish();
  });

  // ---------- main tick ----------
  function tick(dt) {
    if (!SF || !me) return;
    var sv = SF.sv, P = SF.P, T = SF.T, PL = SF.PL;
    SF.t += dt;
    // gravity of this world (physics() applies normal gravity; undo the difference)
    if (!me.ground && !me.ko) me.vel.y += 34 * (1 - PL.g) * dt;
    // base sims: this planet every frame, the rest once a second
    simPlanet(P, dt);
    if ((SF.simT -= dt) <= 0) { simAll(1 - SF.simT, SF.key); SF.simT = 1; }
    // deposits slowly refill
    SF.deps.forEach(function (d) { if (d.left < d.max) { d.left = Math.min(d.max, d.left + dt * .5); if (d.left > 1) d.g.position.y = 0; } });
    // building animation
    SF.blds.forEach(function (o) { var u = o.g.userData, on = (P.eff || 0) > 0.05; if (u.spin && on) { if (o.b.k == 'drill') u.spin.rotation.y += dt * 8 * (P.eff || 0); else u.spin.rotation.y += dt * 1.2; } if (u.smoke) { u.smoke.position.y = 8.2 + (SF.t * 1.5 % 3); u.smoke.material.opacity = on ? .45 * (1 - (SF.t * 1.5 % 3) / 3) : 0; } if (u.light && u.light.material.emissiveIntensity !== undefined) u.light.material.emissiveIntensity = on ? 1.2 + Math.sin(SF.t * 4) * .3 : .1; });
    // ghost
    if (SF.ghost) ghostSpot();
    // tool: hide the sword, spin the drill bit while drilling
    try { me.c.sw.children.forEach(function (m) { if (m !== SF.tool) m.visible = false; }); } catch (e) { }
    if (SF.tool) { if (!SF.tool.parent) fitDrill(); SF.drillT = Math.max(0, (SF.drillT || 0) - dt); SF.tool.userData.bit.rotation.y += dt * (SF.drillT > 0 ? 40 : 0); }
    // hazards
    var hz = T.hz && !has(HZ[T.hz].tech), atShip = shipD() < 8;
    if (hz && !me.ko) { if (atShip) SF.suit = Math.min(100, SF.suit + dt * 30); else SF.suit = Math.max(0, SF.suit - dt * 100 / 75); if (SF.suit <= 0) { me.hp -= dt * 10; if (me.hp <= 0 && typeof knock == 'function') knock(me, null); } }
    else SF.suit = 100;
    // pops
    SF.pops.forEach(function (q) { if (q.t > 0) { q.t -= dt; q.s.position.y += dt * 2; if (q.t <= 0) q.s.visible = false; } });
    if ((SF.saveT -= dt) <= 0) { SF.saveT = 6; save(); }
    if ((SF.hud -= dt) <= 0) {
      SF.hud = .25;
      var cg = sv.cargo, show = ORDER.filter(function (k) { return (cg[k] || 0) >= 1; }).slice(0, 8);
      $('score').innerHTML = '<b style="font-size:16px;color:#7fe0ff">' + esc(PL.n) + '</b><br><span style="font-size:12px;color:#c8d4ee">' + T.n + ' · ' + PL.g + 'g · ' + esc(SF.S.n) + ' system</span>' +
        (hz ? '<br><span style="color:#ffb27a;font-weight:700">' + HZ[T.hz].n + ': suit ' + Math.ceil(SF.suit) + '%</span>' : '') +
        '<br>Fuel <b>' + Math.floor(sv.fuel) + '/' + tankCap() + '</b> · Credits <b style="color:#ffd84a">' + fmt(sv.cr) + '</b>' +
        '<br><b style="font-size:12px;color:#ffd84a">Cargo ' + fmt(tot(cg)) + '/' + cargoCap() + '</b><br>' + (show.length ? show.map(function (k) { return '<span style="font-size:12px"><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:' + ITEMS[k].c + '"></span> ' + ITEMS[k].n + ' ' + fmt(cg[k]) + '</span>'; }).join('<br>') : '<span style="font-size:12px;color:#9fb4d8">empty</span>') +
        (P.b.length ? '<br><b style="font-size:12px;color:#8dffa0">Base</b> <span style="font-size:12px">' + P.b.length + ' buildings · power ' + (P.gen || 0) + '/' + (P.use || 0) + (P.eff < 1 ? ' <span style="color:#ff8a8a">LOW</span>' : '') + ' · storage ' + fmt(tot(P.st)) + '/' + storeCap(P) + '</span>' : '');
      var d = nearestDep(6.5), hint;
      if (SF.ghost) hint = SF.ghost.ok ? 'Click to place ' + BLD[SF.ghost.k].n : SF.ghost.why;
      else if (atShip) hint = 'F: Star Map · I: Cargo';
      else if (d) hint = 'Click to drill ' + ITEMS[d.res].n + (d.left < 1 ? ' (refilling)' : '');
      else hint = 'B: Build · I: Cargo · T: Research · M: Map';
      $('wep').innerHTML = '<b>' + hint + '</b>';
    }
    $('items').textContent = '';
  }

  function startStarfall() {
    GAME = 'starfall'; mode = 'game'; $('hub').style.display = 'none'; $('hud').style.display = 'block'; $('cross').style.display = 'block'; feed.length = 0; $('feed').innerHTML = ''; $('dead').style.display = 'none';
    $('help').textContent = 'Click drill · B build · I cargo · T research · M map';
    var sv = load(), first = !sv; if (!sv) sv = freshSave();
    SF = { sv: sv, t: 0, pops: [], saveT: 6, hud: 0, simT: 1, panel: null };
    sysCache = {};
    // offline progress for every base (1 hour cap), in 10 s steps
    var away = 0;
    if (sv.t) { away = Math.min(OFFLINE_CAP, Math.max(0, (Date.now() - sv.t) / 1000)); if (away > 30) { var before = 0, after = 0; for (var k in sv.pl) before += tot(sv.pl[k].st); for (var s = 0; s < away; s += 10) simAll(Math.min(10, away - s)); for (k in sv.pl) after += tot(sv.pl[k].st); away = after - before; } else away = 0; }
    enterPlanet();
    if (first) panel('Starfall Frontier', '<div style="font-size:15px;line-height:1.6">Your ship touched down on <b>' + esc(SF.PL.n) + '</b>, somewhere in the <b>Helix Reach</b>.<br><br>1. Click glowing deposits to drill Iron, Copper and Silica.<br>2. Press <b>B</b> to build Auto Drills, Solar Panels and a Smelter.<br>3. Build a Research Lab, then press <b>T</b> to unlock tech.<br>4. Make Fuel from Ice and press <b>F</b> at your ship to fly to new worlds.<br><br>Three galaxies and 9,216 star systems are out there. Your bases keep working while you\'re gone.</div><div style="margin-top:12px">' + btn('Start', true, 'data-ok') + '</div>');
    else if (away >= 1) panel('Welcome back', '<div style="font-size:15px">Your bases produced <b>' + fmt(away) + '</b> goods while you were away.</div><div style="margin-top:12px">' + btn('Nice', true, 'data-ok') + '</div>');
    if (SF.panel) SF.panel.querySelector('[data-ok]').onclick = function () { closePanel(); R.domElement.requestPointerLock(); };
    else R.domElement.requestPointerLock();
    save();
  }

  window.MODES = window.MODES || {};
  window.MODES.starfall = {
    tick: tick,
    spawnFor: function () { return V(0, 0, 3); },
    attack: function (o) { if (o !== me) return false; if (SF && SF.panel) return false; if (SF && SF.ghost) place(); else mine(); return false; }
  };
  window.startStarfall = startStarfall;
  window.STARFALL_DEBUG = function () { return { SF: SF, enter: enterPlanet, place: placeMesh, save: save }; };
  addEventListener('beforeunload', function () { if (GAME == 'starfall' && SF) save(); });
  var back = document.getElementById('back'); if (back) back.addEventListener('click', function () { if (GAME == 'starfall' && SF) { save(); closePanel(); setGhost(null); sun.intensity = 1.6; sun.color.set('#fff4e0'); } });

  if (typeof LIST != 'undefined') {
    if (!LIST.some(function (g) { return g.id == 'starfall'; })) LIST.push({ id: 'starfall', t: 'Starfall Frontier', d: 'Land on a random planet, drill resources, build a base and industry, and fly across 3 galaxies and 9,216 star systems.', ic: '', bg: 'url(unbloxed/thumbs/starfall-sq.jpg) center/clamp(0px,(300px - 100%)*999,100%) 100% no-repeat,url(unbloxed/thumbs/starfall-wide.jpg) center/cover #0a1230', play: function () { joinServer('starfall', this, startStarfall); } });
    if (typeof GINFO != 'undefined') GINFO.starfall = { genre: 'Simulation', created: '11/23/2026' };
    cards();
  }
})();
