'use strict';
// ===== Visual effects: tracers, particles, explosions, damage numbers, rockets =====
const FX = {
  tracers: [], parts: [], numbers: [], rockets: [], blasts: [], grenades: [], orbs: [],
  matCache: new Map(),
  numPool: [],

  mat(color, additive) {
    const k = color + (additive ? 'a' : '');
    let m = this.matCache.get(k);
    if (!m) {
      m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, depthWrite: !additive, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
      this.matCache.set(k, m);
    }
    return m;
  },

  tracer(a, b, color = 0xfff2a8, beam) {
    if (beam) {
      // a glowing beam: thin additive cylinder between the two points
      const len = a.distanceTo(b);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, len, 6, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
      m.position.copy(a).add(b).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      GFX.scene.add(m);
      this.tracers.push({ obj: m, life: 0.06, max: 0.06 });
      return;
    }
    const geo = new THREE.BufferGeometry().setFromPoints([a.clone(), b.clone()]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 }));
    GFX.scene.add(line);
    this.tracers.push({ obj: line, life: 0.07, max: 0.07 });
  },
  flash(p, color = 0xffd36b, size = 0.35) {
    const m = new THREE.Mesh(GEO.box, this.mat(color, true));
    m.position.copy(p); m.scale.setScalar(size);
    GFX.scene.add(m);
    this.parts.push({ obj: m, vel: new THREE.Vector3(), life: 0.05, max: 0.05, grav: 0, shrink: false });
  },
  burst(p, color, n, speed, life, size, grav = 18, additive = false) {
    if (this.parts.length > 400) return;
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(GEO.box, this.mat(color, additive));
      m.position.copy(p);
      const s = size * rand(0.6, 1.3); m.scale.setScalar(s);
      m.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
      GFX.scene.add(m);
      const v = new THREE.Vector3(rand(-1, 1), rand(-0.2, 1), rand(-1, 1)).normalize().multiplyScalar(speed * rand(0.4, 1));
      const l = life * rand(0.7, 1.2);
      this.parts.push({ obj: m, vel: v, life: l, max: l, grav, shrink: true, base: s });
    }
  },
  impact(p, kind) {
    const color = kind === 'char' ? 0xffffff : kind === 'terrain' ? 0x8a7a5a : 0xd8c8a8;
    this.burst(p, color, 4, 4, 0.3, 0.08);
  },
  debris(p, color, n = 8) { this.burst(p, color, n, 7, 0.8, 0.35); },
  sparkle(p, color) { this.burst(p, color, 14, 5, 0.9, 0.12, -1, true); },

  explosion(p, radius) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.copy(p); GFX.scene.add(m);
    this.blasts.push({ obj: m, t: 0, r: radius });
    this.burst(p, 0xff7a1a, 16, 12, 0.7, 0.4, 4, true);
    this.burst(p, 0x555555, 12, 6, 1.4, 0.7, -2);
    SFX.play('explode', 1, p);
    if (G.player) { const d = p.distanceTo(G.player.pos); if (d < 40) G.shake = Math.max(G.shake, (1 - d / 40) * 0.8); }
  },

  // ---------- damage numbers (DOM) ----------
  dmgNumber(pos, amount, type) {
    const host = document.getElementById('dmgnums');
    if (!host) return;
    let el = this.numPool.pop();
    if (!el) { el = document.createElement('div'); el.className = 'dmgnum'; }
    el.textContent = Math.round(amount);
    el.className = 'dmgnum ' + type;
    host.appendChild(el);
    this.numbers.push({ el, pos: pos.clone().add(new THREE.Vector3(rand(-0.4, 0.4), 0, rand(-0.4, 0.4))), life: 0.9 });
  },

  // ---------- rockets ----------
  grenade(owner, origin, vel, W) {
    const m = GUNS.mesh('frag') || new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshLambertMaterial({ color: 0x2e4a1e }));
    if (m.userData.real === undefined) m.scale.setScalar(1.6);
    m.position.copy(origin);
    GFX.scene.add(m);
    this.grenades.push({ owner, obj: m, pos: origin.clone(), vel: vel.clone(), life: W.fuse, W });
  },
  rocket(owner, origin, dir, item) {
    const W = WEAPONS[item.id];
    const col = item.color || 0xd04040; // boss blasts are tinted (Doom green, Thanos purple, Iron Man gold)
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.7, 8), new THREE.MeshLambertMaterial({ color: col, emissive: item.color ? col : 0x401010 }));
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    m.position.copy(origin);
    GFX.scene.add(m);
    this.rockets.push({ owner, obj: m, pos: origin.clone(), vel: dir.clone().multiplyScalar(W.speed), life: 6, dmg: W.dmg[item.rarity], splash: W.splash, buildDmg: W.buildDmg, smokeT: 0 });
  },
  // glowing energy orbs (boss attacks, LeBron's basketballs): o = { color, size, dmg, splash, gravity, home, turn, life, ball }
  orb(owner, origin, vel, o) {
    const g = new THREE.Group(), sz = o.size || 0.35;
    if (o.ball) g.add(new THREE.Mesh(new THREE.SphereGeometry(sz, 14, 10), new THREE.MeshLambertMaterial({ color: 0xe8701e })));
    else {
      g.add(new THREE.Mesh(new THREE.SphereGeometry(sz, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })));
      g.add(new THREE.Mesh(new THREE.SphereGeometry(sz * 1.9, 12, 8), new THREE.MeshBasicMaterial({ color: o.color, transparent: true, opacity: 0.45, depthWrite: false })));
    }
    g.position.copy(origin); GFX.scene.add(g);
    this.orbs.push({ owner, obj: g, pos: origin.clone(), vel: vel.clone(), life: o.life || 5, trailT: 0, o });
  },
  explodeAt(p, owner, dmg, radius, buildDmg) {
    this.explosion(p, radius);
    for (const c of G.chars) {
      if (!c.alive || c.state === 'bus') continue;
      const d = Math.hypot(c.pos.x - p.x, c.pos.y + 0.9 - p.y, c.pos.z - p.z);
      if (d > radius) continue;
      let amt = dmg * (1 - (d / radius) * 0.55) * (owner && owner.dmgMult || 1);
      if (c === owner) { if (owner.isBoss || owner.isSmasher) continue; amt *= 0.5; }
      const push = 9 * (1 - d / radius), hx = c.pos.x - p.x, hz = c.pos.z - p.z, hl = Math.hypot(hx, hz) || 1;
      c.vel.x += hx / hl * push * 1.6; c.vel.z += hz / hl * push * 1.6;
      c.knockT = 0.45 * (1 - d / radius); // briefly lose control so the blast actually throws you
      CHARS.damage(c, amt, owner, { weapon: 'Boom Tube', explosive: true });
      c.vel.y += 6 * (1 - d / radius);
    }
    const arr = PHYS.query(p.x - radius, p.z - radius, p.x + radius, p.z + radius, []);
    for (const s of arr) {
      if (!s.destructible || !s.alive) continue;
      const cx = clamp(p.x, s.x0, s.x1), cz = clamp(p.z, s.z0, s.z1);
      const cy = clamp(p.y, s.y0 !== undefined ? s.y0 : p.y, s.y1 !== undefined ? s.y1 : p.y);
      if (Math.hypot(cx - p.x, cy - p.y, cz - p.z) <= radius * 0.8) WORLD.hitSolid(s, buildDmg, owner, false);
    }
  },

  update(dt) {
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i]; t.life -= dt;
      t.obj.material.opacity = Math.max(0, t.life / t.max) * 0.85;
      if (t.life <= 0) { GFX.scene.remove(t.obj); t.obj.geometry.dispose(); t.obj.material.dispose(); this.tracers.splice(i, 1); }
    }
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i]; p.life -= dt;
      if (p.life <= 0) { GFX.scene.remove(p.obj); if (p.grow) { p.obj.geometry.dispose(); p.obj.material.dispose(); } this.parts.splice(i, 1); continue; }
      p.vel.y -= p.grav * dt;
      p.obj.position.addScaledVector(p.vel, dt);
      // a ring that widens and fades as it flies (Force Push)
      if (p.grow) { const k = 1 - p.life / p.max; p.obj.scale.setScalar(1 + k * p.grow); p.obj.material.opacity = 0.55 * (1 - k); continue; }
      p.obj.rotation.x += dt * 5;
      if (p.shrink) p.obj.scale.setScalar(p.base * Math.max(0.05, p.life / p.max));
    }
    for (let i = this.blasts.length - 1; i >= 0; i--) {
      const b = this.blasts[i]; b.t += dt;
      const k = b.t / 0.45;
      b.obj.scale.setScalar(b.r * (0.3 + k * 0.9));
      b.obj.material.opacity = Math.max(0, 0.9 * (1 - k));
      if (k >= 1) { GFX.scene.remove(b.obj); b.obj.geometry.dispose(); b.obj.material.dispose(); this.blasts.splice(i, 1); }
    }
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const r = this.orbs[i], o = r.o; r.life -= dt;
      if (o.gravity) r.vel.y -= o.gravity * dt;
      // homing: bend toward the target's chest a little each frame
      if (o.home && o.home.alive) {
        const want = new THREE.Vector3(o.home.pos.x - r.pos.x, o.home.pos.y + 1.1 - r.pos.y, o.home.pos.z - r.pos.z).normalize().multiplyScalar(r.vel.length());
        r.vel.lerp(want, Math.min(1, (o.turn || 2) * dt));
      }
      const step = r.vel.length() * dt, dir = r.vel.clone().normalize();
      const hit = PHYS.raycast(r.pos, dir, step + (o.size || 0.35), { ignore: r.owner });
      if (hit || r.life <= 0) {
        const p = hit ? hit.point : r.pos;
        if (o.ball) { FX.impact(p, 'char'); if (hit && hit.kind === 'char') { CHARS.damage(hit.char, o.dmg * (r.owner && r.owner.dmgMult || 1), r.owner, { weapon: o.name || 'basketball' }); hit.char.vel.addScaledVector(dir.setY(0), 7); hit.char.vel.y = 5; } SFX.play('hit', 0.6, p); }
        else this.explodeAt(p, r.owner, o.dmg, o.splash || 3, o.buildDmg || 120);
        if (o.splash && o.ball) this.explodeAt(p, r.owner, o.dmg * 0.5, o.splash, 60);
        GFX.scene.remove(r.obj); r.obj.traverse((m) => { if (m.geometry) { m.geometry.dispose(); m.material.dispose(); } });
        this.orbs.splice(i, 1);
        continue;
      }
      r.pos.addScaledVector(r.vel, dt);
      r.obj.position.copy(r.pos); if (o.ball) r.obj.rotation.x += dt * 10;
      r.trailT -= dt;
      if (r.trailT <= 0 && !o.ball) { r.trailT = 0.025; this.burst(r.pos, o.color, 1, 0.4, 0.4, 0.2 * (o.size || 0.35) / 0.35, 0, true); }
    }
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i]; r.life -= dt;
      const step = r.vel.length() * dt;
      const dir = r.vel.clone().normalize();
      const hit = PHYS.raycast(r.pos, dir, step + 0.3, { ignore: r.owner });
      if (hit || r.life <= 0) {
        const p = hit ? hit.point : r.pos;
        this.explodeAt(p, r.owner, r.dmg, r.splash, r.buildDmg);
        GFX.scene.remove(r.obj); r.obj.geometry.dispose(); r.obj.material.dispose();
        this.rockets.splice(i, 1);
        continue;
      }
      r.pos.addScaledVector(r.vel, dt);
      r.obj.position.copy(r.pos);
      r.smokeT -= dt;
      if (r.smokeT <= 0) { r.smokeT = 0.03; this.burst(r.pos, 0xcccccc, 1, 0.5, 0.6, 0.25, -1); }
    }
    // grenades: arc, bounce off the ground and walls, explode when the fuse runs out
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i]; g.life -= dt;
      if (g.life <= 0) {
        this.explodeAt(g.pos, g.owner, g.W.dmg[0], g.W.splash, g.W.buildDmg);
        GFX.scene.remove(g.obj); this.grenades.splice(i, 1); continue;
      }
      g.vel.y -= 22 * dt;
      const sp = g.vel.length() * dt;
      if (sp > 0.001) {
        const dir = g.vel.clone().normalize();
        const hit = PHYS.raycast(g.pos, dir, sp + 0.15, { chars: false, terrain: false });
        if (hit) { g.vel.multiplyScalar(-0.35); g.vel.y = Math.abs(g.vel.y); }
        else g.pos.addScaledVector(g.vel, dt);
      }
      const ground = PHYS.groundAt(g.pos.x, g.pos.z, 0.1, g.pos.y + 0.2);
      if (g.pos.y < ground + 0.1) { g.pos.y = ground + 0.1; g.vel.y = Math.abs(g.vel.y) * 0.35; g.vel.x *= 0.6; g.vel.z *= 0.6; }
      g.obj.position.copy(g.pos);
      g.obj.rotation.x += dt * 8;
    }
    // damage numbers
    const cam = GFX.camera, w = window.innerWidth, h = window.innerHeight, v = new THREE.Vector3();
    for (let i = this.numbers.length - 1; i >= 0; i--) {
      const n = this.numbers[i]; n.life -= dt;
      if (n.life <= 0) { n.el.remove(); this.numPool.push(n.el); this.numbers.splice(i, 1); continue; }
      n.pos.y += dt * 1.6;
      v.copy(n.pos).project(cam);
      if (v.z > 1) { n.el.style.display = 'none'; continue; }
      n.el.style.display = 'block';
      n.el.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * h}px) translate(-50%,-50%) scale(${0.8 + n.life * 0.4})`;
      n.el.style.opacity = Math.min(1, n.life * 2.5);
    }
  },
  clear() {
    for (const t of this.tracers) GFX.scene.remove(t.obj);
    for (const p of this.parts) GFX.scene.remove(p.obj);
    for (const b of this.blasts) GFX.scene.remove(b.obj);
    for (const r of this.rockets) GFX.scene.remove(r.obj);
    for (const g of this.grenades) GFX.scene.remove(g.obj);
    this.grenades = [];
    for (const r of this.orbs) GFX.scene.remove(r.obj);
    this.orbs = [];
    for (const n of this.numbers) n.el.remove();
    this.tracers = []; this.parts = []; this.blasts = []; this.rockets = []; this.numbers = [];
  },
};
