'use strict';
// ===== The LeBron collab =====
// LeBron's Hideout (a named place on the big map): a house and an outdoor court with a golden LeBron Token on
// a pedestal. Grab it (solo) and you're sent to a floating court high above the island to fight LeBron: he
// throws basketballs and comes down with slam dunks. Beat him and his skin is yours (exclusive, not sold).
// The storm can't reach you up there; you go back to the Hideout when the fight ends.
const LEBRON = {
  token: null, fight: null, balls: [],

  // ---------- the Hideout (called by WORLD.buildPOI) ----------
  buildHideout(p) {
    const W = WORLD, y = p.y;
    // the house
    W.makeBuilding(Math.round(p.x / 4) - 6, Math.round(p.z / 4) - 2, 4, 3, 2, { wall: MATS.creamBrick, roof: MATS.redRoof, mat: 'brick' });
    // the court next to it: wood floor, white lines, a hoop at each end
    const cx = p.x + 8, cz = p.z, CW = 15, CL = 26;
    this.court(W, cx, y + 0.05, cz, CW, CL, false);
    // the token on a gold pedestal at center court
    W.slab(MATS.doomGold, cx - 0.7, cx + 0.7, y, y + 1.1, cz - 0.7, cz + 0.7);
    const t = new THREE.Group();
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.12, 28), new THREE.MeshLambertMaterial({ color: 0xffc83a, emissive: 0x6b4a00 }));
    coin.rotation.x = Math.PI / 2; coin.userData.ownGeo = true; t.add(coin);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.4, 5), new THREE.MeshLambertMaterial({ color: 0x5a2d8a, emissive: 0x220b40 })); crown.position.set(0, 0, 0.08); crown.rotation.x = Math.PI / 2; crown.userData.ownGeo = true; t.add(crown);
    t.position.set(cx, y + 2.1, cz); W.group.add(t);
    this.token = { obj: t, x: cx, y: y + 1.1, z: cz, taken: false };
    for (let k = 0; k < 2; k++) ITEMS.addChest(cx + (k ? 5 : -5), y + 0.06, cz + 9, 0);
    // LeBron's court in the sky (built with the island so it's drawn with everything else)
    const A = this.arena = { x: W.HALF - 70, z: W.HALF - 70, y: 230 }; // high over a corner of the map
    this.court(W, A.x, A.y, A.z, 22, 34, true);
    for (const [x0, x1, z0, z1] of [[-11.5, 11.5, -17.5, -17], [-11.5, 11.5, 17, 17.5], [-11.5, -11, -17, 17], [11, 11.5, -17, 17]]) W.slab(MATS.dark, A.x + x0, A.x + x1, A.y, A.y + 1.2, A.z + z0, A.z + z1);
  },
  // a basketball court (floor, lines, two hoops); solid floor when it floats in the sky
  court(W, cx, y, cz, CW, CL, floating) {
    const floor = new THREE.MeshLambertMaterial({ color: 0xc98a4b }), line = new THREE.MeshBasicMaterial({ color: 0xffffff });
    if (!this.mats) this.mats = { floor, line };
    W.slab(this.mats.floor, cx - CW / 2, cx + CW / 2, y - (floating ? 1.2 : 0.05), y, cz - CL / 2, cz + CL / 2, floating);
    const L = (x0, x1, z0, z1) => W.slab(this.mats.line, x0, x1, y, y + 0.02, z0, z1, false);
    L(cx - CW / 2, cx + CW / 2, cz - 0.08, cz + 0.08); // half court
    L(cx - CW / 2, cx - CW / 2 + 0.15, cz - CL / 2, cz + CL / 2); L(cx + CW / 2 - 0.15, cx + CW / 2, cz - CL / 2, cz + CL / 2);
    L(cx - CW / 2, cx + CW / 2, cz - CL / 2, cz - CL / 2 + 0.15); L(cx - CW / 2, cx + CW / 2, cz + CL / 2 - 0.15, cz + CL / 2);
    for (const s of [-1, 1]) {
      const hz = cz + s * (CL / 2 - 1.2);
      W.slab(MATS.dark, cx - 0.15, cx + 0.15, y, y + 3.6, hz + s * 0.6 - 0.15, hz + s * 0.6 + 0.15, false);   // pole
      W.slab(MATS.aSign, cx - 0.9, cx + 0.9, y + 3.3, y + 4.3, hz + s * 0.45 - 0.04, hz + s * 0.45 + 0.04, false); // backboard
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.03, 6, 20), new THREE.MeshLambertMaterial({ color: 0xff5a1a }));
      ring.rotation.x = Math.PI / 2; ring.position.set(cx, y + 3.4, hz); ring.userData.ownGeo = true; W.group.add(ring);
    }
  },

  // ---------- every frame ----------
  update(dt) {
    const p = G.player;
    if (this.token && !this.token.taken) {
      this.token.obj.rotation.y += dt * 2; this.token.obj.position.y = this.token.y + 1 + Math.sin(G.time * 2) * 0.15;
      if (p && p.alive && p.state === 'ground' && dist2D(p.pos.x, p.pos.z, this.token.x, this.token.z) < 1.6 && Math.abs(p.pos.y - this.token.y) < 3) this.grab(p);
    }
    if (this.fight) this.tick(dt);
  },
  grab(p) {
    if (NET.inMatch || HANG.on) { if (!this.warned) { this.warned = true; HUD.toast('LeBron only takes on solo players'); } return; }
    this.token.taken = true; this.token.obj.visible = false;
    SFX.play('victory', 0.6);
    HUD.banner('YOU FOUND THE LEBRON TOKEN', 'The King wants a 1v1…');
    setTimeout(() => this.start(p), 1500);
  },

  // ---------- the fight ----------
  start(p) {
    if (!p.alive) return;
    const A = this.arena; // the floating court out past the island
    this.back = p.pos.clone();
    p.pos.set(A.x, A.y + 0.5, A.z + 12); p.vel.set(0, 0, 0); p.inArena = true;
    const o = OUTFITS.find((x) => x.id === 'lebron');
    const lb = CHARS.create({ name: 'LeBron', colors: o });
    BOSS.giveBody(lb, 'lebron', 1.25);
    lb.henchman = true; lb.lebron = true; lb.state = 'ground'; lb.inArena = true; lb.team = 'lebron';
    lb.ai = { target: null }; lb.skill = { react: 0.5 }; // (only so the shared hit-reaction code has something to read)
    lb.pos.set(A.x, A.y + 0.5, A.z - 10); lb.yaw = 0;
    // scales with the match difficulty: easy 1040+130, normal 1600+200, hard 2400+300; his hits scale the same way
    const k = BOSS.diff.hp / 1000; this.dmgK = BOSS.diff.dmg / 0.6;
    lb.hp = lb.maxHp = Math.round(1600 * k); lb.shield = lb.maxShield = Math.round(200 * k);
    lb.slots[0] = { kind: 'weapon', id: 'beam_thanos', rarity: 5, mag: 9999, special: true }; lb.sel = 0; // nothing in his hands
    CHARS.attachModel(lb); G.chars.push(lb);
    this.fight = { A, lb, throwT: 2, dunkT: 6, dunk: null, t: 0 };
    HUD.banner('LEBRON', 'Take down the King to earn his skin');
    this.bar = document.createElement('div');
    this.bar.style.cssText = 'position:fixed;top:64px;left:50%;transform:translateX(-50%);width:min(460px,80vw);z-index:50;pointer-events:none;font:800 14px system-ui;color:#fff;text-align:center;text-shadow:0 2px 3px #000';
    this.bar.innerHTML = '<div>LEBRON JAMES</div><div style="height:6px;margin-top:4px;background:#0008;border-radius:3px;overflow:hidden"><div class="lb-sh" style="height:100%;background:#4aa8ff"></div></div><div style="height:12px;margin-top:3px;background:#0008;border-radius:3px;overflow:hidden;border:1px solid #fff4"><div class="lb-hp" style="height:100%;background:linear-gradient(#ffcc3a,#e8a000)"></div></div>';
    document.body.appendChild(this.bar);
    SFX.play('horn', 0.8);
  },
  tick(dt) {
    const F = this.fight, lb = F.lb, p = G.player, A = F.A;
    F.t += dt;
    // the balls in the air
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];
      b.v.y -= 22 * dt; b.m.position.addScaledVector(b.v, dt); b.m.rotation.x += dt * 8; b.life -= dt;
      const c = new THREE.Vector3(p.pos.x, p.pos.y + 1.1, p.pos.z);
      if (p.alive && b.m.position.distanceTo(c) < 1.1) { CHARS.damage(p, Math.round(14 * this.dmgK), lb, { weapon: 'basketball' }); p.vel.addScaledVector(b.v.clone().setY(0).normalize(), 6); p.vel.y = 4; SFX.play('hit', 0.7); b.life = 0; }
      if (b.life <= 0 || b.m.position.y < A.y - 2) { GFX.scene.remove(b.m); this.balls.splice(i, 1); }
    }
    if (this.bar) { this.bar.querySelector('.lb-hp').style.width = Math.max(0, lb.hp / lb.maxHp * 100) + '%'; this.bar.querySelector('.lb-sh').style.width = Math.max(0, lb.shield / lb.maxShield * 100) + '%'; }
    if (!p.alive) return this.end(false);
    if (!lb.alive) return this.end(true);
    // LeBron: stays a few metres off, circles, faces you, throws, and sometimes leaps in for a slam dunk
    const dx = p.pos.x - lb.pos.x, dz = p.pos.z - lb.pos.z, d = Math.hypot(dx, dz) || 1;
    lb.yaw = Math.atan2(-dx, -dz);
    if (F.dunk) {
      F.dunk.t += dt; const k = Math.min(1, F.dunk.t / 0.9);
      lb.pos.x = F.dunk.x0 + (F.dunk.x1 - F.dunk.x0) * k; lb.pos.z = F.dunk.z0 + (F.dunk.z1 - F.dunk.z0) * k; lb.pos.y = A.y + 0.5 + Math.sin(Math.PI * k) * 6;
      if (k >= 1) {
        F.dunk = null; lb.pos.y = A.y + 0.5; FX.explosion(new THREE.Vector3(lb.pos.x, A.y + 0.3, lb.pos.z), 4); G.shake = Math.max(G.shake, 1); SFX.play('cannon', 0.9);
        if (dist2D(p.pos.x, p.pos.z, lb.pos.x, lb.pos.z) < 5) { CHARS.damage(p, Math.round(30 * this.dmgK), lb, { weapon: 'slam dunk', direct: true }); p.vel.set(dx / d * 10, 9, dz / d * 10); }
      }
      lb.vel.set(0, 0, 0);
    } else {
      const want = 9, side = Math.sin(F.t * 0.9) > 0 ? 1 : -1;
      let mx = (dx / d) * (d - want) * 0.8 + (-dz / d) * side * 3, mz = (dz / d) * (d - want) * 0.8 + (dx / d) * side * 3;
      const ml = Math.hypot(mx, mz), sp = Math.min(6, ml);
      if (ml > 0.1) { mx = mx / ml * sp; mz = mz / ml * sp; }
      lb.vel.set(mx, 0, mz);
      lb.pos.x = Math.max(A.x - 10, Math.min(A.x + 10, lb.pos.x + mx * dt)); lb.pos.z = Math.max(A.z - 16, Math.min(A.z + 16, lb.pos.z + mz * dt)); lb.pos.y = A.y + 0.5;
      F.throwT -= dt; F.dunkT -= dt;
      if (F.throwT <= 0) { F.throwT = lb.hp < lb.maxHp / 2 ? 0.75 : 1.2; this.throwBall(lb, p); }
      if (F.dunkT <= 0) { F.dunkT = 7; F.dunk = { t: 0, x0: lb.pos.x, z0: lb.pos.z, x1: p.pos.x, z1: p.pos.z }; lb.swingT = 0.32; HUD.toast('LeBron is going up for the dunk!'); }
    }
    lb.onGround = true; lb.swingT = Math.max(0, (lb.swingT || 0) - dt);
  },
  throwBall(lb, p) {
    const m = new THREE.Mesh(this.ballGeo || (this.ballGeo = new THREE.SphereGeometry(0.24, 12, 10)), this.ballMat || (this.ballMat = new THREE.MeshLambertMaterial({ color: 0xe8701e })));
    m.position.set(lb.pos.x, lb.pos.y + 2.4, lb.pos.z); GFX.scene.add(m);
    // aim where you'll be, lobbed in an arc
    const tx = p.pos.x + p.vel.x * 0.6, tz = p.pos.z + p.vel.z * 0.6, ty = p.pos.y + 1.1;
    const flat = Math.hypot(tx - m.position.x, tz - m.position.z), T = Math.max(0.5, flat / 22);
    const v = new THREE.Vector3((tx - m.position.x) / T, (ty - m.position.y) / T + 0.5 * 22 * T, (tz - m.position.z) / T);
    this.balls.push({ m, v, life: 3 });
    lb.swingT = 0.32; SFX.play('swing', 0.7);
  },
  end(won) {
    const F = this.fight; this.fight = null; this.dropBar();
    for (const b of this.balls) GFX.scene.remove(b.m); this.balls = [];
    const p = G.player;
    if (F.lb.alive) { CHARS.removeModel(F.lb); G.chars = G.chars.filter((c) => c !== F.lb); }
    if (!p.alive) { p.inArena = false; return; }
    if (won) {
      if (!PROFILE.data.owned.includes('lebron')) { PROFILE.data.owned.push('lebron'); PROFILE.save(); }
      HUD.banner('YOU BEAT LEBRON', 'The LeBron skin is yours: equip it in your Locker'); SFX.play('victory', 0.8);
    }
    setTimeout(() => { if (!p.alive) return; p.pos.copy(this.back); p.pos.y += 1; p.vel.set(0, 0, 0); p.inArena = false; if (won) POWERS.grant(p, 'lebron'); }, 2500);
  },
  dropBar() { if (this.bar) { this.bar.remove(); this.bar = null; } },
  reset() { this.dropBar(); if (this.fight) { CHARS.removeModel(this.fight.lb); this.fight = null; } for (const b of this.balls) GFX.scene.remove(b.m); this.balls = []; this.token = null; this.arena = null; this.warned = false; },
};
