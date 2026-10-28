'use strict';
// ===== Building: walls, floors, ramps, cones on a 4-unit grid =====
const BUILD = {
  pieces: new Map(),
  growing: [],
  ghost: null,
  MAX_HP: { wood: 150, brick: 250, metal: 350 },
  TIME: { wood: 1.1, brick: 1.7, metal: 2.4 },
  growMats: {},

  init() {
    this.ghost = new THREE.Mesh(GEO.floor, MATS.buildGhost);
    this.ghost.visible = false;
    this.ghost.renderOrder = 5;
    for (const k of ['wood', 'brick', 'metal']) {
      this.growMats[k] = MATS.build[k].clone();
      this.growMats[k].transparent = true; this.growMats[k].opacity = 0.55;
    }
  },
  attachGhost() { if (this.ghost.parent !== GFX.scene) GFX.scene.add(this.ghost); },

  pickMat(c) {
    if (c.mats[c.buildMat] >= 10) return c.buildMat;
    for (const m of ['wood', 'brick', 'metal']) if (c.mats[m] >= 10) return m;
    return null;
  },

  plan(c, type) {
    const fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw);
    const pitch = c.pitch;
    const base = Math.floor(c.pos.y / 4 + 0.35) * 4;
    const majorX = Math.abs(fx) > Math.abs(fz);
    const p = { type };
    if (type === 'wall') {
      const ix = Math.floor(c.pos.x / 4), iz = Math.floor(c.pos.z / 4);
      const y = base + (pitch > 0.6 ? 4 : 0);
      p.lvl = Math.round(y / 4);
      if (majorX) {
        const ex = ix + (fx > 0 ? 1 : 0);
        p.key = 'W:x:' + ex + ':' + iz + ':' + p.lvl;
        p.solid = { type: 'box', x0: ex * 4 - 0.15, x1: ex * 4 + 0.15, z0: iz * 4, z1: iz * 4 + 4, y0: y, y1: y + 4 };
        p.geo = GEO.wallAlongZ; p.pos = new THREE.Vector3(ex * 4, y + 2, iz * 4 + 2);
      } else {
        const ez = iz + (fz > 0 ? 1 : 0);
        p.key = 'W:z:' + ix + ':' + ez + ':' + p.lvl;
        p.solid = { type: 'box', x0: ix * 4, x1: ix * 4 + 4, z0: ez * 4 - 0.15, z1: ez * 4 + 0.15, y0: y, y1: y + 4 };
        p.geo = GEO.wallAlongX; p.pos = new THREE.Vector3(ix * 4 + 2, y + 2, ez * 4);
      }
      p.check = { x: p.pos.x, z: p.pos.z, top: y + 4 };
      return p;
    }
    let ix, iz;
    if (type === 'floor' && pitch < -1.0) { ix = Math.floor(c.pos.x / 4); iz = Math.floor(c.pos.z / 4); }
    else { ix = Math.floor((c.pos.x + fx * 2.8) / 4); iz = Math.floor((c.pos.z + fz * 2.8) / 4); }
    const cx = ix * 4 + 2, cz = iz * 4 + 2;
    if (type === 'floor') {
      const y = base + (pitch > 0.3 ? 4 : 0);
      p.key = 'F:' + ix + ':' + Math.round(y / 4) + ':' + iz;
      p.solid = { type: 'box', x0: ix * 4, x1: ix * 4 + 4, z0: iz * 4, z1: iz * 4 + 4, y0: y - 0.15, y1: y + 0.15 };
      p.geo = GEO.floor; p.pos = new THREE.Vector3(cx, y, cz);
      p.check = { x: cx, z: cz, top: y + 0.15 };
    } else if (type === 'ramp') {
      const y = base;
      const dir = majorX ? (fx > 0 ? 0 : 2) : (fz > 0 ? 1 : 3);
      p.key = 'R:' + ix + ':' + Math.round(y / 4) + ':' + iz;
      p.solid = { type: 'ramp', x0: ix * 4, x1: ix * 4 + 4, z0: iz * 4, z1: iz * 4 + 4, y0: y, y1: y + 4, dir };
      p.geo = GEO.ramp; p.pos = new THREE.Vector3(cx, y + 2, cz); p.ry = RAMP_RY[dir]; p.rz = Math.PI / 4;
      p.check = { x: cx, z: cz, top: y + 4 };
    } else {
      const y = base + (pitch < -0.3 ? 0 : 4);
      p.key = 'C:' + ix + ':' + Math.round(y / 4) + ':' + iz;
      p.solid = { type: 'cone', x0: ix * 4, x1: ix * 4 + 4, z0: iz * 4, z1: iz * 4 + 4, y0: y, y1: y + 2 };
      p.geo = GEO.cone; p.pos = new THREE.Vector3(cx, y + 1, cz);
      p.check = { x: cx, z: cz, top: y + 2 };
    }
    return p;
  },
  valid(p) {
    if (this.pieces.has(p.key)) return false;
    if (p.check.top < WORLD.heightAt(p.check.x, p.check.z) + 0.3) return false;
    return true;
  },

  place(c, type) {
    const mat = this.pickMat(c);
    if (!mat) return null;
    const p = this.plan(c, type);
    if (!this.valid(p)) return null;
    c.mats[mat] -= 10;
    const mesh = new THREE.Mesh(p.geo, this.growMats[mat]);
    mesh.position.copy(p.pos);
    if (p.ry !== undefined) mesh.rotation.set(0, p.ry, p.rz);
    mesh.castShadow = SETTINGS.quality === 'high'; mesh.receiveShadow = true;
    WORLD.group.add(mesh);
    const s = p.solid;
    s.kind = 'build'; s.mat = mat; s.mesh = mesh; s.key = p.key; s.owner = c;
    s.maxHp = this.MAX_HP[mat]; s.hp = s.maxHp * 0.2; s.destructible = true; s.buildT = 0;
    PHYS.add(s);
    PHYS.byKey.set('b:' + p.key, s);
    this.pieces.set(p.key, s);
    this.growing.push(s);
    if (NET.inMatch) NET.ev({ t: 'bp', key: p.key, mat, pos: [p.pos.x, p.pos.y, p.pos.z], ry: p.ry, rz: p.rz, s: { type: s.type, x0: s.x0, x1: s.x1, z0: s.z0, z1: s.z1, y0: s.y0, y1: s.y1, dir: s.dir } });
    SFX.play('build', c.isPlayer ? 0.7 : 0.5, c.isPlayer ? null : p.pos);
    if (c.isPlayer) STATS.event('build');
    return s;
  },
  // a piece someone else in the party built
  placeRemote(m) {
    if (this.pieces.has(m.key)) return;
    const k = m.key[0], geo = k === 'W' ? (m.key[2] === 'x' ? GEO.wallAlongZ : GEO.wallAlongX) : k === 'F' ? GEO.floor : k === 'R' ? GEO.ramp : GEO.cone;
    const mesh = new THREE.Mesh(geo, this.growMats[m.mat] || this.growMats.wood);
    mesh.position.set(m.pos[0], m.pos[1], m.pos[2]);
    if (m.ry !== undefined && m.ry !== null) mesh.rotation.set(0, m.ry, m.rz || 0);
    mesh.castShadow = SETTINGS.quality === 'high'; mesh.receiveShadow = true;
    WORLD.group.add(mesh);
    const s = Object.assign({}, m.s);
    s.kind = 'build'; s.mat = m.mat; s.mesh = mesh; s.key = m.key; s.owner = null;
    s.maxHp = this.MAX_HP[m.mat] || 150; s.hp = s.maxHp * 0.2; s.destructible = true; s.buildT = 0;
    PHYS.add(s); PHYS.byKey.set('b:' + m.key, s);
    this.pieces.set(m.key, s);
    this.growing.push(s);
    SFX.play('build', 0.5, mesh.position);
  },
  onDamaged(s) { /* hp shown via HUD when aimed at */ },
  removePiece(s) {
    if (this.pieces.get(s.key) === s) this.pieces.delete(s.key);
    const i = this.growing.indexOf(s);
    if (i >= 0) this.growing.splice(i, 1);
  },

  updateGhost(c, type) {
    if (!type) { this.ghost.visible = false; return; }
    const p = this.plan(c, type);
    const ok = this.valid(p) && !!this.pickMat(c);
    this.ghost.geometry = p.geo;
    this.ghost.material = ok ? MATS.buildGhost : MATS.buildGhostBad;
    this.ghost.position.copy(p.pos);
    this.ghost.rotation.set(0, p.ry || 0, p.rz || 0);
    this.ghost.visible = true;
  },

  update(dt) {
    for (let i = this.growing.length - 1; i >= 0; i--) {
      const s = this.growing[i];
      const T = this.TIME[s.mat];
      s.buildT += dt;
      s.hp = Math.min(s.maxHp, s.hp + s.maxHp * 0.8 * dt / T);
      if (s.buildT >= T) { s.mesh.material = MATS.build[s.mat]; this.growing.splice(i, 1); }
    }
  },
  clear() { this.pieces.clear(); this.growing = []; if (this.ghost) this.ghost.visible = false; },
};
