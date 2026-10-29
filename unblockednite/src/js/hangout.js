'use strict';
// ===== Live Event: the Season 1 finale hangout =====
// Its own mode on a tiny island (same seed for everyone, so nobody has to send the map). Players drop in
// and out of a public room: the first one in hosts it, everyone else joins automatically, and if the host
// leaves the rest re-form the room. Building, emotes and guns work, but nobody can be hurt. When the
// countdown hits zero, Thanos and Infinity Ultron fight in the middle of the island; it runs off the real
// clock, so everyone (in every room) sees the same fight at the same moment from their own camera.
// After the snap the screen burns white and the mode is gone.
// TEST BUILD: the mode is always listed and the event starts 60 s after you join. Set to false before launch.
const HANG_TEST = false;
const HANG = {
  SEED: 31102026, MAX: 16, ROOMS: 6, RATE: 1 / 12,
  on: false, peer: null, conn: null, conns: [], role: null, room: 1, pid: null,
  players: new Map(), // pid -> { info, c }
  log: [], sendT: 0, rosterT: 0, outShots: [],

  // the event time (a #ultron preview starts it 45 s after you open the hangout)
  // after the Ultron event the hangout is for the Season 1 finale (FINALE); #finale previews it
  finale() { return location.hash === '#finale' || (location.hash !== '#ultron' && Date.now() > ULTRON_EVENT + 3 * 60 * 1000); },
  eventTime() {
    if (this.finale()) { if (HANG_TEST || location.hash === '#finale') return this.previewT || (this.previewT = Date.now() + 45000); return SEASON2; }
    if (HANG_TEST) return this.previewT || (this.previewT = Date.now() + 60000);
    if (location.hash === '#ultron') return this.previewT || (this.previewT = Date.now() + 45000);
    return ULTRON_EVENT;
  },
  // the mode is offered until a few minutes after the event (and never again once you've seen it)
  available() {
    if (HANG_TEST || location.hash === '#ultron' || location.hash === '#finale') return true;
    if (this.finale()) { let seen = false; try { seen = localStorage.getItem('unf_finale_seen') === '1'; } catch (e) {} return !seen && Date.now() < SEASON2 + 150 * 1000; }
    let seen = false; try { seen = localStorage.getItem('unf_ultron_seen') === '1'; } catch (e) {}
    return !seen && Date.now() < ULTRON_EVENT + 3 * 60 * 1000;
  },

  // ---------- joining ----------
  start() {
    this.previewT = 0;
    startMatch({ mode: 'event', seed: this.SEED, bots: 0, diff: 'easy', zb: false });
    // startMatch builds the island on a timer: begin once it's ready
    const wait = () => { if (G.phase === 'playing' && G.arena && G.arena.hang) this.begin(); else setTimeout(wait, 100); };
    setTimeout(wait, 100);
  },
  begin() {
    this.on = true; G.event = true;
    this.players = new Map(); this.log = []; this.outShots = [];
    // the hangout spot: the town in the middle of the island
    const poi = WORLD.pois[0] || { x: 0, z: 0 };
    this.center = new THREE.Vector3(poi.x, WORLD.heightAt(poi.x, poi.z), poi.z);
    const p = WORLD.randomLandPoint(poi.x + rand(-14, 14), poi.z + rand(-14, 14), 8);
    G.player.pos.set(p.x, WORLD.heightAt(p.x, p.z) + 0.5, p.z);
    STORM.cur = { x: 0, z: 0, r: 5000 }; STORM.next = { x: 0, z: 0, r: 5000 }; STORM.syncMesh();
    // Thanos already waits in the middle of the island; Ultron shows up when the countdown ends
    if (this.finale()) FINALE.startLive(this.fightSpot()); else CINE.startLive(this.fightSpot());
    this.ui();
    for (const id of ['stormlabel', 'alive', 'kills']) { const e = document.getElementById(id); if (e) (id === 'stormlabel' ? e : e.parentElement).style.visibility = 'hidden'; } // no storm or score here
    HUD.banner('THE HANGOUT', 'Season 1 finale · stick around for the live event');
    this.connect(1);
  },
  // an open patch near the middle for the fight
  fightSpot() {
    const c = this.center;
    for (let i = 0; i < 40; i++) {
      const a = i * 2.4, r = 18 + i * 1.5, x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r, h = WORLD.heightAt(x, z);
      if (h > 3 && !WORLD.nearBuilding(x, z, 12) && [[-9, 0], [9, 0], [0, -9], [0, 9]].every(([ox, oz]) => Math.abs(WORLD.heightAt(x + ox, z + oz) - h) < 2.5 && WORLD.heightAt(x + ox, z + oz) > 3)) return new THREE.Vector3(x, h, z);
    }
    return c.clone();
  },
  stop() {
    if (!this.on) return;
    this.on = false; G.event = false;
    const old = this.peer; this.peer = null; // cleared first so its 'disconnected' handler doesn't reconnect it
    try { if (old) old.destroy(); } catch (e) { /* gone */ } this.conn = null; this.conns = []; this.role = null;
    for (const p of this.players.values()) if (p.c) CHARS.removeModel(p.c);
    this.players = new Map();
    FINALE.stop();
    if (CINE.on) { for (const c of [CINE.thanos, CINE.ultron]) if (c) CHARS.removeModel(c); if (CINE.gem) GFX.scene.remove(CINE.gem); if (CINE.ov) CINE.ov.remove(); CINE.on = false; CINE.live = false; CINE.gem = null; }
    if (this.el) { this.el.remove(); this.el = null; }
    for (const id of ['stormlabel', 'alive', 'kills']) { const e = document.getElementById(id); if (e) (id === 'stormlabel' ? e : e.parentElement).style.visibility = ''; }
  },
  info() { return { name: PROFILE.displayName(), outfit: PROFILE.data.outfit }; },
  id(i) { return NET_PREFIX + 'hangout-' + i; },
  // try to join room i; if nobody hosts it, host it ourselves
  connect(i) {
    if (!this.on) return;
    this.room = i;
    if (!NET.available()) { this.status = 'Offline: you are on your own'; return; }
    this.status = 'Connecting…';
    const p = new Peer({ debug: 0 });
    let done = false;
    const giveUp = (host) => { if (done) return; done = true; try { p.destroy(); } catch (e) { /* gone */ } if (host) this.host(i); };
    const to = setTimeout(() => giveUp(true), 7000);
    p.on('open', () => {
      const c = p.connect(this.id(i), { reliable: true });
      c.on('open', () => {
        if (done || !this.on) return; done = true; clearTimeout(to);
        this.peer = p; this.conn = c; this.role = 'client'; this.pid = p.id;
        c.send({ t: 'hello', info: this.info() });
        this.status = 'Room ' + i;
      });
      c.on('data', (m) => this.onClient(m));
      c.on('close', () => { if (this.conn === c) this.lost(); });
      c.on('error', () => {});
    });
    p.on('error', (e) => {
      if (e.type === 'peer-unavailable') { clearTimeout(to); giveUp(true); }
      else if (!done) { clearTimeout(to); giveUp(false); this.status = 'Offline: you are on your own'; }
    });
  },
  host(i) {
    if (!this.on) return;
    const p = new Peer(this.id(i), { debug: 0 });
    p.on('open', () => {
      if (!this.on) { p.destroy(); return; }
      this.peer = p; this.role = 'host'; this.pid = p.id; this.conns = []; this.status = 'Room ' + i;
      p.on('connection', (c) => {
        c.on('data', (m) => this.onHost(c, m));
        c.on('close', () => this.left(c.peer));
        c.on('error', () => {});
      });
    });
    p.on('error', (e) => {
      // someone else grabbed the room first: join them instead
      if (e.type === 'unavailable-id') { try { p.destroy(); } catch (x) { /* gone */ } setTimeout(() => this.connect(i), 300 + Math.random() * 700); }
    });
    p.on('disconnected', () => { if (this.on && this.peer === p && !p.destroyed) p.reconnect(); });
  },
  // the host left: clear their puppets and re-form the room
  lost() {
    this.conn = null; this.role = null;
    for (const [pid, p] of this.players) { if (p.c) CHARS.removeModel(p.c); G.chars = G.chars.filter((x) => x !== p.c); }
    this.players = new Map();
    const old = this.peer; this.peer = null;
    try { if (old) old.destroy(); } catch (e) { /* gone */ }
    this.status = 'Reconnecting…';
    setTimeout(() => this.connect(this.room), 400 + Math.random() * 2000);
  },
  left(pid) {
    this.conns = this.conns.filter((c) => c.peer !== pid);
    const p = this.players.get(pid);
    if (p) { if (p.c) CHARS.removeModel(p.c); G.chars = G.chars.filter((x) => x !== p.c); this.players.delete(pid); HUD.toast(p.info.name + ' left'); }
  },

  // ---------- players ----------
  puppet(pid, info) {
    let p = this.players.get(pid);
    if (p) { if (info && p.info.outfit !== info.outfit) { CHARS.removeModel(p.c); G.chars = G.chars.filter((x) => x !== p.c); p = null; this.players.delete(pid); } else return p; }
    const c = CHARS.create({ name: info.name, colors: PROFILE.outfit(info.outfit) });
    c.human = true; c.puppet = true; c.peerId = pid; c.infiniteAmmo = true; c.state = 'ground';
    CHARS.nameTag(c); CHARS.attachModel(c); G.chars.push(c);
    p = { info, c };
    this.players.set(pid, p);
    return p;
  },
  selfMsg() {
    const c = G.player, r = (v) => Math.round(v * 100) / 100;
    return { t: 's', pid: this.pid, p: [r(c.pos.x), r(c.pos.y), r(c.pos.z)], v: [r(c.vel.x), r(c.vel.y), r(c.vel.z)], yw: r(c.yaw), pt: r(c.pitch), st: c.state === 'ground' || c.state === 'glide' || c.state === 'fall' ? c.state : 'ground', g: c.onGround ? 1 : 0, vh: -1, it: NET.itemCode(c), b: c.buildType ? 1 : 0, e: c.emote ? c.emote.id : 0, sh: this.outShots.splice(0) };
  },
  applyState(m) {
    if (m.pid === this.pid) return;
    const p = this.players.get(m.pid);
    if (!p) return;
    NET.applyRemote(p.c, m);
    if (m.sh) for (const s of m.sh) FX.tracer(new THREE.Vector3(s[0], s[1], s[2]), new THREE.Vector3(s[3], s[4], s[5]), s[6], !!s[7]);
  },
  roster() {
    const list = [{ pid: this.pid, info: this.info() }];
    for (const [pid, p] of this.players) list.push({ pid, info: p.info });
    return list;
  },
  syncRoster(list) {
    const want = new Set();
    for (const r of list) { if (r.pid === this.pid) continue; want.add(r.pid); this.puppet(r.pid, r.info); }
    for (const pid of [...this.players.keys()]) if (!want.has(pid)) this.left(pid);
  },

  // ---------- messages ----------
  onHost(c, m) {
    if (m.t === 'hello') {
      if (this.players.size + 1 >= this.MAX) { c.send({ t: 'full' }); setTimeout(() => c.close(), 400); return; }
      if (!this.conns.includes(c)) this.conns.push(c);
      this.puppet(c.peer, m.info);
      c.send({ t: 'log', list: this.log });
      this.broadcast({ t: 'hr', list: this.roster() });
      HUD.toast(m.info.name + ' joined the hangout');
    } else if (m.t === 's') { m.pid = c.peer; this.applyState(m); this.broadcast(m, c); }
    else if (m.t === 'chat') { CHAT.add(m.n, m.m); this.broadcast(m, c); }
    else if (NET.EVENTS.includes(m.t)) { NET.applyEvent(m); this.remember(m); this.broadcast(m, c); }
  },
  onClient(m) {
    if (m.t === 'full') { try { this.conn.close(); } catch (e) { /* closed */ } this.conn = null; try { this.peer.destroy(); } catch (e) { /* gone */ } this.peer = null; if (this.room < this.ROOMS) this.connect(this.room + 1); return; }
    if (m.t === 'hr') this.syncRoster(m.list);
    else if (m.t === 'log') for (const e of m.list) NET.applyEvent(e);
    else if (m.t === 's') this.applyState(m);
    else if (m.t === 'chat') CHAT.add(m.n, m.m);
    else if (NET.EVENTS.includes(m.t)) NET.applyEvent(m);
  },
  broadcast(m, except) { for (const c of this.conns) if (c !== except && c.open) c.send(m); },
  // builds and broken pieces are kept so people who join later see them
  remember(m) { if (m.t === 'bp' || m.t === 'sd') { this.log.push(m); if (this.log.length > 3000) this.log.shift(); } },
  // called by NET.ev / NET.onShot / NET.chat while the hangout is on
  send(m) {
    if (this.role === 'host') { this.remember(m); this.broadcast(m); }
    else if (this.conn && this.conn.open) this.conn.send(m);
  },
  shot(o, e, color, laser) {
    if (this.outShots.length > 30) return;
    const r = (v) => Math.round(v * 10) / 10;
    this.outShots.push([r(o.x), r(o.y), r(o.z), r(e.x), r(e.y), r(e.z), color, laser ? 1 : 0]);
  },
  chat(text) {
    const m = { t: 'chat', n: PROFILE.displayName(), m: text };
    CHAT.add(m.n, m.m, true);
    this.send(m);
  },

  // ---------- every frame ----------
  update(dt) {
    if (!this.on) return;
    // network
    this.sendT -= dt;
    if (this.sendT <= 0 && this.role) {
      this.sendT = this.RATE;
      const m = this.selfMsg();
      if (this.role === 'host') this.broadcast(m); else if (this.conn && this.conn.open) this.conn.send(m);
    }
    this.rosterT -= dt;
    if (this.rosterT <= 0 && this.role === 'host') { this.rosterT = 2; this.broadcast({ t: 'hr', list: this.roster() }); }
    // nobody can fall off or drown for long: back to the middle
    const me = G.player;
    if (me && me.pos.y < -3) { const p = WORLD.randomLandPoint(this.center.x, this.center.z, 10); me.pos.set(p.x, WORLD.heightAt(p.x, p.z) + 1, p.z); me.vel.set(0, 0, 0); }
    // the event
    const T = (Date.now() - this.eventTime()) / 1000;
    if (FINALE.on) { if (T >= 0) FINALE.advance(T); FINALE.pose(dt); this.jetpackTick(dt); }
    else if (T >= 0) CINE.advance(T); else { CINE.pose(dt); CINE.ultron.model.root.visible = false; } // Ultron isn't here yet
    this.drawUi(T);
  },

  // the finale hands everyone a jetpack: hold Space to fly (flames show while it's on)
  jetpackTick(dt) {
    const me = G.player;
    if (!me || !me.model || !this.jetpack) return;
    if (!this.pack || !this.pack.parent || this.packModel !== me.model) {
      this.packModel = me.model;
      const g = this.pack = new THREE.Group(), metal = new THREE.MeshLambertMaterial({ color: 0x9aa3ad }), dark = new THREE.MeshLambertMaterial({ color: 0x2b2f36 });
      for (const sx of [-0.13, 0.13]) {
        const t = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.5, 10), metal); t.position.set(sx, -0.05, 0.06); g.add(t);
        const n = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.1, 10), dark); n.position.set(sx, -0.35, 0.06); g.add(n);
        const f = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.45, 8), new THREE.MeshBasicMaterial({ color: 0xffa630, transparent: true, opacity: 0.9 })); f.rotation.x = Math.PI; f.position.set(sx, -0.63, 0.06); f.userData.flame = true; g.add(f);
      }
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.42, 0.1), dark));
      // placed in the world on the middle of the back (characters face -z at yaw 0, so the back is +z), then
      // handed to the torso so it stays there and leans with it
      const root = me.model.root;
      g.position.set(0, 1.25, 0.2); root.add(g); root.updateMatrixWorld(true);
      (me.model.body || root).attach(g);
    }
    const on = !!INPUT.keys.Space && me.alive && !FINALE.boarded;
    if (on) { me.vel.y = Math.min(11, me.vel.y + 34 * dt); me.onGround = false; }
    for (const m of this.pack.children) if (m.userData.flame) { m.visible = on; m.scale.y = 0.8 + Math.random() * 0.5; }
  },

  // ---------- countdown ----------
  ui() {
    const el = this.el = document.createElement('div');
    el.style.cssText = 'position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:50;text-align:center;pointer-events:none;font:800 15px system-ui;color:#fff;text-shadow:0 2px 6px #000a';
    el.innerHTML = '<div style="letter-spacing:.2em;font-size:12px;color:#ffd84a">' + (this.finale() ? 'SEASON 1 FINALE · THE END' : 'SEASON 1 FINALE · LIVE EVENT') + '</div><div id="hang-cd" style="font:900 34px system-ui;margin-top:2px"></div><div id="hang-st" style="font:600 12px system-ui;opacity:.8"></div>';
    document.body.appendChild(el);
  },
  drawUi(T) {
    if (!this.el) return;
    const cd = this.el.querySelector('#hang-cd'), st = this.el.querySelector('#hang-st');
    if (T >= 0) { this.el.style.display = 'none'; return; }
    const s = Math.ceil(-T), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), mi = Math.floor(s % 3600 / 60), se = s % 60;
    const two = (n) => String(n).padStart(2, '0');
    cd.textContent = s <= 10 ? String(s) : (d ? d + 'd ' : '') + (d || h ? two(h) + ':' : '') + two(mi) + ':' + two(se);
    cd.style.fontSize = s <= 10 ? '64px' : '34px';
    cd.style.color = s <= 10 ? '#ff4a4a' : '#fff';
    st.textContent = (this.players.size + 1) + ' in the hangout · ' + (this.status || '');
  },
};

// the mode itself (only listed while the event is coming up)
if (HANG.available()) MODES.event = { name: 'Live Event', tag: 'Season 1 Finale', tiny: true, arena: { teams: [1], hang: true }, bots: () => 0, diff: () => 'easy', desc: 'Hang out on a tiny island with everyone online and watch the Season 1 finale live. Build, emote and mess around: nobody can get hurt.' };
