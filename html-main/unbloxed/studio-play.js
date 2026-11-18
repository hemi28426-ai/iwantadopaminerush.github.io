// Unbloxed Studio play mode for unbloxed.html (uses that page's globals: scene, solids, GRID, addSolid, MC, UBOX, spawn,
// me, chars, mode, GAME, camYaw, K, $, toast, joinServer ...). Plays any v1 Studio map (see unbloxed/studio/FORMAT.md).
//   window.startStudio(map)                    start a map now (GAME = 'studio')
//   unbloxed.html?studio=play                  play-test localStorage ubx_studio_play at once (Studio editor's Play)
//   unbloxed.html?game=<uuid>                  open a published (cloud) game directly
//   Home page "Made in Studio" row: built-in samples, local projects, published games (window.UBXCloud)
// Works with the Roblox-style hub (rbx- UI: #studio-cards is a .rbx-games row, the Create page #pg-create is built here,
// leaving a game returns to the page it was started from) and with the older hub (.cards row, header search filters it).
(function () {
  'use strict';
  var V = function (x, y, z) { return new THREE.Vector3(x, y, z); };
  var WEDGE_HIGH = 1; // wedge (Roblox WedgePart, as the editor draws it): low edge at local -Z, tall face at +Z (sign of z of the high edge)
  var HUB_G = 34, HUB_JUMP = 13, JUMP_K = 0.85; // hub physics gravity / jump speed; Roblox jump heights scaled by JUMP_K
  var S = null; // running game state
  var qs = new URLSearchParams(location.search), PLAYTEST = qs.get('studio') == 'play';
  var fmtT = function (s) { var m = s / 60 | 0, r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(1); };
  var escH = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); };

  // ---------- map normalising (unknown fields kept, missing ones defaulted) ----------
  function arr3(a, d) { return Array.isArray(a) && a.length >= 3 ? [+a[0] || 0, +a[1] || 0, +a[2] || 0] : d.slice(); }
  function normalize(m) {
    if (typeof m == 'string') m = JSON.parse(m);
    m = Object.assign({}, m || {});
    m.name = m.name || 'Untitled game';
    m.sky = m.sky || 'day';
    m.settings = Object.assign({ walk: 16, jump: 50, gravity: 196, lives: 0, timer: true, gears: false }, m.settings || {});
    m.settings.gears = m.settings.gears === true; // "Ability to use gears in your game": off unless turned on
    m.parts = (Array.isArray(m.parts) ? m.parts : []).map(function (p, i) {
      p = Object.assign({}, p);
      p.id = p.id || 'p' + i; p.shape = p.shape || 'block';
      p.p = arr3(p.p, [0, 0.5, 0]); p.s = arr3(p.s, [4, 1, 2]); p.r = arr3(p.r, [0, 0, 0]);
      p.s = p.s.map(function (v) { return Math.max(0.05, Math.abs(v)); });
      p.c = p.c || '#a3a2a5'; p.mat = p.mat || 'plastic'; p.t = Math.max(0, Math.min(1, +p.t || 0));
      p.collide = p.collide !== false && p.collide !== 0; p.kind = p.kind || 'none';
      p.spin = arr3(p.spin, [0, 1.5, 0]); p.move = Object.assign({ d: [0, 0, 10], t: 3 }, p.move || {}); p.move.d = arr3(p.move.d, [0, 0, 10]);
      p.bounce = p.bounce == null ? 80 : +p.bounce; p.cp = p.cp == null ? 1 : +p.cp;
      return p;
    });
    return m;
  }

  // ---------- geometry + materials ----------
  var GEO = { cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 32), ball: new THREE.SphereGeometry(0.5, 28, 18), wedge: wedgeGeo() };
  function wedgeGeo() {
    var zh = WEDGE_HIGH * 0.5, zl = -zh, v = [];
    var A = [-.5, -.5, zl], B = [.5, -.5, zl], C = [.5, -.5, zh], D = [-.5, -.5, zh], E = [-.5, .5, zh], F = [.5, .5, zh];
    var tris = [[A, B, C], [A, C, D], [D, C, F], [D, F, E], [A, E, F], [A, F, B], [A, D, E], [B, F, C]];
    var cen = V(0, -1 / 6, zh / 3 * 2 - zh / 3 + 0); // inside the prism
    cen.set(0, -0.5 + 1 / 3, (zh * 2 + zl) / 3);
    tris.forEach(function (t) {
      var a = V(t[0][0], t[0][1], t[0][2]), b = V(t[1][0], t[1][1], t[1][2]), c = V(t[2][0], t[2][1], t[2][2]);
      var n = b.clone().sub(a).cross(c.clone().sub(a)), mid = a.clone().add(b).add(c).divideScalar(3);
      if (n.dot(mid.sub(cen)) < 0) { var tmp = b; b = c; c = tmp; }
      [a, b, c].forEach(function (q) { v.push(q.x, q.y, q.z); });
    });
    var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    var uv = []; for (var i = 0; i < v.length / 3; i++) uv.push(v[i * 3 + 2] + .5, v[i * 3 + 1] + .5);
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); return g;
  }
  var TEX = {};
  function baseTex(kind) {
    if (TEX[kind] !== undefined) return TEX[kind];
    var c = document.createElement('canvas'); c.width = c.height = 128; var g = c.getContext('2d'), i, x, y;
    g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 128);
    if (kind == 'wood') { for (i = 0; i < 26; i++) { y = Math.random() * 128; g.strokeStyle = 'rgba(90,60,30,' + (.08 + Math.random() * .14) + ')'; g.lineWidth = 1 + Math.random() * 3; g.beginPath(); g.moveTo(0, y); for (x = 0; x <= 128; x += 16) g.lineTo(x, y + Math.sin(x * .05 + i) * 2); g.stroke(); } }
    else if (kind == 'brick') { g.fillStyle = '#e8e8e8'; for (y = 0; y < 4; y++) for (x = -1; x < 3; x++) { g.fillStyle = 'rgb(' + (225 + Math.random() * 30 | 0) + ',' + (225 + Math.random() * 30 | 0) + ',' + (225 + Math.random() * 30 | 0) + ')'; g.fillRect(x * 64 + (y % 2) * 32 + 3, y * 32 + 3, 58, 26); } g.globalCompositeOperation = 'destination-over'; g.fillStyle = '#9a9a9a'; g.fillRect(0, 0, 128, 128); g.globalCompositeOperation = 'source-over'; }
    else if (kind == 'grass') { for (i = 0; i < 900; i++) { var l = 170 + Math.random() * 85 | 0; g.fillStyle = 'rgb(' + l + ',' + l + ',' + l + ')'; g.fillRect(Math.random() * 128, Math.random() * 128, 2, 3); } }
    else if (kind == 'metal') { for (i = 0; i < 128; i += 2) { var k = 215 + Math.random() * 40 | 0; g.fillStyle = 'rgb(' + k + ',' + k + ',' + k + ')'; g.fillRect(0, i, 128, 2); } }
    else return TEX[kind] = null;
    var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; return TEX[kind] = t;
  }
  var MATC = {};
  function material(p, own) {
    var rx = Math.max(1, Math.round(Math.max(p.s[0], p.s[1]) / 6)), ry = Math.max(1, Math.round(Math.max(p.s[2], p.s[1]) / 6));
    var key = p.mat + '|' + p.c + '|' + p.t + '|' + rx + '|' + ry;
    if (!own && MATC[key]) return MATC[key];
    var o = { color: p.c, roughness: .6, metalness: 0 }, op = 1 - p.t;
    switch (p.mat) {
      case 'smooth': o.roughness = .22; break;
      case 'neon': o.emissive = p.c; o.emissiveIntensity = .9; o.roughness = .4; break;
      case 'metal': o.metalness = .55; o.roughness = .32; break;
      case 'wood': o.roughness = .8; break;
      case 'grass': o.roughness = .95; break;
      case 'brick': o.roughness = .9; break;
      case 'glass': o.roughness = .05; o.metalness = .1; op = Math.min(op, .45); break;
    }
    var bt = baseTex(p.mat);
    if (bt) { var t = bt.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); o.map = t; }
    if (op < 1) { o.transparent = true; o.opacity = op; o.depthWrite = op > .6; }
    var m = new THREE.MeshStandardMaterial(o);
    if (!own) MATC[key] = m;
    return m;
  }

  // ---------- collision boxes ----------
  var _m4 = new THREE.Matrix4(), _e = new THREE.Euler(0, 0, 0, 'YXZ');
  function quatOf(r) { return new THREE.Quaternion().setFromEuler(_e.set(r[0], r[1], r[2], 'YXZ')); }
  function isAligned(q) { var e = _m4.makeRotationFromQuaternion(q).elements; for (var k of [0, 1, 2, 4, 5, 6, 8, 9, 10]) { var a = Math.abs(e[k]); if (a > .02 && a < .98) return false; } return true; }
  // AABB of an oriented box (centre c, rotation q, size sx,sy,sz) written into out; hs shrinks x/z (non-aligned slivers)
  function obbAabb(c, e, sx, sy, sz, out, hs) {
    var hx = sx / 2, hy = sy / 2, hz = sz / 2;
    var ex = Math.abs(e[0]) * hx + Math.abs(e[4]) * hy + Math.abs(e[8]) * hz;
    var ey = Math.abs(e[1]) * hx + Math.abs(e[5]) * hy + Math.abs(e[9]) * hz;
    var ez = Math.abs(e[2]) * hx + Math.abs(e[6]) * hy + Math.abs(e[10]) * hz;
    ex *= hs; ez *= hs;
    out.min.set(c.x - ex, c.y - ey, c.z - ez); out.max.set(c.x + ex, c.y + ey, c.z + ez); return out;
  }
  // number of boxes a part needs (fixed per part so moving parts can update boxes in place)
  function boxCount(p, forceRot) {
    if (p.shape == 'ball') return 5;
    if (p.shape == 'wedge') return Math.min(60, Math.max(2, Math.ceil(Math.max(p.s[1], p.s[2]) / .7)));
    if (!forceRot && isAligned(quatOf(p.r))) return 1;
    return Math.min(48, Math.max(1, Math.ceil(Math.max(p.s[0], p.s[1], p.s[2]) / 1.2)));
  }
  var _c = V(0, 0, 0), _ax = V(0, 0, 0);
  // fill boxes (array of Box3, length = boxCount) for part p at position pos, rotation q
  function fillBoxes(p, pos, q, boxes) {
    var s = p.s, e = _m4.makeRotationFromQuaternion(q).elements, n = boxes.length, k;
    if (p.shape == 'ball') { // stacked slices inside the sphere
      for (k = 0; k < n; k++) {
        var f = (k + .5) / n - .5, w = Math.sqrt(Math.max(0, 1 - 4 * f * f)) * .82;
        boxes[k].min.set(pos.x - s[0] / 2 * w, pos.y + (f - .5 / n) * s[1], pos.z - s[2] / 2 * w);
        boxes[k].max.set(pos.x + s[0] / 2 * w, pos.y + (f + .5 / n) * s[1], pos.z + s[2] / 2 * w);
      }
      return;
    }
    if (p.shape == 'wedge') { // staircase of slabs, low edge -> high edge
      for (k = 0; k < n; k++) {
        var z0 = -.5 + k / n, zc = z0 + .5 / n, h = Math.max(.04, .5 + WEDGE_HIGH * zc);
        _c.set(0, (-.5 + h / 2) * s[1], zc * s[2]).applyQuaternion(q).add(pos);
        obbAabb(_c, e, s[0], h * s[1], s[2] / n, boxes[k], 1);
      }
      return;
    }
    var cylUp = p.shape == 'cylinder' && Math.abs(e[5]) > .98;
    if (cylUp) { // upright cylinder: square a bit inside the circle
      var hw = s[0] / 2 * .85, hd = s[2] / 2 * .85;
      for (k = 0; k < n; k++) {
        var fy = n == 1 ? 0 : (k + .5) / n - .5;
        boxes[k].min.set(pos.x - hw, pos.y + (fy - .5 / n) * s[1], pos.z - hd); boxes[k].max.set(pos.x + hw, pos.y + (fy + .5 / n) * s[1], pos.z + hd);
      }
      return;
    }
    if (n == 1) { obbAabb(pos, e, s[0], s[1], s[2], boxes[0], 1); return; }
    var a = s[0] >= s[1] && s[0] >= s[2] ? 0 : s[1] >= s[2] ? 1 : 2, L = s[a];
    _ax.set(e[a * 4], e[a * 4 + 1], e[a * 4 + 2]);
    var ss = s.slice(); ss[a] = L / n;
    for (k = 0; k < n; k++) {
      _c.copy(pos).addScaledVector(_ax, ((k + .5) / n - .5) * L);
      obbAabb(_c, e, ss[0], ss[1], ss[2], boxes[k], .85);
    }
  }
  function newBoxes(n) { var b = []; for (var i = 0; i < n; i++) b.push(new THREE.Box3()); return b; }

  // ---------- sky ----------
  function sky(kind) {
    sun.intensity = 1.6; sun.color.set('#fff4e0');
    var s = skyScene(kind == 'sunset');
    if (kind == 'sunset') sun.color.set('#ffd0a0');
    if (kind == 'night') {
      var skyM = s.children[0];
      skyM.material = new THREE.ShaderMaterial({ side: 1, depthWrite: false, vertexShader: 'varying vec3 p;void main(){p=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader: 'varying vec3 p;float h(vec3 q){return fract(sin(dot(q,vec3(12.9898,78.233,45.164)))*43758.5453);}void main(){vec3 d=normalize(p);vec3 c=mix(vec3(.05,.07,.16),vec3(.01,.01,.04),smoothstep(0.,.6,d.y));vec3 g=floor(d*180.);float s=step(.996,h(g))*smoothstep(0.,.15,d.y);gl_FragColor=vec4(c+s*vec3(.9),1.);}' });
      s.children[1].intensity = .35; s.children[1].color.set('#8090ff');
      sun.intensity = .55; sun.color.set('#b8c8ff'); s.fog = new THREE.Fog('#0a0d1e', 120, 700);
    }
    return s;
  }

  // ---------- build ----------
  function build(map) {
    if (window.UBXBots) UBXBots.prepare(map); // studio/bots.js: waypoints are invisible in play
    MERGED.splice(0).forEach(function (g) { g.dispose(); }); // previous run's merged meshes
    scene = sky(map.sky); solids.length = 0; GRID.clear(); pickups.length = 0; SPAWNS = []; PORTALS = [];
    var st = map.settings;
    S = { map: map, parts: [], spawns: [], cps: [], fin: [], trig: [], dyn: [], t: 0, time: 0, hud: 0, cp: 0, cpPos: null, finished: false, grace: 0, minY: 1e9, lives: +st.lives | 0, livesLeft: +st.lives | 0,
      started: false, best: bestGet(map) };
    setPhysics(st);
    var mk = typeof stTag == 'function' && typeof setTag == 'function', merge = {};
    var SCR = window.UBXRun ? UBXRun.scriptedIds(map) : {}; // parts block scripts can change (studio/blocks-runtime.js)
    map.parts.forEach(function (p) {
      if (window.UBXTools && UBXTools.skip(p, map)) return; // a tool's parts are held / picked up, not part of the world (studio/tools.js)
      var pos = V(p.p[0], p.p[1], p.p[2]), q = quatOf(p.r), special = p.kind == 'checkpoint' || p.kind == 'finish';
      var mesh = null, scr = !!SCR[p.id]; // scripted parts: own mesh + material, never merged (hidden while transparency is 1)
      if (p.t < 1 || p.kind == 'spawn' || scr) {
        var mat = material(p.t >= 1 ? Object.assign({}, p, { t: .7 }) : p, special || scr);
        mesh = new THREE.Mesh(GEO[p.shape] || UBOX, mat);
        mesh.scale.set(p.s[0], p.s[1], p.s[2]); mesh.position.copy(pos); mesh.quaternion.copy(q);
        mesh.castShadow = p.t < .5 && p.shadow !== false; mesh.receiveShadow = true;
        if (scr && p.t >= 1 && p.kind != 'spawn') mesh.visible = false;
      }
      var dynamic = p.kind == 'spinner' || p.kind == 'mover';
      if (mesh) { // static parts with a shared material are merged into one mesh per material (few draw calls)
        if (dynamic || special || scr) scene.add(mesh);
        else { var gk = mesh.material.uuid + (mesh.castShadow ? '' : '|ns'); /* CastShadow off: its own merged mesh */ (merge[gk] = merge[gk] || { mat: mesh.material, list: [] }).list.push(mesh); }
      }
      var spinRot = p.kind == 'spinner' && !(p.shape == 'ball' || (p.shape == 'cylinder' && Math.abs(p.spin[0]) < 1e-6 && Math.abs(p.spin[2]) < 1e-6 && isUp(q)));
      var boxes = newBoxes(boxCount(p, spinRot)); fillBoxes(p, pos, q, boxes);
      var o = { p: p, mesh: mesh, pos: pos, q0: q, boxes: boxes, top: 0 };
      boxes.forEach(function (b) { S.minY = Math.min(S.minY, b.min.y); o.top = Math.max(o.top || -1e9, b.max.y); });
      o.top = boxes.reduce(function (m, b) { return Math.max(m, b.max.y); }, -1e9);
      if (p.collide) {
        if (!dynamic) boxes.forEach(addSolid);
        else boxes.forEach(function (b) { var cur = b.clone(); b.copy(envelope(o, cur)); addSolid(b); b.copy(cur); }); // grid cells cover the whole sweep; b is then moved in place
      }
      if (dynamic) {
        o.cur = pos.clone(); o.base = boxes.map(function (b) { return b.clone(); }); o.spinRot = spinRot;
        if (p.kind == 'spinner') { var w = V(p.spin[0], p.spin[1], p.spin[2]); o.w = w.length(); o.axis = o.w ? w.clone().normalize() : V(0, 1, 0); o.wy = w.clone().applyQuaternion(q).y; }
        else o.d = V(p.move.d[0], p.move.d[1], p.move.d[2]);
        S.dyn.push(o);
      }
      if (p.kind == 'spawn') S.spawns.push(o);
      if (p.kind == 'kill' || p.kind == 'checkpoint' || p.kind == 'finish' || p.kind == 'bounce') S.trig.push(o);
      if (p.kind == 'checkpoint') { S.cps.push(o); if (mesh) o.mat = mesh.material; }
      if (p.kind == 'finish') { S.fin.push(o); if (mesh) o.mat = mesh.material; }
      if (special && mk) {
        var tg = stTag(9, 2.25, 256, 64, true); setTag(tg, p.kind == 'finish' ? ['🏁 FINISH', '#ffd84a'] : ['Checkpoint ' + p.cp, '#ffffff']);
        tg.position.set(pos.x, o.top + 7, pos.z); scene.add(tg);
      }
      S.parts.push(o);
    });
    Object.keys(merge).forEach(function (k) { mergeAdd(merge[k].list, merge[k].mat); });
    if (S.minY > 1e8) S.minY = 0;
    S.cps.sort(function (a, b) { return a.p.cp - b.p.cp; });
    S.nCp = S.cps.length ? S.cps[S.cps.length - 1].p.cp : 0;
    sun.position.set(20, 40, 20); sun.target.position.set(0, 0, 0);
  }
  var NI = {}, MERGED = [];
  function flatGeo(g) { return NI[g.uuid] || (NI[g.uuid] = g.index ? g.toNonIndexed() : g); }
  function mergeAdd(list, mat) {
    if (list.length == 1) { scene.add(list[0]); return; }
    var n = 0, i, k; list.forEach(function (m) { n += flatGeo(m.geometry).attributes.position.count; });
    var P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2), off = 0, v = V(0, 0, 0), nm = new THREE.Matrix3();
    list.forEach(function (m) {
      var g = flatGeo(m.geometry), pa = g.attributes.position, na = g.attributes.normal, ua = g.attributes.uv;
      m.updateMatrix(); nm.getNormalMatrix(m.matrix);
      for (i = 0; i < pa.count; i++) {
        v.fromBufferAttribute(pa, i).applyMatrix4(m.matrix); k = (off + i) * 3; P[k] = v.x; P[k + 1] = v.y; P[k + 2] = v.z;
        v.fromBufferAttribute(na, i).applyMatrix3(nm).normalize(); N[k] = v.x; N[k + 1] = v.y; N[k + 2] = v.z;
        if (ua) { U[(off + i) * 2] = ua.getX(i); U[(off + i) * 2 + 1] = ua.getY(i); }
      }
      off += pa.count;
    });
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(N, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(U, 2));
    geo.computeBoundingSphere(); MERGED.push(geo);
    var mm = new THREE.Mesh(geo, mat); mm.castShadow = list[0].castShadow; mm.receiveShadow = true; mm.userData.studioMerged = true; scene.add(mm);
  }
  function isUp(q) { return Math.abs(_m4.makeRotationFromQuaternion(q).elements[5]) > .98; }
  // the grid needs every box registered over all the space it can ever reach
  function envelope(o, b) {
    var p = o.p, env = b.clone();
    if (p.kind == 'mover') { var d = p.move.d; env.union(b.clone().translate(V(d[0], d[1], d[2]))); }
    else { var r = Math.hypot(p.s[0], p.s[1], p.s[2]) / 2; env.union(new THREE.Box3(V(o.pos.x - r, o.pos.y - r, o.pos.z - r), V(o.pos.x + r, o.pos.y + r, o.pos.z + r))); }
    return env;
  }

  // walk / jump / gravity settings (Roblox units) -> hub physics; block scripts change them while playing
  function setPhysics(st) {
    var gR = Math.max(1, +st.gravity || 196), gH = HUB_G * gR / 196.2, jumpH = (Math.pow(+st.jump || 0, 2) / (2 * gR)) * JUMP_K;
    S.g = gH; S.jv = Math.sqrt(2 * gH * Math.max(0, jumpH)); S.walk = (+st.walk || 0) / 16; S.vk = Math.sqrt(gH / gR * JUMP_K);
  }
  function run(ev, arg) { if (window.UBXRun) UBXRun.fire(ev, arg); } // block script events

  // ---------- run state ----------
  function bestKey(m) { return (m.id || m.name) + ':' + m.parts.length; }
  function bestGet(m) { try { return +(JSON.parse(localStorage.getItem('ubx_studio_best') || '{}')[bestKey(m)]) || 0; } catch (e) { return 0; } }
  function bestSet(m, t) { try { var o = JSON.parse(localStorage.getItem('ubx_studio_best') || '{}'); o[bestKey(m)] = t; localStorage.setItem('ubx_studio_best', JSON.stringify(o)); } catch (e) { } }
  function topOf(o) { return V(o.pos.x, o.top + .05, o.pos.z); }
  function spawnPoint() { if (S.cpPos) return S.cpPos; if (!S.spawns.length) return V(0, 5, 0); return topOf(S.spawns[Math.random() * S.spawns.length | 0]); }
  function place(o, pt) { o.pos.copy(pt); o.vel.set(0, 0, 0); o.ground = false; o.shield = 0; o.ko = 0; S.grace = .35; }
  function faceNext() {
    var nx = S.cps.filter(function (c) { return c.p.cp > S.cp; })[0] || S.fin[0];
    if (nx && me) camYaw = Math.atan2(nx.pos.x - me.pos.x, nx.pos.z - me.pos.z);
  }
  function die() {
    if (S.lives > 0) {
      S.livesLeft--;
      if (S.livesLeft <= 0) { S.livesLeft = S.lives; S.cp = 0; S.cpPos = null; S.time = 0; glow(); toast('💀 Out of lives! Back to the start'); }
    }
    oof(); fade(); place(me, spawnPoint()); run('respawn');
  }
  function restart() { S.cp = 0; S.cpPos = null; S.time = 0; S.finished = false; S.livesLeft = S.lives; glow(); place(me, spawnPoint()); faceNext(); hideWin(); run('respawn'); }
  function glow() {
    S.cps.forEach(function (c) { if (!c.mat) return; var on = c.p.cp <= S.cp; c.mat.emissive.set(on ? '#2aff6a' : (c.p.mat == 'neon' ? c.p.c : '#000000')); c.mat.emissiveIntensity = on ? 1.1 : .9; });
  }

  // ---------- feedback ----------
  function el(id, css) { var e = document.getElementById(id); if (!e) { e = document.createElement('div'); e.id = id; e.style.cssText = css; document.body.appendChild(e); } return e; }
  function fade() { var f = el('studio-fade', 'position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;z-index:20'); f.style.transition = 'none'; f.style.opacity = '.7'; void f.offsetWidth; f.style.transition = 'opacity .5s'; f.style.opacity = '0'; }
  var AC = null;
  function beep(f0, f1, dur, type) {
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state == 'suspended') AC.resume();
      var o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime; o.type = type || 'square';
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(.12, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + dur);
    } catch (e) { }
  }
  function oof() {
    var e = el('studio-oof', 'position:fixed;left:50%;top:38%;transform:translate(-50%,-50%);font:900 64px system-ui;color:#fff;text-shadow:0 4px 0 #a01020,0 0 20px #000;pointer-events:none;z-index:25;opacity:0');
    e.textContent = 'Oof!'; e.style.transition = 'none'; e.style.opacity = '1'; e.style.transform = 'translate(-50%,-50%) scale(1.3)'; void e.offsetWidth;
    e.style.transition = 'opacity .8s .3s,transform .4s'; e.style.opacity = '0'; e.style.transform = 'translate(-50%,-50%) scale(1)';
    beep(420, 120, .35, 'sawtooth');
  }
  function confetti() {
    var box = el('studio-confetti', 'position:fixed;inset:0;pointer-events:none;z-index:44;overflow:hidden');
    if (!document.getElementById('studio-cf-css')) { var st = document.createElement('style'); st.id = 'studio-cf-css'; st.textContent = '@keyframes ubxcf{to{transform:translate(var(--dx),110vh) rotate(720deg)}}'; document.head.appendChild(st); }
    var cols = ['#ff4d5e', '#ffe14a', '#46d36b', '#4cf', '#b06cff', '#ff8a1a'];
    for (var i = 0; i < 110; i++) {
      var d = document.createElement('div'), dur = 1.6 + Math.random() * 1.6;
      d.style.cssText = 'position:absolute;top:-20px;left:' + (Math.random() * 100) + 'vw;width:8px;height:14px;border-radius:2px;background:' + cols[i % cols.length] + ';--dx:' + ((Math.random() - .5) * 200) + 'px;animation:ubxcf ' + dur + 's ' + (Math.random() * .6) + 's linear forwards';
      box.appendChild(d); setTimeout(function (x) { x.remove(); }.bind(null, d), (dur + .7) * 1000);
    }
  }
  function win() {
    S.finished = true; var t = S.time, nb = !S.best || t < S.best; if (nb) { S.best = t; bestSet(S.map, t); }
    confetti(); beep(520, 1040, .25, 'triangle'); setTimeout(function () { beep(780, 1560, .3, 'triangle'); }, 180);
    toast('🏁 You finished ' + S.map.name + '!');
    log('🏆 <b>' + escH(av.name) + '</b> finished in ' + fmtT(t));
    var b = el('studio-win', 'position:fixed;left:50%;top:42%;transform:translate(-50%,-50%);z-index:45;background:linear-gradient(160deg,#4c7dff,#7a3cff);color:#fff;padding:22px 30px;border-radius:16px;text-align:center;font-family:system-ui,Segoe UI,sans-serif;box-shadow:0 20px 60px #0008;min-width:260px;max-width:92vw');
    var btn = 'border:0;border-radius:10px;padding:10px 16px;margin:4px;font-weight:800;font-size:15px;cursor:pointer;';
    b.innerHTML = '<div style="font-size:46px">🏁</div><div style="font-size:26px;font-weight:900;text-shadow:0 2px 0 #0005">You finished!</div>' +
      '<div style="margin:6px 0 2px;opacity:.9">' + escH(S.map.name) + '</div>' +
      (S.map.settings.timer ? '<div style="margin:4px 0 14px;font-size:18px">⏱ ' + fmtT(t) + (nb ? ' — new best!' : ' · best ' + fmtT(S.best)) + '</div>' : '<div style="height:12px"></div>') +
      '<button id="studio-again" style="' + btn + 'background:#fff;color:#4c3cff">Play again</button><button id="studio-stay" style="' + btn + 'background:#0004;color:#fff">Keep exploring</button>';
    b.style.display = 'block'; try { document.exitPointerLock(); } catch (e) { }
    b.querySelector('#studio-again').onclick = function () { restart(); lock(); };
    b.querySelector('#studio-stay').onclick = function () { hideWin(); lock(); };
  }
  function lock() { try { var r = R.domElement.requestPointerLock(); if (r && r.catch) r.catch(function () { }); } catch (e) { } }
  function hideWin() { var b = document.getElementById('studio-win'); if (b) b.style.display = 'none'; }

  // ---------- physics tweaks (walk / jump / gravity settings) ----------
  var basePhysics = window.physics;
  window.physics = function (o, dt, mx, mz, jump, sprint) {
    if (GAME !== 'studio' || !S || o.ko) return basePhysics(o, dt, mx, mz, jump, sprint);
    mx *= S.walk; mz *= S.walk;
    if (jump && o.ground && S.jv > 0) { o.vel.y = S.jv; o.ground = false; }
    o.vel.y -= (S.g - HUB_G) * dt;
    return basePhysics(o, dt, mx, mz, false, sprint);
  };

  // ---------- per-frame ----------
  var _q = new THREE.Quaternion(), _pb = new THREE.Box3();
  function onTop(o, b) { return Math.abs(o.pos.y - b.max.y) < .15 && o.pos.x > b.min.x - .6 && o.pos.x < b.max.x + .6 && o.pos.z > b.min.z - .6 && o.pos.z < b.max.z + .6; }
  function tick(dt) {
    if (!S || !me) return;
    S.t += dt; S.grace -= dt;
    var i, j, o;
    // who stands on a moving part (boxes as this frame's physics saw them)
    for (i = 0; i < chars.length; i++) {
      o = chars[i]; o._on = null; if (o.ko || !o.ground) continue;
      for (j = 0; j < S.dyn.length && !o._on; j++) { var d = S.dyn[j]; if (!d.p.collide) continue; for (var b of d.boxes) if (onTop(o, b)) { o._on = d; break; } }
    }
    S.dyn.forEach(function (d) {
      var p = d.p;
      if (p.kind == 'mover') {
        var T = Math.max(.05, +p.move.t || 3), ph = (S.t / T) % 2, f = ph < 1 ? ph : 2 - ph; f = (1 - Math.cos(f * Math.PI)) / 2;
        var nx = d.pos.x + d.d.x * f, ny = d.pos.y + d.d.y * f, nz = d.pos.z + d.d.z * f, dx = nx - d.cur.x, dy = ny - d.cur.y, dz = nz - d.cur.z;
        d.cur.set(nx, ny, nz); if (d.mesh) d.mesh.position.copy(d.cur);
        if (d.p.collide) for (j = 0; j < d.boxes.length; j++) { d.boxes[j].min.set(d.base[j].min.x + nx - d.pos.x, d.base[j].min.y + ny - d.pos.y, d.base[j].min.z + nz - d.pos.z); d.boxes[j].max.set(d.base[j].max.x + nx - d.pos.x, d.base[j].max.y + ny - d.pos.y, d.base[j].max.z + nz - d.pos.z); }
        chars.forEach(function (c) { if (c._on === d) { c.pos.x += dx; c.pos.y += dy; c.pos.z += dz; } });
      } else {
        _q.setFromAxisAngle(d.axis, d.w * S.t); var q = d.q0.clone().multiply(_q);
        if (d.mesh) d.mesh.quaternion.copy(q);
        if (d.p.collide && d.spinRot) fillBoxes(p, d.pos, q, d.boxes);
        var da = d.wy * dt; if (Math.abs(da) > 1e-6) {
          var c = Math.cos(da), s = Math.sin(da);
          chars.forEach(function (ch) { if (ch._on !== d) return; var x = ch.pos.x - d.pos.x, z = ch.pos.z - d.pos.z; ch.pos.x = d.pos.x + x * c + z * s; ch.pos.z = d.pos.z - x * s + z * c; });
        }
      }
    });
    S.cps.concat(S.fin).forEach(function (c) { if (c.mat && (c.p.kind == 'finish' || c.p.cp > S.cp)) c.mat.emissiveIntensity = (c.p.mat == 'neon' ? .7 : .25) + Math.sin(S.t * 4) * .2; });
    if (!S.finished && S.started) S.time += dt;
    if (!S.started && (K.KeyW || K.KeyA || K.KeyS || K.KeyD || K.Space || K.ArrowUp)) S.started = true;
    if (window.UBXRun) UBXRun.tick(dt); // block scripts (studio/blocks-runtime.js)
    if (!S) return;
    if (window.UBXBots) UBXBots.tick(dt); // bots (studio/bots.js)
    // touch triggers
    if (!me.ko) {
      if (me.pos.y < S.minY - 40) { die(); return; }
      _pb.min.set(me.pos.x - .9, me.pos.y - .12, me.pos.z - .9); _pb.max.set(me.pos.x + .9, me.pos.y + 5, me.pos.z + .9);
      for (i = 0; i < S.trig.length; i++) {
        var tr = S.trig[i], hit = false;
        for (j = 0; j < tr.boxes.length && !hit; j++) hit = _pb.intersectsBox(tr.boxes[j]);
        if (!hit) continue;
        var k = tr.p.kind;
        if (k == 'kill') { if (S.grace <= 0) { die(); return; } }
        else if (k == 'bounce') { var vy = Math.max(0, tr.p.bounce) * S.vk; if (me.vel.y < vy * .8) { me.vel.y = vy; me.ground = false; beep(300, 900, .18, 'sine'); } }
        else if (k == 'checkpoint' && tr.p.cp > S.cp) { S.cp = tr.p.cp; S.cpPos = topOf(tr); glow(); beep(660, 990, .15, 'triangle'); toast('✅ Checkpoint ' + S.cp + (S.nCp ? ' / ' + S.nCp : '')); run('cp', S.cp); }
        else if (k == 'finish' && !S.finished) { win(); run('finish'); }
      }
    }
    // HUD
    if ((S.hud -= dt) <= 0) {
      S.hud = .15;
      $('score').innerHTML = '<b>' + escH(S.map.icon || '🧱') + ' ' + escH(S.map.name) + '</b>' + (S.map.author ? '<br><small style="color:#9ab">by ' + escH(S.map.author) + '</small>' : '') +
        (S.map.settings.timer ? '<br>⏱ ' + fmtT(S.time) + (S.best ? ' <small style="color:#9ab">best ' + fmtT(S.best) + '</small>' : '') : '') +
        (S.nCp ? '<br>🚩 Checkpoint ' + S.cp + ' / ' + S.nCp : '') + (S.lives > 0 ? '<br>' + '❤️'.repeat(Math.min(10, S.livesLeft)) + (S.livesLeft > 10 ? ' ×' + S.livesLeft : '') : '') +
        (S.finished ? '<br><b style="color:#ffd84a">🏁 Finished!</b>' : '');
      $('wep').innerHTML = S.finished ? '<b>🏁 Finished in ' + fmtT(S.time) + '</b>' : '<b>' + escH(S.map.name) + '</b>';
      $('items').innerHTML = 'Shift sprint · C back to checkpoint' + (gearsOn() ? ' · 🛠️ Gears on: equip one in the Marketplace, click / Q / E / R to use' : '');
      $('hpfill').style.width = (window.UBXBots && UBXBots.active() ? Math.max(0, me.hp) : 100) + '%';
    }
  }

  function startStudio(map) {
    try { map = normalize(map); } catch (e) { toast('That game could not be loaded'); console.error(e); return; }
    // remix of a standalone game (studio/remix.js, FORMAT.md "Remix"): open that game's page with the remix rules instead
    if (map.remix && /^trench-war(-world)?$/.test(map.remix.base)) { try { localStorage.setItem('ubx_remix_play', JSON.stringify({ base: map.remix.base, rules: map.remix.rules || {}, name: map.name, author: map.author || '' })); } catch (e) { } location.href = map.remix.base + '.html?remix=1' + (PLAYTEST ? '' : '&ubx=1'); return; }
    GAME = 'studio'; mode = 'game'; $('hub').style.display = 'none'; $('hud').style.display = 'block'; $('cross').style.display = 'block';
    feed.length = 0; $('feed').innerHTML = ''; $('dead').style.display = 'none'; hideWin();
    $('help').textContent = 'WASD move · Space jump · Shift sprint · Mouse look · C back to checkpoint' + (PLAYTEST ? ' · Esc stop' : '');
    build(map);
    chars = []; me = spawn(av, false); equip(me, -1); place(me, spawnPoint()); glow(); faceNext(); camPitch = .3;
    if (window.UBXRun) UBXRun.start(S);
    if (window.UBXBots) UBXBots.start(S);
    log('▶ <b>' + escH(map.name) + '</b>' + (map.author ? ' by ' + escH(map.author) : ''));
    lock();
    window.UBX_STUDIO_STATE = S; // for tests / debugging
  }
  function stop() {
    if (window.parent !== window) { try { window.parent.postMessage({ type: 'ubx-studio-stop' }, '*'); } catch (e) { } return; }
    if (history.length > 1) history.back(); else location.href = 'unbloxed/studio.html';
  }

  function gearsOn() { return !!(S && S.map && S.map.settings && S.map.settings.gears === true); }
  window.MODES = window.MODES || {};
  window.MODES.studio = {
    tick: tick,
    bot: function (o, dt) { if (o.ubx && window.UBXBots) return UBXBots.think(o, dt); physics(o, dt, 0, 0, false, false); },
    spawnFor: function (o) { if (!S) return null; if (o.ubx && window.UBXBots) { var bp = UBXBots.spawnFor(o); if (bp) return bp; } var p = spawnPoint(); return V(p.x, p.y - 1, p.z); },
    attack: function (o) { var a = window.UBXBots ? UBXBots.attack(o) : false; return a || gearsOn(); },
    gears: gearsOn // unbloxed/gear-fx.js: Marketplace gears work here only when the game's rules allow them
  };
  window.startStudio = startStudio;
  window.UBXStudioPlay = { normalize: normalize, state: function () { return S; }, WEDGE_HIGH: WEDGE_HIGH,
    // for blocks-runtime.js
    fillBoxes: fillBoxes, boxCount: boxCount, newBoxes: newBoxes, envelope: envelope, material: material, beep: beep, place: place, setPhysics: setPhysics, GEO: GEO,
    die: function () { if (S && me && !me.ko) die(); } };

  addEventListener('keydown', function (e) {
    if (GAME != 'studio' || mode != 'game' || !S || !me) return;
    if (e.code == 'KeyC' && !e.repeat && !me.ko) { fade(); place(me, spawnPoint()); run('respawn'); }
    if (e.code == 'Escape' && PLAYTEST) stop();
  });
  var fromPage = null; // newer hub: the page a Studio game was started from (leaving the game goes back there)
  $('back').addEventListener('click', function () {
    hideWin(); sun.intensity = 1.6; sun.color.set('#fff4e0');
    if (GAME == 'studio') {
      if (window.UBXRun) UBXRun.stop(); if (window.UBXBots) UBXBots.stop(); S = null; renderCards();
      if (fromPage && typeof show == 'function') { try { show(fromPage); } catch (e) { } } // after the hub's own Back handler
    }
  });

  // ---------- hub: "Made in Studio" row (+ the Create page on the newer hub) ----------
  // samples + local projects are filtered locally; published games are paged from the server (24 at a time, no maps)
  // (cloud.js lists games shipped with this copy of the site + new ones from Supabase). Maps load (UBXCloud.load) only when played.
  // Newer hub (Roblox-style "rbx-" UI): tiles look like its game tiles; the home row (#studio-cards) shows the first few,
  // the Create page (#pg-create, built here) has the Studio button, search, game code box and every game.
  // Older hub: one row of .card cards with the code box above it, filtered by the header search.
  var PAGE = 24, CLOUD = [], cloudQ = '', cloudMore = false, cloudBusy = false, cloudSeq = 0, SG = {}, uiDone = false;
  var NEWHUB = !!document.querySelector('.rbx-games'), HOME_MAX = 11;
  function icon(n, s) { try { return typeof ico == 'function' ? ico(n, s) : ''; } catch (e) { return ''; } }
  function grad(s) { var h = 0; for (var i = 0; i < s.length; i++) h = h * 31 + s.charCodeAt(i) | 0; var a = Math.abs(h) % 360; return 'linear-gradient(160deg,hsl(' + a + ',75%,58%),hsl(' + ((a + 50) % 360) + ',70%,42%))'; }
  function localProjects() {
    var out = [];
    try {
      (JSON.parse(localStorage.getItem('ubx_studio_projects') || '[]') || []).forEach(function (pr) {
        if (!pr || !pr.id) return; var m = null;
        try { m = JSON.parse(localStorage.getItem('ubx_studio_p_' + pr.id) || 'null'); } catch (e) { }
        if (!m) return;
        out.push({ key: 'l:' + pr.id, t: pr.name || m.name || 'Untitled', d: 'Your project · ' + ((m.parts || []).length) + ' parts', s: 'Your project', ic: m.icon || '🧱', bg: grad(pr.id + (pr.name || '')), map: m, updated: pr.updated || 0 });
      });
    } catch (e) { }
    return out.sort(function (a, b) { return (b.updated || 0) - (a.updated || 0); });
  }
  function cloudCard(r) {
    var lo = r.local || 'yes', n = r.plays | 0;
    return { key: 'c:' + r.id, id: r.id, local: lo, t: r.name || 'Untitled', d: 'by ' + (r.author || '?') + ' · ' + n + ' play' + (n == 1 ? '' : 's') + '', s: r.author || '?', ic: r.icon || '🧱', bg: grad(String(r.id || r.name || '')),
      thumb: typeof r.thumb == 'string' && (/^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+\/=]+$/.test(r.thumb) || /^(https:\/\/[^\s"'<>]+|[\w\-.\/]+\.(webp|png|jpe?g))$/.test(r.thumb)) ? r.thumb : '' };
  }
  var IMG = function (g) { return '<img loading="lazy" alt="" src="' + escH(g.thumb) + '" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">'; };
  function cardHtml(g) { // older hub
    return '<div class="card" data-sg="' + escH(g.key) + '"><div class="th" style="background:' + g.bg + '">' +
      (g.thumb ? IMG(g) : '<span class="big">' + escH(g.ic) + '</span>' + escH(g.t)) +
      '</div><b>' + escH(g.t) + '</b><small>' + escH(g.d) + '</small></div>';
  }
  function tileHtml(g) { // newer hub: same markup as its game tiles (.rbx-g), data-sg instead of data-g
    return '<div class="rbx-g" data-sg="' + escH(g.key) + '" title="' + escH(g.d) + '"><div class="th" style="position:relative;background:' + g.bg + '">' + (g.thumb ? IMG(g) : escH(g.ic)) +
      '</div><div class="nm">' + escH(g.t) + '</div><div class="st">' + icon('profile', 14) + '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escH(g.s || g.d) + '</span></div></div>';
  }
  var NEW_CARD = '<div class="card" data-sg="new"><div class="th" style="background:repeating-linear-gradient(135deg,#1e2654 0 14px,#232c60 14px 28px);border:2px dashed #7cf6"><span class="big">🛠️</span>Create</div><b>Make your own game</b><small>Open Unbloxed Studio</small></div>';
  function newTile() { return '<div class="rbx-g" data-sg="new"><div class="th" style="background:var(--soft);box-shadow:inset 0 0 0 2px var(--line);color:var(--tx2)">' + (icon('plus', 56) || '+') + '</div><div class="nm">Create</div><div class="st">Open Unbloxed Studio</div></div>'; }
  function searchBox() { return NEWHUB ? $('studio-q') : $('search'); }
  function playCode() {
    var v = ($('studio-code').value || '').trim(), m = v.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (!m) { toast('Paste a game code like 1b2c3d4e-...'); return; }
    if (!window.UBXCloud) { toast('Published games are not available'); return; }
    playCard({ key: 'c:' + m[0], id: m[0].toLowerCase(), t: 'Game ' + m[0].slice(0, 8), ic: '🧱', bg: grad(m[0]), code: true });
  }
  var searchT = 0;
  function onSearch() { renderCards(); clearTimeout(searchT); searchT = setTimeout(function () { loadCloud(true); }, 300); }
  // newer hub: replace the Create page's "not available yet" note with Studio
  function buildCreatePage() {
    var pg = document.getElementById('pg-create'); if (!pg) return false;
    var inp = 'height:36px;border:0;border-radius:8px;background:var(--fill);color:var(--tx);padding:0 12px;font:inherit;font-size:16px;outline:0;min-width:0;flex:1 1 180px;max-width:260px';
    pg.innerHTML = '<h1 class="rbx-h1">Create</h1>' +
      '<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding:18px 20px;margin-top:12px;border-radius:8px;background:var(--soft);max-width:970px">' +
      '<div style="flex:1;min-width:220px"><h2 class="rbx-h2">Unbloxed Studio</h2><div style="color:var(--tx2);line-height:1.45">Build your own experience in the browser with parts, obby kits, models and block scripts. Press Play to test it, then publish it so everyone can play.</div></div>' +
      '<button class="rbx-btn blue md" data-sg="new">' + icon('plus', 20) + 'Open Studio</button></div>' +
      '<div class="rbx-sort"><div class="rbx-sorthead" style="flex-wrap:wrap;gap:10px"><h2 class="rbx-h2">Made in Studio</h2>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;flex:1;justify-content:flex-end"><input id="studio-q" placeholder="Search Studio games" autocomplete="off" style="' + inp + '">' +
      '<input id="studio-code" placeholder="Game code" autocomplete="off" style="' + inp + '"><button class="rbx-btn dark md" id="studio-code-go">Play Code</button></div></div>' +
      '<div class="rbx-games" id="studio-all"></div>' +
      '<div style="text-align:center;margin:18px 0 4px"><button class="rbx-btn light md" id="studio-more" style="display:none;margin:0 auto">Load More</button><small id="studio-cloud-note" style="color:var(--tx3)"></small></div></div>';
    return true;
  }
  function ensureUi() {
    if (uiDone) return; uiDone = true;
    if (NEWHUB) { if (!buildCreatePage()) return; }
    else {
      var box = document.getElementById('studio-cards'); if (!box) return;
      var bar = document.createElement('div'); bar.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:-2px 0 12px';
      bar.innerHTML = '<input id="studio-code" placeholder="Game code (paste a published game\'s id)" style="flex:1;max-width:360px;padding:8px 12px;border-radius:8px;border:1px solid #ffffff22;background:#0d1230;color:#fff">' +
        '<button class="go" id="studio-code-go" style="margin:0">Play code</button>';
      box.parentNode.insertBefore(bar, box);
      var more = document.createElement('div'); more.style.cssText = 'text-align:center;margin:14px 0 4px';
      more.innerHTML = '<button class="go" id="studio-more" style="margin:0;display:none">Load more</button><small id="studio-cloud-note" style="color:#9ab"></small>';
      box.parentNode.insertBefore(more, box.nextSibling);
    }
    $('studio-code-go').onclick = playCode;
    $('studio-code').addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key == 'Enter') playCode(); });
    $('studio-more').onclick = function () { loadCloud(false); };
    var sb = searchBox();
    if (sb) { sb.addEventListener('input', onSearch); if (NEWHUB) sb.addEventListener('keydown', function (e) { e.stopPropagation(); }); }
  }
  function renderCards() {
    ensureUi();
    var home = document.getElementById('studio-cards'), all = NEWHUB ? document.getElementById('studio-all') : null;
    if (!home && !all) return;
    var q = ((searchBox() && searchBox().value) || '').trim().toLowerCase(), L = [];
    (window.UBX_STUDIO_SAMPLES || []).forEach(function (m, i) { L.push({ key: 's:' + i, t: m.name, d: '⭐ Sample · by ' + (m.author || 'Unbloxed'), s: m.author || 'Unbloxed', ic: m.icon || '🧱', bg: 'linear-gradient(160deg,#4c7dff,#7a3cff)', map: m }); });
    localProjects().forEach(function (g) { L.push(g); });
    var mine = L.slice();
    L = L.filter(function (g) { return !q || (g.t + ' ' + g.d).toLowerCase().indexOf(q) >= 0; });
    var seen = {}; CLOUD.forEach(function (r) { if (r && r.id && !seen[r.id]) { seen[r.id] = 1; var c = cloudCard(r); L.push(c); if (!q) mine.push(c); } });
    SG = {}; L.concat(mine).forEach(function (g) { SG[g.key] = g; });
    if (NEWHUB) {
      if (home) home.innerHTML = newTile() + mine.slice(0, HOME_MAX).map(tileHtml).join(''); // the home row ignores the Create page's search
      if (all) all.innerHTML = (q ? '' : newTile()) + (L.length ? L.map(tileHtml).join('') : '<div class="rbx-empty">No Studio games found.</div>');
    } else home.innerHTML = (q ? '' : NEW_CARD) + (L.length ? L.map(cardHtml).join('') : '<small style="color:#9ab">No Studio games found</small>');
    var mb = $('studio-more'); if (mb) mb.style.display = cloudMore ? '' : 'none';
    var nt = $('studio-cloud-note'); if (nt) nt.textContent = cloudBusy ? 'Loading…' : '';
  }
  // reset=true: first page for the current search; false: next page
  function loadCloud(reset) {
    if (!window.UBXCloud || PLAYTEST) return;
    if (reset) { CLOUD = []; cloudMore = false; cloudQ = ((searchBox() && searchBox().value) || '').trim(); }
    else if (cloudBusy || !cloudMore) return;
    var seq = ++cloudSeq, off = CLOUD.length; cloudBusy = true; renderCards();
    var o = { sort: 'plays', limit: PAGE, offset: off }; if (cloudQ) o.q = cloudQ;
    var done = function (rows) {
      if (seq != cloudSeq) return; cloudBusy = false;
      rows = Array.isArray(rows) ? rows : []; CLOUD = CLOUD.concat(rows); cloudMore = rows.length >= PAGE; renderCards();
    };
    try { UBXCloud.list(o).then(done, function () { done([]); }); } catch (e) { done([]); }
  }
  function playedOnce(id) { try { UBXCloud.played(id); } catch (e) { } } // cloud.js counts once per game per session
  function startRow(g, row) {
    var m = Object.assign({ name: row.name, author: row.author, icon: row.icon }, row.map); m.id = m.id || row.id;
    startStudio(m); playedOnce(row.id || g.id);
  }
  function playCard(g) {
    fromPage = typeof page == 'string' ? page : null; // newer hub's current page
    if (g.map) { joinServer('studio', g, function () { startStudio(g.map); }); return; }
    if (!g.id || !window.UBXCloud) return;
    // load the map first (from this copy of the site, or the server for games newer than it), then join
    Promise.resolve().then(function () { return UBXCloud.load(g.id, g.local == 'no' || g.local == 'old'); }).then(function (row) {
      if (!row || !row.map) { toast('That game isn\'t available any more'); return; }
      var info = Object.assign({}, g, { t: row.name || g.t, ic: row.icon || g.ic });
      joinServer('studio', info, function () { startRow(g, row); });
    }).catch(function () { toast('Could not load that game'); });
  }
  document.addEventListener('click', function (e) {
    var c = e.target.closest && e.target.closest('[data-sg]'); if (!c) return;
    if (c.dataset.sg == 'new') { location.href = 'unbloxed/studio.html'; return; }
    var g = SG[c.dataset.sg]; if (g) playCard(g);
  });
  addEventListener('storage', function (e) { if (e.key && e.key.indexOf('ubx_studio_') == 0) renderCards(); });
  addEventListener('pageshow', function (e) { if (e.persisted) { renderCards(); loadCloud(true); } });
  renderCards(); loadCloud(true);
  // ---------- direct entry points ----------
  function hideLogin() { var l = document.getElementById('login'); if (l) l.style.display = 'none'; }
  if (PLAYTEST) {
    hideLogin();
    var back = $('back'); back.textContent = '■ Stop (Esc)'; back.onclick = function (e) { e.stopImmediatePropagation(); stop(); };
    var raw = null; try { raw = localStorage.getItem('ubx_studio_play'); } catch (e) { }
    if (raw) startStudio(raw); else toast('Nothing to play yet: press Play in Unbloxed Studio');
    addEventListener('message', function (e) {
      if (e.source !== window.parent || !e.data || e.data.type != 'ubx-studio-play') return;
      startStudio(e.data.map || (function () { try { return localStorage.getItem('ubx_studio_play'); } catch (x) { return null; } })());
    });
    try { if (window.parent !== window) window.parent.postMessage({ type: 'ubx-studio-ready' }, '*'); } catch (e) { }
  } else if (qs.get('game')) {
    hideLogin();
    var gid = qs.get('game');
    if (window.UBXCloud) playCard({ key: 'c:' + gid, id: gid, t: 'Game', ic: '🧱', bg: grad(gid), code: true });
    else toast('Could not load that game');
  }
})();
