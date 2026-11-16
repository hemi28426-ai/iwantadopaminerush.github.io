// Duke Tokens: the site-wide currency (see duke-setup.sql). Shared by games.html and every game.
// Uses the shared login in localStorage 'shooter_creds' (same accounts as Farming / Fishing / Unblockednite).
(function () {
  'use strict';
  const URL = 'https://zznsfdcpondfnacherxv.supabase.co', KEY = 'sb_publishable_P6Xw_9hNrt-1_sKE7SsN7w_nN7eum3I';
  const H = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };
  const D = window.DUKE = {
    PRICE: 10,
    SKINS: [
      ['jonesy', 'Jonesy', 1, 'Free starter'], ['banana', 'Banana', 2], ['trooper', 'Stormtrooper', 2], ['spidey', 'Spider-Man', 3],
      ['cap', 'Captain America', 4], ['ironman', 'Iron Man', 4], ['strange', 'Doctor Strange', 4], ['hulk', 'Hulk', 4],
      ['thanos', 'Thanos', 4], ['doom', 'Doctor Doom', 4], ['venom', 'Venom', 4], ['kylo', 'Kylo Ren', 4],
      ['grievous', 'General Grievous', 4], ['vader', 'Darth Vader', 5], ['obiwan', 'Obi-Wan Kenobi', 5],
    ],
    state: null, // {earned, by, spent, balance, skins, equipped}
    creds() { try { const c = JSON.parse(localStorage.getItem('shooter_creds') || 'null'); return c && c.u && c.p ? c : null; } catch (_) { return null; } },
    user() { const c = D.creds(); return c ? c.u : ''; },
    async hash(u, p) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(p || '') + '::shooter::' + String(u || '').toLowerCase()));
      return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join(''); },
    async rpc(fn, args) { const c = D.creds(); if (!c) throw new Error('Log in first');
      const r = await fetch(URL + '/rest/v1/rpc/' + fn, { method: 'POST', headers: H, body: JSON.stringify(Object.assign({ p_user: c.u, p_hash: await D.hash(c.u, c.p) }, args || {})) });
      if (r.status === 404) throw new Error('Duke Tokens are not switched on yet');
      if (!r.ok) { let m = 'Server error ' + r.status; try { const j = await r.json(); if (j.message) m = j.message; } catch (_) {} throw new Error(m); }
      const j = await r.json(); if (j && typeof j === 'object' && 'balance' in j) { D.state = j; D.emit(); } return j; },
    refresh() { return D.rpc('duke_get'); },
    buy(skin) { return D.rpc('duke_buy', { p_skin: skin }); },
    equip(skin) { return D.rpc('duke_equip', { p_skin: skin }); },
    twWin() { return D.creds() ? D.rpc('duke_tw_win').catch(() => null) : Promise.resolve(null); },
    async skinOf(user) { try { const r = await fetch(URL + '/rest/v1/rpc/duke_skin_of', { method: 'POST', headers: H, body: JSON.stringify({ p_user: user }) }); return r.ok ? (await r.json()) || 'jonesy' : 'jonesy'; } catch (_) { return 'jonesy'; } },
    async signIn(u, p) { u = (u || '').trim(); if (!u || !p) return 'Enter your username and password';
      try { const r = await fetch(URL + '/rest/v1/shooter_players?select=username&username=eq.' + encodeURIComponent(u) + '&password_hash=eq.' + await D.hash(u, p), { headers: H });
        const rows = await r.json(); if (!Array.isArray(rows) || !rows.length) return 'Wrong username or password';
        localStorage.setItem('shooter_creds', JSON.stringify({ u: rows[0].username, p })); } catch (_) { return 'Could not reach the server'; } return ''; },
    signOut() { try { localStorage.removeItem('shooter_creds'); } catch (_) {} D.state = null; D.emit(); },
    subs: [], on(f) { D.subs.push(f); }, emit() { D.subs.forEach(f => { try { f(D.state); } catch (_) {} }); },
  };
})();
