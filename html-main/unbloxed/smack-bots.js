// Smack Island bots (unbloxed/smack-bots.js): the brain smack.js runs for every local bot (MODES.smack.bot -> SMACK.bot).
// A bot takes a random glove each time it spawns, walks out of the hut, hunts slappable characters (ones near the shore
// first, they're the easiest to smack out), slaps, uses glove abilities and stays on the island: it probes ahead for
// ledges, keeps off the shoreline and heads inland after a hit. Fair play: reaction delays, wobbly aim and three
// personalities. Real players get the engine's bot etiquette: never in their first 15 s after spawning, while shielded or
// in the hut; otherwise only within 20 studs unless they slapped this bot first; and at most 2 bots on one player.
(function () {
  'use strict';
  var S = window.SMACK; if (!S) return;
  var WARNED = {};
  function warn(k, e) { if (!WARNED[k]) { WARNED[k] = 1; console.warn('[smack-bots ' + k + ']', e); } }
  function now() { return performance.now(); }
  function rr(a) { return a[0] + Math.random() * (a[1] - a[0]); }
  function wrap(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }

  // personalities: think = how often it re-picks targets (s), react = delay before a slap once in reach (s),
  // aim = usual aim wobble (rad), miss = chance of a badly aimed slap, turn = turn speed (rad/s), margin = studs it keeps
  // from the shore, chase = how far it hunts other bots, edge = how much it prefers victims near the shore,
  // smart = chance it walks round to the inland side of a victim first (so the slap sends them seaward),
  // ability = how keen it is on its glove ability, hop = random jumps per second, after = s it heads inland after a hit
  var TYPES = {
    aggressive: { think: [.25, .45], react: [.16, .32], aim: .14, miss: .12, turn: 9, margin: 3.2, chase: 50, edge: 1.5, smart: .7, ability: 1, hop: .3, after: [.6, 1.1], idle: [1, 2.5] },
    balanced: { think: [.32, .6], react: [.22, .42], aim: .2, miss: .17, turn: 7.5, margin: 4.8, chase: 38, edge: 1, smart: .45, ability: .7, hop: .16, after: [.9, 1.5], idle: [1.5, 4] },
    cautious: { think: [.42, .75], react: [.3, .55], aim: .26, miss: .22, turn: 6.5, margin: 7, chase: 26, edge: .6, smart: .3, ability: .45, hop: .08, after: [1.3, 2.2], idle: [2, 5] }
  };
  var TYPE_ROLL = ['aggressive', 'aggressive', 'balanced', 'balanced', 'balanced', 'cautious', 'cautious'];

  // ---------- island facts ----------
  function I() { return S.info || {}; }
  function cen() { return I().center || { x: 0, z: 0 }; }
  function waterY() { var i = I(); return typeof i.waterY === 'number' ? i.waterY : typeof i.killY === 'number' ? i.killY : -1e9; }
  function inSafe(o) {
    try { if (S.inSafe) return !!S.inSafe(o); } catch (e) { warn('inSafe', e); }
    var s = I().safe; return !!(s && Math.hypot(o.pos.x - s.x, o.pos.z - s.z) < s.r);
  }
  function nearSafe(x, z, pad) { var s = I().safe; return !!(s && Math.hypot(x - s.x, z - s.z) < s.r + (pad || 0)); }
  function gloveOf(o) {
    try { if (S.gloveOf) { var g = S.gloveOf(o); if (g) return g; } } catch (e) { warn('gloveOf', e); }
    return (S.byId && S.byId[o.glove]) || {};
  }
  function nsolids() { return typeof solids !== 'undefined' ? solids.length : 0; }

  // land map: for every 2-stud cell around the island, how many studs it is to the nearest water (0 = water)
  var LAND = null;
  function buildLand() {
    var inf = I(), c = cen(), wy = waterY(), rad = Math.max(40, (+inf.radius || 60) + 24), i, j, k;
    // cover everything solid above the sea near the island (a map whose radius is off still gets mapped), max 260 studs out
    if (typeof solids !== 'undefined') for (k = 0; k < solids.length; k++) {
      var sb = solids[k]; if (!sb || !sb.max || sb.max.y <= wy + .15) continue;
      var far = Math.max(Math.abs(sb.min.x - c.x), Math.abs(sb.max.x - c.x), Math.abs(sb.min.z - c.z), Math.abs(sb.max.z - c.z)) + 6;
      if (far > rad && far < 260) rad = far;
    }
    var cs = rad > 130 ? 3 : 2, n = Math.ceil(2 * rad / cs) + 1;
    var x0 = c.x - rad + .37, z0 = c.z - rad + .29, d = new Float32Array(n * n);
    for (j = 0; j < n; j++) for (i = 0; i < n; i++) {
      var x = x0 + i * cs, z = z0 + j * cs, land = false;
      near(x, z).forEach(function (b) { if (!land && b.max.y > wy + .15 && x > b.min.x - .1 && x < b.max.x + .1 && z > b.min.z - .1 && z < b.max.z + .1) land = true; });
      d[j * n + i] = land ? 1e6 : 0;
    }
    var at = function (a, b) { return a < 0 || b < 0 || a >= n || b >= n ? 0 : d[b * n + a]; }, s2 = Math.SQRT2;
    for (j = 0; j < n; j++) for (i = 0; i < n; i++) { k = j * n + i; if (d[k]) d[k] = Math.min(d[k], at(i - 1, j) + 1, at(i, j - 1) + 1, at(i - 1, j - 1) + s2, at(i + 1, j - 1) + s2); }
    for (j = n - 1; j >= 0; j--) for (i = n - 1; i >= 0; i--) { k = j * n + i; if (d[k]) d[k] = Math.min(d[k], at(i + 1, j) + 1, at(i, j + 1) + 1, at(i + 1, j + 1) + s2, at(i - 1, j + 1) + s2); }
    for (k = 0; k < n * n; k++) d[k] = d[k] ? (d[k] - .5) * cs : 0;
    LAND = { x0: x0, z0: z0, cs: cs, n: n, d: d, ns: nsolids(), info: S.info, t: now() };
  }
  function edge(x, z) { // studs to the shore (0 = over water)
    var L = LAND; if (!L || L.failed) return 50;
    var i = Math.round((x - L.x0) / L.cs), j = Math.round((z - L.z0) / L.cs);
    return i < 0 || j < 0 || i >= L.n || j >= L.n ? 0 : L.d[j * L.n + i];
  }
  function wet(ax, az, bx, bz) { // does the straight walk from a to b cross open water? distance to the first water (0 = dry)
    var d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / 1.5);
    for (var i = 1; i < n; i++) { var f = i / n; if (edge(ax + (bx - ax) * f, az + (bz - az) * f) <= 0) return Math.max(.01, f * d); }
    return 0;
  }
  // water ahead along (ux,uz): the gap width if land comes back within 14 studs (else 99)
  function gapAhead(x, z, ux, uz) {
    var s = 0, a = -1;
    for (s = .5; s <= 18; s += .5) { var e = edge(x + ux * s, z + uz * s); if (a < 0) { if (e <= 0) a = s; if (s > 5 && a < 0) return 99; } else if (e > .9) return s - a; }
    return 99;
  }
  // something to stand on at (x,z) near height y (a step up, or a drop that is still above the water)
  function support(x, z, y) {
    var ok = false, wy = waterY();
    near(x, z).forEach(function (b) { if (!ok && b.max.y <= y + 1.2 && b.max.y > y - 9 && b.max.y > wy + .15 && x > b.min.x - .1 && x < b.max.x + .1 && z > b.min.z - .1 && z < b.max.z + .1) ok = true; });
    return ok;
  }
  // a wall at body height that is too tall to step onto; returns its top
  function wall(x, z, y) {
    var top = 0;
    near(x, z).forEach(function (b) { if (b.max.y > y + 1.1 && b.min.y < y + 4.9 && x > b.min.x - .9 && x < b.max.x + .9 && z > b.min.z - .9 && z < b.max.z + .9) top = Math.max(top, b.max.y); });
    return top;
  }
  // 1 = fine to walk that way, 0 = wall, -1 = ledge / water
  function way(o, dx, dz, look) {
    var x = o.pos.x, z = o.pos.z, y = o.pos.y;
    if (wall(x + dx * 1.2, z + dz * 1.2, y)) return 0;
    for (var s = 1.1; s <= look + .01; s += 1.2) if (!support(x + dx * s, z + dz * s, y)) return -1;
    return 1;
  }

  // ---------- gloves ----------
  function pickGlove(o) {
    var G = (S.gloves || []).filter(function (g) { return g && g.id && g.bot !== false; });
    if (!G.length || !S.equip) return;
    var starters = G.filter(function (g) { var u = g.unlock || {}; return !(u.smacks > 0) && !(u.bux > 0); });
    var abil = G.filter(function (g) { return g.ability && typeof g.ability.use === 'function'; });
    var P = o._sb && o._sb.P, pa = P === TYPES.aggressive ? .65 : P === TYPES.cautious ? .4 : .5;
    var pool = abil.length && Math.random() < pa ? abil : starters.length ? starters : G;
    var g = pool[Math.random() * pool.length | 0];
    try { S.equip(o, g.id); } catch (e) { warn('equip', e); }
  }

  // ---------- brain ----------
  function init(o) {
    var type = TYPE_ROLL[Math.random() * TYPE_ROLL.length | 0];
    return (o._sb = {
      type: type, P: TYPES[type], side: Math.random() < .5 ? -1 : 1,
      spawnT: undefined, hitT: o.lastHitT, think: 0, target: null, tAt: 0, wp: null, idle: 0, wait: 0,
      rt: 0, react: .3, aim: 0, smart: false, recover: 0, dazed: 0, wasStun: false, stuck: 0, detour: 0, detourT: 0,
      grudge: null, grudgeT: 0, abilWait: 0, hopT: 0, cheer: 0, wetT: 0, home: 0, gap: 99, leap: 0
    });
  }
  function onSpawn(o, st) {
    st.target = null; st.wp = exitPoint(o); st.idle = 0; st.recover = 0; st.dazed = 0; st.rt = 0; st.stuck = 0; st.detourT = 0;
    st.wait = .6 + Math.random() * 1.6; // "picking a glove" in the hut
    pickGlove(o);
  }
  function arena() { var a = I().arena; return a && a.length ? a : null; }
  function exitPoint(o) {
    var A = arena(), s = I().safe, best = null, bd = 1e9;
    if (A) A.forEach(function (p) { if (nearSafe(p.x, p.z, 3)) return; var d = Math.hypot(p.x - o.pos.x, p.z - o.pos.z) + Math.random() * 6; if (d < bd) { bd = d; best = p; } });
    if (best) return best;
    var c = cen();
    if (!s || !nearSafe(c.x, c.z, 3)) return { x: c.x, y: o.pos.y, z: c.z };
    var a = Math.random() * 6.283; return { x: s.x + Math.sin(a) * (s.r + 6), y: o.pos.y, z: s.z + Math.cos(a) * (s.r + 6) };
  }
  function wanderPoint(o, st) {
    var A = arena(), c = cen();
    if (A) {
      var ok = A.filter(function (p) { return !nearSafe(p.x, p.z, 3) && edge(p.x, p.z) > st.P.margin + 1 && Math.hypot(p.x - o.pos.x, p.z - o.pos.z) > 6 && !wet(o.pos.x, o.pos.z, p.x, p.z); });
      if (!ok.length) ok = A.filter(function (p) { return !nearSafe(p.x, p.z, 3) && !wet(o.pos.x, o.pos.z, p.x, p.z); });
      if (ok.length) return ok[Math.random() * ok.length | 0];
    }
    var r = (+I().radius || 40) * .45, a = Math.random() * 6.283;
    return { x: c.x + Math.sin(a) * r, y: o.pos.y, z: c.z + Math.cos(a) * r };
  }
  function isReal(t) { return !t.bot; }
  function hunters(t, me_) { var n = 0; for (var i = 0; i < chars.length; i++) { var b = chars[i]; if (b !== me_ && b.bot && b._sb && b._sb.target === t && !b.ko) n++; } return n; }
  function grudgeOn(o, st, t) { return o.lastHitBy === t || (st.grudge === t && now() < st.grudgeT); }
  // may this bot slap t right now? (real players: the etiquette above)
  function fair(o, st, t, d) {
    if (!t || t.ko || t.shield > 0 || inSafe(t)) return false;
    if (!isReal(t)) return true;
    var g = grudgeOn(o, st, t);
    return now() - (t.spawnT || 0) >= 15000 && (g || d <= 20);
  }
  // who smack.js's slap would hit now (the nearest character in reach, within ±60° of facing)
  function wouldHit(o, reach) {
    var fx = Math.sin(o.yaw), fz = Math.cos(o.yaw), best = null, bd = 1e9;
    for (var i = 0; i < chars.length; i++) {
      var t = chars[i]; if (t === o || t.ko || t.shield > 0 || inSafe(t)) continue;
      var dx = t.pos.x - o.pos.x, dz = t.pos.z - o.pos.z, d = Math.hypot(dx, dz);
      if (d > reach || Math.abs(t.pos.y - o.pos.y) > 4.5 || (d > .5 && (dx * fx + dz * fz) / d < .5)) continue;
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  }

  function choose(o, st) {
    var P = st.P, best = null, bs = 1e9, wy = waterY(), T = now();
    for (var i = 0; i < chars.length; i++) {
      var t = chars[i]; if (t === o || t.ko || !t.pos) continue;
      if (t.pos.y < wy + .3 || Math.abs(t.pos.y - o.pos.y) > 10) continue;
      if (t.shield > 0 || inSafe(t)) continue;
      var d = Math.hypot(t.pos.x - o.pos.x, t.pos.z - o.pos.z), g = grudgeOn(o, st, t);
      if (wet(o.pos.x, o.pos.z, t.pos.x, t.pos.z)) continue; // across the water: can't get there
      if (isReal(t)) {
        if (T - (t.spawnT || 0) < 15000) continue;
        if (!g && d > 20) continue;
        if (!g && t !== st.target && hunters(t, o) >= 2) continue;
      } else if (d > P.chase && !g) continue;
      var e = edge(t.pos.x, t.pos.z);
      var s = d - P.edge * Math.max(0, 12 - e) * 1.3 + (g ? -10 : 0) + (t === st.target ? -3.5 : 0) + (isReal(t) ? (d < 10 ? 1 : 3) : 0) + Math.random() * 4;
      if (P === TYPES.cautious && e < 2.5 && d > 6) s += 12; // cautious bots don't chase people out onto the shoreline
      if (s < bs) { bs = s; best = t; }
    }
    if (best !== st.target) { st.target = best; st.tAt = T; st.rt = 0; st.smart = Math.random() < P.smart; st.aim = aimRoll(P); }
    // stuck on one target for ages without landing a slap: let it go for now
    if (best && T - st.tAt > 14000 && !grudgeOn(o, st, best)) { st.target = null; st.wp = wanderPoint(o, st); st.idle = 0; }
  }
  function aimRoll(P) { return Math.random() < P.miss ? (Math.random() < .5 ? -1 : 1) * (.9 + Math.random() * .6) : (Math.random() * 2 - 1) * P.aim; }
  function turnTo(o, yaw, maxStep) { var d = wrap(yaw - o.yaw); o.yaw = wrap(o.yaw + Math.max(-maxStep, Math.min(maxStep, d))); }
  function slap(o) {
    try { if (typeof S.slap === 'function') S.slap(o); else if (typeof attack === 'function') attack(o); } catch (e) { warn('slap', e); }
  }
  function ability(o, g) {
    try { if (typeof S.useAbility === 'function') return S.useAbility(o); } catch (e) { warn('ability', e); }
    return false;
  }

  function brain(o, dt) {
    var st = o._sb || init(o), P = st.P, T = now();
    // (re)map the land: new island at once; pieces added/removed later (glove props etc.) at most every 3 s
    if (!LAND || LAND.info !== S.info || (LAND.ns !== nsolids() && T - LAND.t > 3000)) { try { buildLand(); } catch (e) { warn('land', e); LAND = { failed: true, ns: nsolids(), info: S.info, t: T }; } }
    if (o.spawnT !== st.spawnT) { st.spawnT = o.spawnT; onSpawn(o, st); }
    // got hit: remember who did it, and head inland for a moment once the stun wears off
    if (o.lastHitT && o.lastHitT !== st.hitT) {
      st.hitT = o.lastHitT; st.recover = rr(P.after); st.rt = 0;
      if (o.lastHitBy && o.lastHitBy !== o) { st.grudge = o.lastHitBy; st.grudgeT = T + 25000; }
    }
    if (o.stun > 0) { st.wasStun = true; physics(o, dt, 0, 0, false, false); return; }
    if (st.wasStun) { st.wasStun = false; st.dazed = .12 + Math.random() * .25; } // a reaction delay after the stun too
    if (st.dazed > 0) { st.dazed -= dt; physics(o, dt, 0, 0, false, false); return; }
    if (st.wait > 0) { st.wait -= dt; physics(o, dt, 0, 0, false, false); return; }

    var c = cen(), ex = edge(o.pos.x, o.pos.z), safeHere = inSafe(o), g = gloveOf(o);
    st.think -= dt;
    if (st.think <= 0) {
      st.think = rr(P.think);
      choose(o, st);
      if (!st.target && (!st.wp || nearSafe(st.wp.x, st.wp.z, 2) && !safeHere)) st.wp = wanderPoint(o, st);
      if (Math.random() < .3) st.aim = aimRoll(P);
    }
    // cut off from the main island (knocked onto an islet / spawned on one)?
    if ((st.wetT -= dt) <= 0) { st.wetT = .5; st.home = wet(o.pos.x, o.pos.z, c.x, c.z); }
    var stranded = st.home > 0;
    if (stranded) {
      var hx = c.x - o.pos.x, hz = c.z - o.pos.z, hl = Math.hypot(hx, hz) || 1;
      st.gap = gapAhead(o.pos.x, o.pos.z, hx / hl, hz / hl);
      if (st.gap > 9) stranded = false; // too wide to jump: live on this islet for now
      else if (!st.target) st.recover = Math.max(st.recover, .3);
    }
    if (ex < P.margin * .5 && o.ground && st.recover <= 0 && !(st.home > 0)) st.recover = .5; // too close to the water: back inland

    var t = st.target; if (t && (t.ko || t.shield > 0)) { t = st.target = null; }
    var gx = 0, gz = 0, run = 1, face = null, jump = false;
    if (st.recover > 0) {
      st.recover -= dt; gx = c.x - o.pos.x; gz = c.z - o.pos.z;
      if (Math.hypot(gx, gz) < 4) st.recover = 0;
    } else if (t) {
      var dx = t.pos.x - o.pos.x, dz = t.pos.z - o.pos.z, d = Math.hypot(dx, dz) || 1e-3, reach = +g.reach || 5;
      face = Math.atan2(dx, dz) + st.aim;
      // smart approach: come at the victim from the inland side so the slap sends them toward the water
      var ax = t.pos.x, az = t.pos.z;
      if (st.smart && d > reach * .8) {
        var ox = t.pos.x - c.x, oz = t.pos.z - c.z, ol = Math.hypot(ox, oz);
        if (ol > 3) { var bx = t.pos.x - ox / ol * reach * .7, bz = t.pos.z - oz / ol * reach * .7; if (edge(bx, bz) > 1.5) { ax = bx; az = bz; } }
      }
      gx = ax - o.pos.x; gz = az - o.pos.z;
      if (d < reach * .65) { gx = gz = 0; }
      else if (d < reach * 1.1) run = .45;
      // in reach: wait out the reaction time, then slap
      if (d < reach * .95 && Math.abs(t.pos.y - o.pos.y) < 3.5) {
        st.rt += dt;
        if (st.rt >= st.react && !(o.cd > 0) && Math.abs(wrap(face - o.yaw)) < .5) {
          // don't let the slap land on a player who is off-limits (fresh spawn etc.) standing in the way
          var w0 = wouldHit(o, reach);
          if (!w0 || fair(o, st, w0, Math.hypot(w0.pos.x - o.pos.x, w0.pos.z - o.pos.z))) { slap(o); st.rt = 0; st.react = rr(P.react); st.aim = aimRoll(P); }
          else st.rt = st.react * .5;
        }
      } else st.rt = Math.max(0, st.rt - dt);
      // glove ability: when the victim is ahead, at a sensible range, and we're not on the shoreline ourselves
      st.abilWait -= dt;
      if (g.ability && st.abilWait <= 0 && !(o.abilityCd > 0) && !safeHere) {
        st.abilWait = .35 + Math.random() * .4;
        var rng = +g.ability.range || 11, et = edge(t.pos.x, t.pos.z);
        // short-range abilities may throw the bot itself forward: only with land past the victim
        var land = rng > 12 || edge(o.pos.x + dx / d * (d + 4), o.pos.z + dz / d * (d + 4)) > 2;
        if (d < rng && d > 2 && land && ex > P.margin + 2 && Math.abs(wrap(Math.atan2(dx, dz) - o.yaw)) < .45 && Math.random() < P.ability * (et < 8 ? .9 : .5)) ability(o, g);
      }
    } else if (st.wp) {
      gx = st.wp.x - o.pos.x; gz = st.wp.z - o.pos.z; run = .62;
      if (Math.hypot(gx, gz) < 3) { gx = gz = 0; st.idle += dt; if (st.idle > rr(P.idle) + 1) { st.idle = 0; st.wp = wanderPoint(o, st); } }
    }
    // a bot that just scored hops for joy
    if (st.cheer > 0) { st.cheer -= dt; if (o.ground && st.cheer < .2) { jump = true; st.cheer = 0; } }

    var gl = Math.hypot(gx, gz), mx = 0, mz = 0;
    if (gl > .01) {
      var ux = gx / gl, uz = gz / gl;
      // keep off the shoreline: drop the seaward part of the move when the next steps get too close to the water
      var nx = o.pos.x + ux * 3, nz = o.pos.z + uz * 3, en = edge(nx, nz);
      if (st.recover <= 0 && en < P.margin && en < ex + .01) {
        var ix = c.x - o.pos.x, iz = c.z - o.pos.z, il = Math.hypot(ix, iz) || 1; ix /= il; iz /= il;
        var dp = ux * ix + uz * iz; if (dp < 0) { ux -= ix * dp; uz -= iz * dp; ux += ix * .25; uz += iz * .25; var ul = Math.hypot(ux, uz) || 1; ux /= ul; uz /= ul; run *= .7; }
      }
      // stuck on something: sidestep for a moment
      if (st.detourT > 0) { st.detourT -= dt; var ca = Math.cos(st.detour), sa = Math.sin(st.detour), tx = ux * ca + uz * sa; uz = -ux * sa + uz * ca; ux = tx; }
      if (o.ground) {
        var look = 1.2 + Math.hypot(o.vel.x, o.vel.z) * .22, w = way(o, ux, uz, look);
        if (w !== 1) {
          // low wall straight ahead with land behind it: hop it
          var top = w === 0 ? wall(o.pos.x + ux * 1.2, o.pos.z + uz * 1.2, o.pos.y) : 0;
          if (w === 0 && top && top - o.pos.y < 4.6 && edge(o.pos.x + ux * 8, o.pos.z + uz * 8) > 3) jump = true;
          else if (w === -1 && stranded && st.recover > 0 && Math.hypot(o.vel.x, o.vel.z) > 10 && gapAhead(o.pos.x, o.pos.z, ux, uz) <= 9) { jump = true; st.leap = 1; }
          else {
            var found = false, base = Math.atan2(ux, uz);
            for (var k = 1; k <= 8 && !found; k++) for (var sgn = -1; sgn <= 1 && !found; sgn += 2) {
              var a = base + st.side * sgn * k * .38, vx = Math.sin(a), vz = Math.cos(a);
              if (way(o, vx, vz, look) === 1) { ux = vx; uz = vz; found = true; }
            }
            if (!found) { ux = uz = 0; }
            else if (w === -1) run = Math.min(run, .6);
          }
        }
        // pressing on but going nowhere: try a sidestep (and maybe a hop)
        if (ux || uz) {
          if (Math.hypot(o.vel.x, o.vel.z) < 2.5 * run) st.stuck += dt; else st.stuck = Math.max(0, st.stuck - dt);
          if (st.stuck > .8) { st.stuck = 0; st.side = -st.side; st.detour = st.side * rr([.9, 1.7]); st.detourT = rr([.5, 1.1]); if (Math.random() < .4 && ex > 8) jump = true; }
        }
        // the odd random hop while running across open ground
        if ((ux || uz) && !safeHere && Math.random() < P.hop * dt && edge(o.pos.x + ux * 9, o.pos.z + uz * 9) > 4 && edge(o.pos.x + ux * 18, o.pos.z + uz * 18) > 4) jump = true;
      }
      mx = ux * run; mz = uz * run;
      if (!face && (ux || uz)) face = Math.atan2(ux, uz);
    } else if (!o.ground && st.recover > 0) { mx = (c.x - o.pos.x); mz = (c.z - o.pos.z); var ml = Math.hypot(mx, mz) || 1; mx /= ml; mz /= ml; }
    if (face !== null) turnTo(o, face, P.turn * dt);
    if (jump && o.ground && !safeHere) {
      // never jump toward the water: the air is where the ledge probe can't save you
      var vx2 = mx || Math.sin(o.yaw), vz2 = mz || Math.cos(o.yaw);
      if (!st.leap && edge(o.pos.x + vx2 * 10, o.pos.z + vz2 * 10) < 3) jump = false;
    }
    st.leap = 0;
    physics(o, dt, mx, mz, jump, false);
  }

  S.bot = function (o, dt) {
    try { brain(o, dt); }
    catch (e) { warn('brain', e); try { physics(o, dt, 0, 0, false, false); } catch (e2) { } }
    // never let a bad number stick a bot forever (NaN pos/vel or a runaway stun)
    if (!isFinite(o.pos.x + o.pos.y + o.pos.z + o.vel.x + o.vel.y + o.vel.z) || !((o.stun || 0) < 30)) {
      warn('bot reset', o.a && o.a.name); o.vel.set(0, 0, 0); o.stun = 0; if (o._sb) { o._sb.wait = 0; o._sb.dazed = 0; o._sb.recover = 0; }
      try { respawn(o); } catch (e3) { }
    }
  };
  S.add('start', function () {
    LAND = null;
    try { for (var i = 0; i < chars.length; i++) { var o = chars[i]; if (o.bot && !o.net) { var st = o._sb || init(o); st.spawnT = o.spawnT; onSpawn(o, st); st.wait = Math.random() * .8; } } }
    catch (e) { warn('start', e); }
  });
  S.add('stop', function () { LAND = null; });
  S.add('ko', function (t, by) { if (by && by.bot && by._sb && by !== t) by._sb.cheer = .5; if (t && t._sb) t._sb.target = null; });
  S.add('slap', function (o, t) { if (t && t.bot && t._sb && o && o !== t) { t._sb.grudge = o; t._sb.grudgeT = now() + 25000; } });
  S.botEdge = edge;
  S.botDebug = function () { return chars.filter(function (o) { return o.bot && o._sb; }).map(function (o) { var s = o._sb; return { name: o.a.name, type: s.type, glove: o.glove, target: s.target && s.target.a.name, edge: +edge(o.pos.x, o.pos.z).toFixed(1), recover: +s.recover.toFixed(2) }; }); };
})();
