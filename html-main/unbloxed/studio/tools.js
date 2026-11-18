// Unbloxed Studio: Tools (like Roblox Tools) in play mode (window.UBXTools). Loaded by unbloxed.html after studio-play.js.
// A tool is a model the creator built from parts (map.tools + part.tool, see FORMAT.md "Tools"). In play its parts are
// not part of the world: they become a model that characters hold in the right hand (the Handle at the fist, turned by
// the tool's grip), a Roblox-style Backpack hotbar (1-9 or click) equips it, and clicking activates it.
// Built-in actions (sword swing / gun) need no scripts; the "Tools" blocks (studio/tools-defs.js) do the rest.
// Damage, projectiles, sounds and effects reuse the Marketplace gear engine's generic helpers (window.GX, gear-fx.js).
// Low-end friendly: tool models are a handful of meshes, per-frame work is a few box tests per held tool.
(function () {
  'use strict';
  var V = function (x, y, z) { return new THREE.Vector3(x, y, z); };
  var DEG = Math.PI / 180;
  var ACTS = { none: 1, sword: 1, gun: 1 };
  var GIVES = { start: 1, pickup: 1, script: 1 };
  // editor/tool space -> the hand: build tools as if the character faces -Z (Studio's front) with the arm held straight
  // forward. Character space faces +Z (turn 180° around Y), and with the arm forward the hand group's +Z points up and
  // its -Y points forward, so (x, y, z) -> (-x, z, y).
  var QB = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().set(-1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1));
  var T = null; // run state
  function num(v, d) { v = Number(v); return isFinite(v) ? v : d; }
  function clamp(v, lo, hi, d) { return Math.max(lo, Math.min(hi, num(v, d))); }
  function arr3(a, d, lo, hi) { return [0, 1, 2].map(function (i) { return clamp(Array.isArray(a) ? a[i] : d[i], lo, hi, d[i]); }); }
  function key(s) { return String(s == null ? '' : s).trim().toLowerCase(); }
  function P() { return window.UBXStudioPlay; }
  function GXok() { return window.GX && GX.shot && GX.hurt; }
  var escH = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); };

  // ---------- map data ----------
  // normalised tool defs of a map; bad values take defaults, tools without parts are dropped
  function defsOf(map) {
    var out = [], seen = {}, list = Array.isArray(map && map.tools) ? map.tools : [];
    list.forEach(function (t) {
      if (!t || typeof t.id != 'string' || !t.id || seen[t.id]) return;
      var parts = (map.parts || []).filter(function (p) { return p && p.tool === t.id; });
      if (!parts.length) return;
      seen[t.id] = 1;
      out.push({ id: t.id, name: String(t.name || 'Tool').slice(0, 40), icon: typeof t.icon == 'string' && t.icon ? t.icon.slice(0, 8) : '🗡️',
        handle: t.handle, grip: arr3(t.grip, [0, 0, 0], -50, 50), gripR: arr3(t.gripR, [0, 0, 0], -360, 360),
        give: GIVES[t.give] ? t.give : 'start', act: ACTS[t.act] ? t.act : 'none', dmg: clamp(t.dmg, 0, 1000, 20), cd: clamp(t.cd, 0, 60, 0.5),
        speed: clamp(t.speed, 5, 600, 120), drop: t.drop !== false, parts: parts });
    });
    return out;
  }
  var skipMap = null, skipSet = {};
  // studio-play.js build(): a part that belongs to a tool is not built into the world
  function skip(p, map) {
    if (!p || !p.tool) return false;
    if (map !== skipMap) { skipMap = map; skipSet = {}; defsOf(map).forEach(function (d) { skipSet[d.id] = 1; }); }
    return !!skipSet[p.tool];
  }

  // ---------- tool models ----------
  // template: the tool's parts relative to the hand point (handle centre + grip), turned by the grip rotation
  function handleOf(d) {
    var h = null;
    d.parts.forEach(function (p) { if (!h && p.id === d.handle) h = p; });
    d.parts.forEach(function (p) { if (!h && /^handle$/i.test(String(p.name || '').replace(/^.*\./, ''))) h = p; });
    return h || d.parts[0];
  }
  function buildTemplate(d) {
    var A = P(), h = handleOf(d), hp = h.p || [0, 0, 0], hand = V(+hp[0] || 0, +hp[1] || 0, +hp[2] || 0).add(V(d.grip[0], d.grip[1], d.grip[2]));
    var inner = new THREE.Group(), e = new THREE.Euler(0, 0, 0, 'YXZ'), reach = 0.5, list = [];
    d.parts.forEach(function (raw) {
      var p = A.normalize ? A.normalize({ parts: [raw] }).parts[0] : raw;
      if (p.t >= 1) return; // invisible parts (an invisible Handle) are not drawn
      var mesh = new THREE.Mesh(A.GEO[p.shape] || UBOX, A.material(p, true));
      mesh.scale.set(p.s[0], p.s[1], p.s[2]);
      mesh.position.set(p.p[0] - hand.x, p.p[1] - hand.y, p.p[2] - hand.z);
      mesh.quaternion.setFromEuler(e.set(p.r[0], p.r[1], p.r[2], 'YXZ'));
      mesh.castShadow = p.t < .5; mesh.userData.op = mesh.material.opacity; mesh.userData.tr = mesh.material.transparent;
      inner.add(mesh); list.push(mesh);
      reach = Math.max(reach, mesh.position.length() + Math.max(p.s[0], p.s[1], p.s[2]) / 2);
    });
    inner.quaternion.setFromEuler(e.set(d.gripR[0] * DEG, d.gripR[1] * DEG, d.gripR[2] * DEG, 'YXZ'));
    var g = new THREE.Group(); g.add(inner); g.quaternion.copy(QB);
    return { g: g, reach: Math.min(30, reach), meshes: list };
  }
  function cloneModel(d) { // clones share geometry + materials with the template
    var c = d.tpl.g.clone(true), meshes = []; c.traverse(function (m) { if (m.isMesh) meshes.push(m); });
    return { g: c, meshes: meshes };
  }

  // ---------- holding ----------
  function holding(o) { return o && o.ubxTool ? o.ubxTool.d : null; }
  function equip(o, d) {
    if (!o || !o.c || !o.c.sw || !d) return;
    if (o.ubxTool && o.ubxTool.d === d) return;
    unequip(o, true);
    var sw = o.c.sw, saved = [];
    sw.children.forEach(function (ch) { saved.push([ch, ch.visible]); ch.visible = false; });
    var m = cloneModel(d); sw.add(m.g); sw.visible = true;
    o.ubxTool = { d: d, g: m.g, meshes: m.meshes, saved: saved, spawnT: o.spawnT, touchHit: new Map() };
    if (o === me) { T.eq = d.id; hotbar(); fireEv('tool_eq', d.name); GXplay(o, 'pop'); }
  }
  function unequip(o, quiet) {
    var H = o && o.ubxTool; if (!H) return;
    if (H.g.parent) H.g.parent.remove(H.g);
    H.saved.forEach(function (s) { s[0].visible = s[1]; });
    o.ubxTool = null;
    if (o.c && o.c.sw) o.c.sw.visible = !hideSword();
    if (o === me && T) { T.eq = null; hotbar(); fireEv('tool_uneq', H.d.name); }
  }
  // games with tools look like Roblox: no sword in the hand unless a tool is equipped (Marketplace gears keep theirs)
  function hideSword() { return !!(T && T.defs.length && !(T.S.map.settings && T.S.map.settings.gears === true)); }
  // the hub's equip()/respawn() rewrite every material's opacity on the character: put the tool's own back
  function fixLook(o) {
    var H = o.ubxTool; if (!H) return;
    if (H.spawnT !== o.spawnT || (H.meshes[0] && H.meshes[0].material.opacity !== H.meshes[0].userData.op)) {
      H.spawnT = o.spawnT;
      H.meshes.forEach(function (m) { m.material.opacity = m.userData.op; m.material.transparent = m.userData.tr; });
      if (H.g.parent !== o.c.sw) o.c.sw.add(H.g);
      o.c.sw.children.forEach(function (ch) { if (ch !== H.g) ch.visible = false; });
      o.c.sw.visible = true;
    }
  }

  // ---------- backpack + hotbar (the player) ----------
  function defById(id) { if (!T) return null; for (var i = 0; i < T.defs.length; i++) if (T.defs[i].id === id) return T.defs[i]; return null; }
  function defsNamed(name) { var k = key(name); return T ? T.defs.filter(function (d) { return k == 'any' || key(d.name) == k; }) : []; }
  function give(d, auto) {
    if (!T || !d || T.pack.indexOf(d.id) >= 0) return false;
    if (T.pack.length >= 9) { toast('🎒 Backpack is full (9 tools)'); return false; }
    T.pack.push(d.id); hotbar();
    if (auto && !holding(me)) equip(me, d);
    return true;
  }
  function take(d) {
    if (!T || !d) return;
    var i = T.pack.indexOf(d.id); if (i < 0) return;
    if (holding(me) === d) unequip(me);
    T.pack.splice(i, 1); hotbar();
  }
  function toggle(i) {
    if (!T || !me || me.ko) return;
    var d = defById(T.pack[i]); if (!d) return;
    if (holding(me) === d) unequip(me); else equip(me, d);
  }
  var CSS = '#ubx-hotbar{position:fixed;left:50%;bottom:92px;transform:translateX(-50%);z-index:12;display:flex;gap:6px;pointer-events:auto;user-select:none}' +
    '#ubx-hotbar .s{position:relative;width:62px;height:62px;border-radius:6px;background:#1e2128c8;border:2px solid #ffffff30;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;font:600 11px system-ui,Segoe UI,sans-serif;overflow:hidden}' +
    '#ubx-hotbar .s.on{border-color:#fff;background:#3a6fd8d0;box-shadow:0 0 0 2px #0006}' +
    '#ubx-hotbar .s i{font-style:normal;font-size:26px;line-height:30px}#ubx-hotbar .s b{position:absolute;left:4px;top:1px;font-size:11px;opacity:.85}' +
    '#ubx-hotbar .s span{max-width:58px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 2px}' +
    '#ubx-hotbar .s u{position:absolute;left:0;right:0;bottom:0;background:#0009;height:0;text-decoration:none}' +
    '@media(max-width:700px){#ubx-hotbar{bottom:132px}#ubx-hotbar .s{width:50px;height:50px}#ubx-hotbar .s i{font-size:20px;line-height:22px}}';
  function hotbar() {
    if (!T) return;
    var e = document.getElementById('ubx-hotbar');
    if (!T.pack.length) { if (e) e.remove(); return; }
    if (!document.getElementById('ubx-hotbar-css')) { var st = document.createElement('style'); st.id = 'ubx-hotbar-css'; st.textContent = CSS; document.head.appendChild(st); }
    if (!e) {
      e = document.createElement('div'); e.id = 'ubx-hotbar'; document.body.appendChild(e);
      e.addEventListener('pointerdown', function (ev) { ev.stopPropagation(); ev.preventDefault(); var s = ev.target.closest('.s'); if (s) toggle(+s.dataset.i); });
      e.addEventListener('click', function (ev) { ev.stopPropagation(); });
    }
    var eq = holding(me);
    e.innerHTML = T.pack.map(function (id, i) {
      var d = defById(id); if (!d) return '';
      return '<div class="s' + (eq === d ? ' on' : '') + '" data-i="' + i + '" title="' + escH(d.name) + ' (' + (i + 1) + ')"><b>' + (i + 1) + '</b><i>' + escH(d.icon) + '</i><span>' + escH(d.name) + '</span><u></u></div>';
    }).join('');
  }
  function hotbarCool() { // cooldown shade on the slots
    var e = document.getElementById('ubx-hotbar'); if (!e || !T) return;
    T.pack.forEach(function (id, i) {
      var s = e.children[i], d = defById(id); if (!s || !d) return;
      var left = (T.cool[id] || 0) - T.t, f = d.cdNow > 0 && left > 0 ? left / d.cdNow : 0, u = s.querySelector('u');
      if (u) u.style.height = Math.round(f * 100) + '%';
    });
  }

  // ---------- actions ----------
  function fireEv(ev, name) { if (window.UBXRun && UBXRun.fire) try { UBXRun.fire(ev, name); } catch (e) { console.warn(e); } }
  function GXplay(o, k) { if (window.GX && GX.play) try { GX.play(o, k); } catch (e) { } }
  function hostileTo(o, t) { // the player never hurts ally bots; bots use their own team rules (bots.js)
    if (!t || t === o || t.ko) return false;
    if (o === me) return !(t.ubx && t.ubx.team == 'ally');
    return true;
  }
  function hit(o, t, dmg, from) {
    if (!hostileTo(o, t)) return false;
    var wasKo = t.ko, d = holding(o);
    if (GXok()) GX.hurt(o, t, dmg, { from: from || o.pos, kb: 8, up: 4 });
    else { t.hp -= dmg; t.lastHitBy = o; if (typeof flash == 'function') flash(t); if (t.hp <= 0 && typeof knock == 'function') knock(t, o); }
    if (!wasKo && t.ko && o === me && d) fireEv('tool_ko', d.name);
    return true;
  }
  function tip(o) { // the far end of the held tool (where shots come from), or the hand
    var H = o.ubxTool, p = V(0, 0, 0);
    if (!H) { if (o.c && o.c.sw) o.c.sw.getWorldPosition(p); else p.copy(o.pos).y += 3; return p; }
    var box = new THREE.Box3().setFromObject(H.g), f = V(Math.sin(o.yaw), 0, Math.cos(o.yaw));
    box.getCenter(p); var sz = V(0, 0, 0); box.getSize(sz);
    return p.addScaledVector(f, Math.max(sz.x, sz.z) * .45);
  }
  // swing: the hub's slash animation, then everyone in front within the tool's reach (+ the arm) takes damage
  function swing(o, dmg) {
    if (!o || o.ko) return;
    o.swing = .3; o.lunge = false; o.cd = Math.max(o.cd || 0, .25);
    var d = holding(o), reach = 2 + (d ? d.tpl.reach : 1.5), n = 0;
    GXplay(o, 'swish');
    chars.forEach(function (t) {
      if (!hostileTo(o, t)) return;
      var dx = t.pos.x - o.pos.x, dz = t.pos.z - o.pos.z, dist = Math.hypot(dx, dz);
      if (dist > reach || Math.abs(t.pos.y - o.pos.y) > 4.5) return;
      var a = Math.atan2(dx, dz) - o.yaw; a = Math.atan2(Math.sin(a), Math.cos(a));
      if (Math.abs(a) > 1.1) return;
      if (hit(o, t, dmg)) n++;
    });
    return n;
  }
  var STYLES = { bullet: { size: .18, spd: 1, g: 0, life: 2.5 }, ball: { size: .5, spd: .55, g: 30, life: 4 }, rocket: { size: .35, spd: .6, g: 0, life: 4, boom: 7 }, laser: { laser: 1 } };
  function shoot(o, op) {
    if (!o || o.ko || !GXok()) return;
    var s = STYLES[op.style] || STYLES.bullet, from = tip(o), col = op.color || '#ffd84a', dmg = Math.max(0, op.dmg);
    var wrap = function (t) { return hostileTo(o, t); };
    if (s.laser) {
      var aim = GX.aimPoint(o, 300), dir = aim.clone().sub(from).normalize(), h = GX.march(from, dir, 300, o, .5, .1);
      if (GX.beam) GX.beam(from, h.p, col, .08, .1);
      if (h.t && wrap(h.t)) hit(o, h.t, dmg, from);
      GXplay(o, 'zap'); return;
    }
    GX.shot(o, { from: from, spd: Math.max(5, op.speed) * s.spd, size: s.size, col: col, add: true, g: s.g, life: s.life, trail: op.style == 'rocket' ? 1 : 0,
      dmg: 0, boom: s.boom || 0, boomDmg: s.boom ? dmg : 0,
      onHit: s.boom ? null : function (t) { if (wrap(t)) hit(o, t, dmg, from); } });
    GXplay(o, op.style == 'rocket' ? 'boom' : 'shot');
  }
  // built-in action of a tool (no scripts needed)
  function builtIn(o, d) {
    if (d.act == 'sword') swing(o, d.dmg);
    else if (d.act == 'gun') { shoot(o, { style: 'bullet', speed: d.speed, dmg: d.dmg, color: '#ffd84a' }); }
  }
  // click while holding a tool. true = handled (the hub's own sword swing is skipped)
  function activate(o) {
    var d = holding(o); if (!d || !T) return false;
    if (o.ko) return true;
    if (o === me) {
      var cd = d.cdNow != null ? d.cdNow : d.cd;
      if ((T.cool[d.id] || 0) > T.t) return true;
      T.cool[d.id] = T.t + cd; d.cdNow = cd;
      builtIn(o, d);
      fireEv('tool_act', d.name);
    } else builtIn(o, d);
    return true;
  }

  // ---------- pickups (give: pickup) ----------
  function makePickups() {
    T.defs.forEach(function (d) {
      if (d.give != 'pickup') return;
      var h = handleOf(d), box = new THREE.Box3();
      d.parts.forEach(function (p) { var hs = Math.max(p.s[0], p.s[1], p.s[2]) / 2; box.expandByPoint(V(p.p[0] - hs, p.p[1] - hs, p.p[2] - hs)); box.expandByPoint(V(p.p[0] + hs, p.p[1] + hs, p.p[2] + hs)); });
      var c = V(0, 0, 0); box.getCenter(c);
      var g = new THREE.Group(), inner = new THREE.Group();
      d.tpl.meshes.forEach(function (m) { var k = m.clone(); inner.add(k); });
      // the template's meshes are relative to the hand point: put them back where they were built
      var hand = V(h.p[0] + d.grip[0], h.p[1] + d.grip[1], h.p[2] + d.grip[2]);
      inner.position.copy(hand).sub(c);
      g.add(inner); g.position.copy(c); scene.add(g);
      T.pickups.push({ d: d, g: g, base: c.clone(), r: Math.max(1.5, box.getSize(V(0, 0, 0)).length() / 2), taken: false, t: Math.random() * 6 });
    });
  }
  function tickPickups(dt) {
    T.pickups.forEach(function (pk) {
      if (pk.taken) return;
      pk.t += dt; pk.g.position.y = pk.base.y + Math.sin(pk.t * 2) * .25; pk.g.rotation.y += dt * 1.2;
      if (!me || me.ko) return;
      var dx = me.pos.x - pk.base.x, dz = me.pos.z - pk.base.z, dy = pk.base.y - me.pos.y;
      if (Math.hypot(dx, dz) < pk.r + 1 && dy > -1.5 && dy < 6) {
        if (T.pack.indexOf(pk.d.id) >= 0) return;
        if (give(pk.d, true)) { pk.taken = true; pk.g.visible = false; toast('🎒 Got ' + pk.d.icon + ' ' + pk.d.name); GXplay(me, 'magic'); }
      }
    });
  }

  // ---------- touch damage (block "TOOL deals N damage on touch") ----------
  var _tb = new THREE.Box3(), _cb = new THREE.Box3();
  function tickTouch(o, dt) {
    var H = o.ubxTool, d = H && H.d; if (!d || !(d.touchDmg > 0) || o.ko) return;
    _tb.setFromObject(H.g).expandByScalar(.25);
    H.touchHit.forEach(function (v, t) { if (v - dt <= 0) H.touchHit.delete(t); else H.touchHit.set(t, v - dt); });
    chars.forEach(function (t) {
      if (!hostileTo(o, t) || H.touchHit.has(t)) return;
      _cb.min.set(t.pos.x - 1, t.pos.y, t.pos.z - 1); _cb.max.set(t.pos.x + 1, t.pos.y + 5.2, t.pos.z + 1);
      if (_tb.intersectsBox(_cb)) { H.touchHit.set(t, .5); hit(o, t, d.touchDmg, o.pos); }
    });
  }

  // ---------- run lifecycle (blocks-runtime.js ext hooks: onStart / onStop / onTick) ----------
  // MODES.studio (studio-play.js, loaded after this file): a click while holding a tool activates it, not the hub's sword
  function hookAttack() {
    var M = window.MODES && MODES.studio; if (!M || M._tools) return; M._tools = true;
    var a0 = M.attack;
    M.attack = function (o) {
      if (T && o && o.ubxTool && activate(o)) return false;
      if (T && o === me && hideSword()) return false; // empty hands in a tools game: no invisible sword swing
      return a0 ? a0.apply(this, arguments) : undefined;
    };
  }
  function start(S) {
    stop();
    var defs = defsOf(S.map);
    T = { S: S, defs: defs, pack: [], eq: null, cool: {}, t: 0, pickups: [] };
    defs.forEach(function (d) { d.tpl = buildTemplate(d); d.cdNow = d.cd; d.touchDmg = 0; });
    defs.forEach(function (d) { if (d.give == 'start') give(d, false); });
    makePickups();
    hookAttack();
    if (me && me.c && me.c.sw) me.c.sw.visible = !hideSword();
    hotbar();
  }
  function stop() {
    if (T) {
      chars.forEach(function (o) { if (o.ubxTool) unequip(o, true); });
      T.pickups.forEach(function (pk) { if (pk.g.parent) pk.g.parent.remove(pk.g); });
      T.defs.forEach(function (d) { if (d.tpl) d.tpl.meshes.forEach(function (m) { if (m.material.map) m.material.map.dispose(); m.material.dispose(); }); });
    }
    T = null;
    var e = document.getElementById('ubx-hotbar'); if (e) e.remove();
  }
  var hcT = 0;
  function tick(dt) {
    if (!T || !P() || P().state() !== T.S) return;
    T.t += dt;
    tickPickups(dt);
    chars.forEach(function (o) { if (o.ubxTool) { fixLook(o); tickTouch(o, dt); } });
    if (me && !me.ubxTool && me.c && me.c.sw && hideSword() && me.c.sw.visible) me.c.sw.visible = false; // respawn() shows it again
    if ((hcT -= dt) <= 0) { hcT = .1; hotbarCool(); }
  }
  addEventListener('keydown', function (e) {
    if (!T || e.repeat || typeof GAME == 'undefined' || GAME != 'studio' || mode != 'game') return;
    var t = e.target; if (t && (t.tagName == 'INPUT' || t.tagName == 'TEXTAREA')) return;
    var m = /^Digit([1-9])$/.exec(e.code); if (m) { toggle(+m[1] - 1); return; }
    if (e.code == 'Backquote' && holding(me)) unequip(me); // Roblox: ` puts the tool away (number again works too)
  });

  // ---------- blocks (Tools category; editor side: studio/tools-defs.js) ----------
  function regBlocks() {
    var X = window.UBXRun && UBXRun.ext; if (!X || X._tools) return; X._tools = true;
    X.HATARG.tool_eq = X.HATARG.tool_uneq = X.HATARG.tool_act = X.HATARG.tool_ko = 'TOOL'; // "when [Sword] is ..." ('any' = every tool)
    X.addHats({ ubx_tool_equipped: 'tool_eq', ubx_tool_unequipped: 'tool_uneq', ubx_tool_activated: 'tool_act', ubx_tool_ko: 'tool_ko' });
    X.onStart.push(start); X.onStop.push(stop); X.onTick.push(tick);
    var n0 = function (n, th, k) { return X.num(X.ev(n.i[k], th)); };
    X.DO.ubx_tool_give = function (n) { defsNamed(n.f.TOOL).forEach(function (d) { give(d, false); }); };
    X.DO.ubx_tool_remove = function (n) { defsNamed(n.f.TOOL).forEach(take); };
    X.DO.ubx_tool_equip = function (n) { var d = defsNamed(n.f.TOOL)[0]; if (d && me && !me.ko) { give(d, false); equip(me, d); } };
    X.DO.ubx_tool_unequip = function () { if (me) unequip(me); };
    X.DO.ubx_tool_swing = function (n, th) { if (me && holding(me)) swing(me, Math.max(0, Math.min(1000, n0(n, th, 'DMG')))); };
    X.DO.ubx_tool_shoot = function (n, th) {
      if (!me || !holding(me)) return;
      shoot(me, { style: n.f.STYLE, speed: Math.max(5, Math.min(600, n0(n, th, 'SPEED'))), dmg: Math.max(0, Math.min(1000, n0(n, th, 'DMG'))), color: X.colour(X.ev(n.i.COLOR, th)) });
    };
    X.DO.ubx_tool_touchdmg = function (n, th) { var v = Math.max(0, Math.min(1000, n0(n, th, 'DMG'))); defsNamed(n.f.TOOL).forEach(function (d) { d.touchDmg = v; }); };
    X.DO.ubx_tool_cooldown = function (n, th) { var v = Math.max(0, Math.min(60, n0(n, th, 'SECS'))); defsNamed(n.f.TOOL).forEach(function (d) { d.cdNow = v; }); };
    X.DO.ubx_tool_action = function (n, th) { var v = ACTS[n.f.ACT] ? n.f.ACT : 'none'; defsNamed(n.f.TOOL).forEach(function (d) { d.act = v; }); };
    X.EV.ubx_tool_has = function (n) { var l = defsNamed(n.f.TOOL); return !!(T && l.some(function (d) { return T.pack.indexOf(d.id) >= 0; })); };
    X.EV.ubx_tool_held = function () { var d = holding(me); return d ? d.name : ''; };
  }
  regBlocks();

  window.UBXTools = {
    skip: skip, defsOf: defsOf,
    // for bots.js (NPCs holding tools) and tests
    equip: function (o, name) { var d = defsNamed(name)[0]; if (d) equip(o, d); return !!d; }, unequip: unequip, holding: holding,
    activate: activate, give: function (name) { defsNamed(name).forEach(function (d) { give(d, false); }); },
    state: function () { return T; }, QB: QB
  };
})();
