'use strict';
// ===== Getting around the big island: cars, launch pads and ziplines =====
// Cars: E to get in or out, W/S throttle, A/D steer, Space handbrake. They knock trees over, run
//   people down, can be shot to pieces and blow up. The driver's game drives the car; in a party the
//   car follows its driver on everyone else's screen.
// Launch pads: step on one to be thrown high into the sky, then skydive and glide.
// Ziplines: E near a cable to ride it, Space to let go.
const CAR = { len: 4.2, wid: 2.1, max: 34, rev: 10, accel: 15, brake: 30, drag: 3, grip: 1.9 };

const VEH = {
  list: [],
  reset() { this.list = []; },

  // a parked car (built during world generation, so every player gets the same cars)
  spawn(x, z, yaw, color) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(GEO.box, new THREE.MeshLambertMaterial({ color }));
    body.scale.set(2.1, 0.9, 4.2); body.position.y = 0.85; body.castShadow = true;
    const cab = new THREE.Mesh(GEO.box, new THREE.MeshLambertMaterial({ color: 0x9fd3ff }));
    cab.scale.set(1.8, 0.7, 2.0); cab.position.set(0, 1.6, 0.2);
    const lights = new THREE.Mesh(GEO.box, new THREE.MeshBasicMaterial({ color: 0xfff3b0 }));
    lights.scale.set(1.7, 0.18, 0.06); lights.position.set(0, 0.95, -2.12);
    g.add(body, cab, lights);
    const wheels = [];
    for (const [wx, wz] of [[-1, -1.3], [1, -1.3], [-1, 1.3], [1, 1.3]]) { const w = new THREE.Mesh(GEO.wheel, MATS.dark); w.position.set(wx, 0.4, wz); g.add(w); wheels.push(w); }
    WORLD.group.add(g); WORLD.props.push(g);
    const car = { id: this.list.length, mesh: g, wheels, pos: new THREE.Vector3(x, WORLD.heightAt(x, z), z), yaw, speed: 0, steer: 0, driver: null, hp: 400, hitCd: new Map(), alive: true };
    car.solid = PHYS.add({ type: 'box', kind: 'prop', x0: 0, x1: 0, z0: 0, z1: 0, y0: 0, y1: 0, mesh: g, mat: 'metal', hp: 400, maxHp: 400, destructible: true, vehicle: car });
    this.place(car);
    this.list.push(car);
    return car;
  },
  // move the mesh and the collision box to the car's position (tilted to the ground)
  place(car) {
    const p = car.pos, fw = this.fwd(car.yaw), rt = { x: -fw.z, z: fw.x };
    const hF = WORLD.heightAt(p.x + fw.x * 1.6, p.z + fw.z * 1.6), hB = WORLD.heightAt(p.x - fw.x * 1.6, p.z - fw.z * 1.6);
    const hL = WORLD.heightAt(p.x - rt.x * 0.9, p.z - rt.z * 0.9), hR = WORLD.heightAt(p.x + rt.x * 0.9, p.z + rt.z * 0.9);
    p.y = Math.max(WORLD.WATER, (hF + hB + hL + hR) / 4);
    const m = car.mesh;
    m.position.set(p.x, p.y, p.z);
    m.rotation.set(Math.atan2(hF - hB, 3.2), car.yaw, -Math.atan2(hR - hL, 1.8), 'YXZ');
    const c = Math.abs(Math.cos(car.yaw)), s = Math.abs(Math.sin(car.yaw));
    const hx = c * CAR.wid / 2 + s * CAR.len / 2, hz = s * CAR.wid / 2 + c * CAR.len / 2;
    const S = car.solid;
    if (S.alive) PHYS.remove(S);
    S.x0 = p.x - hx; S.x1 = p.x + hx; S.z0 = p.z - hz; S.z1 = p.z + hz; S.y0 = p.y - 0.5; S.y1 = p.y + 1.95;
    if (car.alive) PHYS.add(S);
  },
  fwd(yaw) { return { x: -Math.sin(yaw), z: -Math.cos(yaw) }; },
  nearest(pos, r) {
    let best = null, bd = r * r;
    for (const car of this.list) { if (!car.alive || car.driver) continue; const d = car.pos.distanceToSquared(pos); if (d < bd) { bd = d; best = car; } }
    return best;
  },

  enter(c, car) {
    car.driver = c; c.vehicle = car; c.buildType = null; c.using = null; c.reloading = false; c.ads = false;
    if (c.isPlayer) { PC.camYaw = car.yaw; SFX.play('build', 0.6); }
  },
  exit(c) {
    const car = c.vehicle;
    if (!car) return;
    car.driver = null; c.vehicle = null;
    const fw = this.fwd(car.yaw);
    // step out on the driver's side
    const x = car.pos.x - fw.z * 2.2, z = car.pos.z + fw.x * 2.2;
    c.pos.set(x, Math.max(WORLD.heightAt(x, z), car.pos.y) + 0.6, z);
    c.vel.set(fw.x * car.speed * 0.3, 2, fw.z * car.speed * 0.3);
    c.state = 'ground';
  },

  // the driver's input: f in [-1, 1] throttle, s in [-1, 1] steer, brake on/off
  drive(c, f, s, brake, dt) {
    const car = c.vehicle;
    if (!car || !car.alive) { c.vehicle = null; return; }
    if (brake) car.speed = car.speed > 0 ? Math.max(0, car.speed - CAR.brake * dt) : Math.min(0, car.speed + CAR.brake * dt);
    else if (f > 0) car.speed = Math.min(CAR.max, car.speed + (car.speed < 0 ? CAR.brake : CAR.accel) * dt);
    else if (f < 0) car.speed = Math.max(-CAR.rev, car.speed - (car.speed > 0 ? CAR.brake : CAR.accel * 0.7) * dt);
    else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), CAR.drag * dt);
    car.steer = lerp(car.steer, s, Math.min(1, dt * 6));
    const turn = car.steer * CAR.grip * clamp(Math.abs(car.speed) / 10, 0, 1) * Math.sign(car.speed || 1) * (brake ? 1.5 : 1);
    car.yaw = wrapAngle(car.yaw - turn * dt);
    this.move(car, dt);
    c.pos.set(car.pos.x, car.pos.y + 0.6, car.pos.z);
    c.vel.set(0, 0, 0); c.onGround = true; c.state = 'ground';
    c.yaw = car.yaw;
  },
  move(car, dt) {
    if (Math.abs(car.speed) < 0.05) { car.speed = 0; return; }
    const fw = this.fwd(car.yaw), step = car.speed * dt, dir = Math.sign(car.speed);
    const nx = car.pos.x + fw.x * step, nz = car.pos.z + fw.z * step;
    // the nose: water, cliffs and solid things stop the car; trees and wooden builds get flattened
    const px = nx + fw.x * dir * CAR.len / 2, pz = nz + fw.z * dir * CAR.len / 2;
    const hNose = WORLD.heightAt(px, pz);
    if (hNose < 0.4 || hNose - car.pos.y > 2.2) { car.speed *= -0.25; return; }
    const hits = PHYS.query(px - 1.1, pz - 1.1, px + 1.1, pz + 1.1, []);
    for (const s of hits) {
      if (s === car.solid || !s.alive || s.y1 < car.pos.y + 0.3 || s.y0 > car.pos.y + 1.8) continue;
      const inside = px > s.x0 - 0.9 && px < s.x1 + 0.9 && pz > s.z0 - 0.9 && pz < s.z1 + 0.9;
      if (!inside) continue;
      if (s.destructible && (s.kind === 'tree' || s.mat === 'wood') && Math.abs(car.speed) > 9) { WORLD.hitSolid(s, 9999, car.driver, false); car.speed *= 0.7; continue; }
      if (s.vehicle) { this.damage(s.vehicle, Math.abs(car.speed) * 4, car.driver); }
      this.damage(car, Math.abs(car.speed) * 2, null);
      car.speed *= -0.3;
      return;
    }
    car.pos.x = nx; car.pos.z = nz;
    for (const w of car.wheels) w.rotation.x -= step / 0.4;
    this.place(car);
    // run people over
    if (Math.abs(car.speed) > 6 && car.driver) {
      for (const o of G.chars) {
        if (o === car.driver || !o.alive || o.dormant || o.vehicle || o.state !== 'ground') continue;
        if ((car.driver.team && o.team === car.driver.team) || dist2D(o.pos.x, o.pos.z, car.pos.x, car.pos.z) > 2.6 || Math.abs(o.pos.y - car.pos.y) > 2.5) continue;
        if ((car.hitCd.get(o) || 0) > G.time) continue;
        car.hitCd.set(o, G.time + 0.8);
        CHARS.damage(o, Math.abs(car.speed) * 2.4, car.driver, { weapon: 'a car', direct: false });
        o.vel.x += fw.x * car.speed * 0.8; o.vel.z += fw.z * car.speed * 0.8; o.vel.y = 7; o.onGround = false; o.knockT = 0.6;
        SFX.play('destroy', 0.5, o.pos);
      }
    }
  },
  damage(car, amount, by) {
    if (!car.alive) return;
    car.solid.hp -= amount;
    if (car.solid.hp <= 0) this.explode(car, by);
  },
  explode(car, by) {
    if (!car.alive) return;
    car.alive = false; car.solid.alive = false;
    PHYS.remove(car.solid);
    const d = car.driver;
    if (d) { this.exit(d); }
    FX.explodeAt(new THREE.Vector3(car.pos.x, car.pos.y + 1, car.pos.z), by || null, 55, 6, 200);
    if (car.mesh.parent) car.mesh.parent.remove(car.mesh);
  },
  // cars nobody drives roll to a stop; cars driven by friends follow them
  update(dt) {
    for (const car of this.list) {
      if (!car.alive) continue;
      const d = car.driver;
      if (d && (!d.alive || d.vehicle !== car)) { car.driver = null; continue; }
      if (!d && car.speed !== 0) { car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 12 * dt); this.move(car, dt); }
      // engine hum for the car you're in
      if (d && d.isPlayer && Math.abs(car.speed) > 1 && (this._hum = (this._hum || 0) - dt) <= 0) { this._hum = 0.18; SFX.play('engine', 0.15 + Math.abs(car.speed) / CAR.max * 0.2); }
    }
  },
  // a remote driver's car follows their character (multiplayer)
  follow(c, id) {
    const car = this.list[id];
    if (!car || !car.alive) return;
    if (car.driver !== c) { if (car.driver) car.driver.vehicle = null; car.driver = c; c.vehicle = car; }
    car.pos.set(c.pos.x, car.pos.y, c.pos.z); car.yaw = c.yaw;
    this.place(car);
  },
};

const PADS = {
  list: [],
  reset() { this.list = []; },
  add(x, z) {
    const y = WORLD.heightAt(x, z);
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.3, 20), new THREE.MeshLambertMaterial({ color: 0x5a2fb8 })); base.position.y = 0.15; base.userData.ownGeo = true;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.06, 20), new THREE.MeshBasicMaterial({ color: 0xb98bff })); top.position.y = 0.33; top.userData.ownGeo = true;
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.9, 4), new THREE.MeshBasicMaterial({ color: 0xffffff })); arrow.position.y = 1.2; arrow.userData.ownGeo = true;
    g.add(base, top, arrow);
    g.position.set(x, y, z);
    WORLD.group.add(g);
    this.list.push({ x, z, y, arrow });
  },
  update(dt) {
    for (const p of this.list) { p.arrow.position.y = 1.2 + Math.sin(G.time * 3) * 0.2; p.arrow.rotation.y += dt * 2; }
    const c = G.player;
    if (!c || !c.alive || c.state !== 'ground' || c.vehicle || c.zip) return;
    for (const p of this.list) {
      if (dist2D(c.pos.x, c.pos.z, p.x, p.z) < 1.5 && Math.abs(c.pos.y - p.y) < 1.5) { this.launch(c); break; }
    }
  },
  // straight up, then you skydive and glide wherever you like
  launch(c) {
    c.vel.y = 48; c.onGround = false; c.launching = true;
    SFX.play('shield', 0.7);
    FX.sparkle(new THREE.Vector3(c.pos.x, c.pos.y + 0.5, c.pos.z), 0xb98bff);
  },
};

const ZIPS = {
  list: [],
  reset() { this.list = []; },
  // a cable from a to b (pole tops), sagging a little in the middle
  add(a, b) {
    const pole = (p) => { const m = new THREE.Mesh(GEO.box, MATS.dark); m.scale.set(0.35, p.h, 0.35); m.position.set(p.x, p.y + p.h / 2, p.z); WORLD.group.add(m); };
    const A = { x: a.x, z: a.z, y: WORLD.heightAt(a.x, a.z), h: 7 }, B = { x: b.x, z: b.z, y: WORLD.heightAt(b.x, b.z), h: 7 };
    pole(A); pole(B);
    const z = { a: new THREE.Vector3(A.x, A.y + A.h, A.z), b: new THREE.Vector3(B.x, B.y + B.h, B.z) };
    z.len = z.a.distanceTo(z.b);
    const pts = [];
    for (let i = 0; i <= 24; i++) pts.push(this.at(z, i / 24));
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x222222 }));
    line.userData.ownGeo = true;
    WORLD.group.add(line);
    this.list.push(z);
  },
  at(z, t) { const p = z.a.clone().lerp(z.b, t); p.y -= Math.sin(t * Math.PI) * z.len * 0.04; return p; },
  // nearest point on any cable within reach of a character
  near(pos, r = 3) {
    let best = null, bd = r;
    for (const z of this.list) {
      for (let i = 0; i <= 40; i++) {
        const t = i / 40, p = this.at(z, t);
        const d = Math.hypot(p.x - pos.x, (p.y - 1.9) - pos.y, p.z - pos.z);
        if (d < bd) { bd = d; best = { z, t }; }
      }
    }
    return best;
  },
  grab(c, hit) {
    const toB = this.at(hit.z, Math.min(1, hit.t + 0.01)).sub(this.at(hit.z, hit.t));
    const look = new THREE.Vector3(-Math.sin(PC.camYaw), 0, -Math.cos(PC.camYaw));
    // near an end you always ride toward the other end; in the middle, the way you're looking
    const dir = hit.t < 0.15 ? 1 : hit.t > 0.85 ? -1 : (toB.x * look.x + toB.z * look.z >= 0 ? 1 : -1);
    c.zip = { z: hit.z, t: hit.t, dir };
    c.buildType = null;
    SFX.play('pickup', 0.5);
  },
  ride(c, dt) {
    const Z = c.zip, speed = 24 / Z.z.len;
    Z.t += Z.dir * speed * dt;
    const end = Z.t <= 0 || Z.t >= 1;
    Z.t = clamp(Z.t, 0, 1);
    const p = this.at(Z.z, Z.t);
    c.pos.set(p.x, p.y - 1.9, p.z);
    const d = Z.z.b.clone().sub(Z.z.a).multiplyScalar(Z.dir).normalize();
    c.vel.set(d.x * 24, 0, d.z * 24);
    c.yaw = Math.atan2(-d.x, -d.z);
    if (end) this.drop(c);
  },
  drop(c) { c.zip = null; c.vel.y = 5; c.onGround = false; c.state = 'ground'; },
};
