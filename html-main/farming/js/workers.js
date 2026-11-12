// Farming Unblocked — workers: a hiring office (K, anywhere). Hire people rated 1-5★: more stars = faster work,
// a higher price per job and a bigger signing fee. Give a worker a field and they keep it farmed nonstop: harvest when
// it's ripe, till the stubble, sow the crop, wait while it grows, and round again — each step with whichever of your
// machines is free (they hitch a free cultivator / seed drill to a free tractor themselves). Jobs are paid when they
// start, by field size; short of money, they wait. Machine upgrades (Stock / Tuned / Pro / Elite, vehicles.js UPG)
// make machines faster for everyone and set how fast a worker may push them — a machine too slow for the worker makes
// each job take longer and cost more, so good workers need good machines. A combine worker sells the grain itself
// (10% fee). Get in a machine to take over. Solo games only (not the 🌎 Main Server, not co-op yet).
(function () {
  'use strict';
  var FU = window.FU = window.FU || {};
  var FEE = 0.1, KEY = 'KeyK', MAX_STAFF = 8;
  var STAR = { speed: [0, 0.8, 0.95, 1.15, 1.4, 1.7], rate: [0, 250, 400, 600, 850, 1150], fee: [0, 1000, 3000, 7500, 15000, 30000], train: [0, 4000, 9000, 16000, 26000, 0] };
  var NAMES = ['Maya', 'Leo', 'Priya', 'Sam', 'Jonas', 'Aiko', 'Diego', 'Fatima', 'Noah', 'Zara', 'Eli', 'Mateo', 'Grace', 'Omar', 'Lily', 'Ravi',
    'Ivy', 'Theo', 'Nia', 'Hugo', 'Rosa', 'Kai', 'Lena', 'Tariq', 'Ben', 'Chloe', 'Arjun', 'Sofia', 'Malik', 'Hana', 'Felix', 'June'];
  var FACES = ['👩‍🌾', '👨‍🌾', '🧑‍🌾'];
  var LOOK = { skin: [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac, 0xa86b3c], shirt: [0xb7412e, 0x1e88e5, 0x43a047, 0xfdd835, 0x8e24aa, 0xff7043, 0x546e7a, 0xd81b60],
    denim: [0x35588f, 0x2e3b4e, 0x5d4037, 0x455a64, 0x1b5e20], cap: [0x2f7a3a, 0xc62828, 0x1565c0, 0xf9a825, 0x424242, 0x6a1b9a] };
  function pickOf(a) { return a[(Math.random() * a.length) | 0]; }
  function newLook() { return { skin: pickOf(LOOK.skin), shirt: pickOf(LOOK.shirt), denim: pickOf(LOOK.denim), cap: pickOf(LOOK.cap) }; }
  var G = null, jobs = [], box = null, boxT = 0, panel = null, isOpen = false, pick = {}, paintT = 0;
  var staff = [], cands = [], nid = 1, tab = 'staff', armedFire = null;
  function UPG() { return (FU.vehicles && FU.vehicles.UPG) || { names: ['Stock'], work: [1], cap: [1], cost: [0] }; }
  function lvl(v) { return Math.max(0, Math.min(3, (v && v.upg) | 0)); }
  function stars(n) { var o = ''; for (var i = 1; i <= 5; i++) o += i <= n ? '★' : '☆'; return o; }
  function starsHtml(n) { var o = ''; for (var i = 1; i <= 5; i++) o += '<span class="' + (i <= n ? 'on' : 'off') + '">★</span>'; return o; }
  function person(st) { // a new candidate
    var r = Math.random(), sN = st || (r < 0.3 ? 1 : r < 0.6 ? 2 : r < 0.82 ? 3 : r < 0.94 ? 4 : 5);
    return { id: 'w' + (nid++), name: NAMES[(Math.random() * NAMES.length) | 0] + ' ' + String.fromCharCode(65 + ((Math.random() * 26) | 0)) + '.', stars: sN, face: FACES[(Math.random() * FACES.length) | 0], look: newLook() };
  }
  function freshCands() { cands = []; for (var i = 0; i < 8; i++) cands.push(person()); cands.sort(function (a, b) { return b.stars - a.stars; }); }
  function jobOf(w) { for (var i = 0; i < jobs.length; i++) if (jobs[i].w === w) return jobs[i]; return null; }
  // how fast a worker drives this machine: machine upgrade x worker skill (capped by the machine)
  function skillMult(w, v) { return Math.min(STAR.speed[w ? w.stars : 3], UPG().cap[lvl(v)]); }

  function U() { return FU.util; }
  function money(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  function online() { return !!(FU.net && FU.net.online); }
  function opName(op) { return op === 'harvest' ? 'harvesting' : op === 'seed' ? 'sowing' : 'tilling'; }
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

  function noWorkersHere() {
    if (!online()) return '';
    return FU.town && FU.town.main ? 'Workers are not available on the Main Server' : 'Workers only work in solo games for now';
  }

  // ---------- nonstop farming, paid by the job ----------
  // A worker is given a field (w.assign = {f, crop}) and keeps it farmed until you stop them. Every step they look at
  // what the field needs, take the best free machine (hitching tools themselves), bring it over and do it, then go
  // straight on to the next step. A step is paid when it starts; if you're short of money they wait until you have it.
  var OPF = { cultivate: 1, seed: 1, harvest: 1.5 }, rt = {}, lastSig = {};
  function R(w) { return rt[w.id] || (rt[w.id] = { t: 0, k: 'idle', st: '', last: null, rep: 0, fails: 0, force: false, warned: '' }); }
  function setSt(r, k, txt) { r.k = k; r.st = txt; }
  function ha(f) { return f ? f.w * f.d / 10000 : 0; }
  function cap(t) { return t.replace(/^./, function (c) { return c.toUpperCase(); }); }
  function cropName(id) { var c = FU.crops && FU.crops.byId ? FU.crops.byId(id) : null; return c ? c.name : 'Wheat'; }
  function staffById(id) { for (var i = 0; i < staff.length; i++) if (staff[i].id === id) return staff[i]; return null; }
  // a machine too slow for the worker makes each job take longer, so it costs more: good workers need good machines
  function slowF(w, v) { return Math.max(1, STAR.speed[w.stars] / skillMult(w, v)); }
  function jobPrice(w, op, f, v, share) {
    return Math.max(50, Math.round(STAR.rate[w.stars] * OPF[op] * ha(f) * Math.max(0.15, Math.min(1, share)) * (v ? slowF(w, v) : 1) / 10) * 10);
  }
  function need(f, op) { // share of the field a step would still work on (0..1)
    var st = FU.fields && FU.fields.stats ? FU.fields.stats(f) : null; if (!st || !st.total) return 0;
    if (op === 'harvest') return (st.ripe || 0) / st.total;
    if (op === 'seed') return (st.cultivated || 0) / st.total;
    return ((st.grass || 0) + (st.stubble || 0) + (st.ripe || 0)) / st.total; // tilling also turns under missed ripe spots
  }
  function progress(job) { return Math.max(0, Math.min(1, 1 - need(job.f, job.op) / job.need0)); }
  // What the field needs next. r remembers the last step: a step is only redone for a real gap, never 3 times in a row.
  function nextOp(f, r) {
    var s = FU.fields.stats(f), T = s.total; if (!T) return { wait: 'Field not found' };
    var A = ((s.grass || 0) + (s.stubble || 0)) / T, C = (s.cultivated || 0) / T, Gr = (s.growing || 0) / T, Rp = (s.ripe || 0) / T;
    function worth(op, min) { return r.last !== op ? min : r.rep >= 2 ? 9 : 0.15; }
    if (f.contract && !f.owned) { // a contract job: only the job's own work
      var cop = f.contract.op;
      return need(f, cop) >= worth(cop, 0.02) ? { op: cop } : { wait: 'Did all they could: finish the last spots yourself' };
    }
    if (Rp >= worth('harvest', 0.08) && Gr < 0.04) return { op: 'harvest' };        // ripe: harvest
    if (A + Rp >= worth('cultivate', 0.08) && Gr < 0.04) return { op: 'cultivate' }; // stubble / grass: till (never over growing crops)
    if (C >= worth('seed', 0.08)) return { op: 'seed' };                              // tilled: sow
    if (Gr >= 0.04) return { wait: 'Crops growing · ' + Math.round(Rp / (Rp + Gr) * 100) + '% ripe', grow: true };
    r.last = null; r.rep = 0; return { wait: 'Looking at the field…' };
  }
  function freeV(v) { return !busy(v) && v !== G.activeVehicle && !(v.netControlled && v.netControlled > performance.now()); }
  // the best free machine for a step: a combine, or a tractor that has (or can hitch) the right tool
  function findMachine(op, w, f) {
    var IM = FU.implements, best = null, bs = -1e9;
    function consider(v, tool, hitch, bonus) {
      var dx = v.x - f.x, dz = v.z - f.z, width = tool ? tool.def.width || 3 : v.def.headerWidth || 4.5;
      var sc = width * UPG().work[lvl(v)] * skillMult(w, v) + bonus - Math.sqrt(dx * dx + dz * dz) / 500;
      if (sc > bs) { bs = sc; best = { v: v, hitch: hitch }; }
    }
    machines().forEach(function (v) {
      if (!freeV(v)) return;
      if (op === 'harvest') { if (v.def.kind === 'combine') consider(v, null, null, 0); return; }
      if (v.def.kind !== 'tractor' || !IM) return;
      var cur = IM.attachedTo(v);
      if (cur && cur.def.op === op) { consider(v, cur, null, 2); return; } // the right tool is already on
      IM.list.forEach(function (t) { if (t.def.op === op && !t.attachedTo && IM.canPull(v, t)) consider(v, t, t, cur ? -0.5 : 0); });
    });
    return best;
  }
  function noMachine(op) { // why there's no machine for a step
    var IM = FU.implements, ms = machines();
    if (op === 'harvest') return ms.some(function (v) { return v.def.kind === 'combine'; }) ? 'Waiting for a free combine' : 'Needs a combine (shop)';
    var tool = op === 'seed' ? 'seed drill' : 'cultivator', trs = ms.filter(function (v) { return v.def.kind === 'tractor'; });
    var tools = IM ? IM.list.filter(function (t) { return t.def.op === op; }) : [];
    if (!trs.length) return 'Needs a tractor (shop)';
    if (!tools.length) return 'Needs a ' + tool + ' (shop)';
    if (!trs.some(function (v) { return tools.some(function (t) { return IM.canPull(v, t); }); })) return 'Needs a bigger tractor for the ' + tool;
    return 'Waiting for a free tractor + ' + tool;
  }
  function inField(x, z, f, m) { return Math.abs(x - f.x) < f.w / 2 + m && Math.abs(z - f.z) < f.d / 2 + m; }
  function spotFree(x, z, me) {
    var Uu = U(), cols = G.colliders || [], i, b, o, half = ((FU.LAYOUT && FU.LAYOUT.mapSize) || 600) / 2 - 12;
    if (Math.abs(x) > half || Math.abs(z) > half) return false;
    for (i = 0; i < cols.length; i++) {
      b = cols[i]; if (Math.abs(x - b.x) > b.hw + b.hd + 6 || Math.abs(z - b.z) > b.hw + b.hd + 6) continue;
      if (Uu.circleVsBox(x, z, 4.5, b)) return false;
    }
    var fl = (FU.fields && FU.fields.list) || [];
    for (i = 0; i < fl.length; i++) if (inField(x, z, fl[i], 5)) return false;
    var vl = (FU.vehicles && FU.vehicles.list) || [];
    for (i = 0; i < vl.length; i++) { o = vl[i]; if (o !== me && (o.x - x) * (o.x - x) + (o.z - z) * (o.z - z) < 81) return false; }
    var il = (FU.implements && FU.implements.list) || [];
    for (i = 0; i < il.length; i++) { o = il[i]; if (!(me && o.attachedTo === me.id) && (o.x - x) * (o.x - x) + (o.z - z) * (o.z - z) < 49) return false; }
    return true;
  }
  function parkOff(o, f, isTool) { // move a machine / loose tool out of the field to the nearest free spot beside it
    var c = [], d, t;
    for (d = 10; d <= 28; d += 6) {
      for (t = -f.w / 2; t <= f.w / 2; t += 6) c.push({ x: f.x + t, z: f.z - f.d / 2 - d, h: Math.PI }, { x: f.x + t, z: f.z + f.d / 2 + d, h: 0 });
      for (t = -f.d / 2; t <= f.d / 2; t += 6) c.push({ x: f.x - f.w / 2 - d, z: f.z + t, h: -Math.PI / 2 }, { x: f.x + f.w / 2 + d, z: f.z + t, h: Math.PI / 2 });
    }
    c.forEach(function (q) { q.k = (q.x - o.x) * (q.x - o.x) + (q.z - o.z) * (q.z - o.z); });
    c.sort(function (a2, b2) { return a2.k - b2.k; });
    for (var i = 0; i < c.length; i++) {
      if (!spotFree(c[i].x, c[i].z, isTool ? null : o)) continue;
      o.x = c[i].x; o.z = c[i].z; o.heading = c[i].h;
      if (!isTool) {
        o.speed = 0; o.steer = 0;
        var imp = FU.implements && FU.implements.attachedTo(o);
        if (imp) { var fw = U().fwd(o.heading); imp.x = o.x - fw.x * 5; imp.z = o.z - fw.z * 5; imp.heading = o.heading; }
      }
      return true;
    }
    return false;
  }
  function clearField(f, keep) { // before a step: nothing parked in the way
    ((FU.vehicles && FU.vehicles.list) || []).forEach(function (o) {
      if (o !== keep && o !== G.activeVehicle && !busy(o) && !(o.netControlled && o.netControlled > performance.now()) && inField(o.x, o.z, f, 4)) parkOff(o, f, false);
    });
    ((FU.implements && FU.implements.list) || []).forEach(function (t) { if (!t.attachedTo && inField(t.x, t.z, f, 3)) parkOff(t, f, true); });
  }
  function teleportTo(v, tool, pts) { // the worker brings the machine over to the corner where the work starts
    var p0 = pts[0], p1 = pts[1], h = Math.atan2(p1.x - p0.x, p1.z - p0.z), fw = U().fwd(h);
    v.x = p0.x; v.z = p0.z; v.heading = h; v.speed = 0; v.steer = 0;
    if (tool.imp) { tool.imp.x = v.x - fw.x * 5; tool.imp.z = v.z - fw.z * 5; tool.imp.heading = h; }
  }
  function startStep(w, f, op, m, r) {
    var v = m.v, a = w.assign, share = need(f, op), price = jobPrice(w, op, f, v, share);
    var credit = a.job && a.job.op === op && String(a.job.f) === String(f.id) ? a.job.price || 0 : 0; // paid already, then cut short (a reload)
    var due = Math.max(0, price - credit);
    if (G.money < due) {
      setSt(r, 'money', 'Waiting for money: next job ' + money(due));
      if (r.warned !== op) { r.warned = op; G.notify(w.face + ' ' + w.name + ' is waiting: ' + opName(op) + ' ' + f.name + ' costs ' + money(due) + ', you have ' + money(G.money), 'bad'); }
      return false;
    }
    r.warned = '';
    if (m.hitch) { // swap tools: drop whatever is on, hitch the free one right behind the tractor
      var IM = FU.implements, old = IM.attachedTo(v), fw = U().fwd(v.heading);
      if (old) { old.attachedTo = null; old.lowered = false; old.working = false; old.speed = 0; }
      v.attached = m.hitch.id; m.hitch.attachedTo = v.id; m.hitch.lowered = false;
      m.hitch.x = v.x - fw.x * 5; m.hitch.z = v.z - fw.z * 5; m.hitch.heading = v.heading;
    }
    clearField(f, v);
    if (op === 'harvest' && v.cargo && v.cargo.liters >= 1) sellTank({ v: v, w: w, sold: 0 }); // grain left in the tank (another crop would block the header)
    var tool = toolOf(v); if (!tool || tool.op !== op) { setSt(r, 'need', noMachine(op)); return false; }
    if (op === 'seed') tool.imp.seedCrop = (f.contract && !f.owned && f.contract.cropId) || a.crop || 1;
    var pts = plan(v, f, tool);
    if (pts.length < 2) { unassign(w, f.name + ' is too small for the ' + v.def.name, 'bad'); return false; }
    if (r.force || Math.sqrt((v.x - pts[0].x) * (v.x - pts[0].x) + (v.z - pts[0].z) * (v.z - pts[0].z)) > 15) teleportTo(v, tool, pts); // (parked machines can box each other in)
    r.force = false;
    if (due > 0) G.spend(due, 'worker job');
    var job = { v: v, f: f, w: w, tool: tool, op: op, pts: pts, i: 0, stuck: 0, back: 0, unsticks: 0, price: due + credit, need0: Math.max(share, 0.001), sold: 0, second: false };
    a.job = { op: op, f: f.id, price: job.price };
    jobs.push(job);
    v.ai = { gas: 0, brake: 0, steer: 0 };
    setSt(r, 'work', '');
    G.notify(w.face + ' ' + w.name + ' is ' + opName(op) + (op === 'seed' ? ' ' + cropName(tool.imp.seedCrop) + ' on' : '') + ' ' + f.name + ' with the ' + v.def.name + (due ? ' · job ' + money(due) : ''), 'good');
    paint(true);
    return true;
  }
  function endJob(job) { // the machine is free again
    var i = jobs.indexOf(job); if (i < 0) return false;
    jobs.splice(i, 1);
    var v = job.v; v.ai = null; v.working = false; if (job.tool.imp) job.tool.imp.lowered = false;
    var r = rt[job.w.id]; if (r && r.k === 'work') setSt(r, 'idle', '');
    return true;
  }
  function finish(job) { // step done: straight on to the next thing the field needs
    if (job.op === 'harvest') sellTank(job);
    if (!endJob(job)) return;
    if (inField(job.v.x, job.v.z, job.f, 12)) parkOff(job.v, job.f, false); // out of the way, with room around it
    var w = job.w, r = R(w);
    if (w.assign) w.assign.job = null;
    if (r.last === job.op) r.rep++; else { r.last = job.op; r.rep = 1; }
    r.fails = 0; r.t = 0.2; setSt(r, 'idle', 'Done ' + opName(job.op) + ', on to the next job…');
    paint(true);
  }
  function cancel(job, why, kind) { // stopped early: the unfinished part of the job is paid back
    if (!endJob(job)) return 0;
    var left = Math.max(0, Math.min(1, need(job.f, job.op) / job.need0)), back = Math.round(job.price * left);
    if (back > 0) G.earn(back, 'worker refund');
    if (job.w.assign) job.w.assign.job = null;
    if (why) G.notify(why + (back > 0 ? ' (' + money(back) + ' back for the unfinished part)' : ''), kind || 'info');
    paint(true);
    return back;
  }
  function stuckOut(job) { // stuck for good: pay back, then start over from the field corner (gives up after 3 tries)
    var w = job.w, r = R(w); r.fails++;
    if (r.fails >= 3) { unassign(w, '👷 ' + w.name + ' keeps getting stuck on ' + job.f.name + ' and stopped. Move the machine out of the way and start them again.', 'bad'); return; }
    cancel(job); r.force = true; r.t = 2;
  }
  function assign(w, f, crop) {
    var why = noWorkersHere(); if (why) { G.notify(why, 'bad'); return false; }
    if (!w) return false;
    if (!f || !(f.owned || f.contract)) { G.notify('Pick a field you own or have a job on', 'bad'); return false; }
    var o = staff.filter(function (x) { return x !== w && x.assign && String(x.assign.f) === String(f.id); })[0];
    if (o) { G.notify(o.name + ' already looks after ' + f.name, 'bad'); return false; }
    var j = jobOf(w); if (j) cancel(j);
    var isJob = !!(f.contract && !f.owned);
    w.assign = { f: f.id, crop: +crop || 1, job: null, c: isJob };
    rt[w.id] = null; setSt(R(w), 'idle', 'Looking at the field…');
    G.notify(w.face + ' ' + w.name + ' now looks after ' + f.name + (isJob ? ' (the contract job)' : ': harvesting, tilling and sowing ' + cropName(w.assign.crop) + ', nonstop') + '. You pay per job.', 'good');
    try { if (FU.audio) FU.audio.play('click'); } catch (e) {}
    paint(true);
    return true;
  }
  function unassign(w, why, kind) { // returns the money paid back for an unfinished job
    var j = jobOf(w), back = j ? cancel(j) : 0;
    w.assign = null; rt[w.id] = null;
    if (why) G.notify(why + (back > 0 ? ' (' + money(back) + ' back for the unfinished job)' : ''), kind || 'info');
    paint(true);
    return back;
  }
  function tick(w, dt) { // an assigned worker between steps: what next?
    var r = R(w); r.t -= dt; if (r.t > 0) return; r.t = 1;
    var a = w.assign, f = FU.fields && FU.fields.byId(a.f);
    if (!f || !(f.owned || f.contract)) { unassign(w, w.face + ' ' + w.name + (a.c ? ' is done with the job on ' : ' stopped: you no longer have ') + (f ? f.name : 'that field')); return; }
    var nx = nextOp(f, r);
    if (nx.wait) { setSt(r, nx.grow ? 'grow' : 'wait', nx.wait); return; }
    var m = findMachine(nx.op, w, f);
    if (!m) {
      var why = noMachine(nx.op); setSt(r, 'need', why);
      if (/^Needs/.test(why) && r.warned !== why) { r.warned = why; G.notify(w.face + ' ' + w.name + ' (' + f.name + '): ' + why, 'bad'); }
      return;
    }
    startStep(w, f, nx.op, m, r);
  }
  function statusOf(w) { // what a worker is up to: {k: work|grow|wait|money|need|idle, txt, p: 0..1 or -1}
    var j = jobOf(w);
    if (j) { var p = progress(j); return { k: 'work', txt: cap(opName(j.op)) + ' ' + j.f.name + ' · ' + Math.round(p * 100) + '%', p: p }; }
    if (!w.assign) return { k: 'idle', txt: 'No field yet', p: -1 };
    var r = R(w); return { k: r.k, txt: r.st || 'Looking at the field…', p: -1 };
  }
  function sigOf(w) { var j = jobOf(w), r = rt[w.id]; return j ? 'J' + j.op + j.v.id : w.assign ? 'A' + (r ? r.k : '') : 'N'; }
  function sellTank(job) { // combine worker delivers the grain itself
    var v = job.v, c = v.cargo; if (!c || c.liters < 1) return;
    var price = FU.economy && FU.economy.price ? FU.economy.price(c.cropId) : 0.4, gross = c.liters * price, net = Math.round(gross * (1 - FEE));
    var crop = FU.crops && FU.crops.byId ? FU.crops.byId(c.cropId) : null, l = c.liters;
    c.liters = 0; c.cropId = 0;
    G.earn(net, 'worker sold grain'); G.emit('sold', { cropId: crop ? crop.id : 0, liters: l, money: net });
    job.sold += net;
    G.notify(job.w.face + ' ' + job.w.name + ' sold ' + Math.round(l).toLocaleString('en-US') + ' L ' + (crop ? crop.name : 'grain') + ' for ' + money(net) + ' (10% delivery fee)', 'good');
  }
  function drive(job, dt) {
    var v = job.v, pts = job.pts, p = pts[job.i], U2 = U();
    if (!p) {
      if (!job.second && need(job.f, job.op) > 0.03) { job.second = true; job.pts = plan(v, job.f, job.tool, true); job.i = 0; return; } // go over the gaps once more
      finish(job); return; // and straight on to whatever the field needs next
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
    if (!working) v.speedLimit = (Math.abs(err) > 0.5 ? 3.5 : 5.5) * Math.max(1, skillMult(job.w, v)); // turns: take it easy (tools set their own work speed)
    // stuck (tree, fence, another machine): give up after a few seconds
    if (Math.abs(v.speed) < 0.3) {
      job.stuck += dt;
      if (job.stuck > 2.5 && job.i >= job.pts.length - 1 && !job.second && progress(job) < 0.97) { job.i = job.pts.length; return; } // parking blocked: go straight to the gap pass / finish
      if (job.stuck > 2.5 && job.i >= job.pts.length - 1) { job.i = job.pts.length; return; }
      if (job.stuck > 2.5) { // back up a bit and try again; after a few tries skip past whatever is in the way
        job.unsticks++; job.stuck = 0; job.back = 1.6; job.backSteer = err > 0 ? -1 : 1;
        if (job.unsticks % 3 === 0) job.i = Math.min(job.pts.length - 1, job.i + 3);
        if (job.unsticks > 12) { stuckOut(job); return; }
      }
    } else job.stuck = 0;
    if (v.def.kind === 'combine' && v.cargo && v.cargo.capacity && v.cargo.liters >= v.cargo.capacity - 1) sellTank(job);
  }


  // ---------- the hiring office (K, anywhere): Staff / Hire people / Machines ----------
  function cropList() { return (FU.crops && FU.crops.types) || []; }
  function myFields() { return ((FU.fields && FU.fields.list) || []).filter(function (f) { return f.owned || f.contract; }); }
  function machines() { return ((FU.vehicles && FU.vehicles.list) || []).filter(function (v) { return v.def && (v.def.kind === 'tractor' || v.def.kind === 'combine'); }); }
  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // ---------- 3D portraits of the people (rendered off-screen once, like a character card) ----------
  var pRT = null, pScene = null, pCam = null, pCache = {};
  function portrait(w) {
    if (!w.look) w.look = newLook();
    if (pCache[w.id]) return pCache[w.id];
    var url = '';
    try {
      var R = G.renderer, W = 180, H = 220;
      if (!pRT) {
        pRT = new THREE.WebGLRenderTarget(W, H, { depthBuffer: true });
        pScene = new THREE.Scene();
        pScene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f98, 0.95));
        var sun = new THREE.DirectionalLight(0xffffff, 0.75); sun.position.set(2, 4, 5); pScene.add(sun);
        pCam = new THREE.PerspectiveCamera(27, W / H, 0.1, 50);
      }
      var m = FU.models.farmer({ colors: w.look }); m.rotation.y = 0.3;
      var ud = m.userData; if (ud.arms) { ud.arms[0].rotation.z = 0.12; ud.arms[1].rotation.z = -0.12; }
      pScene.add(m);
      pCam.position.set(0.7, 1.15, 4.4); pCam.lookAt(0, 0.93, 0);
      var oldT = R.getRenderTarget(), oldC = R.getClearColor(new THREE.Color()), oldA = R.getClearAlpha(), oldSh = R.shadowMap.enabled;
      R.shadowMap.enabled = false; R.setRenderTarget(pRT); R.setClearColor(0x000000, 0); R.clear(); R.render(pScene, pCam);
      var px = new Uint8Array(W * H * 4); R.readRenderTargetPixels(pRT, 0, 0, W, H, px);
      R.setRenderTarget(oldT); R.setClearColor(oldC, oldA); R.shadowMap.enabled = oldSh;
      pScene.remove(m);
      var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      var cx = cv.getContext('2d'), img = cx.createImageData(W, H);
      for (var y = 0; y < H; y++) img.data.set(px.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
      cx.putImageData(img, 0, 0); url = cv.toDataURL();
    } catch (e) { console.error('[FU] worker portrait', e); }
    return (pCache[w.id] = url);
  }
  // the hire wheel: cards scroll sideways, the one in the middle is shown biggest
  function wheelFx() {
    var wh = panel && panel.querySelector('.wk-wheel'); if (!wh) return;
    var mid = wh.scrollLeft + wh.clientWidth / 2, cards = wh.children;
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i], d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid), k = Math.min(1, d / (wh.clientWidth * 0.6));
      c.style.transform = 'scale(' + (1 - 0.2 * k).toFixed(3) + ')'; c.style.opacity = (1 - 0.45 * k).toFixed(2);
    }
  }

  function upCost(v) { var L = lvl(v); return L >= 3 ? 0 : Math.round(v.def.price * UPG().cost[L + 1] / 100) * 100; }
  function css() {
    var st = document.createElement('style');
    st.textContent = '#fu-workers{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(860px,96vw);max-height:88vh;display:flex;flex-direction:column;z-index:20;pointer-events:auto;padding:0;overflow:hidden}' +
      '#fu-workers.hid{display:none}#fu-workers .wk-head{display:flex;align-items:center;gap:12px;padding:14px 18px 8px}#fu-workers .wk-head h2{margin:0;font-size:22px}' +
      '#fu-workers .wk-money{margin-left:auto;color:#ffd54f;font-weight:800;font-size:18px}#fu-workers .wk-x{background:none;border:0;color:#fff;font-size:26px;cursor:pointer}' +
      '#fu-workers .wk-tabs{display:flex;gap:4px;padding:0 18px;border-bottom:1px solid rgba(255,255,255,.12)}' +
      '#fu-workers .wk-tab{background:none;border:0;color:#b0bec5;font:700 14px system-ui;padding:9px 12px;cursor:pointer;border-bottom:3px solid transparent}#fu-workers .wk-tab.on{color:#fff;border-bottom-color:#66bb6a}' +
      '#fu-workers .wk-body{overflow:auto;padding:12px 18px 18px}#fu-workers .wk-note{font-size:12.5px;color:#a5d6a7;margin:0 0 10px}' +
      '#fu-workers .wk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}' +
      '#fu-workers .wk-card{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:11px 12px;display:flex;flex-direction:column;gap:6px}' +
      '#fu-workers .wk-card.busy{border-color:rgba(102,187,106,.6)}#fu-workers .wk-top{display:flex;align-items:center;gap:10px}' +
      '#fu-workers .wk-face{font-size:30px;line-height:1}#fu-workers .wk-name{font:800 15px system-ui}#fu-workers .wk-stars{color:#ffd54f;letter-spacing:1px;font-size:16px}' +
      '#fu-workers .wk-line{font-size:12.5px;color:#cfd8dc}#fu-workers .wk-line b{color:#fff}' +
      '#fu-workers select{background:#1b2a1f;color:#fff;border:1px solid #4caf50;border-radius:6px;padding:4px;font:12.5px system-ui;max-width:100%}' +
      '#fu-workers .wk-bar{height:7px;border-radius:4px;background:rgba(255,255,255,.12);overflow:hidden}#fu-workers .wk-bar i{display:block;height:100%;background:#66bb6a}' +
      '#fu-workers .wk-btns{display:flex;gap:6px;flex-wrap:wrap}#fu-workers .wk-btns .fu-btn{padding:5px 10px;font-size:12.5px}' +
      '#fu-workers .wk-wheelbox{position:relative;margin:4px -6px 0}#fu-workers .wk-wheel{display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;padding:10px 40% 16px;scroll-behavior:smooth;scrollbar-width:thin}' +
      '#fu-workers .wk-pcard{flex:0 0 190px;scroll-snap-align:center;border:5px solid #1f5fbf;border-radius:16px;overflow:hidden;background:#0f2f63;display:flex;flex-direction:column;transition:transform .15s,opacity .15s;box-shadow:0 8px 20px rgba(0,0,0,.45)}' +
      '#fu-workers .wk-pimg{position:relative;height:220px;background:linear-gradient(180deg,#f4f7fb,#cfd9e6)}#fu-workers .wk-pimg img{width:100%;height:100%;object-fit:contain;display:block}' +
      '#fu-workers .wk-pname{position:absolute;left:8px;top:6px;font:900 17px system-ui;color:#fff;text-shadow:-2px -2px 0 #000,2px -2px 0 #000,-2px 2px 0 #000,2px 2px 0 #000}' +
      '#fu-workers .wk-pstars{position:absolute;left:8px;top:28px;font-size:15px;color:#ffd54f;letter-spacing:1px;text-shadow:-1px -1px 0 #5d4037,1px 1px 0 #5d4037}' +
      '#fu-workers .wk-pfoot{padding:8px 10px 10px;color:#fff;display:flex;flex-direction:column;gap:6px;align-items:stretch}' +
      '#fu-workers .wk-pfoot .wk-rate{font:900 18px system-ui;text-shadow:0 2px 0 #000}#fu-workers .wk-pfoot .wk-rate small{font-size:12px;font-weight:700;opacity:.85}' +
      '#fu-workers .wk-pfoot .wk-sub{font-size:11.5px;color:#bbdefb}#fu-workers .wk-pfoot .fu-btn{width:100%;padding:7px 8px;font-weight:800}' +
      '#fu-workers .wk-arrow{position:absolute;top:50%;transform:translateY(-50%);z-index:2;width:38px;height:38px;border-radius:50%;border:0;background:rgba(31,95,191,.9);color:#fff;font:900 22px system-ui;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,.4)}' +
      '#fu-workers .wk-arrow.l{left:6px}#fu-workers .wk-arrow.r{right:6px}#fu-workers .wk-mini{width:46px;height:56px;border-radius:8px;background:linear-gradient(180deg,#f4f7fb,#cfd9e6);object-fit:contain}' +
      '#fu-workers .wk-pstars span.off{color:#9aa5b1;text-shadow:none}#fu-workers .wk-wheel.still .wk-pcard{transition:none}' +
      '#fu-workers .wk-pcard.staff{flex-basis:216px}#fu-workers .wk-pcard.staff .wk-pimg{height:178px}#fu-workers .wk-pcard.busy{border-color:#2e9d4a}' +
      '#fu-workers .wk-badge{position:absolute;right:8px;top:8px;font:900 11px system-ui;letter-spacing:.5px;padding:3px 8px;border-radius:10px;background:#607d8b;color:#fff;box-shadow:0 2px 0 rgba(0,0,0,.35)}' +
      '#fu-workers .wk-badge.on{background:#2e9d4a}#fu-workers .wk-badge.wait{background:#ef8f00}#fu-workers .wk-badge.duty{background:#1e88e5}' +
      '#fu-workers .wk-pfoot select{width:100%;background:#0b2550;color:#fff;border:1px solid #5d8fe0;border-radius:7px;padding:5px;font:12px system-ui}' +
      '#fu-workers .wk-pfoot .wk-job{font:800 13px system-ui}#fu-workers .wk-pfoot .wk-bar{background:rgba(255,255,255,.18)}#fu-workers .wk-pfoot .wk-bar i{background:#66bb6a}' +
      '#fu-workers .wk-pfoot .wk-warn{font-size:11.5px;color:#ffcc80}#fu-workers .wk-row2{display:flex;gap:6px}#fu-workers .wk-row2 .fu-btn{flex:1;width:auto;padding:5px 6px;font-size:12px;font-weight:700}' +
      '#fu-workers .wk-empty{padding:26px 10px;text-align:center;color:#cfd8dc}' +
      '#fu-workers .wk-lvl{display:inline-flex;gap:3px}#fu-workers .wk-lvl i{width:16px;height:6px;border-radius:3px;background:rgba(255,255,255,.18)}#fu-workers .wk-lvl i.on{background:#4fc3f7}';
    document.head.appendChild(st);
  }
  function build() {
    css();
    panel = document.createElement('div'); panel.id = 'fu-workers'; panel.className = 'fu-panel hid fu-interactive';
    panel.innerHTML = '<div class="wk-head"><h2>👷 Hiring office</h2><span class="wk-money"></span><button class="wk-x" data-w="close">×</button></div>' +
      '<div class="wk-tabs"><button class="wk-tab" data-t="staff">Your staff</button><button class="wk-tab" data-t="hire">Hire people</button><button class="wk-tab" data-t="machines">Machines</button></div><div class="wk-body"></div>';
    G.ui.appendChild(panel);
    panel.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-w],[data-t]'); if (!b || b.disabled) return;
      var t = b.getAttribute('data-t'); if (t) { tab = t; armedFire = null; paint(true); return; }
      var a = b.getAttribute('data-w'), id = b.getAttribute('data-id');
      if (a === 'close') close();
      else if (a === 'take') takeOn(id);
      else if (a === 'wl' || a === 'wr') { var wh = panel.querySelector('.wk-wheel'); if (wh) wh.scrollBy({ left: (a === 'wl' ? -1 : 1) * 204, behavior: 'smooth' }); }
      else if (a === 'train') train(id);
      else if (a === 'fire') letGo(id);
      else if (a === 'home') { var hw = staffById(id), hf = hw && hw.assign && FU.fields.byId(hw.assign.f); if (hw) unassign(hw, hw.name + ' stopped farming ' + (hf ? hf.name : 'the field')); }
      else if (a === 'start') { var sw = staffById(id), pk = pick[id] || {}; if (sw) assign(sw, FU.fields.byId(+pk.f), +pk.c || 1); }
      else if (a === 'upg') upgrade(FU.vehicles.byId(id));
    });
    panel.addEventListener('change', function (e) {
      var t = e.target, id = t.getAttribute('data-id'), k = t.getAttribute('data-k'); if (!id || !k) return;
      var w = staffById(id);
      if (w && w.assign && k === 'c') { // what they sow from now on (the sowing going on right now too)
        w.assign.crop = +t.value; var j = jobOf(w); if (j && j.op === 'seed' && j.tool.imp) j.tool.imp.seedCrop = +t.value;
        G.notify(w.name + ' will sow ' + cropName(+t.value) + ' from now on', 'info'); return;
      }
      pick[id] = pick[id] || {}; pick[id][k] = t.value;
      if (k === 'f') paint(true); // the price line and the crop list depend on the field
    });
    panel.addEventListener('keydown', function (e) { e.stopPropagation(); });
    panel.addEventListener('wheel', function (e) {
      var wh = e.target.closest && e.target.closest('.wk-wheel'); if (!wh) return;
      e.preventDefault(); wh.scrollLeft += (Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX);
    }, { passive: false });
    panel.addEventListener('scroll', function (e) { if (e.target.classList && e.target.classList.contains('wk-wheel')) wheelFx(); }, true);
  }
  function takeOn(id) { // hire a candidate onto your staff
    var c = cands.filter(function (x) { return x.id === id; })[0]; if (!c) return;
    if (staff.length >= MAX_STAFF) { G.notify('Your staff is full (' + MAX_STAFF + '): let someone go first', 'bad'); return; }
    if (!G.spend(STAR.fee[c.stars], 'hiring ' + c.name)) return;
    cands = cands.filter(function (x) { return x !== c; }); staff.push(c);
    G.notify(c.face + ' ' + c.name + ' (' + c.stars + '★) joined your farm! Give them a field in Your staff.', 'good');
    try { if (FU.audio) FU.audio.play('buy'); } catch (e) {}
    tab = 'staff'; paint(true);
  }
  function train(id) {
    var w = staff.filter(function (x) { return x.id === id; })[0]; if (!w || w.stars >= 5) return;
    if (!G.spend(STAR.train[w.stars], 'training ' + w.name)) return;
    w.stars++; G.notify(w.face + ' ' + w.name + ' trained up to ' + w.stars + '★: faster, and charges ' + money(STAR.rate[w.stars]) + '/ha per job now', 'good');
    try { if (FU.audio) FU.audio.play('buy'); } catch (e) {}
    paint(true);
  }
  function letGo(id) {
    var w = staff.filter(function (x) { return x.id === id; })[0]; if (!w) return;
    if (armedFire !== id) { armedFire = id; paint(true); return; }
    armedFire = null; var back = w.assign || jobOf(w) ? unassign(w) : 0;
    staff = staff.filter(function (x) { return x !== w; });
    G.notify(w.name + ' left your farm' + (back > 0 ? ' (' + money(back) + ' back for the unfinished job)' : ''), 'info'); paint(true);
  }
  function upgrade(v) {
    if (!v || lvl(v) >= 3) return;
    var cost = upCost(v);
    if (!G.spend(cost, v.def.name + ' upgrade')) return;
    v.upg = lvl(v) + 1;
    G.notify('🔧 ' + v.def.name + ' upgraded to ' + UPG().names[v.upg] + ': works ' + Math.round((UPG().work[v.upg] - 1) * 100) + '% faster, workers up to ' + UPG().cap[v.upg] + '× speed', 'good');
    try { if (FU.audio) FU.audio.play('buy'); } catch (e) {}
    paint(true);
  }
  function lvlBar(L) { var h = '<span class="wk-lvl">'; for (var i = 1; i <= 3; i++) h += '<i class="' + (i <= L ? 'on' : '') + '"></i>'; return h + '</span>'; }
  function fieldInfo(f) { // a field's state in a few words
    var st = FU.fields.stats(f), T = st.total || 1, Gr = (st.growing || 0) / T, Rp = (st.ripe || 0) / T;
    if (Rp >= 0.5 && Gr < 0.1) return 'ripe';
    if (Gr + Rp >= 0.3) return 'growing, ' + Math.round(Rp / (Rp + Gr) * 100) + '% ripe';
    if ((st.cultivated || 0) / T >= 0.5) return 'ready to sow';
    return 'needs tilling';
  }
  function cropSel(w, cur) {
    return '<select data-id="' + w.id + '" data-k="c">' + cropList().map(function (c) { return '<option value="' + c.id + '"' + (String(c.id) === String(cur) ? ' selected' : '') + '>Sow ' + esc(c.name) + '</option>'; }).join('') + '</select>';
  }
  function staffTab() {
    var h = '<p class="wk-note">Your workers (' + staff.length + ' / ' + MAX_STAFF + '). Give each one a field and they keep it farmed nonstop: harvest, till, sow, wait for it to grow, and again. ' +
      'They take whichever of your machines is free and hitch the tools themselves. You pay per job, by field size. A machine too slow for the worker makes jobs cost more (Machines tab).</p>';
    if (!staff.length) return h + '<div class="wk-empty">You have no workers yet.<br><br><button class="fu-btn" data-t="hire">Hire people</button></div>';
    var fl = myFields(), taken = {};
    staff.forEach(function (x) { if (x.assign) taken[String(x.assign.f)] = 1; });
    lastSig = {};
    h += '<div class="wk-wheelbox"><button class="wk-arrow l" data-w="wl">‹</button><div class="wk-wheel">';
    staff.forEach(function (w) {
      var j = jobOf(w), a = w.assign, s = statusOf(w), foot = '';
      lastSig[w.id] = sigOf(w);
      if (a) {
        var f = FU.fields.byId(a.f), isJob = !!(f && f.contract && !f.owned);
        foot = '<div class="wk-job">🌾 ' + esc(f ? f.name : 'Field') + (isJob ? ' (job)' : '') + '</div>' +
          '<div class="wk-sub" data-st="' + w.id + '">' + esc(s.txt) + '</div>' +
          (j ? '<div class="wk-bar"><i data-bar="' + w.id + '" style="width:' + Math.round(s.p * 100) + '%"></i></div>' +
            '<div class="wk-sub">' + esc(j.v.def.name) + ' (' + UPG().names[lvl(j.v)] + ') · job ' + money(j.price) + '</div>' +
            (slowF(w, j.v) > 1.001 ? '<div class="wk-warn">This machine is too slow for them, so jobs cost ×' + slowF(w, j.v).toFixed(2) + ': upgrade it</div>' : '') : '') +
          (isJob ? '' : cropSel(w, a.crop)) +
          '<button class="fu-btn danger" data-w="home" data-id="' + w.id + '">Stop farming</button>';
      } else {
        var opts = fl.filter(function (f2) { return !taken[String(f2.id)]; });
        if (!fl.length) foot = '<div class="wk-sub">You need a field first (shop → Fields, or a job with J).</div>';
        else if (!opts.length) foot = '<div class="wk-sub">All your fields have a worker. Buy another field to give ' + esc(w.name) + ' work.</div>';
        else {
          var pk = pick[w.id] = pick[w.id] || {};
          if (!pk.f || !opts.some(function (f2) { return String(f2.id) === String(pk.f); })) pk.f = String(opts[0].id);
          var sf = FU.fields.byId(+pk.f), sJob = !!(sf && sf.contract && !sf.owned);
          foot = '<select data-id="' + w.id + '" data-k="f">' + opts.map(function (f2) {
            return '<option value="' + f2.id + '"' + (String(f2.id) === pk.f ? ' selected' : '') + '>🌾 ' + esc(f2.name) + (f2.contract && !f2.owned ? ' (job)' : '') + ' · ' + fieldInfo(f2) + '</option>';
          }).join('') + '</select>' +
            (sJob ? '' : cropSel(w, pk.c || 1)) +
            '<div class="wk-sub">' + ha(sf).toFixed(2) + ' ha · ' + money(jobPrice(w, 'seed', sf, null, 1)) + ' to till or sow, ' + money(jobPrice(w, 'harvest', sf, null, 1)) + ' to harvest</div>' +
            '<button class="fu-btn" data-w="start" data-id="' + w.id + '">Start farming</button>';
        }
      }
      var bd = j ? ' on">WORKING' : !a ? '">IDLE' : (s.k === 'money' || s.k === 'need') ? ' wait">WAITING' : ' duty">ON DUTY';
      h += '<div class="wk-pcard staff' + (j ? ' busy' : '') + '"><div class="wk-pimg"><img alt="" src="' + portrait(w) + '"><div class="wk-pname">' + esc(w.name) + '</div>' +
        '<div class="wk-pstars">' + starsHtml(w.stars) + '</div><div class="wk-badge' + bd + '</div></div>' +
        '<div class="wk-pfoot"><div class="wk-rate">' + money(STAR.rate[w.stars]) + '<small> / ha per job</small></div>' + foot +
        '<div class="wk-row2">' + (w.stars < 5 ? '<button class="fu-btn secondary" data-w="train" data-id="' + w.id + '"' + (G.money < STAR.train[w.stars] ? ' disabled' : '') + '>Train to ' + (w.stars + 1) + '★ · ' + money(STAR.train[w.stars]) + '</button>'
          : '<button class="fu-btn secondary" disabled>Top skill ★</button>') +
        '<button class="fu-btn ' + (armedFire === w.id ? 'danger' : 'secondary') + '" data-w="fire" data-id="' + w.id + '">' + (armedFire === w.id ? 'Sure?' : 'Let go') + '</button></div></div></div>';
    });
    return h + '</div><button class="wk-arrow r" data-w="wr">›</button></div>';
  }
  function hireTab() {
    var h = '<p class="wk-note">Scroll through the people looking for work (mouse wheel or arrows). Buy once to hire them; after that they charge per job, by the size of the field (harvesting is 1.5×). New people every morning · your staff ' + staff.length + ' / ' + MAX_STAFF + '.</p>';
    if (!cands.length) return h + '<div class="wk-line">Nobody is looking for work today. Check again tomorrow.</div>';
    h += '<div class="wk-wheelbox"><button class="wk-arrow l" data-w="wl">‹</button><div class="wk-wheel">';
    cands.forEach(function (c) {
      var full = STAR.speed[c.stars] <= 1 ? 0 : STAR.speed[c.stars] <= 1.25 ? 1 : STAR.speed[c.stars] <= 1.5 ? 2 : 3, can = G.money >= STAR.fee[c.stars] && staff.length < MAX_STAFF;
      h += '<div class="wk-pcard"><div class="wk-pimg"><img alt="" src="' + portrait(c) + '"><div class="wk-pname">' + esc(c.name) + '</div><div class="wk-pstars">' + starsHtml(c.stars) + '</div></div>' +
        '<div class="wk-pfoot"><div class="wk-rate">' + money(STAR.rate[c.stars]) + '<small> / ha per job</small></div>' +
        '<div class="wk-sub">Speed ×' + STAR.speed[c.stars] + ' · best in a ' + UPG().names[full] + ' machine or better</div>' +
        '<button class="fu-btn" data-w="take" data-id="' + c.id + '"' + (can ? '' : ' disabled') + '>Buy · ' + money(STAR.fee[c.stars]) + '</button></div></div>';
    });
    return h + '</div><button class="wk-arrow r" data-w="wr">›</button></div>';
  }
  function machinesTab() {
    var ms = machines();
    var h = '<p class="wk-note">Upgrades make a machine work and drive faster for everyone, and decide how fast a hired worker may push it. ' +
      'A great worker in a machine that is too slow for them takes longer, so every job costs more; in an Elite machine they work at full speed for their normal price.</p><div class="wk-grid">';
    if (!ms.length) h += '<div class="wk-line">You have no tractors or combines.</div>';
    ms.forEach(function (v) {
      var L = lvl(v), U2 = UPG(), cost = upCost(v);
      h += '<div class="wk-card"><div class="wk-name">' + esc(v.def.name) + '</div>' +
        '<div class="wk-line">' + lvlBar(L) + ' <b>' + U2.names[L] + '</b> · work &amp; top speed <b>×' + U2.work[L] + '</b> · workers up to <b>×' + U2.cap[L] + '</b></div>' +
        (busy(v) ? '<div class="wk-line">In use by ' + esc(busy(v).w.name) + '</div>' : '') +
        (L < 3 ? '<div class="wk-line">Next: <b>' + U2.names[L + 1] + '</b> (×' + U2.work[L + 1] + ', workers ×' + U2.cap[L + 1] + ')</div><div class="wk-btns"><button class="fu-btn" data-w="upg" data-id="' + v.id + '"' + (G.money < cost ? ' disabled' : '') + '>Upgrade · ' + money(cost) + '</button></div>'
          : '<div class="wk-line" style="color:#4fc3f7">Fully upgraded</div>') + '</div>';
    });
    return h + '</div>';
  }
  // refresh money and the cards in place (rebuilding them every second made them pulse); redraw only when a state changes
  function live() {
    if (!isOpen || !panel) return;
    panel.querySelector('.wk-money').textContent = money(G.money);
    if (tab !== 'staff') return;
    for (var i = 0; i < staff.length; i++) {
      var w = staff[i];
      if (lastSig[w.id] !== sigOf(w)) { paint(); return; } // (paint leaves an open list alone)
      var s = statusOf(w), st = panel.querySelector('[data-st="' + w.id + '"]'), bar = panel.querySelector('[data-bar="' + w.id + '"]');
      if (st && st.textContent !== s.txt) st.textContent = s.txt;
      if (bar && s.p >= 0) bar.style.width = Math.round(s.p * 100) + '%';
    }
  }
  function paint(force) {
    if (!isOpen || !panel) return;
    var ae = document.activeElement;
    if (!force && ae && panel.contains(ae) && ae.tagName === 'SELECT') return; // don't close a list someone is picking from
    panel.querySelector('.wk-money').textContent = money(G.money);
    var tabs = panel.querySelectorAll('.wk-tab');
    for (var i = 0; i < tabs.length; i++) tabs[i].className = 'wk-tab' + (tabs[i].getAttribute('data-t') === tab ? ' on' : '');
    var body = panel.querySelector('.wk-body'), sc = body.scrollTop;
    var wh0 = body.querySelector('.wk-wheel'), wsc = wh0 ? wh0.scrollLeft : null;
    body.innerHTML = tab === 'hire' ? hireTab() : tab === 'machines' ? machinesTab() : staffTab();
    body.scrollTop = sc;
    var wh1 = body.querySelector('.wk-wheel');
    if (wh1) {
      wh1.classList.add('still'); wh1.style.scrollBehavior = 'auto'; wh1.scrollLeft = wsc != null ? wsc : 0; wh1.style.scrollBehavior = ''; wheelFx();
      setTimeout(function () { wh1.classList.remove('still'); }, 50);
    }
  }
  function open() {
    var why = noWorkersHere(); if (why) { G.notify(why, 'bad'); return; }
    if (!panel) build();
    if (!cands.length && !staff.length) freshCands();
    G.panels.slice().forEach(function (p) { if (p.name !== 'workers') { G.closePanel(p.name); try { if (p.close) p.close(); } catch (e) {} } });
    if (!staff.length) tab = 'hire';
    isOpen = true; panel.className = 'fu-panel fu-interactive'; G.openPanel('workers', hide); paint(true);
  }
  function hide() { isOpen = false; if (panel) panel.className = 'fu-panel hid fu-interactive'; }
  function close() { G.closePanel('workers'); hide(); }
  function paintBox() {
    var col = FU.hud && FU.hud.rightColumn;
    if (!box && col) { box = document.createElement('div'); box.className = 'fu-box fu-interactive'; box.style.fontSize = '13px'; box.style.cursor = 'pointer'; box.title = 'Workers (K)'; box.addEventListener('click', open); col.appendChild(box); }
    if (!box) return;
    var on = staff.filter(function (w) { return w.assign; });
    if (!on.length || !G.started || online()) { box.style.display = 'none'; return; }
    box.style.display = '';
    box.innerHTML = on.map(function (w) {
      var s = statusOf(w), c = s.k === 'work' ? '#a5d6a7' : s.k === 'money' || s.k === 'need' ? '#ffcc80' : '#cfd8dc';
      return w.face + ' <b>' + esc(w.name) + '</b> <span style="color:#ffd54f">' + stars(w.stars) + '</span><br><span class="fu-small" style="color:' + c + '">' + esc(s.txt) + '</span>';
    }).join('<hr style="border:0;border-top:1px solid rgba(255,255,255,.15);margin:5px 0">');
  }

  FU.workers = { list: function () { return jobs.slice(); }, assign: assign, unassign: unassign, status: statusOf, open: open, close: close, STAR: STAR,
    staff: function () { return staff; }, candidates: function () { return cands; }, takeOn: takeOn, train: train, upgrade: upgrade,
    serialize: function () { return { staff: staff, cands: cands, nid: nid }; },
    deserialize: function (d) {
      staff = (d && Array.isArray(d.staff)) ? d.staff.filter(function (w) { return w && w.id && w.stars >= 1 && w.stars <= 5; }) : [];
      staff.forEach(function (w) { if (!w.assign || typeof w.assign !== 'object' || w.assign.f == null) w.assign = null; });
      cands = (d && Array.isArray(d.cands)) ? d.cands : []; nid = Math.max(nid, (d && d.nid) || 1); if (!cands.length) freshCands();
    } };

  FU.register({
    name: 'workers', order: 29, ui: false, // before vehicles (30) so the steering is used the same frame
    init: function (g) {
      G = g; build();
      g.on('enterVehicle', function (e) { // you take over: that step ends (unfinished part paid back), the worker keeps the field
        var j = busy(e && e.vehicle); if (!j) return;
        cancel(j, '👷 You took over from ' + j.w.name + ' on ' + j.f.name + '. They carry on with another free machine, or this one when you get out');
        R(j.w).t = 8;
      });
      g.on('newGame', function () { jobs.slice().forEach(endJob); staff = []; rt = {}; freshCands(); });
      g.on('newDay', function () { freshCands(); if (isOpen) paint(true); });
      g.on('gameLoaded', function () { jobs.slice().forEach(endJob); rt = {}; }); // machines were reloaded: workers pick their fields up again by themselves
      g.on('netStatus', function () { if (online() && jobs.length) { jobs.slice().forEach(endJob); G.notify('Workers went home (they only work in solo games)'); } });
    },
    update: function (dt, g) {
      if (!g.started) return;
      // K anywhere: open / close the Workers menu
      if (g.input.pressed(KEY)) { if (isOpen) close(); else if (!g.input.blocked) open(); }
      if (isOpen && !g.isPanelOpen('workers')) hide();
      if (isOpen) { paintT -= dt; if (paintT <= 0) { paintT = 1; live(); } }
      var v = g.activeVehicle;
      if (v && !g.input.blocked && !busy(v) && toolOf(v) && fieldFor(v) && !online()) g.prompt('[K] Hiring office: workers & machine upgrades');
      var vl = (FU.vehicles && FU.vehicles.list) || [];
      for (var m = 0; m < vl.length; m++) { var vv = vl[m], jj = busy(vv); vv.workMult = UPG().work[lvl(vv)] * (jj ? skillMult(jj.w, vv) : 1); }
      boxT -= dt; if (boxT <= 0) { boxT = 0.5; paintBox(); }
      if (g.paused) return;
      if (!online()) for (var pass = 0; pass < 2; pass++) for (var s = 0; s < staff.length; s++) { // between steps: what's next? (an already-paid, unfinished job gets the machines first)
        var sw = staff[s]; if (sw.assign && !jobOf(sw) && !!sw.assign.job === (pass === 0)) tick(sw, dt);
      }
      for (var i = jobs.length - 1; i >= 0; i--) {
        var j = jobs[i]; if (!j) continue;
        if (!j.v || (FU.vehicles && FU.vehicles.list.indexOf(j.v) < 0)) { jobs.splice(i, 1); continue; } // the machine was sold
        if (!(j.f.owned || j.f.contract)) { finish(j); continue; } // field sold, or the contract job is done
        var ff = Math.max(1, Math.round((g.time && g.time.scale) || 1)); // fast-forward: workers keep up with time
        drive(j, dt);
        for (var k = 1; k < ff && jobs.indexOf(j) >= 0; k++) { // the frame's normal step happens in vehicles / implements / harvest
          FU.vehicles.stepOne(j.v, dt);
          if (j.tool.imp) FU.implements.simulate(j.tool.imp, j.v, dt); else if (FU.harvest.stepCombine) FU.harvest.stepCombine(j.v, dt);
          drive(j, dt);
        }
      }
    }
  });
})();
