// Farming Unblocked — town: the 🌎 Main Server. One shared world anyone can join (peer-to-peer play, fixed code FARM,
// up to 16 farmers). The world has exactly ONE save, in Supabase (fu_main_load / fu_main_save, farming-mainserver.sql):
// whoever opens the Main Server while nobody is online hosts it and loads that save; only the host writes it (every
// 20 s, on leaving, on closing the tab). Every save names the version it was based on and the database refuses
// older ones, so nobody's old or fresh copy can replace the shared world. When the host drops, the farmer who takes
// over may use their own in-memory copy only if it is based on the newest saved version.
// Every new citizen gets a free starter kit. Citizens vote (V = Town Hall) on laws: harvest bonus, road speed
// limit, fast-forward, weaponry, purchase cap, welcome grant, mayor, town rules. Every vote stays open 10 minutes.
(function () {
  'use strict';
  var FU = window.FU = window.FU || {};
  var CODE = 'FARM', MAX = 16, CACHE = 'fu_main_world', FLAG = 'fu_main', STASH = 'fu_main_stash', VOTE_MS = 10 * 60 * 1000, SAVE_EVERY = 20;
  var KIT = [['vehicle', 'pickup'], ['vehicle', 'tractor_s'], ['vehicle', 'combine_s'], ['implement', 'cultivator_3m'], ['implement', 'seeder_3m'], ['implement', 'trailer_12k']];
  var KINDS = {
    bonus: { label: 'Harvest bonus', opts: [0, 10, 25], show: function (v) { return v ? '+' + v + '% on all grain sales' : 'None'; } },
    speed: { label: 'Road speed limit', opts: [0, 30, 50], show: function (v) { return v ? v + ' km/h on roads' : 'No limit'; } },
    ff: { label: 'Fast-forward (T)', opts: [1, 0], show: function (v) { return v ? 'Allowed' : 'Banned'; } },
    weaponry: { label: 'Weaponry (Arms Dealer weapons)', opts: [1, 0], show: function (v) { return v ? 'Allowed' : 'Banned'; } },
    cap: { label: 'Purchase cap', opts: [0, 100000, 250000], show: function (v) { return v ? 'Nothing over $' + v.toLocaleString('en-US') : 'No cap'; } },
    grant: { label: 'Welcome grant', opts: [0, 10000, 50000], show: function (v) { return v ? '$' + v.toLocaleString('en-US') + ' to the treasury per new citizen' : 'None'; } },
    mayor: { label: 'Elect a mayor', opts: null, show: function (v) { return v || 'Nobody'; } },
    rule: { label: 'New town rule', opts: null, show: function (v) { return v; } },
    repeal: { label: 'Repeal a rule', opts: null, show: function (v) { return v; } }
  };
  var BAD = /\b(fuck|shit|bitch|cunt|nigg|fag|retard|dick|pussy|whore|slut)\w*/gi;

  var G = null, T = fresh(), cacheT = 0, hostT = 0, joining = false, el = {}, isOpen = false, ends = {};
  function fresh() { return { laws: { bonus: 0, speed: 0, ff: 1, weaponry: 1, cap: 0, grant: 0 }, mayor: '', rules: [], citizens: {}, props: [], log: [], next: 1 }; }
  function N() { return FU.net; }
  function main() { return API.main && N() && N().online; }
  function isHost() { return main() && N().isHost; }
  function isClient() { return main() && N().isClient; }
  function myName() { return (N() && N().name) || 'Farmer'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clean(s) { return String(s || '').replace(/[\u0000-\u001f<>]/g, '').replace(BAD, '***').replace(/\s+/g, ' ').trim().slice(0, 100); }
  function fmt(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  function sys(t) { try { if (FU.chat && FU.chat.system) FU.chat.system(t); } catch (e) {} }
  function remote(fn) { var n = N(), p = n ? n.applyingRemote : false; if (n) n.applyingRemote = true; try { return fn(); } finally { if (n) n.applyingRemote = p; } }
  function flag(on) { try { if (on) sessionStorage.setItem(FLAG, '1'); else sessionStorage.removeItem(FLAG); } catch (e) {} }
  function onlineNames() { var p = (N() && N().players) || {}, o = {}; for (var k in p) o[p[k].name] = k; return o; }


  // ---------- personal money on the Main Server: one wallet per player, kept in the world save ----------
  // A wallet is found by a key = hash of your token: signed in → your account (same money on any computer),
  // guest → a random token saved in this browser. Typing someone's name does not give you their money.
  var wallets = {}, pidKey = {}, swapping = false, START = 20000, jobFrom = null;
  function hstr(s) { // cyrb53 → short key
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0, ch; i < s.length; i++) { ch = s.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 'w' + (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }
  function myToken() {
    var c = FU.account && FU.account.creds && FU.account.creds();
    if (c && c.u && c.p) return 'a:' + c.u + ':' + c.p;
    var t = null; try { t = localStorage.getItem('fu_wtok'); } catch (e) {}
    if (!t) { t = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Date.now().toString(36); try { localStorage.setItem('fu_wtok', t); } catch (e) {} }
    return 'b:' + t;
  }
  function myKey() { return hstr(myToken()); }
  function openWallet(key, name) {
    var w = wallets[key];
    if (!w) w = wallets[key] = { money: START + (T.laws.grant || 0), name: name || '', made: Date.now() };
    if (name) w.name = String(name).slice(0, 20);
    return w;
  }
  function walletOf(pid) { // host only
    if (!isHost()) return null;
    var k = pid === N().myId ? myKey() : pidKey[pid];
    return k ? wallets[k] || null : null;
  }
  function pidOfKey(key) { for (var p in pidKey) if (pidKey[p] === key) return p; return null; }
  function sendTotalTo(pid) {
    var w = walletOf(pid); if (!w || pid === N().myId) return;
    var ack = {}; ack[pid] = FU.netecon && FU.netecon.ackOf ? FU.netecon.ackOf(pid) : 0;
    try { N().sendTo(pid, 'moneyTotal', { total: w.money, ack: ack }); } catch (e) {}
  }
  // host: pay money into someone's wallet (building income, job pay); null/own key → the host's own money
  function pay(key, amount) {
    if (!amount) return;
    if (!main() || !key || key === myKey() || !wallets[key]) { G.earn(amount, 'income'); return; }
    wallets[key].money += amount;
    var pid = pidOfKey(key); if (pid) sendTotalTo(pid);
  }
  // host: run a purchase/sale for another player with THEIR money (netecon perform)
  function swapIn(pid) {
    var w = walletOf(pid); if (!w || pid === N().myId) return null;
    var keep = G.money; swapping = true; G.money = w.money;
    return function () { w.money = Math.max(0, G.money); G.money = keep; swapping = false; sendTotalTo(pid); };
  }
  function hostWallet() { // the host plays with their own wallet
    var w = openWallet(myKey(), myName());
    G.money = w.money; G.emit('moneyChanged', { money: G.money, delta: 0, reason: 'wallet' });
  }

  // ---------- the ONE main-world save (Supabase) ----------
  var cloud = { ver: 0, setup: true, saving: false, saveT: 0, stopped: false, src: '' };
  function rpcRaw(fn, args, keepalive) {
    var A = FU.account; if (!A || !A.URL) return Promise.reject(Object.assign(new Error('offline'), { status: 0 }));
    var body = JSON.stringify(args || {});
    return fetch(A.URL + '/rest/v1/rpc/' + fn, { method: 'POST', keepalive: !!keepalive && body.length < 60000, headers: A.headers(), body: body })
      .then(function (r) { return r.text().then(function (t) { if (!r.ok) { var e = new Error('HTTP ' + r.status); e.status = r.status; throw e; } return t ? JSON.parse(t) : null; }); },
        function () { throw Object.assign(new Error('offline'), { status: 0 }); });
  }
  function timeout(pr, ms) { return Promise.race([pr, new Promise(function (_, no) { setTimeout(function () { no(Object.assign(new Error('timeout'), { status: 0 })); }, ms); })]); }
  // gzip + base64 keeps the save small (falls back to plain JSON on browsers without CompressionStream)
  function pack(obj) {
    var json = JSON.stringify(obj);
    if (typeof CompressionStream === 'undefined') return Promise.resolve({ j: json });
    return new Response(new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer().then(function (ab) {
      var u = new Uint8Array(ab), str = '';
      for (var i = 0; i < u.length; i += 0x8000) str += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
      return { z: btoa(str) };
    });
  }
  function unpack(d) {
    if (!d) return Promise.resolve(null);
    if (d.j) return Promise.resolve(JSON.parse(d.j));
    if (d.z) {
      var bin = atob(d.z), u = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      return new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).text().then(function (t) { return JSON.parse(t); });
    }
    return Promise.resolve(d.world ? d : null);
  }
  // host only: store the world as the next version; refused (-1) if someone saved a newer version first
  function saveNow(keepalive) {
    if (!isHost() || !cloud.setup || cloud.stopped || cloud.saving) return Promise.resolve(false);
    cloud.saving = true; cloud.saveT = 0;
    var snap = snapshot();
    return pack(snap).then(function (data) {
      return rpcRaw('fu_main_save', { p_base: cloud.ver, p_data: data, p_by: myName() }, keepalive);
    }).then(function (v) {
      cloud.saving = false;
      if (v === -1) { conflict(); return false; }
      if (v === -2) { G.notify('The Main Server world is too big to save', 'bad'); return false; }
      if (typeof v === 'number' && v > 0) { cloud.ver = v; try { N().broadcast('mver', { v: v }); } catch (e) {} }
      return true;
    }, function (e) {
      cloud.saving = false;
      if (e && e.status === 404) { cloud.setup = false; G.notify('Main Server saving is not set up yet (run farming-mainserver.sql in Supabase)', 'bad'); }
      return false;
    });
  }
  // closing the tab: no time to compress, so send plain JSON at once (browsers cap these "keepalive" requests at 64 KB;
  // a bigger world relies on the save from the last 20 seconds)
  function saveOnClose() {
    if (!isHost() || !cloud.setup || cloud.stopped) return;
    try {
      var body = JSON.stringify({ p_base: cloud.ver, p_data: { j: JSON.stringify(snapshot()) }, p_by: myName() }), A = FU.account;
      if (body.length < 64000 && A && A.URL) fetch(A.URL + '/rest/v1/rpc/fu_main_save', { method: 'POST', keepalive: true, headers: A.headers(), body: body });
    } catch (e) {}
  }
  function conflict() { // another host saved a newer version (split network): load the newest world again
    cloud.stopped = true;
    G.notify('The Main Server was saved somewhere else: reloading the newest world…', 'info');
    flag(true);
    setTimeout(function () { try { N().leave('reloading'); } catch (e) {} setTimeout(function () { location.reload(); }, 600); }, 1200);
  }
  // a client keeps its in-memory copy for a few seconds when the host drops, tagged with the save it is based on
  function stash() { try { sessionStorage.setItem(STASH, JSON.stringify({ base: cloud.ver, t: Date.now(), snap: snapshot() })); } catch (e) {} }
  function takeStash() { var s = null; try { s = JSON.parse(sessionStorage.getItem(STASH) || 'null'); sessionStorage.removeItem(STASH); } catch (e) {} return s && s.snap && Date.now() - s.t < 3 * 60000 ? s : null; }

  // ---------- world snapshot (+ old browser copy, only used until the cloud save is set up) ----------
  function snapshot() {
    var w = null; try { w = FU.networld && FU.networld.snapshot(); } catch (e) {}
    var b = null; try { b = FU.buildings && FU.buildings.serialize(); } catch (e) {}
    var wx = null; try { wx = FU.weather && FU.weather.serialize(); } catch (e) {}
    var ch = null; try { ch = FU.chat && FU.chat.history ? FU.chat.history() : null; } catch (e) {}
    if (isHost()) { var mw = wallets[myKey()]; if (mw && !swapping) mw.money = G.money; }
    return { savedAt: Date.now(), world: w, buildings: b, town: pub(), weather: wx, chat: ch, wallets: JSON.parse(JSON.stringify(wallets)) };
  }
  function writeCache() { if (cloud.setup) return; try { localStorage.setItem(CACHE, JSON.stringify(snapshot())); } catch (e) { console.warn('[FU] town cache failed', e); } }
  function readCache() { try { var c = JSON.parse(localStorage.getItem(CACHE) || 'null'); return c && c.world ? c : null; } catch (e) { return null; } }

  // ---------- joining / hosting the main server ----------
  function join() {
    var n = N();
    if (joining) return;
    if (!n || !n.available()) { G.notify('The main server needs internet (PeerJS did not load)', 'bad'); return; }
    if (n.online && !API.main) { G.notify('Leave your co-op farm first', 'bad'); return; }
    if (main()) { open(); return; }
    joining = true; API.main = true; flag(true); n.MAX = MAX;
    G.notify('Connecting to the main server…', 'info');
    var tries = 0;
    (function attempt() {
      n.join(CODE).then(function () {
        joining = false; G.notify('Welcome to the main server, ' + myName() + '!', 'good'); paintBox();
        try { n.send('wallet', { tok: myToken(), name: myName() }); } catch (e) {} // ask the host for our own money
        if (FU.chat && FU.chat.note) FU.chat.note('Main Server chat is saved so the site owner can check it.');
      }, function (e) {
        var msg = String(e || '');
        if (/^No farm/.test(msg)) return hostIt();
        joining = false; API.main = false; flag(false);
        G.notify(msg || 'Could not reach the main server', 'bad');
      });
    })();
    function hostIt() {
      G.notify('Loading the Main Server world…', 'info');
      timeout(rpcRaw('fu_main_load', {}), 9000).then(function (res) {
        cloud.setup = true; cloud.ver = (res && +res.version) || 0;
        return res && res.data ? unpack(res.data).then(function (w) { return { w: w, src: 'cloud', by: res.saved_by }; }) : { w: null, src: 'new' };
      }, function (e) {
        if (e && e.status === 404) { cloud.setup = false; var lc = readCache(); return { w: lc, src: lc ? 'browser' : 'new' }; } // not set up yet: old browser copies
        throw e;
      }).then(function (got) {
        var st = takeStash(); // our own copy from the host we just lost: only if it is based on the newest save
        if (st && cloud.setup && st.base >= cloud.ver) {
          // a player's copy has no wallets (only the host keeps them): take everyone's money from the saved world
          st.snap.wallets = (got.w && got.w.wallets) || st.snap.wallets || {};
          got = { w: st.snap, src: 'handover' };
        }
        startHosting(got.w, got.src);
      }, function () {
        joining = false; API.main = false; flag(false);
        G.notify('Could not load the Main Server save (check your internet) — try again in a moment', 'bad');
      });
    }
    function startHosting(c, src) {
      if (!G.started) { try { FU.menu.startGame(false); } catch (e) { G.start({ load: false }); } }
      try { if (FU.menu && FU.menu.hideTitle) FU.menu.hideTitle(); } catch (e) {}
      if (c && c.world) {
        try { FU.networld.apply(c.world); } catch (e) { console.error('[FU] town: restoring the world failed', e); }
        try { if (FU.buildings && c.buildings) FU.buildings.deserialize(c.buildings); } catch (e) {}
        try { if (FU.weather && c.weather) FU.weather.deserialize(c.weather); } catch (e) {}
        try { if (FU.chat && FU.chat.setHistory && c.chat) FU.chat.setHistory(c.chat); } catch (e) {}
        wallets = (c.wallets && typeof c.wallets === 'object') ? c.wallets : {};
        setPub(c.town);
      } else { T = fresh(); wallets = {}; }
      pidKey = {};
      n.host(CODE).then(function () {
        joining = false; n.MAX = MAX; cloud.stopped = false; cloud.src = src;
        hostWallet();
        welcomeCitizen(myName());
        G.notify(src === 'new' ? 'You started the Main Server! Everything anyone does here is saved for everybody.'
          : 'You are hosting the Main Server (shared world loaded' + (cloud.setup ? '' : ' from this browser — cloud save not set up') + ')', 'good');
        if (src !== 'cloud') saveNow(); else cloud.saveT = SAVE_EVERY - 3;
        if (FU.chat && FU.chat.note) FU.chat.note('Main Server chat is saved so the site owner can check it.');
        writeCache(); paintBox();
      }, function (e) {
        if (e === 'taken' && tries++ < 3) { setTimeout(attempt, 800 + Math.random() * 1200); return; } // someone beat us to it: join them
        joining = false; API.main = false; flag(false);
        G.notify(String(e || 'Could not start the main server'), 'bad');
      });
    }
  }
  function leave() {
    flag(false);
    // stay in main mode until the reload so the main world is never written into the personal save
    if (main()) {
      writeCache();
      var wasHost = isHost();
      var go = function () { N().leave('You left the main server.'); if (wasHost) setTimeout(function () { location.reload(); }, 800); };
      if (wasHost && cloud.setup) { G.notify('Saving the Main Server…', 'info'); timeout(saveNow(), 8000).then(go, go); } else go();
    } else API.main = false;
    close();
  }

  // ---------- citizens + starter kits (host) ----------
  function welcomeCitizen(name) {
    if (!name || T.citizens[name]) return;
    var idx = Object.keys(T.citizens).length;
    T.citizens[name] = { joined: Date.now(), idx: idx };
    var slot = idx % 10, x0 = -24 - (slot % 5) * 62, z = slot < 5 ? -72 : -84, ids = []; // strip south of the main road, west of the crossing
    remote(function () {
      KIT.forEach(function (k, i) {
        var mod = k[0] === 'vehicle' ? FU.vehicles : FU.implements; if (!mod || !mod.spawn) return;
        var o = null; try { o = mod.spawn(k[1], x0 - i * 10, z, 0); } catch (e) { console.error('[FU] town kit', e); }
        if (!o) return;
        ids.push(o.id);
        try { N().broadcast('spawn', { kind: k[0], type: o.type, id: o.id, x: o.x, z: o.z, heading: 0, by: 'town' }); } catch (e) {}
      });
    });
    T.citizens[name].kit = ids;
    sys('🎉 ' + name + ' became a citizen and got a free tractor, combine, tools and trailer (parked south of the main road, west of the crossroads).');
    pushTown();
  }

  // ---------- votes (host is the authority) ----------
  function pub() {
    var t = JSON.parse(JSON.stringify(T)), now = Date.now();
    t.props.forEach(function (p) { p.left = Math.max(0, (ends[p.id] || now) - now); });
    return t;
  }
  function setPub(t) {
    if (!t || typeof t !== 'object') return;
    var f = fresh();
    var OLD = 'g' + 'uns'; // law name in saves from before the rename to weaponry
    if (t.laws && t.laws[OLD] !== undefined && t.laws.weaponry === undefined) t.laws.weaponry = t.laws[OLD];
    if (t.laws) delete t.laws[OLD];
    T = { laws: Object.assign(f.laws, t.laws || {}), mayor: t.mayor || '', rules: (t.rules || []).slice(0, 30), citizens: t.citizens || {}, props: t.props || [], log: (t.log || []).slice(-10), next: t.next || 1 };
    var now = Date.now(); ends = {};
    T.props.forEach(function (p) { ends[p.id] = now + (p.left != null ? p.left : VOTE_MS); });
  }
  function pushTown() { if (isHost()) try { N().broadcast('town', pub()); } catch (e) {} paint(); paintBox(); }
  function propose(kind, value, text, by) {
    var K = KINDS[kind]; if (!K) return 'Unknown vote';
    if (T.props.length >= 6) return 'Too many open votes: wait for some to finish';
    if (T.props.some(function (p) { return p.by === by; })) return 'You already have a vote open';
    if (K.opts) { value = +value; if (K.opts.indexOf(value) < 0) return 'Pick a value'; if (T.laws[kind] === value) return 'That is already the law'; }
    else if (kind === 'mayor') { value = clean(value).slice(0, 16); if (!value) return 'Pick a citizen'; if (!T.citizens[value]) return value + ' is not a citizen'; }
    else if (kind === 'rule') { value = clean(text || value); if (value.length < 3) return 'Write the rule first'; }
    else if (kind === 'repeal') { var r = T.rules.filter(function (x) { return x.id === +value; })[0]; if (!r) return 'Pick a rule'; text = r.text; value = r.id; }
    var p = { id: T.next++, kind: kind, value: value, text: kind === 'repeal' ? text : '', by: by, votes: {} };
    p.votes[by] = 1; T.props.push(p); ends[p.id] = Date.now() + VOTE_MS;
    sys('🗳️ ' + by + ' proposed: ' + describe(p) + ' — press V to vote');
    pushTown(); return '';
  }
  function describe(p) {
    var K = KINDS[p.kind];
    if (p.kind === 'rule') return 'new rule "' + p.value + '"';
    if (p.kind === 'repeal') return 'repeal rule "' + p.text + '"';
    if (p.kind === 'mayor') return p.value + ' for mayor';
    return K.label + ' → ' + K.show(p.value);
  }
  function tally(p) { var y = 0, n = 0; for (var k in p.votes) { if (p.votes[k] > 0) y++; else n++; } return { y: y, n: n }; }
  function resolve(p) {
    var t = tally(p), pass = t.y > t.n;
    T.props = T.props.filter(function (x) { return x !== p; }); delete ends[p.id];
    if (pass) {
      if (KINDS[p.kind].opts) T.laws[p.kind] = p.value;
      else if (p.kind === 'mayor') T.mayor = p.value;
      else if (p.kind === 'rule') { T.rules.push({ id: p.id, text: p.value, by: p.by }); if (T.rules.length > 30) T.rules.shift(); }
      else if (p.kind === 'repeal') T.rules = T.rules.filter(function (r) { return r.id !== p.value; });
    }
    T.log.push({ text: describe(p), pass: pass, y: t.y, n: t.n }); if (T.log.length > 10) T.log.shift();
    sys((pass ? '✅ PASSED ' : '❌ FAILED ') + describe(p) + ' (' + t.y + ' yes, ' + t.n + ' no)');
    pushTown();
  }
  function vote(id, v, by) {
    var p = T.props.filter(function (x) { return x.id === +id; })[0]; if (!p || !by) return;
    p.votes[by] = v > 0 ? 1 : -1; pushTown();
  }
  function act(type, d) { // local action: host does it, clients ask the host
    if (isHost()) {
      var err = '';
      if (type === 'tprop') err = propose(d.kind, d.value, d.text, myName());
      else if (type === 'tvote') vote(d.id, d.v, myName());
      else if (type === 'tkick') kickByMayor(d.name, myName());
      if (err) G.notify(err, 'bad');
    } else if (isClient()) N().send(type, d);
  }
  function kickByMayor(name, by) {
    if (by !== T.mayor && !(isHost() && by === myName())) return 'Only the mayor can do that';
    var id = onlineNames()[name]; if (!id || id === 'h') return 'Cannot remove that player';
    N().kick(id, 'The mayor (' + by + ') removed you from the main server.');
    sys('👢 Mayor ' + by + ' removed ' + name); return '';
  }

  // ---------- law effects ----------
  function blocked(price) {
    if (!main() || !T.laws.cap || price <= T.laws.cap) return false;
    G.notify('Town law: nothing over ' + fmt(T.laws.cap) + ' may be bought (vote to change it with V)', 'bad');
    return true;
  }
  function wrapLaws() {
    var E = FU.economy;
    if (E && E.price) { var op = E.price; E.price = function (id) { var p = op.apply(this, arguments); return main() && T.laws.bonus ? p * (1 + T.laws.bonus / 100) : p; }; }
    if (E && E.buy) {
      var ob = E.buy;
      E.buy = function (key) {
        if (main() && !(N() && N().applyingRemote)) { var it = E.item ? E.item(key) : null; if (it && blocked(it.price)) return null; }
        return ob.apply(this, arguments);
      };
    }
  }

  // ---------- UI: Town Hall panel + HUD box ----------
  function css() {
    var s = document.createElement('style');
    s.textContent = '#fu-town{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(760px,94vw);max-height:88vh;overflow:auto;z-index:20;pointer-events:auto;padding:16px 18px}' +
      '#fu-town.hid{display:none}#fu-town h2{margin:0 0 4px;font-size:22px}#fu-town h3{margin:14px 0 6px;font-size:15px;color:#a5d6a7}' +
      '#fu-town .row{display:flex;justify-content:space-between;gap:8px;padding:6px 8px;border-radius:6px;background:rgba(255,255,255,.06);margin:4px 0;align-items:center;flex-wrap:wrap}' +
      '#fu-town .yes{color:#81c784}#fu-town .no{color:#e57373}#fu-town select,#fu-town input{background:#1b2a1f;color:#fff;border:1px solid #4caf50;border-radius:5px;padding:5px;font:inherit}' +
      '#fu-town .x{position:absolute;right:10px;top:8px;background:none;border:0;color:#fff;font-size:22px;cursor:pointer}' +
      '#fu-townbox{cursor:pointer;pointer-events:auto}';
    document.head.appendChild(s);
  }
  function build() {
    css();
    var p = el.panel = document.createElement('div');
    p.id = 'fu-town'; p.className = 'fu-panel hid fu-interactive';
    G.ui.appendChild(p);
    p.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-t]'); if (!b) return;
      var t = b.getAttribute('data-t'), id = b.getAttribute('data-id');
      if (t === 'close') close();
      else if (t === 'join') join();
      else if (t === 'leave') leave();
      else if (t === 'yes' || t === 'no') act('tvote', { id: +id, v: t === 'yes' ? 1 : -1 });
      else if (t === 'kick') act('tkick', { name: id });
      else if (t === 'prop') {
        var kind = p.querySelector('#tw-kind').value, val = p.querySelector('#tw-val'), txt = p.querySelector('#tw-text');
        var d = { kind: kind, value: val ? val.value : '', text: txt ? txt.value : '' };
        if (isClient()) { act('tprop', d); G.notify('Vote proposed', 'good'); } else act('tprop', d);
      }
    });
    p.addEventListener('change', function (e) { if (e.target.id === 'tw-kind') { el.kind = e.target.value; paint(true); } });
    p.addEventListener('keydown', function (e) { e.stopPropagation(); });
  }
  function valueField(kind) {
    var K = KINDS[kind];
    if (K.opts) return '<select id="tw-val">' + K.opts.map(function (v) { return '<option value="' + v + '">' + esc(K.show(v)) + '</option>'; }).join('') + '</select>';
    if (kind === 'mayor') return '<select id="tw-val">' + Object.keys(T.citizens).map(function (n) { return '<option>' + esc(n) + '</option>'; }).join('') + '</select>';
    if (kind === 'repeal') return T.rules.length ? '<select id="tw-val">' + T.rules.map(function (r) { return '<option value="' + r.id + '">' + esc(r.text.slice(0, 50)) + '</option>'; }).join('') + '</select>' : '<i>No rules yet</i>';
    return '<input id="tw-text" maxlength="100" placeholder="e.g. No driving on other people\'s fields" style="flex:1;min-width:220px">';
  }
  function paint(force) {
    if (!isOpen || !el.panel) return;
    var ae = document.activeElement;
    if (!force && ae && el.panel.contains(ae) && /INPUT|SELECT/.test(ae.tagName)) return; // don't wipe what they're typing
    var h = '<button class="x" data-t="close">×</button><h2>🏛️ Town Hall</h2>';
    if (!main()) {
      h += '<p>The <b>Main Server</b> is one big shared world for everyone. Join and you get a <b>free tractor, combine, tools and trailer</b>. ' +
        'Citizens share the town treasury, build silos and farms together, and <b>vote on laws</b>: harvest bonuses, speed limits, a mayor, and your own town rules.</p>' +
        '<button class="fu-btn" data-t="join">🌎 Join the Main Server</button>';
      el.panel.innerHTML = h; return;
    }
    var on = onlineNames(), me = myName(), mayorMe = T.mayor === me;
    h += '<div class="fu-small">' + Object.keys(on).length + ' online · ' + Object.keys(T.citizens).length + ' citizens · your money ' + fmt(G.money) + ' · mayor: <b>' + esc(T.mayor || 'nobody yet') + '</b>' + (isHost() ? ' · you are hosting' : '') + '</div>';
    h += '<h3>🗳️ Open votes</h3><div class="fu-small" style="margin-bottom:4px">Every vote stays open for 10 minutes so everyone gets a chance to see it. Most yes votes after 10 minutes wins.</div>';
    if (!T.props.length) h += '<div class="fu-small">No votes right now. Propose one below!</div>';
    T.props.forEach(function (p) {
      var t = tally(p), left = Math.max(0, Math.ceil(((ends[p.id] || 0) - Date.now()) / 1000)), mine = p.votes[me];
      var mmss = Math.floor(left / 60) + ':' + ('0' + (left % 60)).slice(-2);
      h += '<div class="row"><span><b>' + esc(describe(p)) + '</b> <span class="fu-small">by ' + esc(p.by) + ' · decided in ' + mmss + '</span></span><span>' +
        '<span class="yes">' + t.y + ' yes</span> · <span class="no">' + t.n + ' no</span> ' +
        '<button class="fu-btn' + (mine > 0 ? '' : ' secondary') + '" data-t="yes" data-id="' + p.id + '">Yes</button> ' +
        '<button class="fu-btn' + (mine < 0 ? ' danger' : ' secondary') + '" data-t="no" data-id="' + p.id + '">No</button></span></div>';
    });
    var kind = el.kind || 'rule';
    h += '<h3>✋ Propose</h3><div class="row"><select id="tw-kind">' + Object.keys(KINDS).map(function (k) { return '<option value="' + k + '"' + (k === kind ? ' selected' : '') + '>' + KINDS[k].label + '</option>'; }).join('') +
      '</select>' + valueField(kind) + '<button class="fu-btn" data-t="prop">Propose</button></div>';
    h += '<h3>📜 Laws</h3>';
    ['bonus', 'speed', 'ff', 'weaponry', 'cap', 'grant'].forEach(function (k) { h += '<div class="row"><span>' + KINDS[k].label + '</span><b>' + esc(KINDS[k].show(T.laws[k])) + '</b></div>'; });
    h += '<h3>📋 Town rules</h3>' + (T.rules.length ? T.rules.map(function (r, i) { return '<div class="row"><span>' + (i + 1) + '. ' + esc(r.text) + '</span><span class="fu-small">by ' + esc(r.by) + '</span></div>'; }).join('') : '<div class="fu-small">No rules yet.</div>');
    h += '<h3>👥 Online</h3>' + Object.keys(on).map(function (n) {
      return '<div class="row"><span>' + esc(n) + (n === T.mayor ? ' 🎖️ mayor' : '') + (on[n] === 'h' ? ' · host' : '') + '</span>' +
        ((mayorMe || isHost()) && n !== me && on[n] !== 'h' ? '<button class="fu-btn danger" data-t="kick" data-id="' + esc(n) + '">Remove</button>' : '') + '</div>';
    }).join('');
    if (T.log.length) h += '<h3>🕘 Recent results</h3>' + T.log.slice().reverse().map(function (l) { return '<div class="row"><span>' + esc(l.text) + '</span><span class="' + (l.pass ? 'yes' : 'no') + '">' + (l.pass ? 'passed' : 'failed') + ' ' + l.y + '–' + l.n + '</span></div>'; }).join('');
    h += '<p><button class="fu-btn secondary" data-t="leave">Leave the main server</button></p>';
    el.panel.innerHTML = h;
  }
  function open() { if (!G.started && !main()) { /* title */ } isOpen = true; el.panel.className = 'fu-panel fu-interactive'; G.openPanel('town', hide); paint(true); }
  function hide() { isOpen = false; if (el.panel) el.panel.className = 'fu-panel hid fu-interactive'; }
  function close() { if (G.isPanelOpen && G.isPanelOpen('town')) G.closePanel('town'); hide(); }
  function paintBox() {
    var col = FU.hud && FU.hud.rightColumn;
    if (!main()) { if (el.box) el.box.style.display = 'none'; return; }
    if (!el.box && col) {
      el.box = document.createElement('div'); el.box.id = 'fu-townbox'; el.box.className = 'fu-box fu-interactive';
      el.box.addEventListener('click', function () { open(); });
      col.appendChild(el.box);
    }
    if (!el.box) return;
    el.box.style.display = '';
    el.box.innerHTML = '🌎 <b>Main Server</b> · ' + Object.keys(onlineNames()).length + ' online' + (T.props.length ? '<br><span style="color:#ffd54f">🗳️ ' + T.props.length + ' vote' + (T.props.length > 1 ? 's' : '') + ' open — press V</span>' : '<br><span class="fu-small">V: Town Hall</span>');
  }

  var API = FU.town = { main: false, CODE: CODE, join: join, leave: leave, open: open, blocked: blocked, state: function () { return T; },
    walletOf: walletOf, swapIn: swapIn, pay: pay, myKey: myKey, wallets: function () { return wallets; } };

  FU.register({
    name: 'town', order: 12, ui: true,
    init: function (g) {
      G = g; build(); wrapLaws();
      var n = N();
      if (n && n.on) {
        n.on('town', function (d) { if (isClient()) { setPub(d); paint(); paintBox(); } });
        n.on('mver', function (d) { if (isClient() && d && d.v > 0) cloud.ver = +d.v; }); // which save our copy is based on
        n.on('wallet', function (d, from) { // a player tells the host who they are: open (or create) their wallet
          if (!isHost() || !d || typeof d.tok !== 'string' || d.tok.length < 6) return;
          var key = hstr(d.tok); pidKey[from] = key;
          var p = n.players[from]; openWallet(key, (p && p.name) || d.name);
          sendTotalTo(from);
        });
        n.on('jobReq', function (d, from) { if (isHost() && d && d.action === 'accept') { jobFrom = from; setTimeout(function () { jobFrom = null; }, 0); } });
        n.on('tprop', function (d, from) { if (!isHost() || !d) return; var p = n.players[from], e = propose(d.kind, d.value, d.text, p && p.name); if (e) n.sendTo(from, 'sys', { text: e }); });
        n.on('tvote', function (d, from) { if (isHost() && d) { var p = n.players[from]; vote(d.id, d.v, p && p.name); } });
        n.on('tkick', function (d, from) { if (isHost() && d) { var p = n.players[from], e = kickByMayor(d.name, p && p.name); if (e) n.sendTo(from, 'sys', { text: e }); } });
        n.on('hello', function (d, from) {
          if (!isHost()) return;
          var p = n.players[from];
          try { n.sendTo(from, 'town', pub()); n.sendTo(from, 'mver', { v: cloud.ver }); } catch (e) {}
          if (p) setTimeout(function () { welcomeCitizen(p.name); }, 1500);
        });
      }
      if (FU.menu && FU.menu.addButton) {
        FU.menu.addButton('title', { id: 'mainsrv', label: '🌎 Main Server (play with everyone)', order: 5, primary: true, onClick: function () { join(); } });
        FU.menu.addButton('pause', { id: 'townhall', label: function () { return main() ? '🏛️ Town Hall (V)' : '🌎 Main Server'; }, order: 14, onClick: function () { if (FU.menu.resume) FU.menu.resume(); main() ? open() : join(); } });
      }
      g.on('netPlayerJoin', function () { paintBox(); paint(); });
      g.on('netPlayerLeave', function (e) { if (e && e.player) delete pidKey[e.player.id]; paintBox(); paint(); });
      // host: keep our own wallet in step with the money on screen
      g.on('moneyChanged', function () { if (isHost() && !swapping) { var w = wallets[myKey()]; if (w) w.money = G.money; } });
      // jobs pay whoever took them
      g.on('missionChanged', function (e) { if (isHost() && e && e.active && !e.active.byKey) e.active.byKey = jobFrom ? pidKey[jobFrom] : myKey(); });
      g.on('missionComplete', function (e) {
        var a = e && e.mission; if (!isHost() || !a || !a.byKey || a.byKey === myKey() || !wallets[a.byKey]) return;
        G.money = Math.max(0, G.money - (a.reward || 0)); G.emit('moneyChanged', { money: G.money, delta: -(a.reward || 0), reason: 'job pay to ' + wallets[a.byKey].name });
        pay(a.byKey, a.reward || 0);
      });
      g.on('netLeft', function (e) { if (API.main) { if (e && e.wasClient) stash(); writeCache(); paintBox(); } });
      // came back after the main server's host left (networld reloads the page): rejoin, maybe as the new host
      g.on('ready', function () {
        var f = null; try { f = sessionStorage.getItem(FLAG); } catch (e) {}
        if (f) setTimeout(join, 400 + Math.random() * 2500);
      });
      window.addEventListener('pagehide', function () { if (!main()) return; if (isHost() && !cloud.saving) saveOnClose(); writeCache(); });
    },
    update: function (dt, g) {
      if (!main()) return;
      if (g.input.pressed('KeyV') && !g.input.blocked) { isOpen ? close() : open(); }
      else if (isOpen && g.input.pressed('KeyV') && g.isPanelOpen('town') && !(document.activeElement && /INPUT|SELECT/.test(document.activeElement.tagName))) close();
      // laws that act every frame
      var v = g.activeVehicle;
      if (v && T.laws.speed && FU.world && FU.world.isOnRoad && FU.world.isOnRoad(v.x, v.z)) {
        var lim = T.laws.speed / 3.6; v.speedLimit = v.speedLimit != null ? Math.min(v.speedLimit, lim) : lim;
      }
      if (!T.laws.ff && g.time.scale > 1) { g.time.scale = 1; if (g.input.down('KeyT')) g.prompt('Fast-forward is banned by town law'); }
      cacheT += dt; if (cacheT > 20) { cacheT = 0; writeCache(); }
      if (isHost()) { cloud.saveT += dt; if (cloud.saveT >= SAVE_EVERY) saveNow(); }
      hostT += dt;
      if (hostT > 1) {
        hostT = 0;
        if (isHost()) {
          var now = Date.now(), online = Object.keys(onlineNames());
          T.props.slice().forEach(function (p) {
            if (now >= (ends[p.id] || 0)) resolve(p); // always the full 10 minutes, so everyone gets a say
          });
        }
        if (isOpen) paint();
      }
    }
  });
})();
