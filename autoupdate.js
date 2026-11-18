/* Dopamine Rush auto-updater.
 * When a copy of the site is opened from a folder (file://), this keeps it up to date with no trips to Update.html:
 *  - games.html: on open, the site's own pages (games.html and the other top-level files) are checked; if there's
 *    a new version (e.g. a new game was added), it is saved and the page reloads with it.
 *  - Play: right before a game opens, that game's files (its page, its folder, and folders it uses) are updated.
 * It uses the folder picked in Update.html (or picked once from the banner here) and the same mirrors and hash
 * checks. Anything that fails or is slow just launches the copy you already have.
 * Pages: games.html loads autoupdate.js; html-main pages load ../autoupdate.js and call DRUpdate.before(path, go).
 */
(function () {
  'use strict';
  if (window.DRUpdate) return;
  var REPO = 'hemi28426-ai/iwantadopaminerush.github.io', BRANCH = 'main';
  var PAGES = 'https://hemi28426-ai.github.io/iwantadopaminerush.github.io/';
  var LOCAL_MANIFEST = '.update-manifest.json';
  var LOCAL = location.protocol === 'file:';
  var CAN = LOCAL && !!window.showDirectoryPicker && !!window.indexedDB;
  var inFrame = false;
  try { inFrame = window.parent !== window; } catch (e) { inFrame = true; }

  var REF = BRANCH, SHARDS = [];
  var SOURCES = [
    function (p, s) { return s != null && SHARDS[s] ? 'https://cdn.jsdelivr.net/gh/' + REPO + '@' + SHARDS[s] + '/' + p : null; },
    function (p) { return 'https://raw.githubusercontent.com/' + REPO + '/' + REF + '/' + p; },
    function (p) { return 'https://rawcdn.githack.com/' + REPO + '/' + REF + '/' + p; },
    function (p) { return 'https://cdn.jsdelivr.net/gh/' + REPO + '@' + REF + '/' + p; },
    function (p) { return 'https://cdn.statically.io/gh/' + REPO + '/' + REF + '/' + p; },
    function (p) { return PAGES + p; },
  ];
  var LATEST = [
    function () { return 'https://raw.githubusercontent.com/' + REPO + '/' + BRANCH + '/latest.json?t=' + Date.now(); },
    function () { return 'https://cdn.jsdelivr.net/gh/' + REPO + '@' + BRANCH + '/latest.json'; },
    function () { return PAGES + 'latest.json?t=' + Date.now(); },
    function () { return 'https://raw.githack.com/' + REPO + '/' + BRANCH + '/latest.json?t=' + Date.now(); },
  ];
  var fails = SOURCES.map(function () { return 0; });
  var enc = function (p) { return p.split('/').map(encodeURIComponent).join('/'); };

  async function get(url, ms, asText) {
    var ac = new AbortController(), t = setTimeout(function () { ac.abort(); }, ms);
    try {
      var r = await fetch(url, { signal: ac.signal, cache: asText ? 'no-store' : 'default' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return asText ? await r.text() : await r.arrayBuffer();
    } finally { clearTimeout(t); }
  }
  async function sha16(buf) {
    var h = new Uint8Array(await crypto.subtle.digest('SHA-1', buf)), s = '';
    for (var i = 0; i < 8; i++) s += h[i].toString(16).padStart(2, '0');
    return s;
  }
  async function fetchFile(path, shard, sha, size) {
    var order = SOURCES.map(function (s, i) { return i; }).sort(function (a, b) { return (fails[a] >= 6) - (fails[b] >= 6); });
    for (var k = 0; k < order.length; k++) {
      var i = order[k], url = SOURCES[i](enc(path), shard);
      if (!url) continue;
      try {
        var buf = await get(url, 30000 + (size || 0) / 50, false);
        if (sha && window.crypto && crypto.subtle && (await sha16(buf)) !== sha) throw new Error('wrong content');
        fails[i] = 0;
        return buf;
      } catch (e) { fails[i]++; }
    }
    throw new Error(path + ': every mirror failed');
  }
  async function getFile(path, e) {
    var sha = e[0], size = e[1], parts = e[2], shard = e[3];
    if (!parts) return fetchFile(path, shard, sha, size);
    var bufs = [], n = 0;
    for (var i = 0; i < parts; i++) { var b = new Uint8Array(await fetchFile('.parts/' + path + '.' + i, shard, null, 15728640)); bufs.push(b); n += b.length; }
    var out = new Uint8Array(n), o = 0;
    bufs.forEach(function (b) { out.set(b, o); o += b.length; });
    return out.buffer;
  }

  // the manifest (list of every file + hash), remembered for 3 minutes so playing several games stays quick
  var manifestP = null;
  function manifest() {
    if (manifestP) return manifestP;
    manifestP = (async function () {
      try {
        var c = JSON.parse(sessionStorage.getItem('dr-au-manifest') || 'null');
        if (c && Date.now() - c.t < 180000) { REF = c.ref; SHARDS = c.m.shards || []; return c.m; }
      } catch (e) { /* no cache */ }
      REF = BRANCH;
      for (var i = 0; i < LATEST.length; i++) {
        try { var ref = JSON.parse(await get(LATEST[i](), 6000, true)).commit; if (ref) { REF = ref; break; } } catch (e) { /* next */ }
      }
      var m = null;
      for (var j = 1; j < SOURCES.length && !m; j++) {
        try { m = JSON.parse(await get(SOURCES[j]('update-manifest.json', null), 10000, true)); } catch (e) { /* next */ }
      }
      if (!m || !m.files) throw new Error('no manifest');
      SHARDS = m.shards || [];
      try { sessionStorage.setItem('dr-au-manifest', JSON.stringify({ t: Date.now(), ref: REF, m: m })); } catch (e) { /* too big: fine */ }
      return m;
    })();
    manifestP.catch(function () { manifestP = null; });
    return manifestP;
  }

  // the folder (picked in Update.html, or from the banner here), kept by Chrome in IndexedDB
  function idb() { return new Promise(function (res, rej) { var q = indexedDB.open('dr-updater', 1); q.onupgradeneeded = function () { q.result.createObjectStore('kv'); }; q.onsuccess = function () { res(q.result); }; q.onerror = function () { rej(q.error); }; }); }
  async function kv(k, v) {
    var db = await idb();
    return new Promise(function (res) {
      var t = db.transaction('kv', v === undefined ? 'readonly' : 'readwrite'), s = t.objectStore('kv');
      if (v === undefined) { var r = s.get(k); r.onsuccess = function () { res(r.result); }; r.onerror = function () { res(null); }; }
      else { s.put(v, k); t.oncomplete = res; t.onerror = res; }
    });
  }
  async function isInstall(d) { try { await d.getFileHandle('games.html'); return true; } catch (e) { return false; } }
  // ask = true only right after a click (Chrome needs one to show the permission prompt)
  async function folder(ask) {
    var dir = await kv('dir').catch(function () { return null; });
    if (!dir) return null;
    var p = await dir.queryPermission({ mode: 'readwrite' });
    if (p !== 'granted' && ask) p = await dir.requestPermission({ mode: 'readwrite' });
    if (p !== 'granted') return null;
    return (await isInstall(dir)) ? dir : null;
  }
  async function readLocal(dir) {
    try { return JSON.parse(await (await (await dir.getFileHandle(LOCAL_MANIFEST)).getFile()).text()); } catch (e) { return { files: {} }; }
  }
  async function readText(dir, path) {
    try { var parts = path.split('/'), d = dir; for (var i = 0; i < parts.length - 1; i++) d = await d.getDirectoryHandle(parts[i]); return await (await (await d.getFileHandle(parts[parts.length - 1])).getFile()).text(); } catch (e) { return ''; }
  }
  async function writeFile(dir, path, data) {
    var parts = path.split('/'), d = dir;
    for (var i = 0; i < parts.length - 1; i++) d = await d.getDirectoryHandle(parts[i], { create: true });
    var w = await (await d.getFileHandle(parts[parts.length - 1], { create: true })).createWritable();
    await w.write(data); await w.close();
  }

  // download the changed files among paths; returns how many were updated
  var busy = Promise.resolve();
  function updateFiles(dir, m, paths, onProgress) {
    var job = busy.then(async function () {
      var local = await readLocal(dir);
      var todo = paths.filter(function (p) { var e = m.files[p]; return e && (!local.files[p] || local.files[p][0] !== e[0]); });
      if (!todo.length) return {};
      var done = 0, next = 0, ok = {};
      async function worker() {
        while (next < todo.length) {
          var p = todo[next++];
          try { await writeFile(dir, p, await getFile(p, m.files[p])); ok[p] = m.files[p]; } catch (e) { /* keep the old copy */ }
          done++; if (onProgress) onProgress(done, todo.length);
        }
      }
      await Promise.all([worker(), worker(), worker(), worker()]);
      // save what we got, re-reading first so nothing written meanwhile is lost
      local = await readLocal(dir);
      Object.keys(ok).forEach(function (p) { local.files[p] = [ok[p][0], ok[p][1]]; });
      await writeFile(dir, LOCAL_MANIFEST, JSON.stringify(local));
      return ok;
    });
    busy = job.catch(function () {});
    return job;
  }

  // a game's files: its page, the folder with the same name, and any html-main folders its page points at
  function gameFiles(m, path, html) {
    var all = Object.keys(m.files), want = {}, dirs = {};
    want[path] = 1;
    var base = path.slice(0, path.lastIndexOf('/') + 1), stem = path.slice(base.length).replace(/\.html?$/i, '');
    dirs[base + stem + '/'] = 1;
    var re = /["'`(]\.?\/?([A-Za-z0-9_\-.]+)\/[^"'`)\s]*/g, x;
    while ((x = re.exec(html || ''))) if (x[1] !== '..' && x[1] !== '.') dirs[base + x[1] + '/'] = 1;
    // shared files every game page loads
    ['site-status.js', 'duke.js', 'autoupdate.js'].forEach(function (f) { want[f] = 1; });
    all.forEach(function (f) { for (var d in dirs) if (f.indexOf(d) === 0) { want[f] = 1; break; } });
    return Object.keys(want);
  }

  // ---- small on-screen notice ----
  var box = null;
  function show(text, button, onButton) {
    if (!document.body) return;
    if (box && !button && box.firstChild) { box.firstChild.nodeValue = text; return; }
    hide();
    {
      box = document.createElement('div');
      box.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:2147483647;background:#101a3a;color:#e8efff;border:1px solid #ffd84a;border-radius:10px;padding:10px 14px;font:600 14px system-ui,sans-serif;box-shadow:0 6px 24px #0008;display:flex;gap:10px;align-items:center;max-width:92vw';
      document.body.appendChild(box);
    }
    box.textContent = text;
    if (button) {
      var b = document.createElement('button');
      b.textContent = button;
      b.style.cssText = 'background:#ffd84a;color:#1b1b1b;border:0;border-radius:7px;padding:6px 12px;font:800 13px system-ui;cursor:pointer';
      b.onclick = onButton; box.appendChild(b);
      var x = document.createElement('button');
      x.textContent = '✕'; x.style.cssText = 'background:none;border:0;color:#9fb4dd;cursor:pointer;font-size:14px';
      x.onclick = hide; box.appendChild(x);
    }
  }
  function hide() { if (box) { box.remove(); box = null; } }

  // 'html-main/../unblockednite/x.html?ubx=1' -> 'unblockednite/x.html' (paths are from the site's top folder)
  function norm(p) {
    var out = [];
    String(p).split(/[?#]/)[0].split('/').forEach(function (s) { if (s === '..') out.pop(); else if (s && s !== '.') out.push(s); });
    return out.join('/');
  }

  // ---- Play: update this game, then launch it ----
  async function runBefore(path, ask, report) {
    report = report || show;
    var dir = await folder(ask);
    if (!dir) return;
    var m = await manifest();
    if (!m.files[path]) return;
    var html = await readText(dir, path);
    var local = await readLocal(dir);
    // if the page itself changed, look at the new one for the folders it uses
    if (!local.files[path] || local.files[path][0] !== m.files[path][0]) {
      try { html = new TextDecoder().decode(await getFile(path, m.files[path])); } catch (e) { /* use ours */ }
    }
    var name = path.split('/').pop().replace(/\.html?$/i, '').replace(/-/g, ' ');
    return updateFiles(dir, m, gameFiles(m, path, html), function (d, n) { report('Updating ' + name + '… ' + d + ' / ' + n); });
  }
  // in an iframe (Unbloxed inside games.html) the top page does the work: it has the folder permission
  function askParent(path) {
    return new Promise(function (res) {
      var id = Math.random().toString(36).slice(2), t = setTimeout(function () { done(); }, 45000), heard = false;
      // no answer at all: the page around this one has no updater, so just launch
      var ack = setTimeout(function () { if (!heard) done(); }, 1500);
      function done() { clearTimeout(t); clearTimeout(ack); removeEventListener('message', on); res(); }
      function on(ev) {
        if (!ev.data) return;
        if (ev.data.drUpdateDone === id || ev.data.drUpdateProgress === id) heard = true;
        if (ev.data.drUpdateDone === id) done();
        if (ev.data.drUpdateProgress === id) show(ev.data.text);
      }
      addEventListener('message', on);
      try { window.parent.postMessage({ drUpdate: path, id: id }, '*'); } catch (e) { done(); }
    });
  }
  function before(path, launch) {
    var launched = false;
    function go() { if (launched) return; launched = true; hide(); launch(); }
    path = norm(path);
    if (!LOCAL) return go();
    show('Checking for updates…', 'Play now', go);
    var work = inFrame ? askParent(path) : (CAN ? runBefore(path, true) : Promise.resolve());
    // never hold a game back for long: the check gets 8 s, a download up to 45 s ("Play now" skips)
    var slow = setTimeout(function () { if (!box || /^Checking/.test(box.firstChild && box.firstChild.textContent || '')) go(); }, 8000);
    var cap = setTimeout(go, 45000);
    work.then(function () { clearTimeout(slow); clearTimeout(cap); go(); }, function () { clearTimeout(slow); clearTimeout(cap); go(); });
  }
  if (CAN && !inFrame) {
    addEventListener('message', function (ev) {
      var d = ev.data;
      if (!d || typeof d.drUpdate !== 'string' || !d.id) return;
      var reply = function () { try { ev.source.postMessage({ drUpdateDone: d.id }, '*'); } catch (e) { /* frame gone */ } };
      var report = function (text) { try { ev.source.postMessage({ drUpdateProgress: d.id, text: text }, '*'); } catch (e) { /* frame gone */ } };
      report('Checking for updates…');
      runBefore(norm(d.drUpdate), false, report).then(reply, reply);
    });
  }

  // ---- games.html: keep the site's own pages (and the game list) current ----
  function rootFiles(m) { return Object.keys(m.files).filter(function (f) { return f.indexOf('/') < 0 && /\.(html|js|json)$/.test(f); }); }
  async function siteCheck(ask) {
    var dir = await folder(ask);
    if (!dir) {
      if (!(await kv('dir').catch(function () { return null; }))) {
        if (localStorage.getItem('dr-au-off') !== '1') show('Turn on auto-updates so new games show up by themselves.', 'Turn on', setup);
      } else {
        show('Updates are waiting. Allow this folder so new games can download.', 'Allow', function () { hide(); siteCheck(true); });
      }
      return;
    }
    var m = await manifest(), here = location.pathname.split('/').pop() || 'games.html';
    var local = await readLocal(dir);
    var pageChanged = m.files[here] && (!local.files[here] || local.files[here][0] !== m.files[here][0]);
    var ok = await updateFiles(dir, m, rootFiles(m), pageChanged ? function (d, t) { show('Getting the newest games… ' + d + ' / ' + t); } : null);
    if (ok[here]) {
      var open = document.querySelector('#overlay.active');
      if (open) show('New games are ready.', 'Reload', function () { location.reload(); });
      else location.reload();
    } else hide();
  }
  async function setup() {
    hide();
    try {
      var d = await window.showDirectoryPicker({ id: 'dopamine-rush', mode: 'readwrite' });
      if (!(await isInstall(d))) {
        var found = null;
        for await (var e of d.values()) if (e.kind === 'directory' && await isInstall(e)) { found = e; break; }
        if (!found) { show('That isn’t the folder with games.html in it. Try again.', 'Pick folder', setup); return; }
        d = found;
      }
      await kv('dir', d);
      siteCheck(false).catch(function () { hide(); });
    } catch (e) {
      if (e && e.name === 'AbortError') { localStorage.setItem('dr-au-off', '1'); return; }
      show('This computer won’t let the page save files. Use Update.html to get updates.');
      setTimeout(hide, 6000);
    }
  }

  window.DRUpdate = { before: before, check: function () { if (CAN && !inFrame) siteCheck(false).catch(function () { hide(); }); } };
  if (CAN && !inFrame && /(^|\/)games\.html$/i.test(location.pathname)) {
    if (document.readyState === 'loading') addEventListener('DOMContentLoaded', window.DRUpdate.check); else window.DRUpdate.check();
  }
})();
