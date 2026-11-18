'use strict';
// ===== Accounts: sign in (or sign up) before playing, and cloud saves =====
// Uses the site's accounts (shooter_players, same login as Shoot & Open and the leaderboard). Your
// Unblockednite progress (coins, skins, emotes, level, stats) is saved to your account a couple of seconds
// after anything changes, and when you close the tab; signing in on another computer loads it.
// If the server can't be reached you can still play offline (saved on this browser only).
const ACCOUNT = {
  timer: 0, pending: false, offline: false,

  // ---------- the gate (shown before the game loads) ----------
  gate() {
    if (BOARD.creds()) return this.pull().then(() => {});
    return new Promise((done) => {
      const el = document.createElement('div');
      el.id = 'acct-gate';
      el.style.cssText = 'position:fixed;inset:0;z-index:100000;display:grid;place-items:center;background:radial-gradient(ellipse at 50% 20%,#1b3a8a,#070d22 70%);font:15px system-ui;color:#e8efff';
      el.innerHTML = `<div style="width:min(380px,92vw);background:#101a3a;border:1px solid #ffffff1a;border-radius:16px;padding:22px;display:grid;gap:10px">
        <h2 style="margin:0;font:900 28px system-ui;letter-spacing:.02em">UNBLOCKED<span style="color:#ffd84a">NITE</span></h2>
        <p style="margin:0 0 4px;color:#9fb4dd">Sign in to play. Your skins, coins and wins save to your account, on any computer.</p>
        <input id="acct-u" placeholder="Username" autocomplete="username" maxlength="20" style="padding:10px;border-radius:8px;border:1px solid #ffffff22;background:#0008;color:inherit;font:inherit">
        <input id="acct-p" type="password" placeholder="Password" autocomplete="current-password" style="padding:10px;border-radius:8px;border:1px solid #ffffff22;background:#0008;color:inherit;font:inherit">
        <div style="display:flex;gap:8px"><button id="acct-in" type="button" style="flex:1;padding:11px;border:0;border-radius:8px;background:#ffd84a;color:#1b1b1b;font:800 15px system-ui;cursor:pointer">Sign in</button>
        <button id="acct-up" type="button" style="flex:1;padding:11px;border:1px solid #ffd84a;border-radius:8px;background:transparent;color:#ffd84a;font:800 15px system-ui;cursor:pointer">Create account</button></div>
        <div id="acct-err" style="min-height:18px;color:#ff6b6b;font-size:13px"></div>
        <button id="acct-off" type="button" style="background:none;border:0;color:#9fb4dd;font:12px system-ui;text-decoration:underline;cursor:pointer;justify-self:center">Can't connect? Play offline (progress stays on this browser)</button>
      </div>`;
      document.body.appendChild(el);
      const $ = (id) => document.getElementById(id), err = (t) => { $('acct-err').textContent = t; };
      const finish = async () => { await this.pull(); el.remove(); done(); };
      $('acct-in').onclick = async () => { err(''); const e = await BOARD.signIn($('acct-u').value, $('acct-p').value); if (e) err(e); else finish(); };
      $('acct-up').onclick = async () => { err(''); const e = await this.signUp($('acct-u').value, $('acct-p').value); if (e) err(e); else finish(); };
      $('acct-p').onkeydown = (e) => { if (e.key === 'Enter') $('acct-in').click(); };
      $('acct-off').onclick = () => { this.offline = true; el.remove(); done(); };
    });
  },
  async signUp(u, p) {
    u = (u || '').trim();
    if (!/^[A-Za-z0-9_.]{3,20}$/.test(u)) return 'Usernames are 3-20 letters, numbers, _ or .';
    if (!p || p.length < 4) return 'Pick a password of at least 4 characters';
    try {
      const r = await fetch(`${BOARD.URL}/rest/v1/shooter_players`, { method: 'POST', headers: Object.assign({ Prefer: 'return=minimal' }, BOARD.headers()), body: JSON.stringify({ username: u, password_hash: await BOARD.hash(u, p) }) });
      if (r.status === 409) return 'That username is taken';
      if (!r.ok) return 'Could not create the account (' + r.status + ')';
      localStorage.setItem(BOARD.CREDS, JSON.stringify({ u, p }));
      PROFILE.dukeUnlock();
      this.push(true); // the new account starts with this browser's progress
      return '';
    } catch (e) { return 'Could not reach the server'; }
  },

  // ---------- cloud saves ----------
  async rpc(fn, args, keepalive) {
    const c = BOARD.creds(); if (!c) return null;
    const r = await fetch(`${BOARD.URL}/rest/v1/rpc/${fn}`, { method: 'POST', keepalive: !!keepalive, headers: BOARD.headers(), body: JSON.stringify(Object.assign({ p_user: c.u, p_hash: await BOARD.hash(c.u, c.p) }, args)) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const t = await r.text(); return t ? JSON.parse(t) : null;
  },
  // on sign-in / start: take whichever save is newer (this browser's or your account's)
  async pull() {
    try {
      const cloud = await this.rpc('unf_load', {});
      const local = PROFILE.data || {};
      if (cloud) {
        // never lose anything: start from the newer copy (a brand-new browser profile never counts as newer),
        // then keep every skin, emote and tool either copy has, and the best stats
        const cloudNewer = PROFILE.fresh || (cloud.savedAt || 0) >= (local.savedAt || 0);
        const a = cloudNewer ? cloud : local, b = cloudNewer ? local : cloud, m = Object.assign({}, a);
        const union = (k) => { const s = [...(a[k] || []), ...(b[k] || [])]; if (s.length) m[k] = [...new Set(s)]; };
        union('owned'); union('emotes'); union('tools');
        if (!PROFILE.fresh) {
          m.level = Math.max(a.level || 1, b.level || 1);
          m.stats = Object.assign({}, b.stats || {}, a.stats || {});
          for (const k in (b.stats || {})) if (typeof b.stats[k] === 'number') m.stats[k] = Math.max(m.stats[k] || 0, b.stats[k]);
        }
        m.savedAt = Date.now();
        try { localStorage.setItem('unblockednite_profile', JSON.stringify(m)); } catch (e) { /* storage unavailable */ }
        PROFILE.load();
      }
      this.push(true);
    } catch (e) { /* offline: keep this browser's copy */ }
  },
  // called by PROFILE.save: send it a moment later (several changes in a row go as one request)
  queue() {
    if (this.offline || !BOARD.creds()) return;
    this.pending = true;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.push(), 2000);
  },
  async push(now, keepalive) {
    clearTimeout(this.timer);
    if (!BOARD.creds() || this.offline) return;
    this.pending = false;
    try { await this.rpc('unf_save', { p_data: PROFILE.data }, keepalive); } catch (e) { this.pending = true; }
  },
};
// closing or hiding the tab sends anything not saved yet
document.addEventListener('visibilitychange', () => { if (document.hidden && ACCOUNT.pending) ACCOUNT.push(true, true); });
window.addEventListener('pagehide', () => { if (ACCOUNT.pending) ACCOUNT.push(true, true); });
