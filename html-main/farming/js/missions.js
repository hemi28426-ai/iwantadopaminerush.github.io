// Farming Unblocked — missions: neighbor contracts on unowned fields (offers, one active job,
// J jobs panel, small progress box under the HUD money). Sets field.contract so fields.work allows it.
(function () {
  'use strict';
  var FU = window.FU = window.FU || {};

  var NEIGHBORS = ['Old Mabel Finch', 'Farmer Hank Dobbs', 'Rosie Delgado', 'The Okafor family', 'Gus Pennywhistle',
    'Aunt June Harlow', 'Big Walt Brennan', 'Nora Lindqvist', 'Earl & Dot Simmons', 'Priya Banerjee',
    'Tomas of Cedar Hollow', 'Granny Fern', 'Lefty McGraw', 'The Haverford twins'];
  var CROP_NAMES = { 1: 'Wheat', 2: 'Barley', 3: 'Corn', 4: 'Canola', 5: 'Sunflower', 6: 'Soybeans' };
  var OPS = {
    cultivate: { tag: 'TILL', color: '#8d6e63', min: 0.6, max: 0.9 },
    seed: { tag: 'SOW', color: '#3f8f43', min: 0.6, max: 0.9 },
    harvest: { tag: 'CUT', color: '#c9a227', min: 0.5, max: 0.65 } // you also keep the grain
  };
  var MAX_OFFERS = 3, FIT = 0.9, DONE = 0.95, LIMIT_DAYS = 2, REFRESH_HOURS = 4;
  var CSS = '.fu-jobs-panel{width:min(580px,92vw)}' +
    '.fu-jobs-h{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;opacity:.7;margin:14px 0 4px}' +
    '.fu-jobs-card{display:flex;align-items:center;gap:12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:10px 12px;margin:8px 0}' +
    '.fu-jobs-ico{flex:0 0 46px;height:46px;border-radius:10px;display:flex;align-items:center;justify-content:center;font:800 12px system-ui,sans-serif;letter-spacing:.04em;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.4)}' +
    '.fu-jobs-main{flex:1;min-width:0}.fu-jobs-name{font-weight:700}' +
    '.fu-jobs-side{display:flex;flex-direction:column;align-items:flex-end;gap:6px}' +
    '.fu-jobs-reward{color:#ffd54f;font-weight:800;white-space:nowrap}' +
    '.fu-jobs-bar{height:8px;background:rgba(255,255,255,.12);border-radius:5px;overflow:hidden;margin:6px 0 4px}' +
    '.fu-jobs-bar>i{display:block;height:100%;width:0;background:#4caf50;border-radius:5px;transition:width .4s}' +
    '.fu-jobs-hud{position:absolute;top:70px;right:12px;width:220px;display:none}';

  var G = null, panel = null, hud = null, nextId = 1, sinceRefresh = 0, checkT = 0, needRefresh = false;

  var M = FU.missions = {
    offers: [], active: null,
    accept: accept, cancel: cancel, refresh: refresh,
    title: function (o) { return title(o); },
    serialize: serialize, deserialize: deserialize
  };

  // ---------- helpers ----------
  function ST() { return (FU.fields && FU.fields.STATE) || { GRASS: 0, STUBBLE: 1, CULTIVATED: 2, GROWING: 3, RIPE: 4 }; }
  function fieldById(id) {
    if (!FU.fields) return null;
    if (FU.fields.byId) return FU.fields.byId(id) || null;
    var l = FU.fields.list || [];
    for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
    return null;
  }
  function stats(f) { var s = f && FU.fields && FU.fields.stats ? FU.fields.stats(f) : null; return s && s.total ? s : null; }
  function cropName(id) { var c = FU.crops && FU.crops.byId ? FU.crops.byId(id) : null; return (c && c.name) || CROP_NAMES[id] || 'Crop'; }
  function cropIds() { var t = FU.crops && FU.crops.types; return t && t.length ? t.map(function (c) { return c.id; }) : [1, 2, 3, 4, 5, 6]; }
  function countCrop(f, cropId) { // GROWING/RIPE cells of this crop
    var st = ST(), s = f.state, c = f.crop, n = 0;
    if (!s || !c) return 0;
    for (var k = 0; k < s.length; k++) if (c[k] === cropId && (s[k] === st.GROWING || s[k] === st.RIPE)) n++;
    return n;
  }
  function mainCrop(s) { var best = 0, n = 0; for (var id in (s.crops || {})) if (+id && s.crops[id] > n) { n = s.crops[id]; best = +id; } return best; }
  function fitOp(s) {
    var t = s.total;
    if ((s.ripe || 0) / t >= FIT) return 'harvest';
    if ((s.cultivated || 0) / t >= FIT) return 'seed';
    if (((s.grass || 0) + (s.stubble || 0)) / t >= FIT) return 'cultivate';
    return null;
  }
  function now() { return G.time.day + G.time.hour / 24; }
  function money(n) { return FU.util && FU.util.fmtMoney ? FU.util.fmtMoney(n) : '$' + Math.round(n); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fieldName(id) { var f = fieldById(id); return (f && f.name) || 'Field ' + id; }
  function title(o) {
    if (!o) return '';
    var fn = fieldName(o.fieldId);
    if (o.op === 'seed') return 'Sow ' + cropName(o.cropId) + ' on ' + fn;
    if (o.op === 'harvest') return 'Harvest ' + (o.cropId ? cropName(o.cropId) + ' on ' : '') + fn;
    return 'Cultivate ' + fn;
  }
  function timeLeft(a) {
    var h = Math.max(0, (a.deadline - now()) * 24);
    if (h >= 24) return Math.floor(h / 24) + 'd ' + Math.floor(h % 24) + 'h';
    return Math.floor(h) + 'h ' + Math.floor((h % 1) * 60) + 'm';
  }
  function setContract(f, a) { if (f) f.contract = { missionId: a.id, op: a.op, cropId: a.cropId || 0 }; }
  function clearContracts(keepId) {
    var l = (FU.fields && FU.fields.list) || [];
    for (var i = 0; i < l.length; i++) if (l[i].contract && l[i].contract.missionId !== keepId) l[i].contract = null;
  }

  // ---------- offers ----------
  function makeOffer(f, op, s, neighbor) {
    var r = OPS[op], o = { id: 'm' + (nextId++), op: op, fieldId: f.id, cropId: 0, neighbor: neighbor, reward: 0 };
    var reward = f.w * f.d * (r.min + Math.random() * (r.max - r.min));
    if (op === 'seed') {
      o.cropId = cropIds()[Math.floor(Math.random() * cropIds().length)];
      var c = FU.crops && FU.crops.byId ? FU.crops.byId(o.cropId) : null;
      if (c && c.seedCost) reward += (s.cultivated || 0) * c.seedCost; // covers the seed you buy
    } else if (op === 'harvest') o.cropId = mainCrop(s);
    o.reward = Math.max(250, Math.round(reward / 50) * 50);
    return o;
  }
  function refresh() {
    needRefresh = false; sinceRefresh = 0;
    if (!G) return;
    var list = (FU.fields && FU.fields.list) || [], cands = [];
    for (var i = 0; i < list.length; i++) {
      var f = list[i];
      if (f.owned || f.contract || (M.active && M.active.fieldId === f.id)) continue;
      var s = stats(f), op = s && fitOp(s);
      if (op) cands.push({ f: f, op: op, s: s });
    }
    shuffle(cands);
    var names = shuffle(NEIGHBORS.slice());
    M.offers = cands.slice(0, MAX_OFFERS).map(function (c, k) { return makeOffer(c.f, c.op, c.s, names[k % names.length]); });
    render();
  }

  // ---------- active job ----------
  function accept(id) {
    if (!G) return false;
    if (M.active) { G.notify('Finish or cancel your current job first', 'bad'); return false; }
    var o = null, i;
    for (i = 0; i < M.offers.length; i++) if (M.offers[i].id === id) { o = M.offers[i]; break; }
    if (!o) return false;
    M.offers.splice(i, 1);
    var f = fieldById(o.fieldId), s = stats(f);
    if (!f || f.owned || f.contract || !s || fitOp(s) !== o.op) {
      render(); G.notify('That job is no longer available', 'bad'); return false;
    }
    var a = M.active = {
      id: o.id, op: o.op, fieldId: o.fieldId, cropId: o.cropId || 0, neighbor: o.neighbor, reward: o.reward,
      deadline: now() + LIMIT_DAYS, progress: 0,
      base: { total: s.total, cultivated: s.cultivated || 0, stubble: s.stubble || 0, ripe: s.ripe || 0,
        crop: o.op === 'seed' ? countCrop(f, o.cropId) : 0 }
    };
    setContract(f, a);
    G.emit('fieldChanged', { field: f, op: 'contract' });
    G.emit('missionChanged', { active: a });
    G.notify('Job accepted: ' + title(a) + ' for ' + a.neighbor + ' (' + money(a.reward) + ', 2 days)', 'good');
    a.progress = progressOf(a);
    updateHud(); render();
    return true;
  }
  function endJob() {
    var a = M.active; M.active = null;
    var f = a && fieldById(a.fieldId);
    if (f && f.contract && f.contract.missionId === a.id) f.contract = null;
    if (f) G.emit('fieldChanged', { field: f, op: 'contract' });
    G.emit('missionChanged', { active: null, mission: a });
    updateHud(); render();
    return a;
  }
  function cancel() {
    if (!M.active || !G) return false;
    var a = endJob();
    G.notify('Job cancelled: ' + title(a) + '. ' + a.neighbor + ' will ask someone else.', 'info');
    return true;
  }
  function progressOf(a) {
    var f = fieldById(a.fieldId), s = stats(f), b = a.base || {}, p;
    if (!s) return a.progress || 0;
    if (a.op === 'cultivate') p = (s.cultivated || 0) / s.total;
    else if (a.op === 'seed') p = (countCrop(f, a.cropId) - (b.crop || 0)) / Math.max(1, b.cultivated || 0);
    else p = ((s.stubble || 0) - (b.stubble || 0)) / Math.max(1, b.ripe || 0);
    return p < 0 ? 0 : p > 1 ? 1 : p;
  }
  function check() {
    var a = M.active;
    if (!a) { updateHud(); return; }
    var f = fieldById(a.fieldId);
    if (!f) { endJob(); return; }
    if (!f.owned && (!f.contract || f.contract.missionId !== a.id)) setContract(f, a);
    a.progress = progressOf(a);
    if (a.progress >= DONE) {
      endJob();
      G.earn(a.reward, 'Job: ' + title(a));
      G.notify(a.neighbor + ' paid you ' + money(a.reward) + ' for: ' + title(a), 'good');
      G.emit('missionComplete', { mission: a });
      return;
    }
    if (now() >= a.deadline) {
      endJob();
      G.notify('Job failed: ' + title(a) + ' (time ran out)', 'bad');
      G.emit('missionFailed', { mission: a });
      return;
    }
    updateHud();
    if (isOpen()) renderActive();
  }

  // ---------- UI ----------
  function build() {
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    panel = document.createElement('div');
    panel.className = 'fu-panel fu-jobs-panel'; panel.style.display = 'none';
    panel.innerHTML = '<div class="fu-title">Neighbor jobs</div>' +
      '<div class="fu-small">Neighbors pay you to work their fields with your own machines. Contract fields show blue on the map.</div>' +
      '<div class="fu-jobs-h">Active job</div><div data-r="active"></div>' +
      '<div class="fu-jobs-h">Offers</div><div data-r="offers"></div>' +
      '<div style="text-align:right;margin-top:12px"><button class="fu-btn secondary" data-act="close">Close <span class="fu-key">J</span></button></div>';
    panel.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('[data-act]') : null;
      if (!b || b.disabled) return;
      if (b.blur) b.blur(); // keep Space/Enter from re-clicking it while driving
      var act = b.getAttribute('data-act');
      if (act === 'accept') accept(b.getAttribute('data-id'));
      else if (act === 'cancel') cancel();
      else if (act === 'close') closePanel();
    });
    hud = document.createElement('div'); hud.className = 'fu-box fu-jobs-hud';
    if (G.ui) { G.ui.appendChild(panel); G.ui.appendChild(hud); }
  }
  function isOpen() { return !!panel && panel.style.display !== 'none'; }
  function hidePanel() { if (panel) panel.style.display = 'none'; }
  function openPanel() { if (!panel) return; panel.style.display = 'block'; G.openPanel('jobs', hidePanel); render(); }
  function closePanel() { G.closePanel('jobs'); hidePanel(); }
  function card(o, btn, act) {
    var f = fieldById(o.fieldId), op = OPS[o.op] || OPS.cultivate;
    var size = f ? (f.w * f.d / 10000).toFixed(2) + ' ha (' + f.w + ' x ' + f.d + ' m)' : '';
    var note = o.op === 'harvest' ? ' · you keep the grain' : o.op === 'seed' ? ' · seed cost included' : '';
    return '<div class="fu-jobs-card"><div class="fu-jobs-ico" style="background:' + op.color + '">' + op.tag + '</div>' +
      '<div class="fu-jobs-main"><div class="fu-jobs-name">' + esc(title(o)) + '</div>' +
      '<div class="fu-small">' + esc(o.neighbor) + ' · ' + size + note + '</div>' +
      (act ? '<div class="fu-jobs-bar"><i></i></div><div class="fu-small" data-r="pct"></div>'
        : '<div class="fu-small">Finish ' + Math.round(DONE * 100) + '% within ' + LIMIT_DAYS + ' days</div>') +
      '</div><div class="fu-jobs-side"><div class="fu-jobs-reward">' + money(o.reward) + '</div>' + btn + '</div></div>';
  }
  function renderActive() {
    var el = panel.querySelector('[data-r="active"]'), a = M.active;
    if (!a) { el.removeAttribute('data-id'); el.innerHTML = '<div class="fu-small">No active job. Accept an offer below.</div>'; return; }
    if (el.getAttribute('data-id') !== a.id) {
      el.setAttribute('data-id', a.id);
      el.innerHTML = card(a, '<button class="fu-btn danger" data-act="cancel">Cancel</button>', true);
    }
    var pct = Math.floor((a.progress || 0) * 100);
    el.querySelector('.fu-jobs-bar>i').style.width = pct + '%';
    el.querySelector('[data-r="pct"]').textContent = pct + '% done · ' + timeLeft(a) + ' left';
  }
  function renderOffers() {
    var el = panel.querySelector('[data-r="offers"]');
    if (!M.offers.length) { el.innerHTML = '<div class="fu-small">No neighbors need help right now. New offers come every few hours.</div>'; return; }
    el.innerHTML = M.offers.map(function (o) {
      return card(o, '<button class="fu-btn" data-act="accept" data-id="' + esc(o.id) + '"' +
        (M.active ? ' disabled title="Finish your current job first"' : '') + '>Accept</button>', false);
    }).join('');
  }
  function render() { if (isOpen()) { renderActive(); renderOffers(); } }
  function updateHud() {
    if (!hud) return;
    var a = M.active;
    if (!a || !G || !G.started) { if (hud.style.display !== 'none') hud.style.display = 'none'; return; }
    if (hud.getAttribute('data-id') !== a.id) {
      hud.setAttribute('data-id', a.id);
      hud.innerHTML = '<div style="font-weight:700;font-size:13px">' + esc(title(a)) + '</div>' +
        '<div class="fu-jobs-bar"><i></i></div><div class="fu-small" data-r="pct"></div>';
    }
    hud.style.display = 'block';
    var pct = Math.floor((a.progress || 0) * 100);
    hud.querySelector('.fu-jobs-bar>i').style.width = pct + '%';
    hud.querySelector('[data-r="pct"]').textContent = pct + '% · ' + timeLeft(a) + ' left · ' + money(a.reward);
  }

  // ---------- save ----------
  function serialize() {
    return JSON.parse(JSON.stringify({ offers: M.offers, active: M.active, nextId: nextId, sinceRefresh: sinceRefresh }));
  }
  function reset() {
    M.offers = []; M.active = null; sinceRefresh = 0; checkT = 0;
    clearContracts(null);
    if (hud) { hud.style.display = 'none'; hud.removeAttribute('data-id'); }
    render();
  }
  function deserialize(d) {
    reset();
    if (!d || typeof d !== 'object') { needRefresh = true; return; }
    nextId = Math.max(1, d.nextId | 0);
    sinceRefresh = +d.sinceRefresh || 0;
    M.offers = (Array.isArray(d.offers) ? d.offers : []).filter(function (o) {
      return o && OPS[o.op] && fieldById(o.fieldId);
    }).slice(0, MAX_OFFERS);
    var a = d.active;
    if (a && OPS[a.op] && fieldById(a.fieldId)) {
      a.base = a.base || {}; a.progress = +a.progress || 0;
      if (!(a.deadline > 0)) a.deadline = (G ? now() : 1) + LIMIT_DAYS;
      M.active = a;
      clearContracts(a.id);
      setContract(fieldById(a.fieldId), a);
    }
    if (!M.offers.length) needRefresh = true;
    updateHud(); render();
  }

  FU.register({
    name: 'missions', order: 65, ui: false,
    init: function (g) {
      G = g;
      build();
      G.on('newGame', function () { reset(); nextId = 1; needRefresh = true; if (G.isPanelOpen('jobs')) closePanel(); });
      G.on('newDay', function () { needRefresh = true; });
      G.on('gameLoaded', function () { if (!M.offers.length) needRefresh = true; updateHud(); });
      G.on('gameStarted', function () { updateHud(); });
      G.on('fieldBought', function (e) {
        var f = e && e.field, n = M.offers.length;
        if (!f) return;
        M.offers = M.offers.filter(function (o) { return o.fieldId !== f.id; });
        if (n !== M.offers.length) render();
      });
    },
    update: function (dt, g) {
      if (!g.started) return;
      if (needRefresh && FU.fields && FU.fields.list) refresh();
      sinceRefresh += dt * (g.time.minutesPerSecond || 2) * (g.time.scale || 1) / 60;
      if (sinceRefresh >= REFRESH_HOURS) refresh();
      checkT += dt;
      if (checkT >= 0.5) { checkT = 0; check(); }
      if (g.input.pressed('KeyJ')) {
        if (g.isPanelOpen('jobs')) closePanel();
        else if (!g.input.blocked) openPanel();
      }
      if (isOpen() && !g.isPanelOpen('jobs')) hidePanel();
    }
  });
})();
