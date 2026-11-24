'use strict';
// ===== 1 vs 100: you are Infinity Ultron =====
// 10,000 HP, everything Adam Smasher had (arm cannon / hand laser, self-repair, auto-aim) plus every Infinity
// Stone (no snap), and a forehead laser that pierces through everyone in a line and kills them outright.
// All 100 sweaty bots are on one side, carry legendary guns that do double damage, and hunt you. Win by being the last one standing.
const ULTRON_MODE = {
  LASER_CD: 6, LASER_RANGE: 400,
  laserT: 0,
  setup(p) {
    G.ultronMode = true;
    p.forceOutfit = 'ultron'; p.forceSize = 2.1;
    p.paid = { adam: true, thanos: true }; // no Lunch Money for this
    p.ultronForm = true; // shown as Infinity Ultron everywhere; his powers can't be dropped
    POWERS.grant(p, 'adam'); POWERS.grant(p, 'thanos');
    p.pw.noSnap = true;
    p.maxHp = p.hp = 10000; p.shield = 100;
    p.dmgMult = 3; // everything you fire (guns, arm cannon, stones) hits 3x as hard
    p.regenRate = 250; // Adam Smasher's self-repair, scaled up for a 10,000 HP body (after 3 s without being hit)
    p.team = 'ultron';
    // every bot drops in already armed: legendary guns that hit twice as hard
    const kits = [['ar', 'shotgun'], ['smg', 'shotgun'], ['ar', 'sniper'], ['minigun', 'shotgun'], ['ar', 'rocket']];
    for (const b of BOTS.list) {
      b.team = 'horde'; if (b.ai) b.ai.hunt = { c: p, until: 9999 };
      const k = kits[Math.floor(Math.random() * kits.length)];
      b.slots = [ITEMS.makeWeapon(k[0], 4), ITEMS.makeWeapon(k[1], 4), null, null, null]; b.sel = 0;
      b.dmgMult = 2;
    }
    this.laserT = 0;
    HUD.banner('YOU ARE INFINITY ULTRON', '10,000 HP · arm cannon / hand laser (R) · every Infinity Stone (6 switches) · Y: forehead laser');
  },
  update(dt) {
    const p = G.player;
    if (!p || !p.alive) return;
    this.laserT = Math.max(0, this.laserT - dt);
    const P = INPUT.pressed;
    if (P.has('KeyY')) {
      P.delete('KeyY');
      if (this.laserT > 0) HUD.toast('Forehead laser ready in ' + Math.ceil(this.laserT) + 's');
      else this.laser(p);
    }
  },
  // a beam out of the forehead along your aim: everyone it passes through dies
  laser(p) {
    this.laserT = this.LASER_CD;
    const o = new THREE.Vector3();
    const head = p.model && p.model.active && p.model.active.bones && p.model.active.bones.head;
    if (head) { p.model.root.updateMatrixWorld(true); head.getWorldPosition(o); }
    if (!head || o.distanceTo(p.pos) > p.height * 1.5) o.set(p.pos.x, p.pos.y + p.height * 0.92, p.pos.z); // model not posed yet: use the body
    const dir = (PC.aimPoint ? PC.aimPoint.clone().sub(o) : new THREE.Vector3(-Math.sin(p.yaw), 0, -Math.cos(p.yaw))).normalize();
    const end = o.clone().addScaledVector(dir, this.LASER_RANGE);
    const c = new THREE.Vector3();
    let kills = 0;
    for (const t of G.chars) {
      if (t === p || !t.alive || t.state === 'bus') continue;
      // the beam at this target's distance: hit if it passes anywhere from their feet to over their head
      const h = t.height || 1.85, dx = t.pos.x - o.x, dz = t.pos.z - o.z, flat = Math.hypot(dir.x, dir.z) || 1e-6;
      const along = (dx * dir.x + dz * dir.z) / flat; // horizontal distance along the beam
      if (along < 0 || along > this.LASER_RANGE) continue;
      const side = Math.abs(dx * dir.z - dz * dir.x) / flat; // sideways miss
      const by = o.y + dir.y / flat * along; // beam height there
      if (side > 1.1 + (t.radius || 0.45) || by < t.pos.y - 0.4 || by > t.pos.y + h + 0.6) continue;
      c.set(t.pos.x, by, t.pos.z);
      CHARS.damage(t, 999999, p, { direct: true, weapon: 'laser' });
      FX.explosion(c.clone(), 1.6);
      kills++;
    }
    FX.tracer(o, end, 0xff1a1a, true); FX.tracer(o.clone().add(new THREE.Vector3(0, 0.08, 0)), end, 0xff6a3a, true);
    SFX.play('laser', 1); G.shake = Math.max(G.shake, 0.6);
    if (kills > 1) HUD.toast(kills + ' eliminated with one beam');
  },
};

// only unlocked once the live event has happened (Ultron takes the Gauntlet)
if (Date.now() >= ULTRON_EVENT) MODES.ultron1v100 = { name: '1 vs 100', tag: 'Infinity Ultron · Tiny map', ultron: true, tiny: true, noBoss: true, bots: () => 100, diff: () => 'hard', desc: 'You are Infinity Ultron: 10,000 HP, an arm cannon and hand laser, every Infinity Stone (no snap) and a piercing forehead laser (Y). 100 sweaty bots hunt you. Survive.' };
