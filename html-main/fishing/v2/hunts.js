// Fishing Unblocked v2 — HUNTS: rare boss encounters at sea (window.FHUNT).
// Schedule comes from the real clock (Date.now()) exactly like events.js, so every player shares the same hunts with no networking.
//  * Every in-game night (game day = 20 real min, night = day phase .62–.92) rolls a seeded hash:
//      ABYSSAL ANGLER hunt 1/10, its rare variant the DUKE 1/100 (DUKE wins if both roll). Lasts the rest of that night.
//  * Sea-boss slot: every 10-minute slot rolls (BOSS_CHANCE) one of 7 bosses (3 roaming + 4 island-coast bosses; 4–7 min; any time of day).
//  * Day slot: every game day rolls (DAY_CHANCE) one island-coast boss during daylight (5–7 min).
//  * Deep slot: every game night rolls (RIFT_CHANCE) the Gloomwarden in the deep sea (night only, from just after dusk until dawn, ~5–6 min).
//    Coast bosses circle open sea 60–160 m off their themed island (KINDS[k].near; FW.heightAt < -3 over the whole ring);
//    the Gloomwarden hunts the deep sea far from every island. Expected ≈ 72 non-Abyssal hunts per 24 real hours (≈ 1 per 20 min).
//  * Spawner items: FHUNT.summon(kind, x, z, now) makes a local 6-minute hunt at open sea near (x, z).
// Visuals (camera within ~600): the creature is MASSIVE and slowly circles the fishing zone with its back breaking the water,
// surfaces in an arc + splash every ~20 s, a dark churning ring marks the zone, foam/spray, lure glow for angler/duke.
// Budget: MeshBasic + Points only, no lights, <= 6 draw calls per hunt (ring, spray, [lure, glow disc], creature), built lazily,
// hidden when far, no per-frame allocation. The Abyssal Angler / DUKE models are supplied by the game (setModel) and are only
// wrapped, scaled up and animated — never modified.
(function () {
  'use strict';
  const DAY_MS = 20 * 60000, SLOT = DAY_MS / 2, N0 = .62, N1 = .92, MIN = 60000, FADE = 6000;
  const ZONE_R = 22, SUMMON_MS = 6 * MIN, FAR = 600;
  let OFF = 0;                      // game clock minus real clock (the game's Time-Dial offset), learned from update(t, dt, cam, now)
  function clock() { return Date.now() + OFF; }
  // fallback island table (contract §World layout) — used when FW.islands is not available
  const ISL = [['harbor', 0, 0, 170], ['coral', 520, -260, 120], ['frost', -420, -620, 150], ['dunes', 760, 380, 140], ['mire', -760, 60, 140],
    ['crystal', -380, 560, 120], ['ember', 220, 880, 150], ['sky', 900, -760, 120], ['elder', 140, -900, 130]];

  // ------------------------------------------------------------------ kinds + boss fish
  const KINDS = {
    angler: { n: 'Abyssal Angler', ico: '', fish: 'abyssal-angler', len: 25, dive: .2, kg: [2000, 30000], skew: 3, night: true, chance: 1 / 10,
      lure: 0xb6ff7a, glow: 0x3aff9a, ring: [6, 26, 22], foam: 'rgba(200,255,220,', desc: 'A colossal angler that hunts the open sea at night, its lure glowing beneath the waves.' },
    duke: { n: 'DUKE', ico: '', fish: 'duke-anglerfish', len: 35, dive: .2, kg: [8000, 60000], skew: 3, night: true, chance: 1 / 100, variantOf: 'angler',
      lure: 0x7af0ff, glow: 0x2a9cff, ring: [2, 16, 40], foam: 'rgba(190,240,255,', desc: 'The DUKE: a vast cyan-blue Abyssal Angler. Seen maybe once in a hundred nights.' },
    ridgeback: { n: 'Ridgeback Primeval', ico: '', fish: 'hunt-ridgeback', len: 30, kg: [1500, 24000], skew: 2.6, chance: 1 / 24,
      ring: [12, 18, 24], foam: 'rgba(240,248,255,', desc: 'A prehistoric shark with a jagged ridge of bony plates down its back.' },
    ironcoil: { n: 'Ironcoil Wyrm', ico: '', fish: 'hunt-ironcoil', len: 40, kg: [4000, 45000], skew: 2.6, chance: 1 / 24,
      ring: [18, 16, 10], foam: 'rgba(255,244,220,', desc: 'A sea serpent armoured in rust-dark plates, long as a harbour pier.' },
    thunderhide: { n: 'Stormhide Behemoth', ico: '', fish: 'hunt-thunderhide', len: 34, kg: [8000, 55000], skew: 2.6, chance: 1 / 24,
      ring: [10, 16, 30], foam: 'rgba(220,236,255,', glow: 0x8ad0ff, desc: 'A storm-whale whose hide crackles with pale light. Thunder follows it.' },
    // coast bosses. near: island id(s) whose coast it hunts ('deep' = far from every island). mv: surfacing style (st arc|island|rise, surf period s, arc time s, amp, pitch, speed, splash)
    kelpwood: { n: 'Kelpwood Leviathan', ico: '', fish: 'hunt-kelpwood', near: ['mire'], len: 38, dive: .15, kg: [3000, 32000], skew: 2.6,
      ring: [8, 24, 10], foam: 'rgba(214,240,190,', spray: 0xd6efc4, mv: { st: 'arc', surf: 15, arc: 7, amp: .2, pitch: .7, pdn: .35, tilt: .12, spd: .7, spl: .8 },
      desc: 'A serpent-long leviathan draped in living kelp. The fronds on its back break the surface like a moving forest.' },
    rimetusk: { n: 'Rimetusk Colossus', ico: '', fish: 'hunt-rimetusk', near: ['frost'], len: 36, dive: .05, kg: [9000, 58000], skew: 2.8,
      ring: [30, 44, 56], foam: 'rgba(235,248,255,', spray: 0xf6fcff, mv: { st: 'arc', surf: 26, arc: 5.5, amp: .95, pitch: .75, spd: .8, spl: 1.5 },
      desc: 'A glacier-whale with a single tusk of blue ice. When it breaches, the floes around it shatter.' },
    gravekeel: { n: 'Gravekeel Hulk', ico: '', fish: 'hunt-gravekeel', near: ['harbor', 'coral'], len: 30, dive: .1, kg: [6000, 50000], skew: 2.6,
      ring: [22, 18, 12], foam: 'rgba(240,230,205,', spray: 0xe8e0cc, mv: { st: 'island', surf: 30, arc: 12, amp: .3, pitch: 0, spd: .45, spl: 1.2 },
      desc: 'A shell-backed hulk crusted with barnacles and broken planks. Sailors have mistaken it for a wreck and tied up to it.' },
    cinderspine: { n: 'Cinderspine Serpent', ico: '', fish: 'hunt-cinderspine', near: ['ember'], len: 42, dive: .1, kg: [5000, 48000], skew: 2.6,
      ring: [30, 12, 6], foam: 'rgba(255,190,120,', spray: 0xffb878, glow: 0xff5a18, mv: { st: 'arc', surf: 9, arc: 3.4, amp: .14, pitch: .65, pdn: .4, spd: 1.15, spl: 1 },
      desc: 'A magma serpent that sleeps in the vents under Ember Peak. The sea boils wherever its glowing spine breaks the surface.' },
    gloomwarden: { n: 'Gloomwarden', ico: '', fish: 'hunt-gloomwarden', near: 'deep', len: 34, dive: .12, kg: [9000, 58000], skew: 2.8, night: true,
      ring: [6, 2, 14], foam: 'rgba(200,170,255,', spray: 0xc8b4ff, glow: 0x7a3aff, mv: { st: 'rise', surf: 24, arc: 9, amp: .22, pitch: 1.05, spd: .5, spl: 1.1 },
      desc: 'A horror from the deepest open sea, far from any island. It only climbs into the moonlight, and it is always watching.' }
  };
  const BOSSES = ['ridgeback', 'ironcoil', 'thunderhide', 'kelpwood', 'rimetusk', 'gravekeel', 'cinderspine'], BOSS_CHANCE = .28;
  const DAYK = ['kelpwood', 'rimetusk', 'gravekeel', 'cinderspine'], DAY_CHANCE = .3, D0 = .04, D1 = .58, RIFT_CHANCE = .15, R0 = .63, R1 = .9;
  const MV0 = { st: 'arc', surf: 20, arc: 4.2, amp: .9, pitch: .38, spd: 1, spl: 1 };
  function fish(id, n, tier, kg, beh, look, d) {
    return { id, n, isl: null, tier, kg, beh, when: { time: null, wx: null, event: 'hunt-' + id.slice(5), bait: null, spot: null },
      look: Object.assign({ k: 'fish', pat: 'none', pc: 0xffffff, glow: 0, o: 1, L: 1, H: 1, W: 1, tail: 'fork', x: [] }, look), d };
  }
  const FISH = [
    fish('hunt-ridgeback', 'Ridgeback Primeval', 6, [1500, 24000], 'puller',
      { k: 'shark', c: 0x3e4a52, b: 0xd6d0c0, f: 0x2a3238, pat: 'bands', pc: 0x1c2328, L: 2, H: 1.05, tail: 'fork', x: ['spikes', 'sail', 'armor', 'eye-glow'] },
      'A shark from before the islands rose. The plates on its back are older than the harbour.'),
    fish('hunt-ironcoil', 'Ironcoil Wyrm', 7, [4000, 45000], 'tank',
      { k: 'eel', c: 0x2e3a34, b: 0x8e9a78, f: 0x7a3420, pat: 'scales', pc: 0xa49a70, L: 3, x: ['armor', 'spikes', 'frills', 'horn', 'eye-glow'] },
      'Its rusted plates ring like a bell when it turns. Sailors say it coils around whole reefs to sleep.'),
    fish('hunt-thunderhide', 'Stormhide Behemoth', 6, [8000, 55000], 'tank',
      { k: 'blob', c: 0x34404e, b: 0xb8c4d0, f: 0x252d38, pat: 'spots', pc: 0xcfeaff, glow: 0x8ad0ff, L: 2.2, H: 1.25, W: 1.3, tail: 'fan', x: ['armor', 'eye-glow', 'stars'] },
      'A storm-whale. Its hide holds the lightning of every storm it ever swallowed.'),
    fish('hunt-kelpwood', 'Kelpwood Leviathan', 6, [3000, 32000], 'tank',
      { g: 'hunt-kelpwood', k: 'eel', c: 0x2c4628, b: 0x9aa868, f: 0x4a7a2a, pat: 'scales', pc: 0x6e8e3a, L: 2.2, H: .8, W: .8, tail: 'fan', x: ['tendrils', 'frills', 'sail', 'eye-glow'], y: ['reeds', 'trains'] },
      'Half beast, half forest. Whole otter families have been found living on its back.'),
    fish('hunt-rimetusk', 'Rimetusk Colossus', 6, [9000, 58000], 'tank',
      { g: 'hunt-rimetusk', k: 'shark', c: 0xc6d8e6, b: 0xf2f7fb, f: 0x8aa8c0, pat: 'spots', pc: 0x7f9cb6, L: 2.2, H: 1.3, W: 1.3, tail: 'fan', x: ['horn', 'frost', 'eye-glow'], y: ['shards'] },
      'Its tusk is a spear of glacier ice that never melts. Icebergs part to let it through.'),
    fish('hunt-gravekeel', 'Gravekeel Hulk', 6, [6000, 50000], 'tank',
      { g: 'hunt-gravekeel', k: 'puffer', c: 0x5a5040, b: 0xb0a488, f: 0x4a3a2a, pat: 'scales', pc: 0x8a7a5a, L: 2.4, H: .95, W: 1.1, tail: 'round', x: ['shell', 'armor', 'spikes', 'eye-glow'], y: ['barnacles', 'planks'] },
      'A barnacle-crusted hulk that wears a wrecked hull as armour. Older than every ship it has sunk.'),
    fish('hunt-cinderspine', 'Cinderspine Serpent', 6, [5000, 48000], 'puller',
      { g: 'hunt-cinderspine', k: 'eel', c: 0x2a1a16, b: 0x4a2a1c, f: 0xff6a18, pat: 'cracks', pc: 0xff7a20, glow: 0xff6a10, L: 3, H: .85, tail: 'fork', x: ['flame', 'spikes', 'eye-glow'], y: ['core', 'flamecrest'] },
      'A serpent of cooling magma. The cracks along its body still glow orange, and the sea hisses where it swims.'),
    fish('hunt-gloomwarden', 'Gloomwarden', 7, [9000, 58000], 'puller',
      { g: 'hunt-gloomwarden', k: 'squid', c: 0x150e1e, b: 0x2c1c3c, f: 0x1e1230, pat: 'eyes', pc: 0xb08aff, glow: 0x9a5aff, L: 2.6, H: 1.1, W: 1.1, tail: 'none', x: ['tendrils', 'spikes', 'stars', 'eye-glow'] },
      'Nobody has seen all of it. It rises from the deep sea on dark nights, and a hundred pale eyes open with it.')
  ];
  // test-only fallback silhouettes (the game passes its own angler / DUKE models via setModel)
  const FALLBACK = {
    angler: { k: 'blob', c: 0x1a2420, b: 0x3a4a40, f: 0x101814, pat: 'spots', pc: 0x7aff9a, glow: 0x9aff70, L: 2, H: 1.3, W: 1.2, tail: 'fan', x: ['lantern', 'spikes', 'eye-glow'] },
    duke: { k: 'blob', c: 0x0e3a5a, b: 0x3ab8e8, f: 0x082a44, pat: 'spots', pc: 0x7af0ff, glow: 0x7af0ff, L: 2, H: 1.3, W: 1.2, tail: 'fan', x: ['lantern', 'crown', 'spikes', 'eye-glow'] }
  };
  for (const k in KINDS) { const F = FISH.find(f => f.id === KINDS[k].fish); if (F) FALLBACK[k] = F.look; }

  // ------------------------------------------------------------------ deterministic schedule
  function rng(seed) { let s = seed >>> 0 || 1; return function () { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function mix32(k) { k = Math.imul(k ^ 0x48b7a3c1, 0x9E3779B1); k ^= k >>> 15; k = Math.imul(k, 0x85EBCA77); k ^= k >>> 13; k = Math.imul(k, 0xC2B2AE35); k ^= k >>> 16; return k >>> 0; }
  let ISLC = null;
  function islands() {
    if (ISLC) return ISLC;
    const W = typeof window !== 'undefined' && window.FW && window.FW.islands;
    const L = W && W.length ? W.filter(s => !s.hidden && s.c).map(s => [s.id, s.c[0], s.c[1], s.R]) : [];
    if (L.length >= 5) return (ISLC = L);   // only cache once the real islands are registered
    return ISL;
  }
  function clearOf(x, z, margin) { for (const s of islands()) if (Math.hypot(x - s[1], z - s[2]) < s[3] + margin) return false; return true; }
  const ISLN = { harbor: 'Driftwood Harbor', coral: 'Coral Lagoon', frost: 'Frostpeak', mire: 'Mirewood Swamp', ember: 'Ember Peak' };
  function islName(id) { const W = typeof window !== 'undefined' && window.FW && window.FW.islands, d = W && W.find && W.find(s => s.id === id); return (d && d.n) || ISLN[id] || id; }
  function isl(id) { for (const s of islands()) if (s[0] === id) return s; for (const s of ISL) if (s[0] === id) return s; return null; }
  // where a coast boss hunts, as text: 'off Mirewood Swamp', 'between Driftwood Harbor and Coral Lagoon', 'in the deep sea…'
  function placeText(kind) { const N = KINDS[kind] && KINDS[kind].near; if (!N) return ''; if (N === 'deep') return 'in the deep sea, far from any island';
    return N.length > 1 ? 'between ' + islName(N[0]) + ' and ' + islName(N[1]) : 'off ' + islName(N[0]); }
  function whereText(x, z) { let best = null, bd = 1e9; for (const s of islands()) { const d = Math.hypot(x - s[1], z - s[2]); if (d < bd) { bd = d; best = s; } }
    if (!best) return ''; const a = Math.atan2(x - best[1], -(z - best[2])) * 180 / Math.PI;
    const dir = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'][((Math.round(a / 45) % 8) + 8) % 8];
    return dir + ' of ' + islName(best[0]); }
  function seaH(x, z) { const W = typeof window !== 'undefined' && window.FW; return W && W.heightAt ? W.heightAt(x, z) : -9; }
  const LURE = [-930, 930];   // secret Lure Rock: keep hunts well clear of it
  // open water for a hunt at (x, z): centre, fishing ring and the creature's orbit all deeper than -3, inside the map, clear of Lure Rock
  function ringOk(x, z, orbit) {
    if (Math.abs(x) > 1040 - orbit || Math.abs(z) > 1040 - orbit || Math.hypot(x - LURE[0], z - LURE[1]) < 150 + orbit) return false;
    if (seaH(x, z) > -3) return false;
    for (let j = 0; j < 12; j++) { const b = j * Math.PI / 6, c = Math.cos(b), s = Math.sin(b);
      if (seaH(x + c * ZONE_R, z + s * ZONE_R) > -3 || seaH(x + c * orbit, z + s * orbit) > -3) return false; }
    return true;
  }
  // memoise only once the real islands (and so FW.heightAt) are registered, so every player gets the same spot
  function islandsReady() { const W = typeof window !== 'undefined' && window.FW; return !W || !W.islands || W.islands.length >= 5; }
  // deterministic open-sea spot for a coast boss: 60–160 m off its island's shore (between the two for a pair), or the deep sea
  function coastSpot(kind, r) {
    const K = KINDS[kind], N = K.near, orbit = ZONE_R + K.len * .62;
    for (let i = 0; i < 80; i++) {
      let x, z;
      if (N === 'deep') { x = -980 + r() * 1960; z = -980 + r() * 1960; if (!clearOf(x, z, i < 50 ? 260 : 200)) continue; }
      else if (N.length > 1) { const A = isl(N[0]), B = isl(N[1]); if (!A || !B) break;
        const t = .3 + r() * .4, dx = B[1] - A[1], dz = B[2] - A[2], L = Math.hypot(dx, dz) || 1, o = (r() - .5) * 120;
        x = A[1] + dx * t - dz / L * o; z = A[2] + dz * t + dx / L * o;
        if (Math.hypot(x - A[1], z - A[2]) - A[3] < 60 || Math.hypot(x - B[1], z - B[2]) - B[3] < 60) continue; }
      else { const A = isl(N[0]); if (!A) break; const a = r() * Math.PI * 2, d = A[3] + 60 + r() * 100;
        x = A[1] + Math.cos(a) * d; z = A[2] + Math.sin(a) * d;
        let ok = true; for (const s of islands()) if (s[0] !== A[0] && Math.hypot(x - s[1], z - s[2]) < s[3] + 60) ok = false; if (!ok) continue; }
      if (ringOk(x, z, orbit)) return [Math.round(x), Math.round(z)];
    }
    return seaPoint(r);
  }
  function seaPoint(r) {
    for (let i = 0; i < 120; i++) { const x = -950 + r() * 1900, z = -950 + r() * 1900; if (clearOf(x, z, 121)) return [Math.round(x), Math.round(z)]; }
    const F = [[300, 330], [-300, -260], [-90, 470], [470, -620]]; return F[Math.floor(r() * F.length)];
  }
  function mk(kind, start, until, x, z, summoned, seed) {
    const K = KINDS[kind];
    // key: the id the game stores in S.huntDone (one catch per hunt). Same format the game used to build itself.
    return { id: kind + '@' + start + (summoned ? 's' : ''), key: kind + '@' + start, kind, n: K.n, ico: K.ico, x, z, r: ZONE_R, start, until, summoned: !!summoned, fish: K.fish, seed: seed >>> 0, len: K.len, near: K.near ? placeText(kind) : null };
  }
  const memoN = {}; let nN = 0;
  // night hunt for game-day k (null if none)
  function nightHunt(k) {
    if (k in memoN) return memoN[k];
    if (++nN > 48) { for (const q in memoN) delete memoN[q]; nN = 1; }
    const r = rng(mix32(k * 2654435 + 977)), a = r() < KINDS.angler.chance, d = r() < KINDS.duke.chance;
    let h = null;
    if (a || d) { const p = seaPoint(r); h = mk(d ? 'duke' : 'angler', Math.round(k * DAY_MS + N0 * DAY_MS), Math.round(k * DAY_MS + N1 * DAY_MS), p[0], p[1], false, r() * 4294967296); }
    return (memoN[k] = h);
  }
  function spotFor(kind, r) { return KINDS[kind].near ? coastSpot(kind, r) : seaPoint(r); }
  function keep(M, k, h) { if (h && !islandsReady()) return h; if (++M.n > 64) { M.d = {}; M.n = 1; } return (M.d[k] = h); }
  const memoD = { d: {}, n: 0 }, memoR = { d: {}, n: 0 }, memoB = { d: {}, n: 0 };
  // daytime coast hunt for game-day k (null if none)
  function dayHunt(k) {
    if (k in memoD.d) return memoD.d[k];
    const r = rng(mix32(k * 7919 + 0x0da7)); let h = null;
    if (r() < DAY_CHANCE) {
      const kind = DAYK[Math.min(DAYK.length - 1, Math.floor(r() * DAYK.length))], du = (5 + r() * 2) * MIN;
      const st = Math.round(k * DAY_MS + D0 * DAY_MS + r() * ((D1 - D0) * DAY_MS - du)), p = spotFor(kind, r);
      h = mk(kind, st, Math.round(st + du), p[0], p[1], false, r() * 4294967296);
    }
    return keep(memoD, k, h);
  }
  // night-only Gloomwarden hunt for game-day k (null if none). Independent of the Abyssal roll (own seed), so angler/DUKE odds are unchanged.
  function riftHunt(k) {
    if (k in memoR.d) return memoR.d[k];
    const r = rng(mix32(k * 104729 + 0x1f7)); let h = null;
    if (r() < RIFT_CHANCE) {
      const st = Math.round(k * DAY_MS + (R0 + r() * .04) * DAY_MS), p = spotFor('gloomwarden', r);   // until the end of the night (~5-6 min)
      h = mk('gloomwarden', st, Math.round(k * DAY_MS + R1 * DAY_MS), p[0], p[1], false, r() * 4294967296);
    }
    return keep(memoR, k, h);
  }
  // boss hunt for 10-minute slot k (null if none)
  function bossHunt(k) {
    if (k in memoB.d) return memoB.d[k];
    const r = rng(mix32(k * 40503 + 0x51ab)); let h = null;
    if (r() < BOSS_CHANCE) {
      let i = Math.min(BOSSES.length - 1, Math.floor(r() * BOSSES.length));
      const du = (4 + r() * 3) * MIN, st = Math.round(k * SLOT + r() * (SLOT - du));
      const dh = dayHunt(Math.floor(st / DAY_MS));   // never two of the same coast boss at once
      if (dh && dh.kind === BOSSES[i] && dh.start < st + du && dh.until > st) i = (i + 1) % BOSSES.length;
      const kind = BOSSES[i], p = spotFor(kind, r); h = mk(kind, st, Math.round(st + du), p[0], p[1], false, r() * 4294967296);
    }
    return keep(memoB, k, h);
  }
  const summoned = [];
  function list(now) {
    const t = now === undefined ? Date.now() : now, out = [];
    const kd = Math.floor(t / DAY_MS), n = nightHunt(kd); if (n && t >= n.start && t < n.until) out.push(n);
    const rh = riftHunt(kd); if (rh && t >= rh.start && t < rh.until) out.push(rh);
    const dh = dayHunt(kd); if (dh && t >= dh.start && t < dh.until) out.push(dh);
    const b = bossHunt(Math.floor(t / SLOT)); if (b && t >= b.start && t < b.until) out.push(b);
    for (let i = summoned.length - 1; i >= 0; i--) { const s = summoned[i]; if (t >= s.until + FADE) summoned.splice(i, 1); else if (t >= s.start && t < s.until) out.push(s); }
    return out;
  }
  // all scheduled (non-summoned) hunts overlapping [t0, t1] — for a schedule/admin UI or tests
  function schedule(t0, t1) {
    const out = [];
    for (let k = Math.floor(t0 / DAY_MS); k <= Math.floor(t1 / DAY_MS); k++) for (const h of [nightHunt(k), riftHunt(k), dayHunt(k)]) if (h && h.until > t0 && h.start < t1) out.push(h);
    for (let k = Math.floor(t0 / SLOT); k <= Math.floor(t1 / SLOT); k++) { const h = bossHunt(k); if (h && h.until > t0 && h.start < t1) out.push(h); }
    return out.sort((a, b) => a.start - b.start);
  }
  // spawner: a 6-minute local hunt at open sea near (x, z)
  function summon(kind, x, z, now) {
    if (!KINDS[kind]) return null;
    const t = now === undefined ? Date.now() : now, r = rng(mix32((t & 0x7fffffff) ^ 0x2f1b));
    x = +x || 0; z = +z || 0;
    let px = null, pz = null; const a0 = r() * Math.PI * 2;
    outer: for (let d = 55; d <= 520; d += 25) for (let i = 0; i < 16; i++) {
      const a = a0 + i * Math.PI * 2 / 16, cx = x + Math.cos(a) * d, cz = z + Math.sin(a) * d;
      if (Math.abs(cx) > 1050 || Math.abs(cz) > 1050) continue;
      if (!clearOf(cx, cz, 45)) continue;
      let ok = seaH(cx, cz) <= -3; for (let j = 0; j < 6 && ok; j++) { const b = j * Math.PI / 3; if (seaH(cx + Math.cos(b) * 34, cz + Math.sin(b) * 34) > -3) ok = false; }
      if (ok) { px = Math.round(cx); pz = Math.round(cz); break outer; }
    }
    if (px === null) { const p = seaPoint(r); px = p[0]; pz = p[1]; }
    const h = mk(kind, t, t + SUMMON_MS, px, pz, true, r() * 4294967296); summoned.push(h); return h;
  }
  function dismiss(h) { const i = summoned.indexOf(h); if (i >= 0) summoned.splice(i, 1); }
  // re-add summoned hunts saved by the game (e.g. S.summ) after a page reload, so a paid summon is not lost.
  // arr: hunt objects returned by summon() (or plain copies of them). Expired / malformed / duplicate entries are skipped.
  function restore(arr, now) {
    const t = now === undefined ? clock() : now; let n = 0;
    (Array.isArray(arr) ? arr : arr ? [arr] : []).forEach(o => {
      if (!o || !KINDS[o.kind] || ![o.start, o.until, o.x, o.z].every(Number.isFinite)) return;
      if (o.until <= o.start || o.until - o.start > SUMMON_MS + 1000 || t >= o.until) return;
      if (summoned.some(s => s.kind === o.kind && s.start === o.start)) return;
      summoned.push(mk(o.kind, o.start, o.until, o.x, o.z, true, +o.seed || 0)); n++;
    });
    return n;
  }
  function zoneAt(x, z, now) { const L = list(now); for (const h of L) if (Math.hypot(x - h.x, z - h.z) <= h.r) return h; return null; }
  // weight roll with a wide, bottom-heavy spread: most are "small" giants, the huge ones are rare
  function sizeRoll(kind, rnd) {
    const K = KINDS[kind] || KINDS.angler, u = typeof rnd === 'function' ? rnd() : typeof rnd === 'number' ? rnd : Math.random();
    const v = Math.pow(Math.max(0, Math.min(1, u)), K.skew || 3);
    return Math.round(K.kg[0] + (K.kg[1] - K.kg[0]) * v);
  }
  function compass(dx, dz) { const a = Math.atan2(dx, -dz) * 180 / Math.PI; return ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'][((Math.round(a / 45) % 8) + 8) % 8]; }
  // minutes left on the GAME clock (the game passes NOW() = Date.now() + Time-Dial offset to update(); text helpers reuse that offset)
  function left(h, now) { return Math.max(1, Math.round((h.until - (now === undefined ? clock() : now)) / MIN)) + ' min'; }
  const FEED = {
    angler: 'Something massive hunts the dark sea tonight. A lure light glows far below the waves.',
    duke: 'The sea has turned cold and blue. The DUKE has risen to hunt tonight. Find it before dawn.',
    ridgeback: 'A fin the size of a sail is cutting through the open sea. A Ridgeback Primeval is on the hunt.',
    ironcoil: 'Rusted iron scales flash between the waves. An Ironcoil Wyrm is coiling out at sea.',
    thunderhide: 'Thunder rolls up from under the waves. A Stormhide Behemoth has surfaced at sea.',
    kelpwood: 'Kelp is boiling up from the deep {P}. A Kelpwood Leviathan is feeding.',
    rimetusk: 'Ice floes are cracking apart {P}. A Rimetusk Colossus is breaching.',
    gravekeel: 'Planks and barnacles are bobbing up {P}. The Gravekeel Hulk has surfaced.',
    cinderspine: 'The sea is hissing and steaming {P}. A Cinderspine Serpent has risen.',
    gloomwarden: 'Something vast is climbing out of the dark {P}. The Gloomwarden has woken. It sinks at dawn.'
  };
  function feedText(h, now) {
    if (!h) return '';
    if (h.summoned) return 'The spawner hums. ' + (h.kind === 'duke' ? 'The DUKE' : (/^[AEIOU]/.test(KINDS[h.kind].n) ? 'An ' : 'A ') + KINDS[h.kind].n) + ' answers the call (' + left(h, now) + ' left).';
    return FEED[h.kind].replace('{P}', h.near || placeText(h.kind) || 'out at sea') + ' (' + left(h, now) + ')';
  }
  function radarText(h, px, pz, now) {
    if (!h) return '';
    const dx = h.x - px, dz = h.z - pz, d = Math.hypot(dx, dz), pt = h.near || placeText(h.kind), nm = h.n + (pt ? ' ' + pt : '');
    if (d <= h.r) return nm + ' · you are inside the ring, cast now · ' + left(h, now) + ' left';
    return nm + ' · ' + Math.round(d) + ' m ' + compass(dx, dz) + ' · ' + left(h, now) + ' left';
  }

  // ------------------------------------------------------------------ visuals
  let root = null, T = 0, refT = -9, act = [], _p = null, _c = null;
  const models = {}, pool = [];
  function lin(h) { return new THREE.Color(h).convertSRGBToLinear(); }
  function bmat(o) { const m = new THREE.MeshBasicMaterial(o); m.userData.lin = 1; if (o.color !== undefined) m.color.copy(lin(o.color)); return m; }
  function canvas(w, h, f) { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; }
  let _glow = null;
  function glowTex() { return _glow || (_glow = canvas(64, 64, (x, w) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.3, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); })); }
  function pmat(o) { const m = new THREE.PointsMaterial(Object.assign({ transparent: true, depthWrite: false, map: glowTex(), sizeAttenuation: true }, o)); m.userData.lin = 1; if (o.color !== undefined) m.color.copy(lin(o.color)); return m; }
  // ring polar grid, uv.x = angle * urep, uv.y = radial 0..1
  function polar(r0, r1, NR, NS, urep) {
    const n = (NR + 1) * (NS + 1), P = new Float32Array(n * 3), U = new Float32Array(n * 2), I = [];
    for (let i = 0; i <= NR; i++) { const u = i / NR, r = r0 + (r1 - r0) * u;
      for (let j = 0; j <= NS; j++) { const a = j / NS * Math.PI * 2, k = i * (NS + 1) + j; P[k * 3] = Math.cos(a) * r; P[k * 3 + 1] = 0; P[k * 3 + 2] = Math.sin(a) * r; U[k * 2] = j / NS * urep; U[k * 2 + 1] = u; } }
    for (let i = 0; i < NR; i++) for (let j = 0; j < NS; j++) { const a = i * (NS + 1) + j, b = a + NS + 1; I.push(a, a + 1, b, a + 1, b + 1, b); }   // counter-clockwise seen from above (faces +y)
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.BufferAttribute(U, 2)); g.setIndex(I); return g;
  }
  const RIN = .3, ROUT = 1.6;     // ring spans zone r * [RIN, ROUT]; the zone edge sits at v = (1-RIN)/(ROUT-RIN)
  const ringTex = {};
  function ringTexture(kind) {
    if (ringTex[kind]) return ringTex[kind];
    const K = KINDS[kind], c = K.ring, vE = (1 - RIN) / (ROUT - RIN);
    const t = canvas(256, 64, (x, w, h) => {
      const im = x.createImageData(w, h), R = rng(11 + kind.length);
      for (let j = 0; j < h; j++) { const v = j / (h - 1);
        // alpha profile: soft inside, darkest just inside the edge, fades out past it
        const a = v < vE ? .5 + .4 * Math.pow(v / vE, 2) : Math.max(0, 1 - (v - vE) / (1 - vE)) * .9;
        for (let i = 0; i < w; i++) { const k = (j * w + i) * 4, n = .75 + .25 * Math.sin(i * .21 + j * .7) * Math.sin(i * .05 - j * .31);
          im.data[k] = c[0] * n; im.data[k + 1] = c[1] * n; im.data[k + 2] = c[2] * n; im.data[k + 3] = 255 * a * n; } }
      x.putImageData(im, 0, 0);
      // churning streaks (diagonal = swirl), wrap horizontally
      x.lineCap = 'round';
      for (let i = 0; i < 60; i++) { const x0 = R() * w, y0 = R() * h, L = 18 + R() * 40, lw = 1 + R() * 2.5, light = R() < .45;
        x.strokeStyle = light ? K.foam + (.12 + R() * .22) + ')' : 'rgba(0,0,0,' + (.25 + R() * .3) + ')'; x.lineWidth = lw;
        for (const ox of [-w, 0, w]) { x.beginPath(); x.moveTo(x0 + ox, y0); x.lineTo(x0 + ox + L, y0 + L * .18); x.stroke(); } }
      // foam: dense speckle band at the zone edge, sparse speckles elsewhere
      for (let i = 0; i < 520; i++) { const edge = i < 380, yy = edge ? vE * h + (R() - .5) * (R() * 10) : R() * h, rr = .6 + R() * (edge ? 2.2 : 1.4);
        x.fillStyle = K.foam + (edge ? .45 + R() * .5 : .15 + R() * .3) + ')'; const xx = R() * w;
        for (const ox of [-w, 0, w]) { x.beginPath(); x.arc(xx + ox, yy, rr, 0, 7); x.fill(); } }
    });
    t.wrapS = THREE.RepeatWrapping; return (ringTex[kind] = t);
  }
  function fallbackModel(kind) { return window.FWM ? FWM.build(FALLBACK[kind] || FALLBACK.angler) : new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8).scale(2, .7, .8), bmat({ color: 0x223040 })); }
  // wrap a model so it faces +x, is centred, and is `len` units long. The model itself is untouched (only its parent is transformed).
  // fixed: an FWM model (always faces +x), never auto-turned
  function fit(model, len, yaw, fixed) {
    const outer = new THREE.Group(), turn = new THREE.Group(), centre = new THREE.Group();
    outer.add(turn); turn.add(centre); centre.add(model);
    turn.rotation.y = yaw || 0; outer.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(turn), sz = box.getSize(new THREE.Vector3()), ct = box.getCenter(new THREE.Vector3());
    outer.userData.inner = model; outer.userData.yaw = yaw; outer.userData.len = len; outer.userData.fixed = fixed;
    // the game's angler/DUKE builder returns an empty group until its GLTF has loaded: don't scale by len/0.001 (= x25000),
    // keep it pending and re-fit once the model has geometry (see update()).
    if (box.isEmpty()) { outer.userData.pending = true; outer.userData.H = 0; return outer; }
    if (!yaw && !fixed && sz.z > sz.x * 1.15) { turn.rotation.y = Math.PI / 2; outer.updateMatrixWorld(true); box.setFromObject(turn); box.getSize(sz); box.getCenter(ct); }
    const s = len / Math.max(.001, sz.x);
    turn.scale.setScalar(s); centre.position.set(0, 0, 0);
    turn.position.set(-ct.x * s, -ct.y * s, -ct.z * s);
    outer.userData.H = sz.y * s; outer.userData.Wd = sz.z * s; outer.userData.inner = model;
    return outer;
  }
  const NSP = 90;
  function makeVis(kind) {
    const K = KINDS[kind], g = new THREE.Group(); g.name = 'hunt-' + kind;
    // 1) dark churning ring marking the fishing zone
    const tex = ringTexture(kind).clone(); tex.needsUpdate = true;
    const ring = new THREE.Mesh(polar(ZONE_R * RIN, ZONE_R * ROUT, 3, 64, 3), bmat({ map: tex, transparent: true, depthWrite: false, color: 0xffffff }));
    ring.position.y = .25; ring.renderOrder = 2; g.add(ring);
    // 2) spray / foam particles (wake + surfacing splashes)
    const sg = new THREE.BufferGeometry(), SP = new Float32Array(NSP * 3); for (let i = 0; i < NSP; i++) SP[i * 3 + 1] = -99;
    sg.setAttribute('position', new THREE.BufferAttribute(SP, 3));
    const spray = new THREE.Points(sg, pmat({ size: 2.6, color: K.spray || 0xf4fbff, opacity: .9 })); spray.frustumCulled = false; g.add(spray);
    const sv = new Float32Array(NSP * 4); // vx, vy, vz, life
    // 3) creature
    const fn = models[kind], model = fn ? fn.f() : fallbackModel(kind);
    const body = fit(model, K.len, fn && fn.yaw, !fn), crt = new THREE.Group(); crt.rotation.order = 'YZX'; crt.add(body); g.add(crt);
    const tail = model.userData && model.userData.fwm ? model : null;
    // 4) lure light + under-water glow for angler/duke (and the storm-whale's crackle)
    let lure = null, disc = null;
    if (K.lure) { const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));
      lure = new THREE.Points(lg, pmat({ size: K.len * .45, color: K.lure, blending: THREE.AdditiveBlending, fog: false })); lure.frustumCulled = false; g.add(lure); }
    if (K.glow) { disc = new THREE.Mesh(new THREE.CircleGeometry(K.len * .75, 24).rotateX(-Math.PI / 2), bmat({ map: glowTex(), color: K.glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .5 }));
      disc.position.y = .35; disc.renderOrder = 3; g.add(disc); }
    root.add(g);
    return { kind, g, ring, tex, spray, SP, sv, crt, body, tail, lure, disc, H: body.userData.H, h: null, f: 0, sp: 0, splashed: 0, wasUp: false };
  }
  function emit(v, n, x, y, z, spd, up) {
    const SP = v.SP, sv = v.sv;
    for (let k = 0; k < n; k++) { let i = v.sp; v.sp = (v.sp + 1) % NSP;
      const a = Math.random() * 6.283, s = spd * (.4 + Math.random() * .8);
      SP[i * 3] = x + Math.cos(a) * 1.5; SP[i * 3 + 1] = y; SP[i * 3 + 2] = z + Math.sin(a) * 1.5;
      sv[i * 4] = Math.cos(a) * s; sv[i * 4 + 1] = up * (.5 + Math.random() * .7); sv[i * 4 + 2] = Math.sin(a) * s; sv[i * 4 + 3] = 1; }
  }
  function animate(v, h, f, dt, nowT) {
    const K = KINDS[h.kind], M = K.mv || MV0, L = K.len, H = v.H || L * .4, ph = (h.seed % 1000) / 1000;
    const R = ZONE_R + L * .62, w = (5 + L * .08) * M.spd / R;      // cruise speed ~7-8 u/s (scaled per kind)
    const th = ph * 6.283 + T * w, yaw = -(th + Math.PI / 2);
    const cx = Math.cos(th) * R, cz = Math.sin(th) * R;
    // surfacing every M.surf s: 'arc' = breach in an arc, 'island' = the back rises flat out of the sea and holds, 'rise' = rears up head-first
    const SURF = M.surf, sc = (T + ph * SURF) % SURF, up = sc < M.arc, s = up ? sc / M.arc : 0;
    let arcY = 0, pitch = 0;
    if (M.st === 'island') { const e = up ? Math.min(1, s / .22, (1 - s) / .22) : 0; arcY = e * e * (3 - 2 * e) * H * M.amp; }
    else if (M.st === 'rise') { const e = up ? Math.sin(Math.PI * s) : 0; arcY = e * L * M.amp; pitch = e * M.pitch; }
    else if (up) { arcY = Math.sin(Math.PI * s) * H * M.amp; const pc = Math.cos(Math.PI * s); pitch = pc * M.pitch * (pc < 0 && M.pdn != null ? M.pdn : 1); }
    if (M.tilt) pitch += M.tilt * (up ? 1 - Math.sin(Math.PI * s) : 1);   // nose-up cruise bias, eased out at the arc apex
    const base = -H * (K.dive || .32) + Math.sin(T * .9 + ph * 9) * H * .05, sink = (1 - f) * -H * 1.4;
    v.crt.position.set(cx, base + arcY + sink, cz);
    v.crt.rotation.set(-.12 + Math.sin(T * .7) * .03, yaw + Math.sin(T * 1.3 + ph) * .05, pitch);
    if (v.tail && window.FWM) FWM.anim(v.tail, T, .25);
    // wake from the back cutting the water + splash on breaching / re-entry
    const hx = Math.cos(yaw), hz = -Math.sin(yaw);
    if (f > .3 && Math.random() < dt * 22) emit(v, 1, cx - hx * L * .1, .3, cz - hz * L * .1, 2.5, 3);
    const sp = M.spl;
    if (up && !v.wasUp) emit(v, 26, cx + hx * L * .3, .3, cz + hz * L * .3, 7 * sp, 12 * sp);
    if (up && s > .7 && v.splashed < 1) { v.splashed = 1; emit(v, 34, cx + hx * L * .25, .3, cz + hz * L * .25, 9 * sp, 15 * sp); }
    if (!up) v.splashed = 0; v.wasUp = up;
    const SP = v.SP, sv = v.sv;
    for (let i = 0; i < NSP; i++) { if (sv[i * 4 + 3] <= 0) { SP[i * 3 + 1] = -99; continue; }
      sv[i * 4 + 1] -= 24 * dt; SP[i * 3] += sv[i * 4] * dt; SP[i * 3 + 1] += sv[i * 4 + 1] * dt; SP[i * 3 + 2] += sv[i * 4 + 2] * dt;
      if (SP[i * 3 + 1] < 0) sv[i * 4 + 3] = 0; }
    v.spray.geometry.attributes.position.needsUpdate = true; v.spray.material.opacity = .9 * f;
    v.tex.offset.x = -T * .02; v.ring.rotation.y = T * .05; v.ring.material.opacity = f;
    const pulse = .75 + .25 * Math.sin(T * 2.1 + ph * 5);
    if (v.lure) { const P = v.lure.geometry.attributes.position.array;
      P[0] = cx + hx * L * .62; P[1] = Math.max(.6, v.crt.position.y + H * .55); P[2] = cz + hz * L * .62;
      v.lure.geometry.attributes.position.needsUpdate = true; v.lure.material.opacity = f * pulse; }
    if (v.disc) { v.disc.position.x = cx + hx * L * .2; v.disc.position.z = cz + hz * L * .2;
      v.disc.material.opacity = f * (h.kind === 'thunderhide' ? (Math.random() < .03 ? 1 : .18) : .42 * pulse); }
  }
  function build(sc) { if (!root) { root = new THREE.Group(); root.name = 'FHUNT'; _p = new THREE.Vector3(); _c = new THREE.Color(); } if (sc && root.parent !== sc) sc.add(root); return root; }
  function refit(v) {
    const ud = v.body.userData, m = ud.inner; if (!m || new THREE.Box3().setFromObject(m).isEmpty()) return;
    const nb = fit(m, ud.len, ud.yaw, ud.fixed); v.crt.remove(v.body); v.crt.add(nb); v.body = nb; v.H = nb.userData.H;
  }
  function update(t, dt, cam, now) {
    if (!root) return; dt = Math.min(.1, dt || .016); T += dt;
    const nowT = now === undefined ? Date.now() : now;
    if (now !== undefined && Number.isFinite(now)) OFF = now - Date.now();
    if (T - refT > .5) { refT = T; act = list(nowT); for (const s of summoned) if (nowT >= s.until && nowT < s.until + FADE && act.indexOf(s) < 0) act.push(s); }
    const cp = cam ? (cam.position || cam) : _p.set(0, 10, 0);
    for (const v of pool) v.used = false;
    for (const h of act) {
      const f = Math.max(0, Math.min(1, (nowT - h.start) / FADE, (h.until - nowT) / FADE));
      if (f <= 0 || Math.hypot(cp.x - h.x, cp.z - h.z) > FAR + ZONE_R) continue;
      let v = null; for (const q of pool) if (q.h === h) { v = q; break; }
      if (!v) for (const q of pool) if (!q.used && q.kind === h.kind && (!q.h || act.indexOf(q.h) < 0)) { v = q; break; }
      if (!v) { v = makeVis(h.kind); pool.push(v); }
      v.used = true; v.h = h; v.g.visible = true; v.g.position.set(h.x, 0, h.z);
      animate(v, h, f, dt, nowT);
      if (v.body.userData.pending && (v.chk = (v.chk || 0) - dt) <= 0) { v.chk = .5; refit(v); }
    }
    for (const v of pool) if (!v.used) v.g.visible = false;
  }
  // the game passes builders for 'angler' / 'duke' (its GLTF model). opts.yaw: rotation that makes the model face +x (auto-detected if omitted).
  function setModel(kind, fn, opts) {
    models[kind] = typeof fn === 'function' ? { f: fn, yaw: opts && opts.yaw } : null;
    for (let i = pool.length - 1; i >= 0; i--) if (pool[i].kind === kind) { root.remove(pool[i].g); pool.splice(i, 1); }   // rebuild lazily
  }

  window.FHUNT = { whereText, list, schedule, build, update, setModel, summon, dismiss, restore, feedText, radarText, zoneAt, sizeRoll, FISH, KINDS,
    DAY_MS, SLOT, ZONE_R, placeText, _night: nightHunt, _boss: bossHunt, _day: dayHunt, _rift: riftHunt };
})();
