// Fishing Unblocked: the site's shared logins (same accounts, hash and 'shooter_creds' entry as Farming Unblocked
// and Unblockednite) + cloud saves via the fish_save / fish_load RPCs from fishing/fishing-setup.sql.
// Passwords are only kept in the shared 'shooter_creds' entry, never in the fishing save.
(function () {
  'use strict';
  const A = window.FISHACC = {
    URL: 'https://zznsfdcpondfnacherxv.supabase.co',
    KEY: 'sb_publishable_P6Xw_9hNrt-1_sKE7SsN7w_nN7eum3I',
    CREDS: 'shooter_creds',
    status: 'off', // off | syncing | saved | setup | error
    headers() { return { apikey: A.KEY, Authorization: 'Bearer ' + A.KEY, 'Content-Type': 'application/json' }; },
    creds() { try { const c = JSON.parse(localStorage.getItem(A.CREDS) || 'null'); return c && c.u && c.p ? c : null; } catch (_) { return null; } },
    user() { const c = A.creds(); return c ? c.u : ''; },
    async hash(u, p) { const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(p || '') + '::shooter::' + String(u || '').toLowerCase()));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''); },
    async signIn(u, p) { u = (u || '').trim(); if (!u || !p) return 'Enter your username and password';
      try { const h = await A.hash(u, p); const r = await fetch(A.URL + '/rest/v1/shooter_players?select=username&username=eq.' + encodeURIComponent(u) + '&password_hash=eq.' + h, { headers: A.headers() });
        const rows = await r.json(); if (!Array.isArray(rows) || !rows.length) return 'Wrong username or password';
        localStorage.setItem(A.CREDS, JSON.stringify({ u: rows[0].username, p })); } catch (e) { return 'Could not reach the server'; } return ''; },
    async signUp(u, p) { u = (u || '').trim(); if (!/^[A-Za-z0-9_.]{3,20}$/.test(u)) return 'Usernames are 3-20 letters, numbers, _ or .'; if (!p || p.length < 4) return 'Pick a password of at least 4 characters';
      try { const r = await fetch(A.URL + '/rest/v1/shooter_players', { method: 'POST', headers: Object.assign({ Prefer: 'return=minimal' }, A.headers()), body: JSON.stringify({ username: u, password_hash: await A.hash(u, p) }) });
        if (r.status === 409) return 'That username is taken'; if (!r.ok) return 'Could not create the account (' + r.status + ')';
        localStorage.setItem(A.CREDS, JSON.stringify({ u, p })); } catch (e) { return 'Could not reach the server'; } return ''; },
    signOut() { try { localStorage.removeItem(A.CREDS); } catch (_) {} A.status = 'off'; A.lastAt = 0; A.fails = 0; A.refused = A.told = false; },
    async rpc(fn, args, keepalive) { const c = A.creds(); if (!c) return null;
      const body = JSON.stringify(Object.assign({ p_user: c.u, p_hash: await A.hash(c.u, c.p) }, args || {}));
      let r; try { r = await fetch(A.URL + '/rest/v1/rpc/' + fn, { method: 'POST', keepalive: !!keepalive && body.length < 60000, headers: A.headers(), body }); }
      catch (e) { const ne = new Error('offline'); ne.status = 0; throw ne; }
      if (!r.ok) { const er = new Error('HTTP ' + r.status); er.status = r.status; throw er; }
      const t = await r.text(); return t ? JSON.parse(t) : null; },
    // cloud: load returns {data, savedAt} | null; 404 = SQL not run yet
    async load() { try { A.status = 'syncing'; const j = await A.rpc('fish_load', {}); A.status = 'saved'; A.lastAt = j && Date.parse(j.saved_at) || 0; return j && j.data ? { data: j.data, savedAt: A.lastAt } : null; }
      catch (e) { A.status = e.status === 404 ? 'setup' : 'error'; if (e.status === 404) console.info('[Fishing] cloud saves are not set up yet (run fishing/fishing-setup.sql); local saves keep working'); return undefined; } },
    // fish_save returns now() when it saved, or the cloud copy's unchanged saved_at when it refused (less progress than the cloud).
    // lastAt is the newest saved_at seen (load or save), so a reply that is not newer means "refused". onRefused / onTrouble are set by the game
    // and are each called once a session: refused, or 3 failed saves in a row.
    lastPush: 0, timer: null, lastAt: 0, fails: 0, refused: false, told: false, onRefused: null, onTrouble: null,
    push(data, now) { if (!A.creds() || A.status === 'setup') return; const go = () => { A.timer = null; A.lastPush = Date.now(); A.status = 'syncing';
        A.rpc('fish_save', { p_data: data() }, !!now).then(r => { A.fails = 0; const t = Date.parse(r) || 0;
          if (t && A.lastAt && t <= A.lastAt) { A.status = 'refused'; if (!A.refused) { A.refused = true; if (A.onRefused) A.onRefused(); } return; }
          if (t) A.lastAt = t; A.status = 'saved'; })
        .catch(e => { A.status = e.status === 404 ? 'setup' : 'error'; if (e.status !== 404 && ++A.fails >= 3 && !A.told) { A.told = true; if (A.onTrouble) A.onTrouble(); } }); };
      if (now) { go(); return; } if (A.timer) return; A.timer = setTimeout(go, Math.max(1500, 30000 - (Date.now() - A.lastPush))); },
    // the player chose to keep this device's progress over the cloud copy (fishing.sql: fish_save_force). Returns '' or an error message.
    async force(data) { try { const t = Date.parse(await A.rpc('fish_save_force', { p_data: data })) || 0; if (t) A.lastAt = t; A.refused = false; A.status = 'saved'; return ''; }
      catch (e) { return e.status === 404 ? 'The cloud needs an update first (fishing.sql)' : 'Could not reach the server'; } },
  };
})();
