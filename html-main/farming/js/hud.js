// Farming Unblocked — HUD: money (+/- flash), clock + fast-forward badge, vehicle box, context prompts,
// toasts (from notify), H controls overlay and a one-time new-game tips sequence. DOM text is only
// touched when the shown value changes. Bottom-left ~210 px is left free for the minimap.
(function () {
  'use strict';
  var FU = window.FU = window.FU || {};
  var G = null;

  var CONTROLS = [
    [['W', '↑'], 'Drive / walk forward'],
    [['S', '↓'], 'Brake, then reverse / walk back'],
    [['A', 'D', '←', '→'], 'Steer / walk left and right'],
    [['Space'], 'Hard brake (vehicles)'],
    [['Shift'], 'Run (on foot)'],
    [['E'], 'Enter / exit a vehicle'],
    [['Q'], 'Attach / detach a tool or trailer (tractor)'],
    [['F'], 'Lower / raise the tool · combine header on / off'],
    [['R'], 'Change the seed crop (seed drill)'],
    [['U'], 'Unload the combine into a trailer or grain truck · sell at any buyer ($ on the map)'],
    [['G'], 'Store grain in your silo (park next to it)'],
    [['1', '2', '3'], 'Pistol / shotgun / rifle (on foot; same key puts it away)'],
    [['Click', 'Right-click'], 'Fire · aim (R reloads)'],
    [['V'], 'Town Hall: vote on laws (Main Server)'],
    [['B'], 'Shop: machines, fields, prices, selling'],
    [['M'], 'Map'],
    [['J'], 'Jobs (field contracts)'],
    [['T'], 'Hold to fast-forward time'],
    [['C'], 'Camera / cabin view'],
    [['Mouse drag'], 'Look around'],
    [['Wheel'], 'Zoom in / out'],
    [['H'], 'Show / hide this help'],
    [['Esc'], 'Close a window / pause']
  ];

  var TIPS = [
    { text: 'Welcome to your farm! Walk to the Harvestmaster combine and press [E] to climb in.',
      done: function () { var v = G.activeVehicle; return !!v && kindOf(v) === 'combine'; } },
    { text: 'Drive into Field 1, the golden wheat next to the farmyard. Use [W] [A] [S] [D] to drive.',
      done: function () {
        var v = G.activeVehicle; if (!v || !FU.fields || !FU.fields.at) return false;
        var a = FU.fields.at(v.x, v.z); return !!(a && a.field && a.field.owned);
      } },
    { text: 'Press [F] to lower the header, then drive over the ripe wheat to harvest it.',
      done: function () { var v = G.activeVehicle; return !!v && (!!v.working || !!(v.cargo && v.cargo.liters > 0)); } },
    { text: 'Fill the tank, drive to the Grain Market and press [U] to sell. Hold [T] to fast-forward time.',
      done: function () { return tipSold; } },
    { text: 'Next: take the red tractor, hitch the cultivator with [Q], lower it with [F] and work the stubble. Then sow with the seed drill ([R] picks the crop).',
      time: 14 },
    { text: 'Buy machines and fields in the shop [B], take jobs [J], open the map [M]. [H] shows every control. Happy farming!',
      time: 10 }
  ];
  var TIPS_KEY = 'fu_tips_done';
  var TIP_MAX = 120, TIP_MIN = 2.5, TOAST_LIFE = 3500, TOAST_FADE = 450, FLASH_LIFE = 1600, MAX_TOASTS = 4;

  // ---------- helpers ----------
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  // "[E] Enter Ridgeway 80" -> key cap + text
  function keyify(s) { return esc(s).replace(/\[([^\[\]]{1,12})\]/g, '<span class="fu-key">$1</span>'); }
  function setText(el, s) { if (el._t !== s) { el._t = s; el.textContent = s; } }
  function setHTML(el, s) { if (el._h !== s) { el._h = s; el.innerHTML = s; } }
  function setShow(el, on) { if (el._s !== on) { el._s = on; el.style.display = on ? '' : 'none'; } }
  function setClass(el, c) { if (el.className !== c) el.className = c; }
  function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }
  function fmtMoney(n) {
    if (FU.util && FU.util.fmtMoney) return FU.util.fmtMoney(n);
    return (n < 0 ? '-' : '') + '$' + Math.round(Math.abs(n)).toLocaleString('en-US');
  }
  function fmtTime(h) {
    if (FU.util && FU.util.fmtTime) return FU.util.fmtTime(h);
    var hh = Math.floor(h) % 24, mm = Math.floor((h % 1) * 60);
    return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
  }
  function fmtL(n) { return Math.round(n || 0).toLocaleString('en-US'); }
  function defOf(v) {
    if (v.def) return v.def;
    var t = FU.vehicles && FU.vehicles.types; return (t && t[v.type]) || {};
  }
  function kindOf(v) { return defOf(v).kind || ''; }
  function crop(id) { return (id && FU.crops && FU.crops.byId) ? FU.crops.byId(id) : null; }
  function cropName(id) { var c = crop(id); return c ? c.name : 'Unknown'; }
  function cropColor(id) {
    var c = crop(id), col = c && c.color;
    if (typeof col === 'number') return '#' + ('000000' + col.toString(16)).slice(-6);
    if (typeof col === 'string') return col;
    if (col && col.getHexString) return '#' + col.getHexString();
    return '#ffd54f';
  }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; }

  // ---------- DOM ----------
  var CSS = [
    '#fu-hud .fu-hud-el{position:absolute;z-index:10;color:#fff;font-family:system-ui,sans-serif;text-shadow:0 1px 2px rgba(0,0,0,.6)}',
    '#fu-hud .fu-hud-right{top:12px;right:12px;display:flex;flex-direction:column;align-items:flex-end;gap:6px}',
    '#fu-hud .fu-hud-money{position:relative;font-size:22px;font-weight:800;color:#ffd54f;min-width:120px;text-align:right;letter-spacing:.3px}',
    '#fu-hud .fu-hud-flash{position:absolute;right:12px;top:100%;margin-top:3px;font-size:14px;font-weight:800;opacity:0;transition:opacity .5s,transform .5s;transform:translateY(-4px);white-space:nowrap;pointer-events:none}',
    '#fu-hud .fu-hud-flash.on{opacity:1;transform:none;transition:opacity .12s,transform .12s}',
    '#fu-hud .fu-hud-flash.pos{color:#8bf28f}#fu-hud .fu-hud-flash.neg{color:#ff8a80}',
    '#fu-hud .fu-hud-time{font-weight:700;display:flex;align-items:center;gap:8px}',
    '#fu-hud .fu-hud-ff{background:#4caf50;color:#fff;border-radius:6px;padding:1px 7px;font-size:12px;font-weight:800;text-shadow:none;animation:fu-hud-pulse 1s infinite alternate}',
    '@keyframes fu-hud-pulse{from{opacity:1}to{opacity:.6}}',
    '#fu-hud .fu-hud-veh{right:12px;bottom:12px;width:220px;box-sizing:border-box}',
    '#fu-hud .fu-hud-vname{font-weight:800;font-size:15px;margin-bottom:2px}',
    '#fu-hud .fu-hud-speed{display:flex;align-items:baseline;gap:5px;margin:2px 0 4px}',
    '#fu-hud .fu-hud-speed b{font-size:30px;font-weight:800;line-height:1}',
    '#fu-hud .fu-hud-tool{font-size:13px;line-height:1.45}',
    '#fu-hud .fu-hud-tool .lo{color:#8bf28f;font-weight:700}#fu-hud .fu-hud-tool .hi{color:#ffcc80;font-weight:700}',
    '#fu-hud .fu-hud-cargo{margin-top:6px;font-size:12px}',
    '#fu-hud .fu-hud-bar{height:8px;border-radius:4px;background:rgba(255,255,255,.15);overflow:hidden;margin-top:3px}',
    '#fu-hud .fu-hud-bar i{display:block;height:100%;width:0;background:#ffd54f;transition:width .25s}',
    '#fu-hud .fu-hud-bar.full i{box-shadow:0 0 6px #fff}',
    '#fu-hud .fu-hud-prompts{left:50%;bottom:18px;transform:translateX(-50%);max-width:calc(100vw - 500px);display:flex;flex-direction:column;align-items:center;gap:5px}',
    '#fu-hud .fu-hud-prompt{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;font-weight:600}',
    '#fu-hud .fu-hud-tip{left:12px;top:12px;max-width:340px;border-left:3px solid #4caf50;box-sizing:border-box;line-height:1.45;animation:fu-hud-in .3s ease-out}',
    '#fu-hud .fu-hud-tip .fu-small{display:block;margin-bottom:2px;font-weight:700;letter-spacing:.5px;text-transform:uppercase}',
    '#fu-toasts{position:absolute;top:12px;left:50%;transform:translateX(-50%);z-index:40;display:flex;flex-direction:column;align-items:center;gap:6px;width:min(520px,90vw);pointer-events:none;font-family:system-ui,sans-serif}',
    '#fu-toasts .fu-hud-toast{background:rgba(12,16,14,.86);color:#fff;border-radius:9px;padding:7px 14px;font-size:14px;font-weight:600;border-left:4px solid #64b5f6;box-shadow:0 4px 14px rgba(0,0,0,.35);max-width:100%;box-sizing:border-box;text-align:center;transition:opacity .45s,transform .45s;animation:fu-hud-in .25s ease-out}',
    '#fu-toasts .fu-hud-toast.good{border-left-color:#4caf50;background:rgba(22,52,26,.9)}',
    '#fu-toasts .fu-hud-toast.bad{border-left-color:#e53935;background:rgba(60,20,18,.9)}',
    '#fu-toasts .fu-hud-toast.out{opacity:0;transform:translateY(-8px)}',
    '#fu-toasts .fu-hud-count{margin-left:6px;opacity:.7}',
    '@keyframes fu-hud-in{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}',
    '.fu-hud-help .fu-hud-grid{display:grid;grid-template-columns:auto 1fr;gap:7px 16px;align-items:center;margin:4px 0 14px;font-size:14px}',
    '.fu-hud-help .fu-hud-keys{text-align:right;white-space:nowrap}'
  ].join('\n');

  var host, root, right, moneyBox, moneyEl, flashEl, timeBox, timeEl, ffEl, veh, vName, vSpeed, vUnit, vTool,
    vCargo, vCargoLabel, vBar, vBarFill, promptsEl, tipEl, tipHead, tipText, toastsEl, helpEl;

  function mk(tag, cls, parent, html) {
    var e = document.createElement(tag); if (cls) e.className = cls;
    if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e;
  }

  function controlsHTML() {
    var h = '<div class="fu-hud-grid">';
    for (var i = 0; i < CONTROLS.length; i++) {
      var keys = CONTROLS[i][0], k = '';
      for (var j = 0; j < keys.length; j++) k += '<span class="fu-key">' + esc(keys[j]) + '</span>';
      h += '<div class="fu-hud-keys">' + k + '</div><div>' + esc(CONTROLS[i][1]) + '</div>';
    }
    return h + '</div>';
  }

  function build() {
    host = G.ui || document.body;
    if (!document.getElementById('fu-hud-style')) { var st = mk('style', null, document.head); st.id = 'fu-hud-style'; st.textContent = CSS; }
    root = mk('div', null, host); root.id = 'fu-hud'; root.style.display = 'none'; root._s = false;

    right = mk('div', 'fu-hud-el fu-hud-right', root);
    moneyBox = mk('div', 'fu-box fu-hud-money', right);
    moneyEl = mk('span', null, moneyBox, '$0');
    flashEl = mk('div', 'fu-hud-flash', moneyBox);
    timeBox = mk('div', 'fu-box fu-hud-time', right);
    timeEl = mk('span', null, timeBox);
    ffEl = mk('span', 'fu-hud-ff', timeBox); setShow(ffEl, false);

    veh = mk('div', 'fu-box fu-hud-el fu-hud-veh', root); setShow(veh, false);
    vName = mk('div', 'fu-hud-vname', veh);
    var sp = mk('div', 'fu-hud-speed', veh);
    vSpeed = mk('b', null, sp, '0'); vUnit = mk('span', 'fu-small', sp, 'km/h');
    vTool = mk('div', 'fu-hud-tool', veh);
    vCargo = mk('div', 'fu-hud-cargo', veh);
    vCargoLabel = mk('div', null, vCargo);
    vBar = mk('div', 'fu-hud-bar', vCargo); vBarFill = mk('i', null, vBar);

    promptsEl = mk('div', 'fu-hud-el fu-hud-prompts', root);

    tipEl = mk('div', 'fu-box fu-hud-el fu-hud-tip', root); setShow(tipEl, false);
    tipHead = mk('span', 'fu-small', tipEl); tipText = mk('span', null, tipEl);

    toastsEl = mk('div', null, host); toastsEl.id = 'fu-toasts';

    helpEl = mk('div', 'fu-panel fu-hud-help', host); helpEl.style.display = 'none';
    mk('div', 'fu-title', helpEl, 'Controls');
    mk('div', null, helpEl, controlsHTML());
    var foot = mk('div', null, helpEl); foot.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:12px';
    mk('span', 'fu-small', foot, 'Press <span class="fu-key">H</span> or <span class="fu-key">Esc</span> to close');
    var btn = mk('button', 'fu-btn secondary', foot, 'Close');
    btn.addEventListener('click', hideHelp);
  }

  // ---------- help overlay ----------
  function showHelp() {
    if (!helpEl) return;
    helpEl.style.display = '';
    G.openPanel('help', function () { helpEl.style.display = 'none'; });
  }
  function hideHelp() {
    if (!helpEl) return;
    helpEl.style.display = 'none';
    if (G && G.closePanel) G.closePanel('help');
  }
  function toggleHelp() { if (G.isPanelOpen('help')) hideHelp(); else showHelp(); }

  // ---------- toasts ----------
  var toasts = [];
  function toast(text, kind) {
    if (!toastsEl) return;
    text = String(text == null ? '' : text);
    kind = (kind === 'good' || kind === 'bad') ? kind : 'info';
    var t = now(), last = toasts[toasts.length - 1];
    if (last && !last.fading && last.text === text && last.kind === kind) {
      last.count++; last.t = t; last.countEl.textContent = '×' + last.count; return;
    }
    var el = mk('div', 'fu-hud-toast ' + kind, toastsEl);
    mk('span', null, el, keyify(text));
    var c = mk('b', 'fu-hud-count', el);
    toasts.push({ el: el, text: text, kind: kind, t: t, count: 1, countEl: c, fading: false, fadeAt: 0 });
    while (toasts.length > MAX_TOASTS) { var o = toasts.shift(); if (o.el.parentNode) o.el.parentNode.removeChild(o.el); }
  }
  function updateToasts(t) {
    for (var i = toasts.length - 1; i >= 0; i--) {
      var o = toasts[i];
      if (!o.fading && t - o.t > TOAST_LIFE) { o.fading = true; o.fadeAt = t; o.el.classList.add('out'); }
      else if (o.fading && t - o.fadeAt > TOAST_FADE) {
        if (o.el.parentNode) o.el.parentNode.removeChild(o.el);
        toasts.splice(i, 1);
      }
    }
  }

  // ---------- money ----------
  var lastMoney = null, flashSum = 0, flashT = -1e9, flashOn = false;
  function refreshMoney() {
    var m = Math.round(G.money || 0);
    if (m !== lastMoney) { lastMoney = m; setText(moneyEl, fmtMoney(m)); }
  }
  function onMoney(d) {
    var delta = (d && d.delta) || 0, t = now();
    if (t - flashT > FLASH_LIFE) flashSum = 0;
    flashSum += delta; flashT = t;
    if (Math.abs(flashSum) >= 0.5 && flashEl) {
      setText(flashEl, (flashSum > 0 ? '+' : '-') + fmtMoney(Math.abs(flashSum)));
      setClass(flashEl, 'fu-hud-flash on ' + (flashSum > 0 ? 'pos' : 'neg'));
      flashOn = true;
    }
    if (moneyEl) refreshMoney();
  }

  // ---------- clock ----------
  var lastClock = -1, lastNight = null, lastScale = -1;
  function updateClock() {
    var tm = G.time || { day: 1, hour: 6, scale: 1 };
    var key = (tm.day || 1) * 1440 + Math.floor((tm.hour || 0) * 60);
    var night = !!(FU.daynight && FU.daynight.isNight && FU.daynight.isNight());
    if (key !== lastClock || night !== lastNight) {
      lastClock = key; lastNight = night;
      setText(timeEl, (night ? '☾ ' : '☀ ') + 'Day ' + (tm.day || 1) + ' · ' + fmtTime(tm.hour || 0));
    }
    var sc = tm.scale || 1;
    if (sc !== lastScale) {
      lastScale = sc;
      setShow(ffEl, sc > 1);
      if (sc > 1) setText(ffEl, '▶▶ ×' + Math.round(sc));
    }
  }

  // ---------- vehicle box ----------
  var lastKmh = -1, lastRev = null, lastCargoKey = '', lastPct = -1;
  function updateVehicle() {
    var v = G.activeVehicle;
    setShow(veh, !!v);
    if (!v) return;
    var def = defOf(v), kind = def.kind || '';
    setText(vName, def.name || 'Vehicle');
    var spd = v.speed || 0, kmh = Math.round(Math.abs(spd) * 3.6), rev = spd < -0.3;
    if (kmh !== lastKmh) { lastKmh = kmh; setText(vSpeed, String(kmh)); }
    if (rev !== lastRev) { lastRev = rev; setText(vUnit, rev ? 'km/h · reverse' : 'km/h'); }

    var imp = (FU.implements && FU.implements.attachedTo) ? FU.implements.attachedTo(v) : null;
    var idef = imp ? (imp.def || (FU.implements.types && FU.implements.types[imp.type]) || {}) : null;
    var tool;
    if (kind === 'combine') {
      tool = 'Header: ' + (v.working ? '<span class="lo">Lowered</span> · harvesting' : '<span class="hi">Raised</span>') +
        ' <span class="fu-key">F</span>';
    } else if (imp) {
      tool = esc(idef.name || 'Tool');
      if (idef.kind !== 'trailer') {
        tool += '<br>' + (imp.lowered ? '<span class="lo">Lowered</span>' : '<span class="hi">Raised</span>') + ' <span class="fu-key">F</span>';
      }
      if (idef.kind === 'seeder') tool += '<br>Seed: <b>' + esc(cropName(imp.seedCrop)) + '</b> <span class="fu-key">R</span>';
    } else if (kind === 'tractor') {
      tool = '<span class="fu-small">No tool attached · back up to one and press</span> <span class="fu-key">Q</span>';
    } else tool = '';
    setHTML(vTool, tool);
    setShow(vTool, !!tool);

    var holder = null;
    if (kind === 'combine' || kind === 'truck') holder = v;
    else if (imp && idef.kind === 'trailer' && imp.cargo) holder = imp;
    setShow(vCargo, !!(holder && holder.cargo));
    if (holder && holder.cargo) {
      var cg = holder.cargo, cap = cg.capacity || (holder === v ? def.tank : idef.capacity) || 0, l = cg.liters || 0;
      var empty = l < 0.5 || !cg.cropId;
      var ck = (holder === v ? 'T' : 'R') + (empty ? 0 : cg.cropId) + '|' + Math.round(l) + '|' + Math.round(cap);
      if (ck !== lastCargoKey) {
        lastCargoKey = ck;
        var label = (holder === v ? 'Tank' : 'Trailer') + ': ' + (empty ? 'empty' : cropName(cg.cropId)) +
          ' · ' + fmtL(l) + ' / ' + fmtL(cap) + ' L';
        setText(vCargoLabel, label);
        vBarFill.style.background = empty ? '#ffd54f' : cropColor(cg.cropId);
      }
      var pct = cap > 0 ? Math.max(0, Math.min(100, Math.round(l / cap * 100))) : 0;
      if (pct !== lastPct) { lastPct = pct; vBarFill.style.width = pct + '%'; setClass(vBar, pct >= 100 ? 'fu-hud-bar full' : 'fu-hud-bar'); }
    }
  }

  // ---------- prompts ----------
  var lastPrompts = [];
  function updatePrompts() {
    var ps = G.prompts || [], same = ps.length === lastPrompts.length;
    for (var i = 0; same && i < ps.length; i++) if (ps[i] !== lastPrompts[i]) same = false;
    if (same) return;
    lastPrompts = ps.slice();
    var h = '';
    for (var j = 0; j < ps.length; j++) h += '<div class="fu-box fu-hud-prompt">' + keyify(ps[j]) + '</div>';
    promptsEl.innerHTML = h;
  }

  // ---------- tips ----------
  var tipIndex = -1, tipTime = 0, tipSold = false;
  function startTips() {
    if (store(TIPS_KEY) === '1') { tipIndex = -1; setShow(tipEl, false); return; }
    tipSold = false; showTip(0);
  }
  function showTip(i) {
    tipIndex = i; tipTime = 0;
    if (i < 0 || i >= TIPS.length) {
      tipIndex = -1; setShow(tipEl, false);
      if (i >= TIPS.length) store(TIPS_KEY, '1');
      return;
    }
    setText(tipHead, 'Tip ' + (i + 1) + ' / ' + TIPS.length);
    setHTML(tipText, keyify(TIPS[i].text));
    setShow(tipEl, true);
    // restart the entrance animation
    tipEl.style.animation = 'none'; void tipEl.offsetWidth; tipEl.style.animation = '';
  }
  function updateTips(dt) {
    if (tipIndex < 0 || G.paused) return;
    var tip = TIPS[tipIndex]; tipTime += dt;
    var ok = false;
    if (tip.done && tipTime > TIP_MIN) { try { ok = !!tip.done(); } catch (e) { ok = false; } }
    if (ok || tipTime > (tip.time || TIP_MAX)) showTip(tipIndex + 1);
  }

  // ---------- public API ----------
  FU.hud = {
    toast: toast,                 // show a toast directly (G.notify also lands here)
    showHelp: function () { if (G) showHelp(); },
    hideHelp: function () { if (G) hideHelp(); },
    toggleHelp: function () { if (G) toggleHelp(); },
    controls: CONTROLS,           // [[keys...], description] for other UIs (menu Controls screen)
    controlsHTML: controlsHTML,   // ready-made key grid (uses .fu-key)
    keyify: keyify,               // "[E] Enter" -> key-cap HTML (escaped)
    get rightColumn() { return right || null; }, // top-right column under money/time (missions progress box)
    get el() { return root || null; },
    resetTips: function () { store(TIPS_KEY, '0'); }
  };

  FU.register({
    name: 'hud', order: 90, ui: true,
    init: function (g) {
      G = g;
      build();
      G.on('notify', function (d) { d = d || {}; toast(d.text, d.kind); });
      G.on('moneyChanged', onMoney);
      G.on('sold', function () { tipSold = true; });
      G.on('newGame', function () {
        lastMoney = null; flashSum = 0; flashT = -1e9; lastClock = -1; lastScale = -1; lastCargoKey = ''; lastPct = -1;
        startTips();
      });
      G.on('gameLoaded', function () { tipIndex = -1; setShow(tipEl, false); });
      G.on('gameStarted', function () { setShow(root, true); refreshMoney(); updateClock(); });
    },
    update: function (dt, g) {
      var started = !!G.started;
      setShow(root, started);
      var t = now();
      updateToasts(t);
      if (!started) return;
      if (G.input && G.input.pressed('KeyH')) {
        if (G.isPanelOpen('help')) hideHelp(); else if (!G.input.blocked) showHelp();
      }
      refreshMoney();
      if (flashOn && t - flashT > FLASH_LIFE) { flashOn = false; setClass(flashEl, flashEl.className.replace(' on', '')); }
      updateClock();
      updateVehicle();
      updatePrompts();
      updateTips(dt);
    }
  });
})();
