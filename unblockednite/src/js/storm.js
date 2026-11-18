'use strict';
// ===== The shrinking storm + the flying school bus drop =====
const STORM_PHASES = [
  { wait: 120, shrink: 70, frac: 0.5, dps: 1 },
  { wait: 60, shrink: 55, frac: 0.5, dps: 2 },
  { wait: 45, shrink: 40, frac: 0.5, dps: 4 },
  { wait: 35, shrink: 32, frac: 0.5, dps: 6 },
  { wait: 25, shrink: 25, frac: 0.5, dps: 8 },
  { wait: 20, shrink: 25, frac: 0.4, dps: 10 },
  { wait: 15, shrink: 30, frac: 0, dps: 12 },
];

// Reload: about 5 minutes from the bus to the last circle
const RELOAD_PHASES = [
  { wait: 50, shrink: 35, frac: 0.55, dps: 2 },
  { wait: 35, shrink: 30, frac: 0.5, dps: 3 },
  { wait: 25, shrink: 25, frac: 0.5, dps: 5 },
  { wait: 20, shrink: 20, frac: 0.5, dps: 7 },
  { wait: 15, shrink: 18, frac: 0.4, dps: 9 },
  { wait: 10, shrink: 20, frac: 0, dps: 12 },
];

const ARENA_PHASES = [
  { wait: 40, shrink: 30, frac: 0.5, dps: 3 },
  { wait: 25, shrink: 25, frac: 0.45, dps: 5 },
  { wait: 15, shrink: 20, frac: 0, dps: 10 },
];

const STORM = {
  P: STORM_PHASES,
  cur: { x: 0, z: 0, r: 1600 }, next: { x: 0, z: 0, r: 760 }, from: null,
  phase: 0, state: 'wait', timer: 0, dps: 1, tickT: 1, mesh: null, tex: null,

  start() {
    this.P = G.arena ? ARENA_PHASES : G.reload ? RELOAD_PHASES : STORM_PHASES;
    this.k = WORLD.HALF / 1100;
    this.cur = { x: 0, z: 0, r: 1600 * this.k };
    this.phase = 0; this.state = 'wait'; this.timer = this.P[0].wait; this.tickT = 1;
    this.pickNext(true);
    if (!this.mesh) {
      this.tex = canvasTex(64, (g, s) => {
        g.clearRect(0, 0, s, s);
        for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.25})`; g.fillRect(Math.random() * s, 0, 2 + Math.random() * 5, s); }
      });
      this.tex.repeat.set(60, 1);
      const mat = new THREE.MeshBasicMaterial({ color: 0x9a4dff, map: this.tex, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false, fog: false });
      this.mesh = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 900, 96, 1, true), mat);
      this.mesh.renderOrder = 2;
    }
    GFX.scene.add(this.mesh);
    this.syncMesh();
  },
  pickNext(first) {
    const P = this.P[this.phase];
    const nr = first ? 720 * this.k : this.cur.r * P.frac;
    let x = this.cur.x, z = this.cur.z;
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * TAU;
      const maxOff = first ? 420 * this.k : Math.max(0, this.cur.r - nr) * 0.85;
      const d = Math.sqrt(Math.random()) * maxOff;
      const tx = (first ? 0 : this.cur.x) + Math.cos(a) * d, tz = (first ? 0 : this.cur.z) + Math.sin(a) * d;
      if (WORLD.heightAt(tx, tz) > 2 || nr > 60) { x = tx; z = tz; if (WORLD.heightAt(tx, tz) > 2) break; }
    }
    this.next = { x, z, r: nr };
  },
  shrinking() { return this.state === 'shrink' || (this.state === 'wait' && this.timer < 20); },
  inCircle(x, z, c, m = 0) { return dist2D(x, z, c.x, c.z) < c.r + m; },
  isSafe(x, z, m = 0) { return this.inCircle(x, z, this.cur, m); },
  isSafeNext(x, z, m = 0) { return this.inCircle(x, z, this.next, m); },
  label() {
    if (this.state === 'done') return 'Final circle';
    return (this.state === 'wait' ? 'Storm shrinks in ' : 'Storm closing: ') + fmtTime(this.timer);
  },

  update(dt) {
    if (this.state !== 'done') {
      this.timer -= dt;
      if (this.state === 'wait' && this.timer <= 0) {
        this.state = 'shrink'; this.timer = this.P[this.phase].shrink;
        this.from = { ...this.cur };
        SFX.play('stormwarn', 0.6); HUD.banner('THE STORM IS CLOSING IN', 'Move to the safe zone (white circle on the map)');
      } else if (this.state === 'shrink') {
        const k = clamp(1 - this.timer / this.P[this.phase].shrink, 0, 1);
        this.cur.x = lerp(this.from.x, this.next.x, k); this.cur.z = lerp(this.from.z, this.next.z, k); this.cur.r = lerp(this.from.r, this.next.r, k);
        if (this.timer <= 0) {
          this.cur = { ...this.next };
          this.phase++;
          if (G.player && G.player.alive) STATS.event('storm');
          if (this.phase < this.P.length) { this.state = 'wait'; this.timer = this.P[this.phase].wait; this.pickNext(false); }
          else { this.state = 'done'; this.timer = 0; }
        }
      }
    }
    this.dps = this.P[Math.min(this.phase, this.P.length - 1)].dps;
    this.tickT -= dt;
    if (this.tickT <= 0) {
      this.tickT = 1;
      for (const c of G.chars) {
        if (!c.alive || c.state === 'bus' || c.isBoss || c.inArena) continue; // (LeBron's court in the sky is safe)
        if (!this.isSafe(c.pos.x, c.pos.z)) {
          CHARS.damage(c, this.dps, null, { storm: true, direct: true });
          if (c.isPlayer) SFX.play('storm', 0.5);
        }
      }
    }
    this.tex.offset.x += dt * 0.05;
    this.syncMesh();
  },
  syncMesh() {
    this.mesh.position.set(this.cur.x, 250, this.cur.z);
    this.mesh.scale.set(Math.max(0.5, this.cur.r), 1, Math.max(0.5, this.cur.r));
  },
  clear() { if (this.mesh) GFX.scene.remove(this.mesh); },
};

const BUS = {
  pos: new THREE.Vector3(), start: new THREE.Vector3(), dir: new THREE.Vector3(1, 0, 0),
  speed: 70, duration: 30, t: 0, active: false, mesh: null, Y: 175,

  // the Battle Bus: a yellow school bus (hood, rounded roof, framed windows, wheels, bumpers) hanging
  // under a blue-and-white striped balloon, with two thrusters and a fan on the back
  makeMesh() {
    const g = new THREE.Group(), own = (m) => { m.userData.ownGeo = true; return m; };
    const L = (c, o = {}) => new THREE.MeshLambertMaterial(Object.assign({ color: c }, o));
    const add = (geo, mat, x, y, z, sx = 1, sy = 1, sz = 1, parent = g) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; parent.add(m); return m; };
    const yellow = L(0xffc21a), dark = L(0x1d1d22), glass = L(0x9fd8ff, { emissive: 0x16304a }), chrome = L(0xd8dde4), white = L(0xffffff);
    // balloon: vertical blue / white panels from a canvas texture
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64;
    const c2 = cv.getContext('2d');
    for (let i = 0; i < 12; i++) { c2.fillStyle = i % 2 ? '#ffffff' : '#2f8cff'; c2.fillRect(i * 256 / 12, 0, 256 / 12 + 1, 64); }
    const tex = new THREE.CanvasTexture(cv);
    const balloon = own(add(new THREE.SphereGeometry(1, 28, 18), L(0xffffff, { map: tex }), 0, 11.5, -0.5, 7, 6.2, 8.5));
    own(add(new THREE.CylinderGeometry(1.4, 0.9, 1.4, 16), L(0x2f8cff), 0, 5.1, -0.5));
    // ropes from the balloon's base ring to the bus roof corners
    for (const [x, z] of [[-1.7, -4.8], [1.7, -4.8], [-1.7, 4.8], [1.7, 4.8]]) {
      const top = new THREE.Vector3(x * 0.4, 5.3, -0.5 + z * 0.12), bot = new THREE.Vector3(x, 2.25, z), mid = top.clone().add(bot).multiplyScalar(0.5);
      const r = own(add(new THREE.CylinderGeometry(0.05, 0.05, top.distanceTo(bot), 5), dark, mid.x, mid.y, mid.z));
      r.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), bot.clone().sub(top).normalize());
    }
    // body: lower box + rounded roof (half cylinder along the length)
    add(GEO.box, yellow, 0, 0, -0.6, 4, 3.2, 11.2);
    const roofGeo = new THREE.CylinderGeometry(2, 2, 11.2, 18, 1, false, 0, Math.PI);
    roofGeo.rotateZ(Math.PI / 2); roofGeo.rotateY(Math.PI / 2); // top half, running front to back
    own(add(roofGeo, yellow, 0, 1.6, -0.6, 1, 0.32, 1));
    // hood / engine in front, with grille and headlights
    add(GEO.box, yellow, 0, -0.6, 5.9, 3.6, 2, 2.2);
    add(GEO.box, dark, 0, -0.55, 7.02, 2.2, 1.2, 0.06);
    for (const x of [-1.35, 1.35]) own(add(new THREE.CylinderGeometry(0.32, 0.32, 0.12, 12), L(0xfff3b0, { emissive: 0x806a20 }), x, -0.3, 7.04)).rotation.x = Math.PI / 2;
    // black stripes and bumpers
    for (const y of [-0.55, 0.05]) add(GEO.box, dark, 0, y, -0.6, 4.06, 0.14, 11.26);
    add(GEO.box, chrome, 0, -1.55, 7.1, 3.9, 0.35, 0.3); add(GEO.box, chrome, 0, -1.55, -6.3, 3.9, 0.35, 0.3);
    // windows with frames down both sides, a windshield, a back window and a door
    for (let i = 0; i < 6; i++) for (const sx of [-1, 1]) {
      const z = -5 + i * 1.75;
      add(GEO.box, dark, sx * 2.02, 0.95, z, 0.04, 1.25, 1.45);
      add(GEO.box, glass, sx * 2.04, 0.95, z, 0.04, 1.05, 1.25);
    }
    add(GEO.box, dark, 0, 0.95, 4.82, 3.7, 1.4, 0.05); add(GEO.box, glass, 0, 0.95, 4.85, 3.4, 1.2, 0.05);
    add(GEO.box, glass, 0, 0.95, -6.22, 3, 1.1, 0.05);
    add(GEO.box, glass, 2.04, 0.2, 3.9, 0.04, 2.6, 0.95);
    // side sign
    const sc = document.createElement('canvas'); sc.width = 512; sc.height = 64;
    const s2 = sc.getContext('2d'); s2.fillStyle = '#1d1d22'; s2.fillRect(0, 0, 512, 64);
    s2.fillStyle = '#ffc21a'; s2.font = 'bold 44px Arial Black, Arial, sans-serif'; s2.textAlign = 'center'; s2.textBaseline = 'middle'; s2.fillText('UNBLOCKEDNITE', 256, 34);
    const sign = L(0xffffff, { map: new THREE.CanvasTexture(sc) });
    for (const sx of [-1, 1]) { const m = own(add(new THREE.PlaneGeometry(7, 0.85), sign, sx * 2.06, -0.95, -1)); m.rotation.y = sx * Math.PI / 2; }
    // wheels
    for (const z of [-4.2, 4.6]) for (const sx of [-1.75, 1.75]) {
      add(GEO.wheel, dark, sx, -1.7, z, 1.6, 1.6, 1.6);
      own(add(new THREE.CylinderGeometry(0.3, 0.3, 0.12, 10), chrome, sx * 1.2, -1.7, z)).rotation.z = Math.PI / 2;
    }
    // thrusters with flames, and a fan on the back
    const flames = [];
    for (const sx of [-2.6, 2.6]) {
      own(add(new THREE.CylinderGeometry(0.55, 0.7, 2.6, 14), chrome, sx, 1.2, -5.6)).rotation.x = Math.PI / 2;
      const f = own(add(new THREE.ConeGeometry(0.5, 2.2, 12), L(0xff8a1c, { emissive: 0xff5a00 }), sx, 1.2, -7.9));
      f.rotation.x = -Math.PI / 2; flames.push(f);
      add(GEO.box, dark, sx * 0.8, 1.2, -5.6, 1.3, 0.25, 0.4);
    }
    const props = [];
    const hub = own(add(new THREE.CylinderGeometry(0.35, 0.35, 0.5, 10), dark, 0, 0.6, -6.6)); hub.rotation.x = Math.PI / 2;
    const fan = new THREE.Group(); fan.position.set(0, 0.6, -6.9); g.add(fan);
    for (let i = 0; i < 3; i++) { const bl = add(GEO.box, white, 0, 0, 0, 0.35, 2.6, 0.08, fan); bl.rotation.z = i * Math.PI * 2 / 3; bl.position.set(Math.sin(i * 2.094) * 0, 0, 0); }
    props.push(fan);
    g.userData.props = props; g.userData.flames = flames; g.userData.balloon = balloon;
    return g;
  },
  begin() {
    const a = Math.random() * TAU;
    this.dir.set(Math.cos(a), 0, Math.sin(a));
    const perp = new THREE.Vector3(-this.dir.z, 0, this.dir.x);
    const k = WORLD.HALF / 1100, off = rand(-320, 320) * k;
    this.start.copy(this.dir).multiplyScalar(-1400 * k).addScaledVector(perp, off);
    this.start.y = this.Y;
    this.duration = 2800 * k / this.speed;
    this.t = 0; this.active = true;
    this.pos.copy(this.start);
    if (!this.mesh) this.mesh = this.makeMesh();
    this.mesh.visible = true;
    GFX.scene.add(this.mesh);
    this.mesh.rotation.y = Math.atan2(this.dir.x, this.dir.z);
    this.mesh.position.copy(this.pos);
  },
  end() { return this.start.clone().addScaledVector(this.dir, this.speed * this.duration); },
  update(dt) {
    if (!this.mesh) return;
    this.t += dt;
    this.pos.copy(this.start).addScaledVector(this.dir, this.speed * this.t);
    this.pos.y = this.Y + Math.sin(this.t * 0.8) * 1.5;
    this.mesh.position.copy(this.pos);
    for (const p of this.mesh.userData.props) p.rotation.z += dt * 25;
    for (const f of this.mesh.userData.flames || []) f.scale.set(1, 1 + Math.random() * 0.35, 1);
    if (this.active && this.t >= this.duration) {
      this.active = false;
      for (const c of G.chars) if (c.alive && c.state === 'bus') this.eject(c);
    }
    if (this.t > this.duration + 25) this.mesh.visible = false;
  },
  eject(c) {
    if (c.state !== 'bus') return;
    c.state = 'fall';
    c.pos.copy(this.pos).add(new THREE.Vector3(rand(-1.5, 1.5), -4, rand(-2, 2)));
    c.vel.copy(this.dir).multiplyScalar(this.speed * 0.3);
    c.vel.y = -5;
    c.model.root.visible = true;
    if (c.isPlayer) { SFX.play('glide', 0.5); HUD.banner('YOU JUMPED!', 'Hold Space to open your glider early, look down to dive faster'); }
  },
  clear() { if (this.mesh) GFX.scene.remove(this.mesh); this.active = false; },
};
