// Unbloxed Studio cloud: publish / browse Studio games on the site's Supabase (tables from unbloxed-studio-setup.sql).
// Uses the site's shared login (localStorage 'shooter_creds' {u,p}, same hash as farming/js/accounts.js).
// window.UBXCloud = {
//   user()                         -> signed-in username or ''
//   signIn(u,p) / signUp(u,p)      -> '' on success, else error text (same accounts as the rest of the site)
//   publish({id?, name, desc, icon, thumb, map}) -> game id (throws Error with friendly .message)
//   unpublish(id)
//   list({sort:'plays'|'new', q, author, limit=24, offset=0}) -> [{id, author, name, descr, icon, thumb, plays, updated_at, local:'yes'|'old'|'no'}]
//   load(id)                       -> row incl. map from this copy of the site, or null if the player must Update
//   played(id)                     -> counts a play (fire and forget)
//   thumbFrom(canvas)              -> small WebP data URL (256x144, <20 KB) from a WebGL canvas (render with preserveDrawingBuffer or right after render)
// Loading: published games ship with the site (hourly sync -> Update.html). New ones are listed from Supabase until then.
// Supabase saving: maps are gzipped before upload, list pages cached 10 min, thumbnails and maps cached per game version,
// plays counted once per game per session.
// }
(function () {
  'use strict';
  var URL = 'https://zznsfdcpondfnacherxv.supabase.co', KEY = 'sb_publishable_P6Xw_9hNrt-1_sKE7SsN7w_nN7eum3I', CREDS = 'shooter_creds';
  function H(extra) { return Object.assign({ apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, extra || {}); }
  function creds() { try { var c = JSON.parse(localStorage.getItem(CREDS) || 'null'); return c && c.u && c.p ? c : null; } catch (_) { return null; } }
  async function hash(u, p) {
    var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(p || '') + '::shooter::' + String(u || '').toLowerCase()));
    return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }
  function friendly(status, text) {
    var m = String(text || '');
    if (status === 0) return 'Could not reach the server';
    if (status === 404 || /PGRST202|42P01|does not exist/.test(m)) return 'Publishing is not set up yet (run unbloxed-studio-setup.sql in Supabase)';
    if (/bad login/.test(m)) return 'Your login expired. Sign in again.';
    if (/publish limit/.test(m)) return 'You can publish or update 15 times a day. Try again tomorrow.';
    if (/too many games/.test(m)) return 'You can publish up to 30 games. Unpublish one first.';
    if (/map too big/.test(m)) return 'This game is too big to publish (1 MB max, about 4,000 parts)';
    if (/not your game/.test(m)) return "That game belongs to someone else";
    if (/name required/.test(m)) return 'Give your game a name';
    return 'Publish failed (' + status + ')';
  }
  async function call(path, opt) {
    var r;
    try { r = await fetch(URL + path, opt); } catch (e) { var ne = new Error(friendly(0)); ne.status = 0; throw ne; }
    var t = await r.text();
    if (!r.ok) { var err = new Error(friendly(r.status, t)); err.status = r.status; throw err; }
    return t ? JSON.parse(t) : null;
  }
  async function rpc(fn, args, auth) {
    var body = Object.assign({}, args);
    if (auth) { var c = creds(); if (!c) { var e = new Error('Sign in to publish'); e.status = 401; throw e; } body.p_user = c.u; body.p_hash = await hash(c.u, c.p); }
    return call('/rest/v1/rpc/' + fn, { method: 'POST', headers: H(), body: JSON.stringify(body) });
  }
  var LISTCOLS = 'id,author,name,descr,icon,plays,updated_at';
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (_) { return null; } }
  // on a full localStorage, drop this kind of cache and try once more
  function lsSet(k, v, prefix) {
    var t = JSON.stringify(v);
    try { localStorage.setItem(k, t); } catch (_) {
      try { Object.keys(localStorage).forEach(function (x) { if (x.indexOf(prefix) === 0) localStorage.removeItem(x); }); localStorage.setItem(k, t); } catch (_) {}
    }
  }
  // light rows straight from Supabase (no maps). Pages are cached 10 minutes; thumbnails cached per game version.
  async function listSupabase(o) {
    var q = '/rest/v1/ubx_games?select=' + LISTCOLS + '&order=' + (o.sort === 'new' || o.since ? 'updated_at.desc' : 'plays.desc,updated_at.desc') + '&limit=' + (o.limit || 24) + '&offset=' + (o.offset || 0);
    if (o.since) q += '&updated_at=gt.' + encodeURIComponent(o.since);
    if (o.author) q += '&author=eq.' + encodeURIComponent(o.author);
    if (o.q) q += '&name=ilike.*' + encodeURIComponent(String(o.q).replace(/[*,()]/g, '')) + '*';
    var lk = 'ubx_list_' + q, rows = null;
    if (!o.fresh) { var c = lsGet(lk); if (c && Date.now() - c.at < 600000) rows = c.rows; }
    if (!rows) { rows = await call(q, { headers: H() }) || []; lsSet(lk, { at: Date.now(), rows: rows }, 'ubx_list_'); }
    var need = [];
    rows.forEach(function (r) { var t = lsGet('ubx_thumb_' + r.id); if (t && t.v === r.updated_at) r.thumb = t.t; else need.push(r.id); });
    if (need.length) {
      try {
        var th = await call('/rest/v1/ubx_games?select=id,thumb,updated_at&id=in.(' + need.join(',') + ')', { headers: H() }) || [];
        th.forEach(function (t) { lsSet('ubx_thumb_' + t.id, { v: t.updated_at, t: t.thumb || '' }, 'ubx_thumb_'); rows.forEach(function (r) { if (r.id === t.id) r.thumb = t.thumb || ''; }); });
      } catch (_) {}
    }
    rows.forEach(function (r) { if (!r.thumb) r.thumb = ''; });
    return rows;
  }
  function clearLists() { try { Object.keys(localStorage).forEach(function (x) { if (x.indexOf('ubx_list_') === 0) localStorage.removeItem(x); }); } catch (_) {} }
  // ---- games shipped with the site (html-main/unbloxed/studio/games/, filled hourly by .github/workflows/studio-sync.yml) ----
  // Players get them with Update.html and play them from their own copy, so playing never touches Supabase.
  var BASE = (function () { try { var src = document.currentScript && document.currentScript.src; return src ? src.replace(/[^\/]*$/, '') + 'games/' : 'unbloxed/studio/games/'; } catch (_) { return 'unbloxed/studio/games/'; } })();
  function loadScript(src) {
    return new Promise(function (ok, bad) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { bad(new Error('missing ' + src)); }; document.head.appendChild(s); });
  }
  var localP = null;
  function localIndex() {
    if (!localP) localP = (window.UBX_LOCAL_GAMES ? Promise.resolve() : loadScript(BASE + 'index.js'))
      .then(function () { return window.UBX_LOCAL_GAMES || { synced: '1970-01-01T00:00:00+00:00', games: [] }; })
      .catch(function () { return { synced: '1970-01-01T00:00:00+00:00', games: [] }; });
    return localP;
  }
  var waiting = {};
  window.UBX_GAME_LOAD = function (row) { var w = waiting[row.id]; if (w) { delete waiting[row.id]; w(row); } };
  async function packMap(m) {
    var txt = JSON.stringify(m);
    if (typeof CompressionStream === 'undefined') return txt;
    var buf = await new Response(new Blob([txt]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
    var b = new Uint8Array(buf), s = '';
    for (var i = 0; i < b.length; i += 32768) s += String.fromCharCode.apply(null, b.subarray(i, i + 32768));
    return 'gz:' + btoa(s);
  }
  async function unpackMap(v) {
    if (v && typeof v === 'object') return v;
    v = String(v || '');
    if (v.indexOf('gz:') !== 0) return JSON.parse(v || 'null');
    var bin = atob(v.slice(3)), b = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
    return JSON.parse(await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
  }
  window.UBXCloud = {
    user: function () { var c = creds(); return c ? c.u : ''; },
    signIn: async function (u, p) {
      u = (u || '').trim(); if (!u || !p) return 'Enter your username and password';
      try {
        var rows = await call('/rest/v1/shooter_players?select=username&username=eq.' + encodeURIComponent(u) + '&password_hash=eq.' + await hash(u, p), { headers: H() });
        if (!rows || !rows.length) return 'Wrong username or password';
        localStorage.setItem(CREDS, JSON.stringify({ u: rows[0].username, p: p })); return '';
      } catch (e) { return 'Could not reach the server'; }
    },
    signUp: async function (u, p) {
      u = (u || '').trim();
      if (!/^[A-Za-z0-9_.]{3,20}$/.test(u)) return 'Usernames are 3-20 letters, numbers, _ or .';
      if (!p || p.length < 4) return 'Pick a password of at least 4 characters';
      try {
        var r = await fetch(URL + '/rest/v1/shooter_players', { method: 'POST', headers: H({ Prefer: 'return=minimal' }), body: JSON.stringify({ username: u, password_hash: await hash(u, p) }) });
        if (r.status === 409) return 'That username is taken';
        if (!r.ok) return 'Could not create the account (' + r.status + ')';
        localStorage.setItem(CREDS, JSON.stringify({ u: u, p: p })); return '';
      } catch (e) { return 'Could not reach the server'; }
    },
    // map is gzipped in the browser before upload (usually 5-10x smaller), so Supabase stores and serves far less
    publish: async function (g) {
      var mz = await packMap(g.map);
      if (mz.length > 300000) { var e = new Error('This game is too big to publish (' + ((g.map.parts || []).length) + ' parts). Try removing some parts.'); e.status = 413; throw e; }
      var id = await rpc('ubx_publish', { p_id: g.id || null, p_name: g.name, p_desc: g.desc || '', p_icon: g.icon || '🧱', p_thumb: g.thumb || '', p_map: mz }, true);
      clearLists(); return id;
    },
    unpublish: async function (id) { await rpc('ubx_unpublish', { p_id: id }, true); clearLists(); try { localStorage.removeItem('ubx_cloud_' + id); localStorage.removeItem('ubx_thumb_' + id); } catch (_) {} },
    // list(o): every published game. Games already in this copy of the site come from it (no download); games
    // published since this copy's last Update come from Supabase as a tiny list (cached 10 minutes).
    // Each row has local: 'yes' (playable), 'old' (playable, a newer version needs Update) or 'no' (Update to play).
    list: async function (o) {
      o = o || {};
      var L = await localIndex(), byId = {};
      L.games.forEach(function (g) { byId[g.id] = Object.assign({}, g, { local: 'yes', thumb: g.tx ? BASE + g.id + '.' + g.tx : '' }); });
      var fresh = [];
      try { fresh = await listSupabase({ since: L.synced, limit: 50, fresh: o.fresh }); } catch (_) {}
      fresh.forEach(function (g) { var had = byId[g.id]; byId[g.id] = Object.assign({}, g, had ? { local: 'old', plays: Math.max(g.plays || 0, had.plays) } : { local: 'no' }); });
      var all = Object.keys(byId).map(function (k) { return byId[k]; });
      if (o.author) all = all.filter(function (g) { return g.author === o.author; });
      if (o.q) { var ql = String(o.q).toLowerCase(); all = all.filter(function (g) { return g.name.toLowerCase().indexOf(ql) >= 0; }); }
      all.sort(o.sort === 'new' ? function (a, b) { return a.updated_at < b.updated_at ? 1 : -1; } : function (a, b) { return b.plays - a.plays || (a.updated_at < b.updated_at ? 1 : -1); });
      var off = o.offset || 0; return all.slice(off, off + (o.limit || 24));
    },
    // load(id) -> {id, author, name, descr, icon, updated_at, map} from this copy of the site, or null when the game
    // isn't in it yet (the player has to press Update). Never downloads from Supabase.
    load: async function (id) {
      if (!/^[0-9a-f-]{36}$/i.test(String(id || ''))) return null;
      var L = await localIndex();
      if (!L.games.some(function (g) { return g.id === id; })) return null;
      var row = await new Promise(function (ok) {
        waiting[id] = ok;
        loadScript(BASE + id + '.js').catch(function () { delete waiting[id]; ok(null); });
      });
      if (!row) return null;
      var out = Object.assign({}, row); out.map = await unpackMap(row.map); return out;
    },
    // counts at most once per game per browser session
    played: function (id) {
      try { if (sessionStorage.getItem('ubx_played_' + id)) return; sessionStorage.setItem('ubx_played_' + id, '1'); } catch (_) {}
      rpc('ubx_played', { p_id: id }, false).catch(function () {});
    },
    // 256x144 WebP (JPEG fallback), kept under ~20 KB
    thumbFrom: function (canvas) {
      try { var c = document.createElement('canvas'); c.width = 256; c.height = 144; var x = c.getContext('2d');
        var sw = canvas.width, sh = canvas.height, a = 16 / 9, w = sw, h = sw / a; if (h > sh) { h = sh; w = sh * a; }
        x.drawImage(canvas, (sw - w) / 2, (sh - h) / 2, w, h, 0, 0, 256, 144);
        for (var qq = .7; qq > .2; qq -= .15) { var d = c.toDataURL('image/webp', qq); if (d.indexOf('data:image/webp') !== 0) d = c.toDataURL('image/jpeg', qq); if (d.length < 20000) return d; }
        return '';
      } catch (e) { return ''; }
    },
    packMap: function (m) { return packMap(m); }, unpackMap: function (s) { return unpackMap(s); }
  };
})();
