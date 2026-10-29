'use strict';
// ===== Bosses: Adam Smasher (compound), Doctor Doom (his throne hall), Thanos (roams the wilds) and
// Iron Man (at the foot of Avengers Tower). They all run at once; each guards its own patch of the map.
// Whoever finishes Adam becomes him; the others drop big loot and pay Lunch Money. =====
// turf: only notices people inside it; roam: never chases further than this from home
const SMASHER = { size: 1.5, hp: 1500, speed: 1.9, dmg: 1.25, sight: 60, turf: 50, roam: 110, chase: 70 };

const BOSS_TYPES = {
  adam: { off: true, name: 'Adam Smasher', outfit: 'adam', size: 1.5, hp: 1, weapon: 'bosscannon', rockets: 1, slam: true, lair: 'compound', sight: 60, turf: 50, roam: 110, chase: 70, become: true, color: '#d7263d' },
  doom: { power: 'doom', name: 'Doctor Doom', outfit: 'doom', size: 1.3, hp: 1.1, weapon: 'beam_doom', rockets: 1, slam: true, lair: 'throne', sight: 50, turf: 46, roam: 48, chase: 48, color: '#2fb04a', coins: 400 },
  thanos: { power: 'thanos', name: 'Thanos', outfit: 'thanos', size: 1.75, hp: 1.4, weapon: 'beam_thanos', rockets: 0.7, slam: true, slamPower: 1.4, lair: 'wilds', sight: 65, turf: 70, roam: 170, chase: 90, wander: true, color: '#9b4dff', coins: 500 },
  ironman: { power: 'ironman', name: 'Iron Man', outfit: 'ironman', size: 1.15, hp: 0.9, weapon: 'beam_iron', rockets: 1.3, slam: false, lair: 'tower', sight: 70, turf: 55, roam: 45, chase: 55, color: '#ffb02e', coins: 400 },
};

// Season 1 finale (live event): Monday Oct 26 2026, 1:50 PM on each player's clock, Infinity Ultron destroys
// Thanos and takes his place for good (same lair, same Infinity Gauntlet drop)
// Season 1 finale live event time
const ULTRON_EVENT = new Date(2026, 9, 26, 13, 50).getTime(); // Monday Oct 26 2026, 1:50 PM (each player's clock)
function ultronize() {
  Object.assign(BOSS_TYPES.thanos, { name: 'Infinity Ultron', outfit: 'ultron', color: '#d7263d', hp: 2.4, ultron: true, sight: 80 });
  // the Thanos skin is vaulted: gone from the shop and the free villain pick (owners keep it)
  const ts = OUTFITS.find((o) => o.id === 'thanos'); if (ts) ts.hidden = true;
  // v1.5 skins (Venom) arrive with the event
  if (Date.now() < SEASON2) for (const o of OUTFITS) if (o.v15) o.hidden = false; // (Season 2 vaults them again)
  // his Gauntlet drop makes you Infinity Ultron (same stone powers), not Thanos
  if (ultronize.powersReady) Object.assign(POWER_DEFS.thanos, { short: 'Ultron', name: 'Infinity Ultron', outfit: 'ultron', size: 2.1 });
}
if (Date.now() >= ULTRON_EVENT) ultronize();

// ===== The Season 1 finale cinematic: Thanos and Infinity Ultron fight, Ultron kills him, takes the
// Gauntlet and snaps; the screen burns white (reload to continue). The match stops while it plays.
// Both fighters are little AIs acting at the same time: each runs a queue of steps (circle the other,
// charge, punch combo, dodge roll, laser, leap slam, fly, missiles) and gets staggered when hit.
// There's no sideways-run animation, so fighters face where they run and turn to face the enemy to attack.
// =====
const CINE = {
  on: false, t: 0, step: 0, live: false, quiet: false, rnd: Math.random,
  sfx(n, v) { if (!this.quiet) SFX.play(n, v); },
  say(a, b) { if (!this.quiet) HUD.banner(a, b); },
  feed(t) { if (!this.quiet) HUD.killfeedText(t); },
  tr(a, b, col, beam) { if (!this.quiet) FX.tracer(a, b, col, beam); },
  ex(p, r) { if (!this.quiet) FX.explosion(p, r); },
  // live (the hangout): set up at a fixed spot, everyone keeps their own camera, the fight runs off the
  // real clock in fixed steps with a seeded random, so every player sees the same fight at the same time
  startLive(at) {
    this.live = true; this.rnd = mulberry32(26102026);
    this.start(at);
  },
  // catch up to T seconds after the event began (silently if far behind, e.g. someone joining late)
  advance(T) {
    if (!this.on || this.step === 5) return;
    let n = 0;
    while (this.t + 1 / 60 <= T && n++ < 1200) { this.quiet = T - this.t > 0.4; this.sim(1 / 60); }
    this.quiet = false;
    this.pose(1 / 60);
  },
  start(liveAt) {
    const u = liveAt ? null : BOSS.units.find(x => x.id === 'thanos'), real = u && u.c && u.c.alive ? u.c : null;
    const at = liveAt ? liveAt.clone() : real ? real.pos.clone() : u ? u.home.clone() : new THREE.Vector3(WORLD.pois[0].x, 0, WORLD.pois[0].z);
    // keep the fight on flat, dry, open ground: try near Thanos, then near each town
    const dry = (x, z) => {
      const h = WORLD.heightAt(x, z);
      if (h < 4) return false;
      for (const [ox, oz] of [[-12, 0], [12, 0], [0, -12], [0, 12], [-8, -8], [8, 8]]) { const k = WORLD.heightAt(x + ox, z + oz); if (k < 4 || Math.abs(k - h) > 2.5) return false; }
      return !WORLD.nearBuilding || !WORLD.nearBuilding(x, z, 14);
    };
    let spot = null;
    for (const c of [at, ...WORLD.pois.map(q => new THREE.Vector3(q.x, 0, q.z))]) {
      for (let i = 0; i < 30 && !spot; i++) { const p = WORLD.randomLandPoint(c.x, c.z, 15 + i * 3); if (p && dry(p.x, p.z)) spot = p; }
      if (spot) break;
    }
    if (spot && !liveAt) at.set(spot.x, 0, spot.z);
    at.y = WORLD.heightAt(at.x, at.z);
    // clear the trees around the fight so they don't block the camera
    for (const t of WORLD.trees) if (t.parts && dist2D(t.x, t.z, at.x, at.z) < 26) for (const p of t.parts) WORLD.hideInst(p.im, p.i);
    if (real) CHARS.removeModel(real);
    const actor = (outfit, size, x, name) => {
      const c = CHARS.create({ name, colors: BOSS.outfitOf(outfit) });
      BOSS.giveBody(c, outfit, size); c.state = 'ground'; c.onGround = true; c.alive = true; c.sel = -1;
      c.pos.set(at.x + x, at.y, at.z); CHARS.attachModel(c); c.model.root.visible = true;
      // bare hands: a beam weapon has no model, so nothing (not even the pickaxe) is held
      c.slots[0] = { kind: 'weapon', id: 'beam_thanos', rarity: 5, mag: 9999, special: true }; c.sel = 0; c.isBoss = true;
      c.armT = 0; c.armMode = null; c.cineArms = (m, sw) => this.arms(c, m, sw); c.plan = []; c.fly = 0; c.flyTo = 0; c.cineAnim = { key: 'idle', rate: 1 };
      return c;
    };
    this.thanos = actor('thanos', 1.75, -5, 'Thanos');
    this.ultron = actor('ultron', 2.1, 5, 'Infinity Ultron');
    this.thanos.foe = this.ultron; this.ultron.foe = this.thanos;
    this.ultron.fly = this.ultron.flyTo = 60; // comes down from the sky
    this.at = at; this.t = 0; this.step = 0; this.on = true; this.shot = -1; this.lastPick = {};
    if (!this.live) {
      if (document.exitPointerLock) document.exitPointerLock();
      // cinema mode: only the banner and killfeed stay on screen
      const hud = document.getElementById('hud'); if (hud) for (const el of hud.children) if (el.id !== 'banner' && el.id !== 'killfeed') el.style.visibility = 'hidden';
    }
    const ov = this.ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;background:#ff1a1a;opacity:0;display:grid;place-items:center;text-align:center;font:900 44px system-ui;color:#1b1b1b';
    document.body.appendChild(ov);
    if (!this.live) { this.say('SOMETHING IS COMING', 'Season 1 finale'); this.sfx('stormwarn', 1); this.sfx('horn', 0.9); }
  },

  // ---------- helpers ----------
  // legs/body from the game's own Fortnite clips (idle, walk, jog, sprint, air); arms from code poses
  // (the same system that aims guns and swings the harvest tool in normal play)
  anim(c, key, rate = 1, arms = null, armDur = 0.3) {
    if (!c.cineAnim || c.cineAnim.key !== key || c.cineAnim.procArms !== !!arms) c.cineAnim = { key, rate, procArms: !!arms }; else c.cineAnim.rate = rate;
    if (c.armMode !== arms) { c.armMode = arms; c.armT = 0; c.armDur = armDur; }
  },
  arms(c, m, sw) {
    const t = c.armT, md = c.armMode, aim = Math.PI / 2 + c.pitch;
    let R = -sw * 0.8, L = sw * 0.8, zR = 0, zL = 0;
    if (md === 'guard') { R = 1.05; L = 1.15; }
    else if (md === 'punchR' || md === 'punchL') {
      const k = Math.min(1, t / c.armDur), e = k < 0.35 ? k / 0.35 : 1 - (k - 0.35) / 0.65; // snap out fast, pull back slower
      const p = 0.75 + e * 0.95;
      if (md === 'punchR') { R = p; L = 1.15; } else { L = p; R = 1.05; }
    }
    else if (md === 'aim1') { R = aim; zR = 0.08; L = 0.5; }
    else if (md === 'aim2') { R = aim; L = aim - 0.1; zR = 0.08; zL = m.v1 ? 0.5 : -0.5; }
    else if (md === 'raise') { R = 2.95; L = 0.3; }
    else if (md === 'hit') { R = L = -0.45; }
    else if (md === 'up') { R = L = 2.6; }
    else if (md === 'reach') { R = 0.85; L = 0.3; }
    m.armR.rotation.x = R; m.armL.rotation.x = L; m.armR.rotation.z = zR; m.armL.rotation.z = zL;
  },
  turnTo(c, x, z, dt, k = 10) { // smooth turn (characters face -z at yaw 0)
    const want = Math.atan2(c.pos.x - x, c.pos.z - z);
    let d = want - c.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    c.yaw += d * Math.min(1, dt * k);
  },
  hand(c) { const v = new THREE.Vector3(); if (c.model.hand) c.model.hand.getWorldPosition(v); else v.set(c.pos.x, c.pos.y + 2.4, c.pos.z); return v; },
  chest(c) { return new THREE.Vector3(c.pos.x, c.pos.y + 1.25 * c.size, c.pos.z); },
  dist(a, b) { return Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z); },
  away(a, b) { const dx = a.pos.x - b.pos.x, dz = a.pos.z - b.pos.z, d = Math.hypot(dx, dz) || 1; return { x: dx / d, z: dz / d }; },
  // slide a fighter toward a point; returns true on arrival; keeps everyone inside the arena
  slide(c, x, z, spd, dt) {
    const ax = x - this.at.x, az = z - this.at.z, ar = Math.hypot(ax, az);
    if (ar > 10) { x = this.at.x + ax / ar * 10; z = this.at.z + az / ar * 10; }
    const dx = x - c.pos.x, dz = z - c.pos.z, d = Math.hypot(dx, dz);
    if (d < 0.35) return true;
    const k = Math.min(1, spd * dt / d); c.pos.x += dx * k; c.pos.z += dz * k;
    return false;
  },
  runAnim(spd) { return spd > 8 ? 'sprint' : spd > 3.5 ? 'jog' : 'walk'; },
  beam(from, to, color, wide) {
    const a = this.hand(from), b = this.chest(to);
    b.x += (Math.random() - 0.5) * 0.6; b.y += (Math.random() - 0.5) * 0.6; b.z += (Math.random() - 0.5) * 0.6;
    this.tr(a, b, color, true);
    if (wide) { this.tr(a.clone().add(new THREE.Vector3(0, 0.25, 0)), b, color, true); this.tr(a.clone().add(new THREE.Vector3(0.2, -0.2, 0)), b, color, true); }
    if (Math.random() < 0.3) this.ex(b, wide ? 2 : 1);
    G.shake = Math.max(G.shake, wide ? 0.5 : 0.2);
  },
  // a hit knocks the victim back and interrupts what they were doing
  stagger(v, from, push, heavy) {
    if (v.dead || (this.step >= 2 && v === this.ultron)) return; // nothing interrupts Ultron's finale
    const d = this.away(v, from);
    v.plan = [{ dur: heavy ? 0.7 : 0.45, enter: () => { this.anim(v, 'idle', 1, 'hit'); v.flyTo = 0; }, tick: (dt, k) => {
      this.slide(v, v.pos.x + d.x * 5, v.pos.z + d.z * 5, push * (1 - k) * 3, dt); this.turnTo(v, from.pos.x, from.pos.z, dt, 6);
    } }, { dur: 0.25, enter: () => this.anim(v, 'idle', 1, 'guard') }];
    v.step = null;
  },
  boom(p, r, shake) { this.ex(p, r); G.shake = Math.max(G.shake, shake); this.sfx('explode', Math.min(1, 0.4 + r * 0.1)); },

  // ---------- step builders ----------
  // run in an arc around the foe (facing the way you run), then turn back to face them
  circle(c, dur, spd) {
    const dir = this.rnd() < 0.5 ? 1 : -1, r = 5 + this.rnd() * 3;
    return { dur, tick: (dt) => {
      const f = c.foe, a = Math.atan2(c.pos.z - f.pos.z, c.pos.x - f.pos.x) + dir * 0.9;
      const tx = f.pos.x + Math.cos(a) * r, tz = f.pos.z + Math.sin(a) * r;
      this.slide(c, tx, tz, spd, dt); this.turnTo(c, tx, tz, dt, 8); this.anim(c, this.runAnim(spd), spd / 7);
    } };
  },
  face(c, dur, arms) { return { dur, enter: () => this.anim(c, 'idle', 1, arms === undefined ? 'guard' : arms), tick: (dt) => this.turnTo(c, c.foe.pos.x, c.foe.pos.z, dt, 12) }; },
  roll(c, side) {
    return { dur: 0.42, enter: () => { this.anim(c, 'sprint', 1.4); this.sfx('swing', 0.5); }, tick: (dt) => { // a quick dodge dash to the side
      const d = this.away(c, c.foe), sx = -d.z * side + d.x * 0.3, sz = d.x * side + d.z * 0.3;
      this.slide(c, c.pos.x + sx * 3, c.pos.z + sz * 3, 12, dt); this.turnTo(c, c.pos.x + sx, c.pos.z + sz, dt, 18);
    } };
  },
  charge(c, maxDur, spd) {
    return { dur: maxDur, tick: (dt, k, s) => {
      const f = c.foe, d = this.away(f, c);
      if (this.dist(c, f) < 2.2 + f.size * 0.4) { s.done = true; return; }
      this.slide(c, f.pos.x + d.x * 2, f.pos.z + d.z * 2, spd, dt); this.turnTo(c, f.pos.x, f.pos.z, dt, 14); this.anim(c, 'sprint', 1.3);
    } };
  },
  punch(c, side, heavy) {
    const dur = heavy ? 0.5 : 0.34;
    return { dur, enter: () => { this.anim(c, 'idle', 1, side === 'L' ? 'punchL' : 'punchR', dur); this.sfx('swing', 0.8); }, tick: (dt) => { this.turnTo(c, c.foe.pos.x, c.foe.pos.z, dt, 14); const d = this.away(c.foe, c); this.slide(c, c.pos.x + d.x, c.pos.z + d.z, heavy ? 4 : 2, dt); },
      exit: () => { const f = c.foe; if (this.dist(c, f) < 4.5) { this.boom(this.chest(f), heavy ? 2.4 : 1.4, heavy ? 0.9 : 0.4); this.sfx('hit', 1); this.stagger(f, c, heavy ? 9 : 3, heavy); } } };
  },
  laser(c, dur, color, wide) {
    let last = 0;
    return { dur, enter: () => { this.anim(c, c.fly > 1 ? 'air' : 'idle', 1, wide ? 'aim2' : 'aim1'); this.sfx('laser', 1); }, tick: (dt, k, s) => {
      this.turnTo(c, c.foe.pos.x, c.foe.pos.z, dt, 12);
      if (s.t - last > 0.06) { last = s.t; this.beam(c, c.foe, color, wide); }
    }, exit: () => this.stagger(c.foe, c, wide ? 8 : 5, wide) };
  },

  // ---------- the two fighters' move sets ----------
  pick(c, list) { // weighted, never the same move twice in a row
    const opts = list.filter(o => o[0] !== this.lastPick[c.name]); let r = this.rnd() * opts.reduce((a, o) => a + o[1], 0);
    for (const o of opts) { if ((r -= o[1]) <= 0) { this.lastPick[c.name] = o[0]; return o[0]; } }
    return opts[0][0];
  },
  thanosPlan(c) {
    const f = c.foe, m = this.pick(c, [['circle', 3], ['combo', 3], ['stone', 2], ['leap', 2]]);
    if (m === 'circle') return [this.circle(c, 1 + this.rnd() * 0.8, 7), this.face(c, 0.2)];
    if (m === 'combo') return [this.charge(c, 1.6, 11), this.punch(c, 'R'), this.punch(c, 'L'), this.punch(c, 'R', true), this.roll(c, this.rnd() < 0.5 ? 1 : -1)];
    if (m === 'stone') return [this.roll(c, this.rnd() < 0.5 ? 1 : -1), this.face(c, 0.35, 'raise'), this.laser(c, 1.1, 0xb04aff)];
    // leap: jump high toward Ultron and smash the ground
    let from = null;
    return [this.face(c, 0.25, 'guard'), { dur: 0.9, enter: () => { from = c.pos.clone(); this.anim(c, 'air', 1, 'up'); this.sfx('swing', 1); }, tick: (dt, k) => {
      const d = this.away(f, c); this.slide(c, f.pos.x + d.x * 2.5, f.pos.z + d.z * 2.5, 12, dt); c.fly = c.flyTo = Math.sin(Math.PI * k) * 7; this.turnTo(c, f.pos.x, f.pos.z, dt, 10);
    }, exit: () => {
      c.fly = c.flyTo = 0; this.boom(new THREE.Vector3(c.pos.x, c.pos.y + 0.3, c.pos.z), 5, 1.6); this.sfx('cannon', 1);
      if (this.dist(c, f) < 7) this.stagger(f, c, 11, true);
    } }, this.face(c, 0.4, 'hit')];
  },
  ultronPlan(c) {
    const f = c.foe;
    if (this.dist(c, f) < 3 && this.rnd() < 0.6) return [this.punch(c, 'R', true), this.roll(c, this.rnd() < 0.5 ? 1 : -1)]; // counter
    const m = this.pick(c, [['circle', 3], ['hover', 3], ['dash', 2], ['missiles', 2]]);
    if (m === 'circle') return [this.circle(c, 0.8 + this.rnd() * 0.8, 8), this.face(c, 0.2)];
    if (m === 'dash') return [this.roll(c, this.rnd() < 0.5 ? 1 : -1), this.laser(c, 0.8, 0xff2a2a)];
    if (m === 'missiles') {
      const shots = [];
      return [this.face(c, 0.2), { dur: 1.2, enter: () => { this.anim(c, 'idle', 1, 'aim2'); this.sfx('rocket', 1); for (let i = 0; i < 8; i++) shots.push(0.12 + i * 0.12); }, tick: (dt, k, s) => {
        this.turnTo(c, f.pos.x, f.pos.z, dt, 12);
        while (shots.length && s.t >= shots[0]) {
          shots.shift();
          const p = this.chest(f).add(new THREE.Vector3((Math.random() - 0.5) * 5, -1 + Math.random() * 2, (Math.random() - 0.5) * 5));
          this.tr(this.hand(c).add(new THREE.Vector3(0, 1, 0)), p, 0xffb02e, false); this.boom(p, 1.8, 0.5);
        }
      }, exit: () => this.stagger(f, c, 6, true) }];
    }
    // hover: lift off, strafe through the air firing, dive back down with a slam
    let last = 0;
    const air = { dur: 2.4, enter: () => { this.anim(c, 'air', 1, 'aim1'); this.sfx('laser', 0.9); }, tick: (dt, k, s) => {
      const a = Math.atan2(c.pos.z - f.pos.z, c.pos.x - f.pos.x) + 1.2;
      this.slide(c, f.pos.x + Math.cos(a) * 7, f.pos.z + Math.sin(a) * 7, 8, dt); this.turnTo(c, f.pos.x, f.pos.z, dt, 12);
      if (s.t - last > 0.3) { last = s.t; for (let i = 0; i < 3; i++) this.beam(c, f, 0xff2a2a); }
    }, exit: () => this.stagger(f, c, 4) };
    return [{ dur: 0.5, enter: () => { this.anim(c, 'air', 1, 'up'); c.flyTo = 7; this.sfx('rocket', 0.8); } }, air,
      { dur: 0.35, enter: () => { c.flyTo = 0; }, tick: (dt) => this.slide(c, f.pos.x, f.pos.z, 10, dt), exit: () => {
        this.boom(new THREE.Vector3(c.pos.x, c.pos.y + 0.3, c.pos.z), 4.5, 1.4); this.sfx('cannon', 1); if (this.dist(c, f) < 6) this.stagger(f, c, 9, true);
      } }, this.face(c, 0.3)];
  },
  // run one fighter's queue for a frame
  run(c, dt) {
    if (!c.step) {
      if (!c.plan.length) c.plan = c.ai ? (c === this.thanos ? this.thanosPlan(c) : this.ultronPlan(c)) : [this.face(c, 0.5)];
      c.step = c.plan.shift(); c.step.t = 0; if (c.step.enter) c.step.enter();
    }
    const s = c.step; s.t += dt;
    if (s.tick) s.tick(dt, Math.min(1, s.t / s.dur), s);
    if (c.step === s && (s.done || s.t >= s.dur)) { c.step = null; if (s.exit) s.exit(); }
  },

  // the in-match cinematic (camera taken over)
  update(dt, cam) {
    dt = Math.max(0, Math.min(dt, 0.05));
    G.time += dt;
    this.sim(dt);
    if (this.step !== 5) { this.camera(dt, cam); this.pose(dt); }
  },
  sim(dt) {
    const T = this.t += dt, th = this.thanos, ul = this.ultron;
    if (!this.live || !this.quiet) G.shake = Math.max(0, G.shake - dt * 1.5);
    if (T === dt && this.live) { this.say('SOMETHING IS COMING', 'Season 1 finale'); this.sfx('stormwarn', 1); this.sfx('horn', 0.9); }
    if (this.step === 5) return; // frozen on white until the page is reloaded
    // slow motion as Thanos falls
    const sdt = T > 24.4 && T < 25.9 ? dt * 0.3 : dt;
    if (T < 31) this.ov.style.opacity = Math.min(0.2, T * 0.05);

    // 0-6 s: Ultron comes down from the sky and lands hard
    if (this.step === 0) {
      ul.flyTo = ul.fly = T < 2 ? 60 : 60 * Math.pow(Math.max(0, 1 - (T - 2) / 3.6), 2);
      this.anim(ul, 'air', 1, 'up'); this.anim(th, 'idle', 1, 'guard'); this.turnTo(th, ul.pos.x, ul.pos.z, dt, 4); this.turnTo(ul, th.pos.x, th.pos.z, dt, 4);
      if (T >= 5.6) {
        this.step = 1; ul.fly = ul.flyTo = 0; this.boom(new THREE.Vector3(ul.pos.x, ul.pos.y + 0.5, ul.pos.z), 6, 1.8); this.sfx('cannon', 1);
        ul.plan = [this.face(ul, 0.9, 'hit'), this.face(ul, 0.5)]; th.plan = [this.face(th, 0.8, 'guard')];
        this.say('INFINITY ULTRON VS THANOS', 'The Mad Titan fights back with the Gauntlet');
      }
    }
    // 6-23 s: the fight (both AIs on at once)
    if (this.step === 1) { th.ai = ul.ai = true; }
    // 23 s: Ultron takes to the sky and charges a huge beam; Thanos can't get to him
    if (this.step === 1 && T >= 23) {
      this.step = 2; th.ai = ul.ai = false;
      const back = this.away(ul, th);
      ul.plan = [{ dur: 0.8, enter: () => { this.anim(ul, 'air', 1, 'up'); ul.flyTo = 6; this.sfx('rocket', 1); }, tick: (dt) => { this.slide(ul, th.pos.x + back.x * 8, th.pos.z + back.z * 8, 12, dt); this.turnTo(ul, th.pos.x, th.pos.z, dt, 10); } }, this.face(ul, 0.5, 'raise'), this.laser(ul, 1.6, 0xff2a2a, true)];
      th.plan = [this.face(th, 0.4, 'raise'), this.laser(th, 0.8, 0xb04aff)];
      ul.step = th.step = null;
      this.say('ULTRON UNLEASHES EVERYTHING', '');
    }
    // 24.6 s: Thanos falls (slow motion)
    if (this.step === 2 && T >= 24.6) {
      this.step = 3; th.dead = true; th.plan = []; th.step = { dur: 99, tick: (dt) => { th.fall = Math.min(1, (th.fall || 0) + dt * 1.4); } }; this.anim(th, 'idle', 1, 'hit');
      this.boom(this.chest(th), 7, 2); this.sfx('death', 1);
      this.feed('<b>Thanos</b> was destroyed by <b>Infinity Ultron</b>'); this.say('THANOS HAS FALLEN', '');
    }
    // 26.3 s: Ultron lands and walks over to the body; 28.4 s: takes the Gauntlet; 30.6 s: raises it; 31 s: snap
    if (this.step === 3 && T >= 26.3) {
      this.step = 4;
      const d = this.away(ul, th);
      ul.plan = [{ dur: 0.5, enter: () => { ul.flyTo = 0; this.anim(ul, 'air', 1, 'up'); } },
        { dur: 2, tick: (dt, k, s) => { if (this.slide(ul, th.pos.x + d.x * 2.6, th.pos.z + d.z * 2.6, 2.4, dt)) { s.done = true; } this.turnTo(ul, th.pos.x, th.pos.z, dt, 8); this.anim(ul, 'walk', 1); } },
        { dur: 1.4, enter: () => { this.anim(ul, 'idle', 1, 'reach'); this.say('ULTRON TAKES THE INFINITY GAUNTLET', ''); this.takeGauntlet(); } },
        { dur: 9, enter: () => this.anim(ul, 'idle', 1, 'raise') }];
      ul.step = null;
    }
    if (this.gem) {
      const k = Math.min(1, (T - this.gemT) / 1.6), to = this.hand(ul).add(new THREE.Vector3(0, 0.6, 0));
      this.gem.position.lerpVectors(this.gemFrom, to, k * k * (3 - 2 * k)); this.gem.rotation.y += dt * 4;
      if (Math.random() < 0.3) this.ex(this.gem.position.clone(), 0.5);
    }
    if (this.step === 4 && T >= 31) {
      this.step = 6; this.say('*SNAP*', '');
      // Ultron does the real Fortnite Snap emote
      const snapSt = EMOTES.byId.fn_snap ? EMOTES.state('fn_snap') : null;
      if (snapSt) { ul.cineAnim = snapSt; ul.armMode = null; } else this.anim(ul, 'idle', 1, 'raise');
      // everyone at the live event gets the Snap emote
      if (this.live && !this.quiet && !PROFILE.data.emotes.includes('fn_snap')) { PROFILE.data.emotes.push('fn_snap'); PROFILE.data.tools = [...new Set([...(PROFILE.data.tools || []), 'gauntlet'])]; PROFILE.data.pickaxe = 'gauntlet'; PROFILE.save(); setTimeout(() => HUD.toast('Unlocked the Snap emote and the Infinity Gauntlet harvesting tool: only from the live event'), 600); }
      this.sfx('shieldbreak', 1); this.sfx('explode', 1); G.shake = 2.2;
      this.ov.style.background = '#fff';
    }
    if (this.step === 6) this.ov.style.opacity = Math.min(1, 0.2 + (T - 31) * 0.4);
    if (this.step === 6 && T >= 34) {
      this.step = 5;
      try { localStorage.setItem('unf_ultron_seen', '1'); } catch (e) {}
      this.ov.style.pointerEvents = 'auto';
      this.ov.innerHTML = '<div>INFINITY ULTRON HAS SNAPPED<div style="font:600 20px system-ui;margin-top:14px;color:#555">He has the Gauntlet now.<br>Reload Unblockednite to continue.</div></div>';
      return;
    }

    // fighters: run their steps, glide to their flying height, stand on the ground
    if (this.step >= 1) { this.run(th, sdt); this.run(ul, sdt); }
    for (const c of [th, ul]) {
      if (this.step >= 1) c.fly += (c.flyTo - c.fly) * Math.min(1, sdt * (c.flyTo < c.fly ? 9 : 5));
      c.pos.y = WORLD.heightAt(c.pos.x, c.pos.z) + c.fly;
      c.armT += sdt;
    }
    this.sdt = sdt;
  },
  camera(dt, cam) {
    const T = this.t, th = this.thanos, ul = this.ultron;

    // camera: a new shot every few seconds (wide orbit, over Thanos's shoulder, over Ultron's shoulder,
    // low hero angle); wide for the arrival, low and close for the ending
    const mid = th.pos.clone().add(ul.pos).multiplyScalar(0.5), v = this.away(ul, th), gap = this.dist(th, ul);
    const shot = T < 6 ? 0 : T >= 24.4 ? 4 : Math.floor((T - 6) / 3) % 4;
    let px, py, pz, look = new THREE.Vector3(mid.x, mid.y + 2.2, mid.z);
    if (shot === 0) { const a = T * 0.2, R = T < 6 ? 22 : 8 + gap * 0.6; px = mid.x + Math.cos(a) * R; pz = mid.z + Math.sin(a) * R; py = T < 6 ? this.at.y + 5 : mid.y + 3; if (T < 6) look.set(ul.pos.x, (ul.pos.y + this.at.y) / 2 + 2, ul.pos.z); }
    else if (shot === 1) { px = th.pos.x - v.x * 4.5 - v.z * 2.2; pz = th.pos.z - v.z * 4.5 + v.x * 2.2; py = th.pos.y + 3; }
    else if (shot === 2) { px = ul.pos.x + v.x * 4.5 + v.z * 2.2; pz = ul.pos.z + v.z * 4.5 - v.x * 2.2; py = ul.pos.y + 3.2; }
    else if (shot === 3) { const s = -v.z, t2 = v.x; px = mid.x + s * (7 + gap * 0.5); pz = mid.z + t2 * (7 + gap * 0.5); py = mid.y + 0.8; look.y = mid.y + 3.2; }
    else { const a = T * 0.12, sx = -v.z, sz = v.x; px = mid.x + sx * 13 + Math.cos(a) * 2; pz = mid.z + sz * 13 + Math.sin(a) * 2; py = th.pos.y + 1.2; look.set(mid.x, (this.chest(th).y + this.chest(ul).y) / 2, mid.z); } // low side-on: Ultron in the sky, Thanos on the ground
    const tgt = new THREE.Vector3(px, py, pz);
    if (this.shot !== shot) { this.shot = shot; cam.position.copy(tgt); this.look = look.clone(); } else { cam.position.lerp(tgt, Math.min(1, dt * 3)); this.look.lerp(look, Math.min(1, dt * 5)); }
    cam.position.y = Math.max(cam.position.y, WORLD.heightAt(cam.position.x, cam.position.z) + 1); // never inside a hill
    cam.lookAt(this.look);
    if (G.shake > 0) { cam.position.x += (Math.random() - 0.5) * G.shake * 0.6; cam.position.y += (Math.random() - 0.5) * G.shake * 0.6; }
    cam.updateMatrixWorld();
  },
  // pose the models (once per drawn frame)
  pose(dt) {
    const th = this.thanos, ul = this.ultron, sdt = this.sdt || dt;
    for (const c of [th, ul]) {
      const f = c.foe, hy = c.pos.y + 1.45 * c.size; c.pitch = Math.atan2(this.chest(f).y - hy, Math.max(1.5, this.dist(c, f)));
      c.vel.set(0, 0, 0); c.onGround = true; c.model.root.visible = true; CHARS.animate(c, sdt); c.model.root.visible = true;
    }
    th.model.root.rotation.x = -(th.fall || 0) * (th.fall || 0) * Math.PI / 2; // Thanos topples backwards
  },
  takeGauntlet() {
    const g = this.gem = PROPS.has('item_thanos') ? ITEMS.itemMesh({ kind: 'power', id: 'thanos' }) : new THREE.Mesh(GEO.box, new THREE.MeshBasicMaterial({ color: 0xffc400 }));
    g.scale.multiplyScalar(1.4); GFX.scene.add(g); this.gemFrom = this.chest(this.thanos); this.gemT = this.t;
    this.sfx('shield', 1);
  },
};

// per difficulty: health, damage multiplier, aim error, firing burst / pause, rockets per volley and volley gap
const BOSS_DIFF = {
  easy: { hp: 650, dmg: 0.4, aim: 0.13, burst: 0.8, pause: 2.3, rockets: 1, rocketGap: 11 },
  normal: { hp: 1000, dmg: 0.6, aim: 0.095, burst: 1.0, pause: 1.9, rockets: 2, rocketGap: 9 },
  hard: { hp: 1500, dmg: 0.8, aim: 0.075, burst: 1.3, pause: 1.6, rockets: 3, rocketGap: 8 },
};

const BOSS = {
  diff: BOSS_DIFF.normal,
  units: [],

  outfitOf(id) { return OUTFITS.find(o => o.id === id) || OUTFITS[0]; },
  specialItem() { return { kind: 'weapon', id: 'armcannon', rarity: 5, mag: 9999, special: true }; },
  unitOf(c) { return this.units.find(u => u.c === c); },

  // Called once the world exists: find every lair, stock it, spawn the bosses.
  setup(difficulty, reload, forced, practice) {
    this.diff = BOSS_DIFF[difficulty] || BOSS_DIFF.normal;
    this.units = [];
    this.anywhere = !!reload || !!WORLD.zeph; // (Zephara has no castle or tower either)
    if (!WORLD.pois.length) return;
    // only 1-2 random bosses a match; they turn up once the first storm circle has closed
    // (Reload: all of them, waiting from the start)
    const all = shuffle(Object.keys(BOSS_TYPES).filter(id => !BOSS_TYPES[id].off && !(id === 'thanos' && Date.now() >= SEASON2))); // (Ultron is vaulted in Season 2)
    const ids = forced || (location.hash === '#ultron' && !practice ? ['thanos'] : reload ? all : all.slice(0, Math.random() < 0.5 ? 1 : 2));
    this.taken = new Set();
    for (const id of ids) {
      const T = BOSS_TYPES[id], spot = this.lair(T);
      if (!spot) continue;
      if (spot.poi) this.taken.add(spot.poi);
      const u = { id, T, c: null, home: new THREE.Vector3(spot.x, spot.y, spot.z), poi: spot.poi || null, threat: new Map(), burstT: Math.random() * 2, rocketCd: 5, rocketQueue: 0, rocketT: 0, slamCd: 3, scanT: 0, target: null, wanderT: 0, wanderTo: null };
      if (u.poi) u.poi.boss = id;
      if (spot.stock) this.stock(spot.x, spot.z, spot.stockR || 30);
      u.c = this.spawn(u, spot);
      u.where = spot.poi ? spot.poi.name : 'the wilds';
      u.guards = practice ? [] : BOTS.makeGuards(u, this.diff);
      this.units.push(u);
    }
  },
  // the first storm circle has closed: bosses and their henchmen appear
  arrive() {
    for (const u of this.units) {
      if (!u.c || !u.c.dormant) continue;
      u.c.dormant = false;
      for (const g of u.guards) g.dormant = false;
      FX.explosion(new THREE.Vector3(u.c.pos.x, u.c.pos.y + 1, u.c.pos.z), 3);
    }
    const names = this.units.filter(u => u.c).map(u => `${u.T.name} at ${u.where}`);
    if (names.length) { HUD.banner(names.length > 1 ? 'BOSSES HAVE ARRIVED' : names[0].split(' at ')[0].toUpperCase() + ' HAS ARRIVED', names.join(' · ') + ' · marked on your map'); SFX.play('horn', 0.6); }
  },

  // where each boss lives
  lair(T) {
    if (T.lair === 'compound') {
      const spots = WORLD.pois.filter(p => p.type !== 'avengers' && p.type !== 'latveria' && !this.taken.has(p));
      const p = pick(spots.length ? spots : WORLD.pois);
      const s = WORLD.randomLandPoint(p.x, p.z, 6);
      return { x: s.x, y: WORLD.heightAt(s.x, s.z) + 0.5, z: s.z, poi: p, stock: true, stockR: p.r * 0.65 };
    }
    // Doom, Iron Man and Thanos sometimes set up somewhere else on their side of the island
    const town = (side) => {
      const spots = WORLD.pois.filter(p => p.type !== 'avengers' && p.type !== 'latveria' && !this.taken.has(p) && (!side || p.side === side));
      if (!spots.length) return null;
      const p = pick(spots), s = WORLD.randomLandPoint(p.x, p.z, 6);
      return { x: s.x, y: WORLD.heightAt(s.x, s.z) + 0.5, z: s.z, poi: p, stock: true, stockR: p.r * 0.6 };
    };
    // Reload's island has no castle or tower: everyone sets up in a town
    if (this.anywhere && T.lair !== 'wilds') {
      const t = town(null); if (t) return t;
      const q = WORLD.randomLandPoint(0, 0, WORLD.HALF * 0.6); return { x: q.x, y: WORLD.heightAt(q.x, q.z) + 0.5, z: q.z, stock: true, stockR: 18 };
    }
    if (T.lair === 'throne') {
      const s = WORLD.throneSpot;
      if (!s || Math.random() < 0.4) return town('villain') || (s && { x: s.x, y: s.y + 0.5, z: s.z, poi: WORLD.pois.find(p => p.type === 'latveria') });
      return { x: s.x, y: s.y + 0.5, z: s.z, poi: WORLD.pois.find(p => p.type === 'latveria') };
    }
    if (T.lair === 'tower' && Math.random() < 0.4) { const t = town('hero'); if (t) return t; }
    if (T.lair === 'wilds' && Math.random() < 0.4) { const t = town(null); if (t) return t; }
    if (T.lair === 'tower') {
      const b = WORLD.buildings.find(x => x.prop === 'tower'), poi = WORLD.pois.find(p => p.type === 'avengers');
      if (!b) return null;
      // he guards the foot of the tower: open ground just outside its base
      const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
      for (let t = 0; t < 40; t++) {
        const a = Math.random() * TAU, r = Math.max(b.x1 - b.x0, b.z1 - b.z0) / 2 + rand(5, 12);
        const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r, h = WORLD.heightAt(x, z);
        if (!WORLD.nearBuilding(x, z, 2) && !PHYS.blockedAt(x, z, h, 1.5)) return { x, y: h + 0.5, z, poi };
      }
      return { x: cx + (b.x1 - b.x0) / 2 + 8, y: WORLD.heightAt(cx + (b.x1 - b.x0) / 2 + 8, cz) + 0.5, z: cz, poi };
    }
    // the wilds: open ground away from every named place
    for (let t = 0; t < 200; t++) {
      const x = rand(-WORLD.HALF * 0.75, WORLD.HALF * 0.75), z = rand(-WORLD.HALF * 0.75, WORLD.HALF * 0.75), h = WORLD.heightAt(x, z);
      if (h < 3 || h > 30 || WORLD.nearPOI(x, z, 1.3) || PHYS.blockedAt(x, z, h, 2)) continue;
      WORLD.clearTrees(x, z, 22); // an open arena for him
      return { x, y: h + 0.5, z, stock: true, stockR: 18 };
    }
    // Reload's tiny island may have no open wilds left: set up in any town, or anywhere on land
    if (this.anywhere) { const s = WORLD.randomLandPoint(0, 0, WORLD.HALF * 0.6); return { x: s.x, y: WORLD.heightAt(s.x, s.z) + 0.5, z: s.z, stock: true, stockR: 18 }; }
    return null;
  },

  // a boss's patch is full of loot
  stock(x, z, r) {
    for (let i = 0; i < 6; i++) {
      const q = WORLD.randomLandPoint(x, z, r), h = WORLD.heightAt(q.x, q.z);
      if (!PHYS.blockedAt(q.x, q.z, h, 1.2)) ITEMS.addChest(q.x, h, q.z, Math.random() * TAU);
    }
    for (let i = 0; i < 8; i++) {
      const q = WORLD.randomLandPoint(x, z, r * 1.1), h = WORLD.heightAt(q.x, q.z);
      if (!PHYS.blockedAt(q.x, q.z, h, 0.8)) ITEMS.spawnFloorLoot(q.x, h, q.z);
    }
  },

  spawn(u, spot) {
    const T = u.T, c = CHARS.create({ name: T.name, colors: this.outfitOf(T.outfit) });
    c.isBoss = true; c.bossId = u.id; c.infiniteAmmo = true; c.dormant = true;
    // movement helpers borrowed from the bot AI need this state; 'fight' stops them pickaxing walls
    c.ai = { mode: 'fight', stuckT: 0, lastPos: new THREE.Vector3(), unstuckT: 0, unstuckDir: 0, avoidSide: 1, avoidT: 0 };
    this.giveBody(c, T.outfit, T.size);
    c.hp = c.maxHp = Math.round(this.diff.hp * T.hp);
    c.maxShield = c.shield = Math.round(c.maxHp * 0.15); // regenerates if you stop hitting him (see think)
    c.dmgMult = this.diff.dmg; // scales his weapon, rockets and slam
    c.slots[0] = { kind: 'weapon', id: T.weapon, rarity: 5, mag: 9999, special: true }; c.sel = 0;
    c.pos.set(spot.x, spot.y, spot.z);
    c.state = 'ground';
    CHARS.attachModel(c);
    G.chars.push(c);
    return c;
  },

  // Bigger body, bigger hitbox, the boss's model
  giveBody(c, outfit = 'adam', size = SMASHER.size) {
    c.size = size;
    c.height = 1.85 * size; c.radius = 0.45 + 0.17 * size;
    if (c.model) CHARS.removeModel(c);
    CHARS.buildModel(c, this.outfitOf(outfit), { hi: c.isPlayer || c.isBoss });
    c.model.root.scale.setScalar(size);
    c.heldKey = '';
  },

  onDeath(c, killer) {
    const u = this.unitOf(c);
    if (NET.client) {
      FX.explosion(new THREE.Vector3(c.pos.x, c.pos.y + 1.5, c.pos.z), 4);
      CHARS.removeModel(c); G.chars.splice(G.chars.indexOf(c), 1); if (u) u.c = null;
      HUD.killfeedText(`<b>${esc(c.name)}</b> has fallen${killer && killer !== c ? ' to <b>' + esc(killer.name) + '</b>' : ''}`);
      return;
    }
    // every boss leaves Legendary weapons and shields behind
    ITEMS.spawnPickup(ITEMS.makeWeapon(Math.random() < 0.5 ? 'minigun' : 'quad', 4), c.pos.x, c.pos.y + 1, c.pos.z, true);
    ITEMS.spawnPickup(ITEMS.makeWeapon(pick(['ar', 'handcannon', 'shotgun', 'sniper']), 4), c.pos.x + 1, c.pos.y + 1, c.pos.z, true);
    ITEMS.spawnPickup(ITEMS.makeCons('big', 2), c.pos.x, c.pos.y + 1, c.pos.z + 1, true);
    FX.explosion(new THREE.Vector3(c.pos.x, c.pos.y + 1.5, c.pos.z), 4);
    CHARS.removeModel(c);
    G.chars.splice(G.chars.indexOf(c), 1);
    if (u) u.c = null;
    HUD.killfeedText(`<b>${esc(c.name)}</b> has fallen${killer && killer !== c ? ' to <b>' + esc(killer.name) + '</b>' : ''}`);
    // the boss drops its item (keycard, repulsors, gauntlet, cyberware): whoever picks it up becomes them
    const pid = u && (u.T.become ? 'adam' : u.T.power);
    if (pid) ITEMS.spawnPickup({ kind: 'power', id: pid }, c.pos.x, c.pos.y + 1.2, c.pos.z, true);
  },

  // a 500 HP body that repairs itself (see CHARS.update), auto-aim, the arm guns; stacks with other bosses
  transform(k) { POWERS.grant(k, 'adam'); },

  // damage taken, per attacker (see CHARS.damage)
  onHit(c, attacker, amount) { const u = this.unitOf(c); if (u && attacker && attacker !== c) u.threat.set(attacker, (u.threat.get(attacker) || 0) + amount); },

  // ---------- boss AI ----------
  // the live event: once per player (on or after the event time) in their next match; #ultron previews it
  liveEvent() {
    if (CINE.on || this.eventDone || !G.inMatch() || G.time < 4) return;
    let seen = false; try { seen = localStorage.getItem('unf_ultron_seen') === '1'; } catch (e) {}
    if (location.hash !== '#ultron' && (Date.now() < ULTRON_EVENT || seen)) return;
    this.eventDone = true;
    CINE.start();
  },
  update(dt) {
    for (const u of this.units) if (u.c && u.c.alive && !u.c.dormant) this.think(u, dt);
    this.updateBar();
  },
  // health bar for the nearest boss you're close to
  updateBar() {
    const bar = document.getElementById('bossbar'), pl = G.player;
    if (!bar) return;
    let near = null, nd = 90;
    if (pl && pl.alive && pl.state === 'ground') for (const u of this.units) { if (!u.c || !u.c.alive || u.c.dormant) continue; const d = pl.pos.distanceTo(u.c.pos); if (d < nd) { nd = d; near = u; } }
    bar.hidden = !near;
    if (near) {
      document.getElementById('bossfill').style.width = (near.c.hp / near.c.maxHp * 100) + '%';
      document.getElementById('bossshield').style.width = (near.c.shield / (near.c.maxShield || 1) * 100) + '%';
      const nm = bar.querySelector('.bb-name'); if (nm.textContent !== near.T.name.toUpperCase()) nm.textContent = near.T.name.toUpperCase();
    }
  },

  think(u, dt) {
    const c = u.c, T = u.T;
    if (u.leap) return this.leapStep(u, dt);
    u.slamCd -= dt; u.rocketCd -= dt; u.scanT -= dt; u.wanderT -= dt;
    // shields come back fast once nobody has hurt him for 6 seconds
    if (G.time - (c.lastHitTime || -99) > 10 && c.shield < c.maxShield) c.shield = Math.min(c.maxShield, c.shield + c.maxShield * 0.06 * dt);
    // pick a target: whoever has hurt him most, else the closest visible intruder in his turf
    if (u.scanT <= 0) {
      u.scanT = 0.3;
      let best = null, bd = T.sight;
      for (const o of G.chars) {
        if (o === c || o.isBoss || o.henchman || o.dormant || !o.alive || (o.state !== 'ground' && o.state !== 'glide')) continue;
        if (dist2D(o.pos.x, o.pos.z, u.home.x, u.home.z) > T.turf && dist2D(o.pos.x, o.pos.z, c.pos.x, c.pos.z) > T.turf * 0.6) continue;
        const d = o.pos.distanceTo(c.pos);
        if (d < bd && BOTS.canSee(c, o).see) { bd = d; best = o; }
      }
      let top = null, topThreat = 0;
      for (const [who, v] of u.threat) {
        const nv = v * Math.pow(0.5, 0.3 / 4); // threat halves every 4 s
        if (nv < 1 || !who.alive || who.state === 'bus' || who.pos.distanceTo(c.pos) > Math.max(T.chase, T.sight) || dist2D(who.pos.x, who.pos.z, u.home.x, u.home.z) > T.roam + T.sight) { u.threat.delete(who); continue; }
        u.threat.set(who, nv);
        if (nv > topThreat) { topThreat = nv; top = who; }
      }
      u.target = top || best;
    }
    const t = u.target;
    const awayFromHome = dist2D(c.pos.x, c.pos.z, u.home.x, u.home.z);
    c.sprint = false;
    // bosses never go swimming: if he's in or right next to water, he walks straight back home
    if (WORLD.heightAt(c.pos.x, c.pos.z) < 1.5 || c.inWater) { u.target = null; u.wanderTo = null; BOTS.moveTo(c, u.home.x, u.home.z, dt); return; }
    if (!t || !t.alive) {
      if (T.stationary) { c.moveX = c.moveZ = 0; return; }
      // Thanos strolls around his patch; the others walk back to their post
      if (T.wander) {
        if (!u.wanderTo || u.wanderT <= 0 || dist2D(c.pos.x, c.pos.z, u.wanderTo.x, u.wanderTo.z) < 4) { u.wanderTo = WORLD.randomLandPoint(u.home.x, u.home.z, T.roam * 0.4); u.wanderT = rand(10, 18); }
        if (this.dry(c, u.wanderTo.x, u.wanderTo.z)) BOTS.moveTo(c, u.wanderTo.x, u.wanderTo.z, dt); else { u.wanderTo = null; c.moveX = c.moveZ = 0; }
      } else if (awayFromHome > 5) BOTS.moveTo(c, u.home.x, u.home.z, dt); else c.moveX = c.moveZ = 0;
      return;
    }
    const dx = t.pos.x - c.pos.x, dz = t.pos.z - c.pos.z, d = Math.hypot(dx, dz) || 0.01;
    c.yaw = Math.atan2(-dx, -dz);
    c.pitch = Math.atan2(t.pos.y + 1.2 - (c.pos.y + 1.45 * c.size), d);
    const enraged = c.hp < c.maxHp * 0.4;
    if (T.stationary) c.moveX = c.moveZ = 0;
    else {
      // close in, but never step outside his roaming area (he keeps shooting from the edge)
      const nx = c.pos.x + dx / d * 3, nz = c.pos.z + dz / d * 3;
      const inside = dist2D(nx, nz, u.home.x, u.home.z) < T.roam;
      if (d > (enraged ? 8 : 14) && inside && this.dry(c, t.pos.x, t.pos.z)) { c.sprint = enraged; BOTS.steer(c, dx / d, dz / d, dt, false); }
      else c.moveX = c.moveZ = 0;
    }
    if (T.slam && d < 7.5 && u.slamCd <= 0) { this.slam(c, T.slamPower || 1); u.slamCd = 5; }
    if (this.special(u, t, d, enraged, dt)) return; // Doom and Iron Man fight with their own moves, no guns
    // rocket volleys (Doom's mystic blasts, Thanos's Power Stone, Iron Man's micro-missiles)
    if (u.rocketCd <= 0 && d > 10) { u.rocketQueue = Math.max(1, Math.round((this.diff.rockets + (enraged ? 1 : 0)) * T.rockets)); u.rocketCd = this.diff.rocketGap * (enraged ? 0.6 : 1); u.rocketT = 0; }
    if (u.rocketQueue > 0) {
      u.rocketT -= dt;
      if (u.rocketT <= 0) {
        u.rocketT = 0.3; u.rocketQueue--;
        const o = CHARS.muzzle(c, new THREE.Vector3());
        const dir = new THREE.Vector3(t.pos.x - o.x, t.pos.y + 1 - o.y, t.pos.z - o.z).normalize();
        CHARS.jitter(dir, 0.04, dir);
        FX.rocket(c, o.clone().addScaledVector(dir, 1.2), dir, { id: 'quad', rarity: 4 });
        SFX.play('rocket', 0.9, c.pos);
      }
    }
    // main weapon in bursts (length and pause depend on difficulty); enraged bursts last 40% longer
    u.burstT += dt;
    const D = this.diff, cycle = D.burst + D.pause;
    u.burstT = u.burstT % cycle;
    if (u.burstT < D.burst * (enraged ? 1.4 : 1) && d < T.sight * 1.5) {
      const o = CHARS.muzzle(c, new THREE.Vector3());
      const dir = new THREE.Vector3(t.pos.x - o.x, t.pos.y + 1.1 - o.y, t.pos.z - o.z).normalize();
      CHARS.jitter(dir, this.diff.aim * (T.ultron ? 0.35 : 1) * (1 + Math.hypot(t.vel.x, t.vel.z) / 10), dir); // Ultron barely misses
      CHARS.tryFire(c, dir, o);
    }
  },

  // ---------- signature moves ----------
  // returns true when the boss's own moves replace the gun bursts and rocket volleys
  special(u, t, d, enraged, dt) {
    const c = u.c, k = enraged ? 0.65 : 1, chest = (q) => new THREE.Vector3(q.pos.x, q.pos.y + 1.1, q.pos.z);
    const from = () => CHARS.muzzle(c, new THREE.Vector3());
    const toward = (o, spd, lead) => { const p = chest(t).addScaledVector(t.vel, lead || 0); return p.sub(o).normalize().multiplyScalar(spd); };
    for (const key of ['boltCd', 'bigCd', 'leapCd', 'beamCd', 'misCd', 'laserCd', 'stoneCd']) if (u[key] === undefined) u[key] = 2 + Math.random() * 2; else u[key] -= dt;
    if (u.id === 'doom') {
      // arcane bolts: a fan of three green orbs that curve after you
      if (u.boltCd <= 0) {
        u.boltCd = 1.7 * k; const o = from();
        for (const s of [-1, 0, 1]) { const v = toward(o, 34, 0.25); v.applyAxisAngle(new THREE.Vector3(0, 1, 0), s * 0.12); FX.orb(c, o.clone().addScaledVector(v.clone().normalize(), 1.2), v, { color: 0x3dff6e, size: 0.3, dmg: 20, splash: 2.5, home: t, turn: 0.7 }); }
        SFX.play('laser', 0.8, c.pos); c.swingT = 0.3;
      }
      // Unstable Bolt: a big slow orb that hunts you down and blows up wide
      if (u.bigCd <= 0) { u.bigCd = 8 * k; const o = from(), v = toward(o, 17); FX.orb(c, o.addScaledVector(v.clone().normalize(), 1.5), v, { color: 0x7dff3d, size: 0.85, dmg: 55, splash: 6, home: t, turn: 1.3, life: 7 }); SFX.play('rocket', 1, c.pos); }
      // the leap: jumps at you and ground-pounds where he lands
      if (u.leapCd <= 0 && d > 5 && d < 26) { u.leapCd = 7 * k; u.leap = { t: 0, dur: 1, x0: c.pos.x, z0: c.pos.z, y0: c.pos.y, x1: t.pos.x, z1: t.pos.z, y1: Math.max(WORLD.heightAt(t.pos.x, t.pos.z), t.onGround ? t.pos.y : WORLD.heightAt(t.pos.x, t.pos.z)) + 0.1 }; SFX.play('cannon', 0.6, c.pos); }
      // half health: three Doombots join the fight (once)
      if (!u.botsCalled && c.hp < c.maxHp * 0.5 && !NET.inMatch) { u.botsCalled = true; BOTS.summonDoombots(c); HUD.banner('DOCTOR DOOM', 'Doombots, to me!'); }
      return true;
    }
    if (u.id === 'ironman') {
      // hovers on his thrusters while he fights
      const gy = WORLD.heightAt(c.pos.x, c.pos.z); c.vel.y = (gy + 5 - c.pos.y) * 3; c.onGround = false; c.flying = true;
      if (u.beam) {
        // Unibeam: a chest beam that sweeps after you (it lags behind, so keep moving)
        u.beam.t += dt;
        if (u.beam.t < 0.8) { if (Math.random() < 0.5) FX.sparkle(chest(c).setY(c.pos.y + 1.3 * c.size), 0xffffff); return true; }
        u.beam.dir.lerp(chest(t).sub(from()).normalize(), Math.min(1, dt * 2.2)).normalize();
        u.beam.tick -= dt; if (u.beam.tick <= 0) { u.beam.tick = 0.07; POWERS.beam(c, u.beam.dir, 7, 0xffffff, 'Unibeam'); }
        if (u.beam.t > 2.3) u.beam = null;
        return true;
      }
      if (u.beamCd <= 0 && d < 70) { u.beamCd = 10 * k; u.beam = { t: 0, tick: 0, dir: chest(t).sub(from()).normalize() }; SFX.play('laser', 1, c.pos); return true; }
      // repulsor blasts
      if (u.boltCd <= 0) { u.boltCd = 0.85 * k; const o = from(), v = toward(o, 55, 0.2); FX.orb(c, o.addScaledVector(v.clone().normalize(), 1.2), v, { color: 0x9fe9ff, size: 0.25, dmg: 15, splash: 1.8 }); SFX.play('laser', 0.7, c.pos); }
      // micro-missiles: six homing orbs fanned out of his shoulders
      if (u.misCd <= 0) {
        u.misCd = 9 * k;
        for (let i = 0; i < 6; i++) setTimeout(() => { if (!c.alive || !t.alive) return; const o = from(), v = new THREE.Vector3(rand(-8, 8), 14, rand(-8, 8)).add(toward(o, 18)); FX.orb(c, o, v, { color: 0xffb02e, size: 0.22, dmg: 16, splash: 2.5, home: t, turn: 2.6, life: 5 }); }, i * 110);
        SFX.play('rocket', 0.9, c.pos);
      }
      return true;
    }
    if (u.T.ultron) {
      // Infinity Ultron keeps his guns and rockets and adds the forehead laser and the Power Stone
      if (u.charge) {
        u.charge -= dt; FX.sparkle(new THREE.Vector3(c.pos.x, c.pos.y + 1.75 * c.size, c.pos.z), 0xff2020);
        if (u.charge <= 0) { u.charge = 0; const o = new THREE.Vector3(c.pos.x, c.pos.y + 1.75 * c.size, c.pos.z), dir = chest(t).addScaledVector(t.vel, 0.08).sub(o).normalize();
          const hit = PHYS.raycast(o, dir, 300, { ignore: c }), end = hit ? hit.point : o.clone().addScaledVector(dir, 300);
          FX.tracer(o, end, 0xff2020, true); FX.tracer(o, end, 0xffffff, true); SFX.play('sniper', 1, c.pos);
          if (hit && hit.kind === 'char') CHARS.damage(hit.char, 55 * (c.dmgMult || 1), c, { weapon: 'Forehead Laser' }); else if (hit && hit.kind === 'solid') WORLD.hitSolid(hit.solid, 400, c, false); }
      } else if (u.laserCd <= 0 && d < 120) { u.laserCd = 8 * k; u.charge = 0.9; HUD.killfeedText('<b>Infinity Ultron</b> is charging his forehead laser'); }
      if (u.stoneCd <= 0) { u.stoneCd = 7 * k; const o = from(), v = toward(o, 22); FX.orb(c, o.addScaledVector(v.clone().normalize(), 1.6), v, { color: 0xb04aff, size: 0.9, dmg: 65, splash: 7, home: t, turn: 1, life: 7 }); SFX.play('rocket', 1, c.pos); }
    }
    return false;
  },
  // Doom's leap: an arc onto where you were standing, then a ground pound
  leapStep(u, dt) {
    const c = u.c, L = u.leap; L.t += dt;
    const q = Math.min(1, L.t / L.dur);
    c.pos.x = L.x0 + (L.x1 - L.x0) * q; c.pos.z = L.z0 + (L.z1 - L.z0) * q; c.pos.y = L.y0 + (L.y1 - L.y0) * q + Math.sin(Math.PI * q) * 10;
    c.vel.set(0, 0, 0); c.moveX = c.moveZ = 0; c.onGround = false;
    if (q >= 1) { u.leap = null; c.onGround = true; this.slam(c, 1.3); }
  },

  // is the next few metres toward (x, z) solid ground? (bosses stop at the shoreline instead of wading in)
  dry(c, x, z) {
    const dx = x - c.pos.x, dz = z - c.pos.z, d = Math.hypot(dx, dz) || 1;
    for (const k of [2, 4, 6]) if (WORLD.heightAt(c.pos.x + dx / d * k, c.pos.z + dz / d * k) < 1.5) return false;
    return true;
  },

  slam(c, power) {
    const p = new THREE.Vector3(c.pos.x, c.pos.y + 0.5, c.pos.z);
    FX.explodeAt(p, c, 45 * power, 8 * power, 150);
    // the slam launches everyone nearby up and away from him
    const R = 9 * power;
    for (const o of G.chars) {
      if (o === c || o.isBoss || !o.alive || o.state !== 'ground') continue;
      const dx = o.pos.x - c.pos.x, dz = o.pos.z - c.pos.z, dd = Math.hypot(dx, dz);
      if (dd > R || dd < 0.01) continue;
      const k = 1 - dd / R;
      o.vel.x += dx / dd * 16 * k; o.vel.z += dz / dd * 16 * k; o.vel.y = 8 * k + 3;
      o.onGround = false; o.knockT = 0.7;
    }
    G.shake = Math.max(G.shake, G.player && G.player.pos.distanceTo(p) < 25 ? 0.6 : 0);
  },
};
