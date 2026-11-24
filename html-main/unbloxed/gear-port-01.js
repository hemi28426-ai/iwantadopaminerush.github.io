// Unbloxed gears, 1:1 ports (part 01) of the Roblox scripts in the user's Studio export:
//   DonutDeliveryVehicle, Snowball, TheFierySun, MarshmallowShooter, SuperFlyGoldBoombox, RukiryoCat, PurplePizzaLauncher, AnAlpacaYouKnow
// Loaded after gear-fx.js and gear-fx-1..5.js (GX.def here replaces their versions). Same numbers as the scripts: 1 stud = 1 unit,
// WalkSpeed 16 = normal, Roblox vertical velocities x0.42 (gravity 34 here, 196.2 there), a BodyForce that cancels a fraction f of
// gravity = gravity x(1-f), and the old wait() loops step at 30 Hz like Roblox's did. The gears' sounds are left out on purpose.
(function () {
  'use strict';
  const GX = window.GX; if (!GX) return;
  const V = GX.V, rnd = GX.rnd, TAU = Math.PI * 2;
  const TICK = 1 / 30, RG = 196.2, G = 34, VY = .42;
  let SIM = 0, simOn = false; // game time (s): advances once per GEARFX.frame, so timers follow the simulation, not the wall clock
  const now = () => { if (!simOn) { simOn = true; GX.fx({ up(dt) { SIM += dt; return true; }, end() { simOn = false; } }); } return SIM; };
  const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const ME = () => (typeof me !== 'undefined' ? me : null);
  const CH = () => (typeof chars !== 'undefined' ? chars : []);
  const kill = (m) => { if (m && m.parent) m.parent.remove(m); };
  const addFx = (m) => { m.userData.fx = 1; scene.add(m); return m; };
  const rootPos = (o) => o.pos.clone().add(new V(0, 3, 0)); // HumanoidRootPart / Torso
  const headPos = (o) => o.pos.clone().add(new V(0, 4.5, 0));
  function centered(gi, h, sc) { // a gear model centred on its middle (gearModel puts its lowest point at y=0)
    const g = GX.gearModel(gi, h, sc); if (!g) return null;
    const w = new THREE.Group(); g.position.y = -g.userData.size.y / 2; w.add(g); w.userData.size = g.userData.size; w.userData.fx = 1; return w;
  }
  function boxNormal(p, b) { // which face of box b the point p (just outside it) is facing
    if (p.x <= b.min.x) return new V(-1, 0, 0); if (p.x >= b.max.x) return new V(1, 0, 0);
    if (p.z <= b.min.z) return new V(0, 0, -1); if (p.z >= b.max.z) return new V(0, 0, 1);
    return new V(0, p.y >= (b.min.y + b.max.y) / 2 ? 1 : -1, 0);
  }

  // ---------- Roblox effects ----------
  // Fire: Size = flame size (studs), Heat = how fast the flames rise; Color (236,139,70) fades into SecondaryColor (139,80,55)
  const FIRE1 = new THREE.Color('#ec8b46'), FIRE2 = new THREE.Color('#8b5037');
  function flame(p, size, heat) {
    const r = size * rnd(.1, .2), life = rnd(.5, .85), m = GX.mk(GX.GS, GX.tm('#ec8b46', .8, true), p.clone().add(new V(rnd(-1, 1) * size * .1, 0, rnd(-1, 1) * size * .1)), r);
    const v = new V(rnd(-1, 1) * size * .06, heat * rnd(.6, 1) + size * .15, rnd(-1, 1) * size * .06); let t = 0;
    GX.fx({ up(dt) { t += dt; const f = Math.min(1, t / life); m.position.addScaledVector(v, dt); m.scale.setScalar(r * (1 - .55 * f)); m.material.color.copy(FIRE1).lerp(FIRE2, f); m.material.opacity = .8 * (1 - f); return t < life; }, end() { GX.drop(m); } });
  }
  function fire(getP, size = 5, heat = 9, secs = 1e9) {
    const F = { t: 0, em: 0, dead: false };
    F.up = (dt) => { if (F.dead || (F.t += dt) > secs) return false; const p = getP(); if (!p) return false; for (F.em -= dt; F.em <= 0; F.em += 1 / (12 + size)) flame(p, size, heat); return true; };
    return GX.fx(F);
  }
  function smokePuff(p, op) { // Smoke: Size .1, RiseVelocity ~0, grey, Opacity op
    const m = GX.mk(GX.GS, GX.tm('#7f7f7f', op), p, .3); let t = 0;
    GX.fx({ up(dt) { t += dt; m.position.y += .3 * dt; m.scale.setScalar(.3 + t * .6); m.material.opacity = op * Math.max(0, 1 - t / 1.4); return t < 1.4; }, end() { GX.drop(m); } });
  }
  // ParticleEmitter: up to cap points of Size `size`, each flying straight for its lifetime (no drag, no fade)
  let DOT = null;
  function dotTex() {
    if (DOT) return DOT; const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 30); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.3, 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64); x.fillStyle = 'rgba(255,255,255,.85)'; x.fillRect(31, 3, 2, 58); x.fillRect(3, 31, 58, 2);
    return (DOT = new THREE.CanvasTexture(c));
  }
  function emitter(cap, size) {
    const geo = new THREE.BufferGeometry(), pos = new Float32Array(cap * 3), col = new Float32Array(cap * 3), P = [];
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setDrawRange(0, 0);
    const mat = new THREE.PointsMaterial({ size, map: dotTex(), vertexColors: true, transparent: true, depthWrite: false });
    const pts = addFx(new THREE.Points(geo, mat)); pts.frustumCulled = false;
    return {
      add(x, y, z, vx, vy, vz, life, r, g, b) { if (P.length < cap) P.push({ x, y, z, vx, vy, vz, life, t: 0, r, g, b }); },
      up(dt) {
        for (let i = P.length - 1; i >= 0; i--) { const q = P[i]; if ((q.t += dt) > q.life) { P[i] = P[P.length - 1]; P.pop(); continue; } q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; }
        let n = 0; for (const q of P) { pos[n * 3] = q.x; pos[n * 3 + 1] = q.y; pos[n * 3 + 2] = q.z; col[n * 3] = q.r; col[n * 3 + 1] = q.g; col[n * 3 + 2] = q.b; n++; }
        geo.setDrawRange(0, n); geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
      },
      dispose() { kill(pts); geo.dispose(); mat.dispose(); }
    };
  }
  // a ScreenGui in the local player's PlayerGui: removed after secs, or when the player respawns (ResetOnSpawn)
  function screenGui(el, secs) {
    const m = ME(); if (!m) return; document.body.appendChild(el);
    const life = m.deaths, off = () => el.remove(), id = setTimeout(off, secs * 1000);
    GX.fx({ up() { return !!el.parentNode && !(m.deaths !== life && !m.ko); }, end() { clearTimeout(id); off(); } });
  }
  function whiteout(secs) { const e = document.createElement('div'); e.style.cssText = 'position:fixed;inset:0;background:#fff;pointer-events:none;z-index:41'; screenGui(e, secs); }
  function snowface() { // Snowball: one big snow glob (50-70% of the screen width, 5-7 s) + 20 flakes (5-10%, 3-9 s) on the screen
    const box = document.createElement('div'), W = innerWidth, H = innerHeight; box.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:41;overflow:hidden';
    const glob = (s, secs) => {
      const e = document.createElement('div'), px = s * W;
      e.style.cssText = `position:absolute;left:${(Math.random() - s / 2) * W}px;top:${(Math.random() - s / 2) * H}px;width:${px}px;height:${px}px;border-radius:47% 53% 44% 56%/52% 45% 55% 48%;transform:rotate(${rnd(0, 360)}deg);background:radial-gradient(circle at 44% 40%,#fff 0,#fbfdff 42%,rgba(226,236,250,.95) 58%,rgba(255,255,255,0) 70%)`;
      box.appendChild(e); setTimeout(() => e.remove(), secs * 1000);
    };
    glob(Math.random() * .2 + .5, 5 + Math.random() * 2);
    for (let i = 0; i < 20; i++) glob(Math.random() * .05 + .05, 3 + Math.random() * 6);
    screenGui(box, 10);
  }
  // an unanchored, collidable part in the world: a Box3 in the map's collision grid (registered in every cell its full size will cover)
  function addBox(min, max, fmin, fmax) {
    if (typeof addSolid !== 'function' || typeof GRID === 'undefined' || typeof solids === 'undefined' || typeof CELL === 'undefined') return null;
    const b = new THREE.Box3(min.clone(), max.clone()), keys = [];
    for (let i = Math.floor(fmin.x / CELL); i <= Math.floor(fmax.x / CELL); i++) for (let j = Math.floor(fmin.z / CELL); j <= Math.floor(fmax.z / CELL); j++) { const k = i + ',' + j; let l = GRID.get(k); if (!l) GRID.set(k, l = []); l.push(b); keys.push(k); }
    solids.push(b); return { b, keys };
  }
  function delBox(r) { if (!r) return; try { const i = solids.indexOf(r.b); if (i >= 0) solids.splice(i, 1); for (const k of r.keys) { const l = GRID.get(k), j = l ? l.indexOf(r.b) : -1; if (j >= 0) l.splice(j, 1); } } catch (e) { } }

  // ================= Donut Delivery Vehicle =================
  // Equip: you sit on the scooter (PlatformStand). W/S speed up (20/s to 70) / brake (56/s) and reverse (to 20), A/D turn (up to 5 rad/s),
  // Space hops (30 studs/s up for 0.1 s, 1.9 s reload, also in the air), X toggles the headlight, click eats a donut (2 s, 5 s reload, no heal).
  const DD = new WeakMap(); // the donut (Special) state lives in the tool's server script: it survives unequipping, not respawning
  const ddState = (o) => { let E = DD.get(o); if (!E || E.life !== o.deaths) DD.set(o, E = { life: o.deaths, active: 0, ready: 0, donut: null }); return E; };
  let DONUT = null;
  function donutMesh() { // Donut part 0.9x0.9x0.2, one of 2 meshes
    if (!DONUT) DONUT = { dough: new THREE.TorusGeometry(.3, .14, 10, 24), icing: new THREE.TorusGeometry(.3, .1, 8, 24) };
    const g = new THREE.Group(), d = new THREE.Mesh(DONUT.dough, GX.sm('#d79b55')), ic = new THREE.Mesh(DONUT.icing, GX.sm(Math.random() < .5 ? '#ff8fc6' : '#5a3020'));
    ic.position.z = .07; ic.scale.z = .9; g.add(d, ic); g.traverse((m) => { m.userData.fx = 1; }); return g;
  }
  function ddDrive(o, dt, mx, mz, jump) { // S.fly: runs inside physics(), after gravity, before the move
    const S = o.gx, Q = S && S.veh; if (!Q) return;
    const k = Math.min(1, (o.ground ? 9 : 2.7) * dt); if (k < 1) { o.vel.x /= 1 - k; o.vel.z /= 1 - k; } // undo the walk pull (WalkSpeed ~0): the BodyVelocity drives
    const real = Math.hypot(o.vel.x, o.vel.z); // Body.Velocity (walls already took their share)
    let fw = false, bk = false, lf = false, rt = false;
    if (S.hold > 0) jump = false;
    else if (o === ME() && typeof K !== 'undefined') { fw = !!K.KeyW; bk = !!K.KeyS; lf = !!K.KeyA; rt = !!K.KeyD; }
    else if (Math.hypot(mx, mz) > .1) { const da = wrapA(Math.atan2(mx, mz) - Q.yaw); lf = da > .12; rt = da < -.12; fw = Math.abs(da) < .9; }
    for (Q.acc += dt; Q.acc >= TICK; Q.acc -= TICK) { // ThrustUpdater: wait(1/60), which Roblox runs at 30 Hz
      Q.angv = Q.turn; // RotationForce.angularvelocity
      if (Math.abs(Q.turn) > .2) Q.turn -= .2 * Math.sign(Q.turn); else Q.turn = 0;
      if (!fw || bk) Q.move *= .99;
      const th = Math.hypot(Q.tx, Q.tz);
      if (real > 3 && th > 3 && Math.abs(real - th) > .7 * th) Q.move *= .9; // held back by something: lose speed
      if (fw) Q.move = Math.min(70, Q.move + 20 / 60);
      if (bk) Q.move = Math.max(-20, Q.move - 20 * (Q.move > 0 ? 2.8 : 1) / 60);
      if (lf) Q.turn = Math.min(5, Q.turn + .3);
      if (rt) Q.turn = Math.max(-5, Q.turn - .3);
      Q.tx = Math.sin(Q.yaw) * Q.move; Q.tz = Math.cos(Q.yaw) * Q.move; // ThrustForce.velocity along the torso's look direction
      Q.lean = -Q.turn * (Math.PI / 6) / 4;
    }
    Q.yaw += Q.angv * dt; o.yaw = Q.yaw;
    const r = Math.min(1, 25 * dt); o.vel.x += (Q.tx - o.vel.x) * r; o.vel.z += (Q.tz - o.vel.z) * r;
    const t = now(), sp = !!jump; // Space (KeyDown): JumpForce 30 for 0.1 s, then LastJump; 1.9 s reload
    if (sp && !Q.space && !Q.jumping && t - Q.lastJump > 1.9) { Q.jumping = true; Q.jumpEnd = t + .1; }
    Q.space = sp;
    if (Q.jumping) { o.vel.y = 30 * VY; if (t >= Q.jumpEnd) { Q.jumping = false; Q.lastJump = t; } }
  }
  GX.def('DonutDeliveryVehicle', {
    tip: 'W/S: drive · A/D: steer · Space: hop · X: headlight · click: eat a donut',
    sp: (o, S) => (S.veh ? 1e-4 : 1), jp: (o, S) => (S.veh ? 1e-4 : 1), // PlatformStand: no walking or jumping of your own
    on(o, S) {
      GX.mount(o, S, { sc: 1, seat: .5 }); // the Body sits 0.75 below and 0.75 ahead of the torso, resting on the ground
      if (S.ride) S.ride.g.position.z = .75; else o.c.body.position.y = 3.5;
      S.veh = { yaw: o.yaw, move: 0, turn: 0, angv: 0, acc: 0, tx: 0, tz: 0, lean: 0, roll: 0, jumping: false, jumpEnd: 0, lastJump: -1e9, space: true, smoke: 0, light: null, lit: false };
      S.fly = ddDrive;
      if (o.ground) { o.pos.y += 4; o.ground = false; } // SpawnVehicle lifts the torso by half the model's height + 1.5
    },
    off(o, S) {
      const Q = S.veh, E = DD.get(o); if (E && E.donut) { kill(E.donut); E.donut = null; }
      if (!Q) return; S.veh = null; S.fly = null;
      if (Q.light) { kill(Q.light.target); kill(Q.light); if (Q.light.dispose) Q.light.dispose(); }
      o.c.root.rotation.z = 0; o.c.body.position.y = 3;
      if (!o.ko) o.vel.set(0, -25 * VY, 0); // FreezePlayer
    },
    click(o, S) {
      const E = ddState(o), t = now(); if (t < E.ready) return true; // Special: Duration 2, ReloadTime 5
      E.active = t + 2; E.ready = t + 7;
      if (E.donut) kill(E.donut);
      const d = donutMesh(); d.position.set(0, -1.55, .22); d.rotation.y = Math.PI / 2; o.c.aL.add(d); E.donut = d; // welded to the left hand
      GX.later(2, () => { kill(d); if (E.donut === d) E.donut = null; });
      return true;
    },
    x(o, S) { // headlight: SpotLight Brightness 50, Range 20, Angle 45, (255,252,153), on the Body 1.25 up / 1.9 ahead
      const Q = S.veh; if (!Q) return;
      if (!Q.light) { const L = new THREE.SpotLight('#fffc99', 0, 20, Math.PI / 8, .3, 1); L.position.set(0, 4, 2.65); L.target.position.set(0, 4, 16); o.c.root.add(L, L.target); Q.light = L; }
      Q.lit = !Q.lit; Q.light.intensity = Q.lit ? 5 : 0;
    },
    tick(o, S, dt) {
      const Q = S.veh; if (!Q) return; const c = o.c, E = DD.get(o), t = now();
      c.lL.rotation.x = c.lR.rotation.x = -1.25; // Hold: seated...
      c.aR.rotation.x = -1.45; c.aR.rotation.z = .2; // ...hands on the handlebars
      if (E && E.life === o.deaths && t < E.active) { c.aL.rotation.x = -2.5 - .18 * Math.sin(t * 10); c.aL.rotation.z = -.85; } // Eat: the donut goes to the mouth
      else { c.aL.rotation.x = -1.45; c.aL.rotation.z = -.2; }
      Q.roll += (Q.lean - Q.roll) * Math.min(1, 3 * dt); c.root.rotation.z = Q.roll; // TurnGyro: lean into the turn
      const op = Math.min(Math.abs(Q.move), 10) / 10 * .5; // ExhaustSmoke.Opacity
      if (op > .01 && (Q.smoke -= dt) <= 0) { Q.smoke = .08; smokePuff(o.pos.clone().add(new V(0, 1.75, 0)).addScaledVector(GX.fwd(o), -1.95), op); }
    }
  });

  // ================= Snowball =================
  // Click: throw (from 10 studs in front of the head, 80 studs/s, BodyForce 40 = 29% of a 1-stud ball's weight), the hand empties for 0.3 s.
  // The next click makes a new snowball (0.2 s). It breaks on anything into 5 ice chunks (60 s); a hit player gets snow on the screen. No damage.
  const SB = new WeakMap(), SNOW_G = G * (1 - 40 / (.7 * RG));
  const sbState = (o) => { let B = SB.get(o); if (!B || B.life !== o.deaths) SB.set(o, B = { life: o.deaths, loaded: true, busy: 0, show: 0, load: 0 }); return B; };
  const CHUNKS = [];
  function chunk(p, v) { // Part 1x0.4x1, White, Ice (elasticity .15, friction .02), RotVelocity +-20
    while (CHUNKS.length >= 100) CHUNKS.shift().dead = true;
    for (let k = 0; k < 8 && GX.solidAt(p); k++) p.y += .5;
    const m = GX.mk(GX.GB, GX.sm('#f2f3f3'), p, new V(1, .4, 1)); m.rotation.set(rnd(0, TAU), rnd(0, TAU), rnd(0, TAU));
    const w = new V((Math.random() * 41 | 0) - 20, (Math.random() * 41 | 0) - 20, (Math.random() * 41 | 0) - 20), C = { dead: false, t: 0, rest: false };
    CHUNKS.push(C);
    C.up = (dt) => {
      if (C.dead || (C.t += dt) > 60 || m.position.y < -300) return false;
      if (C.rest) return true;
      v.y -= G * dt;
      const n = Math.max(1, Math.min(60, Math.ceil(v.length() * dt / .45))), sd = dt / n;
      for (let i = 0; i < n; i++) {
        const prev = m.position.clone(); m.position.addScaledVector(v, sd);
        const b = GX.solidAt(m.position); if (b) { const nn = boxNormal(prev, b), vn = v.dot(nn); m.position.copy(prev); if (vn < 0) v.addScaledVector(nn, -1.15 * vn); }
      }
      const gy = GX.groundY(m.position.x, m.position.z, m.position.y + .3);
      if (gy != null && m.position.y - gy < .3 && Math.abs(v.y) < 2) { // sliding on the ground
        m.position.y = gy + .2; v.y = 0;
        const sp = Math.hypot(v.x, v.z), fr = .02 * G * dt;
        if (sp <= fr) { v.x = v.z = 0; C.rest = true; m.rotation.x = m.rotation.z = 0; } else { v.x -= v.x / sp * fr; v.z -= v.z / sp * fr; }
        w.multiplyScalar(Math.max(0, 1 - 8 * dt)); m.rotation.x *= .85; m.rotation.z *= .85;
      }
      m.rotation.x += w.x * dt; m.rotation.y += w.y * dt; m.rotation.z += w.z * dt;
      return true;
    };
    C.end = () => { kill(m); const i = CHUNKS.indexOf(C); if (i >= 0) CHUNKS.splice(i, 1); };
    GX.fx(C);
  }
  function splat(p, vel, n) { // Explode(): Touched runs after the bounce (Plastic elasticity .5); chunks get 4-6x the ball's velocity
    const v = vel.clone(), vn = v.dot(n); if (vn < 0) v.addScaledVector(n, -1.5 * vn);
    for (let i = 0; i < 5; i++) { const cv = v.clone().multiplyScalar(4 + Math.random() * 2); cv.y *= VY; chunk(p.clone().addScaledVector(v, Math.random() * .05).add(new V(0, Math.random() * 3, 0)), cv); }
  }
  function throwSnow(o, S, p, vel) {
    const m = centered(S.gi, 1) || GX.mk(GX.GS, GX.sm('#f2f3f3'), null, .5); if (!m.parent) addFx(m); m.position.copy(p);
    let t = 0;
    GX.fx({
      up(dt) {
        if ((t += dt) > 10) return false;
        vel.y -= SNOW_G * dt;
        const n = Math.max(1, Math.ceil(vel.length() * dt / .4)), sd = dt / n;
        for (let i = 0; i < n; i++) {
          const prev = m.position.clone(); m.position.addScaledVector(vel, sd);
          const c = GX.charAt(m.position, .5, null); // the script's creator check never finds its tag: anyone can be hit
          if (c) { if (c === ME()) snowface(); const nn = m.position.clone().sub(c.pos); nn.y = 0; if (nn.lengthSq() < 1e-6) nn.set(-vel.x, 0, -vel.z); splat(m.position, vel, nn.normalize()); return false; }
          const b = GX.solidAt(m.position); if (b) { splat(prev, vel, boxNormal(prev, b)); return false; }
        }
        return true;
      },
      end() { kill(m); }
    });
  }
  GX.def('Snowball', {
    tip: 'click: throw the snowball · click again: make a new one',
    click(o, S) {
      const B = sbState(o), t = now(); if (t < B.busy) return true; // Tool.Enabled
      if (B.loaded) { B.loaded = false; B.busy = t + .3; B.show = B.load = 0; const hd = headPos(o), v = GX.aimPoint(o).sub(hd).normalize(); throwSnow(o, S, hd.addScaledVector(v, 10), v.multiplyScalar(80)); }
      else { B.busy = t + .2; B.show = t + .1; B.load = t + .2; }
      return true;
    },
    tick(o) { const B = sbState(o), t = now(); if (B.load && t >= B.load) { B.loaded = true; B.load = B.show = 0; } if (!B.loaded && !(B.show && t >= B.show)) GX.hideHand(o, .1); }
  });

  // ================= The Fiery Sun =================
  // Click: the sun leaves your hand and rises 2 studs per tick, growing 5% per tick, for 2.75 s (fire: Size 30, Heat 25; gone after 10 s).
  // You walk at WalkSpeed 2 with a sun headdress + eyes instead of your hats until 0.75 s after it strikes. Then every other player within
  // 240 studs gets a red beam; those it can see (the ray stops on their hat / held tool, not on a wall) are blinded (white screen 7 s),
  // set on fire (5 s) and take 45 damage, then 1.5 every 0.2 s for 2 s after 5 s. 13.75 s until the next sun.
  const SUN = new WeakMap(), BLIND = new WeakMap();
  const sunBusy = (o) => { const s = SUN.get(o); return !!s && s.life === o.deaths && now() < s.until; };
  let SUNG = null;
  function sunOutfit(o) { // HatPart (2x2x2, 0.8 above the head) + EyePart, the avatar's hats taken off
    const c = o.c, hid = [];
    for (const g of [c.H, c.HG]) if (g && g.visible) { g.visible = false; hid.push(g); }
    if (!SUNG) SUNG = { band: new THREE.CylinderGeometry(.66, .7, .32, 20, 1, true), ray: new THREE.ConeGeometry(.13, .55, 8), eye: new THREE.SphereGeometry(.09, 10, 8) };
    const g = new THREE.Group(), gold = new THREE.MeshStandardMaterial({ color: '#ffb21a', emissive: '#a04000', metalness: .6, roughness: .35, side: THREE.DoubleSide });
    const band = new THREE.Mesh(SUNG.band, gold); band.position.y = 2.15; g.add(band);
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, r = new THREE.Mesh(SUNG.ray, gold); r.position.set(Math.sin(a) * .72, 2.45, Math.cos(a) * .72); r.rotation.set(Math.cos(a) * .5, 0, -Math.sin(a) * .5); g.add(r); }
    for (const x of [-.22, .22]) { const e = new THREE.Mesh(SUNG.eye, GX.bm('#ffd23a')); e.position.set(x, 1.62, .6); g.add(e); }
    g.traverse((m) => { m.userData.fx = 1; }); c.body.add(g);
    return { off() { kill(g); gold.dispose(); for (const h of hid) h.visible = true; } };
  }
  function blindBurn(o, t) { // BlindScript
    BLIND.set(t, now() + 7);
    const mine = t === ME(), life = t.deaths;
    if (mine) whiteout(7);
    fire(() => (t.ko || t.deaths !== life ? null : GX.chest(t)), 5, 9, 5);
    GX.hurt(o, t, 45, { kb: 0, up: 0, blind: mine ? 0 : 7 });
    GX.later(5, () => { let n = 0; const burn = () => { if (t.ko || t.deaths !== life || n++ >= 10) return; GX.hurt(o, t, 1.5, { kb: 0, up: 0 }); GX.later(.2, burn); }; burn(); });
  }
  function sunStrike(o, sp) {
    for (const t of CH()) {
      if (t === o || t.ko || t.shield > 0) continue; // ForceField: skipped
      const tp = GX.chest(t), dist = sp.distanceTo(tp); if (dist > 240) continue;
      const dir = tp.clone().sub(sp).divideScalar(dist || 1);
      let end = null; // CastRay skips characters (CheckIntangible) and stops at the first other part
      for (let s = 1.5; s < dist - 2; s += 1.5) { const p = sp.clone().addScaledVector(dir, s); if (GX.solidAt(p)) { end = p; break; } }
      const worn = !!(t.a && (t.a.hat || t.a.hair)) || !!(t.c && t.c.sw && t.c.sw.visible) || t.w >= 0; // an Accoutrement or Tool for the ray to hit
      let blind = false;
      if (!end && worn) { blind = true; end = sp.clone().addScaledVector(dir, dist - 1.6); }
      if (!end) { for (let s = dist; s < 500; s += 2) { const p = sp.clone().addScaledVector(dir, s); if (GX.solidAt(p)) { end = p; break; } } if (!end) end = sp.clone().addScaledVector(dir, 500); }
      GX.beam(sp, end, '#ff2a1a', .1, .25, true); // FireBeam: 0.2 thick, Neon, Bright red, 0.25 s
      if (blind && !((BLIND.get(t) || 0) > now())) blindBurn(o, t);
    }
  }
  function launchSun(o, S) {
    const life = o.deaths, from = GX.hand(o), N = Math.ceil(2.75 / TICK); // wait() ticks while the sun rises
    GX.hideHand(o, 13.75);
    const sun = centered(S.gi, 0, 1) || GX.mk(GX.GS, GX.bm('#ffb21a'), null, .5); if (!sun.parent) addFx(sun);
    sun.position.copy(from); sun.rotation.y = o.yaw;
    const y0 = from.y, flames = fire(() => (sun.parent ? sun.position : null), 30, 25, 10), outfit = sunOutfit(o);
    GX.buff(GX.st(o), N * TICK + .75, { sp: 2 / 16, end() { outfit.off(); } }); // WalkSpeed 2 until the hats go back on
    let t = 0, n = 0, struck = false;
    GX.fx({
      up(dt) {
        t += dt;
        const k = Math.min(N, Math.floor(t / TICK)); if (k !== n) { n = k; sun.position.y = y0 + 2 * n; sun.scale.setScalar(Math.pow(1.05, n)); }
        if (!struck && t >= N * TICK) { struck = true; if (o.deaths === life || o.ko) sunStrike(o, sun.position.clone()); } // (a respawn destroys the tool's script)
        return t < 10;
      },
      end() { kill(sun); flames.dead = true; }
    });
  }
  const N_SUN = Math.ceil(2.75 / TICK) * TICK + .75 + 10.25; // rise + wait(0.75) + wait(10.25), then Tool.Enabled
  GX.def('TheFierySun', {
    tip: 'click: raise the Fiery Sun — it blinds + burns every player it can see (13.75 s)',
    click(o, S) { if (sunBusy(o)) return true; SUN.set(o, { life: o.deaths, until: now() + N_SUN }); launchSun(o, S); return true; },
    tick(o) { if (sunBusy(o)) GX.hideHand(o, .1); }
  });

  // ================= Marshmallow Shooter =================
  // Click: a marshmallow (0.4 part, mesh x2) at 50 studs/s from the gun toward the mouse, BodyForce = 99% of its weight, CanCollide off:
  // it flies through walls and only stops on a character (5 damage, not you). Gone after 30 s. Reload 1 s.
  let MMG = null;
  function marshmallow() { if (!MMG) MMG = new THREE.CylinderGeometry(.34, .34, .62, 16); const g = new THREE.Group(), c = new THREE.Mesh(MMG, GX.sm('#f6f1e4')); c.rotation.x = Math.PI / 2; c.castShadow = true; c.userData.fx = 1; g.add(c); return addFx(g); }
  GX.def('MarshmallowShooter', {
    tip: 'click: shoot a marshmallow (5 damage, goes through walls, 1 s reload)',
    click(o, S) {
      if (!GX.cool(S, 'mallow', 1)) return true;
      const h = GX.hand(o), dir = GX.aimPoint(o).sub(h).normalize(), vel = dir.clone().multiplyScalar(50), m = marshmallow();
      m.position.copy(h).addScaledVector(dir, 2); m.lookAt(m.position.clone().add(dir));
      let t = 0;
      GX.fx({
        up(dt) {
          if ((t += dt) > 30) return false;
          vel.y -= G * .01 * dt;
          const n = Math.max(1, Math.ceil(vel.length() * dt / .4)), sd = dt / n;
          for (let i = 0; i < n; i++) { m.position.addScaledVector(vel, sd); const c = GX.charAt(m.position, .2, o); if (c) { GX.hurt(o, c, 5, { kb: 0, up: 0 }); return false; } }
          return true;
        },
        end() { kill(m); }
      });
      return true;
    }
  });

  // ================= Super Fly Gold Boombox =================
  // Click: the "Lay down the beat!" window (song ID box, Play!). Play starts the ID looping (no sound on this site); unequipping stops it.
  // Requests closer than 0.5 s apart are ignored (floodCheck), and a blank / non-number ID does nothing.
  let SONG = null, SONG_T = -1e9;
  const flood = () => { const t = now(); if (t - SONG_T > .5) { SONG_T = t; return false; } return true; };
  function closeSong() { if (SONG) { SONG.remove(); SONG = null; } }
  function relock() { try { if (typeof R !== 'undefined' && typeof mode !== 'undefined' && mode === 'game' && !document.pointerLockElement) R.domElement.requestPointerLock(); } catch (e) { } }
  function playSong(o, S, val) {
    const s = String(val == null ? '' : val).trim(), n = s === '' ? NaN : Number(s); if (!isFinite(n) || n > 1e20) return; // isPotentiallyValid
    S.song = n; if (o === ME() && typeof log === 'function') log(`♪ Boombox: song ${n} on loop (no sound here)`);
  }
  function chooseSong(o, S) {
    if (SONG) return;
    const f = document.createElement('div');
    f.style.cssText = 'position:fixed;left:37.5%;top:37.5%;width:25%;height:25%;min-width:250px;min-height:160px;box-sizing:border-box;padding:10px;display:flex;flex-direction:column;background:rgba(30,32,38,.82);border:2px solid rgba(255,255,255,.25);border-radius:12px;box-shadow:0 6px 24px #0008;z-index:47;font-family:Arial,Helvetica,sans-serif;cursor:move;user-select:none';
    const tx = document.createElement('div');
    tx.style.cssText = 'flex:6;display:flex;align-items:center;justify-content:center;text-align:center;color:#fff;font-weight:700;font-size:clamp(11px,1.1vw,17px);line-height:1.25;white-space:pre-line;text-shadow:0 0 2px #000,1px 1px 0 #000,-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000';
    tx.textContent = 'Lay down the beat!\nPut in the ID number for a song you love.\nLeave it blank to stop playing music.';
    const inp = document.createElement('input'); inp.value = '142376088'; inp.spellcheck = false;
    inp.style.cssText = 'flex:2;min-height:24px;width:100%;box-sizing:border-box;background:rgba(0,0,0,.5);border:1px solid #fff;color:#fff;text-align:center;font:700 clamp(13px,1.3vw,20px) Arial,sans-serif;outline:none;cursor:text';
    const bt = document.createElement('button'); bt.textContent = 'Play!';
    bt.style.cssText = 'flex:2;min-height:26px;width:75%;margin:4px auto 0;border:1px solid #9aa0a8;border-radius:6px;background:linear-gradient(#f4f5f7,#c3c7ce);color:#fff;font:700 clamp(13px,1.3vw,20px) Arial,sans-serif;text-shadow:0 0 2px #000,1px 1px 0 #000,-1px -1px 0 #000;cursor:pointer';
    f.append(tx, inp, bt);
    for (const ev of ['keydown', 'keypress']) inp.addEventListener(ev, (e) => e.stopPropagation()); // typing doesn't walk you around
    for (const el of [inp, bt]) el.addEventListener('mousedown', (e) => e.stopPropagation());
    bt.addEventListener('click', (e) => { e.stopPropagation(); if (!flood()) playSong(o, S, inp.value); closeSong(); relock(); });
    f.addEventListener('click', (e) => e.stopPropagation());
    f.addEventListener('mousedown', (e) => { // Draggable
      const r = f.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
      const mv = (ev) => { f.style.left = (ev.clientX - dx) + 'px'; f.style.top = (ev.clientY - dy) + 'px'; };
      const up = () => { removeEventListener('mousemove', mv); removeEventListener('mouseup', up); };
      addEventListener('mousemove', mv); addEventListener('mouseup', up); e.preventDefault();
    });
    document.body.appendChild(f); SONG = f;
    try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) { }
  }
  GX.def('SuperFlyGoldBoombox', {
    tip: 'click: pick a song ID to play (no sound on this site)',
    click(o, S) { if (o === ME() && !flood()) chooseSong(o, S); return true; },
    off(o, S) { S.song = null; if (o === ME()) closeSong(); }
  });

  // ================= Rukiryo Cat =================
  // Click: the cat leaves your hand (the tool is gone) and drops. 2 s later it sparkles for 4 s, then grows (Size 6, mesh x5) and gets a
  // BodyPosition (X/Z only, P 3000, D 1250) and a BodyGyro too weak to turn it. It says its 3 lines (3, 2, 3 s apart), then every 0.2 s
  // in follow mode it heads for the spot 10 studs from you. Chat commands -> keys: Q "stay", E "follow", R "jump" (Y force for 1 s,
  // target +2: too weak to lift it unless you're well above it), X "evolve" (once: stays, red particles 5 s, Size 11 / mesh x10, follows
  // again 4 s later). It goes when you die.
  const CATS = new WeakMap();
  const CAT_LINES = ["Hi, I'm Rukiryo's Cat!", 'Say follow to make me follow, and stay to make me stay!', "There's a secret word to make me evolve. I wonder what it is?"];
  const catOf = (o) => { const C = CATS.get(o); return C && !C.dead ? C : null; };
  function dropBubble(b) { kill(b.s); if (b.s.material.map) b.s.material.map.dispose(); b.s.material.dispose(); }
  function catSay(C, text) { const s = GX.textSprite(text); s.userData.fx = 1; C.hold.add(s); C.bubbles.unshift({ s, t: 12 }); while (C.bubbles.length > 3) dropBubble(C.bubbles.pop()); }
  function catSize(C, box, k) { C.box = box; C.k = k; C.mdl.scale.setScalar(k); }
  function catFollow(C) {
    if (C.mode !== 'follow') return;
    const cen = new V(C.pos.x, C.pos.y + C.box / 2, C.pos.z), vb = rootPos(C.o).sub(cen), L = vb.length(); if (L < 1e-3) return;
    const d = cen.add(vb.multiplyScalar(1 - 10 / L)); C.tx = d.x; C.tz = d.z; C.ty = d.y + C.jump;
  }
  function catUp(C, dt) {
    if (C.dead) return false;
    const t = (C.t += dt), k2 = 5.75 / C.big; // mesh x5 ~ 5.75 studs across (Size 6), x10 ~ 11.5 (Size 11)
    if (C.step === 0 && t >= 2) { C.step = 1; C.emit = { r: 1, g: 1, b: 1, rate: 20, spread: 0 }; } // ParticleEmitter.Enabled
    if (C.step === 1 && t >= 6) { C.step = 2; C.emit = null; catSize(C, 6, k2); C.bp = true; C.tx = C.pos.x; C.tz = C.pos.z; C.ty = C.pos.y + 3; }
    if (C.step >= 2 && C.said < 3 && t >= [9, 11, 14][C.said]) catSay(C, CAT_LINES[C.said++]);
    if (C.said >= 3) for (C.loop += dt; C.loop >= .2; C.loop -= .2) catFollow(C);
    if (C.evoT && C.step === 2 && t >= C.evoT + 5) { C.step = 3; C.emit = null; catSize(C, 11, k2 * 2); const red = new THREE.Color(1, .3, .3); C.mdl.traverse((m) => { if (m.isMesh && m.material && m.material.color) m.material.color.multiply(red); }); }
    if (C.evoT && C.step === 3 && t >= C.evoT + 9) { C.mode = 'follow'; C.evoT = 0; }
    if (C.jump && t >= C.jumpUntil) C.jump = 0;
    // physics: gravity; X/Z BodyPosition against ground friction (Plastic .3); during "jump" the BodyPosition also pulls on Y
    const m = .7 * C.box * C.box * C.box;
    if (C.bp && t < C.jumpUntil) C.vel.y += ((G / RG) * (3000 * (C.ty - (C.pos.y + C.box / 2)) - 1250 * C.vel.y) / m - G) * dt;
    else C.vel.y -= G * dt;
    C.pos.y += C.vel.y * dt;
    const gy = GX.groundY(C.pos.x, C.pos.z, C.pos.y + .6);
    if (gy != null && C.pos.y <= gy) { C.pos.y = gy; if (C.vel.y < 0) C.vel.y = 0; }
    const onG = gy != null && C.pos.y <= gy + .02;
    if (C.pos.y < -400) return false;
    if (C.bp) {
      const n = Math.max(1, Math.ceil(dt * 120)), h = dt / n, fr = .3 * RG;
      for (let i = 0; i < n; i++) {
        let ax = (3000 * (C.tx - C.pos.x) - 1250 * C.vel.x) / m, az = (3000 * (C.tz - C.pos.z) - 1250 * C.vel.z) / m;
        if (onG) {
          const sp = Math.hypot(C.vel.x, C.vel.z);
          if (sp < .05) { const a = Math.hypot(ax, az); if (a <= fr) { ax = az = 0; C.vel.x = C.vel.z = 0; } else { ax -= ax / a * fr; az -= az / a * fr; } }
          else { ax -= C.vel.x / sp * fr; az -= C.vel.z / sp * fr; }
        }
        const vx0 = C.vel.x, vz0 = C.vel.z; C.vel.x += ax * h; C.vel.z += az * h;
        if (onG && vx0 * C.vel.x + vz0 * C.vel.z < 0) C.vel.x = C.vel.z = 0; // friction stops it, never turns it around
        const ox = C.pos.x, oz = C.pos.z, cy = C.pos.y + C.box / 2; C.pos.x += C.vel.x * h; C.pos.z += C.vel.z * h;
        if (GX.solidAt(new V(C.pos.x, cy, C.pos.z)) && !GX.solidAt(new V(ox, cy, oz))) { C.pos.x = ox; C.pos.z = oz; C.vel.x = C.vel.z = 0; }
      }
    }
    C.hold.position.copy(C.pos);
    if (C.emit) { // particles from inside the part, Speed 5 along its top (+ VelocitySpread), Lifetime 5-10, Size 1
      const E = C.emit, half = C.step < 2 ? C.s0.clone().multiplyScalar(.5) : new V(C.box / 2, C.box / 2, C.box / 2), cy = C.pos.y + half.y;
      for (C.emAcc += E.rate * dt; C.emAcc >= 1; C.emAcc--) {
        let vx = 0, vy = 5, vz = 0; if (E.spread) { const th = Math.random() * E.spread, ph = Math.random() * TAU; vx = Math.sin(th) * Math.cos(ph) * 5; vy = Math.cos(th) * 5; vz = Math.sin(th) * Math.sin(ph) * 5; }
        C.em.add(C.pos.x + rnd(-half.x, half.x), cy + rnd(-half.y, half.y), C.pos.z + rnd(-half.z, half.z), vx, vy, vz, rnd(5, 10), E.r, E.g, E.b);
      }
    }
    C.em.up(dt);
    const top = C.s0.y * C.k + 1.6;
    for (let i = C.bubbles.length - 1; i >= 0; i--) { const b = C.bubbles[i]; if ((b.t -= dt) <= 0) { dropBubble(b); C.bubbles.splice(i, 1); } }
    C.bubbles.forEach((b, i) => { b.s.position.y = top + i * 1.7; });
    return true;
  }
  function dropCat(o, S) {
    const mdl = GX.gearModel(S.gi, 0, 1); if (!mdl) return;
    const mats = []; mdl.traverse((m) => { if (m.isMesh && m.material) { m.material = m.material.clone(); mats.push(m.material); } }); // own copies for the red tint
    const s0 = mdl.userData.size.clone(), hold = new THREE.Group(); hold.add(mdl); addFx(hold);
    const hp = GX.hand(o), C = {
      o, hold, mdl, s0, big: Math.max(s0.x, s0.y, s0.z, .2), k: 1, box: Math.max(s0.x, s0.y, s0.z), pos: new V(hp.x, hp.y - s0.y / 2, hp.z), vel: new V(), t: 0, step: 0,
      mode: 'follow', bp: false, tx: 0, tz: 0, ty: 0, jump: 0, jumpUntil: 0, evolved: false, evoT: 0, loop: 0, said: 0, bubbles: [], em: emitter(3200, 1), emit: null, emAcc: 0, dead: false
    };
    hold.position.copy(C.pos); hold.rotation.y = o.yaw; CATS.set(o, C);
    C.up = (dt) => catUp(C, dt);
    C.end = () => { C.dead = true; kill(hold); C.em.dispose(); for (const b of C.bubbles) dropBubble(b); C.bubbles.length = 0; for (const mt of mats) mt.dispose(); };
    GX.fx(C);
  }
  GX.def('RukiryoCat', {
    tip: 'click: set the cat down · Q: stay · E: follow · R: jump · X: the secret word',
    click(o, S) { if (!catOf(o)) dropCat(o, S); return true; },
    q(o) { const C = catOf(o); if (C && C.bp) C.mode = 'stay'; },
    e(o) { const C = catOf(o); if (C && C.bp) C.mode = 'follow'; },
    r(o) { const C = catOf(o); if (C && C.bp) { C.jump = 2; C.jumpUntil = C.t + 1; } },
    x(o) { const C = catOf(o); if (!C || !C.bp || C.evolved) return; C.evolved = true; C.mode = 'stay'; C.evoT = C.t; C.emit = { r: 1, g: 0, b: 0, rate: 300, spread: 100 * Math.PI / 180 }; },
    tick(o) { if (catOf(o)) GX.hideHand(o, .1); },
    off(o) { const C = CATS.get(o); if (C) C.dead = true; CATS.delete(o); }
  });

  // ================= Purple Pizza Launcher =================
  // Click: a pizza (0.613x0.086x0.613) leaves the launcher toward the mouse at 1 stud/s (VELOCITY only sets its spin: 57-68 rad/s about
  // the world Z axis), so it tumbles down in front of you. For 5 s anyone else touching it takes 2-5 damage. Gone after 30 s. Reload 2.5 s.
  const PIZZAS = [];
  let PZG = null;
  function pizzaModel(gi) {
    const w = new THREE.Group(), g = GX.meshGear(gi), part = g && g.children && g.children[1]; // the launcher's Display part is the pizza
    if (part && part.geometry) {
      const geo = part.geometry; if (!geo.boundingBox) geo.computeBoundingBox();
      const c = geo.boundingBox.getCenter(new V()), s = geo.boundingBox.getSize(new V()), inner = new THREE.Group(), m = new THREE.Mesh(geo, part.material);
      m.position.copy(c).multiplyScalar(-1); inner.add(m);
      if (s.x < s.y && s.x < s.z) inner.rotation.z = Math.PI / 2; else if (s.z < s.y && s.z < s.x) inner.rotation.x = Math.PI / 2; // thin side up
      w.add(inner);
    } else {
      if (!PZG) PZG = { crust: new THREE.CylinderGeometry(.31, .31, .086, 20), top: new THREE.CylinderGeometry(.26, .26, .03, 20), pep: new THREE.CylinderGeometry(.05, .05, .02, 8) };
      w.add(new THREE.Mesh(PZG.crust, GX.sm('#d9a25f'))); const ch = new THREE.Mesh(PZG.top, GX.sm('#f5c84c')); ch.position.y = .045; w.add(ch);
      for (let i = 0; i < 5; i++) { const a = i / 5 * TAU, r = i ? .15 : 0, p = new THREE.Mesh(PZG.pep, GX.sm('#b3261e')); p.position.set(Math.cos(a) * r, .065, Math.sin(a) * r); w.add(p); }
    }
    w.traverse((m) => { m.userData.fx = 1; m.castShadow = true; }); return addFx(w);
  }
  function firePizza(o, gi, p, dir) {
    while (PIZZAS.length >= 40) PIZZAS.shift().dead = true;
    const m = pizzaModel(gi); m.position.copy(p); m.lookAt(p.clone().add(dir)); // CFrame.new(LaunchAttachment, mouse)
    const vel = dir.clone(); vel.y *= VY;
    let w = -(230 + (Math.random() * 41 | 0)) * .25; // RotVelocity (0, 0, -random(230, 270)) * 0.25
    const P = { dead: false, t: 0, land: false, touch: new Set() }, ZA = new V(0, 0, 1), YA = new V(0, 1, 0), q = new THREE.Quaternion(), q0 = new THREE.Quaternion();
    PIZZAS.push(P);
    P.up = (dt) => {
      if (P.dead || (P.t += dt) > 30) return false;
      vel.y -= G * dt; m.position.addScaledVector(vel, dt);
      const gy = GX.groundY(m.position.x, m.position.z, m.position.y + .3);
      if (gy != null && m.position.y <= gy + .05) {
        m.position.y = gy + .05;
        if (!P.land) { P.land = true; vel.x += -w * .09; } // the spin grabs the floor and kicks it along +X
        vel.y = vel.y < -2 ? -vel.y * .3 : 0;
        const sp = Math.hypot(vel.x, vel.z), fr = .3 * RG * dt; if (sp <= fr) vel.x = vel.z = 0; else { vel.x -= vel.x / sp * fr; vel.z -= vel.z / sp * fr; }
        w *= Math.max(0, 1 - 5 * dt);
      }
      if (GX.solidAt(m.position.clone().add(new V(0, .1, 0)))) { vel.x *= -.3; vel.z *= -.3; m.position.addScaledVector(vel, dt * 2); }
      if (Math.abs(w) > .5) { q.setFromAxisAngle(ZA, w * dt); m.quaternion.premultiply(q); }
      else if (P.land) { const u = YA.clone().applyQuaternion(m.quaternion); q.setFromUnitVectors(u, new V(0, u.y >= 0 ? 1 : -1, 0)); q0.identity().slerp(q, Math.min(1, 8 * dt)); m.quaternion.premultiply(q0); } // settles flat
      if (P.t < 5) { // Touched (any part of a character but yours): random(2, 5) damage
        const pp = m.position;
        for (const c of CH()) {
          if (c === o || c.ko) continue; const dy = pp.y - c.pos.y, on = dy > -.5 && dy < 5.5 && Math.hypot(pp.x - c.pos.x, pp.z - c.pos.z) < 1.5;
          if (on && !P.touch.has(c)) { P.touch.add(c); GX.hurt(o, c, 2 + (Math.random() * 4 | 0), { kb: 0, up: 0 }); } else if (!on) P.touch.delete(c);
        }
      }
      return true;
    };
    P.end = () => { kill(m); const i = PIZZAS.indexOf(P); if (i >= 0) PIZZAS.splice(i, 1); };
    GX.fx(P);
  }
  GX.def('PurplePizzaLauncher', {
    tip: 'click: launch a pizza (2-5 damage to whoever touches it, 2.5 s reload)',
    on(o) { const g = o.c.gearMesh; if (g && g.children[1]) g.children[1].visible = false; }, // the script destroys the Display part
    off(o) { const g = o.c.gearMesh; if (g && g.children[1]) g.children[1].visible = true; },
    click(o, S) {
      if (!GX.cool(S, 'pizza', 2.5)) return true;
      const aim = GX.aimPoint(o), dir = aim.clone().sub(rootPos(o)).normalize(), h = GX.hand(o), muzzle = h.clone().addScaledVector(aim.clone().sub(h).normalize(), 1.2);
      firePizza(o, S.gi, muzzle, dir);
      return true;
    }
  });

  // ================= An Alpaca, You Know =================
  // Click: the alpaca (the Handle) goes into the world where your hand is, collidable and unanchored, and grows from 1x to 12x its size in
  // steps of 0.1 per tick (~3.7 s), pushing people out of the way. It stays for good. The tool is gone: one alpaca per life.
  const ALP = new WeakMap(), ALPACAS = [];
  const alpUsed = (o) => ALP.get(o) === o.deaths;
  function dropAlpaca(o, S) {
    while (ALPACAS.length >= 8) ALPACAS.shift().dead = true;
    const mdl = GX.gearModel(S.gi, 0, 1); if (!mdl) return;
    const s0 = mdl.userData.size.clone(), yaw = Math.round(o.yaw / (Math.PI / 2)) * (Math.PI / 2), side = Math.abs(Math.sin(yaw)) > .5;
    const hx = (side ? s0.z : s0.x) / 2, hz = (side ? s0.x : s0.z) / 2, hp = GX.hand(o);
    const A = { pos: new V(hp.x, hp.y - s0.y / 2, hp.z), vy: 0, n: 0, i: 1, t: 0, dead: false, box: null };
    mdl.rotation.y = yaw; mdl.position.copy(A.pos); addFx(mdl); ALPACAS.push(A);
    A.up = (dt) => {
      if (A.dead) return false; A.t += dt;
      const n = Math.min(110, Math.floor(A.t / TICK)); if (n !== A.n) { A.n = n; A.i = 1 + n * .1; mdl.scale.setScalar(A.i); }
      const gy = GX.groundY(A.pos.x, A.pos.z, A.pos.y + .5);
      if (gy != null && A.pos.y <= gy + .01) { A.pos.y = gy; A.vy = 0; } else { A.vy -= G * dt; A.pos.y += A.vy * dt; if (gy != null && A.pos.y < gy) { A.pos.y = gy; A.vy = 0; } }
      if (A.pos.y < -400) return false;
      mdl.position.copy(A.pos);
      const x0 = A.pos.x - hx * A.i, x1 = A.pos.x + hx * A.i, z0 = A.pos.z - hz * A.i, z1 = A.pos.z + hz * A.i, y1 = A.pos.y + s0.y * A.i;
      if (!A.box && A.vy === 0) A.box = addBox(new V(x0, A.pos.y, z0), new V(x1, y1, z1), new V(A.pos.x - hx * 12, 0, A.pos.z - hz * 12), new V(A.pos.x + hx * 12, 0, A.pos.z + hz * 12));
      if (A.box) {
        const b = A.box.b; b.min.set(x0, A.pos.y, z0); b.max.set(x1, y1, z1);
        if (A.n < 110) for (const c of CH()) { // growing into people pushes them out sideways (or they ride up on top)
          if (c.ko || c.net) continue; const r = .9;
          if (c.pos.x + r <= x0 || c.pos.x - r >= x1 || c.pos.z + r <= z0 || c.pos.z - r >= z1 || c.pos.y >= y1 - .05 || c.pos.y + 5 <= A.pos.y || y1 - c.pos.y < 1.1) continue;
          const e = [x1 + r - c.pos.x, c.pos.x - (x0 - r), z1 + r - c.pos.z, c.pos.z - (z0 - r)], mn = Math.min(...e);
          if (mn === e[0]) c.pos.x += e[0] + .01; else if (mn === e[1]) c.pos.x -= e[1] + .01; else if (mn === e[2]) c.pos.z += e[2] + .01; else c.pos.z -= e[3] + .01;
        }
      }
      return true;
    };
    A.end = () => { kill(mdl); delBox(A.box); A.box = null; const k = ALPACAS.indexOf(A); if (k >= 0) ALPACAS.splice(k, 1); };
    GX.fx(A);
  }
  GX.def('AnAlpacaYouKnow', {
    tip: 'click: let the alpaca go — it grows 12x and stays (once per life)',
    click(o, S) { if (alpUsed(o)) return true; ALP.set(o, o.deaths); dropAlpaca(o, S); return true; },
    tick(o) { if (alpUsed(o)) GX.hideHand(o, .1); }
  });
})();
