// Farming Unblocked — workers: a hiring office (K, anywhere). Hire people rated 1-5★: more stars = faster work,
// a higher wage per minute and a bigger signing fee. Send your staff to work (machine + field), train them (+1★),
// and upgrade machines (Stock / Tuned / Pro / Elite, vehicles.js UPG): upgrades make machines faster for everyone and
// set how fast a worker may push them — a 5★ worker in a Stock machine works no faster than a 3★ one but costs far
// more, so good workers need good machines. Wages are paid per minute while working. A combine worker sells full
// tanks itself (10% fee). Get in a machine to take over. Solo games only (not the 🌎 Main Server, not co-op yet).
(function () {
  'use strict';
  var FU = window.FU = window.FU || {};
  var FEE = 0.1, KEY = 'KeyK', MAX_STAFF = 8;
  var STAR = { speed: [0, 0.8, 0.95, 1.15, 1.4, 1.7], wage: [0, 60, 110, 180, 280, 420], fee: [0, 1000, 3000, 7500, 15000, 30000], train: [0, 4000, 9000, 16000, 26000, 0] };
  var NAMES = ['Maya', 'Leo', 'Priya', 'Sam', 'Jonas', 'Aiko', 'Diego', 'Fatima', 'Noah', 'Zara', 'Eli', 'Mateo', 'Grace', 'Omar', 'Lily', 'Ravi',
    'Ivy', 'Theo', 'Nia', 'Hugo', 'Rosa', 'Kai', 'Lena', 'Tariq', 'Ben', 'Chloe', 'Arjun', 'Sofia', 'Malik', 'Hana', 'Felix', 'June'];
  var FACES = ['👩‍🌾', '👨‍🌾', '🧑‍🌾'];
  var LOOK = { skin: [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac, 0xa86b3c], shirt: [0xb7412e, 0x1e88e5, 0x43a047, 0xfdd835, 0x8e24aa, 0xff7043, 0x546e7a, 0xd81b60],
    denim: [0x35588f, 0x2e3b4e, 0x5d4037, 0x455a64, 0x1b5e20], cap: [0x2f7a3a, 0xc62828, 0x1565c0, 0xf9a825, 0x424242, 0x6a1b9a] };
  function pickOf(a) { return a[(Math.random() * a.length) | 0]; }
  function newLook() { return { skin: pickOf(LOOK.skin), shirt: pickOf(LOOK.shirt), denim: pickOf(LOOK.denim), cap: pickOf(LOOK.cap) }; }
  var WAGE = STAR.wage[3]; // (older code paths)
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

  function noWorkersHere() {
    if (!online()) return '';
    return FU.town && FU.town.main ? 'Workers are not available on the Main Server' : 'Workers only work in solo games for now';
  }
  function hireFor(v, f, w) {
    var tool = toolOf(v), why = noWorkersHere();
    if (!w) { w = staff.filter(function (x) { return !jobOf(x); })[0]; if (!w) { G.notify('Hire a worker first (K → Hire people)', 'bad'); return false; } }
    if (jobOf(w)) { G.notify(w.name + ' is already working', 'bad'); return false; }
    if (why) { G.notify(why, 'bad'); return false; }
    if (!v || !tool) { G.notify('That machine has nothing to work with: attach a cultivator or seed drill', 'bad'); return false; }
    if (!f || !(f.owned || f.contract)) { G.notify('Pick a field you own or have a job on', 'bad'); return false; }
    if (busy(v)) { G.notify('That machine already has a worker', 'bad'); return false; }
    if (G.money < STAR.wage[w.stars] / 4) { G.notify('Not enough money to pay ' + w.name, 'bad'); return false; }
    var pts = plan(v, f, tool); if (pts.length < 2) { G.notify(f.name + ' is too small for that machine', 'bad'); return false; }
    if (G.activeVehicle === v) { try { FU.player.exit(); } catch (e) { G.activeVehicle = null; } }
    var dx = Math.max(Math.abs(v.x - f.x) - f.w / 2, 0), dz = Math.max(Math.abs(v.z - f.z) - f.d / 2, 0);
    if (Math.sqrt(dx * dx + dz * dz) > 25) { // the worker brings the machine over to the corner where the work starts
      var p0 = pts[0], p1 = pts[1], h = Math.atan2(p1.x - p0.x, p1.z - p0.z), fw = U().fwd(h);
      v.x = p0.x; v.z = p0.z; v.heading = h; v.speed = 0; v.steer = 0;
      if (tool.imp) { tool.imp.x = v.x - fw.x * 5; tool.imp.z = v.z - fw.z * 5; tool.imp.heading = h; }
    }
    var job = { v: v, f: f, w: w, tool: tool, pts: pts, i: 0, stuck: 0, back: 0, unsticks: 0, paid: 0, sold: 0, t: 0, second: false };
    jobs.push(job);
    v.ai = { gas: 0, brake: 0, steer: 0 };
    G.notify(w.face + ' ' + w.name + ' (' + w.stars + '★) is ' + opName(tool.op) + ' ' + f.name + ' with the ' + v.def.name + ' (' + money(STAR.wage[w.stars]) + '/min).', 'good');
    try { if (FU.audio) FU.audio.play('click'); } catch (e) {}
    paint(true);
    return true;
  }
  function hire() { var v = G.activeVehicle; return hireFor(v, v && fieldFor(v)); }
  function stop(job, why, kind) {
    var i = jobs.indexOf(job); if (i < 0) return;
    jobs.splice(i, 1);
    var v = job.v; v.ai = null; v.working = false; if (job.tool.imp) job.tool.imp.lowered = false;
    if (why) G.notify(why, kind || 'info');
    paint(true);
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
    G.notify(job.w.face + ' ' + job.w.name + ' sold ' + Math.round(l).toLocaleString('en-US') + ' L ' + (crop ? crop.name : 'grain') + ' for ' + money(net) + ' (10% delivery fee)', 'good');
  }
  function drive(job, dt) {
    var v = job.v, pts = job.pts, p = pts[job.i], U2 = U();
    if (!p) {
      if (!job.second && progress(job) < 0.97) { job.second = true; job.pts = plan(v, job.f, job.tool, true); job.i = 0; return; } // go over the gaps once more
      stop(job, job.w.face + ' ' + job.w.name + ' finished ' + job.f.name + '! (' + Math.round(progress(job) * 100) + '% done, paid ' + money(job.paid) + (job.sold ? ', grain sold ' + money(job.sold) : '') + ')', 'good'); return;
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
        if (job.unsticks > 12) stop(job, '👷 The worker got stuck near ' + job.f.name + ' and stopped. Drive it free and hire again.', 'bad');
      }
    } else job.stuck = 0;
    if (v.def.kind === 'combine' && v.cargo && v.cargo.capacity && v.cargo.liters >= v.cargo.capacity - 1) sellTank(job);
  }


  // ---------- the hiring office (K, anywhere): Staff / Hire people / Machines ----------
  function cropList() { return (FU.crops && FU.crops.types) || []; }
  function need(f, op) { // how much of the field this job would still do (0..1)
    var st = FU.fields && FU.fields.stats ? FU.fields.stats(f) : null; if (!st || !st.total) return 0;
    if (op === 'harvest') return (st.ripe || 0) / st.total;
    if (op === 'seed') return (st.cultivated || 0) / st.total;
    return ((st.grass || 0) + (st.stubble || 0)) / st.total;
  }
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
      '#fu-workers .wk-badge.on{background:#2e9d4a}' +
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
      else if (a === 'home') { var j = jobs.filter(function (x) { return x.w.id === id; })[0]; if (j) stop(j, j.w.name + ' stopped working on ' + j.f.name + ' (paid ' + money(j.paid) + ')'); }
      else if (a === 'start') {
        var pk = pick[id] || {}, v = FU.vehicles.byId(pk.m), f = FU.fields.byId(+pk.f), w = staff.filter(function (x) { return x.id === id; })[0];
        var tl = toolOf(v); if (tl && tl.imp && tl.op === 'seed' && pk.c) tl.imp.seedCrop = +pk.c;
        if (!v) G.notify('Pick a machine first', 'bad'); else hireFor(v, f, w);
      } else if (a === 'upg') upgrade(FU.vehicles.byId(id));
    });
    panel.addEventListener('change', function (e) {
      var t = e.target, id = t.getAttribute('data-id'), k = t.getAttribute('data-k'); if (!id || !k) return;
      pick[id] = pick[id] || {}; pick[id][k] = t.value;
      if (k === 'm') { pick[id].f = null; paint(true); } // fields depend on what the machine does
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
    G.notify(c.face + ' ' + c.name + ' (' + c.stars + '★) joined your farm! Send them to work in Your staff.', 'good');
    try { if (FU.audio) FU.audio.play('buy'); } catch (e) {}
    tab = 'staff'; paint(true);
  }
  function train(id) {
    var w = staff.filter(function (x) { return x.id === id; })[0]; if (!w || w.stars >= 5) return;
    if (!G.spend(STAR.train[w.stars], 'training ' + w.name)) return;
    w.stars++; G.notify(w.face + ' ' + w.name + ' trained up to ' + w.stars + '★: faster, and paid ' + money(STAR.wage[w.stars]) + '/min now', 'good');
    try { if (FU.audio) FU.audio.play('buy'); } catch (e) {}
    paint(true);
  }
  function letGo(id) {
    var w = staff.filter(function (x) { return x.id === id; })[0]; if (!w) return;
    if (armedFire !== id) { armedFire = id; paint(true); return; }
    armedFire = null; var j = jobOf(w); if (j) stop(j);
    staff = staff.filter(function (x) { return x !== w; });
    G.notify(w.name + ' left your farm', 'info'); paint(true);
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
  function staffTab() {
    var h = '<p class="wk-note">Your workers (' + staff.length + ' / ' + MAX_STAFF + '). Pick a machine and a field and press Start work: the worker brings the machine over. ' +
      'Wages are paid per minute only while they work, and a worker can only go as fast as the machine allows (Machines tab).</p>';
    if (!staff.length) return h + '<div class="wk-empty">You have no workers yet.<br><br><button class="fu-btn" data-t="hire">Hire people</button></div>';
    var fl = myFields(), free = machines().filter(function (v) { return !busy(v) && toolOf(v); });
    h += '<div class="wk-wheelbox"><button class="wk-arrow l" data-w="wl">‹</button><div class="wk-wheel">';
    staff.forEach(function (w) {
      var j = jobOf(w), foot = '';
      if (j) {
        var pc = Math.round(progress(j) * 100), sm = skillMult(w, j.v);
        foot = '<div class="wk-job">' + opName(j.tool.op).replace(/^./, function (c) { return c.toUpperCase(); }) + ' ' + esc(j.f.name) + '</div>' +
          '<div class="wk-sub">' + esc(j.v.def.name) + ' (' + UPG().names[lvl(j.v)] + ')</div>' +
          '<div class="wk-bar"><i data-bar="' + w.id + '" style="width:' + pc + '%"></i></div><div class="wk-sub" data-txt="' + w.id + '">' + pc + '% done · paid ' + money(j.paid) + (j.sold ? ' · sold ' + money(j.sold) : '') + '</div>' +
          (sm < STAR.speed[w.stars] ? '<div class="wk-warn">Slowed to ×' + sm + ' by the machine</div>' : '') +
          '<button class="fu-btn danger" data-w="home" data-id="' + w.id + '">Stop work</button>';
      } else if (!free.length) {
        foot = '<div class="wk-sub">No free machine: hook a cultivator or seed drill to a tractor (Q), or use a combine.</div>';
      } else if (!fl.length) {
        foot = '<div class="wk-sub">You need a field first (shop → Fields, or a job with J).</div>';
      } else {
        var pk = pick[w.id] = pick[w.id] || {};
        if (!pk.m || !free.some(function (v) { return v.id === pk.m; })) pk.m = free[0].id;
        var mv = FU.vehicles.byId(pk.m), tl = toolOf(mv), opts = fl.slice().sort(function (a2, b2) { return need(b2, tl.op) - need(a2, tl.op); });
        if (!pk.f || !opts.some(function (f) { return String(f.id) === String(pk.f); })) pk.f = String(opts[0].id);
        var sp = UPG().work[lvl(mv)] * skillMult(w, mv);
        foot = '<select data-id="' + w.id + '" data-k="m">' + free.map(function (v) { return '<option value="' + v.id + '"' + (v.id === pk.m ? ' selected' : '') + '>🚜 ' + esc(v.def.name) + ' (' + UPG().names[lvl(v)] + ')</option>'; }).join('') + '</select>' +
          '<select data-id="' + w.id + '" data-k="f">' + opts.map(function (f) {
            return '<option value="' + f.id + '"' + (String(f.id) === pk.f ? ' selected' : '') + '>🌾 ' + esc(f.name) + (f.contract ? ' (job)' : '') + ' · ' + Math.round(need(f, tl.op) * 100) + '% ' + (tl.op === 'harvest' ? 'ripe' : tl.op === 'seed' ? 'to sow' : 'to till') + '</option>';
          }).join('') + '</select>' +
          (tl.op === 'seed' ? '<select data-id="' + w.id + '" data-k="c">' + cropList().map(function (c) { return '<option value="' + c.id + '"' + (String(c.id) === String(pk.c || tl.imp.seedCrop) ? ' selected' : '') + '>Sow ' + esc(c.name) + '</option>'; }).join('') + '</select>' : '') +
          '<div class="wk-sub">' + opName(tl.op).replace(/^./, function (c) { return c.toUpperCase(); }) + ' at ×' + sp.toFixed(2) + ' speed</div>' +
          (skillMult(w, mv) < STAR.speed[w.stars] ? '<div class="wk-warn">This machine holds them back: upgrade it</div>' : '') +
          '<button class="fu-btn" data-w="start" data-id="' + w.id + '">Start work</button>';
      }
      h += '<div class="wk-pcard staff' + (j ? ' busy' : '') + '"><div class="wk-pimg"><img alt="" src="' + portrait(w) + '"><div class="wk-pname">' + esc(w.name) + '</div>' +
        '<div class="wk-pstars">' + starsHtml(w.stars) + '</div><div class="wk-badge' + (j ? ' on' : '') + '">' + (j ? 'WORKING' : 'IDLE') + '</div></div>' +
        '<div class="wk-pfoot"><div class="wk-rate">' + money(STAR.wage[w.stars]) + '<small> / minute</small></div>' + foot +
        '<div class="wk-row2">' + (w.stars < 5 ? '<button class="fu-btn secondary" data-w="train" data-id="' + w.id + '"' + (G.money < STAR.train[w.stars] ? ' disabled' : '') + '>Train to ' + (w.stars + 1) + '★ · ' + money(STAR.train[w.stars]) + '</button>'
          : '<button class="fu-btn secondary" disabled>Top skill ★</button>') +
        '<button class="fu-btn ' + (armedFire === w.id ? 'danger' : 'secondary') + '" data-w="fire" data-id="' + w.id + '">' + (armedFire === w.id ? 'Sure?' : 'Let go') + '</button></div></div></div>';
    });
    return h + '</div><button class="wk-arrow r" data-w="wr">›</button></div>';
  }
  function hireTab() {
    var h = '<p class="wk-note">Scroll through the people looking for work (mouse wheel or arrows). Buy once to hire them, then they cost their wage per minute only while they work. New people every morning · your staff ' + staff.length + ' / ' + MAX_STAFF + '.</p>';
    if (!cands.length) return h + '<div class="wk-line">Nobody is looking for work today. Check again tomorrow.</div>';
    h += '<div class="wk-wheelbox"><button class="wk-arrow l" data-w="wl">‹</button><div class="wk-wheel">';
    cands.forEach(function (c) {
      var full = STAR.speed[c.stars] <= 1 ? 0 : STAR.speed[c.stars] <= 1.25 ? 1 : STAR.speed[c.stars] <= 1.5 ? 2 : 3, can = G.money >= STAR.fee[c.stars] && staff.length < MAX_STAFF;
      h += '<div class="wk-pcard"><div class="wk-pimg"><img alt="" src="' + portrait(c) + '"><div class="wk-pname">' + esc(c.name) + '</div><div class="wk-pstars">' + starsHtml(c.stars) + '</div></div>' +
        '<div class="wk-pfoot"><div class="wk-rate">' + money(STAR.wage[c.stars]) + '<small> / minute</small></div>' +
        '<div class="wk-sub">Speed ×' + STAR.speed[c.stars] + ' · best in a ' + UPG().names[full] + ' machine or better</div>' +
        '<button class="fu-btn" data-w="take" data-id="' + c.id + '"' + (can ? '' : ' disabled') + '>Buy · ' + money(STAR.fee[c.stars]) + '</button></div></div>';
    });
    return h + '</div><button class="wk-arrow r" data-w="wr">›</button></div>';
  }
  function machinesTab() {
    var ms = machines();
    var h = '<p class="wk-note">Upgrades make a machine work and drive faster for everyone, and decide how fast a hired worker may push it. ' +
      'A great worker in a Stock machine costs a lot for nothing extra; in an Elite machine they pay for themselves.</p><div class="wk-grid">';
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
  // refresh money and the working cards' progress in place (rebuilding the cards made them pulse)
  function live() {
    if (!isOpen || !panel) return;
    panel.querySelector('.wk-money').textContent = money(G.money);
    jobs.forEach(function (j) {
      var bar = panel.querySelector('[data-bar="' + j.w.id + '"]'), txt = panel.querySelector('[data-txt="' + j.w.id + '"]'), pc = Math.round(progress(j) * 100);
      if (bar) bar.style.width = pc + '%';
      if (txt) txt.textContent = pc + '% done · paid ' + money(j.paid) + (j.sold ? ' · sold ' + money(j.sold) : '');
    });
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
    if (!jobs.length || !G.started) { box.style.display = 'none'; return; }
    box.style.display = '';
    box.innerHTML = jobs.map(function (j) {
      return j.w.face + ' <b>' + j.w.name + '</b> <span style="color:#ffd54f">' + stars(j.w.stars) + '</span><br>' + opName(j.tool.op) + ' ' + j.f.name + ' · ' + Math.round(progress(j) * 100) + '%<br><span class="fu-small">' + money(STAR.wage[j.w.stars]) + '/min · paid ' + money(j.paid) + '</span>';
    }).join('<hr style="border:0;border-top:1px solid rgba(255,255,255,.15);margin:5px 0">');
  }

  FU.workers = { list: function () { return jobs.slice(); }, hire: hire, hireFor: hireFor, open: open, close: close, STAR: STAR,
    staff: function () { return staff; }, candidates: function () { return cands; }, takeOn: takeOn, train: train, upgrade: upgrade,
    serialize: function () { return { staff: staff, cands: cands, nid: nid }; },
    deserialize: function (d) { staff = (d && Array.isArray(d.staff)) ? d.staff.filter(function (w) { return w && w.id && w.stars >= 1 && w.stars <= 5; }) : []; cands = (d && Array.isArray(d.cands)) ? d.cands : []; nid = Math.max(nid, (d && d.nid) || 1); if (!cands.length) freshCands(); } };

  FU.register({
    name: 'workers', order: 29, ui: false, // before vehicles (30) so the steering is used the same frame
    init: function (g) {
      G = g; build();
      g.on('enterVehicle', function (e) { var j = busy(e && e.vehicle); if (j) stop(j, '👷 You took over from the worker on ' + j.f.name + ' (paid ' + money(j.paid) + ')'); });
      g.on('newGame', function () { jobs.slice().forEach(function (j) { stop(j); }); staff = []; freshCands(); });
      g.on('newDay', function () { freshCands(); if (isOpen) paint(true); });
      g.on('gameLoaded', function () { jobs.slice().forEach(function (j) { stop(j); }); });
      g.on('netStatus', function () { if (online() && jobs.length) jobs.slice().forEach(function (j) { stop(j, 'Workers went home (they only work in solo games)'); }); });
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
      if (g.paused) return;
      for (var i = jobs.length - 1; i >= 0; i--) {
        var j = jobs[i];
        if (!j.v || (FU.vehicles && FU.vehicles.list.indexOf(j.v) < 0)) { jobs.splice(i, 1); continue; }
        var wage = STAR.wage[j.w.stars] / 60 * dt;
        if (G.money < wage) { stop(j, j.w.face + ' ' + j.w.name + ' stopped: you ran out of money for wages', 'bad'); continue; }
        G.charge(wage, 'worker'); j.paid += wage;
        drive(j, dt);
      }
      boxT -= dt; if (boxT <= 0) { boxT = 0.5; paintBox(); }
    }
  });
})();
