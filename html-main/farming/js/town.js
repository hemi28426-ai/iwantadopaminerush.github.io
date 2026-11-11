// Farming Unblocked — town: the 🌎 Main Server. One shared world anyone can join (peer-to-peer, fixed code FARM,
// up to 16 farmers). The first player online hosts it; everyone keeps a copy of the world (localStorage
// fu_main_world), so when the host leaves, the others reload and the first one back hosts the latest copy.
// Every new citizen gets a free starter kit (tractor, combine, cultivator, seed drill, trailer).
// Citizens vote (V = Town Hall) on laws: harvest bonus, road speed limit, fast-forward, purchase cap,
// welcome grant, mayor, and free-text town rules. Majority of votes cast after 90 s (or when everyone voted).
(function () {
  'use strict';
  var FU = window.FU = window.FU || {};
  var CODE = 'FARM', MAX = 16, CACHE = 'fu_main_world', FLAG = 'fu_main', VOTE_MS = 90000;
  var KIT = [['vehicle', 'pickup'], ['vehicle', 'tractor_s'], ['vehicle', 'combine_s'], ['implement', 'cultivator_3m'], ['implement', 'seeder_3m'], ['implement', 'trailer_12k']];
  var KINDS = {
    bonus: { label: 'Harvest bonus', opts: [0, 10, 25], show: function (v) { return v ? '+' + v + '% on all grain sales' : 'None'; } },
    speed: { label: 'Road speed limit', opts: [0, 30, 50], show: function (v) { return v ? v + ' km/h on roads' : 'No limit'; } },
    ff: { label: 'Fast-forward (T)', opts: [1, 0], show: function (v) { return v ? 'Allowed' : 'Banned'; } },
    guns: { label: 'Guns', opts: [1, 0], show: function (v) { return v ? 'Allowed' : 'Banned'; } },
    cap: { label: 'Purchase cap', opts: [0, 100000, 250000], show: function (v) { return v ? 'Nothing over $' + v.toLocaleString('en-US') : 'No cap'; } },
    grant: { label: 'Welcome grant', opts: [0, 10000, 50000], show: function (v) { return v ? '$' + v.toLocaleString('en-US') + ' to the treasury per new citizen' : 'None'; } },
    mayor: { label: 'Elect a mayor', opts: null, show: function (v) { return v || 'Nobody'; } },
    rule: { label: 'New town rule', opts: null, show: function (v) { return v; } },
    repeal: { label: 'Repeal a rule', opts: null, show: function (v) { return v; } }
  };
  var BAD = /\b(fuck|shit|bitch|cunt|nigg|fag|retard|dick|pussy|whore|slut)\w*/gi;

  var G = null, T = fresh(), cacheT = 0, hostT = 0, joining = false, el = {}, isOpen = false, ends = {};
  function fresh() { return { laws: { bonus: 0, speed: 0, ff: 1, guns: 1, cap: 0, grant: 0 }, mayor: '', rules: [], citizens: {}, props: [], log: [], next: 1 }; }
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

  // ---------- world cache ----------
  function snapshot() {
    var w = null; try { w = FU.networld && FU.networld.snapshot(); } catch (e) {}
    var b = null; try { b = FU.buildings && FU.buildings.serialize(); } catch (e) {}
    return { savedAt: Date.now(), world: w, buildings: b, town: pub() };
  }
  function writeCache() { try { localStorage.setItem(CACHE, JSON.stringify(snapshot())); } catch (e) { console.warn('[FU] town cache failed', e); } }
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
      n.join(CODE).then(function () { joining = false; G.notify('Welcome to the main server, ' + myName() + '!', 'good'); paintBox(); }, function (e) {
        var msg = String(e || '');
        if (/^No farm/.test(msg)) return hostIt();
        joining = false; API.main = false; flag(false);
        G.notify(msg || 'Could not reach the main server', 'bad');
      });
    })();
    function hostIt() {
      var c = readCache();
      if (!G.started) { try { FU.menu.startGame(false); } catch (e) { G.start({ load: false }); } }
      try { if (FU.menu && FU.menu.hideTitle) FU.menu.hideTitle(); } catch (e) {}
      if (c) {
        try { FU.networld.apply(c.world); } catch (e) { console.error('[FU] town: restoring the world failed', e); }
        try { if (FU.buildings && c.buildings) FU.buildings.deserialize(c.buildings); } catch (e) {}
        setPub(c.town);
      } else T = fresh();
      n.host(CODE).then(function () {
        joining = false; n.MAX = MAX;
        welcomeCitizen(myName());
        G.notify(c ? 'You are hosting the main server (world restored)' : 'You started the main server! Others who join share this world.', 'good');
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
    if (main()) { writeCache(); var wasHost = isHost(); N().leave('You left the main server.'); if (wasHost) setTimeout(function () { location.reload(); }, 800); }
    else API.main = false;
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
    if (T.laws.grant) G.earn(T.laws.grant, 'grant');
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
    h += '<div class="fu-small">' + Object.keys(on).length + ' online · ' + Object.keys(T.citizens).length + ' citizens · treasury ' + fmt(G.money) + ' · mayor: <b>' + esc(T.mayor || 'nobody yet') + '</b>' + (isHost() ? ' · you are hosting' : '') + '</div>';
    h += '<h3>🗳️ Open votes</h3>';
    if (!T.props.length) h += '<div class="fu-small">No votes right now. Propose one below!</div>';
    T.props.forEach(function (p) {
      var t = tally(p), left = Math.max(0, Math.ceil(((ends[p.id] || 0) - Date.now()) / 1000)), mine = p.votes[me];
      h += '<div class="row"><span><b>' + esc(describe(p)) + '</b> <span class="fu-small">by ' + esc(p.by) + ' · ' + left + ' s left</span></span><span>' +
        '<span class="yes">' + t.y + ' yes</span> · <span class="no">' + t.n + ' no</span> ' +
        '<button class="fu-btn' + (mine > 0 ? '' : ' secondary') + '" data-t="yes" data-id="' + p.id + '">Yes</button> ' +
        '<button class="fu-btn' + (mine < 0 ? ' danger' : ' secondary') + '" data-t="no" data-id="' + p.id + '">No</button></span></div>';
    });
    var kind = el.kind || 'rule';
    h += '<h3>✋ Propose</h3><div class="row"><select id="tw-kind">' + Object.keys(KINDS).map(function (k) { return '<option value="' + k + '"' + (k === kind ? ' selected' : '') + '>' + KINDS[k].label + '</option>'; }).join('') +
      '</select>' + valueField(kind) + '<button class="fu-btn" data-t="prop">Propose</button></div>';
    h += '<h3>📜 Laws</h3>';
    ['bonus', 'speed', 'ff', 'guns', 'cap', 'grant'].forEach(function (k) { h += '<div class="row"><span>' + KINDS[k].label + '</span><b>' + esc(KINDS[k].show(T.laws[k])) + '</b></div>'; });
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

  var API = FU.town = { main: false, CODE: CODE, join: join, leave: leave, open: open, blocked: blocked, state: function () { return T; } };

  FU.register({
    name: 'town', order: 12, ui: true,
    init: function (g) {
      G = g; build(); wrapLaws();
      var n = N();
      if (n && n.on) {
        n.on('town', function (d) { if (isClient()) { setPub(d); paint(); paintBox(); } });
        n.on('tprop', function (d, from) { if (!isHost() || !d) return; var p = n.players[from], e = propose(d.kind, d.value, d.text, p && p.name); if (e) n.sendTo(from, 'sys', { text: e }); });
        n.on('tvote', function (d, from) { if (isHost() && d) { var p = n.players[from]; vote(d.id, d.v, p && p.name); } });
        n.on('tkick', function (d, from) { if (isHost() && d) { var p = n.players[from], e = kickByMayor(d.name, p && p.name); if (e) n.sendTo(from, 'sys', { text: e }); } });
        n.on('hello', function (d, from) {
          if (!isHost()) return;
          var p = n.players[from];
          try { n.sendTo(from, 'town', pub()); } catch (e) {}
          if (p) setTimeout(function () { welcomeCitizen(p.name); }, 1500);
        });
      }
      if (FU.menu && FU.menu.addButton) {
        FU.menu.addButton('title', { id: 'mainsrv', label: '🌎 Main Server (play with everyone)', order: 5, primary: true, onClick: function () { join(); } });
        FU.menu.addButton('pause', { id: 'townhall', label: function () { return main() ? '🏛️ Town Hall (V)' : '🌎 Main Server'; }, order: 14, onClick: function () { if (FU.menu.resume) FU.menu.resume(); main() ? open() : join(); } });
      }
      g.on('netPlayerJoin', function () { paintBox(); paint(); });
      g.on('netPlayerLeave', function () { paintBox(); paint(); });
      g.on('netLeft', function () { if (API.main) { writeCache(); paintBox(); } });
      // came back after the main server's host left (networld reloads the page): rejoin, maybe as the new host
      g.on('ready', function () {
        var f = null; try { f = sessionStorage.getItem(FLAG); } catch (e) {}
        if (f) setTimeout(join, 400 + Math.random() * 2500);
      });
      window.addEventListener('pagehide', function () { if (main()) writeCache(); });
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
      hostT += dt;
      if (hostT > 1) {
        hostT = 0;
        if (isHost()) {
          var now = Date.now(), online = Object.keys(onlineNames());
          T.props.slice().forEach(function (p) {
            var all = online.every(function (nm) { return p.votes[nm]; });
            if (now >= (ends[p.id] || 0) || all) resolve(p);
          });
        }
        if (isOpen) paint();
      }
    }
  });
})();
