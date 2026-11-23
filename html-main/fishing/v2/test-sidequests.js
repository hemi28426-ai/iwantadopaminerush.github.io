// node test: runs every side quest chain to completion via every approach
var logs = [];
global.window = global;
global.S = null; var wx = { wx: 'clear', night: false };
global.ENV = function () { return wx; };
global.save = function () {}; global.hint = function () {}; global.banner = function (t) { logs.push(t); };
global.addFeed = function () {}; global.beep = function () {}; global.fmt = function (n) { return '$' + n; };
require('./sidequests.js');
var ISLES = ['harbor', 'coral', 'frost', 'dunes', 'mire', 'crystal', 'ember', 'sky', 'elder', 'grotto'];
var WX = ['clear', 'rain', 'storm', 'fog', 'wind'];
function* ctxs() {
  for (var i of ISLES) for (var sp of ['sea', 'lake', 'deep', 'cloud']) for (var t = 0; t <= 7; t++)
    for (var ev of [null, 'meteor', 'aurora', 'whirlpool']) for (var m of [null, 'x']) for (var n of [false, true]) for (var w of WX)
      yield [{ isl: i, spot: sp, tier: t, event: ev, mutation: m, kg: m ? 6 : 1 }, { wx: w, night: n }];
}
function find(g) { // find a context satisfying a catch goal
  for (var x of ctxs()) if (g.f(x[0], x[1], {})) return x; return null;
}
var fails = 0;
function run(approach) {
  S = { money: 100000, xp: 0, earned: 0, name: 'T' };
  var out = [];
  for (var id in SQ.defs) {
    var def = SQ.defs[id], npc = def.npc, guard = 0;
    var o = SQ.options(npc); if (!o.length || !SQ.lines(npc).length) { console.log('FAIL start', id); fails++; continue; }
    o[0].fn();
    while (!S.sq[id].done && guard++ < 60) {
      var q = S.sq[id], opts = SQ.options(npc), step = def.steps[q.s];
      if (step.alts && q.a < 0) { opts[Math.min(approach === 'last' ? opts.length - 1 : approach === 'first' ? 0 : (q.s % opts.length), opts.length - 1)].fn(); continue; }
      var g = def.steps[q.s].alts ? step.alts[q.a].goal : step.goal;
      if (g.k === 'pay') { var s0 = q.s; opts[0].fn(); if (S.sq[id].s === s0) { console.log('FAIL pay', id); fails++; break; } continue; }
      if (g.k === 'visit') { SQ.onEvent('island', 'nowhere'); if (q.ok) { console.log('FAIL bad visit', id); fails++; break; } SQ.onEvent('island', g.ids[0]); }
      else { var x = find(g); if (!x) { console.log('FAIL unsatisfiable', id, g.d); fails++; break; }
        for (var i = 0; i < g.n; i++) { wx = x[1]; SQ.onCatch({ id: 'f' }, x[0]); } wx = { wx: 'clear', night: false }; }
      if (!q.ok) { console.log('FAIL not ok', id, g.d); fails++; break; }
      var hudS = SQ.hud(); if (!hudS) { console.log('FAIL hud', id); fails++; }
      var r = SQ.options(npc).filter(function (z) { return /Report/.test(z.label); });
      if (!r.length) { console.log('FAIL no report', id); fails++; break; }
      r[0].fn();
    }
    var done = S.sq[id].done && S.ownedRods.indexOf(def.rod) >= 0;
    out.push(id + (done ? ' OK ' + def.rod : ' FAIL'));
    if (!done) fails++;
    if (SQ.options(npc).length || !SQ.lines(npc).length) { console.log('FAIL post-done', id); fails++; }
  }
  console.log('[' + approach + '] ' + out.join(' | ') + ' | money ' + S.money + ' xp ' + S.xp);
}
run('first'); run('last'); run('mix');
console.log(fails ? 'FAILURES: ' + fails : 'ALL PASSED');
process.exit(fails ? 1 : 0);
