// Farming Unblocked — save.js: save/load the game in localStorage (key farming_unblocked_save_v1),
// autosave every 60 s of play and silently when the tab is hidden or closed.
(function () {
  'use strict';
  var FU = window.FU = window.FU || {};
  var KEY = 'farming_unblocked_save_v1';
  var AUTOSAVE_SECONDS = 60;
  // load order matters: implements relink to vehicles, missions use fields
  var ORDER = ['fields', 'vehicles', 'implements', 'player', 'economy', 'missions'];
  var timer = 0;
  var holdAutosave = false;   // set by reset(): no silent saves until the next game starts
  var gameId = null;          // identifies the current game (so a failed module never gets old-game data)
  var lastFailNote = -1e9;

  function log(msg, e) { try { console.error('[FU] save: ' + msg, e || ''); } catch (x) {} }
  function store() { try { return window.localStorage || null; } catch (e) { return null; } }
  function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  // parsed + validated save object, or null when missing/corrupt
  function readData() {
    var s = store(), raw = null, d;
    if (!s) return null;
    try { raw = s.getItem(KEY); } catch (e) { log('read failed', e); return null; }
    if (!raw) return null;
    try { d = JSON.parse(raw); } catch (e) { log('save data is corrupt (bad JSON)', e); return null; }
    if (!d || typeof d !== 'object' || Array.isArray(d) || d.v !== 1) { log('save data is corrupt or from another version'); return null; }
    return d;
  }

  // typed arrays -> plain arrays (JSON.stringify would turn them into {"0":..} objects)
  function replacer(k, v) {
    return (v && typeof v === 'object' && ArrayBuffer.isView(v) && typeof v.length === 'number') ? Array.from(v) : v;
  }
  function stringifyPart(name, value) {
    try { var s = JSON.stringify(value, replacer); return s === undefined ? null : s; }
    catch (e) { log(name + ' data could not be encoded', e); return null; }
  }
  function serializePart(name) {
    var m = FU[name], d;
    if (!m || typeof m.serialize !== 'function') return null;
    try { d = m.serialize(); } catch (e) { log(name + '.serialize failed', e); return null; }
    return d === undefined ? null : stringifyPart(name, d);
  }
  function deserializePart(name, value) {
    if (value === undefined || value === null) return;
    var m = FU[name];
    if (!m || typeof m.deserialize !== 'function') { log(name + '.deserialize missing, skipped'); return; }
    try { m.deserialize(value); } catch (e) { log(name + '.deserialize failed', e); }
  }
  // other registered modules that also expose serialize/deserialize are stored under "extra"
  function extraNames() {
    var out = [];
    (FU.modules || []).forEach(function (mod) {
      var n = mod && mod.name, m;
      if (!n || n === 'save' || ORDER.indexOf(n) >= 0 || out.indexOf(n) >= 0) return;
      m = FU[n];
      if (m && typeof m.serialize === 'function' && typeof m.deserialize === 'function') out.push(n);
    });
    return out;
  }

  function failNote(text, force) {
    var now = Date.now(), G = FU.G;
    if (!force && now - lastFailNote < 120000) return;
    lastFailNote = now;
    if (G && G.notify) { try { G.notify(text, 'bad'); } catch (e) {} }
  }
  function isQuota(e) {
    return !!e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22 || e.code === 1014);
  }
  // returns null on success or 'unavailable' | 'quota' | 'error'; on a quota error retry once after
  // freeing the old save, and put the old save back if that fails too
  function write(raw) {
    var s = store(), old = null;
    if (!s) return 'unavailable';
    try { s.setItem(KEY, raw); return null; } catch (e) {
      if (!isQuota(e)) { log('write failed', e); return 'error'; }
      try { old = s.getItem(KEY); s.removeItem(KEY); s.setItem(KEY, raw); return null; } catch (e2) {
        log('write failed: storage full (' + raw.length + ' chars)', e2);
        if (old) { try { s.setItem(KEY, old); } catch (e3) { log('could not restore the previous save', e3); } }
        return 'quota';
      }
    }
  }

  // mode: 'manual' (menu) | 'auto' (timer) | 'exit' (tab hidden / closing); only failures notify
  function doSave(mode) {
    var G = FU.G;
    if (!G || !G.started) return false;
    // co-op client: this is the host's farm, never save it (manual, autosave and exit saves all come here)
    if ((FU.net && FU.net.isClient) || (FU.networld && FU.networld.clientFarm)) return false;
    if (holdAutosave && mode !== 'manual') return false;
    var now = Date.now(), t = G.time || {}, av = G.activeVehicle, prev, parts = [], extras = [], err;
    if (!gameId) gameId = newId();
    parts.push('"v":1', '"savedAt":' + now, '"gameId":' + JSON.stringify(gameId));
    parts.push('"money":' + JSON.stringify(isFinite(G.money) ? +G.money : 0));
    parts.push('"time":' + JSON.stringify({ day: isFinite(t.day) ? +t.day : 1, hour: isFinite(t.hour) ? +t.hour : 6 }));
    parts.push('"activeVehicleId":' + JSON.stringify(av && av.id != null ? av.id : null));
    function add(name, isExtra, list) {
      var s = serializePart(name), old;
      if (s === null) {
        // module missing or failed right now: keep its data from this game's previous save instead of losing it
        if (prev === undefined) { prev = readData(); if (prev && prev.gameId !== gameId) prev = null; }
        old = prev ? (isExtra ? (prev.extra || {})[name] : prev[name]) : undefined;
        if (old !== undefined && old !== null) s = stringifyPart(name, old);
      }
      if (s !== null) list.push(JSON.stringify(name) + ':' + s);
    }
    ORDER.forEach(function (n) { add(n, false, parts); });
    extraNames().forEach(function (n) { add(n, true, extras); });
    if (extras.length) parts.push('"extra":{' + extras.join(',') + '}');
    err = write('{' + parts.join(',') + '}');
    if (err) {
      failNote(err === 'quota' ? "Couldn't save: browser storage is full" : "Couldn't save", mode === 'manual');
      return false;
    }
    API.lastSaved = now;
    timer = 0;
    if (mode === 'manual') holdAutosave = false;
    return true;
  }

  function load() {
    var G = FU.G, d, money, t, day, hour, av = null;
    if (!G) return false;
    d = readData();
    if (!d) return false; // missing/corrupt -> core starts a new game
    G.activeVehicle = null;
    money = +d.money;
    G.money = isFinite(money) ? money : 20000;
    t = d.time && typeof d.time === 'object' ? d.time : {};
    day = Math.floor(+t.day); hour = +t.hour;
    G.time.day = isFinite(day) && day >= 1 ? day : 1;
    G.time.hour = isFinite(hour) ? Math.min(Math.max(hour, 0), 23.99) : 6;
    G.time.scale = 1;
    ORDER.forEach(function (n) { deserializePart(n, d[n]); });
    if (d.extra && typeof d.extra === 'object') {
      Object.keys(d.extra).forEach(function (n) { if (n !== 'save' && ORDER.indexOf(n) < 0) deserializePart(n, d.extra[n]); });
    }
    if (d.activeVehicleId != null && FU.vehicles && typeof FU.vehicles.byId === 'function') {
      try { av = FU.vehicles.byId(d.activeVehicleId) || null; } catch (e) { log('vehicles.byId failed', e); }
    }
    G.activeVehicle = av;
    // fallback in case player.js doesn't handle it: farmer hidden while driving
    try { var p = FU.player && FU.player.obj; if (p && p.mesh) p.mesh.visible = !av; } catch (e) { log('player mesh update failed', e); }
    gameId = d.gameId || ('g' + (d.savedAt || 0));
    API.lastSaved = +d.savedAt || 0;
    timer = 0;
    holdAutosave = false;
    G.emit('moneyChanged', { money: G.money, delta: 0, reason: 'load' });
    G.emit('gameLoaded', { data: d, activeVehicle: av });
    if (av) G.emit('enterVehicle', { vehicle: av, loaded: true });
    return true;
  }

  function reset() {
    var s = store();
    if (s) { try { s.removeItem(KEY); } catch (e) { log('reset failed', e); } }
    API.lastSaved = 0;
    holdAutosave = true; // an autosave / unload save must not bring the deleted game back
    timer = 0;
  }

  function exitSave() {
    var G = FU.G;
    if (!G || !G.started) return;
    if (Date.now() - API.lastSaved < 500) return; // hidden + pagehide + beforeunload fire together
    try { doSave('exit'); } catch (e) { log('exit save failed', e); }
  }

  var API = FU.save = {
    key: KEY,
    lastSaved: 0, // ms timestamp of the last successful save (or of the loaded save); 0 = none
    hasSave: function () { try { return !!readData(); } catch (e) { log('hasSave failed', e); return false; } },
    save: function () {
      try { return doSave('manual'); } catch (e) { log('save failed', e); failNote("Couldn't save", true); return false; }
    },
    load: load,
    reset: reset
  };

  FU.register({
    name: 'save', order: 98, ui: false,
    init: function (G) {
      G.on('newGame', function () { gameId = newId(); holdAutosave = false; timer = 0; });
      G.on('gameStarted', function () { holdAutosave = false; timer = 0; });
      document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') exitSave(); });
      window.addEventListener('pagehide', exitSave);
      window.addEventListener('beforeunload', exitSave);
      var d = readData();
      if (d) API.lastSaved = +d.savedAt || 0;
    },
    update: function (dt, G) {
      if (!G.started || G.paused) return;
      timer += dt;
      if (timer >= AUTOSAVE_SECONDS) {
        timer = 0;
        try { doSave('auto'); } catch (e) { log('autosave failed', e); }
      }
    }
  });
})();
