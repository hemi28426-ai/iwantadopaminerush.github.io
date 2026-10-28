'use strict';
// ===== Lobby: character on a pedestal over the island, tabs (Play, Locker, Shop, Quests, Career) =====
const MODES = {
  solo: { name: 'Solo', tag: 'Battle Royale', bots: () => SETTINGS.bots, diff: () => SETTINGS.difficulty, desc: 'Classic battle royale. You against the lobby, last one standing wins.' },
  mega: { name: 'Mega Lobby', tag: 'Battle Royale', bots: () => 99, diff: () => SETTINGS.difficulty, desc: 'A full 100-player island. Chaotic drops, long fights.' },
  chill: { name: 'Chill', tag: 'Practice', bots: () => 19, diff: () => 'easy', desc: 'Small lobby of easy bots. Good for learning to build.' },
  hvv: { name: 'Heroes vs Villains', tag: 'Marvel · 25 v 25', team: true, bots: () => 49, diff: () => SETTINGS.difficulty, desc: 'Two teams of 25. Your equipped skin picks your side: heroes (Spider-Man, Iron Man, Cap, Hulk, Strange, Jonesy, Banana) or villains (Thanos, Doom, V1, Adam). Wipe out the other side.' },
  sweaty: { name: 'Sweaty', tag: 'Battle Royale', bots: () => 49, diff: () => 'hard', desc: 'Hard bots that build, aim and push. Bring your best.' },
  reload: { name: 'Reload', tag: 'Battle Royale · Tiny map', small: true, sizes: [20, 40, 100, 500], bots: () => (RELOAD_SIZES.includes(PROFILE.data.reloadSize) ? PROFILE.data.reloadSize : 40) - 1, diff: () => SETTINGS.difficulty, desc: 'A tiny island, a fast storm and a boss already waiting when you drop. Matches last about 5 minutes. One life.' },
};
const RELOAD_SIZES = [20, 40, 100, 500];
// Arena: small fights on a tiny island, no bus, everyone starts with the loadout they picked
const ARENA_SLOTS = (a) => a.teams.reduce((s, n) => s + n, 0);
Object.assign(MODES, {
  duel: { name: '1v1', tag: 'Arena', arena: { teams: [1, 1] }, bots: () => 1, diff: () => ARENA.cfg().diff, desc: 'One on one. Pick your loadout and fight in a tiny arena. Play a friend or a bot.' },
  duos2: { name: '2v2', tag: 'Arena', arena: { teams: [2, 2] }, bots: () => 3, diff: () => ARENA.cfg().diff, desc: 'Two teams of two in a tiny arena. Friends and bots fill the teams.' },
  trios3: { name: '3v3', tag: 'Arena', arena: { teams: [3, 3] }, bots: () => 5, diff: () => ARENA.cfg().diff, desc: 'Three on three. Last team standing wins.' },
  onev2: { name: '1v2', tag: 'Arena', arena: { teams: [1, 2] }, bots: () => 2, diff: () => ARENA.cfg().diff, desc: 'You alone against two. Good luck.' },
  bossprac: { name: '4 vs Boss', tag: 'Arena · Practice', arena: { teams: [4], boss: true }, bots: () => 3, diff: () => ARENA.cfg().diff, desc: 'Up to four of you (friends or bot teammates) against a boss of your choice. Practice the fight.' },
});
const ARENA = {
  WEAPONS: ['ar', 'shotgun', 'smg', 'sniper', 'pistol', 'minigun', 'handcannon', 'rocket', 'quad'],
  HEALS: ['big', 'mini', 'medkit', 'bandage'],
  BOSSES: ['random', 'doom', 'thanos', 'ironman', 'all'],
  cfg() {
    const d = PROFILE.data;
    if (!d.arena) d.arena = {};
    const a = d.arena;
    if (typeof a.bots !== 'boolean') a.bots = true;
    if (!DIFF_LABEL[a.diff]) a.diff = 'normal';
    if (typeof a.split !== 'boolean') a.split = true;
    if (!this.BOSSES.includes(a.boss)) a.boss = 'random';
    if (!Array.isArray(a.loadout) || a.loadout.length !== 5) a.loadout = ['ar', 'shotgun', 'smg', 'sniper', 'big'];
    return a;
  },
  open(modeId) {
    const a = this.cfg(), M = MODES[modeId], el = document.getElementById('arena');
    const opt = (v, label, cur) => `<option value="${v}"${v === cur ? ' selected' : ''}>${label}</option>`;
    const itemName = (id) => (WEAPONS[id] ? WEAPONS[id].name : CONSUMABLES[id] ? CONSUMABLES[id].name : id);
    const slots = a.loadout.map((cur, i) => `<label class="ar-slot"><span>Slot ${i + 1}</span><select data-slot="${i}">${this.WEAPONS.concat(this.HEALS).map((id) => opt(id, itemName(id), cur)).join('')}</select></label>`).join('');
    const bossNames = { random: 'Random boss', adam: 'Adam Smasher', doom: 'Doctor Doom', thanos: 'Thanos', ironman: 'Iron Man', all: 'All of them' };
    document.getElementById('arena-body').innerHTML = `
      <h2>${M.name}</h2><p class="sub">${M.desc}</p>
      <h5>Loadout <small>(all Legendary)</small></h5><div class="ar-slots">${slots}</div>
      <h5>Opponents</h5>
      <div class="ar-row"><label><input type="checkbox" id="ar-bots"${a.bots ? ' checked' : ''}> Fill empty spots with bots</label>
      <label>Bot skill <select id="ar-diff">${['easy', 'normal', 'hard'].map((k) => opt(k, DIFF_LABEL[k], a.diff)).join('')}</select></label></div>
      ${M.arena.boss ? `<div class="ar-row"><label>Boss <select id="ar-boss">${this.BOSSES.map((k) => opt(k, bossNames[k], a.boss)).join('')}</select></label></div>` : `<div class="ar-row"><label><input type="checkbox" id="ar-split"${a.split ? ' checked' : ''}> Party friends on opposite teams (friends vs friends)</label></div>`}
      <p class="sub">Arena and boss practice wins don't count on the leaderboard.</p>`;
    el.querySelectorAll('[data-slot]').forEach((s) => s.onchange = () => { a.loadout[+s.dataset.slot] = s.value; PROFILE.save(); });
    const on = (id, fn) => { const x = document.getElementById(id); if (x) x.onchange = () => { fn(x); PROFILE.save(); LOBBY.refreshMode(); }; };
    on('ar-bots', (x) => { a.bots = x.checked; }); on('ar-diff', (x) => { a.diff = x.value; }); on('ar-split', (x) => { a.split = x.checked; }); on('ar-boss', (x) => { a.boss = x.value; });
    el.hidden = false;
  },
};
const DIFF_LABEL = { easy: 'Easy bots', normal: 'Normal bots', hard: 'Hard bots' };

// The LeBron clip (lebron-intro.mp4, next to the game file): an AI parody, shown before every match you start.
// If the file is missing or can't play, the match just starts.
const LEBRON_INTRO = {
  play(done) {
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#000;display:grid;place-items:center';
    ov.innerHTML = '<video playsinline style="max-width:100vw;max-height:100vh"></video>'
      + '<div style="position:fixed;left:14px;top:12px;font:700 12px system-ui;color:#fff;background:#000a;padding:4px 8px;border-radius:6px;letter-spacing:.06em">100% THE REAL LEBRON™ <span style="opacity:.75">(AI parody)</span></div>'
      + '<button type="button" style="position:fixed;right:16px;bottom:16px;font:800 15px system-ui;padding:10px 18px;border:0;border-radius:8px;background:#ffd84a;color:#1b1b1b;cursor:pointer">Skip ▶</button>';
    document.body.appendChild(ov);
    const v = ov.querySelector('video'), finish = () => { if (!ov.parentNode) return; ov.remove(); done(); };
    v.src = 'lebron-intro.mp4'; v.volume = SETTINGS.volume;
    v.onended = finish; v.onerror = finish;
    ov.querySelector('button').onclick = finish;
    v.play().catch(() => { v.muted = true; v.play().catch(finish); });
  },
};
const LOBBY = {
  root: null, model: null, ring: null, dots: null, bus: null, key: null,
  P: new THREE.Vector3(), dir: new THREE.Vector3(), right: new THREE.Vector3(),
  tab: 'play', yawOff: 0, drag: null, emoteT: 0, emoteId: null, t: 0, preview: null,
  camPos: new THREE.Vector3(), camLook: new THREE.Vector3(), camInit: false,
  thumbs: {}, tr: null, el: {},

  init() {
    const $ = (id) => document.getElementById(id);
    for (const id of ['lobby', 'lb-coins', 'lb-level', 'lb-xpfill', 'lb-xptext', 'lb-name', 'lb-nametag', 'lb-slotL', 'lb-slotR', 'lb-mode-name', 'lb-mode-sub', 'lb-quests', 'locker-grid', 'locker-detail', 'shop-featured', 'shop-emotes', 'locker-emotes', 'locker-emote-note', 'locker-tools', 'shop-timer', 'quest-list', 'quest-timer', 'quest-level', 'career-grid', 'modes', 'mode-list', 'settings', 'buy', 'buy-card', 'buy-text', 'buy-ok', 'lb-toast', 'lb-reward', 'hvv', 'hvv-grid', 'hvv-sides', 'hvv-title', 'hvv-back', 'party', 'party-body', 'party-err', 'lb-play'])
      this.el[id] = $(id);
    document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { SFX.init(); SFX.play('click', 0.5); this.setTab(b.dataset.tab); }));
    $('lb-play').addEventListener('click', () => {
      SFX.init(); SFX.play('click');
      if (NET.role === 'client') { this.toast('Waiting for the party host to start the match'); return; }
      // the LeBron clip plays first (skippable), then the match starts
      LEBRON_INTRO.play(() => {
        INPUT.lock(GFX.renderer.domElement);
        if (PROFILE.data.mode === 'event' && MODES.event) HANG.start(); else if (NET.role === 'host') NET.startParty(); else startMatch();
      });
    });
    $('hvv-back').addEventListener('click', () => { SFX.play('click', 0.5); this.hvvSide(null); });
    $('hvv-close').addEventListener('click', () => { SFX.play('click', 0.5); this.el.hvv.hidden = true; });
    document.querySelectorAll('.hvv-side').forEach(b => b.addEventListener('click', () => { SFX.play('click', 0.5); this.hvvSide(b.dataset.side); }));
    $('lb-mode').addEventListener('click', () => this.openModes());
    $('lb-settings').addEventListener('click', () => { this.el.settings.hidden = false; });
    $('settings-close').addEventListener('click', () => { this.el.settings.hidden = true; });
    $('modes-close').addEventListener('click', () => { this.el.modes.hidden = true; });
    $('buy-cancel').addEventListener('click', () => this.closeBuy());
    $('lb-emote').addEventListener('click', () => this.emote());
    for (const s of [this.el['lb-slotL'], this.el['lb-slotR']]) s.addEventListener('click', () => { SFX.init(); SFX.play('click', 0.5); this.openParty(); });
    $('party-close').addEventListener('click', () => { this.el.party.hidden = true; });
    window.addEventListener('keydown', (e) => {
      if (G.phase !== 'menu' || document.activeElement.tagName === 'INPUT') return;
      if (EMOTES.wheelOpen) { if (e.code === 'KeyB') EMOTES.closeWheel(true); else if (e.code === 'Escape') EMOTES.closeWheel(false); else EMOTES.key(e.code); return; }
      if (e.code === 'KeyB') this.emote();
    });
    // drag the character to spin it
    const cv = GFX.renderer.domElement;
    cv.addEventListener('pointerdown', (e) => { if (G.phase === 'menu') this.drag = { x: e.clientX }; });
    window.addEventListener('pointermove', (e) => { if (this.drag) { this.yawOff += (e.clientX - this.drag.x) * 0.012; this.drag.x = e.clientX; } });
    window.addEventListener('pointerup', () => { this.drag = null; });
    this.bindSettings();
    this.buildScene();
  },

  bindSettings() {
    const $ = (id) => document.getElementById(id);
    const bind = (id, key, fmt, conv = Number) => {
      const el = $(id), out = $(id + '-v');
      if (el.type === 'checkbox') el.checked = !!SETTINGS[key]; else el.value = SETTINGS[key];
      const upd = () => {
        SETTINGS[key] = el.type === 'checkbox' ? el.checked : conv(el.value);
        if (out) out.textContent = fmt ? fmt(SETTINGS[key]) : SETTINGS[key];
        saveSettings();
        if (key === 'volume') SFX.setVolume(SETTINGS.volume);
        this.refreshMode();
      };
      el.addEventListener('input', upd); el.addEventListener('change', upd);
      if (out) out.textContent = fmt ? fmt(SETTINGS[key]) : SETTINGS[key];
    };
    bind('set-bots', 'bots', v => v + ' bots');
    bind('set-diff', 'difficulty', null, String);
    bind('set-sens', 'sens', v => v.toFixed(2) + 'x');
    bind('set-vol', 'volume', v => Math.round(v * 100) + '%');
    bind('set-quality', 'quality', null, String);
    bind('set-invert', 'invertY', null, Boolean);
    const nameEl = $('set-name');
    nameEl.value = PROFILE.data.name || '';
    nameEl.addEventListener('input', () => { PROFILE.data.name = nameEl.value.trim(); PROFILE.save(); this.refreshTop(); });
  },

  // ---------- 3D scene ----------
  buildScene() {
    const root = new THREE.Group();
    const L = (o) => new THREE.MeshLambertMaterial(o);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.25, 0.55, 48), L({ color: 0x1b2a4a }));
    base.position.y = -0.28; root.add(base);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.06, 48), L({ color: 0x2c4677, emissive: 0x0b1a33 }));
    top.position.y = 0.02; root.add(top);
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(1.56, 0.05, 8, 64), new THREE.MeshBasicMaterial({ color: 0x5cc8ff }));
    this.ring.rotation.x = Math.PI / 2; this.ring.position.y = 0.01; root.add(this.ring);
    const glow = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 0.2, 3.5, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0x5cc8ff, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.position.y = -2.3; root.add(glow);
    this.dots = new THREE.Group();
    for (let i = 0; i < 18; i++) {
      const d = new THREE.Mesh(GEO.box, new THREE.MeshBasicMaterial({ color: i % 3 ? 0x5cc8ff : 0xffc62b }));
      const a = (i / 18) * TAU; d.scale.setScalar(0.07); d.position.set(Math.cos(a) * 1.85, 0.05 + (i % 2) * 0.1, Math.sin(a) * 1.85);
      this.dots.add(d);
    }
    root.add(this.dots);
    this.slots = [];
    for (const side of [-1, 1]) {
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.85, 0.4, 36), L({ color: 0x1b2a4a, transparent: true, opacity: 0.65 }));
      b.position.y = -0.2; g.add(b);
      const r = new THREE.Mesh(new THREE.TorusGeometry(1.06, 0.03, 6, 48), new THREE.MeshBasicMaterial({ color: 0x8aa4d6, transparent: true, opacity: 0.6 }));
      r.rotation.x = Math.PI / 2; g.add(r);
      g.userData.side = side;
      root.add(g); this.slots.push(g);
    }
    this.key = new THREE.DirectionalLight(0xfff4e0, 0.55);
    root.add(this.key); root.add(this.key.target);
    this.rim = new THREE.PointLight(0x6fc3ff, 0.9, 9);
    root.add(this.rim);
    this.bus = BUS.makeMesh();
    this.root = root;
  },

  placeInWorld() {
    // Hover the pedestal just off the coast, looking back across the island
    let bestA = 0, bestScore = -1e9;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU;
      let score = 0;
      for (const p of WORLD.pois) { const d = Math.hypot(p.x - Math.cos(a) * 200, p.z - Math.sin(a) * 200); score -= d * 0.01; }
      score += WORLD.heightAt(Math.cos(a) * 150, Math.sin(a) * 150) * 0.2;
      if (score > bestScore) { bestScore = score; bestA = a; }
    }
    this.dir.set(Math.cos(bestA), 0, Math.sin(bestA));
    let r = WORLD.HALF * 0.78;
    while (r < WORLD.HALF * 1.1 && WORLD.heightAt(this.dir.x * r, this.dir.z * r) > 0) r += 10;
    this.P.set(this.dir.x * r, 34, this.dir.z * r);
    this.right.set(this.dir.z, 0, -this.dir.x); // camera-right when looking back at the island
    this.root.position.copy(this.P);
    this.root.rotation.y = Math.atan2(-this.dir.x, -this.dir.z);
    for (const s of this.slots) s.position.set(s.userData.side * 2.3, 0, 0.8);
    this.camInit = false;
  },

  setOutfit(id) {
    if (this.model) this.root.remove(this.model.root);
    const tmp = {};
    CHARS.buildModel(tmp, PROFILE.outfit(id), { hi: true });
    this.model = tmp.model;
    this.model.root.visible = true;
    this.root.add(this.model.root);
  },

  show() {
    this.placeInWorld();
    this.setOutfit(PROFILE.data.outfit);
    if (!this.root.parent) GFX.scene.add(this.root);
    if (!this.bus.parent) GFX.scene.add(this.bus);
    this.el.lobby.hidden = false;
    this.setTab('play');
    this.refreshTop(); this.refreshMode(); this.renderQuestWidget();
    if (!PROFILE.data.starter) this.openHvv();
  },
  hide() {
    this.el.lobby.hidden = true;
    GFX.scene.remove(this.root); GFX.scene.remove(this.bus);
    this.el.modes.hidden = true; this.el.settings.hidden = true; this.el.buy.hidden = true;
    this.stopEmote(); EMOTES.closeWheel(false);
  },

  // B / the Emote button: open the wheel; the pick plays on the pedestal
  emote() {
    if (G.phase !== 'menu') return;
    SFX.init();
    if (this.emoteId) { this.stopEmote(); return; }
    EMOTES.openWheel((id) => this.playEmote(id));
  },
  playEmote(id, secs = 9) {
    this.emoteId = id; this.emoteT = secs;
    if (this.model) this.model.anim = null; // start the clip from its first frame
    EMOTES.start(id);
  },
  stopEmote() { this.emoteId = null; this.emoteT = 0; EMOTES.stop(); },

  update(dt) {
    this.t += dt;
    const m = this.model, t = this.t;
    if (m) {
      m.root.rotation.y = this.yawOff;
      if (!this.drag) this.yawOff = lerp(this.yawOff, Math.round(this.yawOff / TAU) * TAU, Math.min(1, dt * 0.6));
      if (this.emoteId) {
        this.emoteT -= dt;
        if (this.emoteT <= 0) this.stopEmote();
        EMOTES.tick(dt);
        m.body.position.y = 0;
        m.armL.rotation.set(0, 0, 0); m.armR.rotation.set(0, 0, 0); m.legL.rotation.x = 0; m.legR.rotation.x = 0;
        m.head.rotation.set(0, 0, 0);
      } else {
        m.body.position.y = Math.sin(t * 2) * 0.015;
        m.body.rotation.y = 0;
        m.armL.rotation.set(Math.sin(t * 1.3) * 0.05, 0, -0.12 - Math.sin(t * 2) * 0.03);
        m.armR.rotation.set(-Math.sin(t * 1.3) * 0.05, 0, 0.12 + Math.sin(t * 2) * 0.03);
        m.legL.rotation.x = 0; m.legR.rotation.x = 0;
        m.head.rotation.set(Math.sin(t * 0.7) * 0.04, Math.sin(t * 0.45) * 0.18, 0);
      }
      const pose = ANIMS.pose(m, (this.emoteId && EMOTES.state(this.emoteId)) || { key: 'idle', rate: 1 }, dt);
      m.body.rotation.y = pose && this.emoteId ? pose.yaw : 0;
      if (m.v1) SKINS.sync(m, t, false, false, pose);
    }
    for (const g of this.slots || []) { const fm = g.userData.model; if (fm && fm.v1) { fm.root.rotation.y = -g.userData.side * 0.35; SKINS.sync(fm, t, false, false, ANIMS.pose(fm, { key: 'idle', rate: 1 }, dt)); } }
    this.ring.material.color.setHSL(0.55 + Math.sin(t * 1.5) * 0.03, 1, 0.6 + Math.sin(t * 3) * 0.08);
    this.dots.rotation.y = t * 0.4;
    for (const d of this.dots.children) d.position.y = 0.08 + Math.sin(t * 2 + d.position.x * 3) * 0.08;
    // bus loops around the island
    const ba = t * 0.03, br = 760;
    this.bus.position.set(Math.cos(ba) * br, 120 + Math.sin(t * 0.5) * 3, Math.sin(ba) * br);
    this.bus.rotation.y = Math.atan2(-Math.sin(ba), Math.cos(ba));
    for (const p of this.bus.userData.props) p.rotation.z += dt * 25;
    // camera framing per tab
    const cam = GFX.camera, P = this.P, f = this.dir, rgt = this.right;
    const dist = this.tab === 'play' ? 7.8 : 7.4;
    // Put the character in the middle of whatever screen space the panels leave free
    const W = window.innerWidth;
    let cx = W / 2;
    if (this.tab === 'play') {
      const lr = (this._left || (this._left = document.querySelector('.lb-left'))).getBoundingClientRect().right;
      const pr = (this._play || (this._play = document.querySelector('.lb-play'))).getBoundingClientRect().left;
      if (pr - lr > 160) cx = (lr + pr) / 2;
    } else {
      const panel = document.querySelector('#pane-' + this.tab + ' .lb-panel');
      if (panel) { const r = panel.getBoundingClientRect().right; cx = W - r > 200 ? (r + W) / 2 : r + 120; }
    }
    const hf = Math.tan(THREE.MathUtils.degToRad(19)) * cam.aspect;
    const pan = -(cx / W * 2 - 1) * dist * hf;
    const wantPos = new THREE.Vector3(P.x + f.x * dist, P.y + 1.45, P.z + f.z * dist).addScaledVector(rgt, pan);
    const wantLook = new THREE.Vector3(P.x, P.y + 1.05, P.z).addScaledVector(rgt, pan);
    if (!this.camInit) { this.camPos.copy(wantPos); this.camLook.copy(wantLook); this.camInit = true; }
    const k = Math.min(1, dt * 4);
    this.camPos.lerp(wantPos, k); this.camLook.lerp(wantLook, k);
    cam.position.copy(this.camPos); cam.lookAt(this.camLook);
    if (Math.abs(cam.fov - 38) > 0.01) { cam.fov = 38; cam.updateProjectionMatrix(); }
    this.key.position.copy(cam.position).add(new THREE.Vector3(0, 4, 0)).addScaledVector(rgt, -3);
    this.key.target.position.set(0, 1, 0);
    this.key.position.sub(this.root.position);
    this.key.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), -this.root.rotation.y);
    this.rim.position.set(0, 2.4, 1.6);
    GFX.sun.position.set(P.x + 60, P.y + 140, P.z + 40); GFX.sun.target.position.copy(P);
    // project DOM tags
    this.project(this.el['lb-nametag'], new THREE.Vector3(P.x, P.y + 2.45, P.z), this.tab === 'play');
    for (let i = 0; i < 2; i++) {
      const wp = new THREE.Vector3(); this.slots[i].getWorldPosition(wp); wp.y += 1.1;
      this.project(this.el[i ? 'lb-slotR' : 'lb-slotL'], wp, this.tab === 'play');
    }
  },
  project(el, wp, show) {
    const v = wp.project(GFX.camera);
    const x = (v.x * 0.5 + 0.5) * window.innerWidth, y = (-v.y * 0.5 + 0.5) * window.innerHeight;
    // keep party slots from sliding under the left column or the play stack
    if (el.classList.contains('lb-slot')) {
      const L = this._left || (this._left = document.querySelector('.lb-left'));
      const R = this._play || (this._play = document.querySelector('.lb-play'));
      const lr = L.getBoundingClientRect(), pr = R.getBoundingClientRect();
      if ((x < lr.right + 40 && y < lr.bottom + 40) || (x > pr.left - 40 && y > pr.top - 40)) show = false;
    }
    if (!show || v.z > 1) { el.style.visibility = 'hidden'; return; }
    el.style.visibility = 'visible';
    el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
  },

  // ---------- DOM ----------
  setTab(tab) {
    this.tab = tab;
    document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    document.querySelectorAll('.lb-pane').forEach(p => { p.hidden = p.id !== 'pane-' + tab; });
    if (tab === 'locker') this.renderLocker();
    if (tab === 'shop') this.renderShop();
    if (tab === 'quests') this.renderQuests();
    if (tab === 'career') this.renderCareer();
    if (tab === 'board') this.renderBoard();
    if (tab === 'play') this.renderQuestWidget();
  },
  refreshTop() {
    const d = PROFILE.data;
    this.el['lb-coins'].textContent = d.coins.toLocaleString();
    this.el['lb-level'].textContent = d.level;
    this.el['lb-xpfill'].style.width = (d.xp / XP_PER_LEVEL * 100) + '%';
    this.el['lb-xptext'].textContent = `${d.xp.toLocaleString()} / ${XP_PER_LEVEL.toLocaleString()} XP`;
    this.el['lb-name'].textContent = PROFILE.displayName();
    this.el['lb-nametag'].innerHTML = `<b>${esc(PROFILE.displayName())}</b><span>${d.level}</span>`;
  },
  refreshMode() {
    const M = MODES[PROFILE.data.mode] || MODES.solo;
    this.el['lb-mode-name'].textContent = M.name;
    this.el['lb-mode-sub'].textContent = `${M.tag} · ${M.bots()} bots · ${DIFF_LABEL[M.diff()]}${PROFILE.data.zeroBuild ? ' · Zero Build' : ''}`;
  },
  openModes() {
    SFX.init(); SFX.play('click', 0.5);
    const zb = !!PROFILE.data.zeroBuild;
    // Builds / Zero Build applies to every mode; Reload also picks its lobby size
    this.el['mode-list'].innerHTML = `<div class="mode-zb"><button type="button" data-zb="0" class="${zb ? '' : 'on'}">Builds</button><button type="button" data-zb="1" class="${zb ? 'on' : ''}">Zero Build</button></div>`
      + Object.entries(MODES).map(([k, M]) => `<button type="button" class="mode-opt${PROFILE.data.mode === k ? ' on' : ''}" data-mode="${k}"><span class="mode-tag">${M.tag}</span><b>${M.name}</b><span class="mode-desc">${M.desc}</span><span class="mode-meta">${M.sizes ? M.sizes.map(n => `<span class="mode-size${M.bots() + 1 === n ? ' on' : ''}" data-size="${n}">${n} players</span>`).join('') + ' · ' : M.bots() + ' bots · '}${DIFF_LABEL[M.diff()]}</span></button>`).join('');
    this.el['mode-list'].querySelectorAll('[data-zb]').forEach(b => b.addEventListener('click', () => {
      PROFILE.data.zeroBuild = b.dataset.zb === '1'; PROFILE.save(); this.refreshMode(); SFX.play('click', 0.5); this.openModes();
    }));
    this.el['mode-list'].querySelectorAll('.mode-size').forEach(b => b.addEventListener('click', (e) => {
      e.stopPropagation();
      PROFILE.data.reloadSize = +b.dataset.size; PROFILE.data.mode = 'reload'; PROFILE.save(); this.refreshMode(); SFX.play('click', 0.5); this.openModes();
    }));
    this.el['mode-list'].querySelectorAll('.mode-opt').forEach(b => b.addEventListener('click', () => {
      PROFILE.data.mode = b.dataset.mode; PROFILE.save(); this.refreshMode(); this.el.modes.hidden = true; SFX.play('click', 0.5);
      if (MODES[b.dataset.mode].arena) ARENA.open(b.dataset.mode); // pick a loadout and opponents
    }));
    this.el.modes.hidden = false;
  },
  // ---------- Party (peer-to-peer multiplayer, see net.js) ----------
  openParty() {
    this.el['party-err'].textContent = '';
    this.renderParty();
    this.el.party.hidden = false;
  },
  renderParty() {
    const B = this.el['party-body'];
    if (!NET.role) {
      B.innerHTML = `<p class="note">Play with friends: one of you creates a party and shares the 4-letter code, the others join with it. The host presses Play and everyone drops into the same match.</p>
        <button class="btn btn-play" id="party-create" type="button" style="width:100%;font-size:20px;padding:12px">Create party</button>
        <div class="row"><input id="party-code" maxlength="4" placeholder="CODE" autocomplete="off"><button class="btn btn-ghost" id="party-join" type="button">Join</button></div>
        <p class="note">Works over the internet, peer to peer. Some school networks block it.</p>`;
      const err = (e) => { this.el['party-err'].textContent = e || ''; };
      B.querySelector('#party-create').onclick = () => { err('Creating party...'); NET.create((e) => { err(e); if (!e) this.renderParty(); }); };
      const join = () => { err('Joining...'); NET.join(B.querySelector('#party-code').value, (e) => { err(e); if (!e) this.renderParty(); }); };
      B.querySelector('#party-join').onclick = join;
      B.querySelector('#party-code').onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') join(); };
      return;
    }
    const host = NET.role === 'host';
    B.innerHTML = `<p class="note">${host ? 'Your party code. Friends click a + slot, then Join with it:' : 'You are in this party:'}</p>
      <div class="code">${NET.code}</div>
      <ul class="members">${NET.roster.map((r, i) => `<li><span><b>${esc(r.name)}</b>${i === 0 ? ' · host' : ''}${r.pid === NET.me ? ' (you)' : ''}</span><small>${esc(PROFILE.outfit(r.outfit).name)} · lvl ${r.level}</small></li>`).join('')}</ul>
      <p class="note">${host ? 'Press Play when everyone is in. Bots fill the rest of the match.' : 'Waiting for the host to press Play.'}</p>
      <button class="btn btn-ghost" id="party-leave" type="button" style="width:100%">Leave party</button>`;
    B.querySelector('#party-leave').onclick = () => { NET.leave(); this.renderParty(); };
  },
  // roster changed: refresh slots, pedestals, the Play button and the party screen
  onParty() {
    if (typeof CHAT !== 'undefined') CHAT.render();
    const others = NET.roster.filter((r) => r.pid !== NET.me);
    ['lb-slotL', 'lb-slotR'].forEach((id, i) => {
      const el = this.el[id], r = others[i];
      el.classList.toggle('filled', !!r);
      el.innerHTML = r ? `${esc(r.name)}<small>${esc(PROFILE.outfit(r.outfit).name)}</small>` : (NET.role && i === 0 && !others.length ? '+' : '+');
      this.setSlotModel(i, r ? r.outfit : null);
    });
    const play = this.el['lb-play'];
    if (play) play.textContent = NET.role === 'client' ? 'Ready' : NET.role === 'host' ? `Play (${NET.roster.length})` : 'Play';
    if (this.el.party && !this.el.party.hidden) this.renderParty();
  },
  setSlotModel(i, outfit) {
    const g = this.slots && this.slots[i];
    if (!g) return;
    if (g.userData.model && g.userData.outfit === outfit) return;
    if (g.userData.model) { g.remove(g.userData.model.root); g.userData.model = null; }
    g.userData.outfit = outfit;
    if (!outfit) return;
    const tmp = {};
    CHARS.buildModel(tmp, PROFILE.outfit(outfit), { hi: true });
    tmp.model.root.visible = true; tmp.model.root.scale.setScalar(0.85);
    g.add(tmp.model.root);
    g.userData.model = tmp.model;
  },

  // ---------- Starter pick: the first time you play, choose Heroes or Villains, then one free character ----------
  marvel(side) { return OUTFITS.filter(o => o.marvel && !o.hidden && o.side === side && (!SKINS.ready || SKINS.defs[o.model])); },
  openHvv() {
    for (const side of ['hero', 'villain']) {
      const f = document.querySelector(`[data-faces="${side}"]`);
      if (!f.childElementCount) f.innerHTML = this.marvel(side).map(o => { const t = this.thumb(o); return t ? `<img src="${t}" alt="">` : ''; }).join('');
    }
    this.hvvSide(null);
    this.el.hvv.hidden = false;
    document.getElementById('hvv-close').hidden = !PROFILE.data.starter; // a new player has to pick one
  },
  hvvSide(side) {
    const E = this.el;
    E.hvv.dataset.side = side || '';
    E['hvv-sides'].hidden = !!side; E['hvv-grid'].hidden = !side;
    E['hvv-back'].style.visibility = side ? 'visible' : 'hidden';
    E['hvv-title'].textContent = side ? (side === 'hero' ? 'Pick your free hero' : 'Pick your free villain') : 'Heroes or Villains?';
    if (!side) return;
    E['hvv-grid'].innerHTML = this.marvel(side).map(o => this.card(o).replace('</button>', '<span class="pick">Free &rsaquo;</span></button>')).join('');
    E['hvv-grid'].querySelectorAll('.ocard').forEach(b => b.addEventListener('click', () => {
      const d = PROFILE.data, id = b.dataset.id;
      if (!d.owned.includes(id)) d.owned.push(id);
      d.outfit = id; d.starter = id; PROFILE.save();
      E.hvv.hidden = true;
      this.setOutfit(id); this.refreshTop();
      SFX.play('victory', 0.5);
      this.toast(`${PROFILE.outfit(id).name} is yours! Find more Marvel skins in the Item Shop.`);
    }));
  },

  toast(msg) {
    const t = this.el['lb-toast'];
    t.textContent = msg; t.classList.add('show');
    clearTimeout(this._tt); this._tt = setTimeout(() => t.classList.remove('show'), 2600);
  },
  showReward(r) {
    if (!r) return;
    const q = r.quests.length ? `<div class="rw-q">${r.quests.map(x => 'Quest complete: ' + esc(x)).join('<br>')}</div>` : '';
    this.el['lb-reward'].innerHTML = `<div class="rw-title">Match rewards</div><div class="rw-row"><b>+${r.xp.toLocaleString()}</b> XP</div><div class="rw-row coin"><i class="coin-i"></i><b>+${r.coins.toLocaleString()}</b> Lunch Money</div>${r.levels ? `<div class="rw-lvl">Level up! Now level ${PROFILE.data.level}</div>` : ''}${q}`;
    this.el['lb-reward'].hidden = false;
    clearTimeout(this._rt); this._rt = setTimeout(() => { this.el['lb-reward'].hidden = true; }, 7000);
  },

  thumb(o) {
    if (this.thumbs[o.id]) return this.thumbs[o.id];
    try {
      if (!this.tr) {
        const c = document.createElement('canvas');
        this.tr = new THREE.WebGLRenderer({ canvas: c, alpha: true, antialias: true, preserveDrawingBuffer: true });
        this.tr.setSize(150, 190, false);
        this.ts = new THREE.Scene();
        this.ts.add(new THREE.HemisphereLight(0xffffff, 0x445566, 0.9));
        const dl = new THREE.DirectionalLight(0xffffff, 0.6); dl.position.set(2, 3, 4); this.ts.add(dl);
        this.tc = new THREE.PerspectiveCamera(30, 150 / 190, 0.1, 50);
        this.tc.position.set(0, 1.15, 5.4); this.tc.lookAt(0, 1.0, 0);
      }
      const tmp = {};
      CHARS.buildModel(tmp, o, { hi: true });
      const r = tmp.model.root; r.visible = true; r.rotation.y = Math.PI - 0.45;
      tmp.model.armR.rotation.z = 0.25; tmp.model.armL.rotation.z = -0.25;
      if (tmp.model.v1) SKINS.sync(tmp.model, 0, false, false);
      this.ts.add(r);
      this.tr.render(this.ts, this.tc);
      this.thumbs[o.id] = this.tr.domElement.toDataURL('image/png');
      this.ts.remove(r);
    } catch (e) { this.thumbs[o.id] = ''; }
    return this.thumbs[o.id];
  },
  card(o, opts = {}) {
    const owned = PROFILE.data.owned.includes(o.id);
    const img = this.thumb(o);
    const price = opts.price ? `<span class="price">${owned ? 'Owned' : `<i class="coin-i"></i>${OUTFIT_PRICE[o.rarity].toLocaleString()}`}</span>` : '';
    return `<button type="button" class="ocard r${o.rarity}${opts.big ? ' big' : ''}${opts.on ? ' on' : ''}" data-id="${o.id}">
      ${img ? `<img src="${img}" alt="">` : ''}<span class="oname">${esc(o.name)}</span><span class="orar">${RARITY[o.rarity].name}</span>${price}</button>`;
  },
  renderLocker() {
    const d = PROFILE.data;
    const owned = OUTFITS.filter(o => d.owned.includes(o.id)); // hidden skins show once you've earned them
    this.el['locker-grid'].innerHTML = owned.map(o => this.card(o, { on: o.id === d.outfit })).join('') +
      `<div class="locker-more">${OUTFITS.length - owned.length} more outfits in the Item Shop</div>`;
    this.el['locker-grid'].querySelectorAll('.ocard').forEach(b => b.addEventListener('click', () => {
      d.outfit = b.dataset.id; PROFILE.save(); this.setOutfit(d.outfit); this.renderLocker(); SFX.play('pickup', 0.4);
      NET.sendInfo();
    }));
    this.renderLockerEmotes();
    this.renderLockerTools();
    const o = PROFILE.outfit();
    this.el['locker-detail'].innerHTML = `<span class="orar r${o.rarity}">${RARITY[o.rarity].name} outfit</span><h3>${esc(o.name)}</h3><p>${esc(o.desc)}</p>`;
  },
  ecard(e, opts = {}) {
    const owned = PROFILE.data.emotes.includes(e.id), slot = PROFILE.data.wheel.indexOf(e.id);
    const price = opts.price ? `<span class="price">${owned ? 'Owned' : `<i class="coin-i"></i>${EMOTES.price(e).toLocaleString()}`}</span>` : '';
    const s = opts.slots && slot >= 0 ? `<span class="slot">${slot + 1}</span>` : '';
    // a little stick figure striking a pose (the arms differ per emote)
    const h = [...e.id].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) | 0, 3), aL = (h & 7) * 22 - 70, aR = ((h >> 3) & 7) * 22 - 70;
    const arm = (x, ang) => `M50 38 L${x} ${38 - Math.sin(ang * Math.PI / 180) * 26} `;
    const fig = `<svg viewBox="0 0 100 100"><circle cx="50" cy="20" r="10"/><path d="M50 30 L50 64 M50 64 L36 92 M50 64 L64 90 ${arm(50 - 28, aL)}${arm(50 + 28, aR)}"/></svg>`;
    return `<button type="button" class="ocard ecard r${e.rarity}${opts.on ? ' on' : ''}" data-emote="${e.id}">${fig}${s}<span class="oname">${esc(e.name)}</span><span class="orar">${RARITY[e.rarity].name} emote</span>${price}</button>`;
  },
  // harvesting tools: the default pickaxe, plus the Infinity Gauntlet from the Season 1 live event
  renderLockerTools() {
    const d = PROFILE.data, tools = [{ id: 'pickaxe', name: 'Default Pickaxe', rarity: 1, mesh: () => ITEMS.gunMesh('pickaxe', 0) }];
    if ((d.tools || []).includes('gauntlet')) tools.push({ id: 'gauntlet', name: 'Infinity Gauntlet', rarity: 4, mesh: () => ITEMS.itemMesh({ kind: 'power', id: 'thanos' }) });
    const cur = d.pickaxe === 'gauntlet' && tools.length > 1 ? 'gauntlet' : 'pickaxe';
    this.el['locker-tools'].innerHTML = tools.map((t) => `<button type="button" class="ocard ecard r${t.rarity}${t.id === cur ? ' on' : ''}" data-tool="${t.id}"><img src="${this.toolIcon(t)}" alt="" style="position:absolute;inset:6% 14% 36%;width:72%;height:56%;object-fit:contain"><span class="oname">${esc(t.name)}</span><span class="orar">${t.id === 'gauntlet' ? 'Live event' : RARITY[t.rarity].name + ' tool'}</span></button>`).join('')
      + (tools.length < 2 ? '<div class="locker-more">More harvesting tools come from live events</div>' : '');
    this.el['locker-tools'].querySelectorAll('[data-tool]').forEach((b) => b.addEventListener('click', () => {
      d.pickaxe = b.dataset.tool === 'gauntlet' ? 'gauntlet' : ''; PROFILE.save(); this.renderLockerTools(); SFX.play('pickup', 0.4);
    }));
  },
  // a picture of a tool, rendered once
  toolIcon(t) {
    this._icons = this._icons || {};
    if (this._icons[t.id]) return this._icons[t.id];
    try {
      const r = this._iconR || (this._iconR = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true }));
      r.setSize(160, 160);
      const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, 0.01, 50), o = t.mesh();
      sc.add(new THREE.AmbientLight(0xffffff, 0.8)); const sun = new THREE.DirectionalLight(0xffffff, 0.9); sun.position.set(2, 3, 4); sc.add(sun);
      const box = new THREE.Box3().setFromObject(o), c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3()).length();
      o.position.sub(c); o.rotation.y = 0.6; sc.add(o);
      cam.position.set(0, s * 0.25, s * 1.9); cam.lookAt(0, 0, 0);
      r.render(sc, cam);
      return (this._icons[t.id] = r.domElement.toDataURL());
    } catch (e) { return ''; }
  },
  renderLockerEmotes() {
    const d = PROFILE.data;
    const owned = EMOTES.list.filter(e => d.emotes.includes(e.id));
    this.el['locker-emote-note'].textContent = `Click to preview and add to / remove from your emote wheel (${d.wheel.length}/8). ${EMOTES.list.length - owned.length} more in the Item Shop.`;
    this.el['locker-emotes'].innerHTML = owned.map(e => this.ecard(e, { slots: true, on: d.wheel.includes(e.id) })).join('');
    this.el['locker-emotes'].querySelectorAll('.ecard').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.emote, i = d.wheel.indexOf(id);
      if (i >= 0) { if (d.wheel.length > 1) d.wheel.splice(i, 1); }
      else if (d.wheel.length < 8) d.wheel.push(id);
      else this.toast('Your wheel is full (8). Click an equipped emote to remove it first.');
      PROFILE.save(); this.playEmote(id, 6); this.renderLockerEmotes(); SFX.play('click', 0.4);
    }));
  },
  renderShop() {
    const s = PROFILE.shop();
    this.el['shop-featured'].innerHTML = s.map(o => this.card(o, { price: true, big: true })).join('');
    this.el['shop-emotes'].innerHTML = PROFILE.emoteShop().map(e => this.ecard(e, { price: true })).join('');
    document.querySelectorAll('#pane-shop .ocard').forEach(b => b.addEventListener('click', () => b.dataset.emote ? this.openBuyEmote(b.dataset.emote) : this.openBuy(b.dataset.id)));
    const ms = PROFILE.msToReset();
    this.el['shop-timer'].textContent = `New items in ${Math.floor(ms / 3600000)}h ${Math.floor(ms / 60000) % 60}m`;
  },
  openBuy(id) {
    const o = PROFILE.outfit(id), owned = PROFILE.data.owned.includes(id), price = OUTFIT_PRICE[o.rarity];
    this.preview = id; this.setOutfit(id);
    this.el['buy-card'].innerHTML = this.card(o, {});
    this.el['buy-text'].innerHTML = `<h3>${esc(o.name)}</h3><p>${esc(o.desc)}</p><p class="buy-price">${owned ? 'You own this outfit.' : `<i class="coin-i"></i>${price.toLocaleString()} Lunch Money · you have ${PROFILE.data.coins.toLocaleString()}`}</p>`;
    const ok = this.el['buy-ok'];
    ok.textContent = owned ? 'Equip' : PROFILE.data.coins >= price ? 'Buy' : 'Not enough Lunch Money';
    ok.disabled = !owned && PROFILE.data.coins < price;
    ok.onclick = () => {
      if (!owned) { if (PROFILE.buy(id) !== 'ok') return; SFX.play('victory', 0.5); this.toast(`${o.name} added to your Locker`); }
      PROFILE.data.outfit = id; PROFILE.save(); this.preview = null;
      this.el.buy.hidden = true; this.refreshTop(); this.renderShop();
    };
    this.el.buy.hidden = false;
  },
  openBuyEmote(id) {
    const e = EMOTES.get(id), owned = PROFILE.data.emotes.includes(id), price = EMOTES.price(e);
    this.playEmote(id, 60);
    this.el['buy-card'].innerHTML = this.ecard(e, {});
    this.el['buy-text'].innerHTML = `<h3>${esc(e.name)}</h3><p>${RARITY[e.rarity].name} emote. Playing on your pedestal now. Equip it on the wheel and press B in a match.</p><p class="buy-price">${owned ? 'You own this emote.' : `<i class="coin-i"></i>${price.toLocaleString()} Lunch Money · you have ${PROFILE.data.coins.toLocaleString()}`}</p>`;
    const ok = this.el['buy-ok'];
    ok.textContent = owned ? 'Close' : PROFILE.data.coins >= price ? 'Buy' : 'Not enough Lunch Money';
    ok.disabled = !owned && PROFILE.data.coins < price;
    ok.onclick = () => {
      if (!owned) { if (PROFILE.buyEmote(id) !== 'ok') return; SFX.play('victory', 0.5); this.toast(`${e.name} added to your Locker${PROFILE.data.wheel.includes(id) ? ' and emote wheel' : ''}`); }
      this.el.buy.hidden = true; this.stopEmote(); this.refreshTop(); this.renderShop();
    };
    this.el.buy.hidden = false;
  },
  closeBuy() { this.stopEmote(); this.el.buy.hidden = true; if (this.preview) { this.preview = null; this.setOutfit(PROFILE.data.outfit); } },

  questRow(q) {
    return `<div class="qrow${q.done ? ' done' : ''}"><div class="qtext">${esc(PROFILE.questText(q))}</div><div class="qxp">${q.done ? 'Done' : '+' + q.xp + ' XP'}</div><div class="qbar"><i style="width:${q.progress / q.target * 100}%"></i></div><div class="qnum">${Math.floor(q.progress).toLocaleString()} / ${q.target.toLocaleString()}</div></div>`;
  },
  renderQuestWidget() {
    PROFILE.ensureQuests();
    this.el['lb-quests'].innerHTML = PROFILE.data.quests.list.map(q => this.questRow(q)).join('');
  },
  renderQuests() {
    PROFILE.ensureQuests();
    this.el['quest-list'].innerHTML = PROFILE.data.quests.list.map(q => this.questRow(q)).join('');
    const ms = PROFILE.msToReset();
    this.el['quest-timer'].textContent = `New quests in ${Math.floor(ms / 3600000)}h ${Math.floor(ms / 60000) % 60}m`;
    const d = PROFILE.data;
    this.el['quest-level'].innerHTML = `<div class="ql-top"><b>Level ${d.level}</b><span>${d.xp.toLocaleString()} / ${XP_PER_LEVEL.toLocaleString()} XP</span></div><div class="qbar big"><i style="width:${d.xp / XP_PER_LEVEL * 100}%"></i></div><p>Every level pays out 100 Lunch Money. Earn XP from matches (eliminations, placement, time survived) and quests.</p>`;
  },
  async renderBoard() {
    const me = document.getElementById('board-me'), list = document.getElementById('board-list');
    const user = BOARD.user();
    if (user) {
      me.innerHTML = `<span>Signed in as <b>${esc(user)}</b>: your wins count.</span><span style="flex:1"></span><button class="btn btn-ghost" id="board-out" type="button">Sign out</button>`;
      document.getElementById('board-out').onclick = () => { BOARD.signOut(); this.renderBoard(); };
    } else {
      me.innerHTML = `<input id="board-u" placeholder="Username" autocomplete="username"><input id="board-p" type="password" placeholder="Password" autocomplete="current-password"><button class="btn btn-play" id="board-in" type="button">Sign in</button><div class="err" id="board-err">Sign in so your Victory Royales go on the board.</div>`;
      document.getElementById('board-in').onclick = async () => {
        const e = await BOARD.signIn(document.getElementById('board-u').value, document.getElementById('board-p').value);
        if (e) document.getElementById('board-err').textContent = e; else this.renderBoard();
      };
    }
    // tabs: every win, wins on a Chromebook (school), wins on any other computer (home)
    const tabs = [['wins', 'All'], ['cb_wins', 'Chromebook'], ['home_wins', 'Home']], col = this.boardTab || 'wins';
    const tabHtml = '<div class="board-tabs" style="display:flex;gap:6px;margin:6px 0 10px">' + tabs.map(([k, n]) => `<button type="button" class="btn ${k === col ? 'btn-play' : 'btn-ghost'}" data-btab="${k}" style="padding:6px 12px">${n}</button>`).join('') + '</div>';
    list.innerHTML = tabHtml + '<p class="sub">Loading…</p>';
    const bind = () => list.querySelectorAll('[data-btab]').forEach((b) => b.onclick = () => { this.boardTab = b.dataset.btab; this.renderBoard(); });
    bind();
    const [rows, votes] = await Promise.all([BOARD.top(col), BOARD.votes()]);
    if (this.tab !== 'board') return;
    // the monthly vote: pick the next skin to come to the game
    const month = new Date().toLocaleString('en', { month: 'long' }), total = votes.reduce((a, v) => a + v.votes, 0);
    const voteHtml = votes.length ? `<div class="board-vote" style="margin-top:16px"><h5 style="margin:0 0 6px">${esc(month)} vote: pick the next skin</h5>` + votes.map((v) => {
      const pc = total ? Math.round(v.votes / total * 100) : 0;
      return `<button type="button" data-vote="${esc(v.choice)}" ${user ? '' : 'disabled'} style="display:block;width:100%;text-align:left;margin:4px 0;padding:8px 10px;border-radius:8px;border:1px solid #ffffff22;color:inherit;font:inherit;cursor:pointer;background:linear-gradient(90deg,#ffd84a44 ${pc}%,#0004 ${pc}%)"><b>${esc(v.choice)}</b><span style="float:right">${v.votes} vote${v.votes === 1 ? '' : 's'} · ${pc}%</span></button>`;
    }).join('') + `<p class="sub" style="margin-top:4px">${user ? 'Click to vote (you can change it until the month ends). The winner comes to the shop next month.' : 'Sign in to vote.'}</p></div>` : '';
    const label = { wins: 'Wins', cb_wins: 'Chromebook wins', home_wins: 'Home wins' }[col];
    if (BOARD.err) list.innerHTML = tabHtml + `<p class="sub">${esc(BOARD.err)}</p>` + voteHtml;
    else if (!rows.length) list.innerHTML = tabHtml + '<p class="sub">No wins here yet. Be the first!</p>' + voteHtml;
    else list.innerHTML = tabHtml + `<div class="board-head"><span>#</span><span>Player</span><span>${label}</span><span>Best elims</span></div>` + rows.map((r, i) =>
      `<div class="board-row${i === 0 ? ' top1' : ''}${r.username === user ? ' me' : ''}"><span class="rk">${i + 1}</span><span class="nm">${esc(r.username)}</span><span class="wn">${r[col] ?? r.wins}</span><span class="el">${r.best_elims}</span></div>`).join('') + voteHtml;
    bind();
    list.querySelectorAll('[data-vote]').forEach((b) => b.onclick = async () => { const e = await BOARD.vote(b.dataset.vote); if (e) this.toast(e); else { this.toast('Voted for ' + b.dataset.vote); this.renderBoard(); } });
  },
  renderCareer() {
    const s = PROFILE.data.stats;
    const kd = s.matches ? (s.kills / Math.max(1, s.matches - s.wins)).toFixed(2) : '0.00';
    const rows = [['Wins', s.wins], ['Matches', s.matches], ['Win rate', s.matches ? Math.round(s.wins / s.matches * 100) + '%' : '0%'], ['Eliminations', s.kills], ['Elims per loss', kd], ['Top 10', s.top10], ['Top 25', s.top25], ['Best placement', s.best ? '#' + s.best : '-'], ['Damage dealt', fmtBig(s.damage)], ['Chests opened', s.chests], ['Pieces built', s.builds], ['Time played', s.time >= 3600 ? Math.floor(s.time / 3600) + 'h ' + Math.floor(s.time % 3600 / 60) + 'm' : Math.floor(s.time / 60) + 'm']];
    this.el['career-grid'].innerHTML = rows.map(([k, v]) => `<div class="cstat"><b>${v}</b><span>${k}</span></div>`).join('');
  },
};
