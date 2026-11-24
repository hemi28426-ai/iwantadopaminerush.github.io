'use strict';
// ===== Victory Crowns and Reboot Vans =====
// Crowns: win a match and you start the next one wearing a Victory Crown. If you're eliminated it
//   drops for anyone to grab. Win while wearing one for a Crowned Victory Royale.
// Reboot (Duos / Squads): when a teammate is eliminated they leave a Reboot Card for 90 s. Pick it up,
//   take it to a Reboot Van and hold E for 5 s: they drop back in from the sky with a pistol.

const CROWN = {
  mesh() {
    const g = new THREE.Group(), gold = MATS.doomGold;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.14, 12, 1, true), gold); band.userData.ownGeo = true; g.add(band);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU, p = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 4), gold);
      p.position.set(Math.cos(a) * 0.19, 0.14, Math.sin(a) * 0.19); p.userData.ownGeo = true; g.add(p);
    }
    const gem = new THREE.Mesh(GEO.box, new THREE.MeshBasicMaterial({ color: 0x3d9bff })); gem.scale.setScalar(0.06); gem.position.set(0, 0.02, -0.22); g.add(gem);
    return g;
  },
  // put the crown on (it floats just above the head)
  wear(c) {
    if (c.crownMesh || !c.model) { c.crown = true; return; }
    c.crown = true;
    const m = this.mesh(); m.position.y = 1.98; c.model.root.add(m); c.crownMesh = m;
  },
  remove(c) { c.crown = false; if (c.crownMesh) { c.crownMesh.parent && c.crownMesh.parent.remove(c.crownMesh); c.crownMesh = null; } },
  // match start: whoever won last time is crowned (in a party, each friend's crown comes from the roster)
  begin() {
    for (const c of G.chars) {
      if (!c.human) continue;
      const crowned = c.isPlayer ? PROFILE.data.crowned : !!(NET.roster.find((r) => r.pid === c.peerId) || {}).crowned;
      if (crowned) this.wear(c);
    }
    if (G.player && G.player.crown) setTimeout(() => HUD.toast('You are wearing a Victory Crown. Win again for a Crowned Victory Royale!'), 4500);
  },
  // eliminated while crowned: it drops
  onElim(c) {
    if (!c.crown) return;
    this.remove(c); return;
    this.remove(c);
    ITEMS.spawnPickup({ kind: 'crown' }, c.pos.x, c.pos.y + 0.8, c.pos.z, true);
    if (c.isPlayer) { PROFILE.data.crowned = false; PROFILE.save(); }
  },
};

const REBOOT = {
  vans: [], cards: [],
  reset() { this.vans = []; this.cards = []; },
  // world generation: a van at the edge of about half the named places
  addVan(x, z, ry) {
    const y = WORLD.heightAt(x, z), g = new THREE.Group();
    const body = new THREE.Mesh(GEO.box, new THREE.MeshLambertMaterial({ color: 0x2f6fd6 })); body.scale.set(2.4, 2.2, 5); body.position.y = 1.4; body.castShadow = true; g.add(body);
    const stripe = new THREE.Mesh(GEO.box, new THREE.MeshLambertMaterial({ color: 0xffffff })); stripe.scale.set(2.45, 0.3, 5.05); stripe.position.y = 1.5; g.add(stripe);
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.2, 0.3, 12), MATS.houseMetal); dish.position.set(0, 2.8, 1); dish.rotation.x = -0.6; dish.userData.ownGeo = true; g.add(dish);
    const light = new THREE.Mesh(GEO.box, new THREE.MeshBasicMaterial({ color: 0x5cff7a })); light.scale.set(0.3, 0.3, 0.3); light.position.set(0, 2.65, -1.6); g.add(light);
    for (const [wx, wz] of [[-1.1, -1.7], [1.1, -1.7], [-1.1, 1.7], [1.1, 1.7]]) { const w = new THREE.Mesh(GEO.wheel, MATS.dark); w.position.set(wx, 0.4, wz); g.add(w); }
    g.position.set(x, y, z); g.rotation.y = ry;
    WORLD.group.add(g);
    PHYS.add({ type: 'box', kind: 'prop', x0: x - 1.6, x1: x + 1.6, z0: z - 1.6, z1: z + 1.6, y0: y - 0.5, y1: y + 2.6 });
    this.vans.push({ id: this.vans.length, x, y, z, light, readyAt: 0 });
  },
  // a squad teammate went down: their card drops (on every peer, from the elimination)
  onElim(c) {
    if (!G.squad || !c.human || !c.team) return;
    const card = { kind: 'card', nid: c.nid, team: c.team, name: c.name, until: G.time + 90 };
    const p = ITEMS.spawnPickup(card, c.pos.x, c.pos.y + 0.6, c.pos.z, true, 'card' + c.nid);
    this.cards.push({ card, pickup: p });
  },
  update(dt) {
    for (const v of this.vans) v.light.material.color.setHex(G.time >= v.readyAt ? 0x5cff7a : 0xff5a5a);
    // cards fade after 90 s
    for (let i = this.cards.length - 1; i >= 0; i--) {
      const k = this.cards[i];
      if (G.time > k.card.until) { if (k.pickup && ITEMS.pickups.includes(k.pickup)) ITEMS.removePickup(k.pickup); this.cards.splice(i, 1); }
    }
  },
  nearVan(pos) { return this.vans.find((v) => dist2D(v.x, v.z, pos.x, pos.z) < 4.5 && Math.abs(v.y - pos.y) < 3); },
  // you held E long enough at a van: bring everyone whose card you carry back
  reboot(c, van) {
    van.readyAt = G.time + 90;
    const ids = c.cards.splice(0);
    SFX.play('chest', 0.8);
    for (const nid of ids) {
      if (NET.client) NET.sendReboot(nid, van.id);
      else this.revive(nid, van.id);
    }
  },
  // (host / solo) a squadmate comes back: they drop in above the van
  revive(nid, vanId) {
    const c = NET.inMatch ? NET.byNid[nid] : G.chars.find((x) => x.nid === nid);
    const van = this.vans[vanId];
    if (!c || c.alive || !van) return;
    if (NET.host) NET.broadcast({ t: 'revive', n: nid, v: vanId });
    this.bringBack(c, van);
  },
  bringBack(c, van) {
    c.alive = true; c.state = 'fall'; c.deathT = 0; c.hp = 100; c.shield = 0; c.netDeadSent = 0;
    c.pos.set(van.x + rand(-3, 3), van.y + 70, van.z + rand(-3, 3)); c.vel.set(0, 0, 0);
    c.slots = [ITEMS.makeWeapon('pistol', 0), null, null, null, null]; c.sel = 0; c.ammo.light = Math.max(c.ammo.light, 48);
    if (c.model) c.model.root.visible = true;
    HUD.killfeedText(`<b>${esc(c.name)}</b> was rebooted`);
    if (c.isPlayer) {
      G.phase = 'playing'; G.awaitReboot = false; PC.spectating = null;
      show('endscreen', false); show('spectate', false);
      HUD.banner('YOU WERE REBOOTED', 'Your team brought you back. Glide down and get a gun!');
      SFX.play('victory', 0.5);
    }
  },
};
