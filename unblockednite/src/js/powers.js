'use strict';
// ===== Boss powers: finish Doctor Doom, Iron Man or Thanos and you become them =====
// Doom (Arcane Gauntlets): bolts on click, R Unstable Bolt, G Ground Pound
// Iron Man (Combat Kit): repulsors on click, R Unibeam, G micro-missiles, hold Space in the air to fly
// Thanos (Infinity Gauntlet): R cycles the six stones, click uses the selected one, G snaps (once a match)
// Adam Smasher: arm cannon, R swaps to the hand laser. Kits stack: beat several bosses and press 6
// to cycle between them; passives (flight, self-repair, auto-aim, Time Stone recording) stay on.
const POWER_DEFS = {
  doom: { short: 'Doom', name: 'Doctor Doom', outfit: 'doom', size: 1.25, weapon: 'arcane', hp: 500, shield: 100, speed: 1.35, cdR: 6, cdG: 9 },
  ironman: { short: 'Iron Man', name: 'Iron Man', outfit: 'ironman', size: 1.1, weapon: 'repulsor', hp: 450, shield: 100, speed: 1.45, cdR: 9, cdG: 8 },
  thanos: { short: 'Thanos', name: 'Thanos', outfit: 'thanos', size: 1.6, weapon: 'gauntlet', hp: 650, shield: 100, speed: 1.2, cdR: 0, cdG: 0 },
  lebron: { short: 'LeBron', name: 'LeBron James', outfit: 'lebron', size: 1.25, weapon: 'ball_lebron', hp: 600, shield: 100, speed: 1.5, cdR: 0, cdG: 7 },
  adam: { short: 'Adam', name: 'Adam Smasher', outfit: 'adam', size: 1.5, weapon: 'armcannon', hp: 500, shield: 100, speed: 1.9, cdR: 0, cdG: 0 },
};
ultronize.powersReady = true; // (boss.js loads first: POWER_DEFS only exists from here on)
if (Date.now() >= ULTRON_EVENT) ultronize(); // after the live event Thanos's kit belongs to Infinity Ultron
const STONES = [
  { id: 'power', name: 'Power Stone', color: '#b04aff', cd: 2.5 },
  { id: 'space', name: 'Space Stone', color: '#3d7bff', cd: 4 },
  { id: 'reality', name: 'Reality Stone', color: '#ff3b3b', cd: 18 },
  { id: 'soul', name: 'Soul Stone', color: '#ff9a1f', cd: 0 },
  { id: 'time', name: 'Time Stone', color: '#2fd46b', cd: 22 },
  { id: 'mind', name: 'Mind Stone', color: '#ffd84a', cd: 22 },
];

const POWERS = {
  el: null,

  // turn k into the boss they just beat
  grant(k, id, remote) {
    const P = POWER_DEFS[id];
    if (!remote) { NET.onGrant(k, id); if (NET.client && k.isPlayer) NET.ev({ t: 'gr', n: k.nid, id }); }
    if (!k.pw) k.pw = { kits: [], cd: {}, stone: 0, stoneCd: {}, fuel: 3, pound: false, beamT: 0, beamTick: 0, hist: [], histT: 0, snapped: false };
    const pw = k.pw;
    if (!pw.kits.includes(id)) pw.kits.push(id);
    k.power = id;
    if (id === 'thanos' && BOSS_TYPES.thanos.ultron) k.aimbot = true; // Infinity Ultron's Gauntlet aims itself
    if (id === 'adam') { k.isSmasher = true; k.dmgMult = Math.max(k.dmgMult || 1, 1.25); }
    // stacked bosses: fastest speed, best health plus 100 per extra kit, full shield
    k.speedMult = Math.max(...pw.kits.map(x => POWER_DEFS[x].speed));
    k.dmgMult = Math.max(k.dmgMult || 1, 1.15);
    k.maxHp = Math.max(...pw.kits.map(x => POWER_DEFS[x].hp)) + 100 * (pw.kits.length - 1);
    k.hp = k.maxHp; k.shield = Math.max(k.shield, P.shield);
    BOSS.giveBody(k, k.forceOutfit || P.outfit, k.forceSize || P.size);
    CHARS.attachModel(k);
    k.model.root.visible = true;
    k.slots[5] = { kind: 'weapon', id: P.weapon, rarity: 5, mag: 9999, special: true };
    CHARS.equip(k, 5);
    if (k.isPlayer) {
      k.paid = k.paid || {}; const pay = !k.paid[id]; k.paid[id] = true; // dropping and re-grabbing doesn't pay again
      if (pay) { PROFILE.data.coins += 500; PROFILE.save(); }
      const stack = pw.kits.length > 1 ? ` · ${pw.kits.length} bosses stacked: press 6 to switch` : '';
      const how = id === 'adam' ? '500+ HP that heals itself · auto-aim · R swaps arm cannon / hand laser' : id === 'doom' ? 'Click: arcane bolts · R: Unstable Bolt · G: Ground Pound · Y: call Doombots'
        : id === 'ironman' ? 'Click: repulsors · R: Unibeam · G: micro-missiles · hold Space in the air to fly'
          : id === 'lebron' ? 'Click: throw basketballs · G: Slam Dunk · Space in the air: double jump'
            : 'R: switch stone · Click: use it · G: SNAP (once)' + (k.aimbot ? ' · AIMBOT' : '');
      if (!k.ultronForm) HUD.banner('YOU ARE ' + P.name.toUpperCase(), (pay ? '+500 Lunch Money · ' : '') + how + stack);
      SFX.play('victory', 0.6);
    } else HUD.killfeedText(`<b>${esc(k.name)}</b> became <b>${P.name}</b>`);
  },

  // drop a boss power on purpose (T while holding it): the kit leaves, the body goes back once none are left
  revoke(k, id, remote) {
    const pw = k.pw; if (!pw || !pw.kits.includes(id)) return;
    if (!remote) { if (NET.host) NET.broadcast({ t: 'revoke', n: k.nid, id }); if (NET.client && k.isPlayer) NET.ev({ t: 'rv', n: k.nid, id }); }
    pw.kits.splice(pw.kits.indexOf(id), 1);
    if (id === 'adam') k.isSmasher = false;
    if (id === 'thanos') k.aimbot = false;
    if (pw.kits.length) {
      k.speedMult = Math.max(...pw.kits.map(x => POWER_DEFS[x].speed));
      k.maxHp = Math.max(...pw.kits.map(x => POWER_DEFS[x].hp)) + 100 * (pw.kits.length - 1); k.hp = Math.min(k.hp, k.maxHp);
      this.switchKit(k, pw.kits[0]);
      return;
    }
    k.pw = null; k.power = null; k.isSmasher = false; k.aimbot = false; k.dmgMult = 1; k.speedMult = 1;
    k.maxHp = 100; k.hp = Math.min(k.hp, 100); k.slots[5] = null;
    k.size = 1; k.height = 1.85; k.radius = 0.45;
    if (k.model) CHARS.removeModel(k);
    CHARS.buildModel(k, k.colors0, { hi: k.isPlayer });
    CHARS.attachModel(k); k.model.root.visible = true; k.heldKey = '';
    CHARS.equip(k, -1);
    if (k.isPlayer) this.reset();
  },

  callBots(c) {
    for (const b of BOTS.list) if (b.owner === c && b.alive) CHARS.damage(b, 999, null);
    BOTS.summonDoombots(c);
  },

  // ---------- player input (called from PC.update) ----------
  // returns true when it used the click itself (so the normal weapon doesn't also fire)
  input(c, P, K) {
    const pw = c.pw;
    if (!pw) return false;
    // 6 while already holding your kit cycles through every boss you've stacked
    if (P.has('Digit6')) {
      P.delete('Digit6');
      if (c.sel === 5 && !c.buildType && pw.kits.length > 1) this.switchKit(c, pw.kits[(pw.kits.indexOf(c.power) + 1) % pw.kits.length]);
      else CHARS.equip(c, 5);
    }
    const id = c.power, cd = pw.cd[id] || (pw.cd[id] = { R: 0, G: 0 });
    const holding = c.sel === 5 && !c.buildType;
    if (P.has('KeyR') && holding) {
      P.delete('KeyR');
      if (id === 'thanos') { pw.stone = (pw.stone + 1) % STONES.length; SFX.play('click', 0.6); HUD.toast(STONES[pw.stone].name); }
      else if (id === 'adam') { const s = c.slots[5]; s.id = s.id === 'armcannon' ? 'laser' : 'armcannon'; c.heldKey = ''; SFX.play('reload', 0.5); HUD.toast(WEAPONS[s.id].name); }
      else if (cd.R <= 0) { cd.R = POWER_DEFS[id].cdR; id === 'doom' ? this.unstableBolt(c) : this.unibeam(c); }
    }
    // Y as Doom: call 3 Doombots (once every 45 s, the old ones are recalled)
    if (P.has('KeyY') && id === 'doom') {
      P.delete('KeyY');
      if (NET.inMatch) HUD.toast('Doombots only work in solo matches for now');
      else if (G.time < (pw.botsT || 0)) HUD.toast('Doombots ready in ' + Math.ceil(pw.botsT - G.time) + 's');
      else { pw.botsT = G.time + 45; SFX.play('cannon', 0.6); HUD.toast('Doombots, to me!'); this.callBots(c); }
    }
    if (P.has('KeyG')) {
      if (id === 'doom' && cd.G <= 0 && c.onGround) { cd.G = POWER_DEFS.doom.cdG; this.groundPound(c); }
      else if (id === 'ironman' && cd.G <= 0) { cd.G = POWER_DEFS.ironman.cdG; this.missiles(c); }
      else if (id === 'thanos') this.snap(c);
      else if (id === 'lebron' && cd.G <= 0) { cd.G = POWER_DEFS.lebron.cdG; this.slamDunk(c); }
    }
    // Iron Man's thrusters work with any kit once you've beaten him
    if (pw.kits.includes('ironman') && K.Space && !c.onGround && pw.fuel > 0) { c.vel.y = Math.min(9, c.vel.y + (GRAVITY + 16) * (1 / 60)); pw.fuel -= 1 / 60; c.flying = true; }
    // LeBron: double jump, and the click throws a basketball
    if (pw.kits.includes('lebron') && P.has('Space') && !c.onGround && !pw.dj) { P.delete('Space'); pw.dj = true; c.vel.y = 11; SFX.play('swing', 0.5); }
    if (id === 'lebron' && holding && INPUT.lmb) { if (c.fireCd <= 0) { c.fireCd = 0.45; this.throwBall(c); } return true; }
    // Thanos: the click uses the selected stone
    if (id === 'thanos' && holding && INPUT.lmb) {
      const st = STONES[pw.stone];
      if (st.id === 'soul') { this.soulDrain(c); return true; }
      if (!INPUT.lmbPressed || (pw.stoneCd[st.id] || 0) > G.time) return true;
      pw.stoneCd[st.id] = G.time + st.cd;
      this[st.id + 'Stone'](c);
      return true;
    }
    return false;
  },

  // ---------- every frame for everyone with powers ----------
  update(c, dt) {
    const pw = c.pw;
    if (!pw || !c.alive) return;
    for (const k in pw.cd) { pw.cd[k].R -= dt; pw.cd[k].G -= dt; }
    if (c.onGround) pw.dj = false;
    if (c.onGround) { pw.fuel = Math.min(3, pw.fuel + dt * 0.8); c.flying = false; }
    // Ground Pound lands
    if (pw.pound && c.onGround && pw.poundT < G.time) {
      pw.pound = false;
      const p = new THREE.Vector3(c.pos.x, c.pos.y + 0.5, c.pos.z);
      FX.explodeAt(p, c, 70, 9, 220);
      for (const o of G.chars) {
        if (o === c || !o.alive || o.state !== 'ground') continue;
        const dx = o.pos.x - c.pos.x, dz = o.pos.z - c.pos.z, dd = Math.hypot(dx, dz);
        if (dd > 10 || dd < 0.01) continue;
        const k = 1 - dd / 10; o.vel.x += dx / dd * 18 * k; o.vel.z += dz / dd * 18 * k; o.vel.y = 9 * k + 3; o.onGround = false; o.knockT = 0.7;
      }
      if (c.isPlayer) G.shake = Math.max(G.shake, 0.5);
    }
    // Unibeam keeps firing while it lasts
    if (pw.beamT > 0) {
      pw.beamT -= dt; pw.beamTick -= dt;
      if (pw.beamTick <= 0) { pw.beamTick = 0.06; this.beam(c, this.aimDir(c), 14, 0xffffff, 'Unibeam'); }
    }
    // Time Stone history: where you were and how healthy, sampled every 0.25 s for 5 s
    if (pw.kits.includes('thanos')) {
      pw.histT -= dt;
      if (pw.histT <= 0) { pw.histT = 0.25; pw.hist.push({ t: G.time, x: c.pos.x, y: c.pos.y, z: c.pos.z, hp: c.hp, sh: c.shield }); while (pw.hist.length && pw.hist[0].t < G.time - 5) pw.hist.shift(); }
    }
    if (c.isPlayer) this.drawHud(c);
  },

  // swap to another stacked boss: its weapon, its abilities and its look
  switchKit(c, id) {
    const P = POWER_DEFS[id];
    c.power = id;
    c.slots[5] = { kind: 'weapon', id: P.weapon, rarity: 5, mag: 9999, special: true };
    BOSS.giveBody(c, c.forceOutfit || P.outfit, c.forceSize || P.size);
    CHARS.attachModel(c);
    c.model.root.visible = true;
    c.heldKey = '';
    SFX.play('shield', 0.5);
    if (c.isPlayer) HUD.toast(c.ultronForm ? (id === 'thanos' ? 'Infinity Gauntlet' : 'Ultron’s arsenal') : P.name);
  },

  // ---------- helpers ----------
  aimDir(c) {
    if (c.isPlayer) {
      const o = CHARS.muzzle(c, new THREE.Vector3()), d = PC.aimPoint.clone().sub(o).normalize();
      return c.isSmasher || c.aimbot ? PC.autoAim(c, o, d) : d; // Adam Smasher's auto-aim works for the Infinity Stones too
    }
    return new THREE.Vector3(-Math.sin(c.yaw) * Math.cos(c.pitch), Math.sin(c.pitch), -Math.cos(c.yaw) * Math.cos(c.pitch));
  },
  // instant beam: damages the first thing it hits; returns the damage dealt to a character
  beam(c, dir, dmg, color, name) {
    const o = CHARS.muzzle(c, new THREE.Vector3());
    const hit = PHYS.raycast(o, dir, 260, { ignore: c });
    const end = hit ? hit.point : o.clone().addScaledVector(dir, 260);
    FX.tracer(o, end, color, true);
    if (!hit) return 0;
    if (hit.kind === 'char') { CHARS.damage(hit.char, dmg * (c.dmgMult || 1), c, { weapon: name }); FX.impact(hit.point, 'char'); return dmg; }
    if (hit.kind === 'solid') WORLD.hitSolid(hit.solid, dmg * 2, c, false);
    FX.impact(hit.point, hit.kind);
    return 0;
  },
  blast(c, dir, color, rocketId = 'rocket') {
    const o = CHARS.muzzle(c, new THREE.Vector3());
    FX.rocket(c, o.addScaledVector(dir, 1.2), dir, { id: rocketId, rarity: 4, color });
    SFX.play('rocket', 0.8, c.isPlayer ? null : c.pos);
  },

  // ---------- Doom ----------
  unstableBolt(c) { this.blast(c, this.aimDir(c), 0x3dff6e); },
  groundPound(c) { c.vel.y = 15; c.onGround = false; c.pw.pound = true; c.pw.poundT = G.time + 0.2; SFX.play('cannon', 0.6, c.isPlayer ? null : c.pos); },

  // ---------- Iron Man ----------
  unibeam(c) { c.pw.beamT = 1.5; c.pw.beamTick = 0; SFX.play('laser', 0.9, c.isPlayer ? null : c.pos); },
  missiles(c) {
    const foes = G.chars.filter(o => o !== c && o.alive && o.state !== 'bus' && (!c.team || o.team !== c.team) && o.pos.distanceTo(c.pos) < 120 && BOTS.canSee(c, o).see)
      .sort((a, b) => a.pos.distanceTo(c.pos) - b.pos.distanceTo(c.pos)).slice(0, 4);
    const targets = foes.length ? foes : [null];
    for (let i = 0; i < 6; i++) {
      const t = targets[i % targets.length];
      const o = CHARS.muzzle(c, new THREE.Vector3());
      const dir = t ? new THREE.Vector3(t.pos.x - o.x, t.pos.y + 1 - o.y, t.pos.z - o.z).normalize() : this.aimDir(c);
      CHARS.jitter(dir, 0.05, dir);
      setTimeout(() => { if (c.alive) FX.rocket(c, CHARS.muzzle(c, new THREE.Vector3()).addScaledVector(dir, 1.2), dir, { id: 'quad', rarity: 4, color: 0xffb02e }); }, i * 90);
    }
    SFX.play('rocket', 0.9, c.isPlayer ? null : c.pos);
  },

  // ---------- LeBron ----------
  // a basketball lobbed in an arc onto whatever you're aiming at
  throwBall(c) {
    const o = CHARS.muzzle(c, new THREE.Vector3()), t = c.isPlayer ? PC.aimPoint.clone() : o.clone().addScaledVector(this.aimDir(c), 30);
    const flat = Math.hypot(t.x - o.x, t.z - o.z), T = Math.max(0.35, Math.min(1.6, flat / 38));
    const v = new THREE.Vector3((t.x - o.x) / T, (t.y - o.y) / T + 0.5 * 22 * T, (t.z - o.z) / T);
    FX.orb(c, o.addScaledVector(v.clone().normalize(), 0.8), v, { ball: true, size: 0.26, dmg: 38, gravity: 22, life: 4, name: 'basketball' });
    c.swingT = 0.32; SFX.play('swing', 0.7, c.isPlayer ? null : c.pos);
  },
  // Slam Dunk: leap at what you're aiming at (up to 22 m) and hammer the ground where you land
  slamDunk(c) {
    const t = c.isPlayer ? PC.aimPoint : c.pos, dx = t.x - c.pos.x, dz = t.z - c.pos.z, L = Math.min(22, Math.hypot(dx, dz)) || 1, n = Math.hypot(dx, dz) || 1;
    c.vel.x = dx / n * L / 1.1; c.vel.z = dz / n * L / 1.1; c.vel.y = 13; c.onGround = false;
    c.pw.pound = true; c.pw.poundT = G.time + 0.25; c.pw.dunkUntil = G.time + 1.1;
    c.swingT = 0.32; SFX.play('cannon', 0.6, c.isPlayer ? null : c.pos);
  },

  // ---------- Thanos ----------
  powerStone(c) { this.blast(c, this.aimDir(c), 0xb04aff); },
  spaceStone(c) {
    const p = c.isPlayer ? PC.aimPoint : c.pos;
    const from = c.pos.clone(), dir = p.clone().sub(from); dir.y = 0;
    const L = Math.min(60, dir.length()); if (L < 2) return;
    dir.normalize();
    const x = from.x + dir.x * (L - 1.5), z = from.z + dir.z * (L - 1.5);
    FX.sparkle(new THREE.Vector3(from.x, from.y + 1, from.z), 0x3d7bff);
    c.pos.set(x, Math.max(WORLD.heightAt(x, z), p.y) + 0.3, z); c.vel.set(0, 0, 0);
    FX.sparkle(new THREE.Vector3(x, c.pos.y + 1, z), 0x3d7bff);
    SFX.play('shield', 0.6);
  },
  realityStone(c) { c.invisUntil = G.time + 6; FX.sparkle(new THREE.Vector3(c.pos.x, c.pos.y + 1, c.pos.z), 0xff3b3b); HUD.toast('Invisible for 6 seconds'); },
  soulDrain(c) {
    if (c.fireCd > 0) return;
    c.fireCd = 0.09;
    const dealt = this.beam(c, this.aimDir(c), 9, 0xff9a1f, 'Soul Stone');
    if (dealt) c.hp = Math.min(c.maxHp, c.hp + dealt * 0.6);
  },
  timeStone(c) {
    const h = c.pw.hist[0];
    if (!h) return;
    FX.sparkle(new THREE.Vector3(c.pos.x, c.pos.y + 1, c.pos.z), 0x2fd46b);
    c.pos.set(h.x, h.y, h.z); c.vel.set(0, 0, 0);
    c.hp = Math.max(c.hp, h.hp); c.shield = Math.max(c.shield, h.sh);
    FX.sparkle(new THREE.Vector3(h.x, h.y + 1, h.z), 0x2fd46b);
    HUD.toast('Rewound 5 seconds');
  },
  mindStone(c) {
    c.mindUntil = G.time + 8;
    // everyone close by forgets you and picks a fight with each other
    for (const o of G.chars) {
      if (o === c || !o.alive || o.isPlayer || !o.ai || o.pos.distanceTo(c.pos) > 45) continue;
      let other = null, od = 1e9;
      for (const q of G.chars) { if (q === o || q === c || !q.alive || q.isBoss) continue; const d = q.pos.distanceTo(o.pos); if (d < od) { od = d; other = q; } }
      o.ai.target = other; o.ai.reactT = 0;
    }
    FX.sparkle(new THREE.Vector3(c.pos.x, c.pos.y + 1.5, c.pos.z), 0xffd84a);
    HUD.toast('Nearby enemies turn on each other');
  },
  snap(c) {
    if (c.pw && c.pw.noSnap) { if (c.isPlayer) HUD.toast('The snap doesn’t work here'); return; }
    if (!c.isPlayer || c.pw.snapped) { if (c.isPlayer) HUD.toast('You already snapped'); return; }
    c.pw.snapped = true;
    const others = G.chars.filter(o => o !== c && o.alive && !o.isBoss && o.state !== 'bus');
    const n = Math.floor(others.length / 2);
    shuffle(others);
    HUD.banner('PERFECTLY BALANCED', `${n} players turned to dust`);
    G.shake = Math.max(G.shake, 0.8);
    SFX.play('storm', 1);
    others.slice(0, n).forEach((o, i) => setTimeout(() => {
      if (!o.alive) return;
      FX.sparkle(new THREE.Vector3(o.pos.x, o.pos.y + 1, o.pos.z), 0x9a7b5a);
      CHARS.damage(o, 99999, c, { direct: true, weapon: 'the Snap' });
    }, 400 + i * 60));
  },

  // ---------- HUD line above the hotbar ----------
  drawHud(c) {
    if (!this.el) { this.el = document.createElement('div'); this.el.id = 'powerhud'; document.getElementById('hud').appendChild(this.el); }
    const pw = c.pw, id = c.power, cd = (v) => v > 0 ? Math.ceil(v) + 's' : 'ready', k = pw.cd[id] || { R: 0, G: 0 };
    let html;
    if (id === 'thanos') {
      const st = STONES[pw.stone], left = (pw.stoneCd[st.id] || 0) - G.time;
      html = `<b style="color:${st.color}">${st.name}</b> ${st.cd ? cd(left) : ''}${c.aimbot ? ' · <b style="color:#ff4a5e">AIMBOT</b>' : ''} · <kbd>R</kbd> next stone · <kbd>G</kbd> Snap ${pw.snapped ? 'used' : 'ready'}`
        + `<span class="stones">${STONES.map((s, i) => `<i style="background:${s.color};opacity:${i === pw.stone ? 1 : 0.35}"></i>`).join('')}</span>`;
    } else if (id === 'doom') html = `<b style="color:#3dff6e">Doctor Doom</b> · <kbd>R</kbd> Unstable Bolt ${cd(k.R)} · <kbd>G</kbd> Ground Pound ${cd(k.G)} · <kbd>Y</kbd> Doombots ${NET.inMatch ? 'solo only' : cd((pw.botsT || 0) - G.time)}`;
    else if (id === 'adam') html = `<b style="color:#ff4a5e">${c.ultronForm ? 'Infinity Ultron' : 'Adam Smasher'}</b> · <kbd>R</kbd> ${c.slots[5].id === 'laser' ? 'arm cannon' : 'hand laser'} · self-repair · auto-aim`;
    else if (id === 'lebron') html = `<b style="color:#ffc72c">LeBron James</b> · Click: basketballs · <kbd>G</kbd> Slam Dunk ${cd(k.G)} · double jump`;
    else html = `<b style="color:#ffb02e">Iron Man</b> · <kbd>R</kbd> Unibeam ${cd(k.R)} · <kbd>G</kbd> Missiles ${cd(k.G)}`;
    if (pw.kits.includes('ironman')) html += ` · Fuel <span class="fuel"><i style="width:${pw.fuel / 3 * 100}%"></i></span>`;
    html += ` · <span style="color:#ff8a8a">${pw.kits.length >= 3 ? 'live on the map' : pw.kits.length === 2 ? 'pinged every 5 s' : 'pinged every 10 s'}</span>`;
    if (pw.kits.length > 1) html += ` · <kbd>6</kbd> ${pw.kits.map(x => x === id ? '<b>' + POWER_DEFS[x].short + '</b>' : POWER_DEFS[x].short).join(' / ')}`;
    if (this._last !== html) { this.el.innerHTML = html; this._last = html; }
  },
  reset() { if (this.el) { this.el.remove(); this.el = null; this._last = ''; } },
};
