'use strict';
// ===== Multiplayer: peer-to-peer parties over WebRTC (PeerJS) =====
// The host's browser runs the world (bots, bosses, storm) and sends a snapshot ~15x a second.
// Every player simulates their own movement and sends it to the host, who relays it to the others.
// Clients detect their own hits and send them to the host, who applies the damage.
// Party codes are 4 letters; the PeerJS public server only introduces the browsers to each other.
const NET_PREFIX = 'unblockednite-v1-';
const NET_RATE = 1 / 15;

// Math.random swapped for a seeded generator while every peer builds the same match
// three.js draws its object UUIDs from Math.random too, and how many objects get made depends on what's
// already cached in that browser. Those calls get an unseeded number so they can't shift the match's
// random stream (otherwise a friend's island could come out slightly different).
function withSeed(seed, fn) {
  const real = Math.random, rnd = mulberry32(seed >>> 0), lim = Error.stackTraceLimit;
  Math.random = function () {
    Error.stackTraceLimit = 2;
    const st = new Error().stack || '';
    Error.stackTraceLimit = lim;
    return st.indexOf('/three') >= 0 ? real() : rnd();
  };
  try { return fn(); } finally { Math.random = real; Error.stackTraceLimit = lim; }
}

const NET = {
  peer: null, role: null, code: '', conns: [], conn: null,
  roster: [], me: null, status: '', inMatch: false, sendT: 0,
  byNid: [], outHits: [], outShots: [],
  get host() { return this.role === 'host' && this.inMatch; },
  get client() { return this.role === 'client' && this.inMatch; },
  get party() { return !!this.role; },

  // ---------- party ----------
  myInfo() { const d = PROFILE.data; return { name: PROFILE.displayName(), outfit: d.outfit, level: d.level, crowned: !!d.crowned }; },
  available() { return typeof Peer !== 'undefined'; },
  // your outfit / name changed in the lobby
  sendInfo() {
    if (this.role === 'client' && this.conn && this.conn.open) this.conn.send({ t: 'info', info: this.myInfo() });
    else if (this.role === 'host') { const me = this.roster[0]; if (me) { Object.assign(me, this.myInfo()); this.sendRoster(); LOBBY.onParty(); } }
  },
  create(cb) {
    if (!this.available()) return cb && cb('Multiplayer needs an internet connection (PeerJS did not load).');
    this.leave();
    const tryCode = (tries) => {
      const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
      const code = Array.from({ length: 4 }, () => A[Math.floor(Math.random() * A.length)]).join('');
      const p = new Peer(NET_PREFIX + code, { debug: 0 });
      p.on('open', () => {
        this.peer = p; this.role = 'host'; this.code = code; this.me = p.id;
        this.roster = [Object.assign({ pid: p.id }, this.myInfo())];
        this.status = 'Party ready: share the code';
        p.on('connection', (c) => this.onJoin(c));
        LOBBY.onParty(); cb && cb(null);
      });
      p.on('error', (e) => {
        if (e.type === 'unavailable-id' && tries < 5) { p.destroy(); tryCode(tries + 1); return; }
        if (this.peer === p) this.fail(e); else cb && cb(this.errText(e));
      });
      p.on('disconnected', () => { if (this.peer === p && !p.destroyed) p.reconnect(); });
    };
    tryCode(0);
  },
  join(code, cb) {
    if (!this.available()) return cb && cb('Multiplayer needs an internet connection (PeerJS did not load).');
    code = String(code || '').toUpperCase().replace(/[^A-Z]/g, '');
    if (code.length !== 4) return cb && cb('Party codes are 4 letters.');
    this.leave();
    const p = new Peer({ debug: 0 });
    p.on('open', () => {
      const c = p.connect(NET_PREFIX + code, { reliable: true });
      const timeout = setTimeout(() => { if (this.role !== 'client') { cb && cb('Could not reach that party. Check the code (and that the host is in the lobby).'); this.leave(); } }, 12000);
      c.on('open', () => {
        clearTimeout(timeout);
        this.peer = p; this.conn = c; this.role = 'client'; this.code = code; this.me = p.id;
        c.send({ t: 'hello', info: this.myInfo() });
        this.status = 'Joined: waiting for the host to start';
        cb && cb(null);
      });
      c.on('data', (m) => this.onClientMsg(m));
      c.on('close', () => { if (this.conn === c) { this.dropped('The host left the party.'); } });
      c.on('error', () => {});
    });
    p.on('error', (e) => { if (this.role !== 'client') cb && cb(this.errText(e)); else this.fail(e); });
  },
  leave() {
    try { if (this.conn) this.conn.close(); } catch (e) { /* closed */ }
    for (const c of this.conns) { try { c.close(); } catch (e) { /* closed */ } }
    try { if (this.peer) this.peer.destroy(); } catch (e) { /* gone */ }
    this.peer = null; this.conn = null; this.conns = []; this.role = null; this.code = ''; this.roster = []; this.inMatch = false;
    if (typeof LOBBY !== 'undefined' && LOBBY.el.lobby) LOBBY.onParty();
  },
  errText(e) {
    return e.type === 'peer-unavailable' ? 'No party with that code (the host must be in the lobby).'
      : e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error' ? 'Could not reach the matchmaking server. Check your internet.'
        : e.type === 'browser-incompatible' ? 'This browser cannot do peer-to-peer.' : 'Connection problem (' + e.type + ').';
  },
  fail(e) { this.dropped(this.errText(e)); },
  dropped(msg) {
    const wasMatch = this.inMatch;
    this.leave();
    if (typeof HUD !== 'undefined' && wasMatch) HUD.toast(msg);
    if (typeof LOBBY !== 'undefined') LOBBY.toast(msg);
  },

  // host: someone connected
  onJoin(c) {
    c.on('data', (m) => this.onHostMsg(c, m));
    c.on('close', () => this.onLeft(c));
    c.on('error', () => {});
  },
  onLeft(c) {
    this.conns = this.conns.filter((x) => x !== c);
    const who = this.roster.find((r) => r.pid === c.peer);
    this.roster = this.roster.filter((r) => r.pid !== c.peer);
    this.sendRoster(); LOBBY.onParty();
    if (who) { (this.inMatch ? HUD : LOBBY).toast(who.name + ' left the party'); }
    // in a match their character just stands there; finish them off so the game can end
    if (this.inMatch) { const ch = G.chars.find((x) => x.peerId === c.peer && x.alive); if (ch) CHARS.damage(ch, 99999, null, { direct: true }); }
  },
  sendRoster() { for (const c of this.conns) c.send({ t: 'roster', list: this.roster }); },
  broadcast(m, except) { for (const c of this.conns) if (c !== except && c.open) c.send(m); },

  // ---------- gameplay events (builds, broken walls, chests, loot) ----------
  // the sender has already applied it; the host relays it to everyone else
  ev(m) {
    if (HANG.on) return HANG.send(m);
    if (!this.inMatch) return;
    if (this.role === 'host') this.broadcast(m);
    else if (this.conn && this.conn.open) this.conn.send(m);
  },
  applyEvent(m) {
    if (m.t === 'bp') BUILD.placeRemote(m);
    else if (m.t === 'sd') { const s = PHYS.byKey.get(m.k); if (s && s.alive) { s._remote = true; WORLD.destroySolid(s); } }
    else if (m.t === 'co') { const ch = ITEMS.chests[m.i]; if (ch) ITEMS.openChest(ch, null, true); }
    else if (m.t === 'ps') { if (!ITEMS.pickups.some(p => p.id === m.id)) { const p = ITEMS.spawnPickup(m.it, m.p[0], m.p[1], m.p[2], !!m.pop, m.id); if (m.v) p.vel.set(m.v[0], m.v[1], m.v[2]); } }
    else if (m.t === 'pr') { const p = ITEMS.pickups.find(q => q.id === m.id); if (p) ITEMS.removePickup(p, true); }
    else if (m.t === 'rv') { const ch = this.byNid[m.n]; if (ch) POWERS.revoke(ch, m.id, true); }
    else if (m.t === 'gr') { const ch = this.byNid[m.n]; if (ch) POWERS.grant(ch, m.id, true); }
  },
  EVENTS: ['bp', 'sd', 'co', 'ps', 'pr', 'gr', 'rv'],
  // party chat (works in the lobby and in a match)
  chat(text) {
    text = String(text || '').trim().slice(0, 140);
    if (HANG.on) { if (text) HANG.chat(text); return; }
    if (!text || !this.role) return;
    const m = { t: 'chat', n: PROFILE.displayName(), m: text };
    CHAT.add(m.n, m.m, true);
    if (this.role === 'host') this.broadcast(m);
    else if (this.conn && this.conn.open) this.conn.send(m);
  },

  // ---------- messages ----------
  onHostMsg(c, m) {
    if (m.t === 'chat') { CHAT.add(m.n, m.m); this.broadcast(m, c); return; }
    if (m.t === 'hello') {
      if (this.inMatch) { c.send({ t: 'busy' }); setTimeout(() => c.close(), 500); return; }
      if (this.roster.length >= 8) { c.send({ t: 'full' }); setTimeout(() => c.close(), 500); return; }
      if (!this.conns.includes(c)) this.conns.push(c);
      this.roster = this.roster.filter((r) => r.pid !== c.peer).concat([Object.assign({ pid: c.peer }, m.info)]);
      this.sendRoster(); LOBBY.onParty(); LOBBY.toast(m.info.name + ' joined your party');
    } else if (m.t === 'info') {
      const r = this.roster.find((x) => x.pid === c.peer); if (r) { Object.assign(r, m.info); this.sendRoster(); LOBBY.onParty(); }
    } else if (!this.inMatch) return;
    else if (this.EVENTS.includes(m.t)) { this.applyEvent(m); this.broadcast(m, c); }
    else if (m.t === 's') {
      const ch = G.chars.find((x) => x.peerId === c.peer);
      if (ch) this.applyRemote(ch, m);
      if (m.sh && m.sh.length) for (const s of m.sh) FX.tracer(new THREE.Vector3(s[0], s[1], s[2]), new THREE.Vector3(s[3], s[4], s[5]), s[6], !!s[7]);
      if (m.sh && m.sh.length) this.outShots.push(...m.sh);
    } else if (m.t === 'hit') {
      const att = G.chars.find((x) => x.peerId === c.peer), tgt = this.byNid[m.n];
      if (att && tgt) CHARS.damage(tgt, m.a, m.self ? null : att, { head: m.h, weapon: m.w, direct: !!m.d, fall: !!m.fall, net: true });
    } else if (m.t === 'reboot') {
      REBOOT.revive(m.n, m.v);
    } else if (m.t === 'set') {
      const ch = G.chars.find((x) => x.peerId === c.peer);
      if (ch && ch.alive) { ch.hp = Math.min(ch.maxHp || 100, m.hp); ch.shield = Math.min(ch.maxShield || 100, m.sh); }
    }
  },
  onClientMsg(m) {
    if (m.t === 'chat') { CHAT.add(m.n, m.m); return; }
    if (m.t === 'roster') { this.roster = m.list; LOBBY.onParty(); }
    else if (m.t === 'busy') this.dropped('That party is already in a match. Try again when they are back in the lobby.');
    else if (m.t === 'full') this.dropped('That party is full.');
    else if (m.t === 'start') { this.roster = m.roster; startMatch({ seed: m.seed, mode: m.mode, diff: m.diff, bots: m.bots, zb: m.zb, arena: m.arena }); }
    else if (!this.inMatch) return;
    else if (this.EVENTS.includes(m.t)) this.applyEvent(m);
    else if (m.t === 'w') this.applyWorld(m);
    else if (m.t === 'tolobby') { HUD.toast('The host went back to the lobby'); setTimeout(() => { if (this.inMatch) { toLobby(); LOBBY.toast('The host ended the match'); } }, 1200); }
    else if (m.t === 'elim') {
      const v = this.byNid[m.v], k = m.k >= 0 ? this.byNid[m.k] : null;
      if (v && v.alive) CHARS.eliminate(v, k, m.w);
    } else if (m.t === 'revoke') { const ch = this.byNid[m.n]; if (ch) POWERS.revoke(ch, m.id, true);
    } else if (m.t === 'grant') { const ch = this.byNid[m.n]; if (ch) POWERS.grant(ch, m.id); }
    else if (m.t === 'revive') { const ch = this.byNid[m.n]; if (ch && !ch.alive) REBOOT.bringBack(ch, REBOOT.vans[m.v]); }
  },

  // ---------- match ----------
  // host: start everyone on the same seed
  startParty() {
    const mode = PROFILE.data.mode;
    const M = MODES[mode] || MODES.solo;
    const seed = (Math.random() * 1e9) | 0;
    const msg = { t: 'start', seed, mode, diff: M.diff(), bots: Math.max(1, M.bots() - (this.roster.length - 1)), zb: !!PROFILE.data.zeroBuild, arena: M.arena ? ARENA.cfg() : null, roster: this.roster };
    this.broadcast(msg);
    startMatch({ seed, mode, diff: msg.diff, bots: msg.bots, zb: msg.zb, arena: msg.arena });
  },
  // called by startMatch once every character exists (same order on every peer)
  begin() {
    this.inMatch = true; this.sendT = 0; this.outHits = []; this.outShots = [];
    this.byNid = G.chars.slice();
    G.chars.forEach((c, i) => { c.nid = i; });
  },
  end() { this.inMatch = false; },

  // remote players are puppets: no physics or AI, they follow the latest state they sent
  applyRemote(c, m) {
    c.netTo = c.netTo || new THREE.Vector3();
    c.netTo.set(m.p[0], m.p[1], m.p[2]);
    c.vel.set(m.v[0], m.v[1], m.v[2]);
    c.netYaw = m.yw; c.pitch = m.pt;
    if (m.st && c.state !== 'dead' && c.alive) {
      if (c.state === 'bus' && m.st !== 'bus') c.pos.copy(c.netTo);
      c.state = m.st;
    }
    this.applyItem(c, m.it);
    c.buildType = m.b ? 'wall' : null;
    if (m.e && (!c.emote || c.emote.id !== m.e)) { c.emote = { id: m.e, t: 0 }; if (c.model) c.model.anim = null; }
    else if (!m.e && c.emote) c.emote = null;
    c.onGround = !!m.g;
    c.netVeh = m.vh === undefined ? -1 : m.vh;
    c.netSeen = G.time;
  },
  applyItem(c, it) {
    if (!it) { c.sel = -1; return; }
    const id = it.slice(0, -1), r = +it.slice(-1);
    if (!WEAPONS[id] && !CONSUMABLES[id]) return;
    const item = WEAPONS[id] ? { kind: 'weapon', id, rarity: r, mag: 9999, special: true } : { kind: 'cons', id, count: 1 };
    const cur = c.slots[0];
    if (!cur || cur.id !== id || cur.rarity !== item.rarity) c.slots[0] = item;
    c.sel = 0;
  },
  puppetStep(c, dt) {
    if (!c.netTo) return;
    if (c.state === 'bus') { c.pos.copy(BUS.pos); return; }
    const k = Math.min(1, dt * 12);
    if (c.pos.distanceToSquared(c.netTo) > 400) c.pos.copy(c.netTo); else c.pos.lerp(c.netTo, k);
    if (c.netYaw !== undefined) c.yaw = c.yaw + wrapAngle(c.netYaw - c.yaw) * k;
    // driving: their car follows them and they're hidden inside it
    if (c.netVeh >= 0) { VEH.follow(c, c.netVeh); if (c.model) c.model.root.visible = false; }
    else if (c.vehicle) { c.vehicle.driver = null; c.vehicle = null; }
    if (c.isSmasher && c.hp < c.maxHp && G.time - c.lastHitTime > 3 && this.host) c.hp = Math.min(c.maxHp, c.hp + 25 * dt);
  },

  // ---------- per-frame send ----------
  update(dt) {
    if (!this.inMatch) return;
    this.sendT -= dt;
    if (this.sendT > 0) return;
    this.sendT = NET_RATE;
    if (this.role === 'host') this.sendWorld();
    else this.sendSelf();
  },
  itemCode(c) {
    if (c.buildType) return '';
    const it = CHARS.currentItem(c);
    if (!it || it.id === 'pickaxe') return '';
    return it.id + (it.rarity || 0);
  },
  sendSelf() {
    const c = G.player;
    if (!c || !this.conn || !this.conn.open) return;
    const r = (v) => Math.round(v * 100) / 100;
    this.conn.send({ t: 's', p: [r(c.pos.x), r(c.pos.y), r(c.pos.z)], v: [r(c.vel.x), r(c.vel.y), r(c.vel.z)], yw: r(c.yaw), pt: r(c.pitch), st: c.state, g: c.onGround ? 1 : 0, vh: c.vehicle ? c.vehicle.id : -1, it: this.itemCode(c), b: c.buildType ? 1 : 0, e: c.emote ? c.emote.id : 0, sh: this.outShots.splice(0) });
  },
  // host: everyone's position, health and what they hold, plus the storm
  sendWorld() {
    if (!this.conns.length) return;
    const r = (v) => Math.round(v * 100) / 100, out = [];
    const r1 = (v) => Math.round(v * 10) / 10;
    for (const c of this.byNid) {
      if (!c) continue;
      // eliminated players are sent a few more times, then dropped from the snapshot
      if (!c.alive) { c.netDeadSent = (c.netDeadSent || 0) + 1; if (c.netDeadSent > 5) continue; }
      out.push([c.nid, r1(c.pos.x), r1(c.pos.y), r1(c.pos.z), r(c.yaw), r(c.pitch), c.state, Math.round(c.hp), Math.round(c.shield), this.itemCode(c), c.alive ? 1 : 0, c.emote ? c.emote.id : 0, c.maxHp || 100, c.onGround ? 1 : 0, r1(c.vel.x), r1(c.vel.z), c.vehicle ? c.vehicle.id : -1]);
    }
    const S = STORM, st = [S.cur.x, S.cur.z, S.cur.r, S.next.x, S.next.z, S.next.r, S.phase, S.state, r(S.timer), S.dps];
    const msg = { t: 'w', c: out, s: st, sh: this.outShots.splice(0) };
    for (const conn of this.conns) if (conn.open) conn.send(msg);
  },
  // client: copy the host's world (except your own movement)
  applyWorld(m) {
    const me = G.player;
    for (const a of m.c) {
      const c = this.byNid[a[0]];
      if (!c) continue;
      if (c === me) {
        // the host is in charge of your health
        if (c.alive) { c.hp = a[7]; c.shield = a[8]; c.maxHp = a[12]; }
        continue;
      }
      c.netTo = c.netTo || new THREE.Vector3();
      c.netTo.set(a[1], a[2], a[3]); c.netYaw = a[4]; c.pitch = a[5];
      if (c.alive && c.state !== 'dead') { if (c.state === 'bus' && a[6] !== 'bus') c.pos.copy(c.netTo); c.state = a[6]; }
      c.hp = a[7]; c.shield = a[8]; c.maxHp = a[12]; c.onGround = !!a[13];
      c.vel.set(a[14], c.vel.y, a[15]);
      c.netVeh = a[16] === undefined ? -1 : a[16];
      this.applyItem(c, a[9]);
      const e = a[11];
      if (e && (!c.emote || c.emote.id !== e)) { c.emote = { id: e, t: 0 }; if (c.model) c.model.anim = null; }
      else if (!e && c.emote) c.emote = null;
    }
    const s = m.s, S = STORM;
    S.cur.x = s[0]; S.cur.z = s[1]; S.cur.r = s[2]; S.next.x = s[3]; S.next.z = s[4]; S.next.r = s[5]; S.phase = s[6]; S.state = s[7]; S.timer = s[8]; S.dps = s[9];
    if (m.sh) for (const t of m.sh) FX.tracer(new THREE.Vector3(t[0], t[1], t[2]), new THREE.Vector3(t[3], t[4], t[5]), t[6], !!t[7]);
  },

  // ---------- hooks used by the rest of the game ----------
  // a client's game never applies damage itself: its own hits go to the host, everything else is ignored
  clientDamage(c, amount, attacker, opts) {
    if (opts.net) return false;
    if (attacker === G.player || (c === G.player && !attacker && (opts.fall || opts.explosive))) {
      if (this.conn && this.conn.open) this.conn.send({ t: 'hit', n: c.nid, a: Math.round(amount), h: !!opts.head, w: opts.weapon || '', d: !!opts.direct, fall: !!opts.fall, self: c === G.player && !attacker });
      if (attacker === G.player && c !== G.player && c.alive) {
        FX.dmgNumber(_v1.set(c.pos.x, c.pos.y + 2.1, c.pos.z), Math.round(amount), opts.head ? 'head' : c.shield > 0 ? 'shield' : 'hp');
        HUD.hitMarker(opts.head);
        if (!opts.pellets || Math.random() < 0.34) SFX.play(opts.head ? 'headshot' : 'hit', 0.5);
      }
    }
    return true;
  },
  // host: tell everyone who went down
  onElim(c, killer, weapon) { if (this.host) this.broadcast({ t: 'elim', v: c.nid, k: killer && killer.nid !== undefined ? killer.nid : -1, w: weapon || '' }); },
  onGrant(c, id) { if (this.host) this.broadcast({ t: 'grant', n: c.nid, id }); },
  // shots fired by you (and on the host, by everyone) so the others see the tracer
  onShot(c, o, e, color, laser) {
    if (HANG.on) { if (c === G.player) HANG.shot(o, e, color, laser); return; }
    if (!this.inMatch) return;
    if (this.role === 'client' && c !== G.player) return;
    if (this.outShots.length > 40) return;
    const r = (v) => Math.round(v * 10) / 10;
    this.outShots.push([r(o.x), r(o.y), r(o.z), r(e.x), r(e.y), r(e.z), color, laser ? 1 : 0]);
  },
  // a client healed itself: the host keeps the score
  sendReboot(nid, van) { if (this.conn && this.conn.open) this.conn.send({ t: 'reboot', n: nid, v: van }); },
  onHeal(c) { if (this.client && c === G.player && this.conn && this.conn.open) this.conn.send({ t: 'set', hp: Math.round(c.hp), sh: Math.round(c.shield) }); },
};

// ---- party chat box (bottom left, in the lobby and in matches). Enter opens it, Enter sends, Esc closes ----
const CHAT = {
  log: [],
  el() { return { box: document.getElementById('chat'), list: document.getElementById('chat-list'), input: document.getElementById('chat-in') }; },
  add(name, text, mine) {
    this.log.push({ name, text, mine, t: performance.now() });
    if (this.log.length > 40) this.log.shift();
    this.render();
    if (!mine) SFX.play('click', 0.4);
  },
  render() {
    const E = this.el(); if (!E.list) return;
    E.box.hidden = !NET.role;
    E.list.innerHTML = this.log.slice(-8).map((l) => `<div class="cl${l.mine ? ' me' : ''}" data-t="${l.t}"><b>${esc(l.name)}:</b> ${esc(l.text)}</div>`).join('');
  },
  open() {
    const E = this.el(); if (!E.input || (!NET.role && !HANG.on)) return;
    if (document.pointerLockElement) document.exitPointerLock();
    E.box.classList.add('typing'); E.input.hidden = false; E.input.value = ''; E.input.focus();
  },
  close() { const E = this.el(); if (!E.input) return; E.input.blur(); E.input.hidden = true; E.box.classList.remove('typing'); },
  init() {
    const E = this.el(); if (!E.input) return;
    E.input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { NET.chat(E.input.value); this.close(); }
      else if (e.key === 'Escape') this.close();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || !NET.role || document.activeElement === E.input) return;
      if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
      e.preventDefault(); this.open();
    });
    // old lines fade out
    setInterval(() => { const now = performance.now(); document.querySelectorAll('#chat-list .cl').forEach((d) => d.classList.toggle('old', now - +d.dataset.t > 12000)); }, 1000);
  },
};
