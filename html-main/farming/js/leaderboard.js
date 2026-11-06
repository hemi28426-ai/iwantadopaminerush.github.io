// Farming Unblocked — online leaderboard (Supabase REST, the site's shared accounts).
// submit() sends your farm's numbers through fu_submit_score (one row per player, overwritten),
// fetch() reads the public fu_scores table. Few, small requests: every 2 min of play, after sales
// (throttled to 30 s) and once when the page hides. Failures are quiet: status() tells the UI.
(function () {
  'use strict';
  var FU = window.FU;
  var SORTS = ['farm_value', 'earned', 'harvested'];
  var PERIOD = 120;          // seconds of play between periodic submits
  var THROTTLE = 30000;      // ms between non-forced submit attempts
  var SETUP_RETRY = 600000;  // ms between attempts while the SQL isn't set up
  var CACHE_MS = 30000;      // board cache per sort
  var TIMEOUT = 10000;       // ms before a board fetch gives up

  var playT = 0, pendingAt = 0, lastAttempt = 0, lastOkKey = '', inflight = null, hideSent = false;
  var fetchState = 'idle', submitState = 'idle';
  var cache = {}, loading = {};

  function clampInt(v, max) { v = Math.round(+v || 0); return v < 0 ? 0 : (v > max ? max : v); }
  function acct() { var A = FU.account; return A && typeof A.rpc === 'function' ? A : null; }
  function signedIn(A) {
    try { return typeof A.signedIn === 'function' ? !!A.signedIn() : !!(A.creds && A.creds()); } catch (_) { return false; }
  }
  function userName(A) { try { return A.user ? String(A.user() || '') : ''; } catch (_) { return ''; } }
  function isClient() { return !!((FU.net && FU.net.isClient) || (FU.networld && FU.networld.clientFarm)); }

  // 404 / PostgREST "not found" codes / Postgres "missing relation or function" = SQL not run yet
  function isSetupErr(status, text) {
    if (status === 404) return true;
    return /PGRST20\d|42P01|42883|Could not find the (function|table)|does not exist/i.test(String(text || ''));
  }
  function errInfo(e) {
    if (!e) return { status: 0, text: '' };
    var status = +e.status || 0, msg = String(e.message || '');
    var m = !status && /HTTP\s*(\d{3})/.exec(msg);
    if (m) status = +m[1];
    var text = [msg, e.code, e.details, e.hint, typeof e.body === 'string' ? e.body : (e.body ? JSON.stringify(e.body) : '')].join(' ');
    return { status: status, text: text };
  }

  function ownedFieldCount() {
    var s = FU.stats, n = 0;
    try {
      if (s && typeof s.ownedFields === 'function') {
        var of = s.ownedFields();
        return Array.isArray(of) ? of.length : (+of || 0);
      }
    } catch (_) {}
    var list = FU.fields && FU.fields.list;
    if (list) for (var i = 0; i < list.length; i++) if (list[i].owned) n++;
    return n;
  }

  function payload() {
    var G = FU.G, s = FU.stats, d = (s && s.data) || {}, value = G.money;
    try { if (s && typeof s.farmValue === 'function') value = s.farmValue(); } catch (_) {}
    return {
      p_value: clampInt(value, 1e9),
      p_earned: clampInt(d.earned, 1e9),
      p_harvested: clampInt(d.harvested, 1e9),
      p_fields: clampInt(ownedFieldCount(), 13)
    };
  }

  function canSubmit() {
    var G = FU.G, A = acct();
    return !!(A && G && G.started && !isClient() && signedIn(A));
  }

  // force: skip the 30 s throttle. keepalive: request survives the page closing.
  // Identical numbers are never re-sent (that would bump updated_at and lose tie rank).
  function submit(force, keepalive) {
    if (!canSubmit()) return Promise.resolve(false);
    var A = acct(), args = payload();
    var key = userName(A) + '|' + args.p_value + '|' + args.p_earned + '|' + args.p_harvested + '|' + args.p_fields;
    if (key === lastOkKey) return Promise.resolve(true);
    var now = Date.now();
    if (!keepalive) {
      if (inflight) { if (!pendingAt) pendingAt = now + THROTTLE; return inflight; }
      if (!force && submitState === 'setup' && now - lastAttempt < SETUP_RETRY) return Promise.resolve(false);
      if (!force && now - lastAttempt < THROTTLE) {
        if (!pendingAt) pendingAt = lastAttempt + THROTTLE;
        return Promise.resolve(false);
      }
    }
    lastAttempt = now; pendingAt = 0;
    var p = Promise.resolve().then(function () {
      return A.rpc('fu_submit_score', args, !!keepalive);
    }).then(function () {
      lastOkKey = key; submitState = 'ok';
      cache = {}; // your new numbers show up on the next board fetch
      return true;
    }, function (e) {
      var info = errInfo(e);
      submitState = isSetupErr(info.status, info.text) ? 'setup' : 'error';
      return false;
    }).then(function (ok) { if (inflight === p) inflight = null; return ok; });
    if (!keepalive) inflight = p;
    return p;
  }

  function finish(sort, limit, rows, state) {
    fetchState = state;
    if (state === 'ok') {
      if (submitState === 'setup') submitState = 'idle';
      cache[sort] = { at: Date.now(), limit: limit, rows: rows };
      API.lastRows = rows; API.lastSort = sort; API.lastFetchAt = Date.now();
    }
    return rows;
  }

  function cleanRow(r) {
    return {
      username: String(r.username || ''),
      farm_value: +r.farm_value || 0,
      earned: +r.earned || 0,
      harvested: +r.harvested || 0,
      fields: +r.fields || 0
    };
  }

  // → Promise(rows) sorted best first; never rejects (on failure: stale cached rows or [])
  function fetchBoard(sort, limit) {
    sort = SORTS.indexOf(sort) >= 0 ? sort : 'farm_value';
    limit = Math.max(1, Math.min(100, Math.round(+limit || 50)));
    var c = cache[sort];
    if (c && Date.now() - c.at < CACHE_MS && c.limit >= limit) {
      API.lastRows = c.rows.slice(0, limit); API.lastSort = sort;
      return Promise.resolve(API.lastRows);
    }
    var lk = sort + ':' + limit;
    if (loading[lk]) return loading[lk];
    var A = FU.account, stale = c ? c.rows.slice(0, limit) : [];
    if (!A || !A.URL || typeof A.headers !== 'function' || typeof window.fetch !== 'function') {
      fetchState = 'error';
      return Promise.resolve(stale);
    }
    var url = A.URL + '/rest/v1/fu_scores?select=username,farm_value,earned,harvested,fields&order=' + sort +
      '.desc,updated_at.asc&limit=' + limit;
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, TIMEOUT) : 0;
    var opts = { headers: A.headers() };
    if (ctl) opts.signal = ctl.signal;
    var status = 0;
    var p = window.fetch(url, opts).then(function (r) {
      status = r.status;
      return r.text();
    }).then(function (text) {
      var body = null;
      try { body = JSON.parse(text); } catch (_) {}
      if (status >= 200 && status < 300 && Array.isArray(body)) return finish(sort, limit, body.map(cleanRow), 'ok');
      fetchState = isSetupErr(status, text) ? 'setup' : 'error';
      return stale;
    }).catch(function () {
      fetchState = 'error';
      return stale;
    }).then(function (rows) {
      if (timer) clearTimeout(timer);
      delete loading[lk];
      return rows;
    });
    loading[lk] = p;
    return p;
  }

  var API = {
    SORTS: SORTS,
    lastRows: [],
    lastSort: 'farm_value',
    lastFetchAt: 0,
    submit: function (force) { return submit(!!force, false); },
    fetch: fetchBoard,
    // 'setup' (fu_scores / fu_submit_score missing: farming-setup.sql not run), 'error' (board unreachable), 'ok'
    status: function () {
      if (fetchState === 'setup' || submitState === 'setup') return 'setup';
      if (fetchState === 'error') return 'error';
      return 'ok';
    },
    submitStatus: function () { return submitState; }, // 'idle'|'ok'|'error'|'setup'
    busy: function () { for (var k in loading) return true; return false; },
    invalidate: function () { cache = {}; }
  };
  FU.leaderboard = API;

  function onHide() {
    if (hideSent) return;
    hideSent = true;
    submit(true, true);
  }

  FU.register({
    name: 'leaderboard', order: 99, ui: false,
    init: function (G) {
      G.on('sold', function () { if (canSubmit()) submit(false, false); });
      G.on('newGame', function () { playT = 0; pendingAt = 0; });
      G.on('gameLoaded', function () { playT = 0; pendingAt = 0; });
      G.on('accountChanged', function () {
        lastOkKey = ''; submitState = 'idle'; cache = {};
        if (canSubmit()) pendingAt = Date.now() + 3000;
      });
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') onHide(); else hideSent = false;
      });
      window.addEventListener('pagehide', onHide);
      window.addEventListener('pageshow', function () { hideSent = false; });
    },
    update: function (dt, G) {
      if (!G.started) return;
      playT += dt;
      if (playT >= PERIOD) { playT = 0; submit(false, false); }
      if (pendingAt && Date.now() >= pendingAt) { pendingAt = 0; submit(false, false); }
    }
  });
})();
