// Farming Unblocked — nethud: online badge in the HUD's right column ("🌐 Co-op · CODE · 3 farmers",
// Host/Guest, your ping, red when the connection is bad or the host went silent) and a hold-Tab
// player list (color dot, name, host/you, ping, what they drive). Hidden offline. DOM text is only
// written when it changes.
(function () {
  'use strict';
  var G = null;

  var BAD_PING = 400;        // ms: above this the badge turns red
  var SILENT_MS = 5000;      // ms without anything from the host -> "host not responding"
  var BADGE_EVERY = 0.4;     // s between badge recomputes
  var LIST_EVERY = 0.25;     // s between list recomputes while Tab is held

  var CSS = [
    '#fu-hud .fu-nethud-badge{font-size:13px;line-height:1.4;text-align:right;border-right:3px solid #4caf50;transition:border-color .3s,background .3s}',
    '#fu-hud .fu-nethud-badge.bad{border-right-color:#e53935;background:rgba(70,18,16,.78)}',
    '#fu-hud .fu-nethud-badge .l1{font-weight:800;white-space:nowrap}',
    '#fu-hud .fu-nethud-badge .l2{font-size:12px;opacity:.85;white-space:nowrap}',
    '#fu-hud .fu-nethud-badge.bad .l2{color:#ff8a80;opacity:1;font-weight:700}',
    '#fu-hud .fu-nethud-badge .hint{display:block;font-size:11px;opacity:.6;margin-top:1px}',
    '#fu-hud .fu-nethud-badge .hint .fu-key{font-size:10px;padding:0 4px}',
    '#fu-nethud-list{position:absolute;left:50%;top:16%;transform:translateX(-50%);z-index:15;min-width:360px;max-width:92vw;box-sizing:border-box;',
    'background:rgba(20,28,23,.94);border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:12px 16px;color:#fff;',
    'font-family:system-ui,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.5);pointer-events:none}',
    '#fu-nethud-list .hd{display:flex;justify-content:space-between;align-items:baseline;gap:16px;font-weight:800;font-size:16px;margin-bottom:8px}',
    '#fu-nethud-list .hd span{font-size:12px;font-weight:600;opacity:.7}',
    '#fu-nethud-list table{border-collapse:collapse;width:100%;font-size:14px}',
    '#fu-nethud-list th{font-size:11px;font-weight:700;opacity:.6;text-align:left;text-transform:uppercase;letter-spacing:.5px;padding:0 8px 4px 0}',
    '#fu-nethud-list td{padding:4px 8px 4px 0;border-top:1px solid rgba(255,255,255,.07);white-space:nowrap}',
    '#fu-nethud-list td.nm{font-weight:700;max-width:180px;overflow:hidden;text-overflow:ellipsis}',
    '#fu-nethud-list td.pg{text-align:right;font-variant-numeric:tabular-nums}',
    '#fu-nethud-list th.pg{text-align:right}',
    '#fu-nethud-list td.dr{opacity:.85;font-size:13px}',
    '#fu-nethud-list tr.me td{background:rgba(76,175,80,.12)}',
    '#fu-nethud-list .dot{display:inline-block;width:11px;height:11px;border-radius:50%;margin-right:7px;vertical-align:-1px;box-shadow:0 0 0 2px rgba(0,0,0,.35)}',
    '#fu-nethud-list .tag{font-weight:600;font-size:11px;opacity:.7;margin-left:5px}',
    '#fu-nethud-list .ok{color:#8bf28f}#fu-nethud-list .mid{color:#ffd54f}#fu-nethud-list .bad{color:#ff8a80}'
  ].join('');

  var badge = null, l1 = null, l2 = null, listEl = null, listHd = null, listBody = null;
  var badgeT = 0, listT = 0, lastHeard = 0, listShown = false;

  function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function setText(el, s) { if (el && el._t !== s) { el._t = s; el.textContent = s; } }
  function setHTML(el, s) { if (el && el._h !== s) { el._h = s; el.innerHTML = s; } }
  function setShow(el, on) { if (el && el._s !== on) { el._s = on; el.style.display = on ? '' : 'none'; } }
  function setClass(el, c) { if (el && el.className !== c) el.className = c; }
  function mk(tag, cls, parent, html) {
    var e = document.createElement(tag); if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    if (parent) parent.appendChild(e);
    return e;
  }
  function hex(c) {
    var n = Number(c); if (!isFinite(n)) n = 0x4caf50;
    n = (n >>> 0) & 0xffffff;
    return '#' + ('000000' + n.toString(16)).slice(-6);
  }
  function net() { return FU.net || null; }
  function online() { var n = net(); return !!(n && n.online); }
  function players() {
    var n = net(), p = n && n.players, out = [];
    if (!p) return out;
    for (var k in p) if (Object.prototype.hasOwnProperty.call(p, k) && p[k]) out.push(p[k]);
    out.sort(function (a, b) {
      if (!!a.host !== !!b.host) return a.host ? -1 : 1;
      var ai = parseInt(String(a.id).replace(/\D/g, ''), 10) || 0, bi = parseInt(String(b.id).replace(/\D/g, ''), 10) || 0;
      return ai - bi;
    });
    return out;
  }
  function myPing() {
    var n = net(); if (!n || !n.players || n.myId == null) return null;
    var me = n.players[n.myId];
    return me && typeof me.ping === 'number' && isFinite(me.ping) ? Math.round(me.ping) : null;
  }
  // Newest moment we heard from the host: our own listeners, or a timestamp net.js may expose.
  function heardAt() {
    var n = net(), t = lastHeard;
    if (n) {
      var cands = [n.lastHeard, n.lastRecv, n.lastMessageAt];
      for (var i = 0; i < cands.length; i++) if (typeof cands[i] === 'number' && cands[i] > t && cands[i] <= now() + 1000) t = cands[i];
    }
    return t;
  }
  function hostSilent() {
    var n = net(); if (!n || !n.isClient) return false;
    if (typeof n.hostSilent === 'function') { try { if (n.hostSilent()) return true; } catch (e) {} }
    else if (n.hostSilent === true) return true;
    var t = heardAt();
    return t > 0 && now() - t > SILENT_MS;
  }
  function pingClass(ms) { return ms == null ? '' : ms > BAD_PING ? 'bad' : ms > 150 ? 'mid' : 'ok'; }
  function vehName(vid) {
    if (vid == null || !FU.vehicles || !FU.vehicles.byId) return '';
    var v = FU.vehicles.byId(vid); if (!v) return '';
    var def = v.def || (FU.vehicles.types && FU.vehicles.types[v.type]) || {};
    var s = def.name || v.type || 'Machine';
    if (v.attached != null && FU.implements && FU.implements.byId) {
      var imp = FU.implements.byId(v.attached);
      var idef = imp && (imp.def || (FU.implements.types && FU.implements.types[imp.type]));
      if (idef && idef.name) s += ' + ' + idef.name;
    }
    return s;
  }

  // ---------- DOM ----------
  function ensureBadge() {
    if (badge) return true;
    var col = FU.hud && FU.hud.rightColumn;
    if (!col) return false;
    badge = mk('div', 'fu-box fu-nethud-badge', col);
    l1 = mk('div', 'l1', badge);
    l2 = mk('div', 'l2', badge);
    mk('span', 'hint', badge, 'Hold <span class="fu-key">Tab</span> for players');
    badge.style.display = 'none'; badge._s = false;
    return true;
  }
  function build() {
    if (!document.getElementById('fu-nethud-style')) { var st = mk('style', null, document.head); st.id = 'fu-nethud-style'; st.textContent = CSS; }
    listEl = mk('div', null, G.ui || document.body); listEl.id = 'fu-nethud-list';
    listEl.style.display = 'none'; listEl._s = false;
    listHd = mk('div', 'hd', listEl);
    listBody = mk('div', null, listEl);
    ensureBadge();
  }

  // ---------- badge ----------
  function updateBadge() {
    if (!ensureBadge()) return;
    var on = online() && !!G.started;
    setShow(badge, on);
    if (!on) return;
    var n = net(), count = players().length || 1;
    setText(l1, '🌐 Co-op · ' + ((n.shownCode ? n.shownCode() : n.code) || '----') + ' · ' + count + (count === 1 ? ' farmer' : ' farmers'));
    var bad = false, s;
    if (n.isHost) {
      s = 'Host (you)';
    } else {
      var ms = myPing();
      if (hostSilent()) { s = 'Guest · host not responding'; bad = true; }
      else {
        s = 'Guest · ' + (ms == null ? '— ms' : ms + ' ms');
        if (ms != null && ms > BAD_PING) { s += ' · slow'; bad = true; }
      }
    }
    setText(l2, s);
    setClass(badge, bad ? 'fu-box fu-nethud-badge bad' : 'fu-box fu-nethud-badge');
  }

  // ---------- hold-Tab list ----------
  function listHTML() {
    var n = net(), ps = players(), np = {}, i;
    if (FU.netplayers && typeof FU.netplayers.list === 'function') {
      var arr = null; try { arr = FU.netplayers.list(); } catch (e) { arr = null; }
      if (arr) for (i = 0; i < arr.length; i++) if (arr[i]) np[arr[i].id] = arr[i];
    }
    var h = '<table><tr><th>Farmer</th><th>Driving</th><th class="pg">Ping</th></tr>';
    for (i = 0; i < ps.length; i++) {
      var p = ps[i], me = p.id === n.myId;
      var vid = me ? (G.activeVehicle ? G.activeVehicle.id : null) : (np[p.id] ? np[p.id].vehicleId : null);
      var drive = vehName(vid);
      var ms = (typeof p.ping === 'number' && isFinite(p.ping)) ? Math.round(p.ping) : null;
      var pingTxt = p.host ? '—' : (ms == null ? '—' : ms + ' ms'); // the host has no ping to itself
      var pc = p.host ? '' : pingClass(ms);
      if (me && n.isClient && hostSilent()) { pingTxt = 'lost'; pc = 'bad'; }
      h += '<tr' + (me ? ' class="me"' : '') + '><td class="nm"><span class="dot" style="background:' + hex(p.color) + '"></span>' +
        esc(p.name || 'Farmer') + (p.host ? '<span class="tag">(host)</span>' : '') + (me ? '<span class="tag">(you)</span>' : '') +
        '</td><td class="dr">' + (drive ? esc(drive) : '<span style="opacity:.55">on foot</span>') +
        '</td><td class="pg' + (pc ? ' ' + pc : '') + '">' + pingTxt + '</td></tr>';
    }
    return h + '</table>';
  }
  function updateList(dt) {
    var want = online() && !!G.started && !!(G.input && !G.input.blocked && G.input.down('Tab'));
    setShow(listEl, want);
    if (!want) { listShown = false; return; }
    listT -= dt;
    if (listShown && listT > 0) return;
    listShown = true; listT = LIST_EVERY;
    var n = net(), count = players().length || 1;
    setHTML(listHd, 'Co-op farm · ' + esc((n.shownCode ? n.shownCode() : n.code) || '----') + '<span>' + count + ' / 8 farmers</span>');
    setHTML(listBody, listHTML());
  }

  function heard() { lastHeard = now(); }

  FU.nethud = {
    get badge() { return badge; },
    get listEl() { return listEl; },
    lastHeard: function () { return heardAt(); },
    hostSilent: hostSilent
  };

  FU.register({
    name: 'nethud', order: 91, ui: true,
    init: function (g) {
      G = g;
      build();
      // Anything the host streams regularly proves it is alive (time 1 s, its own st ~12 Hz, vs, money).
      var n = net();
      if (n && typeof n.on === 'function') {
        var types = ['time', 'st', 'vs', 'moneyTotal', 'snapMachines', 'snapFields'];
        for (var i = 0; i < types.length; i++) { try { n.on(types[i], heard); } catch (e) {} }
      }
      var reset = function () { lastHeard = 0; badgeT = 0; listT = 0; };
      G.on('netStatus', reset);
      G.on('netJoined', function () { lastHeard = now(); badgeT = 0; });
      G.on('netLeft', function () { reset(); setShow(badge, false); setShow(listEl, false); });
      G.on('netPlayerJoin', function () { badgeT = 0; listT = 0; });
      G.on('netPlayerLeave', function () { badgeT = 0; listT = 0; });
    },
    update: function (dt) {
      if (!G) return;
      badgeT -= dt;
      if (badgeT <= 0) { badgeT = BADGE_EVERY; updateBadge(); }
      updateList(dt);
    }
  });
})();
