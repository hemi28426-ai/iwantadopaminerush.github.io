// Unbloxed: online play + "running server" feel for "Unblocked On The Heights".
// PeerJS, host-relayed star (pattern from farming/js/net.js): host = new Peer(PREFIX + code), clients connect to it, the host
// relays everything. Entering the Heights auto-joins the PUBLIC room (fixed code); if nobody holds it you become its host.
// A private 4-letter room (no I/O) can still be hosted/joined from the M panel. Max 8 real players.
// Each player owns their own character (sends its state ~15x/s). A hit on someone else is sent to that player, who applies
// damage/knockback on their own screen and announces their own KO ({t:'ko', by}). Bots live on the host (or locally when
// solo): clients hide their own bots while online and see the host's bots, synced like players.
// Server population: bots join/leave over time ("🤖 Nub joined the server"), total players capped at 10, a bot leaves when
// a real player needs the slot. Tab (and briefly on join) shows the player list with KOs; bots are always named "🤖 ...".
// Loaded after the main inline script of unbloxed.html and uses its globals (chars, me, av, mode, GAME, spawn, spawnBot,
// BOTNAMES, equip, knock, animate, flash, log, esc, pickups, grab, scene, makeChar, K, $...). Hooks in unbloxed.html:
//   loop():   if(o.net){UBXNET.remote(o,dt);continue}   remote chars: no physics / bot AI, only smoothing + animate
//   attack(): if(t.net){UBXNET.hit(o,t,lunge,w,d,dist);continue}   hits on remote chars go over the network
//   knock():  if((t==me||t.bot)&&window.UBXNET)UBXNET.ko(t,by)   our own KO (and the host's bot KOs) are announced
(function () {
  'use strict';
  const PREFIX = 'ubx-heights-', LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ', MAX = 8, CAP = 10, VER = 1, PUB = 'PUBLIC';
  const HEARTBEAT = 2000, DROP_MS = 10000, JOIN_TIMEOUT = 12000, SEND_MS = 66;
  const NO_PEER = 'Online play needs an internet connection (the PeerJS library did not load). Solo still works.';
  const ROBOT = '🤖';

  let peer = null, hostConn = null, conns = {}, seen = {}, nextClient = 1, hbTimer = null, sendTimer = null;
  let attempt = null, lastHost = 0, lastAv = '', avT = 0, stash = null, botSeq = 0;
  let autoOff = false, autoT = 1, wasIn = false, popT = 25, tabUntil = 0, tabHeld = false, quietSync = false;
  const remotes = {}; // room id ('h', 'c1', 'b3' ...) -> char object with o.net = id
  const N = { online: false, isHost: false, isClient: false, code: '', myId: 'solo', players: {} }; // players: id -> {id,name,a,bot?}

  const now = () => Date.now();
  const env = (t, d, f) => ({ t, d: d === undefined ? null : d, f });
  function raw(c, msg) { if (c && c.open) { try { c.send(msg); return true; } catch (e) { console.warn('[UBX net] send failed', e); } } return false; }
  const num = (v, def) => (typeof v === 'number' && isFinite(v) ? v : def);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const int = (v, lo, hi, def) => { v = Math.floor(Number(v)); return isFinite(v) && v >= lo && v <= hi ? v : def; };
  const col = (c, def) => (typeof c === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c) ? c : def);
  function cleanName(n) { return String(n || '').replace(/[\u0000-\u001f<>&"'`\\]/g, '').split(ROBOT).join('').replace(/\s+/g, ' ').trim().slice(0, 16); }
  function cleanAv(a, bot) {
    a = a || {};
    const name = cleanName(a.name) || (bot ? 'Bot' : 'Player');
    return { name: bot ? ROBOT + ' ' + name : name, head: col(a.head, '#f5c99b'), torso: col(a.torso, '#3498db'), arms: col(a.arms, '#f5c99b'),
      legs: col(a.legs, '#2c3e50'), hat: int(a.hat, 0, HATS.length - 1, 0), face: int(a.face, 0, FACES.length - 1, 0),
      sword: int(a.sword, 0, SWORDS.length - 1, 0), hair: int(a.hair, 0, HAIRS.length - 1, 0), hairColor: col(a.hairColor, '#8d5524') };
  }
  const myAv = () => cleanAv(av, false);
  const inHeights = () => mode === 'game' && GAME === 'heights' && !!me;
  const realCount = () => Object.keys(N.players).filter(id => !N.players[id].bot).length;
  const botId = o => o.bid || (o.bid = 'b' + (++botSeq));
  const localBots = () => chars.filter(o => o.bot && !o.net);
  const findBot = id => chars.find(o => o.bot && !o.net && o.bid === id) || null;
  function errText(e) {
    const t = (e && e.type) || '';
    if (t === 'peer-unavailable') return 'No room with that code. Check the code (the host must be in the Heights and hosting).';
    if (t === 'network' || t === 'server-error' || t === 'socket-error' || t === 'socket-closed' || t === 'disconnected')
      return 'Could not reach the online server. Check your internet: school or work networks sometimes block it, so try another network.';
    if (t === 'webrtc') return 'The peer-to-peer link failed. Your network may be blocking it, so try another network.';
    if (t === 'browser-incompatible') return 'This browser cannot do peer-to-peer play. Try an up-to-date Chrome, Edge or Firefox.';
    if (t === 'unavailable-id') return 'Could not get a free room code. Please try again.';
    return 'Connection problem (' + (t || 'unknown') + '). Please try again.';
  }
  function randomCode() { let s = ''; for (let i = 0; i < 4; i++) s += LETTERS[Math.floor(Math.random() * LETTERS.length)]; return s; }

  // ---------- sending ----------
  function bcast(type, d, exceptId, from) { // host only
    if (!N.isHost) return;
    const msg = env(type, d, from || exceptId || 'h');
    for (const id in conns) if (id !== exceptId) raw(conns[id], msg);
  }
  function sendAll(type, d) { if (N.isHost) bcast(type, d, null, 'h'); else if (N.isClient) raw(hostConn, env(type, d, N.myId)); }
  function sendTo(id, type, d) { if (N.isHost) raw(conns[id], env(type, d, 'h')); else if (N.isClient) raw(hostConn, env(type, d, N.myId)); } // host routes by d.to
  function syncBotPlayers() { // host: the host's bots are listed as players (bot:true) so clients can show them
    for (const id of Object.keys(N.players)) if (N.players[id].bot) delete N.players[id];
    for (const o of localBots()) { const id = botId(o); N.players[id] = { id, name: o.a.name, a: o.a, bot: true }; }
  }
  function broadcastPlayers() { if (!N.isHost) return; syncBotPlayers(); bcast('players', { players: N.players }, null, 'h'); syncRemotes(); render(); }
  function stateOf(o) {
    const r = x => Math.round((+x || 0) * 100) / 100;
    return { p: [r(o.pos.x), r(o.pos.y), r(o.pos.z)], v: [r(o.vel.x), r(o.vel.y), r(o.vel.z)], y: r(o.yaw), sw: r(o.swing), l: o.lunge ? 1 : 0,
      ko: r(Math.max(0, o.ko)), hp: Math.round(o.hp), w: o.w, sh: r(Math.max(0, o.shield || 0)), k: o.kills, d: o.deaths,
      g: o.ground ? 1 : 0, b: o.burn > 0 ? 1 : 0, po: o.poison > 0 ? 1 : 0 };
  }

  // ---------- remote characters ----------
  function tag(o) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 64;
    const g = c.getContext('2d'); g.font = 'bold 30px system-ui,Segoe UI,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,.75)'; g.strokeText(o.a.name, 128, 32); g.fillStyle = '#fff'; g.fillText(o.a.name, 128, 32);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), alphaTest: 0.4, depthWrite: false }));
    s.scale.set(4.4, 1.1, 1); s.position.y = 7.4; o.c.root.add(s);
  }
  function spawnRemote(id, a) {
    const o = spawn(a, false);
    o.net = id; o.akey = JSON.stringify(a); o.burn = 0; o.poison = 0; o.tp = null; o.ty = 0; o.age = 0;
    o.pos.set(0, -9999, 0); o.c.root.visible = false; // hidden until the first state arrives
    tag(o); remotes[id] = o; return o;
  }
  function rebuild(o, a) { // avatar changed
    if (o.c.root.parent) o.c.root.parent.remove(o.c.root);
    o.a = a; o.c = makeChar(a); scene.add(o.c.root); o.bub = null; equip(o, o.w == null ? -1 : o.w); tag(o);
    o.c.root.visible = !!o.tp;
  }
  function despawn(id) {
    const o = remotes[id]; if (!o) return; delete remotes[id];
    const i = chars.indexOf(o); if (i >= 0) chars.splice(i, 1);
    if (o.c.root.parent) o.c.root.parent.remove(o.c.root);
    for (const c of chars) { if (c.target === o) c.target = null; if (c.lastHitBy === o) c.lastHitBy = null; }
  }
  function syncRemotes() {
    if (!N.online || !inHeights()) return;
    for (const id in N.players) {
      const p = N.players[id];
      if (id === N.myId || !p || (N.isHost && p.bot)) continue;
      const a = cleanAv(p.a, !!p.bot), key = JSON.stringify(a), o = remotes[id];
      if (!o) {
        spawnRemote(id, a);
        if (!quietSync) { log(`<b>${esc(a.name)}</b> joined the server`); if (!p.bot) showTab(3500); }
      } else if (o.akey !== key) { o.akey = key; rebuild(o, a); }
    }
    for (const id in remotes) if (!N.players[id]) { log(`${esc(remotes[id].a.name)} left the server`); despawn(id); }
  }
  function removeBots() { // client: our own bots step aside while we are in someone else's server
    if (stash) return;
    stash = { scene, bots: [] };
    for (let i = chars.length - 1; i >= 0; i--) {
      const o = chars[i]; if (!o.bot || o.net) continue;
      stash.bots.push(o); chars.splice(i, 1); if (o.c.root.parent) o.c.root.parent.remove(o.c.root);
    }
    if (me && me.lastHitBy && me.lastHitBy.bot) me.lastHitBy = null;
  }
  function restoreBots() { // only back into the same Heights world; leaving to the hub just drops them (spawnAll makes new ones)
    const s = stash; stash = null;
    if (!s || s.scene !== scene || !inHeights()) return;
    for (const o of s.bots.reverse()) { scene.add(o.c.root); chars.push(o); o.target = null; respawn(o); }
  }

  function applyState(id, d) {
    const o = remotes[id]; if (!o || !d || !Array.isArray(d.p)) return;
    const x = num(d.p[0], NaN), y = num(d.p[1], NaN), z = num(d.p[2], NaN); if (!isFinite(x + y + z)) return;
    const first = !o.tp; if (first) o.tp = new THREE.Vector3();
    o.tp.set(x, y, z); o.age = 0;
    if (first || o.pos.distanceTo(o.tp) > 15) o.pos.copy(o.tp); // respawn / teleport: snap instead of sliding
    if (Array.isArray(d.v)) o.vel.set(clamp(num(d.v[0], 0), -200, 200), clamp(num(d.v[1], 0), -200, 200), clamp(num(d.v[2], 0), -200, 200));
    o.ty = num(d.y, o.ty); if (first) o.yaw = o.ty;
    const sw = clamp(num(d.sw, 0), 0, 1); if (sw > o.swing + 0.03) { o.swing = sw; o.lunge = !!d.l; }
    o.ko = clamp(num(d.ko, 0), 0, 10); o.hp = clamp(num(d.hp, 100), -999, 100); o.shield = clamp(num(d.sh, 0), 0, 30);
    o.kills = int(d.k, 0, 1e7, o.kills); o.deaths = int(d.d, 0, 1e7, o.deaths); o.ground = !!d.g; o.nb = !!d.b; o.np = !!d.po;
    const w = int(d.w, -1, WEAP.length - 1, -1); if (o.w !== w) equip(o, w);
    o.c.root.visible = true;
  }
  // called from loop() instead of physics/botThink for o.net chars
  function remote(o, dt) {
    o.cd -= dt; o.swing = Math.max(0, o.swing - dt);
    if (o.tp) {
      o.age += dt; if (o.age < 0.25) o.tp.addScaledVector(o.vel, dt); // short dead reckoning between packets
      const f = Math.min(1, dt * 12); o.pos.lerp(o.tp, f);
      o.yaw += Math.atan2(Math.sin(o.ty - o.yaw), Math.cos(o.ty - o.yaw)) * f;
    }
    if (!o.bub) { o.bub = new THREE.Mesh(new THREE.SphereGeometry(3.2, 20, 14), new THREE.MeshStandardMaterial({ color: '#6cf', emissive: '#38f', transparent: true, opacity: .25, depthWrite: false })); o.bub.position.y = 2.6; o.c.root.add(o.bub); }
    o.bub.visible = o.shield > 0;
    o.c.torso.material.emissive.set(o.nb ? '#a30' : o.np ? '#2a6000' : '#000');
    animate(o, dt);
  }
  // called from attack() when a swing reaches a remote char: the owner of that char applies it
  function hit(o, t, lunge, w, d, dist) {
    if (!N.online || !t || !t.net) return;
    let from; if (o === me) from = N.myId; else if (o.bot && !o.net && N.isHost) from = botId(o); else return;
    const k = (lunge ? 18 : 10) * (w.kb || 1), ok = dist > 0.001, dmg = lunge ? w.ld : w.dmg;
    sendTo(t.net, 'hit', { to: t.net, from, dmg, kx: ok ? d.x / dist * k : 0, kz: ok ? d.z / dist * k : 0, ky: lunge ? 9 : 6, burn: w.burn || 0, poison: w.poison || 0 });
    if (!(t.shield > 0)) { flash(t); if (w.steal) o.hp = Math.min(100, o.hp + Math.min(dmg, 40) * w.steal); }
  }
  function applyHit(t, from, d) { // t = me, or (on the host) one of the host's bots
    if (!inHeights() || !d || !t || t.ko) return;
    const by = remotes[from] || null;
    t.vel.x += clamp(num(d.kx, 0), -80, 80); t.vel.z += clamp(num(d.kz, 0), -80, 80); t.vel.y = Math.max(t.vel.y, clamp(num(d.ky, 0), 0, 12));
    t.lastHitBy = by;
    if (t.shield > 0) return;
    t.hp -= clamp(num(d.dmg, 0), 0, 999); flash(t);
    if (d.burn) t.burn = clamp(num(d.burn, 0), 0, 10);
    if (d.poison) t.poison = clamp(num(d.poison, 0), 0, 10);
    if (t.hp <= 0) knock(t, by); // knock() hook announces it with ko()
  }
  // called from knock() when WE (or, on the host, one of its bots) get KO'd: everyone shows the feed line, the killer gets the KO
  function ko(t, by) {
    if (!N.online || GAME !== 'heights') return;
    const byId = !by || by === t ? null : by === me ? N.myId : by.net ? by.net : (by.bot && N.isHost) ? botId(by) : null;
    if (t === me) sendAll('ko', { by: byId });
    else if (t.bot && !t.net && N.isHost) bcast('ko', { v: botId(t), by: byId }, null, 'h');
  }
  function applyKo(vid, d) {
    const t = remotes[vid]; if (!t || !inHeights()) return;
    const byId = d && typeof d.by === 'string' ? d.by : null;
    const by = !byId ? null : byId === N.myId ? me : remotes[byId] || (N.isHost ? findBot(byId) : null);
    t.ko = 0; knock(t, by || null); // feed line + killer.kills++ (+5 Bux when it's us)
  }
  function applyPick(d) { const p = pickups[int(d && d.i, 0, pickups.length - 1, -1)]; if (p) { p.cool = 20; p.g.visible = false; } }
  // pickups taken by us vanish for everyone too
  if (typeof grab === 'function') {
    const _grab = grab;
    grab = function (o) {
      if (!N.online || o !== me) return _grab(o);
      const before = pickups.map(p => p.cool); _grab(o);
      for (let i = 0; i < pickups.length; i++) if (pickups[i].cool > 0 && !(before[i] > 0)) sendAll('pick', { i });
    };
  }

  function tickSend() {
    if (!N.online || !inHeights()) return;
    sendAll('s', stateOf(me));
    if (N.isHost) { const l = localBots().map(o => [botId(o), stateOf(o)]); if (l.length) bcast('bs', { l }, null, 'h'); }
    if (++avT >= 15) { // ~1 s: resend the avatar if it changed
      avT = 0; const a = myAv(), s = JSON.stringify(a);
      if (s !== lastAv) { lastAv = s; if (N.isHost) { N.players.h.a = a; N.players.h.name = a.name; broadcastPlayers(); } else raw(hostConn, env('av', { a }, N.myId)); }
    }
  }

  // ---------- server population: bots join and leave over time (solo or host) ----------
  function botJoin() {
    if (typeof spawnBot !== 'function') return;
    const used = new Set(chars.filter(o => o.bot).map(o => o.bi));
    const free = BOTNAMES.map((_, i) => i).filter(i => !used.has(i)); if (!free.length) return;
    const o = spawnBot(free[Math.random() * free.length | 0]);
    log(`<b>${esc(o.a.name)}</b> joined the server`);
    if (N.isHost) broadcastPlayers();
  }
  function botLeave(bots) {
    const o = bots.filter(b => !b.ko).sort(() => Math.random() - .5)[0] || bots[0]; if (!o) return;
    const i = chars.indexOf(o); if (i >= 0) chars.splice(i, 1); if (o.c.root.parent) o.c.root.parent.remove(o.c.root);
    for (const c of chars) { if (c.target === o) c.target = null; if (c.lastHitBy === o) c.lastHitBy = null; }
    log(`${esc(o.a.name)} left the server`);
    if (N.isHost) broadcastPlayers();
  }
  function popTick(dt) {
    if (!inHeights() || N.isClient) return; // clients see the host's bots
    const bots = localBots(), room = CAP - (N.online ? realCount() : 1);
    if (bots.length > Math.max(0, room)) { botLeave(bots); return; } // make room for real players
    popT -= dt; if (popT > 0) return;
    popT = 18 + Math.random() * 30;
    const want = Math.min(room, 7);
    if (bots.length < 3 || (bots.length < want && Math.random() < .55)) botJoin(); else if (bots.length > 3) botLeave(bots);
  }

  // ---------- connection state ----------
  function clearTimers() { if (hbTimer) clearInterval(hbTimer); if (sendTimer) clearInterval(sendTimer); hbTimer = sendTimer = null; }
  function teardown(delay) {
    const p = peer, hc = hostConn, cs = Object.keys(conns).map(k => conns[k]);
    peer = null; hostConn = null; conns = {}; seen = {}; nextClient = 1; clearTimers();
    const kill = () => {
      cs.forEach(c => { try { c.close(); } catch (e) {} });
      try { if (hc) hc.close(); } catch (e) {}
      try { if (p && !p.destroyed) p.destroy(); } catch (e) {}
    };
    if (delay) setTimeout(kill, delay); else kill();
  }
  function solo() { N.online = false; N.isHost = false; N.isClient = false; N.code = ''; N.myId = 'solo'; N.players = {}; }
  function cancelAttempt() {
    const a = attempt; if (!a) return;
    attempt = null; clearTimeout(a.timer);
    try { if (a.peer && !a.peer.destroyed) a.peer.destroy(); } catch (e) {}
  }
  function failAttempt(a, msg) {
    if (attempt !== a) return;
    cancelAttempt(); teardown();
    if (a.quiet) autoT = 30 + Math.random() * 20; else note(msg, true); // the public auto-join fails silently and retries later
    render();
  }
  function goOnline() {
    if (N.isClient) removeBots();
    clearTimers();
    hbTimer = setInterval(N.isHost ? hostBeat : clientBeat, HEARTBEAT);
    sendTimer = setInterval(tickSend, SEND_MS);
    lastHost = now(); lastAv = JSON.stringify(myAv()); avT = 0;
    note('');
    quietSync = true; if (N.isHost) broadcastPlayers(); else syncRemotes(); quietSync = false;
    render(); showTab(3500);
    if (N.code !== PUB) log(N.isHost ? `🌐 Hosting private room <b>${N.code}</b>` : `🌐 Joined room <b>${N.code}</b>`);
  }
  function goOffline(reason, delay, isErr) {
    const wasPub = N.code === PUB;
    teardown(delay);
    for (const id of Object.keys(remotes)) despawn(id);
    solo(); restoreBots(); render();
    if (reason && !(wasPub && !isErr)) { note(reason, isErr); if (inHeights()) log('🌐 ' + esc(reason)); }
  }
  function lost(reason) {
    if (!N.isClient) return;
    const wasPub = N.code === PUB;
    goOffline(wasPub ? '' : (reason || 'The host closed the room.'), 0, true);
    if (wasPub || !autoOff) { autoOff = false; autoT = 1 + Math.random() * 3; } // someone takes over the public server
  }

  // ---------- host ----------
  function removePlayer(id) {
    const p = N.players[id]; if (!p || id === 'h' || p.bot) return;
    delete N.players[id]; delete conns[id]; delete seen[id];
    broadcastPlayers();
  }
  function onConnection(c) {
    c.on('data', m => hostData(c, m));
    c.on('close', () => { if (c._ubxId && conns[c._ubxId] === c) removePlayer(c._ubxId); });
    c.on('error', () => {});
    setTimeout(() => { if (!c._ubxId && c.open) { try { c.close(); } catch (e) {} } }, DROP_MS);
  }
  function hostData(c, m) {
    if (!N.isHost || !m || typeof m.t !== 'string') return;
    const d = m.d || {}; let id = c._ubxId;
    if (!id) {
      if (m.t !== 'hello') return;
      const full = realCount() >= MAX;
      const deny = d.ver !== VER ? 'Your game is a different version than the host\'s. Reload the page and try again.'
        : full ? 'That server is full (' + MAX + ' players max).' : '';
      if (deny) { raw(c, env('deny', { reason: deny }, 'h')); setTimeout(() => { try { c.close(); } catch (e) {} }, 500); return; }
      id = 'c' + nextClient++; c._ubxId = id; conns[id] = c; seen[id] = now();
      const a = cleanAv(d.a, false); N.players[id] = { id, name: a.name, a };
      while (localBots().length > Math.max(0, CAP - realCount())) botLeave(localBots()); // a bot leaves to make room
      syncBotPlayers();
      raw(c, env('welcome', { you: id, players: N.players, code: N.code, ver: VER }, 'h'));
      broadcastPlayers();
      return;
    }
    if (conns[id] !== c) return;
    seen[id] = now();
    switch (m.t) {
      case 's': applyState(id, d); bcast('s', d, id); break;
      case 'hit':
        if (d.to === 'h') applyHit(me, id, d);
        else if (typeof d.to === 'string' && findBot(d.to)) applyHit(findBot(d.to), id, d);
        else if (typeof d.to === 'string' && conns[d.to]) raw(conns[d.to], env('hit', d, id));
        break;
      case 'ko': applyKo(id, { by: d.by }); bcast('ko', { by: d.by }, id); break;
      case 'pick': applyPick(d); bcast('pick', d, id); break;
      case 'av': { const p = N.players[id]; if (p) { p.a = cleanAv(d.a, false); p.name = p.a.name; broadcastPlayers(); } break; }
      case 'ping': raw(c, env('pong', { s: d.s }, 'h')); break;
      case 'bye': removePlayer(id); setTimeout(() => { try { c.close(); } catch (e) {} }, 200); break;
    }
  }
  function hostBeat() {
    if (!N.isHost) return;
    const t = now();
    for (const id of Object.keys(conns)) {
      if (t - (seen[id] || 0) > DROP_MS) { const c = conns[id]; removePlayer(id); try { c.close(); } catch (e) {} continue; }
      raw(conns[id], env('ping', { s: t }, 'h'));
    }
  }

  // ---------- client ----------
  function clientData(c, m) {
    if (c !== hostConn || !m || typeof m.t !== 'string') return;
    const d = m.d || {}; lastHost = now();
    if (m.t === 'deny') { if (attempt) failAttempt(attempt, d.reason || 'The host refused the connection.'); else lost(d.reason); return; }
    if (m.t === 'welcome') {
      if (!attempt || typeof d.you !== 'string') return;
      const at = attempt; attempt = null; clearTimeout(at.timer);
      if (!inHeights()) { teardown(); solo(); render(); return; }
      N.online = true; N.isClient = true; N.isHost = false; N.code = at.code; N.myId = d.you;
      N.players = d.players && typeof d.players === 'object' ? d.players : {};
      goOnline(); return;
    }
    if (!N.isClient) return;
    const fromHost = m.f === 'h';
    switch (m.t) {
      case 'ping': raw(c, env('pong', { s: d.s }, N.myId)); break;
      case 'bye': case 'kick': lost(d.reason || 'The host closed the room.'); break;
      case 'players': N.players = d.players && typeof d.players === 'object' ? d.players : {}; syncRemotes(); render(); break;
      case 's': applyState(m.f, d); break;
      case 'bs': if (fromHost && Array.isArray(d.l)) for (const e of d.l) if (Array.isArray(e)) applyState(String(e[0]), e[1]); break;
      case 'hit': if (d.to === N.myId) applyHit(me, fromHost && typeof d.from === 'string' ? d.from : m.f, d); break;
      case 'ko': applyKo(fromHost && typeof d.v === 'string' ? d.v : m.f, d); break;
      case 'pick': applyPick(d); break;
    }
  }
  function clientBeat() { if (N.isClient && now() - lastHost > DROP_MS) lost('Lost the connection to the host.'); }

  // ---------- public actions ----------
  function host(fixed, quiet) {
    if (typeof window.Peer !== 'function') { if (!quiet) note(NO_PEER, true); return; }
    if (N.online || attempt || !inHeights()) return;
    const a = attempt = { peer: null, timer: 0, quiet: !!quiet };
    a.timer = setTimeout(() => failAttempt(a, errText({ type: 'network' })), JOIN_TIMEOUT);
    (function tryCode(tries) {
      if (attempt !== a) return;
      const code = fixed || randomCode(), p = new window.Peer(PREFIX + code, { debug: 0 });
      a.peer = p;
      p.on('open', () => {
        if (attempt !== a) { try { p.destroy(); } catch (e) {} return; }
        attempt = null; clearTimeout(a.timer);
        if (!inHeights()) { try { p.destroy(); } catch (e) {} render(); return; }
        peer = p; conns = {}; seen = {}; nextClient = 1;
        N.online = true; N.isHost = true; N.isClient = false; N.code = code; N.myId = 'h';
        const mine = myAv(); N.players = { h: { id: 'h', name: mine.name, a: mine } };
        p.on('connection', onConnection);
        goOnline();
      });
      p.on('error', e => {
        if (peer === p) { if (e && e.type !== 'peer-unavailable') console.warn('[UBX net] host peer error', e && e.type); return; }
        if (attempt !== a) return;
        try { p.destroy(); } catch (x) {}
        if (e && e.type === 'unavailable-id' && fixed) { cancelAttempt(); join(fixed, quiet); return; } // someone already runs it: join them
        if (e && e.type === 'unavailable-id' && tries < 6) { tryCode(tries + 1); return; }
        failAttempt(a, errText(e));
      });
      p.on('disconnected', () => { if (peer === p && !p.destroyed) { try { p.reconnect(); } catch (e) {} } });
    })(0);
    if (!quiet) note(''); render();
  }
  function join(code, quiet) {
    if (typeof window.Peer !== 'function') { if (!quiet) note(NO_PEER, true); return; }
    code = String(code || '').toUpperCase().replace(/[^A-Z]/g, '');
    if (code !== PUB) {
      if (code.length !== 4) { note('Room codes are 4 letters.', true); return; }
      if (/[IO]/.test(code)) { note('Room codes never use the letters I or O. Check the code.', true); return; }
    }
    if (N.online || attempt || !inHeights()) return;
    const a = attempt = { peer: null, timer: 0, code, quiet: !!quiet };
    a.timer = setTimeout(() => failAttempt(a, 'Could not reach that room. Check the code and that the host is still online (some school networks block online play).'), JOIN_TIMEOUT);
    const p = a.peer = peer = new window.Peer({ debug: 0 });
    p.on('open', () => {
      if (attempt !== a) return;
      const c = hostConn = p.connect(PREFIX + code, { reliable: true });
      c.on('open', () => raw(c, env('hello', { a: myAv(), ver: VER }, null)));
      c.on('data', m => clientData(c, m));
      c.on('close', () => {
        if (hostConn !== c) return;
        if (attempt === a) failAttempt(a, 'The room closed the connection.'); else lost('The host left the room.');
      });
      c.on('error', () => {});
    });
    p.on('error', e => { if (attempt === a) { failAttempt(a, errText(e)); return; } console.warn('[UBX net] client peer error', e && e.type); });
    p.on('disconnected', () => { if (peer === p && !p.destroyed) { try { p.reconnect(); } catch (e) {} } });
    if (!quiet) note(''); render();
  }
  function leave(reason) {
    if (!N.online) { cancelAttempt(); teardown(); solo(); render(); return; }
    if (N.isHost) bcast('bye', { reason: N.code === PUB ? 'The server host left.' : 'The host closed the room.' }, null, 'h');
    else raw(hostConn, env('bye', {}, N.myId));
    goOffline(reason || (N.isHost ? 'You stopped hosting.' : 'You left the room.'), 250, false);
  }
  function manual(fn) { autoOff = true; if (N.online || attempt) leave(); fn(); } // private rooms replace the public server
  addEventListener('pagehide', () => {
    if (N.isHost) bcast('bye', { reason: 'The host closed the room.' }, null, 'h');
    else if (N.isClient) raw(hostConn, env('bye', {}, N.myId));
  });

  // ---------- UI (Heights HUD): button + panel (M), player list (Tab) ----------
  const css = document.createElement('style');
  css.textContent = '#hud #ubxnet-btn{pointer-events:auto;right:16px;bottom:70px;cursor:pointer;padding:8px 12px;font-size:13px}'
    + '#hud #ubxnet{pointer-events:auto;right:16px;bottom:116px;width:270px;font-size:13px;line-height:1.5}'
    + '#ubxnet .ubxn-code{font-size:30px;font-weight:900;letter-spacing:6px;color:#7cf;text-align:center;user-select:all}'
    + '#ubxnet .ubxn-row{display:flex;gap:6px;align-items:center;margin:8px 0}'
    + '#ubxnet input{width:96px;padding:7px;border-radius:8px;border:0;background:#ffffff1a;color:#fff;text-transform:uppercase;letter-spacing:3px;font-weight:700}'
    + '#ubxnet button.go{margin:0}#ubxnet .ubxn-x{float:right;cursor:pointer;opacity:.7}#ubxnet small{color:#9ab}'
    + '#hud #ubxtab{left:50%;top:50%;transform:translate(-50%,-50%);min-width:320px;font-size:14px;display:none}'
    + '#ubxtab table{width:100%;border-collapse:collapse;margin-top:6px}#ubxtab td{padding:3px 6px}#ubxtab td:last-child{text-align:right;color:#ffd24a}'
    + '#ubxtab tr.me td{color:#7cf;font-weight:700}#ubxtab small{color:#9ab}';
  document.head.appendChild(css);
  const btn = document.createElement('div'); btn.className = 'panel'; btn.id = 'ubxnet-btn';
  const box = document.createElement('div'); box.className = 'panel'; box.id = 'ubxnet'; box.style.display = 'none';
  const tab = document.createElement('div'); tab.className = 'panel'; tab.id = 'ubxtab';
  box.innerHTML = '<span class="ubxn-x" id="ubxnet-x">✕</span><b>🌐 Multiplayer</b><div id="ubxnet-st"></div>'
    + '<div id="ubxnet-ctl"><small>Private room:</small><div class="ubxn-row"><button class="go" id="ubxnet-host">Host</button><input type="text" id="ubxnet-code" maxlength="4" placeholder="CODE" autocomplete="off"><button class="go" id="ubxnet-join">Join</button></div></div>'
    + '<div class="ubxn-row"><button class="go" id="ubxnet-pub">Join public server</button><button class="go" id="ubxnet-leave" style="display:none;background:linear-gradient(#f66,#c33)">Leave</button></div>'
    + '<div id="ubxnet-msg"></div><div id="ubxnet-list"></div><small>M opens/closes this · Tab shows everyone. Max ' + MAX + ' players + bots (' + ROBOT + ').</small>';
  $('hud').appendChild(btn); $('hud').appendChild(box); $('hud').appendChild(tab);
  const st = $('ubxnet-st'), ctl = $('ubxnet-ctl'), lv = $('ubxnet-leave'), pub = $('ubxnet-pub'), msg = $('ubxnet-msg'), list = $('ubxnet-list'), inp = $('ubxnet-code');
  function note(t, isErr) { msg.style.color = isErr ? '#ff8a8a' : '#bcd'; msg.textContent = t || ''; }
  function render() {
    const ids = Object.keys(N.players).filter(id => !N.players[id].bot), n = ids.length, isPub = N.code === PUB;
    btn.innerHTML = N.online ? `🌐 ${isPub ? 'Public server' : (N.isHost ? 'Hosting' : 'Room') + ' · <b>' + N.code + '</b>'} · ${n} online <small>[M]</small>`
      : attempt ? '🌐 Connecting… <small>[M]</small>' : '🌐 Solo · Multiplayer <small>[M]</small>';
    st.innerHTML = N.online ? (isPub ? 'On the public server' + (N.isHost ? ' (you are hosting it)' : '') + '.'
      : N.isHost ? 'Share this code with friends:<div class="ubxn-code">' + N.code + '</div>' : 'In private room <b>' + N.code + '</b>')
      : attempt ? 'Connecting…' : 'Playing solo with bots.';
    ctl.style.display = attempt || (N.online && !isPub) ? 'none' : 'block';
    pub.style.display = !N.online && !attempt ? 'block' : 'none';
    lv.style.display = N.online || attempt ? 'block' : 'none';
    lv.textContent = attempt ? 'Cancel' : isPub ? 'Leave (play solo)' : N.isHost ? 'Stop hosting' : 'Leave room';
    list.innerHTML = N.online ? '<b>Real players (' + n + '/' + MAX + ')</b><br>' + ids.map(id => '• ' + esc(cleanName(N.players[id].name) || 'Player')
      + (id === 'h' ? ' 👑' : '') + (id === N.myId ? ' (you)' : '')).join('<br>') : '';
  }
  function renderTab() {
    const where = N.online ? (N.code === PUB ? 'Public server' : 'Room ' + N.code) : 'Server #' + ((window.UBX_SERVER && UBX_SERVER.id) || '----');
    const rows = [...chars].sort((a, b) => b.kills - a.kills).map(o => `<tr${o === me ? ' class="me"' : ''}><td>${esc(o === me ? cleanName(o.a.name) || 'You' : o.a.name)}${o === me ? ' (you)' : ''}</td><td>${o.kills | 0} KO</td></tr>`).join('');
    tab.innerHTML = `<b>${esc(where)}</b> · ${chars.length}/${CAP} players<table>${rows}</table><small>${ROBOT} = bot · hold Tab to see this</small>`;
  }
  function showTab(ms) { tabUntil = Math.max(tabUntil, now() + ms); renderTab(); tab.style.display = 'block'; }
  function setOpen(v) { box.style.display = v ? 'block' : 'none'; if (v) { try { document.exitPointerLock(); } catch (e) {} render(); } }
  btn.onclick = () => setOpen(box.style.display === 'none');
  $('ubxnet-x').onclick = () => setOpen(false);
  $('ubxnet-host').onclick = () => manual(() => host());
  $('ubxnet-join').onclick = () => manual(() => join(inp.value));
  pub.onclick = () => { autoOff = false; note(''); host(PUB, false); };
  lv.onclick = () => { if (attempt && !N.online) { autoOff = true; cancelAttempt(); teardown(); render(); return; } autoOff = true; leave(); };
  // typing a code must not move the player, teleport (E) or toggle the panel (M)
  inp.addEventListener('focus', () => { for (const k in K) K[k] = 0; });
  inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') manual(() => join(inp.value)); });
  inp.addEventListener('keyup', e => e.stopPropagation());
  addEventListener('keydown', e => {
    if (!inHeights()) return;
    if (e.code === 'Tab') { e.preventDefault(); tabHeld = true; renderTab(); tab.style.display = 'block'; return; }
    if (e.code !== 'KeyM' || e.repeat) return;
    const tg = e.target; if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA')) return;
    setOpen(box.style.display === 'none');
  });
  addEventListener('keyup', e => { if (e.code === 'Tab') { tabHeld = false; if (now() > tabUntil) tab.style.display = 'none'; } });
  // leaving the Heights (Hub button) leaves the room; runs after the game's own onclick
  $('back').addEventListener('click', () => { if (N.online || attempt) leave('You left the Heights.'); });
  setInterval(() => {
    const h = inHeights();
    if (h && !wasIn) { autoOff = false; autoT = 1.2; popT = 18 + Math.random() * 20; showTab(4000); } // just entered the Heights
    wasIn = h;
    btn.style.display = h ? '' : 'none';
    if (!h) { if (box.style.display !== 'none') box.style.display = 'none'; tab.style.display = 'none'; return; }
    if (tab.style.display !== 'none') { if (tabHeld || now() < tabUntil) renderTab(); else tab.style.display = 'none'; }
    if (!N.online && !attempt && !autoOff && typeof window.Peer === 'function') { autoT -= 0.4; if (autoT <= 0) { autoT = 40; host(PUB, true); } }
    popTick(0.4);
  }, 400);
  render();

  window.UBXNET = { remote, hit, ko, host, join, leave, state: N };
})();
