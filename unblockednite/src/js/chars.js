'use strict';
// ===== Characters: model, inventory, movement, combat (shared by player & bots) =====
let CHAR_ID = 0;
const SKIN_TONES = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac, 0xa86b3c];
// how the Infinity Gauntlet sits on the hand bone (rotation, offset toward the fingers in meters)
const GLOVE_PALM = [1, 0, 0], GLOVE_FIT = 1, GLOVE_SINK = 0.15; // which side of the glove model is the palm, and how much bigger than the fist it is
const PICKAXE_ITEM = { kind: 'weapon', id: 'pickaxe', rarity: 0 };
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3();

const CHARS = {
  create(opts) {
    const c = {
      id: ++CHAR_ID, name: opts.name, isPlayer: !!opts.isPlayer, alive: true, hp: 100, shield: 0,
      pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0, pitch: 0, radius: 0.45, height: 1.85,
      onGround: false, inWater: false, state: 'bus', noGravity: false,
      slots: [null, null, null, null, null], sel: -1,
      ammo: { light: 0, medium: 0, heavy: 0, shells: 0, rockets: 0 },
      mats: { wood: 0, brick: 0, metal: 0 }, buildMat: 'wood', buildType: null,
      fireCd: 0, reloadT: 0, reloading: false, useT: 0, using: null, bloom: 0, cards: [],
      kills: 0, lastAttacker: null, lastHitTime: -99, lastShotT: -99, damageDealt: 0,
      moveX: 0, moveZ: 0, sprint: false, wantJump: false, ads: false, wantDeploy: false,
      animT: Math.random() * 10, swingT: 0, deathT: 0, infiniteAmmo: !opts.isPlayer, heldKey: '',
    };
    c.colors0 = opts.colors; // the normal look, put back when every boss power has been dropped
    this.buildModel(c, opts.colors);
    return c;
  },

  buildModel(c, colors, opts = {}) {
    if (SKINS.ready) {
      const outfit = colors && colors.shirt !== undefined ? colors : pick(OUTFITS.filter(o => o.id !== 'adam' && !o.hidden && !o.only));
      c.model = SKINS.create(outfit, opts);
      c.model.root.visible = false;
      c.colors = outfit;
      return;
    }
    const L = (color) => new THREE.MeshLambertMaterial({ color });
    const col = colors || {
      shirt: new THREE.Color().setHSL(Math.random(), rand(0.5, 0.85), rand(0.4, 0.6)).getHex(),
      pants: new THREE.Color().setHSL(Math.random(), rand(0.2, 0.6), rand(0.2, 0.4)).getHex(),
      skin: pick(SKIN_TONES),
      hat: new THREE.Color().setHSL(Math.random(), rand(0.4, 0.9), rand(0.3, 0.6)).getHex(),
    };
    const mShirt = L(col.shirt), mPants = L(col.pants), mSkin = L(col.skin), mHat = L(col.hat);
    const box = (parent, mat, w, h, d, x, y, z) => { const m = new THREE.Mesh(GEO.box, mat); m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
    const root = new THREE.Group(), body = new THREE.Group();
    root.add(body);
    const legL = new THREE.Group(), legR = new THREE.Group();
    legL.position.set(-0.17, 0.9, 0); legR.position.set(0.17, 0.9, 0);
    box(legL, mPants, 0.28, 0.9, 0.3, 0, -0.45, 0); box(legR, mPants, 0.28, 0.9, 0.3, 0, -0.45, 0);
    box(legL, MATS.dark, 0.3, 0.14, 0.38, 0, -0.85, -0.04); box(legR, MATS.dark, 0.3, 0.14, 0.38, 0, -0.85, -0.04);
    body.add(legL, legR);
    box(body, mShirt, 0.72, 0.62, 0.4, 0, 1.2, 0);
    box(body, mHat, 0.5, 0.5, 0.22, 0, 1.22, 0.3);
    const head = new THREE.Group(); head.position.set(0, 1.73, 0); body.add(head);
    box(head, mSkin, 0.46, 0.46, 0.46, 0, 0, 0);
    box(head, MATS.dark, 0.08, 0.1, 0.02, -0.11, 0.04, -0.235); box(head, MATS.dark, 0.08, 0.1, 0.02, 0.11, 0.04, -0.235);
    const hatStyle = col.hatStyle !== undefined ? [0.2, 0.6, 0.9][col.hatStyle] : Math.random();
    if (hatStyle < 0.4) { box(head, mHat, 0.5, 0.16, 0.5, 0, 0.27, 0); box(head, mHat, 0.48, 0.05, 0.25, 0, 0.21, -0.33); }
    else if (hatStyle < 0.75) { box(head, mHat, 0.5, 0.14, 0.5, 0, 0.26, 0.02); box(head, mHat, 0.5, 0.3, 0.1, 0, 0.1, 0.22); }
    else { box(head, mHat, 0.54, 0.2, 0.54, 0, 0.2, 0); box(head, mHat, 0.12, 0.25, 0.12, 0, 0.4, 0); }
    const armL = new THREE.Group(), armR = new THREE.Group();
    armL.position.set(-0.47, 1.47, 0); armR.position.set(0.47, 1.47, 0);
    box(armL, mShirt, 0.22, 0.45, 0.24, 0, -0.2, 0); box(armL, mSkin, 0.2, 0.3, 0.22, 0, -0.55, 0);
    box(armR, mShirt, 0.22, 0.45, 0.24, 0, -0.2, 0); box(armR, mSkin, 0.2, 0.3, 0.22, 0, -0.55, 0);
    const hand = new THREE.Group(); hand.position.set(0, -0.7, 0); hand.rotation.x = -Math.PI / 2; armR.add(hand);
    body.add(armL, armR);
    const glider = new THREE.Group();
    const wing = new THREE.Mesh(GEO.box, L(col.hat)); wing.scale.set(3.2, 0.08, 1.2); wing.position.y = 3.1; glider.add(wing);
    const wing2 = new THREE.Mesh(GEO.box, L(0xffffff)); wing2.scale.set(3.2, 0.09, 0.3); wing2.position.set(0, 3.12, -0.45); glider.add(wing2);
    for (const sx of [-0.9, 0.9]) { const s = new THREE.Mesh(GEO.box, MATS.dark); s.scale.set(0.05, 1.5, 0.05); s.position.set(sx * 0.5, 2.35, 0); s.rotation.z = sx * 0.35; glider.add(s); }
    glider.visible = false; root.add(glider);
    root.visible = false;
    c.model = { root, body, legL, legR, armL, armR, head, hand, glider, held: null };
    c.colors = col;
  },
  // a friend's name floating over their head
  nameTag(c) {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64;
    const g = cv.getContext('2d');
    g.font = 'bold 30px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const w = Math.min(250, g.measureText(c.name).width + 28);
    g.fillStyle = 'rgba(10,20,40,0.7)'; g.fillRect(128 - w / 2, 10, w, 44);
    g.fillStyle = '#7fd0ff'; g.fillText(c.name, 128, 33);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false, transparent: true }));
    s.scale.set(2.4, 0.6, 1); s.position.y = 2.35; s.renderOrder = 11;
    c.model.root.add(s);
  },
  // floating diamond over teammates in Heroes vs Villains, visible through walls
  teamMarker(c) {
    if (!this._markTex) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 64;
      const g = cv.getContext('2d');
      g.fillStyle = '#4fc3ff'; g.strokeStyle = '#fff'; g.lineWidth = 6;
      g.beginPath(); g.moveTo(32, 4); g.lineTo(58, 32); g.lineTo(32, 60); g.lineTo(6, 32); g.closePath(); g.fill(); g.stroke();
      this._markTex = new THREE.CanvasTexture(cv);
    }
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this._markTex, depthTest: false, transparent: true }));
    s.scale.setScalar(0.45); s.position.y = 2.5 * (c.size || 1); s.renderOrder = 10;
    c.model.root.add(s);
  },
  attachModel(c) { GFX.scene.add(c.model.root); },
  removeModel(c) { if (c.model.root.parent) c.model.root.parent.remove(c.model.root); },

  // ---------- inventory ----------
  currentItem(c) { return c.sel < 0 ? PICKAXE_ITEM : c.slots[c.sel]; },
  equip(c, i) {
    if (i >= 0 && !c.slots[i]) return false;
    if (c.sel === i && !c.buildType) return false;
    c.sel = i; c.buildType = null;
    c.reloading = false; c.using = null;
    c.fireCd = Math.max(c.fireCd, 0.22);
    return true;
  },
  give(c, item) {
    if (item.kind === 'ammo') { c.ammo[item.type] = Math.min(999, c.ammo[item.type] + item.count); return true; }
    if (item.kind === 'mats') { c.mats[item.type] = Math.min(999, c.mats[item.type] + item.count); return true; }
    if (item.kind === 'weapon' && WEAPONS[item.id].throwable) {
      const s = c.slots.find(x => x && x.id === item.id);
      if (s) { s.count = Math.min(WEAPONS[item.id].stack, s.count + item.count); return true; }
    }
    if (item.kind === 'cons') {
      const max = CONSUMABLES[item.id].stack;
      for (const s of c.slots) {
        if (s && s.kind === 'cons' && s.id === item.id && s.count < max) {
          const take = Math.min(max - s.count, item.count);
          s.count += take; item.count -= take;
          if (item.count <= 0) return true;
        }
      }
    }
    const empty = c.slots.indexOf(null);
    if (empty >= 0) { c.slots[empty] = item; return true; }
    return false;
  },
  // Pick up with swap of the held slot when full. Returns true if picked up.
  pickup(c, p) {
    const item = p.item;
    if (this.give(c, item)) { ITEMS.removePickup(p); this.afterPickup(c, item); return true; }
    if (c.sel < 0 || (c.slots[c.sel] && c.slots[c.sel].special)) return false;
    const old = c.slots[c.sel];
    c.slots[c.sel] = item;
    ITEMS.removePickup(p);
    ITEMS.spawnPickup(old, c.pos.x, c.pos.y + 0.6, c.pos.z, true);
    c.reloading = false; c.using = null;
    this.afterPickup(c, item);
    return true;
  },
  afterPickup(c, item) {
    if (c.isPlayer) { SFX.play('pickup', 0.6); HUD.pickupToast(item); }
  },

  // ---------- combat ----------
  jitter(dir, s, out) {
    out.copy(dir);
    if (s > 0) {
      out.x += (Math.random() + Math.random() - 1) * s;
      out.y += (Math.random() + Math.random() - 1) * s;
      out.z += (Math.random() + Math.random() - 1) * s;
      out.normalize();
    }
    return out;
  },
  muzzle(c, out) {
    const s = c.size || 1, r = 0.42 * s;
    return out.set(c.pos.x + Math.cos(c.yaw) * r, c.pos.y + 1.45 * s, c.pos.z - Math.sin(c.yaw) * r);
  },
  tryFire(c, dir, origin) {
    const item = this.currentItem(c);
    if (!item || item.kind !== 'weapon' || c.fireCd > 0 || c.reloading || c.using || c.state !== 'ground') return false;
    const W = WEAPONS[item.id];
    if (W.melee) return this.swing(c, dir, origin);
    // Mythic gauntlets overheat (like Fortnite's): fire too long and they lock up for a moment
    if (W.heat) {
      if (G.time < (c.overheatUntil || 0)) { if (c.isPlayer && INPUT.lmbPressed) SFX.play('empty', 0.6); return false; }
      c.heat = (c.heat || 0) + W.heat;
      if (c.heat >= 100) { c.heat = 0; c.overheatUntil = G.time + 2.5; if (c.isPlayer) { HUD.toast('Overheated!'); SFX.play('shieldbreak', 0.4); } }
    }
    if (W.throwable) {
      if (item.count <= 0) return false;
      item.count--; c.fireCd = 1 / W.rate; c.swingT = 0.32;
      const o = _v2.set(c.pos.x, c.pos.y + 1.7, c.pos.z);
      FX.grenade(c, o, dir.clone().multiplyScalar(19).add(new THREE.Vector3(0, 4.5, 0)).add(c.vel.clone().multiplyScalar(0.5)), W);
      SFX.play('swing', c.isPlayer ? 0.6 : 0.6, c.isPlayer ? null : c.pos);
      if (item.count <= 0) { const i = c.slots.indexOf(item); if (i >= 0) c.slots[i] = null; c.sel = -1; }
      return true;
    }
    // miniguns spin up while the trigger is held before they fire
    if (W.spinUp) {
      if (G.time - (c.spinLast || -9) > 0.2) c.spinStart = G.time;
      c.spinLast = G.time;
      if (G.time - c.spinStart < W.spinUp) return false;
    }
    if (item.mag <= 0) {
      if (!this.startReload(c) && c.isPlayer) { SFX.play('empty', 0.5); c.fireCd = 0.3; }
      return false;
    }
    item.mag--;
    c.fireCd = 1 / W.rate;
    c.lastShotT = G.time;
    let spread = (c.ads ? W.ads : W.spread) + c.bloom;
    if (!c.onGround) spread += 0.03;
    const hs = Math.hypot(c.vel.x, c.vel.z);
    if (hs > 1) spread += Math.min(0.025, hs * 0.0025);
    if (W.scope && !c.ads) spread = W.spread;
    c.bloom = Math.min(W.bloomMax, c.bloom + W.bloom);
    const n = W.pellets || 1;
    const d = _v1;
    if (W.projectile) {
      this.jitter(dir, spread, d);
      FX.rocket(c, origin.clone().addScaledVector(d, 0.8), d.clone(), item);
    } else {
      for (let i = 0; i < n; i++) {
        this.jitter(dir, spread, d);
        const hit = PHYS.raycast(origin, d, W.range, { ignore: c });
        const end = hit ? hit.point : _v2.copy(origin).addScaledVector(d, Math.min(W.range, 300));
        if (i % 3 === 0) { const col = W.laser ? (W.color || 0xff2a3a) : c.isPlayer ? 0xfff6c0 : 0xffe08a; FX.tracer(origin, end, col, W.laser); NET.onShot(c, origin, end, col, W.laser); }
        if (!hit) continue;
        const f = hit.t <= W.falloff ? 1 : lerp(1, W.minF, clamp((hit.t - W.falloff) / (W.range - W.falloff), 0, 1));
        let dmg = W.dmg[item.rarity] * f * (c.dmgMult || 1);
        if (hit.kind === 'char') {
          if (hit.head) dmg *= W.head;
          this.damage(hit.char, dmg, c, { head: hit.head, weapon: W.name, pellets: n > 1 });
        } else if (hit.kind === 'solid') {
          WORLD.hitSolid(hit.solid, dmg, c, false);
        }
        if (i < 4) FX.impact(hit.point, hit.kind);
      }
    }
    FX.flash(_v2.copy(origin).addScaledVector(dir, 0.6));
    SFX.play(W.sound, c.isPlayer ? 0.55 : 0.9, c.isPlayer ? null : c.pos);
    if (c.isPlayer) PC.recoil(W);
    return true;
  },
  swing(c, dir, origin) {
    const W = WEAPONS.pickaxe;
    c.fireCd = 1 / W.rate; c.swingT = 0.32;
    const eye = _v2.set(c.pos.x, c.pos.y + 1.5, c.pos.z);
    const hit = PHYS.raycast(eye, dir, W.range, { ignore: c });
    if (!hit) { SFX.play('swing', c.isPlayer ? 0.5 : 0.6, c.isPlayer ? null : c.pos); return true; }
    SFX.play('pickaxe', c.isPlayer ? 0.6 : 0.7, c.isPlayer ? null : c.pos);
    if (hit.kind === 'solid') {
      const s = hit.solid;
      const mat = s.mat;
      const gained = WORLD.hitSolid(s, 50, c, true);
      FX.impact(hit.point, 'solid');
      if (c.isPlayer && gained > 0) HUD.matGain(mat, gained);
      if (c.isPlayer && s.destructible && s.maxHp) HUD.structHp(s);
    } else if (hit.kind === 'char') {
      this.damage(hit.char, W.dmg, c, { weapon: W.name });
    } else FX.impact(hit.point, 'terrain');
    return true;
  },
  startReload(c) {
    const item = this.currentItem(c);
    if (!item || item.kind !== 'weapon' || item.id === 'pickaxe' || c.reloading) return false;
    const W = WEAPONS[item.id];
    if (W.throwable || item.mag >= W.mag) return false;
    if (!c.infiniteAmmo && c.ammo[W.ammo] <= 0) return false;
    c.reloading = true; c.reloadT = W.reload; c.reloadItem = item;
    if (c.isPlayer) SFX.play('reload', 0.6);
    return true;
  },
  finishReload(c) {
    const item = c.reloadItem;
    c.reloading = false;
    if (!item || item !== this.currentItem(c)) return;
    const W = WEAPONS[item.id], need = W.mag - item.mag;
    const take = c.infiniteAmmo ? need : Math.min(need, c.ammo[W.ammo]);
    item.mag += take;
    if (!c.infiniteAmmo) c.ammo[W.ammo] -= take;
  },
  startUse(c) {
    const item = this.currentItem(c);
    if (!item || item.kind !== 'cons' || c.using || c.state !== 'ground') return false;
    const C = CONSUMABLES[item.id];
    if (C.heal && c.hp >= C.cap) { if (c.isPlayer) HUD.toast('Health is already full'); return false; }
    if (C.shield && c.shield >= C.cap) { if (c.isPlayer) HUD.toast('Shield is already full'); return false; }
    c.using = item; c.useT = 0;
    return true;
  },
  finishUse(c) {
    const item = c.using; c.using = null;
    if (!item || item !== this.currentItem(c)) return;
    const C = CONSUMABLES[item.id];
    if (C.heal) { c.hp = c.hp >= C.cap ? c.hp : Math.min(C.cap, c.hp + C.heal); SFX.play('heal', c.isPlayer ? 0.6 : 0.4, c.isPlayer ? null : c.pos); }
    if (C.shield) { c.shield = c.shield >= C.cap ? c.shield : Math.min(C.cap, c.shield + C.shield); SFX.play('shield', c.isPlayer ? 0.6 : 0.4, c.isPlayer ? null : c.pos); }
    NET.onHeal(c);
    item.count--;
    if (c.isPlayer) STATS.event('heal');
    if (item.count <= 0) { c.slots[c.sel] = null; c.sel = -1; }
  },

  damage(c, amount, attacker, opts = {}) {
    if (G.event) return; // the Live Event hangout: nobody gets hurt
    if (NET.client && NET.clientDamage(c, amount, attacker, opts)) return;
    if (c.emote && !c.isPlayer && attacker && attacker !== c) this.stopEmote(c);
    if (!c.alive || c.dormant || c.state === 'bus' || G.phase === 'over') return;
    if (c.team && attacker && attacker !== c && attacker.team === c.team) return; // no friendly fire
    if (attacker && attacker !== c && ((c.owner || c) === (attacker.owner || attacker))) return; // your Doombots and you don't hurt each other
    // bot-vs-bot fights are softened so the lobby lasts long enough for the player to meet them
    if (attacker && !attacker.human && !c.human) amount *= c.isBoss ? 0.5 : attacker.isBoss ? 1 : 0.35;
    amount = Math.max(1, Math.round(amount));
    let toShield = 0;
    if (!opts.direct) { toShield = Math.min(c.shield, amount); c.shield -= toShield; }
    const toHp = amount - toShield, real = toShield + Math.min(toHp, Math.max(0, c.hp)); // what the hit actually took off
    c.hp -= toHp;
    if (attacker && attacker !== c) { c.lastAttacker = attacker; c.lastHitTime = G.time; attacker.damageDealt += real; if (attacker.isPlayer) STATS.event('damage', real); }
    if (c.isBoss) BOSS.onHit(c, attacker, amount);
    if (attacker && attacker.isPlayer && attacker !== c) {
      FX.dmgNumber(_v1.set(c.pos.x, c.pos.y + 2.1, c.pos.z), amount, opts.head ? 'head' : toShield > 0 ? 'shield' : 'hp');
      if (!opts.pellets || Math.random() < 0.34) SFX.play(opts.head ? 'headshot' : toShield > 0 ? 'shieldhit' : 'hit', 0.5);
      if (toShield > 0 && c.shield <= 0) SFX.play('shieldbreak', 0.5);
      HUD.hitMarker(opts.head);
    }
    if (c.isPlayer) {
      if (!opts.storm) SFX.play('hurt', 0.4);
      HUD.damageFrom(attacker, opts.storm);
      G.shake = Math.max(G.shake, 0.15);
    }
    if (!c.human && !c.isBoss && !c.lebron && attacker) BOTS.onDamaged(c, attacker);
    if (c.hp <= 0) this.eliminate(c, attacker, opts.weapon || (opts.storm ? 'the Storm' : opts.fall ? 'gravity' : ''));
  },
  // ---- emotes ----
  startEmote(c, id) {
    if (!c.alive || c.state !== 'ground' || !EMOTES.get(id)) return;
    c.emote = { id, t: 0 }; c.buildType = null; c.reloading = false; c.using = null; c.ads = false;
    if (c.model) c.model.anim = null;
    if (c.isPlayer) { EMOTES.start(id); HUD.toast(EMOTES.get(id).name); }
  },
  stopEmote(c) { if (!c.emote) return; c.emote = null; if (c.isPlayer) EMOTES.stop(); },

  eliminate(c, killer, weapon) {
    c.lastWeapon = weapon;
    if (!c.alive) return;
    c.alive = false; c.hp = 0; c.shield = 0; c.state = 'dead'; c.deathT = 0;
    c.using = null; c.reloading = false;
    ITEMS.dropAll(c);
    CROWN.onElim(c); REBOOT.onElim(c);
    if (c.vehicle) VEH.exit(c);
    if (c.zip) c.zip = null;
    if (c.emote) this.stopEmote(c);
    if (killer && killer !== c) { killer.kills++; if (killer.isPlayer) STATS.event('kill'); }
    // bots sometimes show off after a kill
    if (killer && !killer.isPlayer && killer !== c && killer.alive && !killer.isBoss && killer.state === 'ground' && Math.random() < 0.35) {
      const pool = EMOTES.list;
      killer.emote = { id: pool[Math.floor(Math.random() * pool.length)].id, t: 0, until: rand(2.5, 4.5) };
      if (killer.model) killer.model.anim = null;
    }
    HUD.killfeed(killer, c, weapon);
    if (killer && killer.isPlayer && killer !== c) { SFX.play('elim', 0.7); HUD.elimToast(c); }
    FX.sparkle(_v1.set(c.pos.x, c.pos.y + 1, c.pos.z), 0x9ad8ff);
    G.onElimination(c, killer);
  },

  // ---------- per-frame ----------
  update(c, dt) {
    const m = c.model;
    if (c.dormant) { m.root.visible = false; return; } // a boss or henchman that hasn't arrived yet
    if (c.state === 'bus') { m.root.visible = false; c.pos.copy(BUS.pos); return; }
    if (c.state === 'dead') {
      c.deathT += dt;
      if (m.v1 && ANIMS.ready && ANIMS.clips.death) {
        // play the death clip once (it ends on the ground)
        m.body.position.y = 0;
        if (m.root.visible) SKINS.sync(m, G.time, false, false, ANIMS.pose(m, { key: 'death', rate: 1.3 }, dt));
      } else m.body.rotation.x = Math.max(-Math.PI / 2, -c.deathT * 5);
      if (c.deathT > 1.6 && m.root.visible) { m.root.visible = false; FX.sparkle(_v1.set(c.pos.x, c.pos.y + 0.5, c.pos.z), 0xcfd8ff); }
      return;
    }
    m.root.visible = !(c.isPlayer && PC.firstPerson) && !(c.invisUntil > G.time && !c.isPlayer);
    if (c.puppet || (NET.client && !c.isPlayer)) { NET.puppetStep(c, dt); this.animate(c, dt); return; }
    if (c.vehicle) { m.root.visible = false; if (c.pw) POWERS.update(c, dt); return; } // driving (PC.update steers the car)
    if (c.zip) { ZIPS.ride(c, dt); this.animate(c, dt); return; }
    c.fireCd = Math.max(0, c.fireCd - dt);
    if (c.heat) c.heat = Math.max(0, c.heat - 40 * dt);
    // a Smasher repairs itself: 25 HP/s once it has gone 3 s without taking damage
    if (c.isSmasher && c.hp < c.maxHp && G.time - c.lastHitTime > 3) c.hp = Math.min(c.maxHp, c.hp + (c.regenRate || 25) * dt);
    if (c.pw) POWERS.update(c, dt);
    c.swingT = Math.max(0, c.swingT - dt);
    c.bloom = Math.max(0, c.bloom - dt * 0.12);
    if (c.reloading) { c.reloadT -= dt; if (c.reloadT <= 0) this.finishReload(c); }
    if (c.using) { c.useT += dt; if (c.useT >= CONSUMABLES[c.using.id].time) this.finishUse(c); }
    const cur = this.currentItem(c);
    if (cur && cur.kind === 'weapon' && cur.id !== 'pickaxe' && cur.mag === 0 && !c.reloading && c.fireCd <= 0) this.startReload(c);

    let mx = c.moveX, mz = c.moveZ;
    const ml = Math.hypot(mx, mz);
    if (ml > 1) { mx /= ml; mz /= ml; }
    if (c.state === 'fall') {
      c.noGravity = true;
      const dive = c.pitch < -0.5 ? -52 : -36;
      c.vel.y = lerp(c.vel.y, dive, Math.min(1, dt * 2));
      c.vel.x = lerp(c.vel.x, mx * 24, Math.min(1, dt * 2.5));
      c.vel.z = lerp(c.vel.z, mz * 24, Math.min(1, dt * 2.5));
      const agl = c.pos.y - Math.max(WORLD.WATER, WORLD.heightAt(c.pos.x, c.pos.z));
      if (agl < 50 || (c.wantDeploy && agl < 140)) { c.state = 'glide'; if (c.isPlayer) SFX.play('glide', 0.6); }
    } else if (c.state === 'glide') {
      c.noGravity = true;
      c.vel.y = lerp(c.vel.y, c.pitch < -0.5 ? -12 : -8, Math.min(1, dt * 3));
      c.vel.x = lerp(c.vel.x, mx * 17, Math.min(1, dt * 2));
      c.vel.z = lerp(c.vel.z, mz * 17, Math.min(1, dt * 2));
    } else {
      c.noGravity = false;
      let speed = 7.2;
      if (c.sprint && !c.ads && !c.using && ml > 0) speed = 9.6;
      speed *= c.speedMult || 1;
      if (c.ads) speed = 4.6;
      if (c.using) speed = 3.2;
      if (c.inWater) speed *= 0.6;
      c.knockT = Math.max(0, (c.knockT || 0) - dt);
      const k = c.knockT > 0 ? Math.min(1, dt * 1.5) : c.onGround ? Math.min(1, dt * 14) : Math.min(1, dt * 3);
      c.vel.x = lerp(c.vel.x, mx * speed, k);
      c.vel.z = lerp(c.vel.z, mz * speed, k);
      if (c.wantJump && c.onGround) { c.vel.y = 9.8; c.onGround = false; }
    }
    c.wantJump = false;
    const impact = PHYS.moveChar(c, dt);
    // a launch pad's upward throw turns into a skydive at the top
    if (c.launching && c.vel.y < 4) { c.launching = false; c.state = 'fall'; }
    if ((c.state === 'glide' || c.state === 'fall') && c.onGround) {
      c.state = 'ground'; c.vel.y = 0; c.noGravity = false;
      if (c.isPlayer) { const poi = WORLD.pois.find(p => dist2D(p.x, p.z, c.pos.x, c.pos.z) < p.r); if (poi) { STATS.event('land'); HUD.banner(poi.name.toUpperCase(), 'Named location'); } }
    }
    else if (c.state === 'ground' && impact > 23 && !c.power && !c.launching) this.damage(c, (impact - 23) * 4.5, null, { direct: true, fall: true });
    this.animate(c, dt);
  },

  updateHeld(c) {
    const m = c.model;
    if (c.heldKey === 'glove' && m.active && m.heldParent !== m.active.bones.handR) c.heldKey = ''; // the model swapped detail level: move the glove over
    const item = c.buildType ? null : this.currentItem(c);
    // the Infinity Gauntlet harvesting tool (from the live event) is only a look: same swing, damage and range
    const glove = item && item.id === 'pickaxe' && c.isPlayer && PROFILE.data.pickaxe === 'gauntlet' && (PROFILE.data.tools || []).includes('gauntlet');
    const key = !item ? 'none' : glove ? 'glove' : item.kind === 'weapon' ? item.id + item.rarity : 'c' + item.id;
    if (key === c.heldKey) return;
    c.heldKey = key;
    if (m.held) { (m.heldParent || m.hand).remove(m.held); m.held = null; m.heldParent = null; }
    if (!item) return;
    // boss beams come out of their hands: nothing to hold
    if (item.kind === 'weapon' && WEAPONS[item.id] && WEAPONS[item.id].noMesh) return;
    if (glove) { // worn over the whole fist: fitted to the hand's own finger bones, so it covers them and moves with the hand
      const hb = m.active && m.active.bones && m.active.bones.handR;
      m.held = ITEMS.itemMesh({ kind: 'power', id: 'thanos' });
      if (!hb) { m.hand.add(m.held); m.heldParent = m.hand; return; }
      // which way the fist points, from the middle finger bones (directions only: skins store their finger bones
      // at different scales, so sizes come from the character's height instead)
      m.root.updateMatrixWorld(true);
      const k = 1 / (hb.getWorldScale(new THREE.Vector3()).x || 1), pts = [], M = new THREE.Matrix4();
      let f = hb.children.find((o) => /middle_metacarpal|middle_01/i.test(o.name));
      while (f) { f.updateMatrix(); M.multiply(f.matrix); pts.push(new THREE.Vector3().setFromMatrixPosition(M)); f = f.children.find((o) => o.isBone); }
      const knuckle = pts[Math.min(1, pts.length - 1)] || new THREE.Vector3(0, 1, 0), tip = pts[pts.length - 1] || knuckle;
      const along = knuckle.clone().normalize(), curl = tip.clone().sub(knuckle);
      curl.addScaledVector(along, -curl.dot(along)); if (curl.lengthSq() < 1e-8) curl.set(0, 0, 1); curl.normalize();
      const gPalm = new THREE.Vector3(...GLOVE_PALM), gSide = new THREE.Vector3(0, 1, 0).cross(gPalm), hSide = along.clone().cross(curl);
      const A = new THREE.Matrix4().makeBasis(gSide, new THREE.Vector3(0, 1, 0), gPalm), Bm = new THREE.Matrix4().makeBasis(hSide, along, curl);
      m.held.quaternion.setFromRotationMatrix(Bm.multiply(A.transpose()));
      // size: about a fist and a forearm cuff for this character (0.7 = the glove model's length)
      const len = 0.15 * (c.height || 1.85) * GLOVE_FIT;
      m.held.scale.multiplyScalar(len * k / 0.7);
      m.held.position.copy(along).multiplyScalar(0.035 * (c.height || 1.85) * k).addScaledVector(curl, len * GLOVE_SINK * k);
      hb.add(m.held); m.heldParent = hb; return;
    }
    m.held = item.kind === 'weapon' ? ITEMS.gunMesh(item.id, item.rarity) : ITEMS.itemMesh(item);
    if (item.kind === 'cons') { m.held.scale.setScalar(0.6); m.held.rotation.x = Math.PI / 2; }
    else if (m.held.userData.real) { m.held.scale.setScalar(1); m.held.position.set(0, 0, 0); }
    else if (m.v1) { m.held.scale.setScalar(0.85); m.held.position.set(0, 0, -0.05); }
    else { m.held.scale.setScalar(1.3); m.held.position.set(0.04, 0.05, 0); }
    m.hand.add(m.held);
  },

  animate(c, dt) {
    this.animateRig(c, dt);
    const m = c.model;
    if (!m.v1 || !m.root.visible) return;
    // skip characters that are off-screen or too far to see; only nearby ones cast shadows
    const d2 = GFX.camera.position.distanceToSquared(c.pos);
    if (d2 > (PERF.on ? 200 * 200 : 320 * 320) || !this.inView(c)) { m.root.visible = false; return; }
    const near = d2 < 70 * 70;
    if (near !== m.shadow) { m.shadow = near; for (const p of m.parts) p.castShadow = near; }
    // huge lobbies (Reload 500): only the nearest characters get their real model, the rest are drawn
    // as simple batched figures in their outfit colors
    if (G.chars.length > 120 && !c.isPlayer && !c.isBoss) {
      if (G.time - this._rankT > 0.25 || G.time < this._rankT) this.rankCrowd();
      if (!c.detail) { m.root.visible = false; this.crowdQ.push(c); return; }
    }
    // close-up detail model near the camera (always for you), light model for everyone else
    SKINS.setLod(m, c.isPlayer || d2 < (m.active.lod === 'hi' ? 34 : 28) ** 2 ? 'hi' : 'lo');
    // far-away players only re-pose their skeleton every 4th frame
    const far = d2 > (PERF.on ? 70 * 70 : 180 * 180);
    const pose = ANIMS.pose(m, this.animState(c), dt); // advances every frame, even when the pose isn't applied
    if (far && (Math.floor(G.time * 30) + c.id) % 4 !== 0) return;
    m.body.rotation.y = c.emote && pose ? pose.yaw : 0;
    SKINS.sync(m, G.time + c.id, c.state === 'glide' || c.state === 'fall', m.hand.visible && near, pose);
  },

  _rankT: -1, crowdQ: [], crowd: null,
  rankCrowd() {
    this._rankT = G.time;
    const cam = GFX.camera.position, N = PERF.on ? 18 : 32;
    const list = G.chars.filter(c => c.alive && c.model && !c.dormant && c.state !== 'bus' && !c.isPlayer && !c.isBoss);
    for (const c of list) c._d2 = cam.distanceToSquared(c.pos);
    list.sort((a, b) => a._d2 - b._d2);
    let n = 0;
    for (const c of list) { c.detail = n < N && this.inView(c); if (c.detail) n++; }
  },
  // draw this frame's queued crowd figures (legs, body, head) in three instanced batches
  flushCrowd() {
    // hidden characters (far away, out of view, dead, on the bus) leave the scene graph: their
    // skeletons are ~180 bones each, and three.js updates every object in the scene each frame
    for (const c of G.chars) {
      const r = c.model && c.model.root;
      if (!r) continue;
      if (r.visible) { if (!r.parent) GFX.scene.add(r); }
      else if (r.parent === GFX.scene) GFX.scene.remove(r);
    }
    const q = this.crowdQ;
    if (!this.crowd && !q.length) return;
    if (!this.crowd) {
      const L = () => new THREE.MeshLambertMaterial({ color: 0xffffff });
      const legs = new THREE.BoxGeometry(0.46, 0.8, 0.26); legs.translate(0, 0.4, 0);
      const body = new THREE.BoxGeometry(0.56, 0.7, 0.32); body.translate(0, 1.15, 0);
      const head = new THREE.BoxGeometry(0.32, 0.32, 0.32); head.translate(0, 1.68, 0);
      this.crowd = [[legs, 'pants'], [body, 'shirt'], [head, 'skin']].map(([g, key]) => {
        const im = new THREE.InstancedMesh(g, L(), 520); im.frustumCulled = false; im.userData.key = key;
        im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(520 * 3), 3);
        im.count = 0; GFX.scene.add(im); return im;
      });
    }
    const d = this._dummy || (this._dummy = new THREE.Object3D()), col = this._col || (this._col = new THREE.Color());
    const n = Math.min(q.length, 520);
    for (let i = 0; i < n; i++) {
      const c = q[i], s = c.size || 1;
      d.position.copy(c.pos); d.rotation.set(0, c.yaw || 0, 0); d.scale.setScalar(s); d.updateMatrix();
      for (const im of this.crowd) { im.setMatrixAt(i, d.matrix); im.setColorAt(i, col.setHex((c.colors && c.colors[im.userData.key]) || 0x888888)); }
    }
    for (const im of this.crowd) { im.count = n; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; if (!im.parent) GFX.scene.add(im); }
    q.length = 0;
  },

  // Which animation clip fits what this character is doing. Arms stay procedural while aiming,
  // building, healing or swinging the pickaxe; skydiving and gliding stay fully procedural.
  animState(c) {
    if (c.cineAnim) return c.cineAnim; // the finale cinematic picks its fighters' animations
    if (c.state === 'fall' || c.state === 'glide') return null;
    if (c.emote && c.alive) return EMOTES.state(c.emote.id);
    const item = c.buildType ? null : this.currentItem(c);
    const procArms = !!(c.buildType || c.using || c.swingT > 0 || (item && item.kind === 'cons') || (item && item.kind === 'weapon' && item.id !== 'pickaxe'));
    const hs = Math.hypot(c.vel.x, c.vel.z);
    if (c.inWater) return { key: 'swim', rate: 1, procArms };
    if (!c.onGround) return { key: 'air', rate: 1, procArms };
    if (hs < 0.6) return { key: 'idle', rate: 1, procArms };
    const key = hs < 4 ? 'walk' : hs < 8.6 ? 'jog' : 'sprint';
    return { key, rate: clamp(hs / (ANIM_CLIPS[key].speed * (c.size || 1)), 0.6, 1.9), procArms };
  },

  _frustum: new THREE.Frustum(), _pm: new THREE.Matrix4(), _sphere: new THREE.Sphere(new THREE.Vector3(), 2.2), _fKey: -1,
  inView(c) {
    if (this._fKey !== G.time) {
      const cam = GFX.camera;
      cam.updateMatrixWorld();
      this._pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
      this._frustum.setFromProjectionMatrix(this._pm);
      this._fKey = G.time;
    }
    this._sphere.center.set(c.pos.x, c.pos.y + 1, c.pos.z);
    return this._frustum.intersectsSphere(this._sphere);
  },

  animateRig(c, dt) {
    const m = c.model;
    m.root.position.copy(c.pos);
    m.root.rotation.y = c.yaw;
    this.updateHeld(c);
    const hs = Math.hypot(c.vel.x, c.vel.z);
    m.glider.visible = c.state === 'glide';
    if (m.v1) m.hand.visible = c.state === 'ground' && !c.emote;
    if (c.state === 'fall') {
      m.body.rotation.x = -1.25; m.body.position.y = 0.9;
      m.armL.rotation.set(0, 0, -1.2); m.armR.rotation.set(0, 0, 1.2);
      m.legL.rotation.x = 0.2; m.legR.rotation.x = 0.2;
      return;
    }
    m.body.rotation.x = 0; m.body.position.y = 0;
    if (c.state === 'glide') {
      if (m.v1) { m.armL.rotation.set(-0.5, 0, -0.45); m.armR.rotation.set(-0.5, 0, 0.45); }
      else { m.armL.rotation.set(0, 0, -2.6); m.armR.rotation.set(0, 0, 2.6); }
      c.animT += dt * 3;
      m.legL.rotation.x = Math.sin(c.animT) * 0.25; m.legR.rotation.x = -Math.sin(c.animT) * 0.25;
      return;
    }
    if (c.onGround && hs > 0.5) c.animT += dt * hs * 1.5;
    const sw = c.onGround ? Math.sin(c.animT) * Math.min(1, hs / 7) * 0.75 : 0.35;
    m.legL.rotation.x = sw; m.legR.rotation.x = c.onGround ? -sw : -0.15;
    if (c.cineArms) { c.cineArms(m, sw); return; } // the finale cinematic poses its fighters' arms
    const item = c.buildType ? null : this.currentItem(c);
    m.armL.rotation.z = 0; m.armR.rotation.z = 0;
    if (c.buildType) {
      m.armR.rotation.x = Math.PI / 2 + c.pitch * 0.7; m.armL.rotation.x = -sw * 0.8;
    } else if (item && item.kind === 'weapon' && item.id === 'pickaxe') {
      if (c.isPlayer && PROFILE.data.pickaxe === 'gauntlet') {
        // Infinity Gauntlet: a straight punch (snaps out, pulls back) instead of the pickaxe chop; fist up in between
        const k = c.swingT > 0 ? 1 - c.swingT / 0.32 : 1, e = c.swingT > 0 ? (k < 0.35 ? k / 0.35 : 1 - (k - 0.35) / 0.65) : 0;
        m.armR.rotation.x = 1.0 + e * 0.75 + c.pitch * 0.4; m.armL.rotation.x = 1.1;
        m.armR.rotation.z = (m.v1 ? -1 : 1) * (0.18 + e * 0.12); // aimed in toward the middle, not out to the side
        return;
      }
      const s = c.swingT > 0 ? Math.sin((1 - c.swingT / 0.32) * Math.PI) : 0;
      m.armR.rotation.x = 0.6 + s * 1.9 + c.pitch * 0.3;
      m.armL.rotation.x = -sw * 0.8;
    } else if (item && item.kind === 'weapon') {
      const aim = Math.PI / 2 + c.pitch;
      const kick = c.fireCd > 0 && WEAPONS[item.id].rate < 2 ? 0.15 : 0;
      const rl = c.reloading ? -0.5 : 0;
      m.armR.rotation.x = aim + kick + rl; m.armR.rotation.z = 0.08;
      m.armL.rotation.x = aim - 0.1 + kick + rl; m.armL.rotation.z = m.v1 ? 0.5 : -0.5;
    } else if (item && item.kind === 'cons') {
      m.armR.rotation.x = c.using ? 1.6 + Math.sin(G.time * 10) * 0.2 : 1.0; m.armL.rotation.x = c.using ? 1.4 : -sw * 0.8;
    } else { m.armR.rotation.x = -sw * 0.8; m.armL.rotation.x = sw * 0.8; }
  },
};
