// Smack Island online (unbloxed/smack-net.js): plugs the mode into unbloxed/net.js (UBXNET), the same PeerJS rooms as the
// Heights. Smack Island has its own public room (peer ids 'ubx-smack-...', auto-joined on entering) and private 4-letter rooms (M).
// - Gloves: every character's glove id (and stun) rides in the state packets; remote characters wear it (SMACK.equip).
// - Slaps: SMACK.sendHit(o,t,hit) sends a slap on a remote character. Only the victim's owner applies it (SMACK.applyHit on
//   me or a host bot), after checking it: every number clamped, direction normalized, attacker in range, not spammed.
//   The victim then tells everyone it landed, so third screens show the slap effects too ('slap' hook, visuals only).
// - KOs: the victim's screen announces them (knock() -> UBXNET.ko). Every other screen runs knock() + the 'ko' hook, and the
//   slapper's own screen credits the Smack (SMACK.creditSmack). A remote player can never be knocked out by another screen.
// - Abilities: the 'ability' hook broadcasts {glove, pos, yaw}; other screens run that glove's ability.fx(remoteChar) if it has
//   one (visuals only: real effects on you arrive as hits).
(function () {
  'use strict';
  var S = window.SMACK, NET = window.UBXNET;
  if (!S || !NET || typeof NET.addGame !== 'function' || typeof NET.on !== 'function') { console.warn('[smack-net] needs smack-api.js and the new net.js'); return; }
  var ID = 'smack', MAX_KB = 120, MAX_UP = 60, MAX_STUN = 3, RATE = 12;
  var koSeen = null, slapSeen = null, applying = null, abT = {}, bucket = {}, warned = {};

  var num = function (v, d) { return typeof v === 'number' && isFinite(v) ? v : d; };
  var clamp = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };
  var r2 = function (x) { return Math.round((+x || 0) * 100) / 100; };
  var r3 = function (x) { return Math.round((+x || 0) * 1000) / 1000; };
  var tnow = function () { return performance.now(); };
  function warn(k, e) { if (!warned[k]) { warned[k] = 1; console.warn('[smack-net ' + k + ']', e); } }
  function inMode() { return typeof GAME !== 'undefined' && GAME === ID && mode === 'game' && !!me; }
  function online() { return inMode() && !!(NET.state && NET.state.online); }
  function gloveDef(id) { return typeof id === 'string' && Object.prototype.hasOwnProperty.call(S.byId, id) ? S.byId[id] : null; }
  function mine(o) { return !!o && (o === me || (o.bot && !o.net && NET.state.isHost)); } // characters this screen owns in the room
  function reachOf(id) { var g = gloveDef(id); return clamp(num(g && g.reach, 5), 1, 40); }

  // ---------- gloves on remote characters ----------
  function wear(o, id) { // SMACK.equip always (re)attaches the mesh, so a rebuilt body (avatar change) gets it back too
    o._snC = o.c;
    if (typeof S.equip === 'function') { try { S.equip(o, id); } catch (e) { warn('equip', e); } }
    if (o.glove !== id) o.glove = id; // never retry every packet if equip refused
  }
  function applyX(o, x) {
    if (!x || typeof x !== 'object') return;
    o.stun = clamp(num(x.st, 0), 0, MAX_STUN);
    var g = gloveDef(x.gl);
    if (g && (o.glove !== g.id || o._snC !== o.c)) wear(o, g.id);
  }

  // ---------- KOs ----------
  // net.js calls this instead of knock() when another screen announces a KO (victim t is a remote character here)
  function koApply(t, by) {
    var cs = S.creditSmack, called = false, s0 = S.save && S.save.smacks;
    if (typeof cs === 'function') S.creditSmack = function () { called = true; return cs.apply(this, arguments); };
    koSeen = null; applying = t;
    try { knock(t, by); }
    finally {
      applying = null;
      if (typeof cs === 'function' && S.creditSmack !== cs) S.creditSmack = cs;
    }
    if (!t.ko) return; // knock() refused (already down)
    try { // the engine writes a sword line: make it a slap (as smack.js does for local KOs)
      if (feed.length) { feed[0] = feed[0].replace('⚔', '👋').replace(' fell off', ' splashed into the sea'); $('feed').innerHTML = feed.join('<br>'); }
    } catch (e) { }
    if (koSeen !== t) S.call('ko', t, by || null); // effects on every screen
    var credited = called || (S.save && S.save.smacks !== s0);
    if (by && by === me && !credited && typeof S.creditSmack === 'function') { try { S.creditSmack(t); } catch (e) { warn('credit', e); } }
  }
  S.add('ko', function (t) { koSeen = t; });
  S.add('slap', function (o, t) { slapSeen = t; });
  // a remote player's KO only ever comes from their own screen (no double KOs / double credit from local water checks)
  if (typeof window.knock === 'function') {
    var _knock = window.knock;
    window.knock = function (t, by) {
      if (t && t.net && typeof GAME !== 'undefined' && GAME === ID && applying !== t) return;
      return _knock.apply(this, arguments);
    };
  }

  // ---------- slaps ----------
  var KNOWN = { dir: 1, kb: 1, up: 1, stun: 1, glove: 1, power: 1, net: 1 };
  function extras(hit) { // small extra fields a glove's onSlap may add (numbers clamped, short strings, booleans)
    var x = null, n = 0;
    for (var k in hit) {
      if (!Object.prototype.hasOwnProperty.call(hit, k) || KNOWN[k] || !/^[a-z][a-z0-9_]{0,15}$/i.test(k) || n >= 8) continue;
      var v = hit[k];
      if (typeof v === 'boolean') v = v ? 1 : 0; else if (typeof v === 'number' && isFinite(v)) v = r2(clamp(v, -60, 60));
      else if (typeof v === 'string' && v.length <= 24) v = String(v); else continue;
      (x = x || {})[k] = v; n++;
    }
    return x;
  }
  S.sendHit = function (o, t, hit) {
    try {
      if (!online() || !o || !t || !t.net || !hit || !mine(o)) return false;
      var from = NET.idOf(o); if (!from) return false;
      var d = hit.dir || {}, dx = num(d.x, 0), dz = num(d.z, 0), l = Math.hypot(dx, dz);
      if (!(l > 1e-6)) { dx = t.pos.x - o.pos.x; dz = t.pos.z - o.pos.z; l = Math.hypot(dx, dz); if (!(l > 1e-6)) { dx = Math.sin(o.yaw); dz = Math.cos(o.yaw); l = 1; } }
      var p = { d: [r3(dx / l), r3(dz / l)], kb: r2(clamp(num(hit.kb, 36), 0, MAX_KB)), up: r2(clamp(num(hit.up, 15), 0, MAX_UP)),
        st: r2(clamp(num(hit.stun, .9), 0, MAX_STUN)), pw: r2(clamp(num(hit.power, 1), 0, 50)), g: gloveDef(hit.glove) ? hit.glove : (gloveDef(o.glove) ? o.glove : '') };
      var x = extras(hit); if (x) p.x = x;
      return NET.send('sh', p, t.net, from);
    } catch (e) { warn('sendHit', e); return false; }
  };
  function makeHit(by, t, p) {
    var d = Array.isArray(p.d) ? p.d : [], dx = num(d[0], NaN), dz = num(d[1], NaN), l = Math.hypot(dx, dz);
    if (!(l > 1e-6)) { dx = t.pos.x - by.pos.x; dz = t.pos.z - by.pos.z; l = Math.hypot(dx, dz); if (!(l > 1e-6)) { dx = Math.sin(by.yaw); dz = Math.cos(by.yaw); l = 1; } }
    var g = gloveDef(p.g) || gloveDef(by.glove);
    var hit = { dir: new THREE.Vector3(dx / l, 0, dz / l), kb: clamp(num(p.kb, 36), 0, MAX_KB), up: clamp(num(p.up, 15), 0, MAX_UP),
      stun: clamp(num(p.st, .9), 0, MAX_STUN), glove: g ? g.id : null, power: clamp(num(p.pw, 1), 0, 50), net: true };
    if (p.x && typeof p.x === 'object') for (var k in p.x) {
      if (!Object.prototype.hasOwnProperty.call(p.x, k) || KNOWN[k] || !/^[a-z][a-z0-9_]{0,15}$/i.test(k)) continue;
      var v = p.x[k];
      if (typeof v === 'number' && isFinite(v)) hit[k] = clamp(v, -60, 60); else if (typeof v === 'string' && v.length <= 24) hit[k] = v;
    }
    return hit;
  }
  function rateOk(from) { // token bucket per attacker: RATE hits/s
    var b = bucket[from] || (bucket[from] = { n: RATE, t: tnow() }), t = tnow();
    b.n = Math.min(RATE, b.n + (t - b.t) / 1000 * RATE); b.t = t;
    if (b.n < 1) return false; b.n -= 1; return true;
  }
  function inRange(by, t, hit, from) {
    var reach = Math.max(reachOf(hit.glove), reachOf(by.glove));
    var lim = Math.max(24, reach * 2 + 12); // lag: both positions are ~0.1-0.2 s old and knockback is fast
    if (tnow() - (abT[from] || -1e9) < 4000) lim = Math.max(lim, 90); // abilities can reach further
    return Math.hypot(t.pos.x - by.pos.x, t.pos.z - by.pos.z) <= lim && Math.abs(t.pos.y - by.pos.y) <= lim;
  }
  // the victim's owner: check and apply
  function takeHit(t, by, hit) {
    if (t.ko > 0) return false;
    if (typeof S.inSafe === 'function' && S.inSafe(t)) return false;
    slapSeen = null;
    var res;
    if (typeof S.applyHit === 'function') res = S.applyHit(t, by, hit);
    else { // fallback if smack.js is missing pieces
      t.vel.x += hit.dir.x * hit.kb; t.vel.z += hit.dir.z * hit.kb; t.vel.y = Math.max(t.vel.y, hit.up);
      t.stun = Math.max(t.stun || 0, hit.stun); t.lastHitBy = by; t.lastHitT = tnow();
    }
    if (res === false) return false;
    if (slapSeen !== t) S.call('slap', by, t, hit);
    return true;
  }
  NET.on('sh', function (from, p, to) {
    if (!p || typeof p !== 'object' || typeof to !== 'string' || !inMode()) return;
    var by = NET.charOf(from), t = NET.charOf(to);
    if (!by || !by.net || !t || !mine(t)) return; // only the victim's owner acts on a hit
    if (by.ko > .3) return; // knocked-out players can't slap
    var hit = makeHit(by, t, p);
    if (!inRange(by, t, hit, from)) { warn('far', 'ignored a slap from too far away (' + from + ')'); return; }
    if (!rateOk(from)) return;
    if (takeHit(t, by, hit)) NET.send('sl', { a: from, t: to, d: [r3(hit.dir.x), r3(hit.dir.z)], g: hit.glove || '', kb: r2(hit.kb), up: r2(hit.up), st: r2(hit.stun) });
  });
  // a slap landed somewhere else: third screens show its effects (the attacker and the victim already did)
  NET.on('sl', function (from, p) {
    if (!p || typeof p.a !== 'string' || typeof p.t !== 'string' || !inMode()) return;
    var A = NET.charOf(p.a), V = NET.charOf(p.t);
    if (!A || !V || !A.net || !V.net || V.ko > 0) return;
    if (from !== p.t && !(from === 'h' && /^b\d+$/.test(p.t))) return; // only the victim's owner (the host for its bots) reports it
    var hit = makeHit(A, V, { d: p.d, g: p.g, kb: p.kb, up: p.up, st: p.st });
    S.call('slap', A, V, hit);
  });

  // ---------- abilities ----------
  S.add('ability', function (o, g) {
    if (!online() || !mine(o)) return;
    var gd = typeof g === 'string' ? gloveDef(g) : (g && gloveDef(g.id)) || gloveDef(o.glove); if (!gd) return;
    var from = NET.idOf(o); if (!from) return;
    NET.send('ab', { g: gd.id, p: [r2(o.pos.x), r2(o.pos.y), r2(o.pos.z)], y: r2(o.yaw) }, null, from);
  });
  NET.on('ab', function (from, p) {
    if (!p || typeof p !== 'object' || !inMode()) return;
    var o = NET.charOf(from), g = gloveDef(p.g); if (!o || !o.net || !g) return;
    abT[from] = tnow();
    var q = Array.isArray(p.p) ? p.p : [], x = num(q[0], NaN), y = num(q[1], NaN), z = num(q[2], NaN);
    if (isFinite(x + y + z) && Math.hypot(o.pos.x - x, o.pos.y - y, o.pos.z - z) > 6) { o.pos.set(x, y, z); if (o.tp) o.tp.set(x, y, z); }
    var yaw = num(p.y, NaN); if (isFinite(yaw)) { o.yaw = yaw; o.ty = yaw; }
    if (o.glove !== g.id || o._snC !== o.c) wear(o, g.id);
    if (g.ability && typeof g.ability.fx === 'function') { try { g.ability.fx(o); } catch (e) { warn('fx ' + g.id, e); } }
  });

  // ---------- register Smack Island with net.js ----------
  NET.addGame(ID, {
    name: 'Smack Island', kw: 'Smacks', pop: true, // like the Heights: bots join/leave over time and make room for real players
    state: function (o) { var x = { gl: typeof o.glove === 'string' ? o.glove : '' }; if (o.stun > 0) x.st = r2(Math.min(o.stun, MAX_STUN)); return x; },
    apply: applyX,
    koApply: koApply // (bots that join mid-game get prepped + gloved by smack.js's tick)
  });
  S.add('stop', function () { abT = {}; bucket = {}; });
})();
