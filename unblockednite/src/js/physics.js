'use strict';
// ===== Collision world: spatial grid of solids, character movement, raycasts =====
// Solid shapes:
//  box : x0,y0,z0,x1,y1,z1
//  cyl : x,z,r,y0,y1        (bounds filled in automatically)
//  ramp: x0,z0,x1,z1,y0,y1,dir  (dir 0:+x rises, 1:+z, 2:-x, 3:-z)
//  cone: x0,z0,x1,z1,y0,y1  (pyramid, apex y1)
const GRAVITY = 28;
const STEP_UP = 0.65;

const PHYS = {
  CELL: 16,
  grid: new Map(),
  stamp: 1,
  _arr: [],
  _arr2: [],

  key(cx, cz) { return (cx + 512) * 1024 + (cz + 512); },
  clear() { this.grid.clear(); this.byKey = new Map(); this._nk = 0; },
  byKey: new Map(), _nk: 0, keying: false,

  add(s) {
    if (s.type === 'cyl') { s.x0 = s.x - s.r; s.x1 = s.x + s.r; s.z0 = s.z - s.r; s.z1 = s.z + s.r; }
    s._stamp = 0; s.alive = true;
    if (this.keying && !s.netKey) { s.netKey = 'w' + (this._nk++); this.byKey.set(s.netKey, s); }
    const C = this.CELL;
    const cx0 = Math.floor(s.x0 / C), cx1 = Math.floor(s.x1 / C);
    const cz0 = Math.floor(s.z0 / C), cz1 = Math.floor(s.z1 / C);
    s._cells = [];
    for (let cx = cx0; cx <= cx1; cx++) for (let cz = cz0; cz <= cz1; cz++) {
      const k = this.key(cx, cz);
      let a = this.grid.get(k);
      if (!a) { a = []; this.grid.set(k, a); }
      a.push(s); s._cells.push(k);
    }
    return s;
  },
  remove(s) {
    if (!s._cells) return;
    for (const k of s._cells) {
      const a = this.grid.get(k);
      if (!a) continue;
      const i = a.indexOf(s);
      if (i >= 0) { a[i] = a[a.length - 1]; a.pop(); }
    }
    s._cells = null; s.alive = false;
  },
  // Fills `out` with unique solids overlapping the xz rectangle.
  query(x0, z0, x1, z1, out) {
    out.length = 0;
    const st = ++this.stamp, C = this.CELL;
    const cx0 = Math.floor(x0 / C), cx1 = Math.floor(x1 / C);
    const cz0 = Math.floor(z0 / C), cz1 = Math.floor(z1 / C);
    for (let cx = cx0; cx <= cx1; cx++) for (let cz = cz0; cz <= cz1; cz++) {
      const a = this.grid.get(this.key(cx, cz));
      if (!a) continue;
      for (let i = 0; i < a.length; i++) {
        const s = a[i];
        if (s._stamp === st) continue;
        s._stamp = st;
        if (s.x1 < x0 || s.x0 > x1 || s.z1 < z0 || s.z0 > z1) continue;
        out.push(s);
      }
    }
    return out;
  },

  rampH(s, x, z) {
    let u;
    switch (s.dir) {
      case 0: u = (x - s.x0) / (s.x1 - s.x0); break;
      case 1: u = (z - s.z0) / (s.z1 - s.z0); break;
      case 2: u = (s.x1 - x) / (s.x1 - s.x0); break;
      default: u = (s.z1 - z) / (s.z1 - s.z0);
    }
    return s.y0 + clamp(u, 0, 1) * (s.y1 - s.y0) + 0.15;
  },
  coneH(s, x, z) {
    const cx = (s.x0 + s.x1) / 2, cz = (s.z0 + s.z1) / 2, h = (s.x1 - s.x0) / 2;
    const d = clamp(Math.max(Math.abs(x - cx), Math.abs(z - cz)) / h, 0, 1);
    return s.y1 - (s.y1 - s.y0) * d;
  },

  // Highest walkable surface under (x,z) that is reachable from feetY.
  groundAt(x, z, r, feetY, arr) {
    let g = WORLD.heightAt(x, z);
    if (g < WORLD.WATER - 1.1) g = WORLD.WATER - 1.1;
    if (!arr) arr = this.query(x - r, z - r, x + r, z + r, this._arr2);
    const rr = r * 0.6;
    for (let i = 0; i < arr.length; i++) {
      const s = arr[i];
      let h = -1e9;
      if (s.type === 'box') {
        if (x + rr > s.x0 && x - rr < s.x1 && z + rr > s.z0 && z - rr < s.z1 && s.y1 <= feetY + STEP_UP) h = s.y1;
      } else if (s.type === 'cyl') {
        const dx = x - s.x, dz = z - s.z;
        if (dx * dx + dz * dz < (s.r + rr) * (s.r + rr) && s.y1 <= feetY + STEP_UP) h = s.y1;
      } else if (s.type === 'ramp') {
        if (x > s.x0 - 0.1 && x < s.x1 + 0.1 && z > s.z0 - 0.1 && z < s.z1 + 0.1) {
          const rh = this.rampH(s, x, z);
          if (rh <= feetY + 1.1) h = rh;
        }
      } else if (s.type === 'cone') {
        if (x > s.x0 && x < s.x1 && z > s.z0 && z < s.z1) {
          const ch = this.coneH(s, x, z);
          if (ch <= feetY + 1.1) h = ch;
        }
      }
      if (h > g) g = h;
    }
    return g;
  },

  // Moves a character (c.pos = feet, c.vel). Returns landing impact speed (0 if none).
  moveChar(c, dt) {
    const r = c.radius, H = c.height;
    if (!c.noGravity) c.vel.y -= GRAVITY * dt;
    let nx = c.pos.x + c.vel.x * dt, nz = c.pos.z + c.vel.z * dt;
    const feet = c.pos.y;
    const arr = this.query(Math.min(c.pos.x, nx) - r - 1, Math.min(c.pos.z, nz) - r - 1, Math.max(c.pos.x, nx) + r + 1, Math.max(c.pos.z, nz) + r + 1, this._arr);
    c.blockedBy = null;
    for (let iter = 0; iter < 2; iter++) {
      for (let i = 0; i < arr.length; i++) {
        const s = arr[i];
        if (s.type === 'box') {
          if (s.y1 <= feet + STEP_UP || s.y0 >= feet + H) continue;
          const px = clamp(nx, s.x0, s.x1), pz = clamp(nz, s.z0, s.z1);
          let dx = nx - px, dz = nz - pz;
          const d2 = dx * dx + dz * dz;
          if (d2 >= r * r) continue;
          if (d2 > 1e-8) {
            const d = Math.sqrt(d2);
            nx += dx / d * (r - d); nz += dz / d * (r - d);
          } else {
            const pushL = nx - s.x0, pushR = s.x1 - nx, pushB = nz - s.z0, pushF = s.z1 - nz;
            const m = Math.min(pushL, pushR, pushB, pushF);
            if (m === pushL) nx = s.x0 - r; else if (m === pushR) nx = s.x1 + r;
            else if (m === pushB) nz = s.z0 - r; else nz = s.z1 + r;
          }
          c.blockedBy = s;
        } else if (s.type === 'cyl') {
          if (s.y1 <= feet + STEP_UP || s.y0 >= feet + H) continue;
          const dx = nx - s.x, dz = nz - s.z, d = Math.hypot(dx, dz), m = r + s.r;
          if (d < m && d > 1e-6) { nx += dx / d * (m - d); nz += dz / d * (m - d); c.blockedBy = s; }
        }
      }
    }
    const lim = WORLD.HALF + 120;
    nx = clamp(nx, -lim, lim); nz = clamp(nz, -lim, lim);

    let ny = feet + c.vel.y * dt;
    if (c.vel.y > 0) {
      const rr = r * 0.7;
      for (let i = 0; i < arr.length; i++) {
        const s = arr[i];
        if (s.type !== 'box' && s.type !== 'ramp') continue;
        if (!(nx + rr > s.x0 && nx - rr < s.x1 && nz + rr > s.z0 && nz - rr < s.z1)) continue;
        const bottom = s.type === 'box' ? s.y0 : this.rampH(s, nx, nz) - 0.3;
        if (bottom >= feet + H - 0.05 && bottom < ny + H) { ny = bottom - H; c.vel.y = 0; }
      }
    }
    const g = this.groundAt(nx, nz, r, Math.max(feet, ny), null);
    let impact = 0;
    if (ny <= g) {
      if (c.vel.y < 0) { impact = -c.vel.y; c.vel.y = 0; }
      ny = g; c.onGround = true;
    } else if (c.onGround && c.vel.y <= 0.01 && ny - g < 0.7) {
      ny = g; c.vel.y = 0; c.onGround = true;
    } else c.onGround = false;
    c.pos.set(nx, ny, nz);
    c.inWater = ny < WORLD.WATER - 0.5 && WORLD.heightAt(nx, nz) < WORLD.WATER - 0.5;
    return impact;
  },

  // Is there a blocking solid at (x,z) for a body standing at feetY? Returns the solid.
  blockedAt(x, z, feetY, r, H = 1.85) {
    const arr = this.query(x - r, z - r, x + r, z + r, this._arr2);
    for (const s of arr) {
      if (s.type === 'box') {
        if (s.y1 <= feetY + STEP_UP || s.y0 >= feetY + H) continue;
        if (x + r > s.x0 && x - r < s.x1 && z + r > s.z0 && z - r < s.z1) return s;
      } else if (s.type === 'cyl') {
        if (s.y1 <= feetY + STEP_UP || s.y0 >= feetY + H) continue;
        if (Math.hypot(x - s.x, z - s.z) < r + s.r) return s;
      }
    }
    return null;
  },

  // ---------- Raycasting ----------
  rayTerrain(ox, oy, oz, dx, dy, dz, maxT) {
    const step = 1.6;
    let tPrev = 0;
    for (let t = step; ; t += step) {
      const tt = Math.min(t, maxT);
      const y = oy + dy * tt;
      if (dy > 0 && y > WORLD.maxH + 2) return Infinity;
      const h = WORLD.heightAt(ox + dx * tt, oz + dz * tt);
      if (y < h) {
        let a = tPrev, b = tt;
        for (let k = 0; k < 8; k++) {
          const m = (a + b) / 2;
          if (oy + dy * m < WORLD.heightAt(ox + dx * m, oz + dz * m)) b = m; else a = m;
        }
        return a;
      }
      tPrev = tt;
      if (tt >= maxT) return Infinity;
    }
  },
  raySolid(s, ox, oy, oz, dx, dy, dz) {
    if (s.type === 'box' || s.type === 'cone') {
      const y1 = s.type === 'cone' ? s.y0 + (s.y1 - s.y0) * 0.55 : s.y1;
      let tmin = -Infinity, tmax = Infinity;
      const lo = [s.x0, s.y0, s.z0], hi = [s.x1, y1, s.z1], o = [ox, oy, oz], d = [dx, dy, dz];
      for (let k = 0; k < 3; k++) {
        if (Math.abs(d[k]) < 1e-9) { if (o[k] < lo[k] || o[k] > hi[k]) return Infinity; continue; }
        let t1 = (lo[k] - o[k]) / d[k], t2 = (hi[k] - o[k]) / d[k];
        if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
        if (t1 > tmin) tmin = t1;
        if (t2 < tmax) tmax = t2;
        if (tmin > tmax) return Infinity;
      }
      if (tmax < 0) return Infinity;
      return tmin >= 0 ? tmin : 0;
    }
    if (s.type === 'cyl') {
      const fx = ox - s.x, fz = oz - s.z;
      const a = dx * dx + dz * dz;
      let best = Infinity;
      if (a > 1e-9) {
        const b = 2 * (fx * dx + fz * dz), c = fx * fx + fz * fz - s.r * s.r;
        const disc = b * b - 4 * a * c;
        if (disc >= 0) {
          const t = (-b - Math.sqrt(disc)) / (2 * a);
          if (t >= 0) { const y = oy + dy * t; if (y >= s.y0 && y <= s.y1) best = t; }
        }
      }
      if (Math.abs(dy) > 1e-9) {
        const t = (s.y1 - oy) / dy;
        if (t >= 0 && t < best) { const x = ox + dx * t - s.x, z = oz + dz * t - s.z; if (x * x + z * z <= s.r * s.r) best = t; }
      }
      return best;
    }
    if (s.type === 'ramp') {
      const w = s.dir % 2 ? s.z1 - s.z0 : s.x1 - s.x0, rise = s.y1 - s.y0;
      let u0, du;
      switch (s.dir) {
        case 0: u0 = (ox - s.x0) / w; du = dx / w; break;
        case 1: u0 = (oz - s.z0) / w; du = dz / w; break;
        case 2: u0 = (s.x1 - ox) / w; du = -dx / w; break;
        default: u0 = (s.z1 - oz) / w; du = -dz / w;
      }
      const F0 = oy - s.y0 - rise * u0, dF = dy - rise * du;
      if (Math.abs(dF) < 1e-9) return Infinity;
      const t = -F0 / dF;
      if (t < 0) return Infinity;
      const x = ox + dx * t, z = oz + dz * t;
      if (x < s.x0 - 0.05 || x > s.x1 + 0.05 || z < s.z0 - 0.05 || z > s.z1 + 0.05) return Infinity;
      return t;
    }
    return Infinity;
  },
  rayChar(c, ox, oy, oz, dx, dy, dz, maxT) {
    // head sphere first
    const sz = c.size || 1;
    const hx = c.pos.x, hy = c.pos.y + 1.66 * sz, hz = c.pos.z, hr = 0.3 * sz;
    let fx = ox - hx, fy = oy - hy, fz = oz - hz;
    let b = fx * dx + fy * dy + fz * dz, cc = fx * fx + fy * fy + fz * fz - hr * hr;
    let disc = b * b - cc;
    let head = Infinity;
    if (disc >= 0) { const t = -b - Math.sqrt(disc); if (t >= 0 && t < maxT) head = t; }
    // body cylinder
    const r = 0.5 * sz, y0 = c.pos.y, y1 = c.pos.y + 1.45 * sz;
    fx = ox - c.pos.x; fz = oz - c.pos.z;
    const a = dx * dx + dz * dz;
    let body = Infinity;
    if (a > 1e-9) {
      const bb = 2 * (fx * dx + fz * dz), c2 = fx * fx + fz * fz - r * r;
      const ds = bb * bb - 4 * a * c2;
      if (ds >= 0) {
        const sq = Math.sqrt(ds);
        for (const t of [(-bb - sq) / (2 * a), (-bb + sq) / (2 * a)]) {
          if (t >= 0 && t < maxT) { const y = oy + dy * t; if (y >= y0 && y <= y1) { body = t; break; } }
        }
      }
    }
    if (head < body) return { t: head, head: true };
    if (body < Infinity) return { t: body, head: false };
    return null;
  },

  // opts: {ignore, chars=true, solids=true, terrain=true}
  raycast(o, d, maxT, opts = {}) {
    const ox = o.x, oy = o.y, oz = o.z, dx = d.x, dy = d.y, dz = d.z;
    let best = maxT, hit = null;
    if (opts.terrain !== false) {
      const t = this.rayTerrain(ox, oy, oz, dx, dy, dz, best);
      if (t < best) { best = t; hit = { kind: 'terrain' }; }
    }
    if (opts.solids !== false) {
      const C = this.CELL;
      let cx = Math.floor(ox / C), cz = Math.floor(oz / C);
      const sx = dx > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1;
      let tMaxX = Math.abs(dx) > 1e-9 ? ((cx + (dx > 0 ? 1 : 0)) * C - ox) / dx : Infinity;
      let tMaxZ = Math.abs(dz) > 1e-9 ? ((cz + (dz > 0 ? 1 : 0)) * C - oz) / dz : Infinity;
      const tdx = Math.abs(dx) > 1e-9 ? C / Math.abs(dx) : Infinity;
      const tdz = Math.abs(dz) > 1e-9 ? C / Math.abs(dz) : Infinity;
      const st = ++this.stamp;
      for (let guard = 0; guard < 200; guard++) {
        const a = this.grid.get(this.key(cx, cz));
        if (a) for (let i = 0; i < a.length; i++) {
          const s = a[i];
          if (s._stamp === st) continue;
          s._stamp = st;
          if (s.noRay) continue;
          const t = this.raySolid(s, ox, oy, oz, dx, dy, dz);
          if (t < best) { best = t; hit = { kind: 'solid', solid: s }; }
        }
        const tNext = Math.min(tMaxX, tMaxZ);
        if (tNext > best) break;
        if (tMaxX < tMaxZ) { cx += sx; tMaxX += tdx; } else { cz += sz; tMaxZ += tdz; }
      }
    }
    if (opts.chars !== false) {
      for (const c of G.chars) {
        if (!c.alive || c.dormant || c === opts.ignore || c.state === 'bus') continue;
        const ddx = c.pos.x - ox, ddz = c.pos.z - oz;
        const along = ddx * dx + ddz * dz;
        if (along < -2 || along > best + 2) continue;
        const r = this.rayChar(c, ox, oy, oz, dx, dy, dz, best);
        if (r && r.t < best) { best = r.t; hit = { kind: 'char', char: c, head: r.head }; }
      }
    }
    if (!hit) return null;
    hit.t = best;
    hit.point = new THREE.Vector3(ox + dx * best, oy + dy * best, oz + dz * best);
    return hit;
  },
};
