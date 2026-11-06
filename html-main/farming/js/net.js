// Farming Unblocked — FU.net: peer-to-peer co-op transport (PeerJS, host-relayed star, max 8 farmers).
// The host's browser owns the farm; clients connect to 'fu-farm-' + CODE. Envelope {t, d, f}; the host
// stamps f with the sender id. net.js never relays by itself: feature modules relay with broadcast(type, d, fromId).
(function () {
  'use strict';
  var FU = window.FU = window.FU || {};
  var PREFIX = 'fu-farm-', LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ', MAX = 8, VER = 1;
  var HEARTBEAT = 2000, DROP_MS = 10000, JOIN_TIMEOUT = 12000;
  var PALETTE = [0x2196f3, 0xf44336, 0xffeb3b, 0x9c27b0, 0xff9800, 0x00bcd4, 0xe91e63, 0x8bc34a];
  var INTERNAL = { ping: 1, pong: 1, info: 1, bye: 1, kick: 1, deny: 1 };
  var NO_PEER = 'Co-op needs an internet connection (the PeerJS library did not load). Single-player still works.';

  var handlers = {}, peer = null, hostConn = null, conns = {}, seen = {}, nextClient = 1, hbTimer = null;
  var attempt = null, colorChosen = false, lastHost = 0;

  function G() { return FU.G; }
  function emit(name, data) { var g = G(); if (g && g.emit) g.emit(name, data); }
  function now() { return Date.now(); }
  function env(t, d, f) { return { t: t, d: d === undefined ? null : d, f: f }; }
  function raw(c, msg) { if (c && c.open) { try { c.send(msg); return true; } catch (e) { console.warn('[FU net] send failed', e); } } return false; }
  function cleanName(n) { return String(n || '').replace(/[\u0000-\u001f<>&"'`\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16); }
  function validColor(c) { return typeof c === 'number' && isFinite(c) && c >= 0 && c <= 0xffffff; }
  function fire(type, data, from) {
    var l = handlers[type]; if (!l) return;
    l.slice().forEach(function (fn) {
      try { fn(data, from); } catch (e) { console.error('[FU net] handler for "' + type + '" failed', e); }
    });
  }
  function errText(e) {
    var t = (e && e.type) || '';
    if (t === 'peer-unavailable') return 'No farm with that code. Check the code (the host must have the game open and be hosting).';
    if (t === 'network' || t === 'server-error' || t === 'socket-error' || t === 'socket-closed' || t === 'disconnected')
      return 'Could not reach the co-op server. Check your internet: school or work networks sometimes block it, so try another network.';
    if (t === 'webrtc') return 'The peer-to-peer link failed. Your network may be blocking it, so try another network.';
    if (t === 'browser-incompatible') return 'This browser cannot do peer-to-peer co-op. Try an up-to-date Chrome, Edge or Firefox.';
    if (t === 'unavailable-id') return 'Could not get a free farm code. Please try again.';
    return 'Connection problem (' + (t || 'unknown') + '). Please try again.';
  }
  function randomCode() { var s = ''; for (var i = 0; i < 4; i++) s += LETTERS[Math.floor(Math.random() * LETTERS.length)]; return s; }
  function defaultName() {
    var u = null; try { u = FU.account && FU.account.user && FU.account.user(); } catch (e) {}
    var s = null; try { s = localStorage.getItem('fu_name'); } catch (e) {}
    return cleanName(u) || cleanName(s) || ('Farmer' + (100 + Math.floor(Math.random() * 900)));
  }
  function copyPlayers() { var o = {}; for (var k in N.players) o[k] = Object.assign({}, N.players[k]); return o; }
  function pickColor(pref, idx, exceptId) {
    var used = {};
    for (var k in N.players) if (k !== exceptId) used[N.players[k].color] = 1;
    if (validColor(pref) && !used[pref]) return pref;
    for (var i = 0; i < PALETTE.length; i++) { var c = PALETTE[(idx + i) % PALETTE.length]; if (!used[c]) return c; }
    return PALETTE[idx % PALETTE.length];
  }
  function count() { return Object.keys(N.players).length; }

  function soloState() {
    N.online = false; N.isHost = false; N.isClient = false; N.code = ''; N.myId = 'solo';
    N.players = { solo: { id: 'solo', name: N.name, color: N.color, ping: 0, host: true } };
  }
  function stopTimers() { if (hbTimer) { clearInterval(hbTimer); hbTimer = null; } }
  function teardown(delay) {
    var p = peer, hc = hostConn, cs = Object.keys(conns).map(function (k) { return conns[k]; });
    peer = null; hostConn = null; conns = {}; seen = {}; nextClient = 1; stopTimers();
    var kill = function () {
      cs.forEach(function (c) { try { c.close(); } catch (e) {} });
      try { if (hc) hc.close(); } catch (e) {}
      try { if (p && !p.destroyed) p.destroy(); } catch (e) {}
    };
    if (delay) setTimeout(kill, delay); else kill();
  }
  function cancelAttempt(msg) {
    var a = attempt; if (!a) return;
    attempt = null; clearTimeout(a.timer);
    try { if (a.peer && !a.peer.destroyed) a.peer.destroy(); } catch (e) {}
    if (msg) a.reject(msg);
  }
  function status() { emit('netStatus', { online: N.online, isHost: N.isHost, code: N.code }); }

  // ---------- host ----------
  function broadcastPlayers() { if (N.isHost) N.broadcast('players', { players: copyPlayers() }, null, 'h'); }
  function removePlayer(id, why) {
    var p = N.players[id]; if (!p || id === 'h') return;
    delete N.players[id]; delete conns[id]; delete seen[id];
    emit('netPlayerLeave', { player: p, reason: why || 'left' });
    broadcastPlayers();
  }
  function onConnection(c) {
    c.on('data', function (m) { hostData(c, m); });
    c.on('close', function () { if (c._fuId && conns[c._fuId] === c) removePlayer(c._fuId, 'left'); });
    c.on('error', function () {});
    setTimeout(function () { if (!c._fuId && c.open) { try { c.close(); } catch (e) {} } }, DROP_MS);
  }
  function hostData(c, m) {
    if (!N.isHost || !m || typeof m.t !== 'string') return;
    var d = m.d || {}, id = c._fuId;
    if (!id) {
      if (m.t !== 'hello') return;
      var deny = d.ver !== VER ? 'Your game is a different version than the host\'s. Reload the page and try again.'
        : count() >= MAX ? 'That farm is full (' + MAX + ' farmers max).' : '';
      if (deny) { raw(c, env('deny', { reason: deny, full: count() >= MAX }, 'h')); setTimeout(function () { try { c.close(); } catch (e) {} }, 500); return; }
      var idx = nextClient; id = 'c' + nextClient++;
      c._fuId = id; conns[id] = c; seen[id] = now();
      var pl = N.players[id] = { id: id, name: cleanName(d.name) || ('Farmer' + idx), color: pickColor(d.color, idx, id), ping: 0, host: false };
      var world = null;
      try { world = FU.networld && FU.networld.snapshot ? FU.networld.snapshot() : null; } catch (e) { console.error('[FU net] world snapshot failed', e); }
      raw(c, env('welcome', { you: id, players: copyPlayers(), world: world, code: N.code, ver: VER, max: MAX }, 'h'));
      emit('netPlayerJoin', { player: Object.assign({}, pl) });
      broadcastPlayers();
      fire('hello', d, id);
      return;
    }
    if (conns[id] !== c) return;
    seen[id] = now(); m.f = id;
    if (m.t === 'pong') { if (N.players[id] && typeof d.s === 'number') N.players[id].ping = Math.max(0, now() - d.s); return; }
    if (m.t === 'ping') { raw(c, env('pong', { s: d.s }, 'h')); return; }
    if (m.t === 'bye') { removePlayer(id, 'left'); setTimeout(function () { try { c.close(); } catch (e) {} }, 200); return; }
    if (m.t === 'info') {
      var p = N.players[id]; if (!p) return;
      if (cleanName(d.name)) p.name = cleanName(d.name);
      if (validColor(d.color)) p.color = pickColor(d.color, +id.slice(1) || 1, id);
      broadcastPlayers(); return;
    }
    if (INTERNAL[m.t]) return;
    fire(m.t, m.d, id);
  }
  function hostBeat() {
    if (!N.isHost) return;
    var t = now();
    Object.keys(conns).forEach(function (id) {
      if (t - (seen[id] || 0) > DROP_MS) { var c = conns[id]; removePlayer(id, 'timeout'); try { c.close(); } catch (e) {} return; }
      raw(conns[id], env('ping', { s: t }, 'h'));
    });
    broadcastPlayers(); // carries the latest pings
  }

  // ---------- client ----------
  function clientData(c, m) {
    if (c !== hostConn || !m || typeof m.t !== 'string') return;
    var d = m.d || {}; lastHost = now();
    if (m.t === 'deny') { if (attempt) { var a = attempt; cancelAttempt(); teardown(); a.reject(d.reason || 'The host refused the connection.'); } else lost(d.reason); return; }
    if (m.t === 'welcome') {
      if (!attempt) return;
      var at = attempt; attempt = null; clearTimeout(at.timer);
      N.online = true; N.isClient = true; N.isHost = false; N.code = at.code; N.myId = d.you;
      N.players = d.players || {};
      if (N.players[d.you]) N.color = N.players[d.you].color;
      stopTimers(); hbTimer = setInterval(clientBeat, HEARTBEAT);
      status();
      emit('netJoined', { world: d.world === undefined ? null : d.world });
      fire('welcome', d, 'h');
      at.resolve(N.code);
      return;
    }
    if (!N.isClient) return;
    if (m.t === 'ping') { raw(c, env('pong', { s: d.s }, N.myId)); return; }
    if (m.t === 'pong') return;
    if (m.t === 'kick') { lost(d.reason || 'The host removed you from the farm.'); return; }
    if (m.t === 'bye') { lost(d.reason || 'The host closed the farm.'); return; }
    if (m.t === 'players') {
      var old = N.players, nu = d.players || {};
      N.players = nu;
      if (nu[N.myId]) { N.color = nu[N.myId].color; }
      Object.keys(nu).forEach(function (k) { if (k !== N.myId && !old[k]) emit('netPlayerJoin', { player: nu[k] }); });
      Object.keys(old).forEach(function (k) { if (k !== N.myId && !nu[k]) emit('netPlayerLeave', { player: old[k], reason: 'left' }); });
      fire('players', d, m.f || 'h');
      return;
    }
    if (INTERNAL[m.t]) return;
    fire(m.t, m.d, m.f || 'h');
  }
  function clientBeat() { if (N.isClient && now() - lastHost > DROP_MS) lost('Lost the connection to the host.'); }
  function lost(reason) {
    if (!N.isClient) return;
    teardown(); soloState(); status();
    emit('netLeft', { reason: reason || 'The host left the farm.', wasHost: false, wasClient: true });
  }

  // ---------- public API ----------
  var N = FU.net = {
    PREFIX: PREFIX, MAX: MAX, PALETTE: PALETTE, ver: VER,
    online: false, isHost: false, isClient: false, code: '', myId: 'solo',
    name: 'Farmer', color: PALETTE[0], players: {}, applyingRemote: false,
    available: function () { return typeof window.Peer === 'function'; },
    silentMs: function () { return N.isClient ? now() - lastHost : 0; },
    host: function () {
      return new Promise(function (resolve, reject) {
        if (!N.available()) return reject(NO_PEER);
        if (N.isHost) return resolve(N.code);
        if (N.isClient) return reject('Leave the farm you joined first.');
        cancelAttempt('Cancelled.');
        N.name = defaultNameIfAccount();
        var a = attempt = { resolve: resolve, reject: reject, peer: null, timer: 0 };
        a.timer = setTimeout(function () { if (attempt === a) { cancelAttempt(); reject(errText({ type: 'network' })); } }, JOIN_TIMEOUT);
        (function tryCode(tries) {
          if (attempt !== a) return;
          var code = randomCode(), p = new window.Peer(PREFIX + code, { debug: 0 });
          a.peer = p;
          p.on('open', function () {
            if (attempt !== a) { try { p.destroy(); } catch (e) {} return; }
            attempt = null; clearTimeout(a.timer);
            peer = p; conns = {}; seen = {}; nextClient = 1;
            N.online = true; N.isHost = true; N.isClient = false; N.code = code; N.myId = 'h';
            if (!colorChosen) N.color = PALETTE[0];
            N.players = { h: { id: 'h', name: N.name, color: N.color, ping: 0, host: true } };
            p.on('connection', onConnection);
            stopTimers(); hbTimer = setInterval(hostBeat, HEARTBEAT);
            status(); resolve(code);
          });
          p.on('error', function (e) {
            if (peer === p) { if (e && e.type !== 'peer-unavailable') console.warn('[FU net] host peer error', e && e.type); return; }
            if (attempt !== a) return;
            try { p.destroy(); } catch (x) {}
            if (e && e.type === 'unavailable-id' && tries < 6) { tryCode(tries + 1); return; }
            cancelAttempt(); reject(errText(e));
          });
          p.on('disconnected', function () { if (peer === p && !p.destroyed) { try { p.reconnect(); } catch (e) {} } });
        })(0);
      });
    },
    join: function (code) {
      return new Promise(function (resolve, reject) {
        if (!N.available()) return reject(NO_PEER);
        code = String(code || '').toUpperCase().replace(/[^A-Z]/g, '');
        if (code.length !== 4) return reject('Farm codes are 4 letters.');
        if (/[IO]/.test(code)) return reject('Farm codes never use the letters I or O. Check the code.');
        if (N.online) return reject(N.isHost ? 'Stop hosting first.' : 'Leave the farm you joined first.');
        cancelAttempt('Cancelled.');
        N.name = defaultNameIfAccount();
        var a = attempt = { resolve: resolve, reject: reject, peer: null, timer: 0, code: code };
        var fail = function (msg) { if (attempt !== a) return; cancelAttempt(); teardown(); reject(msg); };
        a.timer = setTimeout(function () { fail('Could not reach that farm. Check the code and that the host is still online (some school networks block co-op).'); }, JOIN_TIMEOUT);
        var p = a.peer = peer = new window.Peer({ debug: 0 });
        p.on('open', function () {
          if (attempt !== a) return;
          var c = hostConn = p.connect(PREFIX + code, { reliable: true });
          c.on('open', function () { raw(c, env('hello', { name: N.name, color: colorChosen ? N.color : null, ver: VER }, null)); });
          c.on('data', function (m) { clientData(c, m); });
          c.on('close', function () {
            if (hostConn !== c) return;
            if (attempt === a) fail('The farm closed the connection.'); else lost('The host left the farm.');
          });
          c.on('error', function () {});
        });
        p.on('error', function (e) {
          if (attempt === a) { fail(errText(e)); return; }
          console.warn('[FU net] client peer error', e && e.type);
        });
        p.on('disconnected', function () { if (peer === p && !p.destroyed) { try { p.reconnect(); } catch (e) {} } });
      });
    },
    leave: function (reason) {
      cancelAttempt('Cancelled.');
      if (!N.online) { teardown(); soloState(); return; }
      var wasHost = N.isHost;
      if (wasHost) N.broadcast('bye', { reason: 'The host closed the farm.' }, null, 'h');
      else raw(hostConn, env('bye', { reason: reason || '' }, N.myId));
      teardown(250); soloState(); status();
      emit('netLeft', { reason: reason || (wasHost ? 'You stopped hosting.' : 'You left the farm.'), wasHost: wasHost, wasClient: !wasHost });
    },
    kick: function (id, reason) {
      if (!N.isHost || !conns[id]) return false;
      var c = conns[id];
      raw(c, env('kick', { reason: reason || 'The host removed you from the farm.' }, 'h'));
      removePlayer(id, 'kicked');
      setTimeout(function () { try { c.close(); } catch (e) {} }, 300);
      return true;
    },
    // client → host; on the host: broadcast to every client
    send: function (type, data) {
      if (N.isClient) return raw(hostConn, env(type, data, N.myId));
      if (N.isHost) return N.broadcast(type, data);
      return false;
    },
    sendTo: function (id, type, data, from) {
      if (N.isClient && id === 'h') return N.send(type, data);
      if (!N.isHost) return false;
      return raw(conns[id], env(type, data, from || 'h'));
    },
    // host only; f = from || exceptId || 'h' so relayed messages keep the original sender id
    broadcast: function (type, data, exceptId, from) {
      if (!N.isHost) return false;
      var msg = env(type, data, from || exceptId || 'h'), any = false;
      for (var id in conns) if (id !== exceptId && raw(conns[id], msg)) any = true;
      return any;
    },
    on: function (type, fn) { (handlers[type] = handlers[type] || []).push(fn); },
    off: function (type, fn) { var l = handlers[type]; if (!l) return; if (!fn) { delete handlers[type]; return; } var i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); },
    setName: function (n) {
      n = cleanName(n); if (!n) return N.name;
      N.name = n;
      try { localStorage.setItem('fu_name', n); } catch (e) {}
      if (N.players[N.myId]) N.players[N.myId].name = n;
      if (N.isHost) broadcastPlayers(); else if (N.isClient) raw(hostConn, env('info', { name: n, color: N.color }, N.myId));
      return n;
    },
    setColor: function (c) {
      if (!validColor(c)) return N.color;
      colorChosen = true;
      if (N.isHost) { c = pickColor(c, 0, 'h'); N.color = c; N.players.h.color = c; broadcastPlayers(); }
      else if (N.isClient) raw(hostConn, env('info', { name: N.name, color: c }, N.myId)); // host confirms via `players`
      else { N.color = c; if (N.players.solo) N.players.solo.color = c; }
      return N.color;
    }
  };
  function defaultNameIfAccount() {
    var u = null; try { u = FU.account && FU.account.user && FU.account.user(); } catch (e) {}
    return cleanName(u) || N.name;
  }
  soloState();

  // best-effort clean leave when the tab closes, so friends see it at once
  if (window.addEventListener) window.addEventListener('pagehide', function () {
    if (N.isHost) N.broadcast('bye', { reason: 'The host closed the farm.' }, null, 'h');
    else if (N.isClient) raw(hostConn, env('bye', { reason: 'closed' }, N.myId));
  });

  if (FU.register) FU.register({
    name: 'net', order: 3, ui: true,
    init: function (g) {
      N.name = defaultName(); if (N.players[N.myId]) N.players[N.myId].name = N.name;
      g.on('accountChanged', function (e) {
        var u = cleanName(e && e.user);
        if (u) N.setName(u);
      });
    }
  });
})();
