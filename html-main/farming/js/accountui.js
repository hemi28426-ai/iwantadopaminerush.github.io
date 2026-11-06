// Farming Unblocked — account UI: "Sign in" / "👤 name" button on the title + pause menus and the account panel
// (sign in / create account with the Dopamine Rush login from FU.account, signed-in view with cloud save status).
// Passwords are never shown, kept or logged: the password field is cleared after every attempt and on close.
(function () {
  'use strict';
  var G = null;
  var el = {};   // layer, card, user, pass, err, cloud
  var st = { shown: false, view: '', busy: false, busyText: '', req: 0, timer: 0, lastUser: '', poll: 0, labelUser: '', cloudKey: '', downOut: false };

  var CSS = [
    '.fu-acct-layer{position:absolute;inset:0;z-index:35;display:none;background:rgba(0,0,0,.35);color:#fff;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}',
    '.fu-acct-layer.show{display:block}',
    '.fu-acct-card{width:340px;max-width:92vw;box-sizing:border-box;outline:none}',
    '.fu-acct-card .fu-title{padding-right:28px}',
    '.fu-acct-x{position:absolute;top:10px;right:12px;background:none;border:0;color:#fff;opacity:.6;font:700 22px system-ui,sans-serif;cursor:pointer;line-height:1;padding:2px 6px}',
    '.fu-acct-x:hover{opacity:1}',
    '.fu-acct-l{display:block;margin:10px 0 0;font-size:13px;opacity:.92}',
    '.fu-acct-in{display:block;width:100%;box-sizing:border-box;margin-top:4px;padding:9px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.22);background:rgba(0,0,0,.35);color:#fff;font:15px system-ui,sans-serif;outline:none}',
    '.fu-acct-in:focus{border-color:#4caf50;box-shadow:0 0 0 2px rgba(76,175,80,.3)}',
    '.fu-acct-in[readonly]{opacity:.6}',
    '.fu-acct-err{min-height:18px;margin:10px 0 2px;font-size:13px;color:#ff8a80}',
    '.fu-acct-err.wait{color:#cfe8d0}',
    '.fu-acct-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}',
    '.fu-acct-row .fu-btn{flex:1 1 auto}',
    '.fu-acct-note{margin-top:10px}',
    '.fu-acct-name{font-size:20px;font-weight:800;margin:4px 0 2px;word-break:break-all}',
    '.fu-acct-cloud{margin:12px 0 4px}',
    '.fu-acct-cloud.good{color:#a5d6a7}',
    '.fu-acct-cloud.bad{color:#ff8a80}',
    '.fu-acct-busy .fu-acct-row .fu-btn{cursor:progress}'
  ].join('\n');

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sfx(n) { try { if (FU.audio && FU.audio.play) FU.audio.play(n); } catch (e) {} }
  function acct() { return FU.account || null; }
  function user() { var a = acct(); try { return a && a.user ? String(a.user() || '') : ''; } catch (e) { return ''; } }
  function label() { var u = user(); return u ? '👤 ' + u : 'Sign in'; }
  function notify(text, kind) { if (G && G.started && G.notify) G.notify(text, kind); }
  function refreshMenu() { st.labelUser = user(); try { if (FU.menu && FU.menu.refresh) FU.menu.refresh(); } catch (e) {} }
  // '' (or anything that is not an error) = success; a non-empty string = the error text to show
  function resultError(r) {
    if (typeof r === 'string') return r;
    if (r === false) return 'Could not sign in';
    if (r && typeof r === 'object' && r.error) return String(r.error);
    return '';
  }

  // ---------- cloud save status (FU.cloudsave, optional) ----------
  function ago(t) {
    var ms = typeof t === 'number' ? t : t instanceof Date ? t.getTime() : t ? Date.parse(t) : NaN;
    if (!isFinite(ms) || ms <= 0) return '';
    if (ms < 1e9) ms = Date.now() - (performance.now() - ms); // performance.now() stamp
    else if (ms < 1e11) ms *= 1000;                            // seconds
    var s = Math.max(0, (Date.now() - ms) / 1000), d = new Date(ms);
    if (s < 45) return 'just now';
    if (s < 3600) return Math.round(s / 60) + ' min ago';
    if (s < 86400) return 'at ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return 'on ' + d.toLocaleDateString();
  }
  function cloudInfo() {
    if (FU.net && FU.net.isClient) return ['☁ Cloud save is paused while you play on a friend’s farm', ''];
    var cs = FU.cloudsave;
    if (!cs || typeof cs.status !== 'function') return ['☁ Cloud save isn’t available right now. Your local save still works.', ''];
    var s = ''; try { s = cs.status(); } catch (e) { s = 'error'; }
    if (s === 'saved') { var t = ago(cs.lastSync); return ['☁ Cloud save ✓ ' + (t ? 'synced ' + t : 'up to date'), 'good']; }
    if (s === 'syncing') return ['☁ Syncing your farm…', ''];
    if (s === 'error') return ['☁ Couldn’t reach the cloud. Your local save still works.', 'bad'];
    if (s === 'setup') return ['☁ Cloud saves aren’t set up yet. Your local save still works.', ''];
    return ['☁ Cloud save: your farm uploads the next time the game saves', ''];
  }
  function updateCloud() {
    if (!el.cloud) return;
    var c = cloudInfo(), key = c[0] + '|' + c[1];
    if (key === st.cloudKey) return;
    st.cloudKey = key; el.cloud.textContent = c[0]; el.cloud.className = 'fu-box fu-acct-cloud' + (c[1] ? ' ' + c[1] : '');
  }

  // ---------- panel ----------
  var X = '<button class="fu-acct-x" data-a="close" title="Close" aria-label="Close">×</button>';
  function render() {
    if (!el.card) return;
    if (st.view === 'form' && el.user) st.lastUser = el.user.value.trim();
    var u = user();
    el.user = el.pass = el.err = el.cloud = null; st.cloudKey = '';
    if (u) {
      st.view = 'in';
      el.card.innerHTML = X + '<div class="fu-title">Account</div>' +
        '<div class="fu-acct-name">👤 ' + esc(u) + '</div>' +
        '<div class="fu-small">Signed in with your Dopamine Rush login</div>' +
        '<div class="fu-box fu-acct-cloud"></div>' +
        '<div class="fu-acct-row"><button class="fu-btn secondary" data-a="close">Done</button>' +
        '<button class="fu-btn danger" data-a="out">Sign out</button></div>';
      el.cloud = el.card.querySelector('.fu-acct-cloud');
      updateCloud();
      return;
    }
    st.view = 'form';
    el.card.innerHTML = X + '<div class="fu-title">Sign in</div>' +
      '<div class="fu-small">Uses your Dopamine Rush login (the same account as Unblockednite and the site boards).</div>' +
      '<label class="fu-acct-l">Username<input class="fu-acct-in" data-f="user" type="text" maxlength="20" autocomplete="username" autocapitalize="off" autocorrect="off" spellcheck="false"></label>' +
      '<label class="fu-acct-l">Password<input class="fu-acct-in" data-f="pass" type="password" maxlength="128" autocomplete="current-password"></label>' +
      '<div class="fu-acct-err" role="status" aria-live="polite"></div>' +
      '<div class="fu-acct-row"><button class="fu-btn" data-a="in">Sign in</button>' +
      '<button class="fu-btn secondary" data-a="up">Create account</button></div>' +
      '<div class="fu-small fu-acct-note">Signed in, your farm is backed up to the cloud and you can make the Top Farmers board.</div>';
    el.user = el.card.querySelector('[data-f="user"]');
    el.pass = el.card.querySelector('[data-f="pass"]');
    el.err = el.card.querySelector('.fu-acct-err');
    el.user.value = st.lastUser;
    setBusy(st.busy, st.busyText);
    if (!acct()) setErr('Accounts aren’t available right now.');
  }
  function setErr(text, wait) {
    if (!el.err) return;
    el.err.textContent = text || '';
    el.err.classList.toggle('wait', !!wait);
  }
  function setBusy(on, text) {
    st.busy = !!on; st.busyText = on ? (text || '') : '';
    if (st.view !== 'form' || !el.card) return;
    var a = document.activeElement;
    if (on && a && a.tagName === 'BUTTON' && el.card.contains(a)) el.card.focus(); // keep focus (and keys) in the panel
    el.card.classList.toggle('fu-acct-busy', st.busy);
    var bs = el.card.querySelectorAll('.fu-acct-row .fu-btn');
    for (var i = 0; i < bs.length; i++) bs[i].disabled = st.busy || !acct();
    if (el.user) el.user.readOnly = st.busy;
    if (el.pass) el.pass.readOnly = st.busy;
    if (st.busy) setErr(st.busyText, true);
  }
  function submit(mode) {
    if (st.busy || st.view !== 'form' || !el.user || !el.pass) return;
    var a = acct(), up = mode === 'up', fn = a && (up ? a.signUp : a.signIn);
    if (typeof fn !== 'function') { setErr('Accounts aren’t available right now.'); return; }
    var u = el.user.value.trim();
    if (!u) { setErr('Enter your username'); el.user.focus(); return; }
    if (!el.pass.value) { setErr('Enter your password'); el.pass.focus(); return; }
    st.lastUser = u;
    var token = ++st.req, pr;
    setBusy(true, up ? 'Creating your account…' : 'Signing in…');
    try { pr = Promise.resolve(fn.call(a, u, el.pass.value)); } catch (e) { pr = Promise.reject(e); }
    clearTimeout(st.timer);
    st.timer = setTimeout(function () {
      if (token !== st.req) return;
      st.req++; // a late answer is ignored (a late success still updates the labels)
      finish('The server didn’t answer. Check your internet and try again.', up);
    }, 15000);
    pr.then(function (r) {
      var err = resultError(r);
      if (token !== st.req) { if (!err) onAccountChanged(); return; }
      finish(err, up);
    }, function (e) {
      if (token !== st.req) return;
      finish(e && e.status ? 'Server error (' + e.status + '). Try again later.' : 'Could not reach the server', up);
    });
  }
  function finish(err, up) {
    clearTimeout(st.timer); st.timer = 0;
    setBusy(false);
    if (el.pass) el.pass.value = '';
    if (err) { setErr(err); if (st.shown && el.pass) el.pass.focus(); return; }
    refreshMenu();
    if (st.shown) { render(); focusFirst(); }
    var u = user();
    if (u) notify((up ? 'Account created! ' : '') + 'Signed in as ' + u, 'good');
  }
  function signOut() {
    var a = acct(), u = user();
    try { if (a && a.signOut) a.signOut(); } catch (e) {}
    st.lastUser = u;
    refreshMenu();
    if (st.shown) { render(); focusFirst(); }
    notify('Signed out', 'info');
  }
  function onAccountChanged() { refreshMenu(); if (st.shown) render(); }

  function focusFirst() {
    try {
      if (st.view === 'form' && el.user && el.pass) (el.user.value ? el.pass : el.user).focus();
      else el.card.focus();
    } catch (e) {}
  }
  function open() {
    if (!G || !el.layer) return;
    st.shown = true; el.layer.classList.add('show');
    G.openPanel('account', hide); // core pops it on Esc (when focus is outside the panel) and calls hide
    render(); focusFirst();
  }
  function hide() {
    if (!el.layer) return;
    if (st.view === 'form' && el.user) st.lastUser = el.user.value.trim();
    if (el.pass) el.pass.value = '';
    st.shown = false; el.layer.classList.remove('show');
    var a = document.activeElement; if (a && el.layer.contains(a) && a.blur) a.blur();
  }
  function close() { hide(); if (G) G.closePanel('account'); }
  function act(a) {
    if (a === 'close') close();
    else if (a === 'in' || a === 'up') submit(a);
    else if (a === 'out') signOut();
  }

  // While the panel is open it owns the keyboard: Enter submits, Esc closes, Tab stays inside, and no key reaches the
  // game, the title menu (Enter = Continue) or other hotkeys. Default actions (typing) are untouched.
  function onKey(e) {
    if (!st.shown) return;
    e.stopPropagation();
    var k = e.key || '', c = e.code || '';
    if (k === 'Escape' || c === 'Escape') { e.preventDefault(); close(); return; }
    if (k === 'Enter' || c === 'Enter' || c === 'NumpadEnter') {
      var t = e.target;
      if (t && t.tagName === 'BUTTON' && el.card.contains(t)) return; // a focused button activates itself
      e.preventDefault();
      if (e.repeat) return;
      if (st.view === 'form') submit('in'); else close();
      return;
    }
    if (k === 'Tab') {
      var f = el.card.querySelectorAll('input,button:not([disabled])');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1], a = document.activeElement;
      if (!el.card.contains(a) || (e.shiftKey ? (a === first || a === el.card) : a === last)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
    }
  }

  function build() {
    var s = document.createElement('style'); s.id = 'fu-accountui-style'; s.textContent = CSS;
    document.head.appendChild(s);
    el.layer = document.createElement('div'); el.layer.className = 'fu-acct-layer fu-interactive';
    el.card = document.createElement('div'); el.card.className = 'fu-panel fu-acct-card'; el.card.tabIndex = -1;
    el.card.setAttribute('role', 'dialog'); el.card.setAttribute('aria-label', 'Account');
    el.layer.appendChild(el.card);
    (G.ui || document.body).appendChild(el.layer);
    el.layer.addEventListener('mousedown', function (e) { st.downOut = e.target === el.layer; });
    el.layer.addEventListener('click', function (e) {
      if (e.target === el.layer) { if (st.downOut) close(); return; } // click on the dim backdrop closes
      var b = e.target && e.target.closest ? e.target.closest('[data-a]') : null;
      if (!b || b.disabled || !el.card.contains(b)) return;
      sfx('click'); act(b.getAttribute('data-a'));
    });
    window.addEventListener('keydown', onKey, true);
  }

  function init(g) {
    G = g;
    build();
    st.labelUser = user();
    if (FU.menu && FU.menu.addButton) {
      FU.menu.addButton('title', { id: 'account', order: 20, label: label, onClick: open });
      FU.menu.addButton('pause', { id: 'account', order: 20, label: label, onClick: open });
    }
    G.on('accountChanged', onAccountChanged);
  }
  function update(dt) {
    if (st.shown && !G.isPanelOpen('account')) hide(); // panel removed elsewhere: keep the DOM in sync
    st.poll -= dt;
    if (st.poll > 0) return;
    st.poll = 0.5;
    if (user() !== st.labelUser) onAccountChanged(); // changed without an event (e.g. another tab)
    else if (st.shown && st.view === 'in') updateCloud();
  }

  FU.accountui = { open: open, close: close, isOpen: function () { return st.shown; } };
  FU.register({ name: 'accountui', order: 95, ui: true, init: init, update: update });
})();
