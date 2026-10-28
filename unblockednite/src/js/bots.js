'use strict';
// ===== Bot AI: drop, loot, rotate with the storm, fight, build, heal =====
const DIFF = {
  // Easy is for friends on Chromebooks; Normal is the old Easy, Hard is the old Normal
  easy: { aimErr: 0.16, react: 1.5, turn: 3, build: 0.05, sight: 60 },
  normal: { aimErr: 0.1, react: 1.0, turn: 4, build: 0.15, sight: 75 },
  hard: { aimErr: 0.064, react: 0.6, turn: 7, build: 0.35, sight: 95 },
};
const EFF_RANGE = { shotgun: 22, smg: 55, ar: 130, pistol: 60, sniper: 320, rocket: 110, pickaxe: 2.6, minigun: 70, handcannon: 120, quad: 100, frag: 0, armcannon: 150, laser: 220, bosscannon: 150, arcane: 160, repulsor: 170, gauntlet: 150, beam_doom: 150, beam_thanos: 150, beam_iron: 200 };
const PREF_DIST_EXTRA = { minigun: 16, handcannon: 22, quad: 30, frag: 15, armcannon: 20, laser: 35, bosscannon: 20 };
const PREF_DIST = { shotgun: 5, smg: 12, ar: 24, pistol: 14, sniper: 65, rocket: 30, pickaxe: 1.4 };

const MARVEL_NAMES = {
  hero: ['Iron Man', 'Captain America', 'Thor', 'Hulk', 'Black Widow', 'Hawkeye', 'Black Panther', 'Doctor Strange', 'Scarlet Witch', 'Vision', 'Falcon', 'Ant-Man', 'Wasp', 'Captain Marvel', 'Star-Lord', 'Gamora', 'Rocket', 'Groot', 'Drax', 'Wolverine', 'Storm', 'Cyclops', 'Daredevil', 'Ms. Marvel', 'Shang-Chi', 'Moon Knight', 'She-Hulk', 'Winter Soldier', 'War Machine', 'Mister Fantastic'],
  villain: ['Thanos', 'Ultron', 'Red Skull', 'Green Goblin', 'Venom', 'Carnage', 'Magneto', 'Mysterio', 'Kingpin', 'Hela', 'Dormammu', 'Kang', 'Doctor Octopus', 'Vulture', 'Electro', 'Sandman', 'Rhino', 'Mystique', 'Sabretooth', 'Juggernaut', 'Killmonger', 'Taskmaster', 'Crossbones', 'Bullseye', 'Ronan', 'Abomination', 'Baron Zemo', 'Apocalypse', 'MODOK'],
};
// henchmen per boss: name and the skin they wear
const HENCHMEN = {
  adam: { name: 'Arasaka Guard', outfit: 'v1' }, doom: { name: 'Doombot', outfit: 'doom' },
  thanos: { name: 'Outrider', outfit: 'v1' }, ironman: { name: 'Iron Legion', outfit: 'ironman' },
};
const BOTS = {
  list: [],
  // Doom (a player who picked up his keycard) calls in 3 Doombots that follow and fight for him
  summonDoombots(owner) {
    const base = DIFF[SETTINGS.difficulty] || DIFF.normal, out = [];
    for (let i = 0; i < 3; i++) {
      const c = CHARS.create({ name: 'Doombot', colors: OUTFITS.find(o => o.id === 'doom') });
      c.owner = owner; c.team = owner.team; c.state = 'ground'; c.henchman = true; // not a player: never counts toward players left
      const a = (i / 3) * TAU, x = owner.pos.x + Math.cos(a) * 3, z = owner.pos.z + Math.sin(a) * 3;
      c.pos.set(x, Math.max(owner.pos.y, WORLD.heightAt(x, z)) + 0.5, z);
      c.skill = { aimErr: base.aimErr * 0.8, react: base.react * 0.8, turn: base.turn, build: 0, sight: 60 };
      c.ai = {
        mode: 'wander', think: rand(0, 0.4), target: null, lastSeen: -99, lastSeenPos: new THREE.Vector3(), sees: false,
        dest: null, loot: null, strafe: 1, strafeT: 0, stuckT: 0, lastPos: new THREE.Vector3(), unstuckT: 0, unstuckDir: 0,
        avoidSide: 1, avoidT: 0, buildCd: 0, reactT: 0, jumpTime: 0, landing: { x, z }, harvest: null, harvestT: 0, aggression: 1.3,
        guard: { x: owner.pos.x, z: owner.pos.z, r: 8 }, landT: 0,
      };
      c.slots[0] = ITEMS.makeWeapon('ar', 3); c.slots[1] = ITEMS.makeWeapon('shotgun', 2); c.sel = 0; c.shield = 50;
      CHARS.attachModel(c);
      FX.explosion(new THREE.Vector3(x, c.pos.y + 1, z), 1.5);
      G.chars.push(c); this.list.push(c); out.push(c);
    }
    return out;
  },
  // a boss's henchmen: already on the ground at the lair, they guard it and never wander off
  makeGuards(u, diff) {
    const H = HENCHMEN[u.id], base = DIFF[SETTINGS.difficulty] || DIFF.normal, out = [];
    if (!H) return out;
    const n = 3 + (diff === BOSS_DIFF.hard ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const c = CHARS.create({ name: H.name + ' ' + (i + 1), colors: OUTFITS.find(o => o.id === H.outfit) });
      c.henchman = true; c.dormant = true; c.state = 'ground';
      const a = (i / n) * TAU + Math.random() * 0.5, r = rand(6, 12);
      const x = u.home.x + Math.cos(a) * r, z = u.home.z + Math.sin(a) * r;
      c.pos.set(x, Math.max(u.home.y - 0.5, WORLD.heightAt(x, z)) + 0.5, z);
      c.skill = { aimErr: base.aimErr * 0.9, react: base.react * 0.8, turn: base.turn, build: 0, sight: 60 };
      c.ai = {
        mode: 'wander', think: rand(0, 0.4), target: null, lastSeen: -99, lastSeenPos: new THREE.Vector3(), sees: false,
        dest: null, loot: null, strafe: 1, strafeT: 0, stuckT: 0, lastPos: new THREE.Vector3(), unstuckT: 0, unstuckDir: 0,
        avoidSide: 1, avoidT: 0, buildCd: 0, reactT: 0, jumpTime: 0, landing: { x, z }, harvest: null, harvestT: 0, aggression: 1.3,
        guard: { x: u.home.x, z: u.home.z, r: 16 }, landT: 0,
      };
      c.slots[0] = ITEMS.makeWeapon(pick(['ar', 'smg']), 2 + Math.floor(Math.random() * 2)); c.slots[1] = ITEMS.makeWeapon('shotgun', 2); c.sel = 0;
      c.shield = 50;
      CHARS.attachModel(c);
      G.chars.push(c); this.list.push(c); out.push(c);
    }
    return out;
  },
  // The Raft's inmates: sweaty villain bots (in villain skins) that guard the prison, carry legendary guns
  // (dropped when they go down) and don't count as players left.
  makeInmates(p) {
    if (!p.inmateSpots || !p.inmateSpots.length) return [];
    const base = DIFF.hard, out = [], spots = shuffle(p.inmateSpots.slice()), looks = ['doom', 'venom', 'thanos', 'v1'].map((id) => OUTFITS.find((o) => o.id === id)).filter(Boolean);
    const kits = [['ar', 'shotgun'], ['smg', 'shotgun'], ['ar', 'pistol'], ['shotgun', 'smg']];
    for (let i = 0; i < Math.min(8, spots.length); i++) {
      const s = spots[i], c = CHARS.create({ name: 'Inmate ' + (i + 1), colors: looks[i % looks.length] });
      c.henchman = true; c.inmate = true; c.state = 'ground'; c.team = 'inmates';
      c.pos.set(s.x, s.y + 0.4, s.z);
      c.skill = { aimErr: base.aimErr, react: base.react, turn: base.turn, build: 0, sight: 55 };
      c.ai = {
        mode: 'wander', think: rand(0, 0.4), target: null, lastSeen: -99, lastSeenPos: new THREE.Vector3(), sees: false,
        dest: null, loot: null, strafe: 1, strafeT: 0, stuckT: 0, lastPos: new THREE.Vector3(), unstuckT: 0, unstuckDir: 0,
        avoidSide: 1, avoidT: 0, buildCd: 0, reactT: 0, jumpTime: 0, landing: { x: s.x, z: s.z }, harvest: null, harvestT: 0, aggression: 1.5,
        guard: { x: p.x, z: p.z, r: 26 }, landT: 0,
      };
      const k = kits[i % kits.length];
      c.slots[0] = ITEMS.makeWeapon(k[0], 4); c.slots[1] = ITEMS.makeWeapon(k[1], 4); c.sel = 0;
      c.shield = 100;
      CHARS.attachModel(c);
      G.chars.push(c); this.list.push(c); out.push(c);
    }
    return out;
  },
  // team: the player's side in Heroes vs Villains (bots split so both sides end up the same size)
  create(n, diffName, team) {
    this.list = [];
    const base = DIFF[diffName || SETTINGS.difficulty] || DIFF.normal;
    const used = {};
    for (let i = 0; i < n; i++) {
      let c;
      if (team) {
        const side = i < Math.floor(n / 2) ? team : team === 'hero' ? 'villain' : 'hero';
        const skins = OUTFITS.filter(o => o.marvel && !o.hidden && o.side === side && (!SKINS.ready || SKINS.defs[o.model]));
        const skin = skins.length ? skins[i % skins.length] : undefined;
        // names never belong to a different playable character than the skin the bot wears
        const taken = OUTFITS.filter(o => o.marvel).map(o => o.name);
        const pool = MARVEL_NAMES[side].filter(n => !taken.includes(n));
        let nm = pool[(i < Math.floor(n / 2) ? i : i - Math.floor(n / 2)) % pool.length];
        used[nm] = (used[nm] || 0) + 1;
        if (used[nm] > 1) nm += ' ' + ['', '', 'II', 'III', 'IV', 'V'][Math.min(5, used[nm])];
        c = CHARS.create({ name: nm, colors: skin });
        c.team = side;
      } else c = CHARS.create({ name: botName() });
      const v = rand(0.75, 1.3);
      c.skill = { aimErr: base.aimErr * v, react: base.react * v, turn: base.turn / v, build: base.build / v, sight: base.sight };
      c.ai = {
        mode: 'drop', think: rand(0, 0.4), target: null, lastSeen: -99, lastSeenPos: new THREE.Vector3(), sees: false,
        dest: null, loot: null, strafe: 1, strafeT: 0, stuckT: 0, lastPos: new THREE.Vector3(), unstuckT: 0, unstuckDir: 0,
        avoidSide: Math.random() < 0.5 ? 1 : -1, avoidT: 0, buildCd: 0, reactT: 0, jumpTime: 5, landing: { x: 0, z: 0 },
        harvest: null, harvestT: 0, aggression: rand(0.6, 1.4),
      };
      CHARS.attachModel(c);
      this.list.push(c);
    }
    return this.list;
  },

  planDrops() {
    for (const c of this.list) {
      let p;
      const side = c.team === 'hero' || c.team === 'villain' ? c.team : null; // Heroes vs Villains: drop on your half
      const home = side && Math.random() < 0.8 ? WORLD.pois.filter(q => q.side === side) : WORLD.pois;
      if (Math.random() < 0.5 && home.length) {
        const poi = pick(home);
        p = WORLD.randomLandPoint(poi.x, poi.z, poi.r * 0.7);
      } else {
        const sx = side && Math.random() < 0.8 ? (side === 'hero' ? -1 : 1) : (Math.random() < 0.5 ? -1 : 1);
        p = WORLD.randomLandPoint(sx * rand(40, WORLD.HALF * 0.65), rand(-WORLD.HALF * 0.65, WORLD.HALF * 0.65), 160);
      }
      c.ai.landing = p;
      const s = (p.x - BUS.start.x) * BUS.dir.x + (p.z - BUS.start.z) * BUS.dir.z;
      c.ai.jumpTime = clamp(s / BUS.speed - rand(0, 2.5), 1 + Math.random() * 2, BUS.duration - 1);
      // squadmates jump with their leader and land beside them
      const L = c.squadLead;
      if (L && L !== c && L.ai.landing) { c.ai.landing = { x: L.ai.landing.x + rand(-6, 6), z: L.ai.landing.z + rand(-6, 6) }; c.ai.jumpTime = L.ai.jumpTime + rand(0, 0.6); }
    }
  },

  onDamaged(c, attacker) {
    if (!c.alive || !attacker || attacker === c || !attacker.alive) return;
    const ai = c.ai;
    if (!ai.target || !ai.target.alive || Math.random() < 0.6) {
      if (ai.target !== attacker) ai.reactT = c.skill.react * 0.5;
      ai.target = attacker;
    }
    ai.lastSeen = G.time; ai.lastSeenPos.copy(attacker.pos);
    if (!G.zeroBuild && ai.buildCd <= 0 && c.state === 'ground' && Math.random() < c.skill.build && BUILD.pickMat(c)) {
      const yaw = c.yaw, pitch = c.pitch;
      c.yaw = Math.atan2(-(attacker.pos.x - c.pos.x), -(attacker.pos.z - c.pos.z)); c.pitch = 0;
      BUILD.place(c, attacker.pos.y > c.pos.y + 3 && Math.random() < 0.6 ? 'ramp' : 'wall');
      c.yaw = yaw; c.pitch = pitch;
      ai.buildCd = rand(1.5, 3.5);
    }
  },

  canSee(c, t) {
    if (t.invisUntil > G.time || t.mindUntil > G.time) return { see: false, blocker: null }; // Reality / Mind Stone
    const o = new THREE.Vector3(c.pos.x, c.pos.y + 1.5 * (c.size || 1), c.pos.z); // eyes sit higher on a big body
    const d = new THREE.Vector3(t.pos.x, t.pos.y + 1.2, t.pos.z).sub(o);
    const len = d.length(); d.divideScalar(len);
    const hit = PHYS.raycast(o, d, len, { chars: false });
    if (!hit) return { see: true, blocker: null };
    return { see: false, blocker: hit.kind === 'solid' && hit.solid.destructible && hit.t > len - 12 ? hit.solid : null };
  },

  update(dt) {
    for (const c of this.list) {
      if (c.owner && c.ai.guard) { if (!c.owner.alive || c.owner.power !== 'doom') { c.hp = 0; CHARS.damage(c, 999, null); } else { c.ai.guard.x = c.owner.pos.x; c.ai.guard.z = c.owner.pos.z; } }
      if (!c.alive || c.dormant) continue;
      const ai = c.ai;
      if (c.state === 'bus') { if (BUS.t >= ai.jumpTime) BUS.eject(c); continue; }
      if (c.state === 'fall' || c.state === 'glide') {
        const dx = ai.landing.x - c.pos.x, dz = ai.landing.z - c.pos.z, d = Math.hypot(dx, dz);
        if (d > 4) { c.moveX = dx / d; c.moveZ = dz / d; c.yaw = Math.atan2(-dx, -dz); } else { c.moveX = c.moveZ = 0; }
        const agl = c.pos.y - WORLD.heightAt(c.pos.x, c.pos.z);
        c.pitch = d < agl * 0.55 ? -0.9 : 0;
        continue;
      }
      if (ai.landT === undefined) ai.landT = G.time;
      if (c.emote) {
        c.emote.t += dt; c.moveX = c.moveZ = 0; c.wantJump = false;
        if (c.emote.t < (c.emote.until || 3)) continue;
        CHARS.stopEmote(c);
      }
      ai.think -= dt; ai.buildCd -= dt; ai.reactT -= dt; ai.strafeT -= dt; ai.avoidT -= dt; ai.unstuckT -= dt;
      if (ai.think <= 0) { ai.think = rand(0.22, 0.38); this.think(c); }
      this.act(c, dt);
    }
  },

  think(c) {
    const ai = c.ai;
    if (ai.target && (!ai.target.alive || ai.target.state === 'bus')) ai.target = null;
    // perception
    const hasLong = c.slots.some(s => s && s.kind === 'weapon' && (s.id === 'sniper' || s.id === 'ar'));
    const armed = c.slots.some(s => s && s.kind === 'weapon');
    const sight = armed ? c.skill.sight * (hasLong ? 1.35 : 1) : 14;
    let best = null, bd = sight;
    for (const o of G.chars) {
      if (o === c || !o.alive || o.dormant || o.state === 'bus' || o.state === 'fall') continue;
      if (c.team && o.team === c.team) continue;
      if (c.henchman && o.henchman) continue; // henchmen stick together
      if ((c.owner || c) === (o.owner || o)) continue; // summoned Doombots never turn on their Doom
      // guards only notice people who come near their boss's lair
      if (ai.guard && dist2D(o.pos.x, o.pos.z, ai.guard.x, ai.guard.z) > ai.guard.r + 35) continue;
      if (o.isBoss && ai.target !== o) continue;
      const d = c.pos.distanceTo(o.pos);
      const maxD = o.human ? sight : Math.min(sight, 45);
      if (d < bd && d < Math.max(maxD, 14)) {
        const heard = G.time - o.lastShotT < 0.8 && d < (o.human ? 70 : 40);
        if (heard || d < maxD) { bd = d; best = o; }
      }
    }
    if (best && G.time - ai.landT < 20 && bd > 20) best = null;
    if (best && best !== ai.target && !best.human && G.time < (ai.calmUntil || 0) && bd > 12) best = null;
    if (best && best !== ai.target && !ai.target && G.time >= (ai.calmUntil || 0) && bd > 15 && Math.random() > (best.human ? 0.45 : 0.22) * ai.aggression) {
      ai.calmUntil = G.time + rand(5, 10); best = null;
    }
    if (best && best !== ai.target) {
      const v = this.canSee(c, best);
      const heard = G.time - best.lastShotT < 0.8 && bd < 70;
      if (v.see || heard) {
        if (!ai.target || bd < c.pos.distanceTo(ai.target.pos) * 0.6 || G.time - ai.lastSeen > 2) {
          ai.target = best; ai.reactT = c.skill.react * (best.human ? 1.6 : 1); ai.lastSeen = G.time; ai.lastSeenPos.copy(best.pos);
        }
      }
    }
    ai.sees = false; ai.blocker = null;
    if (ai.target) {
      const v = this.canSee(c, ai.target);
      ai.sees = v.see; ai.blocker = v.blocker;
      if (v.see) { ai.lastSeen = G.time; ai.lastSeenPos.copy(ai.target.pos); }
      if (G.time - ai.lastSeen > 7 || c.pos.distanceTo(ai.target.pos) > 260) ai.target = null;
    }
    // mode
    const inStorm = !STORM.isSafe(c.pos.x, c.pos.z, -8);
    const healItem = this.findHeal(c);
    const tDist = ai.target ? c.pos.distanceTo(ai.target.pos) : Infinity;
    if (ai.target && !armed && tDist > 16 && G.time - c.lastHitTime > 3) ai.target = null;
    const lootFirst = !armed && !(ai.target && tDist < 5 && G.time - c.lastHitTime < 3) && !(inStorm && STORM.dps > 2) && this.pickLoot(c);
    if (ai.target && !lootFirst && !(inStorm && !ai.sees && G.time - ai.lastSeen > 2)) ai.mode = 'fight';
    else if (!lootFirst && (inStorm || (STORM.shrinking() && !STORM.isSafeNext(c.pos.x, c.pos.z, -10)))) ai.mode = 'storm';
    else if (healItem >= 0 && (c.hp < 70 || c.shield < 50) && !ai.target) ai.mode = 'heal';
    else if (lootFirst || this.pickLoot(c)) ai.mode = 'loot';
    else ai.mode = 'wander';

    if (ai.mode === 'fight' && c.hp + c.shield < 45 && G.time > (ai.fleeUntil || 0) + 6 && Math.random() < 0.5) ai.fleeUntil = G.time + rand(3, 6);
    if (ai.mode === 'fight' && G.time < (ai.fleeUntil || 0)) ai.mode = 'flee';
    if (ai.mode === 'fight') this.chooseWeapon(c, c.pos.distanceTo(ai.target.pos));
    else if (ai.mode === 'heal') { if (c.sel !== healItem) CHARS.equip(c, healItem); if (!c.using) CHARS.startUse(c); }
    else {
      const it = CHARS.currentItem(c);
      if (it && it.kind === 'weapon' && it.id !== 'pickaxe' && it.mag < WEAPONS[it.id].mag * 0.5) CHARS.startReload(c);
      if (ai.mode !== 'wander' || !ai.harvest) { const w = this.bestWeaponSlot(c, 25); if (w >= 0 && c.sel !== w && !c.reloading) CHARS.equip(c, w); }
    }
    // henchmen hold their post; hunters walk toward whoever they're after (map pings, elite squads)
    if (ai.guard && ai.mode !== 'fight' && ai.mode !== 'heal' && ai.mode !== 'flee') {
      ai.mode = 'wander';
      if (!ai.dest || dist2D(ai.dest.x, ai.dest.z, c.pos.x, c.pos.z) < 3 || Math.random() < 0.02) { const a = Math.random() * TAU, r = Math.random() * ai.guard.r; ai.dest = { x: ai.guard.x + Math.cos(a) * r, z: ai.guard.z + Math.sin(a) * r }; }
      ai.harvest = null;
      return;
    }
    // squad bots don't stray: once they're far from their leader they head back to them
    const lead = c.squadLead;
    if (lead && lead !== c && lead.alive && !ai.target && (ai.mode === 'wander' || ai.mode === 'loot') && c.pos.distanceTo(lead.pos) > 28) {
      ai.mode = 'wander'; ai.dest = { x: lead.pos.x + rand(-5, 5), z: lead.pos.z + rand(-5, 5) }; ai.harvest = null;
      return;
    }
    // ...and help a squadmate who's in a fight
    if (lead && !ai.target) for (const m of this.list) if (m !== c && m.alive && m.team === c.team && m.ai.target && m.ai.target.alive && m.pos.distanceTo(c.pos) < 40) { ai.target = m.ai.target; ai.reactT = c.skill.react; ai.lastSeen = G.time; ai.lastSeenPos.copy(m.ai.target.pos); break; }
    if (ai.hunt && (!ai.hunt.c.alive || G.time > ai.hunt.until)) ai.hunt = null;
    if (ai.hunt && !ai.target && (ai.mode === 'wander' || ai.mode === 'loot')) {
      const h = ai.hunt.c, p = h.reveal || h.pos;
      ai.mode = 'wander'; ai.dest = { x: p.x, z: p.z }; ai.harvest = null;
      return;
    }
    if (ai.mode === 'storm') {
      const z = STORM.isSafe(c.pos.x, c.pos.z, -8) ? STORM.next : STORM.cur;
      if (!ai.dest || !STORM.inCircle(ai.dest.x, ai.dest.z, z, -10)) {
        const r = z.r * 0.5;
        ai.dest = WORLD.randomLandPoint(z.x, z.z, Math.max(5, r));
      }
    }
    if (ai.mode === 'wander') {
      if (!ai.dest || dist2D(ai.dest.x, ai.dest.z, c.pos.x, c.pos.z) < 4 || Math.random() < 0.01) {
        const z = STORM.shrinking() ? STORM.next : STORM.cur;
        const a = Math.random() * TAU, d = rand(30, 110);
        let x = c.pos.x + Math.cos(a) * d, zz = c.pos.z + Math.sin(a) * d;
        if (!STORM.inCircle(x, zz, z, -15)) { const p = WORLD.randomLandPoint(z.x, z.z, z.r * 0.6); x = p.x; zz = p.z; }
        ai.dest = { x, z: zz };
      }
      if (!ai.harvest && c.mats.wood + c.mats.brick < 60 && Math.random() < 0.08) {
        const arr = PHYS.query(c.pos.x - 20, c.pos.z - 20, c.pos.x + 20, c.pos.z + 20, []);
        ai.harvest = arr.find(s => s.kind === 'tree' && s.alive) || null;
        ai.harvestT = 6;
      }
    }
  },

  findHeal(c) {
    for (let i = 0; i < 5; i++) {
      const s = c.slots[i];
      if (!s || s.kind !== 'cons') continue;
      const C = CONSUMABLES[s.id];
      if (C.heal && c.hp < C.cap) return i;
      if (C.shield && c.shield < C.cap) return i;
    }
    return -1;
  },
  bestWeaponSlot(c, dist) {
    let best = -1, bs = -1;
    for (let i = 0; i < c.slots.length; i++) {
      const s = c.slots[i];
      if (!s || s.kind !== 'weapon' || WEAPONS[s.id].throwable) continue;
      const pd = PREF_DIST[s.id] || PREF_DIST_EXTRA[s.id] || 20;
      let score = WEAPONS[s.id].score + s.rarity * 6 - Math.abs(Math.log((dist + 3) / (pd + 3))) * 25;
      if (s.id === 'rocket' && (dist < 8 || Math.random() < 0.6)) score -= 40;
      if (s.id === 'sniper' && dist < 25) score -= 40;
      if (s.id === 'shotgun' && dist > 25) score -= 40;
      if (s.mag === 0 && s.id !== 'pickaxe') score -= 15;
      if (score > bs) { bs = score; best = i; }
    }
    return best;
  },
  chooseWeapon(c, dist) {
    const i = this.bestWeaponSlot(c, dist);
    if (i !== c.sel && !(c.reloading && Math.random() < 0.7)) CHARS.equip(c, i);
    c.ads = CHARS.currentItem(c) && CHARS.currentItem(c).id === 'sniper' && dist > 30;
  },
  pickLoot(c) {
    const ai = c.ai;
    if (!ai.skip) ai.skip = new Set();
    if (ai.loot && !ai.loot.dead && !(ai.loot.opened)) {
      if (G.time - ai.lootStart > 25) { ai.skip.add(ai.loot); ai.loot = null; }
      else if (dist2D(ai.loot.pos.x, ai.loot.pos.z, c.pos.x, c.pos.z) < 160 && Math.abs(ai.loot.pos.y - c.pos.y) < 2.6) return true;
    }
    ai.loot = null;
    const weapons = c.slots.filter(s => s && s.kind === 'weapon').length;
    const cons = c.slots.filter(s => s && s.kind === 'cons').length;
    const full = c.slots.every(s => s);
    if (weapons >= 3 && cons >= 1 && Math.random() < 0.7) return false;
    const reach = (q) => Math.abs(q.pos.y - c.pos.y) < 2.6 && !ai.skip.has(q);
    const take = (q) => { ai.loot = q; ai.lootStart = G.time; return true; };
    const range = weapons ? 1 : 2.5;
    const ch = ITEMS.nearestChest(c.pos, 60 * range, reach);
    const worst = Math.min(...c.slots.map(s => (s && s.kind === 'weapon' ? ITEMS.weaponScore(s) : s ? 999 : 0)));
    const p = ITEMS.nearestPickup(c.pos, 40 * range, q => reach(q) && ((q.item.kind === 'weapon' && ITEMS.weaponScore(q.item) > worst + 5) || (q.item.kind === 'cons' && !full && weapons > 0)));
    if (p && (!ch || full || p.pos.distanceTo(c.pos) < ch.pos.distanceTo(c.pos) + 15)) return take(p);
    if (ch && !full) return take(ch);
    if (p) return take(p);
    if (ch) return take(ch);
    return false;
  },

  // ---------- actions ----------
  act(c, dt) {
    const ai = c.ai;
    c.sprint = ai.mode !== 'fight';
    if (ai.mode === 'fight' && ai.target) return this.fight(c, dt);
    c.ads = false;
    if (ai.mode === 'flee' && ai.target) {
      const fx = c.pos.x - ai.target.pos.x, fz = c.pos.z - ai.target.pos.z, fl = Math.hypot(fx, fz) || 1;
      let mx = fx / fl, mz = fz / fl;
      if (!STORM.isSafe(c.pos.x + mx * 10, c.pos.z + mz * 10, -5)) { mx = -mz; mz = fx / fl; }
      if (Math.random() < 0.02) c.wantJump = true;
      this.steer(c, mx, mz, dt, true);
      return;
    }
    if (ai.mode === 'heal') { c.moveX = c.moveZ = 0; return; }
    if (ai.mode === 'loot' && ai.loot) {
      const L = ai.loot;
      this.moveTo(c, L.pos.x, L.pos.z, dt);
      if (dist2D(L.pos.x, L.pos.z, c.pos.x, c.pos.z) < 2.5 && Math.abs(L.pos.y - c.pos.y) < 2.2) {
        if (L.solid) ITEMS.openChest(L, c);
        else this.takePickup(c, L);
        ai.loot = null; ai.think = 0.15;
      }
      return;
    }
    if (ai.mode === 'wander' && ai.harvest && ai.harvest.alive && ai.harvestT > 0) {
      ai.harvestT -= dt;
      const s = ai.harvest, d = dist2D(s.x, s.z, c.pos.x, c.pos.z);
      if (d > s.r + 1.6) this.moveTo(c, s.x, s.z, dt);
      else {
        c.moveX = c.moveZ = 0;
        if (c.sel !== -1) CHARS.equip(c, -1);
        this.faceToward(c, s.x, c.pos.y + 1.2, s.z, dt);
        CHARS.tryFire(c, this.aimDir(c, s.x, c.pos.y + 1.2, s.z), null);
      }
      return;
    }
    ai.harvest = null;
    if (ai.dest) this.moveTo(c, ai.dest.x, ai.dest.z, dt);
    else c.moveX = c.moveZ = 0;
  },

  takePickup(c, p) {
    if (p.dead) return;
    const it = p.item;
    if (it.kind === 'ammo' || it.kind === 'mats' || CHARS.give(c, it)) { if (it.kind === 'ammo' || it.kind === 'mats') CHARS.give(c, it); ITEMS.removePickup(p); return; }
    if (it.kind === 'weapon') {
      let wi = -1, ws = 1e9;
      c.slots.forEach((s, i) => { if (s && s.kind === 'weapon' && ITEMS.weaponScore(s) < ws) { ws = ITEMS.weaponScore(s); wi = i; } });
      if (wi >= 0 && ITEMS.weaponScore(it) > ws) { c.sel = wi; CHARS.pickup(c, p); }
    }
  },

  fight(c, dt) {
    const ai = c.ai, t = ai.target;
    const tp = ai.sees ? t.pos : ai.lastSeenPos;
    const dx = tp.x - c.pos.x, dz = tp.z - c.pos.z, dist = Math.hypot(dx, dz) || 0.01;
    const item = CHARS.currentItem(c);
    const id = item && item.kind === 'weapon' ? item.id : 'pickaxe';
    const pref = (PREF_DIST[id] || PREF_DIST_EXTRA[id] || 20) / ai.aggression;
    // movement: approach / retreat + strafe
    let mx = 0, mz = 0;
    const ux = dx / dist, uz = dz / dist;
    if (!ai.sees) { mx = ux; mz = uz; }
    else if (dist > pref + (id === 'pickaxe' ? 0.3 : 6)) { mx = ux; mz = uz; }
    else if (dist < pref - 4 && id !== 'pickaxe') { mx = -ux * 0.7; mz = -uz * 0.7; }
    if (ai.strafeT <= 0) { ai.strafe = Math.random() < 0.5 ? -1 : 1; ai.strafeT = rand(0.6, 1.8); if (Math.random() < 0.25) c.wantJump = true; }
    if (ai.sees && id !== 'pickaxe') { mx += -uz * ai.strafe * 0.8; mz += ux * ai.strafe * 0.8; }
    if (!STORM.isSafe(c.pos.x, c.pos.z, -4)) {
      // keep shooting but retreat toward the safe zone
      const sx = STORM.cur.x - c.pos.x, sz = STORM.cur.z - c.pos.z, sl = Math.hypot(sx, sz) || 1;
      mx = sx / sl + mx * 0.3; mz = sz / sl + mz * 0.3;
    }
    if (Math.abs(mx) + Math.abs(mz) > 0.01) this.steer(c, mx, mz, dt, false); else { c.moveX = c.moveZ = 0; }
    // aim & shoot
    const aimY = t.pos.y + (Math.random() < 0.15 ? 1.65 : 1.15);
    this.faceToward(c, tp.x, aimY, tp.z, dt);
    if (ai.reactT > 0 || c.using) return;
    if (!ai.sees && !ai.blocker) return;
    if (dist > EFF_RANGE[id]) return;
    const want = Math.atan2(-dx, -dz);
    if (Math.abs(wrapAngle(want - c.yaw)) > 0.2) return;
    const o = id === 'pickaxe' ? null : CHARS.muzzle(c, new THREE.Vector3());
    const dir = this.aimDir(c, tp.x, aimY, tp.z, o);
    // bots aim noticeably worse at the human player than at each other
    const err = c.skill.aimErr * (t.isPlayer ? 1.6 : 1) * (1 + Math.hypot(t.vel.x, t.vel.z) / 9) * (ai.sees ? 1 : 2.5);
    CHARS.jitter(dir, err, dir);
    CHARS.tryFire(c, dir, o);
  },

  aimDir(c, x, y, z, o) {
    const ox = o ? o.x : c.pos.x, oy = o ? o.y : c.pos.y + 1.5, oz = o ? o.z : c.pos.z;
    return new THREE.Vector3(x - ox, y - oy, z - oz).normalize();
  },
  faceToward(c, x, y, z, dt) {
    const dx = x - c.pos.x, dz = z - c.pos.z;
    const want = Math.atan2(-dx, -dz);
    const dy = y - (c.pos.y + 1.5);
    const wantP = Math.atan2(dy, Math.hypot(dx, dz));
    const k = Math.min(1, dt * c.skill.turn);
    c.yaw = wrapAngle(c.yaw + wrapAngle(want - c.yaw) * k);
    c.pitch = lerp(c.pitch, wantP, k);
  },

  moveTo(c, x, z, dt) {
    const dx = x - c.pos.x, dz = z - c.pos.z, d = Math.hypot(dx, dz);
    if (d < 0.8) { c.moveX = c.moveZ = 0; return; }
    this.steer(c, dx / d, dz / d, dt, true);
  },
  steer(c, mx, mz, dt, face) {
    const ai = c.ai;
    const l = Math.hypot(mx, mz) || 1; mx /= l; mz /= l;
    if (ai.unstuckT > 0) {
      mx = Math.cos(ai.unstuckDir); mz = Math.sin(ai.unstuckDir);
    } else {
      const blk = PHYS.blockedAt(c.pos.x + mx * 1.3, c.pos.z + mz * 1.3, c.pos.y, 0.4);
      if (blk) {
        if (blk.y1 - c.pos.y < 1.7 && c.onGround) c.wantJump = true;
        else if (blk.destructible && blk.kind !== 'tree' && blk.kind !== 'rock' && ai.mode !== 'fight' && Math.random() < 0.5) {
          if (c.sel !== -1) CHARS.equip(c, -1);
          c.yaw = Math.atan2(-mx, -mz); c.pitch = 0;
          CHARS.tryFire(c, new THREE.Vector3(mx, 0, mz), null);
          c.moveX = mx * 0.2; c.moveZ = mz * 0.2;
          return;
        } else {
          if (ai.avoidT <= 0) { ai.avoidSide = Math.random() < 0.5 ? 1 : -1; ai.avoidT = 1.2; }
          const a = ai.avoidSide * 1.1, ca = Math.cos(a), sa = Math.sin(a);
          const nx = mx * ca - mz * sa, nz = mx * sa + mz * ca; mx = nx; mz = nz;
        }
      }
    }
    // stuck detection
    ai.stuckT += dt;
    if (ai.stuckT > 1.2) {
      if (ai.lastPos.distanceTo(c.pos) < 1.0 && ai.unstuckT <= 0) { ai.unstuckT = 1.0; ai.unstuckDir = Math.random() * TAU; c.wantJump = true; }
      ai.lastPos.copy(c.pos); ai.stuckT = 0;
    }
    c.moveX = mx; c.moveZ = mz;
    if (face) { c.yaw = wrapAngle(c.yaw + wrapAngle(Math.atan2(-mx, -mz) - c.yaw) * Math.min(1, dt * 8)); c.pitch = lerp(c.pitch, 0, Math.min(1, dt * 4)); }
  },
};
