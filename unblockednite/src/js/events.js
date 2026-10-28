'use strict';
// ===== Match variety =====
// EXPOSE: like Fortnite's medallions, anyone carrying boss powers shows up on everyone's map. One kit
//   pings a rough area every 10 s; two kits every 5 s and closer; three or more, almost live. Bots
//   nearby start hunting them.
// EVENTS: after the first storm circle closes, 2-3 random events happen at random times: supply drops,
//   a Doom airship crash with a Mythic vault, an elite bot squad, a storm surge, a hidden Mythic chest.
//   The plan comes from the match seed, so every player in a party gets the same events.

const EXPOSE = {
  marks: [], // { c, x, z, r, color, t }
  t: 0,
  reset() { this.marks = []; this.t = 0; },
  update(dt) {
    this.t -= dt;
    for (const c of G.chars) {
      if (!c.pw || !c.alive || c.state === 'dead') { if (c.reveal) c.reveal = null; continue; }
      const k = c.pw.kits.length, every = k >= 3 ? 2 : k === 2 ? 5 : 10, fuzz = k >= 3 ? 4 : k === 2 ? 16 : 35;
      if (!c.reveal || G.time - c.reveal.t > every) {
        const a = Math.random() * TAU, d = Math.random() * fuzz;
        c.reveal = { x: c.pos.x + Math.cos(a) * d, z: c.pos.z + Math.sin(a) * d, r: fuzz + 8, t: G.time, color: POWER_COLORS[c.power] || '#ffd84a' };
        // the host's bots go after whoever is lit up
        if (!NET.client) this.sendHunters(c, k);
      }
    }
  },
  sendHunters(c, k) {
    // a capped pack: 5 hunters for one kit, +2 for each extra kit
    let n = BOTS.list.filter(b => b.ai && b.ai.hunt && b.ai.hunt.c === c && b.alive).length;
    const cap = 5 + 2 * (k - 1);
    for (const b of BOTS.list) {
      if (n >= cap) break;
      if (!b.alive || b.dormant || b.henchman || b === c || !b.ai || (c.team && b.team === c.team)) continue;
      if (b.ai.target || b.pos.distanceTo(c.pos) > 260) continue;
      if (Math.random() < Math.min(0.55, 0.12 * k)) { b.ai.hunt = { c, until: G.time + 30 }; n++; }
    }
  },
  // map pings (minimap and big map), pulsing circles around where each power holder was seen
  draw(g, toPx, scale) {
    for (const c of G.chars) {
      const r = c.reveal;
      if (!r || c === G.player) continue;
      const [x, y] = toPx(r.x, r.z), pulse = 0.5 + 0.5 * Math.sin(G.time * 5);
      g.save();
      g.strokeStyle = r.color; g.lineWidth = 2; g.globalAlpha = 0.5 + 0.4 * pulse;
      g.beginPath(); g.arc(x, y, Math.max(6, r.r * scale), 0, TAU); g.stroke();
      g.fillStyle = r.color; g.globalAlpha = 0.18; g.fill();
      g.globalAlpha = 1; g.fillStyle = r.color; g.beginPath(); g.arc(x, y, 3, 0, TAU); g.fill();
      g.restore();
    }
  },
};
const POWER_COLORS = { doom: '#3dff6e', ironman: '#ffb02e', thanos: '#b04aff', adam: '#ff4a5e' };

const EVENTS = {
  plan: [], marks: [], drops: [], seed: 0,

  // build the match's event list (inside the seeded setup, so every peer gets the same one)
  make(seed) {
    this.seed = seed; this.plan = []; this.marks = []; this.drops = []; this.timers = [];
    // Reload is chaos: events start while the bus is still flying and keep coming every 10-20 s
    // for the whole match (storm surges capped at 2 so the storm doesn't end it in a minute)
    if (G.arena) return; // arena fights are just the fight
    if (G.reload) {
      const kinds = ['supply', 'supply', 'crash', 'elite', 'mythic', 'meteor', 'meteor', 'lootrain', 'lootrain', 'surge'];
      let t = 6, surges = 0, i = 0;
      while (t < 300) {
        let kind = kinds[Math.floor(Math.random() * kinds.length)];
        if (kind === 'surge' && ++surges > 2) kind = 'meteor';
        this.plan.push({ kind, after: t, done: false, i: i++ });
        t += rand(10, 20);
      }
      return;
    }
    const pool = ['supply', 'supply', 'crash', 'elite', 'surge', 'mythic'];
    const n = Math.random() < 0.5 ? 2 : 3;
    let t = 0;
    for (let i = 0; i < n; i++) {
      const kind = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
      t += rand(35, 110);
      this.plan.push({ kind, after: t, done: false, i });
    }
  },
  // events wait for the first storm circle to close; times count from then
  update(dt) {
    ITEMS.quiet = true;
    try { this.step(dt); } finally { ITEMS.quiet = false; }
  },
  step(dt) {
    if ((G.reload || STORM.phase >= 1) && this.start === undefined) this.start = G.time;
    if (this.start === undefined) return;
    for (const e of this.plan) if (!e.done && G.time - this.start >= e.after) { e.done = true; this.fire(e); }
    for (let i = this.timers.length - 1; i >= 0; i--) if (G.time >= this.timers[i].at) { const tm = this.timers.splice(i, 1)[0]; tm.fn(); }
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.obj.position.y = Math.max(d.y, d.obj.position.y - dt * d.speed);
      if (d.spin) d.obj.rotation.y += dt * 0.6;
      if (d.obj.position.y <= d.y + 0.01) { this.drops.splice(i, 1); d.land(); }
    }
    for (let i = this.marks.length - 1; i >= 0; i--) if (this.marks[i].until < G.time) this.marks.splice(i, 1);
  },
  reset() { this.plan = []; this.marks = []; this.drops = []; this.timers = []; this.start = undefined; },
  // the same random numbers on every peer for this event
  rng(e) { return mulberry32((this.seed + 7919 * (e.i + 1)) >>> 0); },
  // a dry, open spot inside the next safe zone
  spot(R, r0 = 0) {
    const Z = STORM.next.r > 30 ? STORM.next : STORM.cur;
    for (let t = 0; t < 80; t++) {
      const a = R() * TAU, d = r0 + Math.sqrt(R()) * Math.max(10, Z.r * 0.8 - r0);
      const x = Z.x + Math.cos(a) * d, z = Z.z + Math.sin(a) * d, h = WORLD.heightAt(x, z);
      if (h > 2 && h < 45 && !WORLD.nearBuilding(x, z, 4) && !PHYS.blockedAt(x, z, h, 2)) return { x, y: h, z };
    }
    return { x: Z.x, y: WORLD.heightAt(Z.x, Z.z), z: Z.z };
  },
  mark(x, z, label, color, secs) { this.marks.push({ x, z, label, color, until: G.time + secs }); },
  announce(title, sub) { HUD.banner(title, sub); SFX.play('horn', 0.5); },
  fire(e) { this['ev_' + e.kind](e, this.rng(e)); },

  // ---- supply drop: a crate floats down under a balloon; the chest inside has top loot ----
  ev_supply(e, R) {
    const p = this.spot(R), g = new THREE.Group();
    const crate = new THREE.Mesh(GEO.box, new THREE.MeshLambertMaterial({ color: 0x2f7bd6, emissive: 0x0a1f40 })); crate.scale.set(1.6, 1.2, 1.6); crate.position.y = 0.6; g.add(crate);
    const band = new THREE.Mesh(GEO.box, new THREE.MeshLambertMaterial({ color: 0xffd84a })); band.scale.set(1.7, 0.2, 1.7); band.position.y = 0.6; g.add(band);
    const balloon = new THREE.Mesh(new THREE.SphereGeometry(1.6, 14, 10), new THREE.MeshLambertMaterial({ color: 0xff4a5e })); balloon.position.y = 5.2; balloon.userData.ownGeo = true; g.add(balloon);
    g.position.set(p.x, p.y + 110, p.z);
    WORLD.group.add(g);
    this.announce('SUPPLY DROP INCOMING', 'Top-tier loot is falling into the safe zone. It is marked on your map.');
    this.mark(p.x, p.z, 'Supply Drop', '#3d9bff', 70);
    const loot = [ITEMS.makeWeapon(pick(['ar', 'smg', 'shotgun'], R), 4), ITEMS.makeWeapon(pick(['sniper', 'handcannon', 'minigun', 'quad'], R), 4), ITEMS.makeCons('big', 2), ITEMS.makeCons('mini', 3), { kind: 'mats', type: 'brick', count: 100 }, { kind: 'ammo', type: 'medium', count: 60 }];
    this.drops.push({ obj: g, y: p.y, speed: 7, spin: true, land: () => {
      WORLD.group.remove(g);
      const ch = ITEMS.addChest(p.x, p.y, p.z, R() * TAU);
      ch.loot = loot; ITEMS.makeGold(ch);
      FX.sparkle(new THREE.Vector3(p.x, p.y + 1, p.z), 0x3d9bff);
    } });
  },

  // ---- one of Doom's airships comes down; the wreck holds a Mythic vault ----
  ev_crash(e, R) {
    const p = this.spot(R, 30);
    const ship = WORLD.airships && WORLD.airships.find((s) => !s.crashing);
    this.announce("DOOM'S AIRSHIP IS GOING DOWN", 'The wreck holds a vault with a Mythic weapon. Get there first.');
    this.mark(p.x, p.z, 'Airship Crash', '#3dff6e', 90);
    const land = () => {
      FX.explodeAt(new THREE.Vector3(p.x, p.y + 1, p.z), null, 0, 12, 400);
      FX.explosion(new THREE.Vector3(p.x, p.y + 2, p.z), 8);
      const ch1 = ITEMS.addChest(p.x + 2, p.y, p.z, 0), ch2 = ITEMS.addChest(p.x - 2, p.y, p.z + 1, Math.PI);
      ch1.loot = [ITEMS.makeWeapon(pick(['ar', 'shotgun', 'smg'], R), 4), ITEMS.makeCons('big', 2), { kind: 'ammo', type: 'shells', count: 20 }];
      ch2.loot = [ITEMS.makeWeapon(pick(['sniper', 'handcannon', 'quad'], R), 4), ITEMS.makeCons('medkit', 1), { kind: 'mats', type: 'metal', count: 80 }];
      ch1.base.material = ch1.lidM.material = ch2.base.material = ch2.lidM.material = MATS.vaultChest;
      ITEMS.spawnPickup({ kind: 'weapon', id: 'arcane', rarity: 5, mag: 9999 }, p.x, p.y + 0.5, p.z - 2, false);
      // smoking wreck
      const wreck = new THREE.Mesh(GEO.round, MATS.airship); wreck.scale.set(2.4, 1.6, 7); wreck.position.set(p.x, p.y + 1, p.z + 6); wreck.rotation.set(0.3, R() * TAU, 0.4);
      WORLD.group.add(wreck);
    };
    if (ship) {
      ship.crashing = true;
      const obj = ship.g; WORLD.airships.splice(WORLD.airships.indexOf(ship), 1);
      obj.position.set(p.x, p.y + 120, p.z);
      this.drops.push({ obj, y: p.y, speed: 22, land: () => { WORLD.group.remove(obj); land(); } });
    } else land();
  },

  // ---- an elite squad of sweaty bots hunts the nearest players ----
  ev_elite(e, R) {
    const p = this.spot(R);
    const pool = BOTS.list.filter((b) => b.alive && !b.dormant && !b.henchman && b.state === 'ground').sort((a, b) => a.nid - b.nid);
    const squad = [];
    while (squad.length < 4 && pool.length) squad.push(pool.splice(Math.floor(R() * pool.length), 1)[0]);
    if (!squad.length) return;
    this.announce('AN ELITE SQUAD HAS DROPPED IN', 'Four sweaty bots with Legendary loot are hunting the closest players.');
    this.mark(p.x, p.z, 'Elite Squad', '#ff8a3d', 45);
    for (const b of squad) {
      b.name = '★ ' + b.name.replace(/^★ /, '');
      if (NET.client) continue; // the host runs bots
      const q = WORLD.randomLandPoint(p.x, p.z, 8);
      b.pos.set(q.x, WORLD.heightAt(q.x, q.z) + 0.5, q.z); b.vel.set(0, 0, 0);
      b.slots[0] = ITEMS.makeWeapon(pick(['ar', 'smg']), 4); b.slots[1] = ITEMS.makeWeapon('shotgun', 4); b.sel = 0;
      b.shield = 100; b.hp = 100; b.mats.brick = 200;
      b.skill.aimErr *= 0.55; b.skill.react *= 0.6; b.skill.build = 0.9; b.skill.sight *= 1.3;
      const humans = G.chars.filter((h) => h.human && h.alive && (!b.team || h.team !== b.team));
      const near = humans.sort((x, y) => x.pos.distanceTo(b.pos) - y.pos.distanceTo(b.pos))[0];
      if (near) b.ai.hunt = { c: near, until: G.time + 120 };
    }
  },

  // ---- the storm surges: the next circle starts closing right away and hurts more ----
  ev_surge() {
    this.announce('STORM SURGE', 'The storm is closing early and hits harder. Move!');
    if (NET.client) return;
    if (STORM.state === 'wait') STORM.timer = Math.min(STORM.timer, 8);
    STORM.dps += 2;
  },

  // ---- a hidden golden chest somewhere with a Mythic inside (no announcement, just a light) ----
  ev_mythic(e, R) {
    const p = this.spot(R);
    const ch = ITEMS.addChest(p.x, p.y, p.z, R() * TAU);
    ch.loot = [{ kind: 'weapon', id: pick(['repulsor', 'gauntlet'], R), rarity: 5, mag: 9999 }, ITEMS.makeCons('big', 1)];
    ch.base.material = ch.lidM.material = MATS.vaultChest;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 120, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd84a, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
    beam.position.set(p.x, p.y + 60, p.z); beam.userData.ownGeo = true;
    WORLD.group.add(beam);
    ch.beam = beam;
    HUD.toast('Something golden is glowing on the island...');
  },

  // ---- (Reload) meteor shower: burning rocks rain on a marked zone for ~15 s ----
  ev_meteor(e, R) {
    const p = this.spot(R);
    this.announce('METEOR SHOWER', 'Rocks are raining down on the marked zone. Get out or get cover!');
    this.mark(p.x, p.z, 'Meteors', '#ff5a2b', 22);
    if (!this._metGeo) { this._metGeo = new THREE.IcosahedronGeometry(1.1, 0); this._metMat = new THREE.MeshLambertMaterial({ color: 0x5a2b1a, emissive: 0xff5a00, emissiveIntensity: 0.9 }); }
    for (let k = 0; k < 26; k++) {
      const a = R() * TAU, d = Math.sqrt(R()) * 24, x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
      this.timers.push({ at: G.time + 3 + k * 0.55, fn: () => {
        const y = WORLD.heightAt(x, z), m = new THREE.Mesh(this._metGeo, this._metMat);
        m.position.set(x, y + 90, z); WORLD.group.add(m);
        this.drops.push({ obj: m, y, speed: 70, land: () => {
          WORLD.group.remove(m);
          FX.explodeAt(new THREE.Vector3(x, y + 0.8, z), null, NET.client ? 0 : 38, 5.5, 160);
        } });
      } });
    }
  },
  // ---- (Reload) loot rain: a burst of Epic and Legendary guns and heals falls on one spot ----
  ev_lootrain(e, R) {
    const p = this.spot(R);
    this.announce('LOOT RAIN', 'Epic and Legendary loot is falling from the sky at the marked spot!');
    this.mark(p.x, p.z, 'Loot Rain', '#ffd84a', 40);
    const guns = ['ar', 'shotgun', 'smg', 'sniper', 'handcannon', 'minigun', 'quad', 'rocket'];
    for (let k = 0; k < 14; k++) {
      const a = R() * TAU, d = R() * 6, x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
      const item = k % 4 === 3 ? ITEMS.makeCons(pick(['big', 'mini', 'medkit'], R)) : ITEMS.makeWeapon(pick(guns, R), R() < 0.55 ? 4 : 3);
      this.timers.push({ at: G.time + k * 0.25, fn: () => ITEMS.spawnPickup(item, x, WORLD.heightAt(x, z) + 30, z, true) });
    }
  },

  // event markers on the maps
  draw(g, toPx) {
    for (const m of this.marks) {
      const [x, y] = toPx(m.x, m.z);
      g.save();
      g.fillStyle = m.color; g.strokeStyle = '#fff'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x, y - 9); g.lineTo(x + 7, y); g.lineTo(x, y + 9); g.lineTo(x - 7, y); g.closePath(); g.fill(); g.stroke();
      g.restore();
    }
  },
};
