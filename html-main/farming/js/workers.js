// Farming Unblocked — workers: hire a worker to farm a field for you ($150 per minute). Sit in a tractor with a
// cultivator or seed drill (or a combine) next to a field you own or have a job on and press K: you hop out and
// the worker drives the field row by row (tool down on the rows, up in the turns), then stops when it is done.
// A combine worker sells the grain for you when the tank is full (10% delivery fee). Get back in to take over.
// Solo games only: not on the 🌎 Main Server, and not in co-op yet (other players would not see the worker drive).
(function () {
  'use strict';
  var FU = window.FU = window.FU || {};
  var WAGE = 150, FEE = 0.1, KEY = 'KeyK';
  var G = null, jobs = [], box = null, boxT = 0;

  function U() { return FU.util; }
  function money(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  function online() { return !!(FU.net && FU.net.online); }
  function opName(op) { return op === 'harvest' ? 'harvesting' : op === 'seed' ? 'sowing' : 'cultivating'; }
  function toolOf(v) {
    if (!v || !v.def) return null;
    if (v.def.kind === 'combine') return { op: 'harvest', width: v.def.headerWidth || 4.5, lag: 0 };
    if (v.def.kind !== 'tractor' || !FU.implements) return null;
    var imp = FU.implements.attachedTo ? FU.implements.attachedTo(v) : null;
    if (!imp || !imp.def || !imp.def.op) return null;
    var ud = imp.mesh && imp.mesh.userData;
    return { op: imp.def.op, width: imp.def.width || 3, imp: imp, lag: ud ? Math.abs((ud.drawbar || 2) - (ud.workZ || 0)) + 2.5 : 5 };
  }
  // the field the machine is in or next to (yours or one you have a job on)
  function fieldFor(v) {
    var best = null, bd = 25, list = (FU.fields && FU.fields.list) || [];
    list.forEach(function (f) {
      if (!f.owned && !f.contract) return;
      var dx = Math.max(Math.abs(v.x - f.x) - f.w / 2, 0), dz = Math.max(Math.abs(v.z - f.z) - f.d / 2, 0), d = Math.sqrt(dx * dx + dz * dz);
      if (d < bd) { bd = d; best = f; }
    });
    return best;
  }
  function busy(v) { for (var i = 0; i < jobs.length; i++) if (jobs[i].v === v) return jobs[i]; return null; }
  function turnRadius(v) { return (v.def.wheelbase || 2.6) / Math.tan(0.55) * 1.25; }

  // Like a real farmer: first a few laps around the edge (the headland), then rows along the long side,
  // turning on the headland strip — the machine never has to leave the field (trees and fences are close by).
  // Rows are taken k apart so every U-turn is wide enough for the machine to drive.
  function plan(v, f, tool, second) {
    var alongX = f.w > f.d, along = alongX ? f.w : f.d, across = alongX ? f.d : f.w;
    var ax = alongX ? 1 : 0, az = alongX ? 0 : 1, sx = alongX ? 0 : 1, sz = alongX ? 1 : 0;
    var sp = tool.width * 0.9, R = turnRadius(v), H = R + 2 + tool.lag; // headland width at both ends
    var pts = [], i, q, t;
    function P(a, c, work) { return { x: f.x + ax * a + sx * c, z: f.z + az * a + sz * c, work: work }; }
    // 1) headland laps: rectangles just inside the edge, moving inward until the headland strip is covered
    var laps = Math.max(1, Math.ceil((H + 1) / sp)), A0 = along / 2, C0 = across / 2;
    for (i = 0; i < (second ? 0 : laps); i++) {
      var ins = sp / 2 + i * sp, A = A0 - ins, C = C0 - ins;
      if (A < sp || C < sp) break;
      pts.push(P(-A, -C, true), P(A, -C, true), P(A, C, true), P(-A, C, true), P(-A, -C + sp, true));
    }
    // 2) rows inside the headlands
    var inner = laps * sp, c0 = -C0 + inner, c1 = C0 - inner, n = Math.max(1, Math.ceil((c1 - c0) / sp)), lanes = [];
    for (i = 0; i < n; i++) lanes.push(Math.min(c1 - sp * 0.45, c0 + sp * (i + (second ? 1 : 0.5)))); // 2nd pass: halfway between the rows
    var k = Math.max(1, Math.ceil(2 * R / sp)), order = [];
    for (var g = 0; g < k; g++) for (i = g; i < n; i += k) order.push(lanes[i]);
    var ends = along / 2 - H, dir = 1;
    if (ends > sp) order.forEach(function (c, idx) {
      var from = -dir * (ends + 1), to = dir * ends;
      pts.push(P(from, c, true)); pts.push(P(to, c, true));
      var next = order[idx + 1];
      if (next !== undefined) { // quarter circle, straight along the headland, quarter circle back into the next row
        var sg = next > c ? 1 : -1, off = Math.abs(next - c), r = Math.max(0.5, Math.min(R, off / 2));
        for (q = 1; q <= 4; q++) { t = q / 4 * Math.PI / 2; pts.push(P(to + dir * r * Math.sin(t), c + sg * r * (1 - Math.cos(t)), false)); }
        if (off > 2 * r + 0.5) pts.push(P(to + dir * r, next - sg * r, false));
        for (q = 1; q <= 4; q++) { t = q / 4 * Math.PI / 2; pts.push(P(to + dir * r * Math.cos(t), next - sg * r + sg * r * Math.sin(t), false)); }
      }
      dir = -dir;
    });
    if (pts.length) { var last = pts[pts.length - 1], lc = (last.x - f.x) * sx + (last.z - f.z) * sz; pts.push(P(-dir * (along / 2 + 7), lc, false)); } // park just off the field, out of the way
    return pts;
  }

  function hire() {
    var v = G.activeVehicle, tool = toolOf(v), f = v && fieldFor(v);
    if (!v || !tool || !f) return;
    if (online()) { G.notify(FU.town && FU.town.main ? 'Workers are not available on the Main Server' : 'Workers only work in solo games for now', 'bad'); return; }
    if (G.money < WAGE / 4) { G.notify('Not enough money to pay a worker', 'bad'); return; }
    var job = { v: v, f: f, tool: tool, pts: plan(v, f, tool), i: 0, stuck: 0, back: 0, unsticks: 0, paid: 0, sold: 0, t: 0, second: false };
    if (job.pts.length < 2) return;
    jobs.push(job);
    try { FU.player.exit(); } catch (e) { G.activeVehicle = null; }
    v.ai = { gas: 0, brake: 0, steer: 0 };
    G.notify('👷 Worker hired: ' + opName(tool.op) + ' ' + f.name + ' for ' + money(WAGE) + '/min. Get back in any time to take over.', 'good');
    try { if (FU.audio) FU.audio.play('click'); } catch (e) {}
  }
  function stop(job, why, kind) {
    var i = jobs.indexOf(job); if (i < 0) return;
    jobs.splice(i, 1);
    var v = job.v; v.ai = null; v.working = false; if (job.tool.imp) job.tool.imp.lowered = false;
    if (why) G.notify(why, kind || 'info');
  }
  function progress(job) {
    var s = FU.fields && FU.fields.stats ? FU.fields.stats(job.f) : null; if (!s || !s.total) return 0;
    var done = job.tool.op === 'harvest' ? (s.stubble || 0) : job.tool.op === 'seed' ? (s.growing || 0) + (s.ripe || 0) : (s.cultivated || 0);
    return done / s.total;
  }
  function sellTank(job) { // combine worker delivers the grain itself
    var v = job.v, c = v.cargo; if (!c || c.liters < 1) return;
    var price = FU.economy && FU.economy.price ? FU.economy.price(c.cropId) : 0.4, gross = c.liters * price, net = Math.round(gross * (1 - FEE));
    var crop = FU.crops && FU.crops.byId ? FU.crops.byId(c.cropId) : null, l = c.liters;
    c.liters = 0; c.cropId = 0;
    G.earn(net, 'worker sold grain'); G.emit('sold', { cropId: crop ? crop.id : 0, liters: l, money: net });
    job.sold += net;
    G.notify('👷 Worker sold ' + Math.round(l).toLocaleString('en-US') + ' L ' + (crop ? crop.name : 'grain') + ' for ' + money(net) + ' (10% delivery fee)', 'good');
  }
  function drive(job, dt) {
    var v = job.v, pts = job.pts, p = pts[job.i], U2 = U();
    if (!p) {
      if (!job.second && progress(job) < 0.97) { job.second = true; job.pts = plan(v, job.f, job.tool, true); job.i = 0; return; } // go over the gaps once more
      stop(job, '👷 Worker finished ' + job.f.name + '! (' + Math.round(progress(job) * 100) + '% done, paid ' + money(job.paid) + ')', 'good'); return;
    }
    if (job.back > 0) { // backing up after bumping into something
      job.back -= dt; v.ai.gas = 0.7; v.ai.brake = 0; v.ai.reverse = true; v.ai.steer = job.backSteer;
      if (job.tool.imp) job.tool.imp.lowered = false; else v.working = false;
      if (job.back <= 0) { v.ai.reverse = false; job.stuck = 0; }
      return;
    }
    var dx = p.x - v.x, dz = p.z - v.z, d = Math.sqrt(dx * dx + dz * dz), look = Math.max(3.5, Math.abs(v.speed) * 1.1);
    while (d < look && job.i < pts.length - 1) { job.i++; p = pts[job.i]; dx = p.x - v.x; dz = p.z - v.z; d = Math.sqrt(dx * dx + dz * dz); }
    if (job.i >= pts.length - 1 && d < 2.5) { job.i = pts.length; return; }
    var want = Math.atan2(dx, dz), err = U2.wrapAngle(want - v.heading);
    var working = !!p.work && Math.abs(err) < 0.8;
    v.ai.steer = err * 2.4;
    v.ai.gas = Math.abs(err) > 1.0 ? 0.45 : working ? 1 : 0.7;
    v.ai.brake = 0;
    if (job.tool.imp) job.tool.imp.lowered = working; else v.working = working;
    if (!working) v.speedLimit = Math.abs(err) > 0.5 ? 3.5 : 5.5; // turns and getting to the field: take it easy (tools set their own work speed)
    // stuck (tree, fence, another machine): give up after a few seconds
    if (Math.abs(v.speed) < 0.3) {
      job.stuck += dt;
      if (job.stuck > 2.5 && job.i >= job.pts.length - 1 && !job.second && progress(job) < 0.97) { job.i = job.pts.length; return; } // parking blocked: go straight to the gap pass / finish
      if (job.stuck > 2.5 && job.i >= job.pts.length - 1) { job.i = job.pts.length; return; }
      if (job.stuck > 2.5) { // back up a bit and try again; after a few tries skip past whatever is in the way
        job.unsticks++; job.stuck = 0; job.back = 1.6; job.backSteer = err > 0 ? -1 : 1;
        if (job.unsticks % 3 === 0) job.i = Math.min(job.pts.length - 1, job.i + 3);
        if (job.unsticks > 12) stop(job, '👷 The worker got stuck near ' + job.f.name + ' and stopped. Drive it free and hire again.', 'bad');
      }
    } else job.stuck = 0;
    if (v.def.kind === 'combine' && v.cargo && v.cargo.capacity && v.cargo.liters >= v.cargo.capacity - 1) sellTank(job);
  }

  function paintBox() {
    var col = FU.hud && FU.hud.rightColumn;
    if (!box && col) { box = document.createElement('div'); box.className = 'fu-box'; box.style.fontSize = '13px'; col.appendChild(box); }
    if (!box) return;
    if (!jobs.length || !G.started) { box.style.display = 'none'; return; }
    box.style.display = '';
    box.innerHTML = jobs.map(function (j) {
      return '👷 <b>' + j.f.name + '</b> · ' + opName(j.tool.op) + ' · ' + Math.round(progress(j) * 100) + '%<br><span class="fu-small">' + money(WAGE) + '/min · paid ' + money(j.paid) + '</span>';
    }).join('<hr style="border:0;border-top:1px solid rgba(255,255,255,.15);margin:5px 0">');
  }

  FU.workers = { list: function () { return jobs.slice(); }, hire: hire, WAGE: WAGE };

  FU.register({
    name: 'workers', order: 29, ui: false, // before vehicles (30) so the steering is used the same frame
    init: function (g) {
      G = g;
      g.on('enterVehicle', function (e) { var j = busy(e && e.vehicle); if (j) stop(j, '👷 You took over from the worker on ' + j.f.name + ' (paid ' + money(j.paid) + ')'); });
      g.on('newGame', function () { jobs.slice().forEach(function (j) { stop(j); }); });
      g.on('gameLoaded', function () { jobs.slice().forEach(function (j) { stop(j); }); });
      g.on('netStatus', function () { if (online() && jobs.length) jobs.slice().forEach(function (j) { stop(j, 'Workers went home (they only work in solo games)'); }); });
    },
    update: function (dt, g) {
      if (!g.started) return;
      var v = g.activeVehicle;
      if (v && !g.input.blocked && !busy(v)) {
        var tool = toolOf(v), f = tool && fieldFor(v);
        if (f) {
          if (FU.town && FU.town.main) { /* no workers on the Main Server */ }
          else {
            g.prompt('[K] Hire a worker to farm ' + f.name + ' (' + money(WAGE) + '/min)');
            if (g.input.pressed(KEY)) hire();
          }
        }
      }
      if (g.paused) return;
      for (var i = jobs.length - 1; i >= 0; i--) {
        var j = jobs[i];
        if (!j.v || (FU.vehicles && FU.vehicles.list.indexOf(j.v) < 0)) { jobs.splice(i, 1); continue; }
        var wage = WAGE / 60 * dt;
        if (G.money < wage) { stop(j, '👷 You ran out of money to pay the worker on ' + j.f.name, 'bad'); continue; }
        G.charge(wage, 'worker'); j.paid += wage;
        drive(j, dt);
      }
      boxT -= dt; if (boxT <= 0) { boxT = 0.5; paintBox(); }
    }
  });
})();
