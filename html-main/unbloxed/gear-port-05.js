// Unbloxed gear ports, batch 05: RPG, TommyGun, Darkheart, BlackironKatana, JetPack, Riptide, Acceleration Coil, ROBLOXTablet.
// Each gear follows its Roblox Tool scripts 1:1 (same activation, damage, cooldowns, timings, speeds, effects) on the engine in
// gear-fx.js. Units: 1 stud = 1 unit; Roblox vertical speeds x0.42 and vertical forces x(34/196.2) for our gravity. No sounds.
(function () {
  'use strict';
  const GX = window.GX; if (!GX) return;
  const V = GX.V, rnd = GX.rnd, clamp = GX.clamp, TAU = Math.PI * 2;
  const F30 = 1 / 30;            // one Roblox wait()
  const VY = .42;                // Roblox vertical speed -> ours
  const GR = 34 / 196.2;         // Roblox vertical acceleration -> ours
  const clock = () => performance.now() / 1000;
  const isMe = (o) => typeof me !== 'undefined' && !!o && o === me;
  const myS = (key) => { if (typeof me === 'undefined' || !me || me.ko || !GX.live()) return null; const S = me.gx; return S && S.def && S.def.key === key ? S : null; };
  const showHand = (o) => { try { if (o.c.gearMesh && o.w < 0) o.c.gearMesh.visible = true; } catch (e) { } };
  const hideHand = (o) => { try { if (o.c.gearMesh) o.c.gearMesh.visible = false; } catch (e) { } };
  let LMB = false, RPG = null, TAB = null, TABC = null, tabN = 0, JPBAR = null;

  // GUIs that live outside the 3D scene close themselves when the gear is no longer held (hub, death, other item)
  let wdOn = false;
  function watch() {
    if (wdOn) return; wdOn = true;
    const loop = () => {
      let any = false;
      try {
        if (RPG) { if (!RPG.alive) RPG = null; else { const S = myS('RPG'); if (!S || S._rpg !== RPG) RPG.close(); else any = true; } }
        if (TAB && TAB.style.display !== 'none') { if (!myS('ROBLOXTablet')) tabHide(); else any = true; }
        if (JPBAR) { if (!myS('JetPack')) jpBar(false); else any = true; }
      } catch (e) { }
      if (any) requestAnimationFrame(loop); else wdOn = false;
    };
    requestAnimationFrame(loop);
  }

  // ===================================================================================================== RPG
  // The RPG gear is a handheld video game (Workspace.RPG.Game Script). Click: after 0.2 s you are anchored (WalkSpeed 0), the gear
  // leaves your hand and a 640x480 platformer opens inside a console. W jumps (hold to keep rising, a new jump only 1 s after the
  // last), A/D walk, mouse clicks shoot toward the mouse (one shot per 0.75 s, 17 damage). 3 extra lives, 480 on the clock (it runs
  // at half speed, like the script's loop), 6 screens of gunners + a sea monster, then a 500 HP boss that rains fireballs and, under
  // 200 HP, adds a laser gun on every hit. After YOU LOSE the screen closes but you stay seated until the gear is put away.
  const RW = 640, RH = 480;
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1)); // Lua math.random(a, b)
  // checkForCollision(world, cur, offset): the moving object uses 5/7 of its size; the Y offset only moves its bottom edge
  const hitB = (w, c, ox, oy) => { const l = c.x + ox, r = c.x + 5 * c.w / 7 + ox, t = c.y, b = c.y + 5 * c.h / 7 + oy; return r > w.x && b > w.y && w.x + w.w > l && w.y + w.h > t; };
  const unit2 = (dx, dy) => { const L = Math.hypot(dx, dy); return L > 1e-9 ? { x: dx / L, y: dy / L } : null; };

  function rpgCreate(o, S) {
    const G = {
      o, S, t: 0, tasks: [], objs: [], seq: 0, dirty: false, alive: true, on: true, dur: 480, timeText: '480', timeRed: false, lives: 3,
      gravity: .00384, vx: 0, vy: 0, jumpT: -1e9, fw: false, bw: false, falling: false, jumping: false, firing: false, ff: false, stopFall: false,
      accel: false, scrolling: false, kill: false, plats: [], phys: [], enemies: [], cl: [], cr: [], screen: 0, char: null, spawnP: null, endP: null,
      boss: null, sea: null, w1: 0, w2: 0, wave: 0, proj: false, vw: 0, vh: 0
    };
    const at = (s, fn) => { G.tasks.push({ t: G.t + s, fn }); };                 // a coroutine step after wait(s)
    const add = (k, X, Y, w, h, z, ex) => { const b = Object.assign({ k, x: X, y: Y, w, h, z: z || 1, n: G.seq++, rm: false }, ex || {}); G.objs.push(b); G.dirty = true; return b; };

    // ---------- the console (RPG Image) around the 640x480 screen ----------
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;inset:0;z-index:60;pointer-events:none';
    const con = document.createElement('div');
    con.style.cssText = 'position:absolute;left:0;top:0;width:1068px;height:662px;transform-origin:0 0;pointer-events:auto;cursor:crosshair;user-select:none;border-radius:84px;'
      + 'background:linear-gradient(165deg,#525a6e,#2a2e3a 55%,#1c1f27);box-shadow:0 16px 50px rgba(0,0,0,.6),inset 0 3px 0 rgba(255,255,255,.14),inset 0 -8px 0 rgba(0,0,0,.35)';
    con.innerHTML = '<div style="position:absolute;left:194px;top:74px;width:684px;height:524px;border-radius:20px;background:#0c0e13;box-shadow:inset 0 0 0 3px #3a4152"></div>'
      + '<div style="position:absolute;left:0;top:22px;width:1068px;text-align:center;font:900 30px/1 Arial,sans-serif;letter-spacing:12px;color:#cdd5e8;text-shadow:0 2px 0 #000">RPG</div>'
      + '<div style="position:absolute;left:46px;top:311px;width:124px;height:42px;border-radius:9px;background:#15171e;box-shadow:inset 0 -3px 0 #000"></div>'
      + '<div style="position:absolute;left:87px;top:270px;width:42px;height:124px;border-radius:9px;background:#15171e;box-shadow:inset 0 -3px 0 #000"></div>'
      + '<div style="position:absolute;left:908px;top:262px;width:58px;height:58px;border-radius:50%;background:#d6343f;box-shadow:inset 0 -5px 0 rgba(0,0,0,.3)"></div>'
      + '<div style="position:absolute;left:964px;top:330px;width:58px;height:58px;border-radius:50%;background:#efc030;box-shadow:inset 0 -5px 0 rgba(0,0,0,.3)"></div>';
    const cv = document.createElement('canvas'); cv.width = RW; cv.height = RH;
    cv.style.cssText = 'position:absolute;left:216px;top:96px;width:640px;height:480px;border-radius:3px';
    con.appendChild(cv); wrap.appendChild(con); document.body.appendChild(wrap);
    G.cv = cv; G.con = con;
    const x = cv.getContext('2d');
    function layout() { // the screen sits in the middle of the window (scaled down on small windows)
      const w = innerWidth, h = innerHeight; if (w === G.vw && h === G.vh) return; G.vw = w; G.vh = h;
      const s = Math.min(1, (w - 16) / 1068, (h - 16) / 662);
      con.style.transform = 'translate(' + (w / 2 - 536 * s) + 'px,' + (h / 2 - 336 * s) + 'px) scale(' + s + ')';
    }

    // ---------- game logic: the LocalScript's functions ----------
    function createLocalCharacter() {
      if (G.char) return;
      G.ff = true;
      const c = G.char = add('hero', 0, 0, .03, .1, 1, { f: 1, dead: false });
      if (G.plats.length && G.spawnP) { c.x = G.spawnP.x; c.y = G.spawnP.y - .075; }
      at(1.5, () => { G.ff = false; });
    }
    function fallAcceleration() { // while falling: gravity = gravity + 2*gravity*wait(); wait()
      const loop = () => {
        if (!G.falling) { G.gravity = .00384; G.accel = false; return; }
        at(F30, () => { G.gravity += 2 * G.gravity * F30; at(F30, loop); });
      };
      loop();
    }
    function scrollWorld() { // the world slides left 0.01 per 0.1 s until the end platform is at the left edge
      for (const e of G.enemies) if (e) e.rm = true;
      G.enemies = [];
      const step = () => {
        if (!(G.endP && G.endP.x > .07)) {
          if (G.sea) { G.sea.rm = true; G.sea = null; }
          G.spawnP = G.endP; G.endP = null; G.scrolling = false; createPlatforms(); return;
        }
        const n = G.plats.length;
        for (let i = 0; i < n; i++) {
          const p = G.plats[i]; if (p) p.x -= .01;
          if (p && p === G.endP && G.char) G.char.x -= .01;
          if (p && p !== G.endP && p.x <= 0) { p.rm = true; G.plats.splice(i, 1); const j = G.phys.indexOf(p); if (j >= 0) G.phys.splice(j, 1); }
        }
        return .1;
      };
      const r = step(); if (r) at(r, step);
    }
    function createPlatforms() {
      const px = [ri(18, 20), ri(34, 40), ri(52, 60), ri(72, 76)], py = [ri(28, 40), ri(30, 46), ri(30, 32), ri(24, 28)];
      G.screen++;
      const e = G.endP = add('plat', ri(85, 92) / 100, ri(15, 24) / 100, .1, .025); G.plats.push(e); G.phys.push(e);
      for (let i = 0; i < 4; i++) { const p = add('plat', px[i] / 100, py[i] / 100, .1, .025); G.plats.push(p); G.phys.push(p); }
      createLocalCharacter();
      spawnAI();
    }
    function spawnAI() {
      if (G.screen === 7) { // the boss screen
        if (G.endP) { G.endP.rm = true; G.endP = null; }
        for (const p of G.plats) if (p.x > .5) { const j = G.phys.indexOf(p); if (j >= 0) G.phys.splice(j, 1); p.rm = true; }
        if (G.spawnP) { G.spawnP.y += .25; if (G.char) G.char.y += .25; }
        G.boss = add('boss', .7, .35, .3, .3, 2, { hp: 500, img: 1 });
        bossBattle();
      } else if (G.screen < 7 && G.screen > 0) {
        const sea = G.sea = add('sea', ri(25, 75) / 100, .79, .2, .2, 4);
        at(0, () => { // followChar: 0.03 toward the hero every 0.25 s
          if (sea.rm || !G.char) return;
          sea.x += Math.sign(G.char.x - sea.x + (G.char.w / 2 - sea.w / 2)) * .03; return .25;
        });
        for (let i = 1; i <= 2; i++) {
          const p = G.plats[(i + 1) + (i - 1) * ri(1, 2) - 1]; if (!p) continue;
          G.enemies[i - 1] = add('enemy', p.x, p.y - .075, .1, .1, 1, { hp: 35 });
          const k = i - 1; at(3, () => shootChar(k));
        }
      }
    }
    function shootChar(i) { // an enemy shoots a ball at the hero every 3 s
      const e = G.enemies[i]; if (!(e && !e.rm && G.char)) return;
      shoot(unit2(G.char.x - e.x, G.char.y - e.y), add('ball', e.x - .04, e.y, .03, .03));
      return 3;
    }
    function shoot(d, b) { // the ball moves 0.035 per 0.125 s
      let coll = false;
      if (!d) { b.rm = true; return; }
      at(0, () => {
        if (b.rm) return;
        b.x += d.x * .035; b.y += d.y * .035;
        if (b.x >= 1 || b.x <= 0 || b.y >= 1 || b.y <= 0) b.rm = true;
        if (!b.rm) {
          for (const p of G.phys) if (!b.rm && hitB(p, b, 0, 0)) b.rm = true;
          if (!b.rm && G.char) coll = hitB(G.char, b, 0, 0);
          if (coll && G.char && !G.ff) { G.kill = true; b.rm = true; }
        }
        return b.rm ? undefined : .125;
      });
    }
    function bossBattle() {
      at(3, () => { // spawnFireball: one falls where the hero is every 2-3 s
        if (!(G.char && G.boss)) return;
        rainFire(add('fire', G.char.x, 0, .05, .1)); return ri(2, 3);
      });
      let py = .02;
      at(0, () => { const B = G.boss; if (!B) return; if (B.y > .5) py = -.02; else if (B.y < .25) py = .02; B.y += py; return .25; });
    }
    function rainFire(f) {
      let coll = false;
      at(0, () => {
        if (f.rm || !G.boss) return;
        f.y += .01;
        if (G.char) coll = hitB(G.char, f, 0, 0);
        if (coll && G.char && !G.ff) { G.kill = true; f.rm = true; }
        if (!f.rm && f.y > 1) f.rm = true;
        return f.rm ? undefined : F30;
      });
    }
    function fireLaser() { // another laser gun: first shot after 4 s, then every 2-3 s
      at(4, () => {
        if (!(G.char && G.boss)) return;
        const B = G.boss, d = { x: G.char.x - B.x, y: G.char.y - B.y };
        laserify(add('laser', B.x - .1, B.y, .05, .05), d); return ri(2, 3);
      });
    }
    function laserify(L, d) { // moves 2% of the boss->hero distance per frame
      let coll = false;
      at(0, () => {
        if (L.rm || !G.boss) return;
        L.x += d.x * .02; L.y += d.y * .02;
        if (G.char) coll = hitB(G.char, L, 0, 0);
        if (coll && G.char && !G.ff) { G.kill = true; L.rm = true; }
        for (const p of G.phys) if (!L.rm && hitB(p, L, 0, 0)) L.rm = true;
        if (!L.rm && (L.x < 0 || L.x > 4 || Math.abs(L.y) > 4)) L.rm = true;
        return L.rm ? undefined : F30;
      });
    }
    function updateBoss() {
      const B = G.boss; if (!B) return; const h = B.hp;
      if (h >= 300 && h < 400) B.img = 2; else if (h > 200 && h < 300) B.img = 3; else if (h > 100 && h < 200) B.img = 4; else if (h > 0 && h < 100) B.img = 5;
      if (h < 200) fireLaser();
    }
    function worldUpdate() {
      const c = G.char;
      if (c) { // setCharacterVelocity
        G.vx = 0; G.vy = 0;
        if (G.fw) { c.f = 1; G.vx += .005; } else if (G.bw) { c.f = -1; G.vx -= .005; }
        if (G.falling) { if (!G.accel) { G.accel = true; fallAcceleration(); } G.vy += G.gravity; }
        if (G.jumping) G.vy -= .02;
      }
      G.stopFall = false; // simulateCharacterPhysics
      if (G.phys.length && c) {
        for (const p of G.phys.slice()) {
          const cx = hitB(p, c, G.vx, 0), cy = hitB(p, c, 0, G.vy);
          if (cx) G.vx = 0;
          if (cy) {
            if (G.vy < 0) G.vy = 0;
            else if (G.vy > 0) { G.vy = 0; G.stopFall = true; if (p === G.endP && !G.scrolling) { G.scrolling = true; scrollWorld(); } G.falling = false; }
          }
        }
        if (!G.stopFall) G.falling = true;
      }
      if (!G.scrolling && c) { if (c.y + G.vy < 0) c.x += G.vx; else { c.x += G.vx; c.y += G.vy; } } // moveCharacter
    }
    function mainA() { // gameUpdate loop: World:Update(); gameDuration -= wait(); checks; wait()
      if (!(G.on && G.dur > 0)) { loopEnd(); return; }
      worldUpdate();
      const t0 = G.t; at(F30, () => mainB(t0));
    }
    function mainB(t0) {
      G.dur -= G.t - t0; G.timeText = String(Math.floor(G.dur)); if (G.dur < 60) G.timeRed = true;
      const c = G.char;
      if (c && (c.y > .85 || G.kill)) {
        G.kill = false; c.dead = true;
        at(1, () => {
          c.rm = true; if (G.char === c) G.char = null;
          if (G.lives > 0) { G.lives--; createLocalCharacter(); G.falling = false; G.stopFall = true; at(F30, mainA); }
          else {
            add('text', .5, .5, 0, 0, 10, { s: 'YOU LOSE', col: '#0000ff' });
            at(3, () => { G.on = false; G.falling = false; G.stopFall = true; at(F30, mainA); });
          }
        });
        return;
      }
      at(F30, mainA);
    }
    function loopEnd() {
      G.jumpT = 0; G.screen = 0; G.kill = false; G.fw = G.bw = false; G.falling = G.jumping = G.firing = G.stopFall = G.scrolling = false;
      G.boss = null; G.enemies = []; G.vx = G.vy = 0; G.gravity = .0384;
    }

    // ---------- input ----------
    G.key = (code, down) => {
      if (!G.char) return;
      if (code === 'KeyW') { if (down) { const t = clock(); if (t - G.jumpT > 1) { G.jumpT = t; G.jumping = true; } } else G.jumping = false; }
      else if (code === 'KeyA') G.bw = down; else if (code === 'KeyD') G.fw = down;
    };
    G.fireAt = (cx, cy) => { // gameCharFire: one shot toward the mouse, then 0.75 s until the next
      if (!(G.alive && G.proj && !G.firing && G.char)) return;
      G.firing = true;
      const r = cv.getBoundingClientRect(), mx = (cx - r.left) * RW / (r.width || RW), my = (cy - r.top) * RH / (r.height || RH);
      const c = G.char, px = c.x * RW, py = c.y * RH;
      let s;
      if (mx > px) { c.f = 1; s = add('shot', c.x + .03, c.y + .025, .02, .02); } else { c.f = -1; s = add('shot', c.x - .03, c.y + .025, .02, .02); }
      const d = unit2(mx - px, my - py); let coll = false;
      if (!d) s.rm = true;
      else at(0, () => {
        if (s.rm) return;
        s.x += d.x * .02; s.y += d.y * .02;
        if (s.x >= 1 || s.x <= 0 || s.y >= 1 || s.y <= 0) s.rm = true;
        for (const p of G.phys) { if (!s.rm) coll = hitB(p, s, 0, 0); if (coll && !s.rm) s.rm = true; }
        for (const e of G.enemies) { if (!e || e.rm) continue; if (!s.rm) coll = hitB(e, s, 0, 0); if (coll && !s.rm) { s.rm = true; if (e.hp > 0) e.hp -= 17; else e.rm = true; } }
        if (!s.rm && G.boss) {
          coll = hitB(G.boss, s, 0, 0);
          if (coll) {
            s.rm = true; const B = G.boss;
            if (B.hp > 0) { B.hp -= 17; updateBoss(); }
            else { B.rm = true; G.boss = null; G.scrolling = true; add('text', .5, .5, 0, 0, 10, { s: 'YOU WON', col: '#ff0000' }); }
          }
        }
        return s.rm ? undefined : F30;
      });
      at(.75, () => { G.firing = false; });
    };
    G.run = (dt) => {
      G.t += dt; const L = G.tasks; G.tasks = [];
      for (const k of L) {
        if (!G.alive) return;
        if (k.t > G.t + 1e-4) { G.tasks.push(k); continue; }
        let r; try { r = k.fn(); } catch (e) { console.warn('[gear] RPG', e); }
        if (typeof r === 'number') { k.t = G.t + r; G.tasks.push(k); }
      }
    };
    G.close = () => { if (!G.alive) return; G.alive = false; G.on = false; G.tasks = []; if (wrap.parentNode) wrap.parentNode.removeChild(wrap); if (RPG === G) RPG = null; };

    // ---------- drawing ----------
    const ell = (cx, cy, rx, ry) => { x.beginPath(); x.ellipse(cx, cy, Math.max(.1, rx), Math.max(.1, ry), 0, 0, TAU); x.fill(); };
    const sky = x.createLinearGradient(0, 0, 0, RH); sky.addColorStop(0, '#4fb0ee'); sky.addColorStop(.62, '#bfe7ff'); sky.addColorStop(1, '#e2f6ff');
    const weeds = Array.from({ length: 16 }, (_, i) => ({ x: i * 41 + ri(0, 20), h: ri(50, 105), p: Math.random() * TAU, c: Math.random() < .5 ? '#2c7a3c' : '#3f9a4a' }));
    function water(dx, top, col, ph) { x.fillStyle = col; x.beginPath(); x.moveTo(-12 + dx, RH); for (let px = -12; px <= RW + 12; px += 16) x.lineTo(px + dx, RH * top + Math.sin(px / 38 + ph) * 4); x.lineTo(RW + 12 + dx, RH); x.closePath(); x.fill(); }
    function foam(top, col, ph) { x.strokeStyle = col; x.lineWidth = 3; x.beginPath(); for (let px = 0; px <= RW; px += 8) { const y = RH * top + Math.sin(px / 22 + ph) * 3; if (px) x.lineTo(px, y); else x.moveTo(px, y); } x.stroke(); }
    function heart(cx, cy, r) { x.fillStyle = '#e8283c'; x.beginPath(); x.moveTo(cx, cy + r * .9); x.bezierCurveTo(cx - r * 1.5, cy - r * .1, cx - r * .7, cy - r * 1.2, cx, cy - r * .35); x.bezierCurveTo(cx + r * .7, cy - r * 1.2, cx + r * 1.5, cy - r * .1, cx, cy + r * .9); x.fill(); x.strokeStyle = '#7a0d18'; x.lineWidth = 1.5; x.stroke(); }
    function backdrop() { // background, seaweed, 2 water layers (jitter each frame), 2 wave layers (the first bobs), the clock
      x.fillStyle = sky; x.fillRect(0, 0, RW, RH);
      x.fillStyle = 'rgba(255,248,190,.95)'; ell(560, 58, 24, 24);
      x.fillStyle = '#8bbbd9'; ell(120, 386, 150, 26); ell(470, 388, 120, 20);
      x.lineCap = 'round'; x.lineWidth = 6;
      for (const w of weeds) { const s = Math.sin(G.t * 1.6 + w.p) * 8; x.strokeStyle = w.c; x.beginPath(); x.moveTo(w.x, RH + 4); x.bezierCurveTo(w.x + 12 + s, RH - w.h * .35, w.x - 12 + s, RH - w.h * .7, w.x + s * 1.4, RH - w.h); x.stroke(); }
      water(G.w1 * RW, .8, 'rgba(38,124,214,.62)', 0);
      water(G.w2 * RW, .835, 'rgba(22,86,170,.62)', 2.1);
      foam(.785 + G.wave, 'rgba(255,255,255,.9)', 0); foam(.8, 'rgba(220,240,255,.7)', 1.3);
      x.font = 'bold 12px Arial,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = G.timeRed ? '#ff0000' : '#1b2533'; x.fillText(G.timeText, RW * .96, 10);
    }
    const DR = {
      cloud(b) { const X = b.x * RW, Y = b.y * RH, w = b.w * RW, h = b.h * RH, k = (b.v - 1) * .05; x.fillStyle = '#ffffff'; ell(X + w * (.3 - k), Y + h * .62, w * .28, h * .42); ell(X + w * .55, Y + h * (.42 + k), w * (.3 + k), h * .5); ell(X + w * (.78 + k * .5), Y + h * .64, w * .22, h * .36); x.fillRect(X + w * .3, Y + h * .6, w * .48, h * .4); },
      plat(b) { const X = b.x * RW, Y = b.y * RH, w = b.w * RW, h = b.h * RH; x.fillStyle = '#8a5a2b'; x.fillRect(X, Y, w, h); x.fillStyle = '#58b947'; x.fillRect(X, Y, w, Math.max(2, h * .38)); x.strokeStyle = '#3b2412'; x.lineWidth = 1; x.strokeRect(X + .5, Y + .5, w - 1, h - 1); },
      hero(b) {
        const X = b.x * RW, Y = b.y * RH, w = b.w * RW, h = b.h * RH, f = b.f, dd = b.dead;
        x.fillStyle = dd ? '#5d5d5d' : '#2f9e4a'; x.fillRect(X + w * .14, Y + h * .64, w * .34, h * .36); x.fillRect(X + w * .52, Y + h * .64, w * .34, h * .36);
        x.fillStyle = dd ? '#7a7a7a' : '#1f6fd1'; x.fillRect(X + w * .08, Y + h * .3, w * .84, h * .36);
        x.fillStyle = dd ? '#a0a0a0' : '#f5cd30'; x.fillRect(X + w * .18, Y + h * .04, w * .64, h * .25);
        const ex = f > 0 ? X + w * .58 : X + w * .26;
        if (dd) { x.strokeStyle = '#d01010'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(ex, Y + h * .1); x.lineTo(ex + 3, Y + h * .17); x.moveTo(ex + 3, Y + h * .1); x.lineTo(ex, Y + h * .17); x.stroke(); }
        else { x.fillStyle = '#1b1b1b'; x.fillRect(ex, Y + h * .1, 2.2, 3.4); }
        const ax = f > 0 ? X + w * .72 : X + w * .1;
        x.fillStyle = dd ? '#a0a0a0' : '#f5cd30'; x.fillRect(ax, Y + h * .36, w * .18, h * .1);
        x.fillStyle = '#3a3a44'; x.fillRect(f > 0 ? ax + w * .18 : ax - 8, Y + h * .35, 8, 4);
      },
      enemy(b) { // a crab gunner
        const X = b.x * RW, Y = b.y * RH, w = b.w * RW, h = b.h * RH, cx = X + w / 2, by = Y + h * .66;
        x.strokeStyle = '#a8271c'; x.lineWidth = 3; x.lineCap = 'round';
        for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { x.beginPath(); x.moveTo(cx + s * w * .18, by + h * .08); x.lineTo(cx + s * w * (.3 + k * .07), Y + h * .98); x.stroke(); }
        for (const s of [-1, 1]) { x.strokeStyle = '#a8271c'; x.lineWidth = 3; x.beginPath(); x.moveTo(cx + s * w * .22, by - h * .05); x.lineTo(cx + s * w * .4, Y + h * .42); x.stroke(); x.fillStyle = '#e3442f'; ell(cx + s * w * .42, Y + h * .36, w * .1, h * .12); x.fillStyle = '#ffd7cf'; ell(cx + s * w * .45, Y + h * .3, w * .035, h * .05); }
        x.fillStyle = '#e3442f'; ell(cx, by, w * .3, h * .2);
        x.fillStyle = 'rgba(255,255,255,.25)'; ell(cx - w * .08, by - h * .07, w * .12, h * .05);
        x.strokeStyle = '#a8271c'; x.lineWidth = 2;
        for (const s of [-1, 1]) { x.beginPath(); x.moveTo(cx + s * w * .08, by - h * .14); x.lineTo(cx + s * w * .1, Y + h * .24); x.stroke(); x.fillStyle = '#ffffff'; ell(cx + s * w * .1, Y + h * .2, 5, 5); x.fillStyle = '#111111'; ell(cx + s * w * .1 - 1.5, Y + h * .2, 2.2, 2.4); }
      },
      ball(b) { const X = b.x * RW, Y = b.y * RH, w = b.w * RW, h = b.h * RH; x.fillStyle = '#1e1e24'; ell(X + w / 2, Y + h / 2, w / 2, h / 2); x.fillStyle = 'rgba(255,255,255,.35)'; ell(X + w * .35, Y + h * .32, w * .15, h * .14); },
      shot(b) { const X = b.x * RW, Y = b.y * RH, w = b.w * RW, h = b.h * RH, cx = X + w / 2, cy = Y + h / 2, g = x.createRadialGradient(cx, cy, 0, cx, cy, w * .8); g.addColorStop(0, '#ffffff'); g.addColorStop(.45, '#ffe45c'); g.addColorStop(1, 'rgba(255,140,0,0)'); x.fillStyle = g; ell(cx, cy, w * .8, h * .8); },
      fire(b) {
        const X = b.x * RW, Y = b.y * RH, w = b.w * RW, h = b.h * RH, cx = X + w / 2, cy = Y + h * .72, g = x.createRadialGradient(cx, cy, 1, cx, cy, h * .62);
        g.addColorStop(0, '#fffbd0'); g.addColorStop(.35, '#ffc22e'); g.addColorStop(.75, '#ff5a12'); g.addColorStop(1, 'rgba(200,30,0,0)');
        x.fillStyle = g; x.beginPath(); x.moveTo(cx, Y); x.quadraticCurveTo(cx + w * .62, Y + h * .62, cx, Y + h); x.quadraticCurveTo(cx - w * .62, Y + h * .62, cx, Y); x.fill();
      },
      laser(b) { const X = b.x * RW, Y = b.y * RH, w = b.w * RW, h = b.h * RH, cx = X + w / 2, cy = Y + h / 2; x.fillStyle = 'rgba(255,40,80,.5)'; ell(cx, cy, w * .55, h * .5); x.fillStyle = '#ff3b5c'; ell(cx, cy, w * .4, h * .3); x.fillStyle = '#ffffff'; ell(cx, cy, w * .2, h * .13); },
      sea(b) { // the sea monster swimming after you
        const X = b.x * RW, Y = b.y * RH, w = b.w * RW, h = b.h * RH;
        x.fillStyle = '#2f9d5c'; x.strokeStyle = '#1d6b3c'; x.lineWidth = 2;
        for (const [hx, hr, hh] of [[.18, .14, .3], [.45, .15, .34]]) { x.beginPath(); x.ellipse(X + w * hx, Y + h * .62, w * hr, h * hh, 0, Math.PI, 0); x.closePath(); x.fill(); x.stroke(); }
        x.beginPath(); x.moveTo(X + w * .64, Y + h * .62); x.quadraticCurveTo(X + w * .66, Y + h * .08, X + w * .86, Y + h * .14); x.lineTo(X + w * .94, Y + h * .3); x.quadraticCurveTo(X + w * .8, Y + h * .3, X + w * .82, Y + h * .62); x.closePath(); x.fill(); x.stroke();
        x.fillStyle = '#5fd08a'; for (const fx of [.12, .4]) { x.beginPath(); x.moveTo(X + w * fx, Y + h * .4); x.lineTo(X + w * (fx + .05), Y + h * .26); x.lineTo(X + w * (fx + .1), Y + h * .4); x.fill(); }
        x.fillStyle = '#ffffff'; ell(X + w * .84, Y + h * .2, 4, 4); x.fillStyle = '#111111'; ell(X + w * .85, Y + h * .2, 2, 2.2);
      },
      boss(b) { // the boss: 5 looks as its health drops
        const X = b.x * RW, Y = b.y * RH, w = b.w * RW, h = b.h * RH, cx = X + w / 2, cy = Y + h * .5, st = b.img, fl = Math.sin(G.t * 7) * .12;
        x.fillStyle = '#4a2580';
        for (const s of [-1, 1]) { x.beginPath(); x.moveTo(cx + s * w * .2, cy - h * .1); x.lineTo(cx + s * w * .5, cy - h * (.42 + fl)); x.lineTo(cx + s * w * .46, cy + h * .05); x.lineTo(cx + s * w * .3, cy + h * .1); x.closePath(); x.fill(); }
        x.fillStyle = ['#7b3fc4', '#7240b2', '#6a3ea0', '#7a2f72', '#5a2335'][st - 1] || '#7b3fc4'; ell(cx, cy, w * .3, h * .36);
        x.fillStyle = 'rgba(255,255,255,.14)'; ell(cx - w * .08, cy - h * .14, w * .14, h * .12);
        x.fillStyle = '#efe6c8'; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(cx + s * w * .12, cy - h * .3); x.lineTo(cx + s * w * .22, cy - h * .52); x.lineTo(cx + s * w * .2, cy - h * .26); x.closePath(); x.fill(); }
        const red = st >= 4;
        for (const s of [-1, 1]) { x.fillStyle = red ? '#ffdddd' : '#ffffff'; ell(cx + s * w * .1, cy - h * .1, w * .06, h * .07); x.fillStyle = red ? '#e01010' : '#111111'; ell(cx + s * w * .1 - w * .015, cy - h * .09, w * .025, h * .035); }
        x.fillStyle = '#2a0d1e'; x.beginPath(); x.ellipse(cx, cy + h * .14, w * .14, h * .07, 0, 0, Math.PI); x.fill();
        x.fillStyle = '#ffffff'; for (let i = -2; i <= 2; i++) { const tx = cx + i * w * .045; x.beginPath(); x.moveTo(tx - 4, cy + h * .14); x.lineTo(tx + 4, cy + h * .14); x.lineTo(tx, cy + h * .19); x.closePath(); x.fill(); }
        x.strokeStyle = 'rgba(20,0,10,.75)'; x.lineWidth = 2;
        for (let k = 0; k < st - 1; k++) { const a = k * 1.7 + .4, sx = cx + Math.cos(a) * w * .2, sy = cy + Math.sin(a) * h * .22; x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + 8, sy + 6); x.lineTo(sx + 3, sy + 13); x.lineTo(sx + 11, sy + 20); x.stroke(); }
        if (st >= 5) { x.fillStyle = 'rgba(60,60,60,.4)'; const u = (G.t * 18) % 24; ell(cx + w * .2, cy - h * .3 - u, 7 + u * .3, 7 + u * .3); }
      },
      lives(b) { const X = b.x * RW, Y = b.y * RH; for (let i = 0; i < G.lives; i++) heart(X + 12 + i * 27, Y + 12, 10); },
      text(b) { x.font = 'bold 24px Arial,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 4; x.strokeStyle = 'rgba(255,255,255,.85)'; x.strokeText(b.s, RW * b.x, RH * b.y); x.fillStyle = b.col; x.fillText(b.s, RW * b.x, RH * b.y); }
    };
    G.draw = () => {
      layout(); backdrop();
      if (G.dirty) { G.objs = G.objs.filter((b) => !b.rm); G.objs.sort((a, b) => a.z - b.z || a.n - b.n); G.dirty = false; }
      for (const b of G.objs) if (!b.rm) { try { DR[b.k](b); } catch (e) { } }
    };

    // ---------- createGameInterface, waitUntilDone, gameUpdate ----------
    add('lives', .03, .01, .13, .05, 2);
    for (let i = 0; i < 7; i++) { const c = add('cloud', 0, 0, .1, .04, 1, { v: ri(1, 4) }); (ri(1, 2) === 1 ? G.cl : G.cr).push(c); c.x = ri(10, 90) / 100; c.y = ri(5, 15) / 100; }
    at(0, () => { G.w1 = G.w1 ? 0 : .005; G.w2 = G.w2 ? 0 : -.005; return F30; });
    at(0, () => { G.wave = G.wave ? 0 : .025; return .25; });
    at(0, () => { // animateClouds (only while both directions have clouds)
      if (!(G.cl.length && G.cr.length)) return;
      for (const c of G.cl) { if (c.x > .94) { c.x = .04; c.y = ri(5, 15) / 100; } else c.x += ri(3, 5) / 1000; }
      for (const c of G.cr) { if (c.x < .02) { c.x = .98; c.y = ri(5, 15) / 100; } else c.x -= ri(4, 6) / 1000; }
      return .25;
    });
    G.spawnP = add('plat', .05, .19, .1, .025); G.plats.push(G.spawnP); G.phys.push(G.spawnP);
    createPlatforms();
    G.proj = true;
    at(1, () => { if (G.on) return 1; G.close(); S._rpgOn = false; showHand(o); }); // the game is over: screen away, gear back in hand
    at(0, mainA);
    layout();
    return G;
  }
  function rpgBegin(o, S) { // after the 0.2 s wait: Torso.Anchored = true, WalkSpeed 0, RPG.Transparency 1, the game opens
    S._rpgAnchor = o.pos.clone(); hideHand(o);
    if (!isMe(o)) return;
    try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) { } // the mouse aims inside the game
    const G = rpgCreate(o, S); S._rpg = G; RPG = G; watch();
  }
  GX.def('RPG', {
    tip: 'click: play the handheld game (you sit still) · W jump, A/D walk, click to shoot toward the mouse · switch items to get up',
    sp: (o, S) => (S._rpgAnchor ? 1e-6 : 1), jp: (o, S) => (S._rpgAnchor ? 1e-6 : 1),
    click(o, S) { if (!isMe(o) || S._rpgOn) return true; S._rpgOn = true; S._rpgPre = .2; return true; },
    tick(o, S, dt) {
      if (S._rpgPre > 0 && (S._rpgPre -= dt) <= 0) { S._rpgPre = 0; rpgBegin(o, S); }
      if (S._rpgAnchor) { o.pos.copy(S._rpgAnchor); o.vel.set(0, 0, 0); if (o.c && o.c.root) o.c.root.position.copy(o.pos); }
      const G = S._rpg; if (!G) return;
      if (!G.alive) { S._rpg = null; return; }
      G.run(Math.min(dt, .1)); if (G.alive) G.draw();
    },
    off(o, S) { if (S._rpg) S._rpg.close(); S._rpg = null; S._rpgAnchor = null; S._rpgOn = false; S._rpgPre = 0; showHand(o); }
  });

  // ===================================================================================================== TommyGun
  // Automatic: holding the mouse fires every 0.05 s, shells fly 200 studs/s for 250 studs, 5 damage, random spread of up to 0.1 rad
  // on each axis. 50-round drum, then a 3 s reload (the drum goes to the left hand). Muzzle flash: orange or red light for 0.05 s.
  function tgFire(o, S) {
    if ((S.cd.fire || 0) > 0 || S.reload > 0) return;
    if (S.ammo == null) S.ammo = 50;
    if (S.ammo <= 0) { S.reload = 3; o._tgRel = clock() + 3; o._tgAmmo = 50; return; }
    S.ammo--; S.cd.fire = .05; o._tgAmmo = S.ammo;
    const f = GX.fwd(o), from = GX.hand(o).addScaledVector(f, 3.1), dir = GX.aimPoint(o, 250).sub(from);
    if (dir.lengthSq() < 1e-6) dir.copy(f); dir.normalize();
    dir.applyEuler(new THREE.Euler((Math.random() - .5) * .2, (Math.random() - .5) * .2, (Math.random() - .5) * .2, 'XYZ')); // CFrame.Angles(spread)
    GX.fade(GX.mk(GX.GS, GX.tm(Math.random() > .5 ? '#ffa23a' : '#ff3b2a', .9, true), from, .45), .05, 2);
    const m = GX.mk(GX.GB, GX.sm('#d9a646'), from); m.scale.set(.12, .12, .5);
    GX.shot(o, { from, dir, spd: 200, mesh: m, face: true, r: .3, life: 1.25, dmg: 5, hit: { kb: 0, up: 0 } });
    if (S.ammo <= 0) { S.reload = 3; o._tgRel = clock() + 3; o._tgAmmo = 50; } // OnReload
  }
  function tgDrumOff(S) { if (S._tgDrum) { if (S._tgDrum.parent) S._tgDrum.parent.remove(S._tgDrum); S._tgDrum = null; } }
  GX.def('TommyGun', {
    tip: 'hold click: automatic fire (5 damage, 20 shots/s) · 50-round drum, 3 s reload',
    mag: 50, reload: 3, auto: true,
    click(o, S) { if (isMe(o) && !LMB) return true; tgFire(o, S); return true; }, // fires while the button is down (Button1Down..Up)
    on(o, S) { const left = (o._tgRel || 0) - clock(); if (left > 0) S.reload = left; else if (o._tgAmmo != null) S.ammo = o._tgAmmo; },
    tick(o, S) {
      if (!(S.reload > 0) && S.ammo != null) o._tgAmmo = S.ammo;
      const c = o.c; if (!c || !c.aL) return;
      const rl = S.reload > 0;
      if (rl && !S._tgDrum) { const m = new THREE.Mesh(GX.GCY, GX.sm('#2a2a2e')); m.scale.set(.42, .32, .42); m.rotation.x = Math.PI / 2; m.position.set(0, -1.55, .25); m.userData.fx = 1; c.aL.add(m); S._tgDrum = m; }
      if (!rl) tgDrumOff(S);
      if (o.swing > 0) return;
      if (rl) { c.aL.rotation.x = -.7; c.aL.rotation.z = -.25; }   // reload animation: the drum in the left hand
      else { c.aL.rotation.x = -1.35; c.aL.rotation.z = -.8; }     // hold animation: left hand forward under the gun
    },
    off(o, S) { tgDrumOff(S); }
  });

  // ===================================================================================================== classic swords
  // Darkheart, BlackironKatana and Riptide are classic swords: the blade hurts whatever it touches (Handle.Touched) with the current
  // Damage, all the time. Click = slash; a second click within 0.2 s = lunge (more damage, the tool is off until it ends, the grip
  // turns the blade out). Touch = contact start, so each new swing hits again. Slash damage is reset at once in Darkheart and
  // Blackiron, so their slash hits for the base damage.
  const Z_IDLE = [3.2, .7], Z_SWING = [5.6, 1], Z_OUT = [6.2, .6]; // [reach, half angle]: blade up / swinging / out (lunge grip)
  function inZone(o, t, z) {
    if (Math.abs(t.pos.y - o.pos.y) > 4.5) return false;
    const dx = t.pos.x - o.pos.x, dz = t.pos.z - o.pos.z, d = Math.hypot(dx, dz);
    if (d > z[0]) return false; if (d < 1) return true;
    let a = Math.atan2(dx, dz) - o.yaw; a = Math.atan2(Math.sin(a), Math.cos(a)); return Math.abs(a) <= z[1];
  }
  const BLACK = new THREE.MeshStandardMaterial({ color: '#141414', roughness: .7 }); // "Really black"
  function darkEffect(t) { // Darkheart kill: the body turns black, then after 0.25 s every part flies off flat at 80 studs/s (10 s)
    if (!t || !t.c || !t.c.root) return;
    try { GX.tint(t, '#141414', 'darkheart'); } catch (e) { }
    GX.later(.25, () => {
      const c = t.c; if (!t.ko || !c.root.visible || !c.root.parent) return;
      c.root.updateMatrixWorld(true);
      const units = [[c.torso], [c.head, c.face], [c.aL], [c.aR], [c.lL], [c.lR], [c.H], [c.HG]];
      if (c.sw && c.sw.visible) units.push([c.sw]);
      for (const u of units) {
        const g = new THREE.Group(); let n = 0;
        for (const p of u) {
          if (!p || !p.visible) continue;
          const cl = p.clone(!!p.isGroup);
          if (p !== c.face) cl.traverse((m) => { if (m.isMesh) m.material = BLACK; else if (m.isSprite) m.visible = false; });
          p.matrixWorld.decompose(cl.position, cl.quaternion, cl.scale); g.add(cl); n++;
        }
        if (!n) continue;
        scene.add(g);
        const v = new V(Math.random() - .5, 0, Math.random() - .5); if (v.lengthSq() < 1e-6) v.set(1, 0, 0); v.normalize().multiplyScalar(80);
        const ref = g.children[0]; let T = 0;
        GX.fx({
          up(dt) { T += dt; if (v.lengthSq() > 0) { const p = ref.position.clone().add(g.position).addScaledVector(v, dt); if (GX.solidAt(p)) v.set(0, 0, 0); else g.position.addScaledVector(v, dt); } return T < 10; },
          end() { if (g.parent) g.parent.remove(g); }
        });
      }
      c.root.visible = false; // respawn() shows the character again
    });
  }
  const BV_A = 4000 / 12.6; // BodyVelocity MaxForce 4000 on a ~12.6-mass R6 character: max acceleration in studs/s^2
  function classicSword(name, cfg) {
    const st = (o) => { const m = o._csw || (o._csw = {}); return m[name] || (m[name] = { dmg: cfg.base, last: -9, lt: -1, grip: 0, inn: new Set(), hd: 0, bv: 0 }); };
    GX.def(name, {
      tip: cfg.tip,
      click(o) {
        const W = st(o); if (W.lt >= 0) return true;             // Tool.Enabled is false for the whole lunge
        const t = clock();
        if (t - W.last < .2) { W.dmg = cfg.lunge; W.lt = 0; W.bv = cfg.bv ? cfg.bv.t : 0; GX.swing(o, true); }
        else { W.dmg = cfg.after; GX.swing(o, false); }
        W.inn.clear(); W.last = t; return true;
      },
      tick(o, S, dt) {
        const W = st(o);
        if (W.hd > 0) W.hd -= dt; if (W.bv > 0) W.bv -= dt;
        if (W.lt >= 0) {
          W.lt += dt;
          if (!W.grip && W.lt >= cfg.out && W.lt < cfg.busy) { W.grip = 1; W.inn.clear(); }                 // SwordOut
          if (W.lt >= cfg.busy) { W.grip = 0; W.lt = -1; W.dmg = cfg.after; W.inn.clear(); }              // SwordUp, Tool.Enabled
        }
        const z = o.swing > 0 ? Z_SWING : W.grip ? Z_OUT : Z_IDLE, now = new Set();
        for (const t of chars) {
          if (t === o || t.ko || !inZone(o, t, z)) continue;
          if (W.inn.has(t)) { now.add(t); continue; }
          if (cfg.hd && W.hd > 0) continue;                       // HitDelay: this touch is ignored
          now.add(t); if (cfg.hd) W.hd = cfg.hd;
          if (cfg.heal) o.hp = Math.min(o.mhp || 100, o.hp + W.dmg * cfg.heal);
          GX.hurt(o, t, W.dmg, { kb: 3, up: 0, kill: cfg.dark ? darkEffect : null });
        }
        W.inn = now;
      },
      fly(o, dt) { // the lunge's BodyVelocity (0, 10, 0)
        const m = o._csw, W = m && m[name]; if (!W || !(W.bv > 0) || !cfg.bv) return;
        const ay = BV_A * GR * dt; o.vel.y += clamp(cfg.bv.vy * VY - o.vel.y, -ay, ay);
        if (cfg.bv.all) { const ah = BV_A * dt; o.vel.x += clamp(-o.vel.x, -ah, ah); o.vel.z += clamp(-o.vel.z, -ah, ah); }
      },
      off(o) { const W = st(o); if (W.lt >= 0) { W.lt = -1; W.dmg = cfg.after; } W.grip = 0; W.bv = 0; W.inn.clear(); }
    });
  }
  classicSword('Darkheart', { base: 20, after: 20, lunge: 36, busy: 1, out: .25, bv: { t: .5, vy: 10 }, heal: .4, dark: true,
    tip: 'click: slash (20) · double-click: lunge (36, lifts you) · every hit heals you 40% of its damage · kills shatter black' });
  classicSword('BlackironKatana', { base: 5, after: 5, lunge: 16, busy: .95, out: .2, hd: .05,
    tip: 'click: slash (5) · double-click: lunge (16)' });
  classicSword('Riptide', { base: 5, after: 6, lunge: 8, busy: .8, out: .2, bv: { t: .4, vy: 10, all: true },
    tip: 'click: slash (6) · double-click: lunge (8, holds you in the air)' });

  // ===================================================================================================== JetPack
  // Equip: the pack goes on your back. Hold the mouse: a BodyVelocity sets your vertical speed to 50 x the camera's look-up amount
  // (look up = climb, level = hover, down = sink) and a BodyGyro turns you to the camera; flames point down. Fuel 1000: -1 per frame
  // of thrust (30/s), +1 per 0.2 s while equipped; the bar on the right shows it.
  const JP_MAX = 1000, lookV = new V();
  function jpLook(o, S) { if (isMe(o) && typeof cam !== 'undefined' && cam) { cam.getWorldDirection(lookV); return lookV.y; } return S && S._jp ? S._jp.look : 0; }
  function jpBar(on) {
    if (!on) { if (JPBAR) { JPBAR.remove(); JPBAR = null; } return; }
    if (JPBAR) return;
    JPBAR = document.createElement('div');
    JPBAR.style.cssText = 'position:fixed;left:90vw;width:40px;z-index:30;pointer-events:none;box-sizing:border-box;border:2px solid #1d1d1d;border-radius:3px;background:linear-gradient(90deg,#ff6a00,#ffd23a)';
    document.body.appendChild(JPBAR); watch();
  }
  function jpBarSet(f) { if (!JPBAR) return; f = clamp(f, 0, 1); JPBAR.style.height = (300 * f) + 'px'; JPBAR.style.top = (20 + 20 * (1 - f)) + 'vh'; JPBAR.style.display = f > 0 ? 'block' : 'none'; }
  function jpThrust(o, S) { const J = S._jp; if (!J || J.thr || !(o._jpFuel > 0)) return; J.thr = true; J.acc = F30; }
  function jpCut(o, S) { const J = S._jp; if (!J) return; J.thr = false; J.stand = false; } // cutEngine (also stops the 'standstill' anim)
  function jpFlame(p) { // Fire: Size 4, Heat -12 (the flames go down)
    const m = GX.mk(GX.GS, GX.tm(Math.random() < .35 ? '#fff3a0' : Math.random() < .5 ? '#ffb02a' : '#ff5a12', .85, true), p.clone().add(new V(rnd(-.3, .3), rnd(-.2, .2), rnd(-.3, .3))), rnd(.35, .6));
    const v = new V(rnd(-1.2, 1.2), -12, rnd(-1.2, 1.2)), L = rnd(.25, .4); let T = 0;
    GX.fx({ up(dt) { T += dt; m.position.addScaledVector(v, dt); m.scale.multiplyScalar(1 + 1.6 * dt); m.material.opacity = .85 * Math.max(0, 1 - T / L); return T < L; }, end() { GX.drop(m); } });
  }
  function jpModel() { // stand-in pack if the gear mesh is missing
    const g = new THREE.Group(), tank = GX.sm('#8d939e'), cap = GX.sm('#c9473f'), noz = GX.sm('#3b3f47');
    for (const s of [-.42, .42]) {
      const t = new THREE.Mesh(GX.GCY, tank); t.scale.set(.4, 1.7, .4); t.position.set(s, 1.05, 0); g.add(t);
      const h = new THREE.Mesh(GX.GS, cap); h.scale.setScalar(.4); h.position.set(s, 1.9, 0); g.add(h);
      const n = new THREE.Mesh(GX.GK, noz); n.scale.set(.28, .35, .28); n.rotation.x = Math.PI; n.position.set(s, .05, 0); g.add(n);
    }
    g.traverse((m) => { m.userData.fx = 1; }); g.userData.size = new V(1.7, 2.3, .8); return g;
  }
  GX.def('JetPack', {
    tip: 'hold click: thrust · look up to climb, level to hover, down to sink · fuel refills slowly',
    click(o, S) { // bots: a short burst toward their target's height (players use the mouse button directly)
      if (!isMe(o)) { const J = S._jp; if (J && !J.thr && o._jpFuel > 0) { const t = o.target; J.look = t && !t.ko ? clamp((t.pos.y + 2 - o.pos.y) / 8, -.6, .9) : .6; jpThrust(o, S); J.botT = rnd(.4, 1.2); } }
      return true;
    },
    on(o, S) {
      if (o._jpFuel == null) o._jpFuel = JP_MAX;
      const J = S._jp = { thr: false, acc: 0, racc: 0, stand: true, tilt: 0, look: .5, botT: 0, em: 0, arm: null, pack: null };
      hideHand(o); // Tool.Handle.Transparency = 1: the pack is welded to the back instead
      let g = null; try { g = GX.gearModel(S.gi, 2.2); } catch (e) { g = null; }
      if (!g) g = jpModel();
      const sz = g.userData.size || new V(1.7, 2.2, .8);
      if (sz.z > sz.x) g.rotation.y = Math.PI / 2;
      g.position.set(0, -sz.y / 2, -1); // 1 stud behind the torso centre
      if (o.c && o.c.body) o.c.body.add(g); J.pack = g;
      if (isMe(o)) { jpBar(true); jpBarSet(o._jpFuel / JP_MAX); }
    },
    off(o, S) { const J = S._jp; if (J) { J.thr = false; if (J.pack && J.pack.parent) J.pack.parent.remove(J.pack); } S._jp = null; showHand(o); if (isMe(o)) jpBar(false); },
    tick(o, S, dt) {
      const J = S._jp; if (!J) return;
      J.racc += dt; while (J.racc >= .2) { J.racc -= .2; if (o._jpFuel < JP_MAX) o._jpFuel++; }
      if (J.thr) { J.acc += dt; while (J.acc >= F30) { J.acc -= F30; o._jpFuel--; if (o._jpFuel <= 0) { o._jpFuel = 0; jpCut(o, S); break; } } }
      if (J.thr && !isMe(o) && (J.botT -= dt) <= 0) jpCut(o, S);
      const c = o.c; if (!c || !c.body) return;
      if (J.thr) { J.em += dt * 40; if (J.em >= 1) { c.body.updateWorldMatrix(true, false); const p = c.body.localToWorld(new V(0, -2, -1)); while (J.em >= 1) { J.em--; jpFlame(p); } } }
      const want = J.thr ? -Math.asin(clamp(jpLook(o, S), -1, 1)) : 0; // BodyGyro: the body pitches to the camera's look
      J.tilt += (want - J.tilt) * Math.min(1, 14 * dt);
      if (Math.abs(J.tilt) > 1e-3) c.body.rotation.x += J.tilt;
      if (J.stand && !(o.swing > 0) && c.aR) { // 'standstill' animation until the engine first cuts: no tool-holding arm
        const v = Math.hypot(o.vel.x, o.vel.z), air = !o.ground, tg = air ? Math.PI : v > .5 ? Math.sin((o.at || 0) * 9) : .1 * Math.sin(o.at || 0), mv = (air ? 30 : 9) * dt;
        let a = J.arm == null ? -c.aR.rotation.x : J.arm; a += clamp(tg - a, -mv, mv); J.arm = a; c.aR.rotation.x = -a;
      } else J.arm = null;
      if (isMe(o)) jpBarSet(o._jpFuel / JP_MAX);
    },
    fly(o, dt) { // BodyVelocity: velocity (0, lookY*50, 0), MaxForce = 7.5x body weight, vertical only
      const S = o.gx, J = S && S._jp; if (!J || !J.thr) return;
      const a = 7.5 * 34 * dt; o.vel.y += clamp(50 * jpLook(o, S) * VY - o.vel.y, -a, a);
    }
  });

  // ===================================================================================================== Acceleration Coil
  // Equip: WalkSpeed 16 + 16 = 32. A smoke puff trail (rise 2, opacity .25, size .5, tilted 45 deg back) from below the feet
  // whenever you run faster than 10.
  function coilPuff(p, f) {
    const m = GX.mk(GX.GS, GX.tm('#ffffff', .25), p.clone().add(new V(rnd(-.25, .25), rnd(0, .3), rnd(-.25, .25))), .25);
    const v = new V(-f.x * 1.41, 1.41, -f.z * 1.41), L = rnd(1.2, 1.8); let T = 0;
    GX.fx({ up(dt) { T += dt; m.position.addScaledVector(v, dt); m.scale.multiplyScalar(1 + .9 * dt); m.material.opacity = .25 * Math.max(0, 1 - T / L); return T < L; }, end() { GX.drop(m); } });
  }
  GX.def('Acceleration Coil', {
    tip: 'equipped: walk speed 32 (twice normal)',
    sp: 2, click: () => true,
    tick(o, S, dt) {
      if (o.ground) S._acSmoke = Math.hypot(o.vel.x, o.vel.z) > 10; // Humanoid.Running(speed): smoke.Enabled = speed > 10
      if (!S._acSmoke) return;
      S._acE = (S._acE || 0) + dt * 16; if (S._acE < 1) return;
      const f = GX.fwd(o), p = o.pos.clone(); p.y -= .5;
      while (S._acE >= 1) { S._acE--; coilPuff(p, f); }
    },
    off(o, S) { S._acSmoke = false; S._acE = 0; }
  });

  // ===================================================================================================== ROBLOXTablet
  // Equip: a tablet appears on the screen showing one of 4 pictures; clicking its screen shows the next one (the GUI keeps its picture
  // between equips). With the mouse locked, a click in the game flips the picture too.
  function rrect(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
  function blk(x, X, Y, w, h, front, top, side) {
    const d = Math.min(14, w * .3, h * .8);
    x.fillStyle = front; x.fillRect(X, Y, w, h);
    x.fillStyle = top; x.beginPath(); x.moveTo(X, Y); x.lineTo(X + d, Y - d * .6); x.lineTo(X + w + d, Y - d * .6); x.lineTo(X + w, Y); x.closePath(); x.fill();
    x.fillStyle = side; x.beginPath(); x.moveTo(X + w, Y); x.lineTo(X + w + d, Y - d * .6); x.lineTo(X + w + d, Y + h - d * .6); x.lineTo(X + w, Y + h); x.closePath(); x.fill();
  }
  const SLIDES = [
    (x, W, H) => { // a baseplate with bricks
      const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#68b4ee'); g.addColorStop(.62, '#d3efff'); x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.fillStyle = '#3e8e39'; x.beginPath(); x.moveTo(0, H); x.lineTo(W, H); x.lineTo(W * .82, H * .56); x.lineTo(W * .18, H * .56); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(0,0,0,.16)'; x.lineWidth = 1;
      for (let i = 0; i <= 10; i++) { const u = i / 10; x.beginPath(); x.moveTo(W * .18 + W * .64 * u, H * .56); x.lineTo(W * u, H); x.stroke(); }
      for (let j = 1; j <= 6; j++) { const v = Math.pow(j / 6, 1.7), y = H * .56 + H * .44 * v, l = W * .18 * (1 - v); x.beginPath(); x.moveTo(l, y); x.lineTo(W - l, y); x.stroke(); }
      blk(x, 160, 62, 56, 92, '#9ca2ab', '#c6cbd2', '#7a8089');
      blk(x, 66, 146, 50, 20, '#d4382f', '#ef6c61', '#a42a22');
      blk(x, 226, 168, 40, 18, '#2f7ddf', '#70acf1', '#225ea9');
      blk(x, 120, 184, 34, 16, '#f2c230', '#f8dc78', '#bf951c');
    },
    (x, W, H) => { // a blocky figure
      const g = x.createRadialGradient(W / 2, H * .45, 10, W / 2, H / 2, 200); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#98c9f7'); x.fillStyle = g; x.fillRect(0, 0, W, H);
      const cx = W / 2;
      x.fillStyle = '#2f9a48'; x.fillRect(cx - 34, 152, 33, 73); x.fillRect(cx + 1, 152, 33, 73);
      x.fillStyle = '#1f6fd1'; x.fillRect(cx - 34, 90, 68, 64);
      x.fillStyle = '#f5cd30'; x.fillRect(cx - 68, 90, 32, 64); x.fillRect(cx + 36, 90, 32, 64);
      rrect(x, cx - 26, 36, 52, 50, 13); x.fill();
      x.fillStyle = '#1d1d1d'; x.beginPath(); x.ellipse(cx - 10, 56, 3.5, 6, 0, 0, TAU); x.fill(); x.beginPath(); x.ellipse(cx + 10, 56, 3.5, 6, 0, 0, TAU); x.fill();
      x.strokeStyle = '#1d1d1d'; x.lineWidth = 3; x.lineCap = 'round'; x.beginPath(); x.arc(cx, 63, 12, .2 * Math.PI, .8 * Math.PI); x.stroke();
    },
    (x, W, H) => { // a brick house
      const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#74bff4'); g.addColorStop(1, '#e6f6ff'); x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.fillStyle = '#ffe36a'; x.beginPath(); x.arc(250, 42, 22, 0, TAU); x.fill();
      x.fillStyle = '#ffffff'; for (const [cx, cy] of [[60, 40], [140, 28]]) { x.beginPath(); x.ellipse(cx, cy, 26, 10, 0, 0, TAU); x.fill(); x.beginPath(); x.ellipse(cx + 16, cy - 6, 16, 9, 0, 0, TAU); x.fill(); }
      x.fillStyle = '#55b04a'; x.fillRect(0, 170, W, H - 170);
      x.fillStyle = '#c0392b'; x.fillRect(86, 104, 128, 70);
      x.strokeStyle = 'rgba(0,0,0,.2)'; x.lineWidth = 1;
      for (let r = 0; r < 7; r++) { const y = 104 + r * 10; x.beginPath(); x.moveTo(86, y); x.lineTo(214, y); x.stroke(); for (let k = 0; k < 9; k++) { const bx = 86 + k * 16 + (r % 2) * 8; if (bx > 86 && bx < 214) { x.beginPath(); x.moveTo(bx, y); x.lineTo(bx, y + 10); x.stroke(); } } }
      x.fillStyle = '#6b3d1b'; x.beginPath(); x.moveTo(74, 106); x.lineTo(150, 54); x.lineTo(226, 106); x.closePath(); x.fill();
      x.fillStyle = '#5a3212'; x.fillRect(138, 134, 26, 40);
      x.fillStyle = '#bfe6ff'; x.fillRect(100, 120, 24, 20); x.fillRect(178, 120, 24, 20);
      x.strokeStyle = '#ffffff'; x.lineWidth = 2; x.strokeRect(100, 120, 24, 20); x.strokeRect(178, 120, 24, 20);
    },
    (x, W, H) => { // a rocket at night
      const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#050a22'); g.addColorStop(1, '#1c2d68'); x.fillStyle = g; x.fillRect(0, 0, W, H);
      let s = 7; const rn = () => (s = (s * 16807) % 2147483647) / 2147483647;
      x.fillStyle = '#ffffff'; for (let i = 0; i < 60; i++) { const r = rn() * 1.4 + .3; x.globalAlpha = .5 + rn() * .5; x.beginPath(); x.arc(rn() * W, rn() * H * .8, r, 0, TAU); x.fill(); } x.globalAlpha = 1;
      x.fillStyle = '#f3efcf'; x.beginPath(); x.arc(60, 54, 24, 0, TAU); x.fill(); x.fillStyle = '#081129'; x.beginPath(); x.arc(71, 47, 21, 0, TAU); x.fill();
      x.fillStyle = '#3a4566'; x.beginPath(); x.ellipse(W / 2, H + 40, W * .75, 70, 0, 0, TAU); x.fill();
      const cx = 190, top = 40;
      x.fillStyle = '#ff9a1f'; x.beginPath(); x.moveTo(cx - 12, top + 120); x.quadraticCurveTo(cx, top + 178, cx + 12, top + 120); x.closePath(); x.fill();
      x.fillStyle = '#ffe58a'; x.beginPath(); x.moveTo(cx - 6, top + 120); x.quadraticCurveTo(cx, top + 152, cx + 6, top + 120); x.closePath(); x.fill();
      x.fillStyle = '#d33a2c'; for (const sd of [-1, 1]) { x.beginPath(); x.moveTo(cx + sd * 18, top + 86); x.lineTo(cx + sd * 36, top + 124); x.lineTo(cx + sd * 18, top + 116); x.closePath(); x.fill(); }
      x.fillStyle = '#eef1f6'; rrect(x, cx - 18, top + 30, 36, 92, 14); x.fill();
      x.fillStyle = '#d33a2c'; x.beginPath(); x.moveTo(cx - 18, top + 40); x.quadraticCurveTo(cx - 16, top + 6, cx, top - 6); x.quadraticCurveTo(cx + 16, top + 6, cx + 18, top + 40); x.closePath(); x.fill();
      x.fillStyle = '#2f7ddf'; x.beginPath(); x.arc(cx, top + 62, 9, 0, TAU); x.fill(); x.strokeStyle = '#9aa3b2'; x.lineWidth = 3; x.stroke();
    }
  ];
  function tabDraw() { if (!TABC) return; const x = TABC.getContext('2d'); x.save(); x.clearRect(0, 0, 300, 225); try { SLIDES[tabN](x, 300, 225); } catch (e) { } x.restore(); }
  function tabNext() { tabN = (tabN + 1) % SLIDES.length; tabDraw(); }
  function tabHide() { if (TAB) TAB.style.display = 'none'; }
  function tabShow() {
    if (!TAB) {
      TAB = document.createElement('div');
      TAB.style.cssText = 'position:fixed;right:24px;bottom:96px;width:372px;height:283px;z-index:35;pointer-events:none;transform-origin:100% 100%;border-radius:26px;background:linear-gradient(160deg,#30333b,#0d0e11);box-shadow:0 10px 34px rgba(0,0,0,.55),inset 0 0 0 2px #444a55';
      TABC = document.createElement('canvas'); TABC.width = 300; TABC.height = 225;
      TABC.style.cssText = 'position:absolute;left:26px;top:29px;width:300px;height:225px;border-radius:4px;pointer-events:auto;cursor:pointer;background:#000';
      TABC.addEventListener('click', (e) => { e.stopPropagation(); tabNext(); }); // Screen.MouseButton1Click
      const btn = document.createElement('div'); btn.style.cssText = 'position:absolute;right:12px;top:50%;width:18px;height:18px;margin-top:-9px;border-radius:50%;box-shadow:inset 0 0 0 2px #5b6270';
      const lens = document.createElement('div'); lens.style.cssText = 'position:absolute;left:10px;top:50%;width:6px;height:6px;margin-top:-3px;border-radius:50%;background:#262a33';
      TAB.append(TABC, btn, lens); document.body.appendChild(TAB);
    }
    TAB.style.transform = 'scale(' + Math.min(1, (innerWidth * .8) / 372, (innerHeight * .6) / 283) + ')';
    TAB.style.display = 'block'; tabDraw(); watch();
  }
  GX.def('ROBLOXTablet', {
    tip: 'a tablet on your screen · click: next picture',
    click(o) { if (isMe(o)) tabNext(); return true; },
    on(o) { if (isMe(o)) tabShow(); },
    off(o) { if (isMe(o)) tabHide(); }
  });

  // ===================================================================================================== input
  addEventListener('mousedown', (e) => {
    if (e.button !== 0) return; LMB = true;
    const G = RPG;
    if (G && G.alive) { if (G.con.contains(e.target)) e.preventDefault(); G.fireAt(e.clientX, e.clientY); return; } // mouse.Button1Down in the game
    const S = myS('JetPack'); if (S && document.pointerLockElement) jpThrust(me, S);
  }, true);
  addEventListener('mouseup', (e) => { if (e.button !== 0) return; LMB = false; const S = myS('JetPack'); if (S) jpCut(me, S); }, true);
  addEventListener('click', (e) => { // while the RPG screen is up, clicks on the 3D view only shoot (no pointer lock, no swing)
    const G = RPG; if (G && G.alive && typeof R !== 'undefined' && R && R.domElement && e.target === R.domElement) { e.stopPropagation(); e.preventDefault(); }
  }, true);
  addEventListener('blur', () => { LMB = false; const S = myS('JetPack'); if (S) jpCut(me, S); });
  const RPGKEYS = { KeyW: 1, KeyA: 1, KeyD: 1 };
  addEventListener('keydown', (e) => {
    const G = RPG; if (!G || !G.alive || e.repeat || !RPGKEYS[e.code]) return;
    const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    G.key(e.code, true);
  }, true);
  addEventListener('keyup', (e) => { const G = RPG; if (G && G.alive && RPGKEYS[e.code]) G.key(e.code, false); }, true);
})();
