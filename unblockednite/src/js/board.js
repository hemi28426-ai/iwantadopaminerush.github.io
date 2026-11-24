'use strict';
// ===== Win leaderboard (Supabase, the site's shared accounts) =====
// Signing in uses the same accounts and saved login as Shoot & Open (shooter_players, the
// 'shooter_creds' localStorage entry), so if you're signed in on the site you're signed in here.
// A win is sent once per match through unf_record_win, which checks the password hash server-side
// (see leaderboard-setup.sql). Only a couple of small requests per match: no realtime traffic.
const BOARD = {
  URL: 'https://zznsfdcpondfnacherxv.supabase.co',
  KEY: 'sb_publishable_P6Xw_9hNrt-1_sKE7SsN7w_nN7eum3I',
  CREDS: 'shooter_creds',
  rows: null, err: '',

  headers() { return { apikey: this.KEY, Authorization: 'Bearer ' + this.KEY, 'Content-Type': 'application/json' }; },
  creds() { try { const c = JSON.parse(localStorage.getItem(this.CREDS) || 'null'); return c && c.u && c.p ? c : null; } catch (_) { return null; } },
  user() { const c = this.creds(); return c ? c.u : ''; },
  async hash(u, p) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(p + '::shooter::' + u.toLowerCase()));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  },
  async signIn(u, p) {
    u = (u || '').trim();
    if (!u || !p) return 'Enter your username and password';
    try {
      const h = await this.hash(u, p);
      const r = await fetch(`${this.URL}/rest/v1/shooter_players?select=username&username=eq.${encodeURIComponent(u)}&password_hash=eq.${h}`, { headers: this.headers() });
      const rows = await r.json();
      if (!Array.isArray(rows) || !rows.length) return 'Wrong username or password';
      localStorage.setItem(this.CREDS, JSON.stringify({ u: rows[0].username, p }));
      PROFILE.dukeUnlock();
      return '';
    } catch (e) { return 'Could not reach the leaderboard'; }
  },
  signOut() { try { localStorage.removeItem(this.CREDS); } catch (_) {} },
  // the monthly skin vote
  async votes() { try { const r = await fetch(`${this.URL}/rest/v1/rpc/unf_vote_results`, { method: 'POST', headers: this.headers(), body: '{}' }); const j = await r.json(); return Array.isArray(j) ? j : []; } catch (e) { return []; } },
  async vote(choice) { try { await ACCOUNT.rpc('unf_vote', { p_choice: choice }); return ''; } catch (e) { return 'Could not vote'; } },
  // called once when you win a match
  async recordWin(elims) {
    const c = this.creds();
    if (!c) return;
    try {
      await fetch(`${this.URL}/rest/v1/rpc/unf_record_win`, { method: 'POST', headers: this.headers(), body: JSON.stringify({ p_user: c.u, p_hash: await this.hash(c.u, c.p), p_elims: elims | 0, p_cb: this.chromebook() }) });
    } catch (_) {}
  },
  chromebook() { return /CrOS/.test(navigator.userAgent); },
  // tab: 'wins' (all), 'cb_wins' (won on a Chromebook) or 'home_wins' (won on any other computer)
  async top(tab = 'wins') {
    try {
      const col = ['wins', 'cb_wins', 'home_wins'].includes(tab) ? tab : 'wins';
      const r = await fetch(`${this.URL}/rest/v1/unf_wins?select=username,wins,best_elims,cb_wins,home_wins&order=${col}.desc,updated_at.asc&limit=50` + (col !== 'wins' ? `&${col}=gt.0` : ''), { headers: this.headers() });
      const rows = await r.json();
      if (!Array.isArray(rows)) { this.err = 'The leaderboard is not set up yet'; return []; }
      this.err = ''; this.rows = rows;
      return rows;
    } catch (e) { this.err = 'Could not reach the leaderboard'; return []; }
  },
};
