'use strict';
// ===== Renderer, match flow, menus, main loop =====
const GFX = { scene: null, camera: null, renderer: null, sun: null, hemi: null, sky: null };


const G = {
  phase: 'menu', paused: false, rewards: null, time: 0, chars: [], player: null, shake: 0, placement: 0, winner: null,
  menuAngle: 0, endTimer: null,
  inMatch() { return this.phase === 'playing' || this.phase === 'dead'; },
  aliveCount() { let n = 0; for (const c of this.chars) if (c.alive && !c.isBoss && !c.henchman) n++; return n; },
  teamMode: false,
  teamAlive(t) { let n = 0; for (const c of this.chars) if (c.alive && !c.isBoss && !c.henchman && c.team === t) n++; return n; },

  togglePause(force) {
    if (!this.inMatch()) return;
    // in a multiplayer match the game keeps running: the menu opens but nothing stops
    if (NET.inMatch) {
      const el = document.getElementById('pause'), open = force === true ? true : el.hidden;
      el.hidden = !open;
      el.querySelector('h2').textContent = 'Menu · the match is still going';
      if (open && document.pointerLockElement) document.exitPointerLock();
      if (!open) INPUT.lock(GFX.renderer.domElement);
      return;
    }
    this.paused = force === true ? true : !this.paused;
    document.getElementById('pause').hidden = !this.paused;
    document.querySelector('#pause h2').textContent = 'Paused';
    if (this.paused && document.pointerLockElement) document.exitPointerLock();
    if (!this.paused) INPUT.lock(GFX.renderer.domElement);
  },

  onElimination(c, killer) {
    NET.onElim(c, killer, c.lastWeapon);
    if (c.isBoss) { BOSS.onDeath(c, killer); if (this.arena) ARENA_MATCH.check(c, killer); return; }
    if (c.henchman) return;
    if (this.arena) { ARENA_MATCH.check(c, killer); return; }
    const alive = this.aliveCount();
    // in Duos / Squads you wait for a reboot while a teammate is still alive
    const mate = c.isPlayer && this.squad ? this.chars.find(x => x !== c && x.alive && x.team === c.team && !x.henchman) : null;
    if (mate) {
      this.placement = alive + 1;
      this.phase = 'dead'; this.awaitReboot = true;
      PC.spectating = mate;
      SFX.play('death', 0.6);
      HUD.banner('YOU WERE ELIMINATED', 'A teammate can grab your Reboot Card and bring you back at a Reboot Van');
    } else if (c.isPlayer) {
      this.placement = alive + 1;
      this.phase = 'dead';
      finishMatch(this.placement, false);
      PC.spectating = killer && killer.alive && killer !== c ? killer : this.randomAlive();
      SFX.play('death', 0.6);
      clearTimeout(this.endTimer);
      this.endTimer = setTimeout(() => { if (this.phase === 'dead') showEnd(false); }, 1600);
    } else if (PC.spectating === c) {
      PC.spectating = killer && killer.alive ? killer : this.randomAlive();
      if (this.phase === 'dead') document.getElementById('spectate').innerHTML = specLabel();
    }
    if (this.teamMode) {
      const h = this.teamAlive('hero'), v = this.teamAlive('villain');
      if ((h === 0 || v === 0) && this.phase !== 'over') {
        const side = h ? 'hero' : 'villain', p = this.player, wasDead = this.phase === 'dead';
        this.winTeam = side;
        this.winner = this.chars.find(x => x.alive && x.team === side) || null;
        this.phase = 'over';
        if (p.team === side && !wasDead) { this.placement = 1; finishMatch(1, true); SFX.play('victory', 0.8); setTimeout(() => showEnd(true), 900); }
        else { clearTimeout(this.endTimer); if (p.team === side) SFX.play('victory', 0.6); setTimeout(() => showEnd(p.team === side), 900); }
      }
      return;
    }
    if (this.squad) {
      const teams = new Set(this.chars.filter(x => x.alive && !x.isBoss && !x.henchman).map(x => x.team));
      // your whole team is out while you were waiting for a reboot
      if (this.awaitReboot && this.phase === 'dead' && !teams.has(this.player.team)) {
        this.awaitReboot = false; this.placement = teams.size + 1;
        finishMatch(this.placement, false);
        clearTimeout(this.endTimer); this.endTimer = setTimeout(() => { if (this.phase === 'dead') showEnd(false); }, 1600);
      }
      if (teams.size <= 1 && this.phase !== 'over') {
        const side = [...teams][0], p = this.player, wasDead = this.phase === 'dead', won = p.team === side;
        this.winTeam = side; this.winner = this.chars.find(x => x.alive && x.team === side) || null;
        this.phase = 'over';
        if (won && !wasDead) { this.placement = 1; finishMatch(1, true); SFX.play('victory', 0.8); setTimeout(() => showEnd(true), 900); }
        else { clearTimeout(this.endTimer); if (won) { SFX.play('victory', 0.6); finishMatch(1, true); } this.awaitReboot = false; setTimeout(() => showEnd(won), 900); }
      }
      return;
    }
    if (alive <= 1 && this.phase !== 'over') {
      this.winner = this.chars.find(x => x.alive) || null;
      const playerWon = this.winner && this.winner.isPlayer;
      const wasDead = this.phase === 'dead';
      this.phase = 'over';
      if (playerWon) { this.placement = 1; finishMatch(1, true); SFX.play('victory', 0.8); setTimeout(() => showEnd(true), 900); }
      else if (wasDead) { clearTimeout(this.endTimer); setTimeout(() => showEnd(false), 900); }
    }
  },
  randomAlive() { const a = this.chars.filter(x => x.alive && !x.isBoss && !x.henchman && !x.dormant); return a.length ? pick(a) : null; },
};

function specLabel() {
  const s = PC.spectating;
  return s ? `Spectating <b>${esc(s.name)}</b> · ${s.kills} elims · <kbd>Enter</kbd> results` : '';
}

// ---------- setup ----------
function initGraphics() {
  const canvas = document.getElementById('game');
  const high = SETTINGS.quality === 'high';
  const r = new THREE.WebGLRenderer({ canvas, antialias: high, powerPreference: 'high-performance' });
  r.setPixelRatio(PERF.on ? 0.7 : Math.min(window.devicePixelRatio || 1, high ? 1.5 : 1));
  r.setSize(window.innerWidth, window.innerHeight);
  r.shadowMap.enabled = high;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  GFX.renderer = r;
  // Fortnite-style color grade: punchier saturation and contrast (cheap: done by the browser compositor)
  canvas.style.filter = 'saturate(1.12) contrast(1.07)';
  const scene = new THREE.Scene();
  GFX.scene = scene;
  const horizon = new THREE.Color(0xcfe8ff);
  scene.background = horizon;
  scene.fog = new THREE.Fog(horizon, 160, high ? 900 : PERF.on ? 380 : 600);
  GFX.camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, PERF.on ? 700 : 2400);
  GFX.hemi = new THREE.HemisphereLight(0xd8ecff, 0x6f7f5a, 0.8);
  scene.add(GFX.hemi);
  const sun = new THREE.DirectionalLight(0xfff0d8, 1.05);
  sun.castShadow = high;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.near = 10; sc.far = 400;
  sun.shadow.bias = -0.0008;
  scene.add(sun); scene.add(sun.target);
  GFX.sun = sun;
  // sky dome
  const skyGeo = new THREE.SphereGeometry(2000, 24, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x2a78e0) }, bottom: { value: horizon }, sunDir: { value: new THREE.Vector3(0.35, 0.8, 0.25).normalize() } },
    vertexShader: 'varying vec3 vP; void main(){ vP = (modelMatrix * vec4(position,1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bottom; uniform vec3 sunDir; varying vec3 vP; void main(){ vec3 d = normalize(vP - cameraPosition); float h = d.y; vec3 c = mix(bottom, top, clamp(pow(max(h,0.0),0.55),0.0,1.0)); float s = max(dot(d, sunDir), 0.0); c += vec3(1.0,0.86,0.6) * (pow(s, 48.0) * 0.9 + pow(s, 6.0) * 0.18); gl_FragColor = vec4(c,1.0); }',
  });
  GFX.sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(GFX.sky);
  // clouds
  const cloud = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true, emissive: 0x666666 }), 160);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i < 40; i++) {
    const cx = rand(-900, 900), cz = rand(-900, 900), cy = rand(210, 260);
    for (let j = 0; j < 4; j++) {
      m.compose(p.set(cx + rand(-25, 25), cy + rand(-4, 6), cz + rand(-12, 12)), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand(0, 6)), s.set(rand(14, 30), rand(7, 12), rand(12, 22)));
      cloud.setMatrixAt(i * 4 + j, m);
    }
  }
  scene.add(cloud);
  window.addEventListener('resize', () => {
    GFX.camera.aspect = window.innerWidth / window.innerHeight;
    GFX.camera.updateProjectionMatrix();
    r.setSize(window.innerWidth, window.innerHeight);
  });
}

function show(id, v) { document.getElementById(id).hidden = !v; }

function clearMatch() {
  HANG.stop(); LEBRON.reset();
  if (CHARS.crowd) for (const im of CHARS.crowd) im.count = 0; // crowd figures from a big Reload lobby
  clearTimeout(G.endTimer);
  for (const c of G.chars) CHARS.removeModel(c);
  G.chars = []; BOTS.list = [];
  ITEMS.clear(); FX.clear(); BUILD.clear(); STORM.clear(); BUS.clear();
}

// opts (multiplayer): { seed, mode, diff, bots } from the host; every peer builds the same match
function startMatch(opts) {
  {
    const M = MODES[opts ? opts.mode : PROFILE.data.mode] || MODES.solo;
    const n = (opts ? opts.bots : M.bots()) + 1;
    LOADING.match(M.name + ((opts ? opts.zb : PROFILE.data.zeroBuild) ? ' · Zero Build' : ''), (M.small ? 'Tiny island · ' : '') + n + ' players · dropping in soon');
  }
  show('loading', true);
  show('endscreen', false); show('pause', false);
  LOBBY.hide();
  setTimeout(() => {
    clearMatch();
    const party = !!opts && NET.party, seed = opts ? opts.seed : (Math.random() * 1e9) | 0;
    const modeId = opts ? opts.mode : PROFILE.data.mode;
    const mode = MODES[modeId] || MODES.solo, diff = opts ? opts.diff : mode.diff();
    G.reload = !!mode.small;
    G.arena = mode.arena ? Object.assign({ cfg: (opts && opts.arena) || ARENA.cfg() }, mode.arena) : null;
    G.practice = !!G.arena;
    G.zeroBuild = opts ? !!opts.zb : !!PROFILE.data.zeroBuild;
    WORLD.setSize(mode.tiny ? 'tiny' : G.reload || !!G.arena);
    // everything random about the match setup comes from the seed so all players get the same one
    const humans = party ? NET.roster : [{ pid: null, name: PROFILE.displayName(), outfit: PROFILE.data.outfit }];
    let player = null;
    withSeed(seed, () => {
      WORLD.generate(seed);
      BUILD.attachGhost();
      G.teamMode = !!mode.team; G.winTeam = null;
      G.chars = [];
      for (const h of humans) {
        const mine = !party || h.pid === NET.me;
        const outfit = PROFILE.outfit(h.outfit);
        const c = CHARS.create({ name: mine ? PROFILE.displayName() : h.name, isPlayer: mine, colors: outfit });
        c.human = true; c.peerId = h.pid;
        if (!mine) { c.puppet = true; c.infiniteAmmo = true; CHARS.nameTag(c); }
        else { c.infiniteAmmo = false; player = c; }
        // Heroes vs Villains mode: your equipped skin decides your side; in a party everyone is one squad
        if (G.teamMode) c.team = outfit.side || 'hero';
        else if (party && humans.length > 1) c.team = 'S0';
        CHARS.attachModel(c);
        G.chars.push(c);
      }
      G.player = player;
      PC.reset(player);
    });
    // each stage gets its own seed so differences in one (your own character is built a bit
    // differently from a friend's) can't shift the random rolls of the next
    withSeed(seed + 1, () => {
      if (G.arena) { if (!G.arena.hang) ARENA_MATCH.setupTeams(G.arena, diff); return; }
      // a party plays Duos (2) or Squads (3-4): bots come in teams of the same size
      G.squad = !G.teamMode && party && humans.length > 1 ? Math.min(4, humans.length) : 0;
      const maxBots = mode.small ? 499 : mode.ultron ? 100 : 99; // Reload can go up to 500 players
      let nBots = opts ? opts.bots : clamp(mode.bots() | 0, 1, maxBots);
      if (G.squad) nBots = Math.max(G.squad, Math.floor(nBots / G.squad) * G.squad);
      const bots = BOTS.create(clamp(nBots, 1, maxBots), diff, G.teamMode ? G.chars[0].team : undefined);
      if (G.squad) bots.forEach((b, i) => { b.team = 'S' + (1 + Math.floor(i / G.squad)); b.squadLead = bots[i - (i % G.squad)]; });
      if (G.teamMode) for (const b of bots) if (b.team === player.team) CHARS.teamMarker(b);
      for (const b of bots) b.mats.wood = randi(0, 60);
      G.chars.push(...bots);
      { const pr = WORLD.pois.find((q) => q.type === 'prison'); if (pr) BOTS.makeInmates(pr); } // The Raft's inmates
      if (G.teamMode || G.squad) for (const c of G.chars) if (c.human && c !== player && c.team === player.team) CHARS.teamMarker(c);
    });
    withSeed(seed + 2, () => { POWERS.reset(); if (mode.noBoss) { BOSS.units = []; return; } if (G.arena) { if (G.arena.boss) ARENA_MATCH.bosses(G.arena, diff); else BOSS.units = []; } else BOSS.setup(diff, G.reload); });
    withSeed(seed + 4, () => { EVENTS.reset(); EXPOSE.reset(); EVENTS.make(seed); });
    G.bossesArrived = false;
    withSeed(seed + 3, () => { if (G.arena) { STORM.start(); ARENA_MATCH.spawn(G.arena); } else { BUS.begin(); BOTS.planDrops(); STORM.start(); } });
    if (party) NET.begin();
    G.chars.forEach((c, i) => { if (c.nid === undefined) c.nid = i; });
    G.awaitReboot = false; G.crownWin = false;
    PC.camYaw = Math.atan2(-BUS.dir.x, -BUS.dir.z) + Math.PI * 0.75;
    STATS.begin();
    G.time = 0; G.shake = 0; G.paused = false; G.winner = null; G.placement = 0; G.rewards = null;
    G.phase = 'playing';
    G.startCount = G.chars.filter((c) => !c.isBoss && !c.henchman).length; // players in this lobby (for the leaderboard)
    G.ultronMode = false; if (mode.ultron) ULTRON_MODE.setup(player);
    HUD.reset();
    show('hud', true); show('loading', false); show('spectate', false);
    const total = G.chars.filter(c => !c.isBoss && !c.henchman).length;
    if (G.arena) HUD.banner(mode.name.toUpperCase() + (G.arena.boss ? '' : ' · YOU ARE TEAM ' + (player.team === 'A' ? 'BLUE' : 'RED')), G.arena.boss ? 'Take the boss down together' : 'Last team standing wins · teammates have a marker');
    else if (G.teamMode) HUD.banner('YOU ARE A ' + (player.team === 'hero' ? 'HERO' : 'VILLAIN'), 'Wipe out the ' + (player.team === 'hero' ? 'villains' : 'heroes') + ' · teammates have a marker · Press SPACE to jump');
    else if (G.squad) HUD.banner((G.squad === 2 ? 'DUOS' : 'SQUADS') + ' · ' + Math.round(total / G.squad) + ' TEAMS', 'You and your friends are one team · Press SPACE to jump');
    else HUD.banner(mode.name.toUpperCase() + ' · ' + total + ' PLAYERS' + (G.zeroBuild ? ' · ZERO BUILD' : ''), G.reload ? 'A boss is already on the island · Press SPACE to jump' : 'Press SPACE to jump off the bus');
    // Zero Build: no building for anyone, so the build bar and materials go away
    for (const id of ['buildbar', 'mats']) { const el = document.getElementById(id); if (el) el.style.display = G.zeroBuild ? 'none' : ''; }
    SFX.play('horn', 0.5);
  }, 40);
}

function showEnd(victory) {
  if (document.pointerLockElement) document.exitPointerLock();
  const c = G.player;
  const t = document.getElementById('end-title'), sub = document.getElementById('end-sub'), stats = document.getElementById('end-stats');
  document.getElementById('endscreen').classList.toggle('win', victory);
  if (G.squad && G.winTeam) {
    const won = G.winTeam === c.team, label = G.squad === 2 ? 'DUO' : 'SQUAD';
    t.textContent = won ? label + ' VICTORY!' : 'ELIMINATED';
    sub.textContent = (won ? (c.alive ? 'Your team is the last one standing.' : 'You went down, but your team finished the job.') : `Your ${label.toLowerCase()} was wiped out.`) + ' ' + c.kills + ' eliminations.';
  } else if (G.teamMode && G.winTeam) {
    const won = G.winTeam === c.team, name = G.winTeam === 'hero' ? 'HEROES' : 'VILLAINS';
    t.textContent = won ? name + ' WIN!' : name + ' WIN';
    sub.textContent = (won ? (c.alive ? 'Your team wiped out the other side.' : 'You went down, but your team finished the job.') : 'Your team was wiped out.') + ' ' + c.kills + ' eliminations.';
  } else if (victory) {
    const total = G.chars.filter(x => !x.isBoss && !x.henchman).length;
    t.textContent = G.crownWin ? 'CROWNED VICTORY ROYALE!' : 'UNBLOCKED VICTORY!';
    sub.textContent = '#1 out of ' + total + '. ' + 'Last one standing.';
  }
  else {
    t.textContent = 'ELIMINATED';
    const k = c.lastAttacker && G.time - c.lastHitTime < 10 ? c.lastAttacker : null;
    sub.textContent = (k ? 'Taken out by ' + k.name : 'You were knocked out of the match') + (G.phase === 'over' && G.winner ? ' · Winner: ' + G.winner.name : '');
  }
  stats.innerHTML = `<div><b>#${G.placement || G.aliveCount() + 1}</b><span>Placed</span></div><div><b>${c.kills}</b><span>Eliminations</span></div><div><b>${fmtBig(c.damageDealt)}</b><span>Damage dealt</span></div><div><b>${fmtTime(G.time)}</b><span>Survived</span></div>`;
  const r = G.rewards;
  document.getElementById('end-rewards').innerHTML = r ? `<div class="end-rw"><span><b>+${r.xp.toLocaleString()}</b> XP</span><span><i class="coin-i"></i> <b>+${r.coins.toLocaleString()}</b> Lunch Money</span>${r.levels ? `<span class="lvlup">Level up! Level ${PROFILE.data.level}</span>` : ''}</div>` : '';
  document.getElementById('btn-spectate').hidden = victory || G.phase === 'over' || !PC.spectating;
  show('endscreen', true);
}

function finishMatch(placement, victory) {
  if (G.rewards || !STATS.match) return;
  // winning 1 vs 100 unlocks the Infinity Ultron skin
  if (victory && G.ultronMode && !PROFILE.data.owned.includes('ultron')) { PROFILE.data.owned.push('ultron'); PROFILE.save(); setTimeout(() => HUD.banner('INFINITY ULTRON UNLOCKED', 'Equip him in your Locker'), 1500); }
  const crowned = G.player && G.player.crown;
  G.crownWin = !!(victory && crowned);
  G.rewards = STATS.finish(placement, victory);
  // a Victory Royale goes on the leaderboard (signed-in players only; boss practice doesn't count)
  // the leaderboard only counts wins in lobbies of 40 or more players (not arenas or the hangout)
  if (victory && !G.practice && G.player && ((G.startCount || 0) >= 40 || PROFILE.data.mode === 'chill')) BOARD.recordWin(G.player.kills); // (Chill counts too)
  if (G.crownWin) { PROFILE.data.coins += 250; G.rewards.coins += 250; PROFILE.data.stats.crownWins = (PROFILE.data.stats.crownWins || 0) + 1; }
  PROFILE.data.crowned = false;
  PROFILE.save();
}

function toLobby() {
  clearTimeout(G.endTimer);
  // leaving a party match: the host takes everyone back with them
  if (NET.inMatch && NET.role === 'host') NET.broadcast({ t: 'tolobby' });
  NET.end();
  const wasEvent = G.event; HANG.stop(); // the hangout isn't a match: no stats
  if (document.pointerLockElement) document.exitPointerLock();
  if (!wasEvent && G.player && G.player.alive && G.phase === 'playing') finishMatch(G.aliveCount(), false);
  G.phase = 'menu'; G.paused = false;
  show('hud', false); show('endscreen', false); show('pause', false); show('spectate', false);
  for (const c of G.chars) CHARS.removeModel(c);
  if (CHARS.crowd) for (const im of CHARS.crowd) im.count = 0;
  G.chars = [];
  ITEMS.clear(); FX.clear(); STORM.clear(); BUS.clear();
  if (BUILD.ghost) BUILD.ghost.visible = false;
  LOBBY.show();
  LOBBY.showReward(G.rewards);
  G.rewards = null;
}

// ---------- menu wiring ----------
function initMenu() {
  const $ = (id) => document.getElementById(id);
  $('btn-again').addEventListener('click', () => {
    SFX.init(); SFX.play('click'); INPUT.lock(GFX.renderer.domElement);
    if (G.player && G.player.alive && G.phase === 'playing') finishMatch(G.aliveCount(), false);
    if (NET.party && NET.role === 'client') { NET.end(); toLobby(); return; }
    if (NET.party) NET.startParty(); else startMatch();
  });
  $('btn-lobby').addEventListener('click', toLobby);
  $('btn-quit').addEventListener('click', toLobby);
  $('btn-resume').addEventListener('click', () => G.togglePause());
  $('btn-spectate').addEventListener('click', () => {
    show('endscreen', false); show('spectate', true);
    $('spectate').innerHTML = specLabel();
  });
  window.addEventListener('keydown', (e) => {
    if (e.target && e.target.tagName === 'INPUT') return;
    if (e.code === 'Enter' && G.phase === 'dead' && $('endscreen').hidden) { show('spectate', false); showEnd(false); }
    if (e.code === 'KeyP' && G.inMatch()) G.togglePause();
  });
}

// ---------- main loop ----------
function updateFog(cam) {
  if (G.phase === 'menu') { GFX.scene.fog.near = 320; GFX.scene.fog.far = 1500; if (GFX.camera.far !== 2400) { GFX.camera.far = 2400; GFX.camera.updateProjectionMatrix(); } return; }
  const alt = Math.max(0, cam.position.y - 40);
  GFX.scene.fog.near = (PERF.on ? 110 : 160) + alt * 1.5;
  GFX.scene.fog.far = (SETTINGS.quality === 'high' ? 480 : PERF.on ? 320 : 420) + alt * 3;
  if (PERF.on && Math.abs(GFX.camera.far - GFX.scene.fog.far - 40) > 5) { GFX.camera.far = GFX.scene.fog.far + 40; GFX.camera.updateProjectionMatrix(); }
}
// Villain land feels dead: overcast gray sky and fog, dimmer and colder light, washed-out colors.
// Blends in as the camera crosses into the villain half (and back out).
const GLOOM = {
  f: 0, applied: -1, cols: null,
  update(cam, dt) {
    if (!GFX.sky) return;
    if (!this.cols) {
      const C = (h) => new THREE.Color(h);
      this.cols = {
        top: [GFX.sky.material.uniforms.top.value.clone(), C(0x4b505c)], horizon: [GFX.scene.background.clone(), C(0x9a9ca2)],
        hemiSky: [GFX.hemi.color.clone(), C(0x9ba1ab)], hemiGround: [GFX.hemi.groundColor.clone(), C(0x4a463f)],
        sun: [GFX.sun.color.clone(), C(0xc9c3ba)], hemiI: [GFX.hemi.intensity, 0.72], sunI: [GFX.sun.intensity, 0.8],
      };
    }
    const target = G.phase === 'menu' ? 0 : WORLD.gloomAt(cam.position.x);
    this.f += (target - this.f) * Math.min(1, dt * 0.9);
    if (Math.abs(this.f - this.applied) < 0.004) return;
    this.applied = this.f;
    const k = this.f, c = this.cols, mix = (pair, out) => out.copy(pair[0]).lerp(pair[1], k);
    mix(c.top, GFX.sky.material.uniforms.top.value);
    mix(c.horizon, GFX.scene.background); // also the sky's horizon color (same object)
    GFX.scene.fog.color.copy(GFX.scene.background);
    mix(c.hemiSky, GFX.hemi.color); mix(c.hemiGround, GFX.hemi.groundColor); mix(c.sun, GFX.sun.color);
    GFX.hemi.intensity = lerp(c.hemiI[0], c.hemiI[1], k); GFX.sun.intensity = lerp(c.sunI[0], c.sunI[1], k);
    GFX.renderer.domElement.style.filter = `saturate(${lerp(1.12, 0.7, k).toFixed(3)}) contrast(${lerp(1.07, 1.12, k).toFixed(3)}) brightness(${lerp(1, 0.97, k).toFixed(3)})`;
  },
};
let lastT = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  if (BG_TICK.on) return; // the background ticker is driving the match
  tick(now, true);
}
// Browsers stop requestAnimationFrame in a hidden tab. In a party match that would freeze the whole
// match for everyone (the host runs the bots, bosses and storm), so while the tab is hidden a Web
// Worker timer (not paused in background tabs) keeps the game simulating, without drawing.
const BG_TICK = {
  on: false, worker: null,
  start() {
    if (this.on) return;
    if (!this.worker) {
      try {
        const url = URL.createObjectURL(new Blob(['let t=null;onmessage=(e)=>{clearInterval(t);if(e.data)t=setInterval(()=>postMessage(0),50);};'], { type: 'text/javascript' }));
        this.worker = new Worker(url);
        this.worker.onmessage = () => { if (this.on) tick(performance.now(), false); };
      } catch (e) { return; }
    }
    this.on = true; lastT = performance.now(); this.worker.postMessage(1);
  },
  stop() { if (!this.on) return; this.on = false; if (this.worker) this.worker.postMessage(0); lastT = performance.now(); },
  sync() { if (document.hidden && NET.inMatch && G.phase !== 'menu') this.start(); else this.stop(); },
};
document.addEventListener('visibilitychange', () => BG_TICK.sync());
function tick(now, draw) {
  const dt = Math.max(0, Math.min(0.05, (now - lastT) / 1000));
  lastT = now;
  const cam = GFX.camera;
  if (G.phase === 'menu') {
    LOBBY.update(dt);
    GFX.sky.position.copy(cam.position);
    updateFog(cam);
    GLOOM.update(cam, dt);
    GFX.renderer.render(GFX.scene, cam);
    INPUT.endFrame();
    return;
  }
  // the Season 1 finale takes over the screen (and stops the match) while it plays
  if (CINE.on && !CINE.live) { CINE.update(dt, cam); WORLD.cullCells(cam.position); updateFog(cam); GFX.sky.position.copy(cam.position); FX.update(dt); HUD.update(dt); GFX.renderer.render(GFX.scene, cam); INPUT.endFrame(); return; }
  if (!G.paused) {
    G.time += dt;
    BUS.update(dt);
    PC.update(dt);
    if (PC.c && PC.c.emote) EMOTES.tick(dt);
    if (!NET.client && (G.phase !== 'over' || G.winner)) BOTS.update(dt);
    WORLD.cullCells(cam.position);
    if (G.event) HANG.update(dt);
    if (G.ultronMode) ULTRON_MODE.update(dt);
    if (!NET.client) BOSS.update(dt); else BOSS.updateBar();
    NET.update(dt);
    // bosses arrive when the first storm circle has closed
    if (!G.bossesArrived && (G.reload || location.hash === '#ultron' ? G.time > 6 : G.arena ? G.time > 3 : STORM.phase >= 1)) { G.bossesArrived = true; BOSS.arrive(); }
    if (!G.event) { EVENTS.update(dt); EXPOSE.update(dt); REBOOT.update(dt); }
    for (const c of G.chars) CHARS.update(c, dt);
    LEBRON.update(dt); // the LeBron token and fight (after movement, so his arena position wins)
    CHARS.flushCrowd();
    if (G.phase !== 'over' && !G.event) STORM.update(dt);
    BUILD.update(dt); ITEMS.update(dt); WORLD.update(dt); FX.update(dt); VEH.update(dt); PADS.update(dt);
    if (G.phase === 'dead' && (!PC.spectating || !PC.spectating.alive)) PC.spectating = G.randomAlive();
  }
  if (!draw) { BG_TICK.sync(); return; } // hidden tab: simulate only
  PC.updateCamera(dt);
  const focus = G.phase === 'dead' && PC.spectating ? PC.spectating.pos : (G.player.state === 'bus' ? BUS.pos : G.player.pos);
  GFX.sun.position.set(focus.x + 60, focus.y + 140, focus.z + 40);
  GFX.sun.target.position.copy(focus);
  GFX.sky.position.copy(cam.position);
  updateFog(cam);
  GLOOM.update(cam, dt);
  if (SFX.listener) { SFX.listener.copy(cam.position); SFX.listenerRight.set(Math.cos(PC.camYaw), 0, -Math.sin(PC.camYaw)); }
  HUD.update(dt);
  GFX.renderer.render(GFX.scene, cam);
  INPUT.endFrame();
}

async function boot() {
  loadSettings();
  if (typeof THREE === 'undefined') {
    document.getElementById('loading').innerHTML = '<div class="loadbox"><h2>Could not load the 3D engine</h2><p>Unblockednite needs three.js from cdnjs.cloudflare.com. Check your connection and reload.</p></div>';
    show('loading', true);
    return;
  }
  PROFILE.load();
  await ACCOUNT.gate(); // sign in (or sign up) first; loads your saved progress
  LOADING.tip();
  const step = (f, label) => { LOADING.set(f, label); return new Promise((r) => setTimeout(r, 16)); }; // let the bar paint
  await step(0.05, 'Starting the engine');
  initGraphics();
  makeMaterials();
  makeGeometries();
  await step(0.12, 'Loading skins');
  await SKINS.init();
  await step(0.38, 'Loading weapons');
  await GUNS.init();
  await step(0.48, 'Loading animations');
  await ANIMS.init();
  await step(0.6, 'Loading buildings and trees');
  await PROPS.init();
  await loadGround();
  await step(0.85, 'Setting up the lobby');
  BUILD.init();
  HUD.init();
  INPUT.init(GFX.renderer.domElement);
  initMenu();
  LOBBY.init();
  CHAT.init();
  await step(0.92, 'Generating the island');
  WORLD.generate((Math.random() * 1e9) | 0);
  LOADING.set(1, 'Ready');
  show('loading', false);
  LOBBY.show();
  requestAnimationFrame(frame);
}
window.addEventListener('load', boot);

// ===== Arena matches (1v1, 2v2, 3v3, 1v2, 4 vs Boss) =====
const ARENA_MATCH = {
  // teams: humans first (split between the teams or together), then bots fill the free spots
  setupTeams(A, diff) {
    G.squad = 0; G.teamMode = false;
    const caps = A.teams.slice(), cfg = A.cfg, ids = A.boss ? ['A'] : ['A', 'B'];
    const count = { A: 0, B: 0 };
    const humans = G.chars.filter((c) => c.human);
    humans.forEach((c, i) => {
      let t = A.boss ? 'A' : cfg.split ? ids[i % 2] : 'A';
      if (count[t] >= caps[ids.indexOf(t)]) t = ids.find((k, j) => count[k] < caps[j]) || t;
      c.team = t; count[t]++;
    });
    // bots fill empty spots (and always fill an empty opposing team, or there'd be nobody to fight)
    let want = 0;
    ids.forEach((t, j) => { const free = caps[j] - count[t]; if (free > 0 && (cfg.bots || count[t] === 0) && !(A.boss && !cfg.bots)) want += free; });
    const bots = want ? BOTS.create(want, diff) : [];
    let bi = 0;
    ids.forEach((t, j) => {
      const free = caps[j] - count[t];
      if (free <= 0 || !(cfg.bots || count[t] === 0) || (A.boss && !cfg.bots)) return;
      for (let k = 0; k < free && bi < bots.length; k++) { bots[bi].team = t; bi++; }
    });
    G.chars.push(...bots);
    for (const c of G.chars) if (c !== G.player && c.team === G.player.team) CHARS.teamMarker(c);
  },
  // boss practice: the chosen boss(es) set up in the middle of the arena, no henchmen
  bosses(A, diff) {
    const live = Object.keys(BOSS_TYPES).filter(id => !BOSS_TYPES[id].off), pickIds = A.cfg.boss === 'all' ? live : A.cfg.boss === 'random' || !live.includes(A.cfg.boss) ? [pick(live)] : [A.cfg.boss];
    BOSS.setup(diff, true, pickIds, true);
  },
  // no bus: both teams start on the ground on opposite sides of the arena with their loadouts
  spawn(A) {
    BUS.active = false;
    const c0 = WORLD.randomLandPoint(0, 0, 40), ang = Math.random() * TAU, R = A.boss ? 0 : 38;
    const side = { A: ang, B: ang + Math.PI };
    STORM.cur = { x: c0.x, z: c0.z, r: 190 }; STORM.next = { x: c0.x, z: c0.z, r: 85 }; STORM.syncMesh();
    const cfg = A.cfg, mine = ARENA.cfg().loadout;
    for (const c of G.chars) {
      if (c.isBoss || c.henchman) continue;
      const a = (side[c.team] || 0) + rand(-0.35, 0.35), r = A.boss ? rand(30, 40) : R + rand(-4, 4);
      const p = WORLD.randomLandPoint(c0.x + Math.cos(a) * r, c0.z + Math.sin(a) * r, 6);
      c.pos.set(p.x, WORLD.heightAt(p.x, p.z) + 0.5, p.z); c.vel.set(0, 0, 0);
      c.state = 'ground'; c.yaw = Math.atan2(-(c0.x - p.x), -(c0.z - p.z));
      if (c.model) c.model.root.visible = true;
      // you use your own loadout; bots (and the host's view of friends) use the host's
      const lo = c.isPlayer ? mine : cfg.loadout;
      c.slots = [null, null, null, null, null];
      lo.forEach((id, i) => { c.slots[i] = WEAPONS[id] ? ITEMS.makeWeapon(id, 4) : CONSUMABLES[id] ? ITEMS.makeCons(id, CONSUMABLES[id].stack) : null; });
      c.sel = 0;
      for (const k in AMMO) c.ammo[k] = (AMMO[k].give || 10) * 6;
      c.mats.wood = 300; c.mats.brick = 200; c.mats.metal = 100;
      c.shield = 100;
      if (c.ai) { c.ai.mode = 'wander'; c.ai.landT = G.time; const foes = G.chars.filter((x) => x.team !== c.team && !x.henchman); c.ai.hunt = foes.length ? { c: pick(foes), until: 9999 } : null; }
    }
    if (A.boss) for (const u of BOSS.units) if (u.c) { u.c.pos.set(c0.x, WORLD.heightAt(c0.x, c0.z) + 0.5, c0.z); u.home.copy(u.c.pos); u.target = null; }
    if (A.boss) for (const c of BOTS.list) if (c.ai) { const b = BOSS.units.find((u) => u.c); c.ai.hunt = b ? { c: b.c, until: 9999 } : null; }
  },
  // someone went down: is a team out?
  check(c, killer) {
    if (G.phase === 'over') return;
    const A = G.arena, p = G.player;
    const alive = (t) => G.chars.some((x) => x.alive && !x.isBoss && !x.henchman && x.team === t);
    if (c && c.isPlayer && G.phase === 'playing') {
      G.phase = 'dead'; SFX.play('death', 0.6);
      const mate = G.chars.find((x) => x.alive && x !== c && x.team === c.team && !x.isBoss);
      PC.spectating = mate || (killer && killer.alive ? killer : G.randomAlive());
      HUD.banner('YOU WERE ELIMINATED', mate ? 'Spectating your teammate' : '');
    }
    let winTeam = null, over = false;
    if (A.boss) {
      const bossAlive = BOSS.units.some((u) => u.c && u.c.alive);
      if (!bossAlive) { winTeam = 'A'; over = true; } else if (!alive('A')) over = true;
    } else {
      const a = alive('A'), b = alive('B');
      if (!a || !b) { winTeam = a ? 'A' : b ? 'B' : null; over = true; }
    }
    if (!over) return;
    const won = winTeam && p.team === winTeam;
    G.winner = G.chars.find((x) => x.alive && x.team === winTeam) || null;
    G.phase = 'over'; G.placement = won ? 1 : 2;
    finishMatch(G.placement, !!won);
    clearTimeout(G.endTimer);
    SFX.play(won ? 'victory' : 'death', 0.7);
    setTimeout(() => showEnd(!!won), 1200);
  },
};
