// Farming Unblocked — netjobs: in co-op the jobs belong to the host. The host broadcasts `jobs`
// {missions, ev} on every change (+ progress ticks, + every 10 s); clients mirror them (deserialize under
// FU.net.applyingRemote), their accept/cancel become `jobReq` {action, id}, and on clients the missions
// module's own refresh/progress/payout is switched off (its registered update is wrapped) so nobody is paid twice.
(function () {
  'use strict';
  var FU = window.FU = window.FU || {};

  var PERIOD = 10, MIN_GAP = 0.25, PROG_EVERY = 2, UI_EVERY = 2;
  var G = null, M = null, panel = null;
  var dirty = false, ev = null, reqBy = null, sinceSend = 0, progT = 0, uiT = 0;
  var lastOffers = null, lastLen = -1, lastActiveId = null, lastPct = -1;
  function actives() { return (M && M.actives) || (M && M.active ? [M.active] : []); }
  function actKey() { return actives().map(function (a) { return a.id; }).join(','); }
  function pctKey() { return actives().map(function (a) { return Math.floor((a.progress || 0) * 100); }).join(','); }

  function net() { return FU.net && FU.net.online ? FU.net : null; }
  function isClient() { var n = net(); return !!(n && n.isClient); }
  function isHost() { var n = net(); return !!(n && n.isHost); }
  function money(n) { return FU.util && FU.util.fmtMoney ? FU.util.fmtMoney(n) : '$' + Math.round(n); }
  function title(a) { try { return (M && M.title) ? M.title(a) : 'job'; } catch (e) { return 'job'; } }
  function clean(s) { return String(s == null ? '' : s).replace(/[<>]/g, '').slice(0, 120); }
  function playerName(id) { var n = FU.net, p = n && n.players && n.players[id]; return (p && p.name) || ''; }
  function myName() { return (FU.net && FU.net.name) || 'Host'; }
  function getPanel() {
    if (!panel && typeof document !== 'undefined') {
      panel = (G && G.ui && G.ui.querySelector ? G.ui.querySelector('.fu-jobs-panel') : null) ||
        document.querySelector('.fu-jobs-panel');
    }
    return panel;
  }
  function remote(fn) {
    var n = FU.net, was = n ? n.applyingRemote : false;
    if (n) n.applyingRemote = true;
    try { return fn(); } finally { if (n) n.applyingRemote = was; }
  }

  FU.netjobs = {
    mirroring: isClient,            // true while this player only mirrors the host's jobs
    push: function () { dirty = true; } // host: broadcast the jobs soon
  };

  // ---------- host ----------
  function sendNow() {
    var n = net();
    if (!n || !n.isHost || !M) return;
    var d = { missions: M.serialize(), ev: ev };
    dirty = false; ev = null; sinceSend = 0;
    lastOffers = M.offers; lastLen = M.offers.length;
    lastActiveId = actKey();
    lastPct = pctKey();
    try { if (n.broadcast) n.broadcast('jobs', d); else n.send('jobs', d); } catch (e) { /* peer gone */ }
  }
  function deny(to, text) {
    var n = net();
    if (!n || !n.sendTo || !M) return;
    try { n.sendTo(to, 'jobs', { missions: M.serialize(), ev: { kind: 'denied', text: text } }); } catch (e) { /* peer gone */ }
  }
  function onJobReq(d, from) {
    if (!isHost() || !M || !d) return;
    reqBy = playerName(from) || 'A farmer';
    try {
      if (d.action === 'accept') {
        var id = String(d.id || ''), found = false;
        for (var i = 0; i < M.offers.length; i++) if (M.offers[i] && M.offers[i].id === id) found = true;
        if (!found) deny(from, 'That job is no longer available');
        else if (!M.accept(id)) deny(from, 'That job is no longer available');
      } else if (d.action === 'cancel') {
        if (actives().length) M.cancel(d.id ? String(d.id) : undefined);
      }
    } finally { reqBy = null; }
    dirty = true;
  }
  function evOf(kind, m, by) {
    return { kind: kind, title: title(m), reward: m.reward || 0, neighbor: m.neighbor || '', by: by || '' };
  }

  // ---------- client ----------
  function touchField(id) {
    if (id == null || !FU.fields || !FU.fields.byId) return;
    var f = FU.fields.byId(id);
    if (f) G.emit('fieldChanged', { field: f, op: 'contract' });
  }
  function notifyEv(e) {
    var t = clean(e.title) || 'job', by = e.by ? ' by ' + clean(e.by) : '';
    if (e.kind === 'accepted') G.notify('Job accepted' + by + ': ' + t + ' (' + money(+e.reward || 0) + ')', 'good');
    else if (e.kind === 'cancelled') G.notify('Job cancelled' + by + ': ' + t, 'info');
    else if (e.kind === 'complete') G.notify((clean(e.neighbor) || 'The neighbor') + ' paid ' + money(+e.reward || 0) + ' for: ' + t, 'good');
    else if (e.kind === 'failed') G.notify('Job failed: ' + t + ' (time ran out)', 'bad');
    else if (e.kind === 'denied') G.notify(clean(e.text) || 'The host could not start that job', 'bad');
  }
  function applyJobs(d) {
    if (!M || !d || !d.missions || typeof d.missions !== 'object') return;
    var prev = {}; actives().forEach(function (a) { prev[a.id] = a.fieldId; });
    remote(function () {
      M.deserialize(d.missions);
      var cur = {}, changed = false;
      actives().forEach(function (a) { cur[a.id] = a.fieldId; if (!(a.id in prev)) { touchField(a.fieldId); changed = true; } });
      Object.keys(prev).forEach(function (id) { if (!(id in cur)) { touchField(prev[id]); changed = true; } });
      if (changed) G.emit('missionChanged', { active: M.active || null, remote: true });
    });
    if (d.ev && d.ev.kind) notifyEv(d.ev);
  }
  function rerender() { if (M) remote(function () { M.deserialize(M.serialize()); }); } // repaints panel + HUD box
  function hide() { var p = getPanel(); if (p) p.style.display = 'none'; }
  // replaces the missions update on clients: J panel only — no offer refresh, no progress, no payout, no deadline
  function clientUpdate(dt, g) {
    if (!g.started) return;
    var p = getPanel();
    if (g.input.pressed('KeyJ')) {
      if (g.isPanelOpen('jobs')) { g.closePanel('jobs'); hide(); }
      else if (!g.input.blocked && p) { p.style.display = 'block'; g.openPanel('jobs', hide); rerender(); }
    }
    if (p && p.style.display !== 'none' && !g.isPanelOpen('jobs')) hide();
    uiT += dt;
    if (uiT >= UI_EVERY) { uiT = 0; if (actives().length) rerender(); } // keep "time left" fresh
  }

  FU.register({
    name: 'netjobs', order: 66, ui: true,
    init: function (g) {
      G = g;
      M = FU.missions;
      if (!M) return;

      // wrap the missions module's registered update: clients only mirror (restored as soon as we're not a client)
      var mods = FU.modules || [], mod = null;
      for (var i = 0; i < mods.length; i++) if (mods[i] && mods[i].name === 'missions') { mod = mods[i]; break; }
      if (mod && typeof mod.update === 'function') {
        var prevUpdate = mod.update;
        mod.update = function (dt, gg) {
          if (isClient()) return clientUpdate(dt, gg);
          return prevUpdate.apply(this, arguments);
        };
      }

      // clients: accept/cancel/refresh go to the host
      var oAccept = M.accept, oCancel = M.cancel, oRefresh = M.refresh;
      M.accept = function (id) {
        if (isClient() && !FU.net.applyingRemote) {
          FU.net.send('jobReq', { action: 'accept', id: String(id) });
          return true;
        }
        return oAccept.apply(this, arguments);
      };
      M.cancel = function (id) {
        if (isClient() && !FU.net.applyingRemote) {
          var list = actives(); if (!list.length) return false;
          FU.net.send('jobReq', { action: 'cancel', id: String(id || list[0].id) });
          return true;
        }
        return oCancel.apply(this, arguments);
      };
      if (typeof oRefresh === 'function') {
        M.refresh = function () {
          if (isClient() && !FU.net.applyingRemote) return;
          return oRefresh.apply(this, arguments);
        };
      }
      // the panel's buttons call missions' private accept/cancel: catch them first on clients
      var p = getPanel();
      if (p) p.addEventListener('click', function (e) {
        if (!isClient()) return;
        var b = e.target && e.target.closest ? e.target.closest('[data-act]') : null;
        if (!b || b.disabled) return;
        var act = b.getAttribute('data-act');
        if (act !== 'accept' && act !== 'cancel') return;
        e.stopPropagation(); e.preventDefault();
        if (b.blur) b.blur();
        if (act === 'accept') FU.missions.accept(b.getAttribute('data-id'));
        else FU.missions.cancel(b.getAttribute('data-id'));
      }, true);

      // host: send on every change
      G.on('missionChanged', function (e) {
        if (!isHost() || !e) return;
        if (e.active) ev = evOf('accepted', e.active, reqBy || myName());
        else if (e.mission) ev = evOf('cancelled', e.mission, reqBy || myName());
        dirty = true;
      });
      G.on('missionComplete', function (e) {
        if (!isHost()) return;
        var m = e && e.mission;
        dirty = true;
        if (!m) return;
        ev = evOf('complete', m, '');
        if (FU.chat && FU.chat.system) {
          try { FU.chat.system('Job done: ' + (m.neighbor || 'A neighbor') + ' paid ' + money(m.reward || 0) + ' for ' + title(m)); } catch (x) { /* chat broken */ }
        }
      });
      G.on('missionFailed', function (e) {
        if (!isHost()) return;
        if (e && e.mission) ev = evOf('failed', e.mission, '');
        dirty = true;
      });
      G.on('netPlayerJoin', function () { dirty = true; });
      G.on('netStatus', function () { dirty = true; uiT = 0; });

      if (FU.net && FU.net.on) {
        FU.net.on('jobReq', onJobReq);
        FU.net.on('jobs', function (d) { if (isClient()) applyJobs(d); });
      }
    },
    update: function (dt) {
      if (!M || !isHost()) { sinceSend = 0; return; }
      sinceSend += dt;
      if (M.offers !== lastOffers || M.offers.length !== lastLen || actKey() !== lastActiveId) dirty = true;
      progT += dt;
      if (progT >= PROG_EVERY) {
        progT = 0;
        if (actives().length && pctKey() !== lastPct) dirty = true;
      }
      if ((dirty && sinceSend >= MIN_GAP) || sinceSend >= PERIOD) sendNow();
    }
  });
})();
