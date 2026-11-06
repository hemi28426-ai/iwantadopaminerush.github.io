// Farming Unblocked — cloudsave.js: cloud saves for signed-in players (Supabase RPCs fu_save / fu_load
// from farming-setup.sql via FU.account.rpc). Local saves always keep working; a missing setup is quiet.
(function () {
  'use strict';
  var FU = window.FU = window.FU || {};
  var KEY = 'farming_unblocked_save_v1';
  var PUSH_GAP = 45000;          // at most one upload every 45 s
  var SETUP_RETRY = 300000;      // after "not set up yet", retry automatically only every 5 min
  var KEEPALIVE_MAX = 60000;     // keepalive fetch bodies are limited to 64 KB
  var st = {
    status: 'off', lastSync: 0, lastPush: 0, pushing: null, pending: false, timer: null,
    pulling: null, pulled: null,          // user name whose cloud save was already compared
    pushedAt: 0,                          // savedAt of the save the cloud holds (pushed or pulled)
    seenSaved: 0, pollT: 0, setupAt: 0, setupLogged: false, errLogged: 0,
    held: null,                           // newer cloud save found mid-game: written on page unload
    hidePushed: false, chip: null, user: null
  };

  function G() { return FU.G; }
  function log(msg, e) { try { console.warn('[FU] cloudsave: ' + msg, e || ''); } catch (x) {} }
  function key() { return (FU.save && FU.save.key) || KEY; }
  function store() { try { return window.localStorage || null; } catch (e) { return null; } }
  function readRaw() { var s = store(); if (!s) return null; try { return s.getItem(key()); } catch (e) { return null; } }
  function valid(d) { return !!d && typeof d === 'object' && !Array.isArray(d) && d.v === 1; }
  function parse(raw) { if (!raw) return null; try { var d = JSON.parse(raw); return valid(d) ? d : null; } catch (e) { return null; } }
  function user() { try { return (FU.account && FU.account.user && FU.account.user()) || null; } catch (e) { return null; } }
  function signedIn() { try { return !!(FU.account && FU.account.signedIn && FU.account.signedIn() && FU.account.rpc); } catch (e) { return false; } }
  function isClient() { return !!((FU.net && FU.net.isClient) || (FU.networld && FU.networld.clientFarm)); }
  function canSync() { return signedIn() && !isClient(); }

  function setStatus(s) {
    if (st.status !== s) {
      st.status = s;
      var g = G(); if (g && g.emit) { try { g.emit('cloudSaveStatus', { status: s, lastSync: st.lastSync }); } catch (e) {} }
    }
    renderChip();
  }
  function isSetupErr(e) {
    if (!e) return false;
    if (e.status === 404) return true;
    var t = String(e.code || '') + ' ' + String(e.message || '') + ' ' + String(e.body || '') + ' ' + String(e.text || '');
    return /PGRST|HTTP 404/.test(t);
  }
  function fail(e) {
    if (isSetupErr(e)) {
      st.setupAt = Date.now();
      if (!st.setupLogged) { st.setupLogged = true; try { console.info('[FU] cloudsave: cloud saves are not set up yet (run farming-setup.sql); local saves keep working'); } catch (x) {} }
      setStatus('setup');
    } else {
      if (Date.now() - st.errLogged > 120000) { st.errLogged = Date.now(); log('sync failed', e && (e.status || e.message || e)); }
      setStatus('error');
    }
  }
  function setupWait(force) { return !force && st.status === 'setup' && Date.now() - st.setupAt < SETUP_RETRY; }

  // ---------- push ----------
  function schedule() {
    if (st.timer) return;
    var wait = Math.max(1000, PUSH_GAP - (Date.now() - st.lastPush) + 100);
    st.timer = setTimeout(function () { st.timer = null; push(false); }, wait);
  }
  function push(force, keepalive) {
    if (!canSync() || st.held) return Promise.resolve(false);
    if (setupWait(force)) return Promise.resolve(false);
    if (st.pulled !== user()) {
      // never upload before the cloud save was compared (it may be newer); retry the pull at most every 45 s
      if (st.pulling) return st.pulling.then(function () { return st.pulled === user() ? push(force, keepalive) : false; });
      if (!force && Date.now() - st.lastPush < PUSH_GAP) return Promise.resolve(false);
      st.lastPush = Date.now();
      return pull(true).then(function () { return st.pulled === user() && !st.held ? push(true, keepalive) : false; });
    }
    if (st.pushing) { st.pending = true; return st.pushing; }
    var raw = readRaw(), data = parse(raw);
    if (!data || (+data.savedAt || 0) <= st.pushedAt) return Promise.resolve(false); // nothing new
    if (!force && Date.now() - st.lastPush < PUSH_GAP) { schedule(); return Promise.resolve(false); }
    if (st.timer) { clearTimeout(st.timer); st.timer = null; }
    st.lastPush = Date.now();
    var who = user(), at = +data.savedAt || 0;
    setStatus('syncing');
    st.pushing = Promise.resolve()
      .then(function () { return FU.account.rpc('fu_save', { p_data: data }, !!keepalive && raw.length < KEEPALIVE_MAX); })
      .then(function () {
        if (user() !== who) return false;
        st.pushedAt = Math.max(st.pushedAt, at); st.lastSync = Date.now(); setStatus('saved'); return true;
      }, function (e) { fail(e); return false; })
      .then(function (ok) {
        st.pushing = null;
        if (st.pending) { st.pending = false; schedule(); }
        return ok;
      });
    return st.pushing;
  }
  function afterSave() {
    var a = FU.save && +FU.save.lastSaved; if (a) st.seenSaved = a;
    if (canSync()) push(false);
  }

  // ---------- pull ----------
  function cloudObj(res) {
    if (typeof res === 'string') { try { res = JSON.parse(res); } catch (e) { return null; } }
    if (Array.isArray(res)) res = res[0];
    if (!res || typeof res !== 'object') return null;
    var d = res.data;
    if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { return null; } }
    if (!valid(d)) return null;
    return { data: d, at: +d.savedAt || Date.parse(res.saved_at) || 0 };
  }
  function pull(force) {
    if (!canSync()) { if (!signedIn()) setStatus('off'); return Promise.resolve(false); }
    if (setupWait(force)) return Promise.resolve(false);
    if (st.pulling) return st.pulling;
    var who = user();
    setStatus('syncing');
    st.pulling = Promise.resolve()
      .then(function () { return FU.account.rpc('fu_load', {}); })
      .then(function (res) {
        if (user() !== who) return false;
        var cloud = cloudObj(res), local = parse(readRaw()), localAt = local ? (+local.savedAt || 0) : 0, g = G(), took = false;
        st.pulled = who; st.lastSync = Date.now();
        if (cloud && (!local || cloud.at > localAt)) {
          if (g && g.started && !isClient()) {
            // a farm is running: don't let it overwrite the newer cloud farm; swap it in when the page unloads
            st.held = cloud;
            if (g.notify) g.notify('☁ Your cloud farm (Day ' + ((cloud.data.time && cloud.data.time.day) || 1) + ') is newer. Quit to title to load it.', 'info');
          } else if (writeLocal(cloud)) took = true;
        } else if (cloud) st.pushedAt = Math.max(st.pushedAt, cloud.at);
        setStatus('saved');
        if (took && FU.menu && FU.menu.refresh) { try { FU.menu.refresh(); } catch (e) {} }
        if (!st.held && local && (!cloud || localAt > cloud.at) && g && g.started) push(false);
        return took;
      }, function (e) { fail(e); return false; })
      .then(function (r) { st.pulling = null; return r; });
    return st.pulling;
  }
  function writeLocal(cloud) {
    var s = store();
    if (!s) return false;
    try { s.setItem(key(), JSON.stringify(cloud.data)); } catch (e) { log('could not store the cloud save locally', e); return false; }
    st.pushedAt = Math.max(st.pushedAt, cloud.at);
    if (FU.save) FU.save.lastSaved = cloud.at;
    st.seenSaved = cloud.at;
    return true;
  }

  // ---------- title chip ----------
  function chipText() {
    if (!signedIn()) return '☁ Sign in for cloud saves';
    switch (st.status) {
      case 'syncing': return '☁ Syncing…';
      case 'setup': return '☁ Cloud saves not set up yet';
      case 'error': return '☁ Cloud save offline';
      case 'saved': return '☁ Cloud save on ✓';
      default: return '☁ Cloud save on';
    }
  }
  function renderChip() {
    var title = document.getElementById('fu-title');
    if (!title) return;
    if (!st.chip || st.chip.parentNode !== title) {
      st.chip = st.chip || document.createElement('div');
      st.chip.id = 'fu-cloud-chip';
      st.chip.style.cssText = 'position:absolute;top:14px;left:14px;z-index:2;pointer-events:none;padding:5px 11px;border-radius:999px;' +
        'font:600 12px system-ui,-apple-system,"Segoe UI",sans-serif;color:#fff;background:rgba(10,26,16,.62);' +
        'border:1px solid rgba(255,255,255,.16);box-shadow:0 2px 8px rgba(0,0,0,.25);white-space:nowrap';
      title.appendChild(st.chip);
    }
    var t = chipText();
    if (st.chip.textContent !== t) st.chip.textContent = t;
    st.chip.style.opacity = (signedIn() && (st.status === 'error' || st.status === 'setup')) ? '.7' : '1';
  }

  // ---------- account changes / page hide ----------
  function onAccount() {
    var who = user();
    if (who === st.user) { renderChip(); return; }
    st.user = who; st.pulled = null; st.pushedAt = 0; st.held = null; st.pending = false;
    if (st.timer) { clearTimeout(st.timer); st.timer = null; }
    st.status = 'off';
    if (who && !isClient()) pull(true); else setStatus('off');
    renderChip();
  }
  function onHidden() {
    var g = G();
    if (document.visibilityState !== 'hidden') { st.hidePushed = false; return; }
    if (st.hidePushed || !g || !g.started || !canSync()) return;
    st.hidePushed = true;
    push(true, true); // save.js's own hidden-save listener ran first (registered earlier)
  }
  function onUnload() {
    if (!st.held) return;
    var c = st.held; st.held = null;
    writeLocal(c); // after save.js's exit save, so Continue loads the newer cloud farm next time
  }

  FU.cloudsave = {
    status: function () { return canSync() ? st.status : 'off'; },
    get lastSync() { return st.lastSync; },
    push: function (force) { return push(!!force); },
    pull: function () { return pull(true); }
  };

  FU.register({
    name: 'cloudsave', order: 99, ui: false,
    init: function (g) {
      if (FU.save && typeof FU.save.save === 'function') {
        var orig = FU.save.save;
        FU.save.save = function () {
          var ok = orig.apply(this, arguments);
          if (ok) { try { afterSave(); } catch (e) { log('push after save failed', e); } }
          return ok;
        };
      }
      st.seenSaved = (FU.save && +FU.save.lastSaved) || 0;
      g.on('ready', function () { renderChip(); onAccount(); });
      g.on('accountChanged', onAccount);
      g.on('gameStarted', renderChip);
      document.addEventListener('visibilitychange', onHidden);
      window.addEventListener('pagehide', onUnload);
      window.addEventListener('beforeunload', onUnload);
    },
    update: function (dt, g) {
      // autosaves don't go through FU.save.save: notice them via lastSaved (checked once a second)
      st.pollT += dt;
      if (st.pollT < 1) return;
      st.pollT = 0;
      var a = FU.save && +FU.save.lastSaved;
      if (g.started && a && a > st.seenSaved) { st.seenSaved = a; if (canSync()) push(false); }
      if (!signedIn() && st.status !== 'off') setStatus('off');
    }
  });
})();
