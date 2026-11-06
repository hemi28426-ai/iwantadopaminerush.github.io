// Farming Unblocked — accounts: the site's shared logins (same as unblockednite/src/js/board.js + account.js).
// Supabase REST, `shooter_players` accounts, the 'shooter_creds' localStorage entry {u, p} and the same
// password hash, so being signed in anywhere on the site means being signed in here (and the other way round).
// FU.account = {URL, KEY, CREDS, headers(), creds(), user(), signedIn(), hash(u,p), signIn(u,p), signUp(u,p),
// signOut(), rpc(fn, args, keepalive)}. Emits G 'accountChanged' {user} on sign in / sign out, also when another
// tab changes the saved login. Never logs or stores passwords anywhere else (no serialize: never in the farm save).
(function () {
  'use strict';
  var FU = window.FU = window.FU || {};
  var lastUser = null; // user name we last told everyone about (null = not checked yet)

  function emitChanged() {
    var u = A.user();
    lastUser = u;
    var G = FU.G;
    if (G && typeof G.emit === 'function') G.emit('accountChanged', { user: u });
  }
  // the saved login changed outside our own signIn/signUp/signOut (another tab, another site page)
  function checkExternal() {
    var u = A.user();
    if (lastUser === null) { lastUser = u; return; }
    if (u !== lastUser) emitChanged();
  }

  var A = FU.account = {
    URL: 'https://zznsfdcpondfnacherxv.supabase.co',
    KEY: 'sb_publishable_P6Xw_9hNrt-1_sKE7SsN7w_nN7eum3I',
    CREDS: 'shooter_creds',

    headers: function () {
      return { apikey: this.KEY, Authorization: 'Bearer ' + this.KEY, 'Content-Type': 'application/json' };
    },
    creds: function () {
      try {
        var c = JSON.parse(localStorage.getItem(A.CREDS) || 'null');
        return c && c.u && c.p ? c : null;
      } catch (_) { return null; }
    },
    user: function () { var c = A.creds(); return c ? c.u : ''; },
    signedIn: function () { return !!A.creds(); },
    // SHA-256 hex of p + '::shooter::' + lowercase username (identical to board.js)
    hash: async function (u, p) {
      var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(p || '') + '::shooter::' + String(u || '').toLowerCase()));
      return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    },
    // → '' on success, otherwise the error text to show
    signIn: async function (u, p) {
      u = (u || '').trim();
      if (!u || !p) return 'Enter your username and password';
      try {
        var h = await A.hash(u, p);
        var r = await fetch(A.URL + '/rest/v1/shooter_players?select=username&username=eq.' + encodeURIComponent(u) + '&password_hash=eq.' + h, { headers: A.headers() });
        var rows = await r.json();
        if (!Array.isArray(rows) || !rows.length) return 'Wrong username or password';
        localStorage.setItem(A.CREDS, JSON.stringify({ u: rows[0].username, p: p }));
      } catch (e) { return 'Could not reach the leaderboard'; }
      emitChanged();
      return '';
    },
    // → '' on success (and signed in), otherwise the error text to show
    signUp: async function (u, p) {
      u = (u || '').trim();
      if (!/^[A-Za-z0-9_.]{3,20}$/.test(u)) return 'Usernames are 3-20 letters, numbers, _ or .';
      if (!p || p.length < 4) return 'Pick a password of at least 4 characters';
      try {
        var r = await fetch(A.URL + '/rest/v1/shooter_players', {
          method: 'POST',
          headers: Object.assign({ Prefer: 'return=minimal' }, A.headers()),
          body: JSON.stringify({ username: u, password_hash: await A.hash(u, p) })
        });
        if (r.status === 409) return 'That username is taken';
        if (!r.ok) return 'Could not create the account (' + r.status + ')';
        localStorage.setItem(A.CREDS, JSON.stringify({ u: u, p: p }));
      } catch (e) { return 'Could not reach the server'; }
      emitChanged();
      return '';
    },
    signOut: function () {
      try { localStorage.removeItem(A.CREDS); } catch (_) {}
      emitChanged();
    },
    // POST /rest/v1/rpc/<fn> with p_user/p_hash added. Resolves the parsed JSON (null for an empty body, or null
    // when not signed in). Throws an Error with .status (HTTP code; 0 = network unreachable) and .code
    // (PostgREST/Postgres code like 'PGRST202' when the server sent one): 404 / PGRST = "not set up yet".
    rpc: async function (fn, args, keepalive) {
      var c = A.creds(); if (!c) return null;
      var body = JSON.stringify(Object.assign({ p_user: c.u, p_hash: await A.hash(c.u, c.p) }, args || {}));
      var r;
      try {
        // browsers reject keepalive bodies over 64 KB: big ones go as a normal request instead
        r = await fetch(A.URL + '/rest/v1/rpc/' + fn, { method: 'POST', keepalive: !!keepalive && body.length < 60000, headers: A.headers(), body: body });
      } catch (e) {
        var ne = new Error('Could not reach the server'); ne.status = 0; throw ne;
      }
      if (!r.ok) {
        var err = new Error('HTTP ' + r.status);
        err.status = r.status;
        try { var j = JSON.parse(await r.text()); if (j && j.code) err.code = String(j.code); } catch (_) {}
        throw err;
      }
      var t = await r.text();
      return t ? JSON.parse(t) : null;
    }
  };

  // another tab (Unblockednite, Shoot & Open, the hub, another farm tab) signed in or out
  try {
    window.addEventListener('storage', function (e) {
      if (!e || e.key === null || e.key === A.CREDS) checkExternal();
    });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) checkExternal(); });
  } catch (_) {}

  FU.register({
    name: 'accounts', order: 2, ui: false,
    init: function () { lastUser = A.user(); }
  });
})();
