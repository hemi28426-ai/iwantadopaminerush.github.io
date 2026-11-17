// Smack Island: an Unbloxed mode (unbloxed.html). This is the shared API the smack-*.js plug-ins build on; it loads first.
// smack.js runs the mode; smack-map.js builds the island; the glove files add gloves; ui/bots/fx/net plug in through hooks.
// SMACK.add(name,fn) registers a hook (several plug-ins can share one); SMACK.call runs them all (first real result wins),
// SMACK.collect merges returned objects, SMACK.every is false if any handler returned false (for cancelable hooks).
// A failing handler is logged once and never breaks the game.
(function () {
  'use strict';
  var S = window.SMACK = window.SMACK || {};
  S.version = 1;
  S.gloves = S.gloves || [];
  S.byId = S.byId || {};
  S._h = S._h || {};
  S._w = S._w || {};
  S.add = function (n, f) { (S._h[n] = S._h[n] || []).push(f); return S; };
  S._run = function (n, a, each) {
    var L = S._h[n]; if (!L) return;
    for (var i = 0; i < L.length; i++) {
      try { each(L[i].apply(S, a)); }
      catch (e) { if (!S._w[n]) { S._w[n] = 1; console.warn('[SMACK ' + n + ']', e); } }
    }
  };
  S.call = function (n) { var a = [].slice.call(arguments, 1), r; S._run(n, a, function (v) { if (r === undefined && v !== undefined && v !== null && v !== false) r = v; }); return r; };
  S.collect = function (n) { var a = [].slice.call(arguments, 1), o = {}; S._run(n, a, function (v) { if (v && typeof v === 'object') Object.assign(o, v); }); return o; };
  S.every = function (n) { var a = [].slice.call(arguments, 1), ok = true; S._run(n, a, function (v) { if (v === false) ok = false; }); return ok; };
  // A glove: {id, name, desc, color, color2?, unlock:{smacks:N} or {bux:N} (starters: {smacks:0}), power (knockback x; 1 = normal),
  //  cooldown (s between slaps), reach (studs, default 5), speed (walk x, default 1), build?(THREE) -> Object3D glove mesh,
  //  onSlap?(o,t,hit) (change hit, or return false to cancel), ability?:{name, cooldown, use(o) -> true if used},
  //  passive?:{tick(o,dt)}, onEquip?(o), onUnequip?(o)}
  S.addGlove = function (g) {
    if (!g || typeof g.id !== 'string' || !g.id || S.byId[g.id]) { console.warn('[SMACK] bad or duplicate glove', g && g.id); return null; }
    g = Object.assign({ desc: '', color: '#f5f5f5', unlock: { smacks: 0 }, power: 1, cooldown: .8, reach: 5, speed: 1 }, g);
    S.gloves.push(g); S.byId[g.id] = g; S.call('gloveAdded', g); return g;
  };
})();
