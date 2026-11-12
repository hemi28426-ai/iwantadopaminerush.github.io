// Farming Unblocked — netui: the Co-op panel (host / join / invite link / player list / leave).
// Title button "Co-op with friends", pause button, key P in game. Panel name 'coop'.
(function () {
  'use strict';
  var G = null;
  var st = { open: false, busy: null, msg: '', kind: '', confirmLeave: 0, tick: 0, pendingJoin: '' };
  var el = {};
  var NO_NET = 'Online play is not available: the connection library did not load. Check your internet, or your network may block it.';

  var CSS = '' +
    '#fu-coop{z-index:35;width:450px;display:none}' +
    '#fu-coop.show{display:block}' +
    '#fu-coop .fc-x{position:absolute;right:12px;top:12px;padding:4px 10px}' +
    '#fu-coop .fc-sub{margin:-6px 0 8px}' +
    '#fu-coop .fc-sec{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:10px 12px;margin:8px 0}' +
    '#fu-coop .fc-h{font-weight:700;font-size:14px;margin-bottom:6px}' +
    '#fu-coop .fc-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}' +
    '#fu-coop .fc-in{background:rgba(0,0,0,.35);color:#fff;border:1px solid rgba(255,255,255,.22);border-radius:8px;padding:7px 10px;font:600 14px system-ui,sans-serif;outline:none;box-sizing:border-box}' +
    '#fu-coop .fc-in:focus{border-color:#4caf50}' +
    '#fu-coop .fc-in:disabled{opacity:.7}' +
    '#fu-coop .fc-name{width:100%}' +
    '#fu-coop .fc-codein{width:120px;text-transform:uppercase;letter-spacing:6px;text-align:center;font:800 20px ui-monospace,monospace}' +
    '#fu-coop .fc-code{font:800 46px/1.1 ui-monospace,monospace;letter-spacing:12px;text-align:center;color:#ffd54f;margin:2px 0 8px;padding-left:12px;user-select:all}' +
    '#fu-coop .fc-link{width:100%;margin-top:8px;font:500 12px ui-monospace,monospace}' +
    '#fu-coop .fc-list{max-height:200px;overflow:auto}' +
    '#fu-coop .fc-pl{display:flex;align-items:center;gap:8px;padding:5px 2px;border-bottom:1px solid rgba(255,255,255,.06);font-size:14px}' +
    '#fu-coop .fc-pl:last-child{border-bottom:0}' +
    '#fu-coop .fc-dot{width:12px;height:12px;border-radius:50%;flex:none;box-shadow:0 0 0 2px rgba(0,0,0,.3)}' +
    '#fu-coop .fc-pn{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '#fu-coop .fc-tag{font-size:11px;padding:1px 6px;border-radius:6px;background:rgba(255,255,255,.1)}' +
    '#fu-coop .fc-tag.h{background:rgba(255,213,79,.2);color:#ffd54f}' +
    '#fu-coop .fc-ping{font-size:12px;opacity:.7;min-width:48px;text-align:right}' +
    '#fu-coop .fc-kick{padding:3px 8px;font-size:12px}' +
    '#fu-coop .fc-status{min-height:18px;font-size:13px;margin-top:8px}' +
    '#fu-coop .fc-status.bad{color:#ff8a80}' +
    '#fu-coop .fc-status.good{color:#a5d6a7}' +
    '#fu-coop .fc-foot{margin-top:8px;text-align:center}' +
    '#fu-coop .fc-btns{display:flex;gap:8px;justify-content:flex-end;margin-top:10px}';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sfx(n) { try { if (FU.audio && FU.audio.play) FU.audio.play(n); } catch (e) {} }
  function net() { return FU.net || null; }
  function netOk() {
    var n = net(); if (!n) return false;
    try { return typeof n.available === 'function' ? !!n.available() : !!window.Peer; } catch (e) { return false; }
  }
  function online() { var n = net(); return !!(n && n.online); }
  function hasSave() { try { return !!(FU.save && FU.save.hasSave && FU.save.hasSave()); } catch (e) { return false; } }
  function acctUser() { try { return (FU.account && FU.account.user && FU.account.user()) || ''; } catch (e) { return ''; } }
  function hex(c) { var n = Number(c); if (!isFinite(n)) return '#9e9e9e'; return '#' + ('000000' + (n >>> 0).toString(16)).slice(-6); }
  function cleanCode(s) { return String(s || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4); }
  function cleanName(s) { return String(s || '').replace(/[<>"'`\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16); }
  function errText(e) {
    var FRIENDLY = {
      'peer-unavailable': 'No farm with that code. Check the code and try again.',
      'network': 'Could not reach the connection server (no internet, or the network blocks it).',
      'server-error': 'Could not reach the connection server (no internet, or the network blocks it).',
      'socket-error': 'Could not reach the connection server (no internet, or the network blocks it).',
      'socket-closed': 'The connection server closed the connection. Try again.',
      'browser-incompatible': 'This browser does not support online play.',
      'webrtc': 'Your browser or network blocked the peer connection.'
    };
    var t = e && (e.message || e.text || e.reason || (typeof e === 'string' ? e : ''));
    var ty = e && e.type ? String(e.type) : '';
    if (ty && FRIENDLY[ty] && (!t || t === ty || /^Could not connect to peer|^Lost connection to server/i.test(t))) t = FRIENDLY[ty];
    if (!t && ty) t = ty;
    return t ? String(t) : 'Something went wrong. Try again.';
  }
  function inviteLink(code) {
    try {
      var u = new URL(location.href); u.hash = ''; u.searchParams.set('join', code); return u.toString();
    } catch (e) {
      var base = String(location.href).split('#')[0].split('?')[0];
      return base + '?join=' + encodeURIComponent(code);
    }
  }

  // ---------- name ----------
  function currentName() {
    var u = acctUser(); if (u) return u;
    var n = net(); if (n && n.name) return n.name;
    try { return localStorage.getItem('fu_name') || ''; } catch (e) { return ''; }
  }
  function commitName() {
    if (!el.name) return;
    var u = acctUser(), n = net();
    if (u) { el.name.value = u; try { if (n && n.setName && n.name !== u) n.setName(u); } catch (e) {} return; }
    var v = cleanName(el.name.value);
    if (!v) { el.name.value = currentName(); return; }
    el.name.value = v;
    try { localStorage.setItem('fu_name', v); } catch (e) {}
    try { if (n && n.setName && n.name !== v) n.setName(v); } catch (e) { console.error('[FU] netui: setName failed', e); }
  }

  // ---------- DOM ----------
  function build() {
    var s = document.createElement('style'); s.id = 'fu-netui-style'; s.textContent = CSS; document.head.appendChild(s);
    var p = document.createElement('div'); p.id = 'fu-coop'; p.className = 'fu-panel fu-interactive';
    p.innerHTML =
      '<button class="fu-btn secondary fc-x" data-a="close" title="Close">✕</button>' +
      '<div class="fu-title">🚜 Co-op with friends</div>' +
      '<div class="fu-small fc-sub">Farm together: one shared farm and shared money, up to 8 farmers.</div>' +
      '<div class="fc-sec"><div class="fc-h">Your name</div>' +
        '<input class="fc-in fc-name" maxlength="16" spellcheck="false" autocomplete="off" placeholder="Farmer">' +
        '<div class="fu-small fc-namenote" style="margin-top:4px"></div></div>' +
      '<div class="fc-off">' +
        '<div class="fc-sec"><div class="fc-h">Host a co-op farm</div>' +
          '<div class="fu-small fc-hostnote" style="margin-bottom:8px"></div>' +
          '<button class="fu-btn" data-a="host">Host co-op farm</button></div>' +
        '<div class="fc-sec"><div class="fc-h">Join a friend</div>' +
          '<div class="fc-row"><input class="fc-in fc-codein" maxlength="4" spellcheck="false" autocomplete="off" placeholder="ABCD">' +
          '<button class="fu-btn" data-a="join">Join farm</button></div>' +
          '<div class="fu-small fc-joinnote" style="margin-top:6px">Ask the host for their 4-letter farm code.</div></div>' +
      '</div>' +
      '<div class="fc-on" style="display:none">' +
        '<div class="fc-sec fc-hostbox"><div class="fu-small fc-codelabel" style="text-align:center">Farm code</div>' +
          '<div class="fc-code"></div>' +
          '<div class="fc-row" style="justify-content:center"><button class="fu-btn" data-a="copy">Copy invite link</button><button class="fu-btn secondary" data-a="hidecode">🙈 Hide code</button></div>' +
          '<input class="fc-in fc-link" readonly></div>' +
        '<div class="fc-sec"><div class="fc-h">Farmers <span class="fu-small fc-count"></span></div><div class="fc-list"></div></div>' +
        '<div class="fc-btns"><button class="fu-btn danger" data-a="leave">Leave</button>' +
          '<button class="fu-btn secondary" data-a="close">Back to the farm</button></div>' +
      '</div>' +
      '<div class="fc-status"></div>' +
      '<div class="fu-small fc-foot">Press <span class="fu-key">P</span> in game to open this panel · <span class="fu-key">Esc</span> closes</div>';
    (G.ui || document.body).appendChild(p);
    el.panel = p;
    ['name', 'namenote', 'off', 'hostnote', 'codein', 'joinnote', 'on', 'hostbox', 'codelabel', 'code', 'link', 'count', 'list', 'status'].forEach(function (k) {
      el[k] = p.querySelector('.fc-' + k);
    });
    el.hostBtn = p.querySelector('[data-a="host"]');
    el.joinBtn = p.querySelector('[data-a="join"]');
    el.leaveBtn = p.querySelector('[data-a="leave"]');
    el.copyBtn = p.querySelector('[data-a="copy"]');
    el.hideBtn = p.querySelector('[data-a="hidecode"]');

    p.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('[data-a]') : null;
      if (!b || b.disabled || !p.contains(b)) return;
      var a = b.getAttribute('data-a');
      if (a !== 'close') sfx('click');
      if (a === 'close') close();
      else if (a === 'host') doHost();
      else if (a === 'join') doJoin();
      else if (a === 'copy') doCopy();
      else if (a === 'hidecode') { var hn = net(); if (hn && hn.setCodeHidden) hn.setCodeHidden(!hn.codeHidden()); render(); }
      else if (a === 'leave') doLeave();
      else if (a === 'kick') doKick(b.getAttribute('data-id'));
    });
    el.codein.addEventListener('input', function () {
      var c = cleanCode(el.codein.value);
      if (c !== el.codein.value) el.codein.value = c;
    });
    el.codein.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); doJoin(); }
      else if (e.key === 'Escape') { e.preventDefault(); close(); }
    });
    el.name.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); commitName(); el.name.blur(); }
      else if (e.key === 'Escape') { e.preventDefault(); commitName(); close(); }
    });
    el.name.addEventListener('change', commitName);
    el.name.addEventListener('blur', commitName);
    el.link.addEventListener('focus', function () { try { el.link.select(); } catch (e) {} });
  }

  // ---------- render ----------
  function setStatus(msg, kind) { st.msg = msg || ''; st.kind = kind || ''; paintStatus(); }
  function paintStatus() {
    if (!el.status) return;
    el.status.textContent = st.msg;
    el.status.className = 'fc-status' + (st.kind ? ' ' + st.kind : '');
  }
  function render() {
    if (!el.panel) return;
    var n = net(), on = online(), u = acctUser(), ok = netOk();
    // name
    if (document.activeElement !== el.name) el.name.value = currentName();
    el.name.disabled = !!u;
    el.namenote.textContent = u ? 'Signed in: your account name is used.' : 'Shown above your farmer to friends.';
    el.off.style.display = on ? 'none' : '';
    el.on.style.display = on ? '' : 'none';
    if (!on) {
      el.hostnote.textContent = G.started
        ? 'Friends join the farm you are playing now.'
        : (hasSave() ? 'Continues your saved farm, then gives you a code for friends.' : 'Starts a new farm, then gives you a code for friends.');
      el.hostBtn.textContent = st.busy === 'host' ? 'Starting…' : (G.started ? 'Host this farm' : 'Host co-op farm');
      el.joinBtn.textContent = st.busy === 'join' ? 'Joining…' : 'Join farm';
      el.hostBtn.disabled = el.joinBtn.disabled = !!st.busy || !ok;
      el.codein.disabled = !!st.busy;
      el.joinnote.textContent = G.started && !on
        ? 'Your farm is saved first. Leaving the co-op brings you back to it.'
        : 'Ask the host for their 4-letter farm code.';
      if (!ok && !st.busy && !st.msg) { st.msg = NO_NET; st.kind = 'bad'; }
    } else {
      var code = (n && n.code) || '', hid = !!(n.codeHidden && n.codeHidden());
      el.code.textContent = hid ? '••••' : code;
      el.codelabel.textContent = hid ? 'Farm code (hidden on your screen)' : (n.isHost ? 'Your farm code: share it with friends' : 'Farm code');
      el.link.value = code ? (hid ? 'Hidden: use Copy invite link' : inviteLink(code)) : '';
      if (el.hideBtn) el.hideBtn.textContent = hid ? '👁 Show code' : '🙈 Hide code';
      el.leaveBtn.textContent = Date.now() < st.confirmLeave ? 'Click again to confirm' : (n.isHost ? 'Stop hosting' : 'Leave farm');
      renderPlayers();
    }
    paintStatus();
  }
  function renderPlayers() {
    var n = net(); if (!n || !el.list) return;
    var ps = n.players || {}, ids = Object.keys(ps);
    ids.sort(function (a, b) {
      var A = ps[a] || {}, B = ps[b] || {};
      if (!!A.host !== !!B.host) return A.host ? -1 : 1;
      return String(a).localeCompare(String(b), undefined, { numeric: true });
    });
    var canKick = !!(n.isHost && typeof n.kick === 'function');
    el.count.textContent = '(' + ids.length + ' / 8)';
    el.list.innerHTML = ids.map(function (id) {
      var p = ps[id] || {}, me = id === n.myId;
      var ping = (!me && typeof p.ping === 'number' && isFinite(p.ping)) ? Math.round(p.ping) + ' ms' : '';
      return '<div class="fc-pl"><span class="fc-dot" style="background:' + hex(p.color) + '"></span>' +
        '<span class="fc-pn">' + esc(p.name || id) + '</span>' +
        (p.host ? '<span class="fc-tag h">Host</span>' : '') + (me ? '<span class="fc-tag">You</span>' : '') +
        '<span class="fc-ping">' + esc(ping) + '</span>' +
        (canKick && !me && !p.host ? '<button class="fu-btn danger fc-kick" data-a="kick" data-id="' + esc(id) + '">Kick</button>' : '') +
        '</div>';
    }).join('') || '<div class="fu-small">Waiting for farmers…</div>';
  }

  // ---------- open / close ----------
  function open() {
    if (!el.panel) return;
    if (!G.isPanelOpen('coop')) G.openPanel('coop', hide);
    st.open = true; st.confirmLeave = 0;
    if (st.msg === NO_NET && netOk()) setStatus('');
    el.panel.classList.add('show');
    render();
  }
  function hide() { // closeFn for core (Esc) — hides the DOM
    st.open = false; st.confirmLeave = 0;
    if (el.panel) el.panel.classList.remove('show');
    var a = document.activeElement; if (a && el.panel && el.panel.contains(a) && a.blur) a.blur();
  }
  function close() { G.closePanel('coop'); hide(); }
  function toggle() { if (st.open) close(); else open(); }

  // ---------- actions ----------
  function doHost() {
    var n = net();
    if (st.busy || online()) return;
    if (!n || !netOk() || typeof n.host !== 'function') { setStatus(NO_NET, 'bad'); return; }
    commitName();
    if (!G.started) {
      try { if (FU.menu && FU.menu.startGame) FU.menu.startGame(hasSave()); else G.start({ load: hasSave() }); } catch (e) { console.error('[FU] netui: start failed', e); }
      if (st.open) G.openPanel('coop', hide); // keep the panel on top after the title closes
    }
    st.busy = 'host'; setStatus('Opening your farm to friends…', ''); render();
    Promise.resolve().then(function () { return n.host(); }).then(function (code) {
      st.busy = null;
      code = code || n.code || '';
      setStatus(n.codeHidden && n.codeHidden() ? 'You are hosting! Your code is hidden: use Copy invite link to share it.' : 'You are hosting! Friends can join with code ' + code + ' or your invite link.', 'good');
      render();
    }, function (e) {
      st.busy = null; setStatus('Could not host: ' + errText(e), 'bad'); render();
    });
  }
  function doJoin() {
    var n = net();
    if (st.busy || online()) return;
    var code = cleanCode(el.codein.value); el.codein.value = code;
    if (code.length !== 4) { setStatus('Enter the 4-letter farm code from your friend.', 'bad'); try { el.codein.focus(); } catch (e) {} return; }
    if (!n || !netOk() || typeof n.join !== 'function') { setStatus(NO_NET, 'bad'); return; }
    commitName();
    if (G.started) { try { if (FU.save && FU.save.save) FU.save.save(); } catch (e) { console.error('[FU] netui: save before join failed', e); } }
    st.busy = 'join'; setStatus('Joining farm ' + code + '…', ''); render();
    Promise.resolve().then(function () { return n.join(code); }).then(function () {
      st.busy = null; setStatus('Joined farm ' + code + '. Have fun farming together!', 'good'); render();
    }, function (e) {
      st.busy = null; setStatus('Could not join: ' + errText(e), 'bad'); render();
    });
  }
  function doCopy() {
    var n = net(), code = n && n.code; if (!code) return;
    var link = inviteLink(code);
    function done() { setStatus('Invite link copied. Send it to your friends!', 'good'); }
    function fallback() {
      try { el.link.value = link; el.link.focus(); el.link.select(); var ok = document.execCommand && document.execCommand('copy'); if (ok) { done(); return; } } catch (e) {}
      setStatus('Copy the link below (Ctrl+C).', '');
      try { el.link.focus(); el.link.select(); } catch (e) {}
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(done, fallback);
      else fallback();
    } catch (e) { fallback(); }
  }
  function doLeave() {
    var n = net(); if (!n || !online()) return;
    if (Date.now() >= st.confirmLeave) { st.confirmLeave = Date.now() + 3000; render(); return; }
    st.confirmLeave = 0;
    var wasHost = !!n.isHost;
    try { if (typeof n.leave === 'function') n.leave(wasHost ? 'host stopped' : 'left'); } catch (e) { console.error('[FU] netui: leave failed', e); }
    setStatus(wasHost ? 'Co-op ended. You are playing solo.' : 'Leaving the farm…', '');
    render();
  }
  function doKick(id) {
    var n = net(); if (!n || !n.isHost || typeof n.kick !== 'function' || !id) return;
    var p = (n.players || {})[id];
    try { n.kick(id); setStatus((p && p.name ? p.name : 'Farmer') + ' was removed from the farm.', ''); } catch (e) { setStatus('Could not kick: ' + errText(e), 'bad'); }
    render();
  }

  // ---------- ?join=CODE ----------
  function readJoinParam() {
    var code = '';
    try {
      var m = /[?&]join=([^&#]*)/i.exec(location.search || '');
      if (m) code = cleanCode(decodeURIComponent(m[1]));
      if (m && window.history && history.replaceState) { // strip it so a reload doesn't reopen a stale invite
        var u = new URL(location.href); u.searchParams.delete('join');
        history.replaceState(history.state, '', u.toString());
      }
    } catch (e) {}
    return code.length === 4 ? code : '';
  }

  function init(g) {
    G = g;
    build();
    st.pendingJoin = readJoinParam();
    if (FU.menu && FU.menu.addButton) {
      FU.menu.addButton('title', { id: 'coop', label: 'Co-op with friends', order: 15, onClick: function () { open(); } });
      FU.menu.addButton('pause', {
        id: 'coop', order: 15,
        label: function () { var n = net(); return n && n.online && n.code ? 'Co-op · ' + (n.shownCode ? n.shownCode() : n.code) : 'Co-op with friends'; },
        onClick: function () { open(); }
      });
    }
    function changed() {
      try { if (FU.menu && FU.menu.refresh) FU.menu.refresh(); } catch (e) {}
      if (st.open) render();
    }
    G.on('netStatus', changed);
    G.on('netJoined', changed);
    G.on('netPlayerJoin', changed);
    G.on('netPlayerLeave', changed);
    G.on('netLeft', function (d) {
      st.busy = null;
      var r = d && d.reason ? String(d.reason) : '';
      if (st.open) setStatus(r ? 'Co-op ended: ' + r : 'Co-op ended.', r && r !== 'left' && r !== 'host stopped' ? 'bad' : '');
      changed();
    });
    G.on('accountChanged', function () {
      var u = acctUser(), n = net();
      if (u) { try { if (n && n.setName && n.name !== u) n.setName(u); } catch (e) {} }
      if (st.open) render();
    });
    G.on('ready', function () {
      if (!st.pendingJoin) return;
      var code = st.pendingJoin; st.pendingJoin = '';
      setTimeout(function () {
        open();
        if (el.codein) el.codein.value = code;
        setStatus('You were invited to farm ' + code + '. Click "Join farm" to play together.', 'good');
      }, 60);
    });
  }

  function update(dt) {
    if (!G) return;
    if (st.open && !G.isPanelOpen('coop')) hide(); // closed elsewhere (Esc / panel stack): keep DOM in sync
    if (st.open) {
      if (!G.started && G.input.pressed('Escape')) close();
      else if (G.input.pressed('KeyP') && G.started) close();
      st.tick += dt || 0;
      if (st.tick >= 1) { // refresh pings and the leave-confirm label
        st.tick = 0;
        if (online()) render();
      }
    } else if (G.started && !G.input.blocked && G.input.pressed('KeyP')) {
      open();
    }
  }

  FU.netui = { open: open, close: close, toggle: toggle, isOpen: function () { return st.open; }, render: render };
  FU.register({ name: 'netui', order: 95, ui: true, init: init, update: update });
})();
