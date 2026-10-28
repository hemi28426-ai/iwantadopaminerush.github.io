'use strict';
// ===== Player input, controls and camera =====
const INPUT = {
  keys: {}, pressed: new Set(), lmb: false, rmb: false, lmbPressed: false,
  dx: 0, dy: 0, wheel: 0, locked: false, fallback: false, lockFailed: false,
  init(canvas) {
    window.addEventListener('keydown', (e) => {
      if (e.target && e.target.tagName === 'INPUT') return; // typing in chat / a form
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && G.phase !== 'menu') e.preventDefault();
      if (!this.keys[e.code]) this.pressed.add(e.code);
      this.keys[e.code] = true;
      // E fires too (for trackpads) whenever there's nothing to open or pick up
      if (e.code === 'KeyE' && !e.repeat && G.inMatch() && !PC.interact && G.player && G.player.state === 'ground' && !G.player.vehicle) { this.lmb = true; this.lmbPressed = true; this.eFire = true; }
      if (e.code === 'Escape' && HUD.mapOpen) HUD.toggleMap();
      if (e.code === 'Escape' && this.fallback && G.inMatch()) G.togglePause();
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; if (e.code === 'KeyE' && this.eFire) { this.lmb = false; this.eFire = false; } });
    window.addEventListener('blur', () => { this.keys = {}; this.lmb = this.rmb = false; });
    canvas.addEventListener('mousedown', (e) => {
      SFX.init();
      if (G.inMatch() && !G.paused) this.lock(canvas);
      if (e.button === 0) { this.lmb = true; this.lmbPressed = true; }
      if (e.button === 2) this.rmb = true;
    });
    window.addEventListener('mouseup', (e) => { if (e.button === 0) this.lmb = false; if (e.button === 2) this.rmb = false; });
    window.addEventListener('mousemove', (e) => {
      // without a lock (no API, or a re-lock was refused) the mouse still turns the camera until the next click locks it
      if (this.locked || ((this.fallback || this.lockFailed) && G.inMatch() && !G.paused)) { this.dx += e.movementX || 0; this.dy += e.movementY || 0; }
    });
    canvas.addEventListener('wheel', (e) => { this.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('pointerlockchange', () => {
      const was = this.locked;
      this.locked = document.pointerLockElement === canvas;
      if (this.locked) this.setFailed(false);
      if (was && !this.locked && HUD.mapOpen) HUD.toggleMap();
      if (was && !this.locked) EMOTES.closeWheel(false);
      if (was && !this.locked && G.inMatch() && !G.paused) G.togglePause(true);
    });
    // browsers refuse a re-lock for about a second after Esc: never give up, just retry on the next click
    document.addEventListener('pointerlockerror', () => this.setFailed(true));
  },
  lock(canvas) {
    if (this.locked || this.fallback) return;
    if (!canvas.requestPointerLock) { this.fallback = true; return; } // no pointer lock in this browser at all
    try {
      const r = canvas.requestPointerLock();
      if (r && r.catch) r.catch(() => this.setFailed(true));
    } catch (e) { this.setFailed(true); }
  },
  setFailed(v) {
    this.lockFailed = v;
    const el = document.getElementById('locknote');
    if (el) el.hidden = !(v && G.inMatch() && !G.paused);
  },
  endFrame() { this.pressed.clear(); this.lmbPressed = false; this.dx = this.dy = 0; this.wheel = 0; },
};

const RECOIL = { bosscannon: 0, armcannon: 0.004, laser: 0, ar: 0.006, smg: 0.004, shotgun: 0.06, sniper: 0.08, pistol: 0.014, rocket: 0.05, minigun: 0.003, handcannon: 0.07, quad: 0.03, frag: 0 };

const PC = {
  c: null, camYaw: 0, camPitch: -0.15, firstPerson: false, zoom: 0, lastBuildT: 0, lastPiece: 'wall',
  interact: null, spectating: null, camDist: 3.4,
  camDir: new THREE.Vector3(), aimPoint: new THREE.Vector3(),

  reset(c) { this.c = c; this.camYaw = 0; this.camPitch = -0.15; this.zoom = 0; this.firstPerson = false; this.spectating = null; this.lastPiece = 'wall'; },
  recoil(W) {
    const id = Object.keys(WEAPONS).find(k => WEAPONS[k] === W);
    this.camPitch += (RECOIL[id] || 0.01) * (this.c.ads ? 0.6 : 1);
    G.shake = Math.max(G.shake, id === 'shotgun' || id === 'sniper' ? 0.12 : 0.03);
  },

  update(dt) {
    const c = this.c;
    // emote wheel open: the mouse picks a slice instead of turning the camera
    if (EMOTES.wheelOpen) {
      EMOTES.nudge(INPUT.dx, INPUT.dy); INPUT.dx = INPUT.dy = 0;
      const P0 = INPUT.pressed;
      if (P0.has('KeyB') || INPUT.lmbPressed) EMOTES.closeWheel(true);
      else if (P0.has('Escape') || !c.alive || c.state !== 'ground') EMOTES.closeWheel(false);
      else for (const k of P0) if (EMOTES.key(k)) break;
      P0.clear(); INPUT.lmbPressed = false; INPUT.lmb = false;
      return;
    }
    const scoped = c.ads && !c.buildType && CHARS.currentItem(c) && CHARS.currentItem(c).id === 'sniper';
    const sens = SETTINGS.sens * 0.0022 * (c.ads ? (scoped ? 0.3 : 0.65) : 1);
    this.camYaw -= INPUT.dx * sens;
    this.camPitch -= INPUT.dy * sens * (SETTINGS.invertY ? -1 : 1);
    const K = INPUT.keys;
    if (K.ArrowLeft) this.camYaw += dt * 2.4;
    if (K.ArrowRight) this.camYaw -= dt * 2.4;
    if (K.ArrowUp) this.camPitch += dt * 1.6;
    if (K.ArrowDown) this.camPitch -= dt * 1.6;
    this.camPitch = clamp(this.camPitch, -1.45, 1.35);
    this.camYaw = wrapAngle(this.camYaw);
    if (!c.alive) return;

    const P = INPUT.pressed;
    const f = (K.KeyW ? 1 : 0) - (K.KeyS ? 1 : 0), s = (K.KeyD ? 1 : 0) - (K.KeyA ? 1 : 0);
    // driving: W/S throttle, A/D steer, Space handbrake, E gets out (the mouse still looks around)
    if (c.vehicle) {
      if (P.has('KeyE')) { VEH.exit(c); P.delete('KeyE'); }
      else { VEH.drive(c, f, s, !!K.Space, dt); c.pitch = this.camPitch; if (P.has('KeyM')) HUD.toggleMap(); return; }
    }
    if (c.zip && P.has('Space')) { ZIPS.drop(c); P.delete('Space'); }
    // emoting: the camera orbits freely; moving, jumping, shooting or switching items ends it
    if (c.emote) {
      const quit = f || s || K.Space || INPUT.lmbPressed || INPUT.rmb || c.state !== 'ground' || [...P].some(k => /^(Digit\d|Key[FQZXCVRBE])$/.test(k));
      if (quit) { CHARS.stopEmote(c); if (P.has('KeyB')) P.delete('KeyB'); INPUT.lmbPressed = false; }
      else { c.pitch = this.camPitch; c.moveX = c.moveZ = 0; c.wantJump = false; c.sprint = false; return; }
    }
    c.yaw = this.camYaw; c.pitch = this.camPitch;
    const sy = Math.sin(this.camYaw), cy = Math.cos(this.camYaw);
    c.moveX = -sy * f + cy * s; c.moveZ = -cy * f - sy * s;
    c.sprint = !!(K.ShiftLeft || K.ShiftRight);
    if (P.has('KeyM')) HUD.toggleMap();

    if (c.state === 'bus') {
      if (P.has('Space') || P.has('KeyE')) BUS.eject(c);
      return;
    }
    if (c.state === 'fall' || c.state === 'glide') {
      c.wantDeploy = !!K.Space;
      return;
    }
    c.wantJump = !!K.Space;
    if (P.has('KeyB') && c.onGround && !c.using) { EMOTES.openWheel((id) => CHARS.startEmote(c, id)); return; }

    // --- slots / build selection ---
    for (let i = 0; i < 5; i++) if (P.has('Digit' + (i + 1))) CHARS.equip(c, i);
    // Adam Smasher's 6th slot: 6 selects it, pressing again (or R) swaps arm cannon <-> hand laser
    if (c.slots[5] && c.isSmasher && !c.pw && (P.has('Digit6') || (P.has('KeyR') && c.sel === 5 && !c.buildType))) {
      if (c.sel === 5 && !c.buildType) { const s = c.slots[5]; s.id = s.id === 'armcannon' ? 'laser' : 'armcannon'; c.heldKey = ''; SFX.play('reload', 0.5); HUD.toast(WEAPONS[s.id].name); }
      else CHARS.equip(c, 5);
      P.delete('KeyR');
    }
    // boss powers (Doom / Iron Man / Thanos) take R, G and sometimes the click
    const powerClick = c.power ? POWERS.input(c, P, K) : false;
    // G (or H) switches to the harvest tool; while holding a boss power, G stays that power's move
    if (P.has('KeyH') || (P.has('KeyG') && !(c.pw && c.sel === 5))) CHARS.equip(c, -1);
    // T drops what you're holding (a gun, a heal, or the boss power), F stays for zooming in
    if (P.has('KeyT') && !c.buildType && !c.ultronForm) { // (Infinity Ultron's powers are his own: nothing to drop)
      if (c.sel === 5 && c.pw) { const id = c.power; ITEMS.spawnPickup({ kind: 'power', id }, c.pos.x + Math.sin(c.yaw) * -1.5, c.pos.y + 1.2, c.pos.z + Math.cos(c.yaw) * -1.5, true); POWERS.revoke(c, id); }
      else if (c.sel >= 0 && c.slots[c.sel] && !c.slots[c.sel].special) {
        ITEMS.spawnPickup(c.slots[c.sel], c.pos.x + Math.sin(c.yaw) * -1.5, c.pos.y + 1, c.pos.z + Math.cos(c.yaw) * -1.5, true);
        c.slots[c.sel] = null; c.reloading = false; c.using = null; CHARS.equip(c, -1);
      } else if (c.pw) { const id = c.power; ITEMS.spawnPickup({ kind: 'power', id }, c.pos.x + Math.sin(c.yaw) * -1.5, c.pos.y + 1.2, c.pos.z + Math.cos(c.yaw) * -1.5, true); POWERS.revoke(c, id); }
      SFX.play('pickup', 0.5);
    }
    if (INPUT.wheel !== 0 && !c.buildType) {
      const order = [-1]; c.slots.forEach((it, i) => { if (it) order.push(i); });
      let idx = order.indexOf(c.sel);
      idx = (idx + (INPUT.wheel > 0 ? 1 : -1) + order.length) % order.length;
      CHARS.equip(c, order[idx]);
    }
    const pieceKeys = { KeyZ: 'wall', KeyX: 'floor', KeyC: 'ramp', KeyV: 'cone' };
    if (G.zeroBuild) c.buildType = null;
    else {
      for (const k in pieceKeys) if (P.has(k)) { c.buildType = pieceKeys[k]; this.lastPiece = c.buildType; c.reloading = false; c.using = null; }
      if (P.has('KeyQ')) { c.buildType = c.buildType ? null : this.lastPiece; c.reloading = false; c.using = null; }
    }
    if (P.has('KeyR')) {
      if (c.buildType) { const ms = ['wood', 'brick', 'metal']; c.buildMat = ms[(ms.indexOf(c.buildMat) + 1) % 3]; SFX.play('click', 0.5); }
      else CHARS.startReload(c);
    }

    // crowns and teammates' reboot cards are picked up by walking over them
    for (const p of ITEMS.pickups) {
      const k = p.item.kind;
      if ((k !== 'crown' && k !== 'card' && k !== 'power') || !p.settled || p.pos.distanceTo(c.pos) > 2) continue;
      if (k === 'power') { POWERS.grant(c, p.item.id); SFX.play('pickup', 0.7); ITEMS.removePickup(p); break; }
      if (k === 'card' && (p.item.team !== c.team || p.item.nid === c.nid)) continue;
      if (k === 'crown') { CROWN.wear(c); PROFILE.data.crowned = true; PROFILE.save(); HUD.toast('You picked up a Victory Crown!'); }
      else { c.cards.push(p.item.nid); HUD.toast(`Got ${p.item.name}'s Reboot Card: take it to a Reboot Van`); }
      SFX.play('pickup', 0.7); ITEMS.removePickup(p); break;
    }
    // reboot: hold E at a van while carrying a teammate's card
    this.rebootPrompt = '';
    const van = c.cards.length ? REBOOT.nearVan(c.pos) : null;
    if (van) {
      if (G.time < van.readyAt) this.rebootPrompt = `Reboot Van recharging: ${Math.ceil(van.readyAt - G.time)} s`;
      else if (K.KeyE) {
        c.rebootT = (c.rebootT || 0) + dt;
        this.rebootPrompt = `Rebooting... ${Math.min(100, Math.round(c.rebootT / 5 * 100))}%`;
        if (c.rebootT >= 5) { c.rebootT = 0; REBOOT.reboot(c, van); }
        return;
      } else { c.rebootT = 0; this.rebootPrompt = '<kbd>E</kbd> Hold to reboot your teammate'; }
    } else c.rebootT = 0;

    // walking over a better copy of a gun you carry swaps it in (the old one drops)
    for (const p of ITEMS.pickups) {
      const it = p.item;
      if (it.kind !== 'weapon' || !p.settled || WEAPONS[it.id].throwable || Math.abs(p.pos.x - c.pos.x) > 1.5 || Math.abs(p.pos.z - c.pos.z) > 1.5 || Math.abs(p.pos.y - c.pos.y) > 2) continue;
      const i = c.slots.findIndex(s => s && s.kind === 'weapon' && s.id === it.id && !s.special && s.rarity < it.rarity);
      if (i < 0) continue;
      const old = c.slots[i];
      c.slots[i] = it;
      ITEMS.removePickup(p);
      ITEMS.spawnPickup(old, c.pos.x, c.pos.y + 0.6, c.pos.z, true);
      if (i === c.sel) { c.reloading = false; c.using = null; }
      CHARS.afterPickup(c, it);
      HUD.toast(`Upgraded to ${RARITY[it.rarity].name} ${WEAPONS[it.id].name}`);
      break;
    }

    // --- interaction ---
    this.interact = null;
    const ch = ITEMS.nearestChest(c.pos, 2.8);
    const pk = ITEMS.nearestPickup(c.pos, 2.9, p => p.item.kind === 'weapon' || p.item.kind === 'cons');
    if (ch && (!pk || ch.pos.distanceTo(c.pos) < pk.pos.distanceTo(c.pos))) this.interact = { type: 'chest', obj: ch };
    else if (pk) this.interact = { type: 'pickup', obj: pk };
    else if (!c.zip) {
      const car = VEH.nearest(c.pos, 3.6);
      if (car) this.interact = { type: 'car', obj: car };
      else { const z = ZIPS.near(c.pos, 3.2); if (z) this.interact = { type: 'zip', obj: z }; }
    }
    if (P.has('KeyE') && this.interact) {
      if (this.interact.type === 'car') { VEH.enter(c, this.interact.obj); return; }
      if (this.interact.type === 'zip') { ZIPS.grab(c, this.interact.obj); this.interact = null; return; }
      if (this.interact.type === 'chest') ITEMS.openChest(this.interact.obj, c);
      else if (!CHARS.pickup(c, this.interact.obj)) HUD.toast('Inventory full: select a slot (1-5) to swap');
    }
    for (const p of ITEMS.pickups) {
      if ((p.item.kind === 'ammo' || p.item.kind === 'mats') && p.settled && Math.abs(p.pos.x - c.pos.x) < 1.6 && Math.abs(p.pos.z - c.pos.z) < 1.6 && Math.abs(p.pos.y - c.pos.y) < 2) {
        CHARS.give(c, p.item); ITEMS.removePickup(p); CHARS.afterPickup(c, p.item); break;
      }
    }

    // --- aiming ---
    const item = CHARS.currentItem(c);
    c.ads = (INPUT.rmb || K.KeyF) && !c.buildType && item && item.kind === 'weapon' && item.id !== 'pickaxe';
    this.computeAim();
    if (c.buildType) {
      BUILD.updateGhost(c, c.buildType);
      if (INPUT.lmb && G.time - this.lastBuildT > 0.09) { if (BUILD.place(c, c.buildType)) this.lastBuildT = G.time; else if (INPUT.lmbPressed && !BUILD.pickMat(c)) HUD.toast('Not enough materials: harvest with your Harvest Tool (G)'); }
    } else {
      BUILD.updateGhost(c, null);
      if (item && item.kind === 'cons') { if (INPUT.lmbPressed) CHARS.startUse(c); }
      else if (item && INPUT.lmb && !powerClick) {
        if (item.id === 'pickaxe') CHARS.tryFire(c, this.camDir, null);
        else {
          const o = CHARS.muzzle(c, new THREE.Vector3());
          let d = this.aimPoint.clone().sub(o).normalize();
          if (c.isSmasher) d = this.autoAim(c, o, d);
          CHARS.tryFire(c, d, o);
        }
      }
    }
  },

  // Smasher auto-aim: lock onto the head of the visible enemy closest to the crosshair (within 25 degrees)
  autoAim(c, o, d) {
    let best = null, bestDot = Math.cos(25 * Math.PI / 180);
    for (const e of G.chars) {
      if (e === c || !e.alive || e.state === 'bus') continue;
      const head = new THREE.Vector3(e.pos.x, e.pos.y + 1.66 * (e.size || 1), e.pos.z);
      const to = head.clone().sub(o), dist = to.length();
      if (dist > 220) continue;
      to.divideScalar(dist);
      const dot = to.dot(d);
      if (dot <= bestDot) continue;
      const hit = PHYS.raycast(o, to, dist, { chars: false });
      if (hit) continue; // behind a wall
      bestDot = dot; best = to;
    }
    return best || d;
  },
  computeAim() {
    const cam = GFX.camera;
    const hit = PHYS.raycast(cam.position, this.camDir, 1200, { ignore: this.c });
    if (hit) this.aimPoint.copy(hit.point); else this.aimPoint.copy(cam.position).addScaledVector(this.camDir, 1200);
  },

  updateCamera(dt) {
    const cam = GFX.camera;
    let target = this.c;
    if (G.phase === 'dead' && this.spectating) target = this.spectating;
    const yaw = this.camYaw, pitch = this.camPitch;
    const dir = this.camDir.set(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    let pivot, back, side, fov = 72;
    const t = target;
    this.firstPerson = false;
    if (t.state === 'bus') {
      pivot = BUS.pos.clone().add(new THREE.Vector3(0, 4, 0)); back = 30; side = 0;
    } else if (t.state === 'fall' || t.state === 'glide') {
      pivot = t.pos.clone().add(new THREE.Vector3(0, 1.5, 0)); back = 7.5; side = 0; fov = 80;
    } else {
      pivot = t.pos.clone().add(new THREE.Vector3(0, (t.alive ? 1.62 : 1.0) * (t.size || 1), 0));
      const item = CHARS.currentItem(t);
      const ads = t === this.c && t.ads;
      const scoped = ads && item && item.id === 'sniper';
      this.zoom = lerp(this.zoom, ads ? 1 : 0, Math.min(1, dt * 14));
      back = lerp(3.4, 1.7, this.zoom) * (1 + ((t.size || 1) - 1) * 0.9); side = lerp(0.75, 0.65, this.zoom) * (t.size || 1);
      fov = lerp(t.state === 'ground' && t.sprint && Math.hypot(t.vel.x, t.vel.z) > 8 ? 78 : 72, scoped ? 18 : 52, this.zoom);
      if (scoped && this.zoom > 0.8) { back = 0; side = 0; this.firstPerson = true; pivot.y += 0.05; }
      if (G.phase === 'dead') { back = 6; side = 0; }
      if (t.emote) { back = 4.2 * (t.size || 1); side = 0; }
      if (t.vehicle) { pivot = t.vehicle.pos.clone().add(new THREE.Vector3(0, 2.8, 0)); back = 9; side = 0; fov = 76 + Math.abs(t.vehicle.speed) * 0.25; this.zoom = 0; }
    }
    const desired = pivot.clone().addScaledVector(right, side).addScaledVector(dir, -back);
    const toCam = desired.clone().sub(pivot);
    const len = toCam.length();
    if (len > 0.01) {
      toCam.divideScalar(len);
      const hit = PHYS.raycast(pivot, toCam, len, { chars: false });
      if (hit) desired.copy(pivot).addScaledVector(toCam, Math.max(0.2, hit.t - 0.3));
    }
    const gh = Math.max(WORLD.heightAt(desired.x, desired.z), WORLD.WATER) + 0.4;
    if (desired.y < gh) desired.y = gh;
    cam.position.copy(desired);
    if (G.shake > 0.001) {
      cam.position.x += (Math.random() - 0.5) * G.shake * 0.5;
      cam.position.y += (Math.random() - 0.5) * G.shake * 0.5;
      G.shake *= Math.pow(0.02, dt);
    }
    cam.lookAt(desired.clone().add(dir));
    if (Math.abs(cam.fov - fov) > 0.05) { cam.fov = lerp(cam.fov, fov, Math.min(1, dt * 12)); cam.updateProjectionMatrix(); }
  },
};
