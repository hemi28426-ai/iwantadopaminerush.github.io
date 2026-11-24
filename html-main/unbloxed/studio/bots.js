// Unbloxed Studio bots: Bot Spawner + Waypoint parts (FORMAT.md "Bots"), a nav grid with A* pathfinding, bot behaviours
// (fighter / runner / wanderer / guard / idle NPC) and the "Bots" block category.
// Loaded by unbloxed.html after studio-play.js (play mode) and by studio.html (there only window.UBXBotCore is used:
// spawner defaults, normalising and the block specs for blocks-defs.js).
//   window.UBXBotCore   shared: norm(cfg), normLook(look), stats(cfg), lists, FREE items
//   window.UBXBots      play mode: prepare(map) / start(S) / tick(dt) / stop() / think(o, dt) / spawnFor(o) / attack(o) / nav
(function () {
  'use strict';
  // ======================= shared (editor + play) =======================
  var BEHAVIORS = ['fighter', 'runner', 'wanderer', 'guard', 'idle'];
  var BEH_LABEL = { fighter: '⚔️ Fighter', runner: '🏃 Runner', wanderer: '🚶 Wanderer', guard: '🛡️ Guard', idle: '💬 Idle (NPC)' };
  var TEAMS = ['none', 'red', 'blue', 'green', 'yellow', 'ally'];
  var TEAM_LABEL = { none: 'None', red: 'Red', blue: 'Blue', green: 'Green', yellow: 'Yellow', ally: 'Ally (helps the player)' };
  var TEAM_COL = { none: '#ffffff', red: '#ff6464', blue: '#64aaff', green: '#5ee07e', yellow: '#ffd84a', ally: '#7cffd8' };
  var DIFFS = { easy: { react: 0.75, aim: 0.45, speed: 0.85 }, normal: { react: 0.4, aim: 0.72, speed: 1 }, hard: { react: 0.18, aim: 0.93, speed: 1.12 } };
  var FREE = { hat: [0, 1], face: [0, 1], hair: [0, 1], sword: [0] }; // the hub gives everyone these (av.own defaults)
  var DEF_LOOK = { head: '#f5c99b', torso: '#3498db', arms: '#f5c99b', legs: '#2c3e50', hairColor: '#8d5524', hat: 0, hair: 1, face: 0, sword: 0, held: 'sword', scale: 1, bt: 0 };
  function hex(c, d) { return typeof c == 'string' && /^#[0-9a-f]{6}$/i.test(c) ? c.toLowerCase() : d; }
  function int(v, lo, hi, d) { v = Math.round(+v); return isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; }
  function numc(v, lo, hi, d) { v = +v; return isFinite(v) && v !== null ? Math.max(lo, Math.min(hi, v)) : d; }
  function normLook(L) {
    if (!L || typeof L != 'object') return null;
    return { head: hex(L.head, DEF_LOOK.head), torso: hex(L.torso, DEF_LOOK.torso), arms: hex(L.arms, DEF_LOOK.arms), legs: hex(L.legs, DEF_LOOK.legs),
      hairColor: hex(L.hairColor, DEF_LOOK.hairColor), hat: int(L.hat, 0, 99999, 0), hair: int(L.hair, 0, 999, 1), face: int(L.face, 0, 999, 0), sword: int(L.sword, 0, 999, 0),
      held: L.held == 'none' ? 'none' : 'sword', scale: numc(L.scale, 0.5, 2, 1), bt: numc(L.bt, 0, 100, 0) };
  }
  function normPool(P) {
    if (!P || typeof P != 'object') return null;
    var o = {}; ['hat', 'hair', 'face', 'sword'].forEach(function (k) { o[k] = (Array.isArray(P[k]) ? P[k] : []).map(Number).filter(function (n) { return n >= 0 && n % 1 === 0; }).slice(0, 600); });
    return o;
  }
  // spawner settings (part.bot); missing / bad fields take these defaults
  function norm(b) {
    b = b && typeof b == 'object' ? b : {};
    return {
      count: int(b.count, 1, 20, 2), behavior: BEHAVIORS.indexOf(b.behavior) >= 0 ? b.behavior : 'fighter',
      team: TEAMS.indexOf(b.team) >= 0 ? b.team : 'none', diff: DIFFS[b.diff] || b.diff == 'custom' ? b.diff : 'normal',
      react: numc(b.react, 0.05, 3, 0.4), aim: numc(b.aim, 0, 1, 0.72), speed: numc(b.speed, 0.3, 3, 1),
      health: int(b.health, 1, 10000, 100), walk: numc(b.walk, 0, 100, 16), jump: numc(b.jump, 0, 300, 50),
      respawn: b.respawn !== false, delay: numc(b.delay, 0, 60, 3), radius: numc(b.radius, 4, 300, 20),
      names: typeof b.names == 'string' ? b.names.slice(0, 400) : '', look: normLook(b.look), mix: !!b.mix, pool: normPool(b.pool)
    };
  }
  function stats(c) { return c.diff == 'custom' ? { react: c.react, aim: c.aim, speed: c.speed } : DIFFS[c.diff] || DIFFS.normal; }
  // "Bots" block category (its own red, so it isn't mixed up with 3D World pink). blocks-defs.js reads window.UBX_BLOCK_EXT;
  // every type is run below (regBlocks).
  var WHO = 'D:WHO:this bot=this|all bots=all';
  var named = function (nm) { return { block: { type: 'ubx_part_named', fields: { NAME: nm } }, shadow: { type: 'ubx_this_part' } }; };
  (window.UBX_BLOCK_EXT = window.UBX_BLOCK_EXT || []).push({
    col: { bots: ['#E8543C', '#D6452E', '#BF3A25'] },
    specs: [
      ['ubx_bot_spawned', 'hat', 'bots', 'when a bot spawns 🤖', []],
      ['ubx_bot_defeated', 'hat', 'bots', 'when a bot is defeated', []],
      ['ubx_bot_goto', 'stmt', 'bots', '%1 go to %2', [WHO, 'P']],
      ['ubx_bot_attack', 'stmt', 'bots', '%1 attack nearest player', [WHO]],
      ['ubx_bot_speed', 'stmt', 'bots', 'set %1 speed to %2', [WHO, 'N:V:16']],
      ['ubx_bot_behavior', 'stmt', 'bots', 'set %1 behavior to %2', [WHO, 'D:BEH:fighter|runner|wanderer|guard|idle (NPC)=idle']],
      ['ubx_bot_spawn', 'stmt', 'bots', 'spawn %1 bots at %2', ['N:N:1', 'P']],
      ['ubx_bot_remove', 'stmt', 'bots', 'remove all bots', []],
      ['ubx_bot_count', 'num', 'bots', 'number of bots', []],
      ['ubx_bot_defeats', 'num', 'bots', 'bots defeated', []],
      ['ubx_bot_touched', 'hat', 'bots', 'when the player touches a bot', []],
      ['ubx_bot_clicked', 'hat', 'bots', 'when a bot is clicked 🖱️', []],
      ['ubx_bot_say', 'stmt', 'bots', '%1 say %2 for %3 seconds', [WHO, 'T:TEXT:Hello!', 'N:SECS:2']],
      ['ubx_bot_follow', 'stmt', 'bots', '%1 %2 the player', [WHO, 'D:ON:follow=1|stop following=0']],
      ['ubx_bot_sethp', 'stmt', 'bots', 'set %1 health to %2 %', [WHO, 'N:V:100']],
      ['ubx_bot_hp', 'num', 'bots', 'health of %1', ['D:WHO:this bot=this|first bot=all']],
      ['ubx_bot_name', 'stmt', 'bots', 'set %1 name to %2', [WHO, 'T:TEXT:Shopkeeper']],
      ['ubx_bot_color', 'stmt', 'bots', 'set %1 %2 color to %3', [WHO, 'D:PART:shirt=torso|pants=legs|skin=skin|hair=hairColor', 'C:COLOR:#3a7bff']],
      ['ubx_bot_dress', 'stmt', 'bots', 'dress %1 like the player', [WHO]],
      ['ubx_bot_weapon', 'stmt', 'bots', '%1 %2 their sword', [WHO, 'D:ON:hold=1|put away=0']],
      ['ubx_bot_team', 'stmt', 'bots', 'set %1 team to %2', [WHO, 'D:TEAM:none|red|blue|green|yellow|ally (helps the player)=ally']],
      ['ubx_bot_tool', 'stmt', 'bots', '%1 hold tool %2', [WHO, 'T:TOOL:Sword']],
      ['ubx_bot_droptool', 'stmt', 'bots', '%1 put their tool away', [WHO]],
      ['ubx_bot_usetool', 'stmt', 'bots', '%1 use their tool', [WHO]],
      ['ubx_bot_holding', 'str', 'bots', 'tool %1 is holding', ['D:WHO:this bot=this|first bot=all']]
    ],
    category: { name: 'Bots', style: 'bots', blocks: [
      { kind: 'label', text: '"this bot" = the bot in a bot event, else every bot' },
      'ubx_bot_spawned', 'ubx_bot_defeated',
      { kind: 'block', type: 'ubx_bot_goto', inputs: { PART: named('Finish') } },
      'ubx_bot_attack', 'ubx_bot_speed', 'ubx_bot_behavior',
      { kind: 'block', type: 'ubx_bot_spawn', inputs: { N: { shadow: { type: 'math_number', fields: { NUM: 1 } } }, PART: named('BotSpawner') } },
      'ubx_bot_remove', 'ubx_bot_count', 'ubx_bot_defeats',
      { kind: 'label', text: 'NPCs: talk, follow, get clicked, change looks' },
      'ubx_bot_touched', 'ubx_bot_clicked', 'ubx_bot_say', 'ubx_bot_follow', 'ubx_bot_sethp', 'ubx_bot_hp', 'ubx_bot_name', 'ubx_bot_color', 'ubx_bot_dress', 'ubx_bot_weapon', 'ubx_bot_team',
      { kind: 'label', text: 'Tools: a model you made into a tool (Tools category)' },
      'ubx_bot_tool', 'ubx_bot_droptool', 'ubx_bot_usetool', 'ubx_bot_holding'
    ] }
  });
  window.UBXBotCore = { BEHAVIORS: BEHAVIORS, BEH_LABEL: BEH_LABEL, TEAMS: TEAMS, TEAM_LABEL: TEAM_LABEL, TEAM_COL: TEAM_COL, DIFFS: DIFFS, FREE: FREE,
    DEF_LOOK: DEF_LOOK, norm: norm, normLook: normLook, stats: stats };

  // ======================= play mode (unbloxed.html) =======================
  if (!window.MODES || !window.MODES.studio || !window.UBXStudioPlay) return;
  var V = function (x, y, z) { return new THREE.Vector3(x, y, z); };
  var MAX_BOTS = 40, HUB_G = 34;
  var NAMES = ['Blox', 'Nub', 'Zed', 'Kiko', 'Rusty', 'Pip', 'Vex', 'Moxy', 'Tank', 'Lumo', 'Gritz', 'Dax', 'Pokk', 'Fenn', 'Bolt', 'Sprocket', 'Widget', 'Gizmo', 'Byte', 'Chip', 'Echo', 'Nova', 'Rex', 'Ziggy'];
  var B = null; // run state
  var _pb = new THREE.Box3();

  // ---------- nav grid: standable points on top of solid parts, A* over them ----------
  // Built from the static collision boxes when bots first need it, a few ms per frame (low-end Chromebooks).
  // Columns every g studs (g grows on big maps so there are at most ~20k columns); a node is a box top at a column
  // with 4.8 studs of headroom. Walk links: the 8 neighbour columns, up <= STEP or down <= DROP; jump-up links up to the
  // bots' jump height; gap jump links (a few columns ahead) where the gap is within jump reach. Kill bricks block nodes.
  var NODE_CAP = 30000, STEP = 1.0, DROP = 14, HEAD = 4.8;
  var DX = [1, -1, 0, 0, 1, 1, -1, -1], DZ = [0, 0, 1, -1, 1, -1, 1, -1];
  function navNew(S, jumpV) {
    var boxes = [], kills = [], soft = [];
    S.parts.forEach(function (o) {
      var k = o.p.kind; if (k == 'waypoint') return;
      if (k == 'spinner' || k == 'mover') { if (o.p.collide) o.boxes.forEach(function (b) { soft.push(b.clone()); }); return; } // moving: avoid where they sweep
      if (k == 'kill') o.boxes.forEach(function (b) { kills.push(b); });
      if (k == 'bounce') o.boxes.forEach(function (b) { soft.push(b); });
      if (o.p.collide && k != 'kill') o.boxes.forEach(function (b) { boxes.push(b); });
    });
    var mn = V(1e9, 1e9, 1e9), mx = V(-1e9, -1e9, -1e9);
    boxes.forEach(function (b) { mn.min(b.min); mx.max(b.max); });
    if (!boxes.length) { mn.set(-10, 0, -10); mx.set(10, 0, 10); }
    mn.x -= 2; mn.z -= 2; mx.x += 2; mx.z += 2;
    var W = mx.x - mn.x, D = mx.z - mn.z, g = 2;
    while ((W / g) * (D / g) > 20000) g *= 1.15;
    var N = { g: g, x0: mn.x, z0: mn.z, nx: Math.max(1, Math.ceil(W / g)), nz: Math.max(1, Math.ceil(D / g)), n: 0,
      X: new Float32Array(NODE_CAP), Y: new Float32Array(NODE_CAP), Z: new Float32Array(NODE_CAP), F: new Uint8Array(NODE_CAP),
      C: new Int32Array(NODE_CAP), NEXT: new Int32Array(NODE_CAP), JL: new Map(), phase: 0, ci: 0, ni: 0, ready: false, full: false };
    N.HEAD = new Int32Array(N.nx * N.nz).fill(-1);
    // bucket index of boxes (cell bc) so a column only looks at boxes near it
    var bc = Math.max(8, Math.sqrt(W * D / 4000));
    function index(list) {
      var m = new Map();
      list.forEach(function (b) {
        var i0 = Math.floor((b.min.x - mn.x) / bc), i1 = Math.floor((b.max.x - mn.x) / bc), j0 = Math.floor((b.min.z - mn.z) / bc), j1 = Math.floor((b.max.z - mn.z) / bc);
        for (var i = Math.max(0, i0); i <= i1 && i < 4096; i++) for (var j = Math.max(0, j0); j <= j1 && j < 4096; j++) { var k = i * 4096 + j, l = m.get(k); if (!l) m.set(k, l = []); l.push(b); }
      });
      return m;
    }
    N.bc = bc; N.bx = index(boxes); N.kx = index(kills); N.sx = index(soft);
    N.cell = function (m, x, z) { return m.get(Math.floor((x - mn.x) / bc) * 4096 + Math.floor((z - mn.z) / bc)) || []; };
    // jump: physics numbers for the strongest spawner (S.g = this map's gravity on the hub's scale)
    N.G = S.g || HUB_G; N.jv = jumpV; N.jumpH = jumpV * jumpV / (2 * N.G); N.vh = 16;
    N.JUMP = Math.max(0, N.jumpH - 0.45);
    return N;
  }
  // build some columns (phase 0) or gap jump links (phase 1) within `ms`
  function navWork(N, ms) {
    var t0 = performance.now(), k = 0, total = N.nx * N.nz;
    while (N.phase == 0) {
      if (N.ci >= total) { N.phase = 1; break; }
      navColumn(N, N.ci++);
      if (++k % 64 == 0 && performance.now() - t0 > ms) return;
    }
    while (N.phase == 1) {
      if (N.ni >= N.n) { N.phase = 2; N.ready = true; N.bx = N.sx = null; break; }
      navJumps(N, N.ni++);
      if (++k % 64 == 0 && performance.now() - t0 > ms) return;
    }
  }
  function navColumn(N, ci) {
    var i = ci % N.nx, j = (ci / N.nx) | 0, x = N.x0 + (i + 0.5) * N.g, z = N.z0 + (j + 0.5) * N.g;
    var list = N.cell(N.bx, x, z), cand = [], q, b, c;
    for (q = 0; q < list.length; q++) { b = list[q]; if (b.max.x > x - 0.45 && b.min.x < x + 0.45 && b.max.z > z - 0.45 && b.min.z < z + 0.45) cand.push(b); }
    if (!cand.length) return;
    for (q = 0; q < cand.length; q++) {
      b = cand[q]; if (x < b.min.x || x > b.max.x || z < b.min.z || z > b.max.z) continue;
      var y = b.max.y, ok = true;
      for (var r = 0; r < cand.length && ok; r++) { c = cand[r]; if (c !== b && c.max.y > y + 0.05 && c.min.y < y + HEAD) ok = false; }
      if (!ok) continue;
      var dup = false; for (var m = N.HEAD[ci]; m >= 0; m = N.NEXT[m]) if (Math.abs(N.Y[m] - y) < 0.3) { dup = true; break; }
      if (dup) continue;
      if (N.n >= NODE_CAP) { N.full = true; return; }
      var n = N.n++; N.X[n] = x; N.Y[n] = y; N.Z[n] = z; N.C[n] = ci; N.NEXT[n] = N.HEAD[ci]; N.HEAD[ci] = n;
      // kill bricks: on / touching = blocked, near = expensive; bounce pads and spinner/mover sweeps = expensive
      var f = 0, kl = N.cell(N.kx, x, z);
      for (r = 0; r < kl.length; r++) {
        c = kl[r];
        if (c.max.y > y - 0.3 && c.min.y < y + 5) {
          if (c.max.x > x - 1 && c.min.x < x + 1 && c.max.z > z - 1 && c.min.z < z + 1) { f = 2; break; }
          if (c.max.x > x - 2 && c.min.x < x + 2 && c.max.z > z - 2 && c.min.z < z + 2) f = 1;
        }
      }
      if (f < 1) { var sl = N.cell(N.sx, x, z); for (r = 0; r < sl.length; r++) { c = sl[r]; if (c.max.y > y - 0.3 && c.min.y < y + 5 && c.max.x > x - 1.2 && c.min.x < x + 1.2 && c.max.z > z - 1.2 && c.min.z < z + 1.2) { f = 1; break; } } }
      N.F[n] = f;
    }
  }
  function colAt(N, i, j) { return i < 0 || j < 0 || i >= N.nx || j >= N.nz ? -1 : j * N.nx + i; }
  // a walkable node in column c for someone standing at height y (null = none)
  function walkIn(N, c, y) { if (c < 0) return -1; var best = -1; for (var m = N.HEAD[c]; m >= 0; m = N.NEXT[m]) { if (N.F[m] >= 2) continue; var dy = N.Y[m] - y; if (dy <= STEP && dy >= -DROP && (best < 0 || N.Y[m] > N.Y[best])) best = m; } return best; }
  function anyIn(N, c, ylo, yhi) { if (c < 0) return false; for (var m = N.HEAD[c]; m >= 0; m = N.NEXT[m]) if (N.F[m] < 2 && N.Y[m] >= ylo && N.Y[m] <= yhi) return true; return false; }
  function navJumps(N, n) {
    if (N.F[n] >= 2) return;
    var ci = N.C[n], i = ci % N.nx, j = (ci / N.nx) | 0, y = N.Y[n], K = Math.ceil(N.vh * 2 * N.jv / N.G * 0.9 / N.g);
    for (var d = 0; d < 8; d++) {
      var c1 = colAt(N, i + DX[d], j + DZ[d]); if (c1 < 0) continue;
      if (walkIn(N, c1, y) >= 0) continue; // can walk that way: no jump needed
      var diag = d >= 4 ? 1.4142 : 1;
      for (var k = 2; k <= K; k++) {
        var ck = colAt(N, i + DX[d] * k, j + DZ[d] * k); if (ck < 0) break;
        var land = -1;
        for (var m = N.HEAD[ck]; m >= 0; m = N.NEXT[m]) { var dy = N.Y[m] - y; if (N.F[m] < 2 && dy <= N.JUMP && dy >= -8 && (land < 0 || N.Y[m] > N.Y[land])) land = m; }
        // something in between taller than the take-off / landing: a wall, stop looking this way
        var top = land >= 0 ? Math.max(y, N.Y[land]) : y, wall = false;
        for (var q = 1; q < k && !wall; q++) { var cq = colAt(N, i + DX[d] * q, j + DZ[d] * q); for (m = N.HEAD[cq]; m >= 0; m = N.NEXT[m]) if (N.Y[m] > top + 0.4) { wall = true; break; } }
        if (wall) break;
        if (land < 0) continue;
        var dyl = N.Y[land] - y, disc = N.jv * N.jv - 2 * N.G * dyl; if (disc <= 0) break;
        var t = (N.jv + Math.sqrt(disc)) / N.G, dist = k * N.g * diag;
        if (dist <= N.vh * t * 0.85) { var L = N.JL.get(n); if (!L) N.JL.set(n, L = []); L.push(land); }
        break;
      }
    }
  }
  // neighbours of node n: cb(m, cost, jump)
  function expand(N, n, cb) {
    var ci = N.C[n], i = ci % N.nx, j = (ci / N.nx) | 0, y = N.Y[n], g = N.g;
    for (var d = 0; d < 8; d++) {
      var c2 = colAt(N, i + DX[d], j + DZ[d]); if (c2 < 0) continue;
      var diag = d >= 4;
      for (var m = N.HEAD[c2]; m >= 0; m = N.NEXT[m]) {
        if (N.F[m] >= 2) continue;
        var dy = N.Y[m] - y, jump = 0;
        if (dy > STEP) { if (dy > N.JUMP) continue; jump = 1; } else if (dy < -DROP) continue;
        if (diag) { // don't cut corners: both side columns must be walkable around these heights
          var lo = Math.min(y, N.Y[m]) - 1.5, hi = Math.max(y, N.Y[m]) + STEP;
          if (!anyIn(N, colAt(N, i + DX[d], j), lo, hi) || !anyIn(N, colAt(N, i, j + DZ[d]), lo, hi)) continue;
        }
        cb(m, g * (diag ? 1.4142 : 1) + (N.F[m] ? 6 : 0) + (jump ? 3 : 0) + (dy < -4 ? 2 : 0), jump);
      }
    }
    var L = N.JL.get(n);
    if (L) for (var q = 0; q < L.length; q++) { var t = L[q]; cb(t, Math.hypot(N.X[t] - N.X[n], N.Z[t] - N.Z[n]) * 1.3 + 4 + (N.F[t] ? 6 : 0), 1); }
  }
  // the node someone at p stands on (or the closest one near p); -1 = none
  function nodeAt(N, p, down) {
    var i = Math.floor((p.x - N.x0) / N.g), j = Math.floor((p.z - N.z0) / N.g), best = -1, bd = 1e9;
    down = down || 6;
    for (var r = 0; r <= 4; r++) {
      for (var a = -r; a <= r; a++) for (var b2 = -r; b2 <= r; b2++) {
        if (Math.max(Math.abs(a), Math.abs(b2)) != r) continue;
        var c = colAt(N, i + a, j + b2); if (c < 0) continue;
        for (var m = N.HEAD[c]; m >= 0; m = N.NEXT[m]) {
          if (N.F[m] >= 2) continue; var dy = p.y - N.Y[m]; if (dy < -1.6 || dy > down) continue;
          var d = Math.hypot(N.X[m] - p.x, N.Z[m] - p.z) + Math.abs(dy) * 0.5 + N.F[m] * 3; if (d < bd) { bd = d; best = m; }
        }
      }
      if (best >= 0 && r >= 1) return best;
    }
    return best;
  }

  // ---------- A*: one search at a time, a budget of node expansions per frame ----------
  var AS = null; // arrays sized to NODE_CAP
  function asArrays() {
    if (AS) return AS;
    AS = { G: new Float32Array(NODE_CAP), CAME: new Int32Array(NODE_CAP), EDGE: new Uint8Array(NODE_CAP), SEEN: new Uint32Array(NODE_CAP), DONE: new Uint32Array(NODE_CAP),
      HN: new Int32Array(NODE_CAP * 4), HF: new Float32Array(NODE_CAP * 4), stamp: 0 };
    return AS;
  }
  var MAX_EXP = 30000;
  function searchBegin(N, req) {
    var A = asArrays(); A.stamp++; if (A.stamp > 4e9) { A.SEEN.fill(0); A.DONE.fill(0); A.stamp = 1; }
    req.hl = 0; req.exp = 0; req.best = req.s; req.bestH = 1e9; req.N = N;
    A.SEEN[req.s] = A.stamp; A.G[req.s] = 0; A.CAME[req.s] = -1; A.EDGE[req.s] = 0;
    push(A, req, req.s, h(N, req.s, req.t));
  }
  function h(N, a, b) { return Math.hypot(N.X[a] - N.X[b], N.Z[a] - N.Z[b]) + Math.abs(N.Y[a] - N.Y[b]) * 0.3; }
  function push(A, r, n, f) {
    if (r.hl >= A.HN.length) return;
    var i = r.hl++; A.HN[i] = n; A.HF[i] = f;
    while (i > 0) { var p = (i - 1) >> 1; if (A.HF[p] <= A.HF[i]) break; var tn = A.HN[p], tf = A.HF[p]; A.HN[p] = A.HN[i]; A.HF[p] = A.HF[i]; A.HN[i] = tn; A.HF[i] = tf; i = p; }
  }
  function pop(A, r) {
    var top = A.HN[0], last = --r.hl;
    if (last > 0) {
      A.HN[0] = A.HN[last]; A.HF[0] = A.HF[last]; var i = 0;
      for (;;) { var l = i * 2 + 1, rr = l + 1, s = i; if (l < last && A.HF[l] < A.HF[s]) s = l; if (rr < last && A.HF[rr] < A.HF[s]) s = rr; if (s == i) break; var tn = A.HN[s], tf = A.HF[s]; A.HN[s] = A.HN[i]; A.HF[s] = A.HF[i]; A.HN[i] = tn; A.HF[i] = tf; i = s; }
    }
    return top;
  }
  // returns true when finished (req.result = node list or null)
  function searchStep(req, budget) {
    var A = AS, N = req.N, st = A.stamp, cur;
    var relax = function (m, cost, jump) {
      var ng = A.G[cur] + cost;
      if (A.SEEN[m] === st && ng >= A.G[m]) return;
      A.SEEN[m] = st; A.G[m] = ng; A.CAME[m] = cur; A.EDGE[m] = jump; push(A, req, m, ng + h(N, m, req.t));
    };
    while (budget-- > 0) {
      if (!req.hl || req.exp > MAX_EXP) { req.result = trace(A, req.best); req.partial = true; return true; }
      cur = pop(A, req);
      if (A.DONE[cur] === st) continue;
      A.DONE[cur] = st; req.exp++;
      if (cur === req.t) { req.result = trace(A, cur); req.partial = false; return true; }
      var hh = h(N, cur, req.t); if (hh < req.bestH) { req.bestH = hh; req.best = cur; }
      expand(N, cur, relax);
    }
    return false;
  }
  function trace(A, n) { var out = []; while (n >= 0 && out.length < 5000) { out.push(n); n = A.CAME[n]; } return out.reverse(); }
  // node path -> points {x,y,z,j}; straight walking stretches on one level are merged (string pulling)
  function smooth(N, nodes) {
    var pts = [], A = AS, i = 0;
    var pt = function (n) { return { x: N.X[n], y: N.Y[n], z: N.Z[n], j: A.EDGE[n] ? 1 : 0, n: n }; };
    if (!nodes.length) return pts;
    pts.push(pt(nodes[0]));
    while (i < nodes.length - 1) {
      var j = i + 1;
      for (var k = i + 2; k < nodes.length && k <= i + 14; k++) {
        if (A.EDGE[nodes[k]] || A.EDGE[nodes[k - 1]] && k - 1 > i) break;
        if (Math.abs(N.Y[nodes[k]] - N.Y[nodes[i]]) > 0.6 || N.F[nodes[k]]) break;
        if (!lineOK(N, nodes[i], nodes[k])) break;
        j = k;
      }
      pts.push(pt(nodes[j])); i = j;
    }
    return pts;
  }
  function lineOK(N, a, b) {
    var ax = N.X[a], az = N.Z[a], bx = N.X[b], bz = N.Z[b], y = N.Y[a], L = Math.hypot(bx - ax, bz - az), steps = Math.ceil(L / (N.g * 0.5));
    for (var s = 1; s < steps; s++) {
      var f = s / steps, x = ax + (bx - ax) * f, z = az + (bz - az) * f;
      // every column the body (radius ~0.9) touches must be the same floor
      for (var q = 0; q < 4; q++) {
        var ox = q & 1 ? 0.7 : -0.7, oz = q & 2 ? 0.7 : -0.7;
        var c = colAt(N, Math.floor((x + ox - N.x0) / N.g), Math.floor((z + oz - N.z0) / N.g)), ok = false;
        if (c < 0) return false;
        for (var m = N.HEAD[c]; m >= 0; m = N.NEXT[m]) if (Math.abs(N.Y[m] - y) <= 0.6 && !N.F[m]) { ok = true; break; }
        if (!ok) return false;
      }
    }
    return true;
  }

  // ---------- helpers ----------
  function S() { return B && B.S; }
  function topOf(o) { var p = o.cur || o.pos; return V(p.x, o.top + 0.05, p.z); }
  function partPos(o) { return o.rt ? o.rt.pos : (o.cur || o.pos); }
  function inGame(o) { return chars.indexOf(o) >= 0; }
  function supportAt(x, z, y) {
    for (var b of near(x, z)) if (!b.laser && x > b.min.x - 0.3 && x < b.max.x + 0.3 && z > b.min.z - 0.3 && z < b.max.z + 0.3 && b.max.y <= y + 0.4 && b.max.y >= y - 1.3) return true;
    return false;
  }
  function jumpV(cfg) { // Roblox JumpPower -> hub jump speed (same mapping as the player: studio-play.js setPhysics)
    var st = B.S.map.settings, gR = Math.max(1, +st.gravity || 196), h = cfg.jump * cfg.jump / (2 * gR) * 0.85;
    return Math.sqrt(2 * (B.S.g || HUB_G) * Math.max(0, h));
  }
  function cleanName(s) { return String(s || '').replace(/[\u0000-\u001f<>&"'`\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16); }
  function hostile(o, t) {
    if (t === o || !t || t.ko) return false;
    var a = o.ubx.team;
    if (!t.ubx) return t === me && a != 'ally';
    var b = t.ubx.team;
    if (a == 'ally') return b != 'ally';
    if (b == 'ally') return true;
    return a != 'none' && b != 'none' && a != b;
  }
  function nearestHostile(o, range, from) {
    var c = from || o.pos, best = null, bd = range;
    for (var i = 0; i < chars.length; i++) {
      var t = chars[i]; if (!hostile(o, t)) continue;
      var d = Math.hypot(t.pos.x - c.x, t.pos.z - c.z) + Math.abs(t.pos.y - c.y) * 0.5;
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  }
  // the hub's attack() hits everyone in the swing: friends are left out by marking them "knocked out" for that instant
  function swing(o) {
    var saved = [];
    for (var i = 0; i < chars.length; i++) { var t = chars[i]; if (t !== o && !t.ko && !hostile(o, t)) { saved.push(t); t.ko = 1e-9; } }
    try { attack(o); } finally { saved.forEach(function (t) { if (t.ko === 1e-9) t.ko = 0; }); }
  }
  function move(o, vx, vz, dt) { var w = Math.max(0.01, B.S.walk) * 16; physics(o, dt, vx / w, vz / w, false, false); } // studio-play scales by the player's walk setting
  function turnTo(o, yaw, dt) { var d = Math.atan2(Math.sin(yaw - o.yaw), Math.cos(yaw - o.yaw)); o.yaw += Math.max(-12 * dt, Math.min(12 * dt, d)); }

  // ---------- spawners, looks, name tags ----------
  function spTop(sp) { return topOf(sp.o); }
  function iconSprite(text, w) {
    var c = document.createElement('canvas'); c.width = 128; c.height = 128; var g = c.getContext('2d');
    g.font = '92px system-ui,"Segoe UI Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 64, 70);
    var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    s.scale.set(w, w, 1); return s;
  }
  function namesOf(sp) { return (sp.cfg.names || '').split(/[,\n]/).map(cleanName).filter(Boolean); }
  function pickName(sp, i) {
    var L = namesOf(sp), used = {};
    chars.forEach(function (o) { used[o.a.name] = 1; });
    if (L.length) { var nm = L[i % L.length]; if (i >= L.length) nm = (nm + ' ' + (Math.floor(i / L.length) + 1)).slice(0, 18); return nm; }
    var free = NAMES.filter(function (n) { return !used['🤖 ' + n]; });
    return free.length ? free[Math.random() * free.length | 0] : 'Bot' + (Math.random() * 999 | 0);
  }
  function makeLook(sp, i) {
    var c = sp.cfg, L = c.look, r = function (n) { return Math.random() * n | 0; }, P = typeof PAL != 'undefined' ? PAL : ['#f5c99b'];
    var a;
    if (L && !c.mix) a = Object.assign({}, L);
    else {
      var pool = c.mix && c.pool ? c.pool : FREE;
      var pick = function (k) { var l = pool[k] && pool[k].length ? pool[k] : FREE[k]; return l[r(l.length)]; };
      var skin = L ? L.head : P[r(4)];
      a = { head: skin, arms: skin, torso: P[4 + r(12)], legs: P[r(16)], hairColor: P[r(16)], hat: pick('hat'), hair: pick('hair'), face: pick('face'), sword: pick('sword'),
        held: L ? L.held : 'sword', scale: L ? L.scale : 1, bt: L ? L.bt : 0 };
    }
    // items that don't exist in this copy of the site fall back to the defaults
    if (typeof HATS != 'undefined' && !(a.hat < HATS.length)) a.hat = 0;
    if (typeof HAIRS != 'undefined' && !(a.hair < HAIRS.length)) a.hair = 1;
    if (typeof FACES != 'undefined' && !(a.face < FACES.length)) a.face = 0;
    if (typeof SWORDS != 'undefined' && !(a.sword < SWORDS.length)) a.sword = 0;
    a.name = '🤖 ' + pickName(sp, i);
    return a;
  }
  function tag(o) {
    var c = document.createElement('canvas'); c.width = 256; c.height = 80;
    var tx = new THREE.CanvasTexture(c), s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthWrite: false }));
    s.scale.set(4.4, 1.375, 1); s.position.y = 7.6; s.renderOrder = 6; o.c.root.add(s);
    o.ubx.tag = { s: s, c: c, tx: tx, key: '' }; drawTag(o);
  }
  function drawTag(o) {
    var T = o.ubx.tag; if (!T) return;
    var f = Math.max(0, Math.min(1, o.hp / 100)), k = Math.round(f * 25) + (o.ko ? 'k' : '');
    if (T.key === k) return; T.key = k;
    var g = T.c.getContext('2d'); g.clearRect(0, 0, 256, 80);
    g.font = 'bold 28px system-ui,Segoe UI,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,.75)'; g.strokeText(o.a.name, 128, 26); g.fillStyle = TEAM_COL[o.ubx.team] || '#fff'; g.fillText(o.a.name, 128, 26);
    if (!o.ko) {
      g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(58, 54, 140, 13);
      g.fillStyle = f > 0.5 ? '#46d36b' : f > 0.25 ? '#ffd84a' : '#ff4d4d'; g.fillRect(60, 56, 136 * f, 9);
    }
    T.tx.needsUpdate = true;
  }
  function spawnerOf(o) { // part object -> spawner entry (plain parts get default settings)
    if (!B) return null;
    for (var i = 0; i < B.sps.length; i++) if (B.sps[i].o === o) return B.sps[i];
    var sp = { o: o, cfg: norm({ count: 1 }), bots: [], n: 0 }; B.sps.push(sp); return sp;
  }
  function addBot(sp) {
    if (!B || B.bots.length >= MAX_BOTS) return null;
    var i = sp.n++, a = makeLook(sp, i), cfg = sp.cfg;
    var o = spawn(a, true); // the hub's character (pushed into chars; placed again below once it knows its spawner)
    o.ubx = { sp: sp, cfg: cfg, team: cfg.team, beh: cfg.behavior, st: stats(cfg), walk: cfg.walk, jv: jumpV(cfg), health: cfg.health, hp0: 100,
      goal: null, path: null, pi: 0, pending: false, direct: false, lastReq: -9, think: Math.random() * 0.3, atk: 0, target: null,
      best: 1e9, stuck: 0, stuckAll: 0, jumped: 0, cp: 0, cpPos: null, wpi: 0, fin: 0, pause: 0, cmd: null, hold: false, down: false };
    if (a.held == 'none') o.c.sw.visible = false;
    if (a.scale && a.scale != 1) o.c.root.scale.setScalar(a.scale);
    tag(o);
    respawn(o); o.shield = 1;
    var sp0 = spawnFor(o); if (sp0) o.pos.set(sp0.x + (Math.random() - .5) * 4, sp0.y + 1, sp0.z + (Math.random() - .5) * 4); // always on its own spawner
    B.bots.push(o); sp.bots.push(o);
    if (B.nav && !B.nav.ready) B.navNeeded = true;
    onSpawn(o);
    return o;
  }
  function removeBot(o) {
    var i = chars.indexOf(o); if (i >= 0) chars.splice(i, 1);
    scene.remove(o.c.root);
    if (B) {
      B.bots = B.bots.filter(function (b) { return b !== o; }); o.ubx.sp.bots = o.ubx.sp.bots.filter(function (b) { return b !== o; });
      chars.forEach(function (c) { if (c.target === o) c.target = null; if (c.ubx && c.ubx.target === o) c.ubx.target = null; if (c.lastHitBy === o) c.lastHitBy = null; });
    }
    if (B && B.req && B.req.o === o) B.req = null;
    if (B) B.queue = B.queue.filter(function (r) { return r.o !== o; });
  }
  function onSpawn(o) {
    var u = o.ubx; u.path = null; u.goal = null; u.pending = false; u.target = null; u.best = 1e9; u.stuck = 0; u.stuckAll = 0; u.hp0 = o.hp = 100; u.fin = 0;
    if (u.wpi >= B.wps.length && !u.cp) u.wpi = 0;
    fireBot('botspawn', o);
  }
  function fireBot(ev, o) { var X = window.UBXRun && UBXRun.ext; if (X && X.fireWith) X.fireWith(ev, { bot: o }); }

  // ---------- path requests ----------
  function request(o) {
    var u = o.ubx, N = B.nav;
    u.lastReq = B.t;
    if (!N || !N.ready) { u.direct = true; u.path = null; u.pending = false; ensureNav(); return; }
    var s = nodeAt(N, o.pos, 3), t = nodeAt(N, u.goal, 8);
    if (s < 0 || t < 0) { u.direct = true; u.path = null; u.pending = false; return; }
    B.queue = B.queue.filter(function (r) { return r.o !== o; });
    if (B.req && B.req.o === o) B.req = null;
    B.queue.push({ o: o, s: s, t: t }); u.pending = true;
  }
  function serveQueue() {
    var N = B.nav; if (!N || !N.ready) return;
    var budget = 4000;
    while (budget > 0) {
      if (!B.req) {
        B.req = B.queue.shift(); if (!B.req) return;
        if (!inGame(B.req.o) || B.req.o.ko) { B.req = null; continue; }
        searchBegin(N, B.req);
      }
      var r = B.req, before = r.exp;
      var done = searchStep(r, Math.min(budget, 1500));
      budget -= Math.max(50, r.exp - before);
      if (done) {
        B.req = null; B.searches++;
        var u = r.o.ubx; u.pending = false;
        if (!r.result || r.result.length < 1) { u.direct = true; u.path = null; continue; }
        u.path = smooth(N, r.result); u.pi = u.path.length > 1 ? 1 : 0; u.partial = r.partial; u.direct = false; u.best = 1e9; u.stuck = 0;
      }
    }
  }
  function ensureNav() {
    if (B.nav) return;
    var jv = 0; B.sps.forEach(function (sp) { jv = Math.max(jv, jumpV(sp.cfg)); });
    B.nav = navNew(B.S, jv || jumpV(norm({})));
  }
  function setGoal(o, pos, arrive, moving) {
    var u = o.ubx;
    if (!pos) { u.goal = null; u.path = null; u.direct = false; return; }
    var same = u.goal && u.goal.distanceToSquared(pos) < (moving ? 16 : 0.25);
    if (same && (u.path || u.pending || u.direct)) return;
    if (moving && (u.path || u.pending) && B.t - u.lastReq < 0.6) return;
    u.goal = pos.clone(); u.arrive = arrive || 1.2; request(o);
  }

  // ---------- behaviours (decide every ~0.25 s; steer every frame) ----------
  function decide(o) {
    var u = o.ubx;
    if (u.cmd) { u.target = null; setGoal(o, u.cmd, 1.2); return; }
    if (u.beh == 'fighter') {
      var t = nearestHostile(o, 400);
      if (t !== u.target) { u.target = t; u.atk = Math.max(u.atk, u.st.react); }
      if (t) { var d = Math.hypot(t.pos.x - o.pos.x, t.pos.z - o.pos.z); setGoal(o, t.pos, 2.5, true); u.chaseDirect = d < 9 && Math.abs(t.pos.y - o.pos.y) < 1.5; }
      else wander(o);
      return;
    }
    if (u.beh == 'guard') {
      var home = spTop(u.sp), R = u.ubxR || u.cfg.radius;
      var keep = u.target && !u.target.ko && Math.hypot(u.target.pos.x - home.x, u.target.pos.z - home.z) < R + 5 ? u.target : null;
      var t2 = keep || nearestHostile(o, R, home);
      if (t2 !== u.target) { u.target = t2; u.atk = Math.max(u.atk, u.st.react); }
      if (t2) { setGoal(o, t2.pos, 2.5, true); u.chaseDirect = Math.hypot(t2.pos.x - o.pos.x, t2.pos.z - o.pos.z) < 9 && Math.abs(t2.pos.y - o.pos.y) < 1.5; }
      else { u.chaseDirect = false; if (Math.hypot(o.pos.x - home.x, o.pos.z - home.z) > 3) setGoal(o, home, 2); else setGoal(o, null); }
      return;
    }
    if (u.beh == 'runner') { runner(o); return; }
    if (u.beh == 'wanderer') { wander(o); return; }
    // idle NPC: stand still, look at the nearest player close by
    u.target = null; setGoal(o, null);
  }
  function runner(o) {
    var u = o.ubx, S = B.S, g = null;
    if (u.fin > 0) { setGoal(o, null); return; }
    if (B.wps.length) {
      if (u.wpi >= B.wps.length) { if (S.fin.length) g = topOf(S.fin[0]); else u.wpi = 0; }
      if (!g) g = partPos(B.wps[u.wpi]).clone();
    } else {
      var nx = S.cps.filter(function (c) { return c.p.cp > u.cp; })[0];
      if (nx) g = topOf(nx); else if (S.fin.length) g = topOf(S.fin[0]);
    }
    if (!g) { wander(o); return; }
    setGoal(o, g, 1);
  }
  function runnerReach(o) { // waypoint reached? (every frame)
    var u = o.ubx; if (u.beh != 'runner' || u.cmd || !B.wps.length || u.wpi >= B.wps.length) return;
    var w = B.wps[u.wpi], p = partPos(w);
    if (Math.hypot(p.x - o.pos.x, p.z - o.pos.z) < 2.4 && o.pos.y > p.y - 4.5 && o.pos.y < p.y + 2.5) {
      if (w.p.wpJump && o.ground) { o.vel.y = u.jv; o.ground = false; }
      u.wpi++; u.goal = null; runner(o);
    }
  }
  function wander(o) {
    var u = o.ubx, N = B.nav;
    u.target = null;
    if (u.goal && (u.path || u.pending || u.direct)) return; // still going
    if ((u.pause -= 0.25) > 0) return;
    if (!N || !N.ready) { ensureNav(); var a = Math.random() * 6.283, h0 = spTop(u.sp); setGoal(o, V(h0.x + Math.cos(a) * 10, h0.y, h0.z + Math.sin(a) * 10), 1.5); return; }
    var home = spTop(u.sp);
    for (var k = 0; k < 30; k++) {
      var n = Math.random() * N.n | 0;
      if (N.F[n] || Math.hypot(N.X[n] - home.x, N.Z[n] - home.z) > 45 || Math.abs(N.Y[n] - home.y) > 20) continue;
      setGoal(o, V(N.X[n], N.Y[n], N.Z[n]), 1.5); return;
    }
  }
  function arrived(o) { // reached the end of the current goal
    var u = o.ubx;
    if (u.cmd) { u.hold = true; }
    if (u.beh == 'wanderer' && !u.cmd) u.pause = 1 + Math.random() * 2.5;
    u.goal = null; u.path = null; u.direct = false;
  }

  // ---------- steering ----------
  function steer(o, dt) {
    var u = o.ubx, vmax = u.walk * u.st.speed, t = u.target;
    // close to an enemy: face it and swing
    if (t && !t.ko && (u.beh == 'fighter' || u.beh == 'guard') && !u.cmd) {
      var dx = t.pos.x - o.pos.x, dz = t.pos.z - o.pos.z, d = Math.hypot(dx, dz), dy = t.pos.y - o.pos.y;
      if (d < 4.3 && Math.abs(dy) < 3.5) {
        turnTo(o, Math.atan2(dx, dz), dt * 2);
        if ((u.atk -= dt) <= 0 && o.cd <= 0) {
          u.atk = u.st.react * (0.6 + Math.random() * 0.8);
          var yaw = Math.atan2(dx, dz); if (Math.random() > u.st.aim) yaw += (Math.random() < 0.5 ? -1 : 1) * (1.25 + Math.random() * 0.4); // a miss
          o.yaw = yaw; swing(o); B.swings++;
        }
        u.stuck = 0; u.best = 1e9;
        return move(o, d > 3 ? dx / d * vmax * 0.5 : 0, d > 3 ? dz / d * vmax * 0.5 : 0, dt);
      }
      if (u.chaseDirect && d < 12) return toward(o, t.pos, vmax, dt, false);
    } else u.atk = Math.max(0, u.atk - dt);
    if (u.beh == 'idle' && !u.cmd && me && !me.ko) { var dm = Math.hypot(me.pos.x - o.pos.x, me.pos.z - o.pos.z); if (dm < 25) turnTo(o, Math.atan2(me.pos.x - o.pos.x, me.pos.z - o.pos.z), dt * 0.6); }
    if (u.hold || (!u.goal && !u.path)) { u.stuck = 0; return move(o, 0, 0, dt); }
    // next path point
    var P = null;
    if (u.path) {
      while (u.pi < u.path.length) {
        var q = u.path[u.pi], last = u.pi == u.path.length - 1, r = last ? Math.max(0.8, u.arrive || 1) : (q.j ? 0.9 : 1.3);
        if (Math.hypot(q.x - o.pos.x, q.z - o.pos.z) < r && o.pos.y > q.y - 1.2 && (o.pos.y < q.y + 2.5 || !last)) { u.pi++; u.best = 1e9; u.stuck = 0; continue; }
        break;
      }
      if (u.pi >= u.path.length) {
        if (u.partial || (u.goal && Math.hypot(u.goal.x - o.pos.x, u.goal.z - o.pos.z) > (u.arrive || 1.2) + 1.5)) { u.path = null; u.direct = true; }
        else { arrived(o); return move(o, 0, 0, dt); }
      } else P = u.path[u.pi];
    }
    if (!P && u.direct && u.goal) {
      if (Math.hypot(u.goal.x - o.pos.x, u.goal.z - o.pos.z) < (u.arrive || 1.2) && Math.abs(u.goal.y - o.pos.y) < 3.5) { arrived(o); return move(o, 0, 0, dt); }
      return toward(o, u.goal, vmax, dt, true);
    }
    if (!P) return move(o, 0, 0, dt);
    return toward(o, P, vmax, dt, false, P.j);
  }
  // walk (and jump when needed) toward point P
  function toward(o, P, vmax, dt, direct, gap) {
    var u = o.ubx, dx = P.x - o.pos.x, dz = P.z - o.pos.z, d = Math.hypot(dx, dz) || 1e-3, ux = dx / d, uz = dz / d, dy = P.y - o.pos.y;
    turnTo(o, Math.atan2(ux, uz), dt);
    // stuck: no progress toward the point -> jump, then ask for a new path, then go back to the spawner
    if (d < u.best - 0.3) { u.best = d; u.stuck = 0; u.stuckAll = Math.max(0, u.stuckAll - dt * 2); }
    else { u.stuck += dt; u.stuckAll += dt; }
    if (u.stuckAll > 8) { u.stuckAll = 0; B.resets++; reset(o); return; }
    if (u.stuck > 3) { u.stuck = 0; u.best = 1e9; u.goal = null; u.path = null; u.direct = false; B.repaths++; }
    var jump = false, vh = vmax;
    if (o.ground) {
      u.jh = 0;
      var edge = !supportAt(o.pos.x + ux * 1.3, o.pos.z + uz * 1.3, o.pos.y);
      if (gap) { if (edge || d < 2) jump = true; }
      else if (dy > 1.05 && d < 3.5) jump = true;
      else if (direct && edge && dy > -6 && d > 2.5) jump = true;
      else if (u.stuck > 1 && (B.t - u.jumped) > 1.2) jump = true;
      if (jump && u.jv > 0) {
        var disc = u.jv * u.jv - 2 * (B.S.g || HUB_G) * Math.max(-20, dy), tt = disc > 0 ? (u.jv + Math.sqrt(disc)) / (B.S.g || HUB_G) : u.jv / (B.S.g || HUB_G);
        vh = gap || direct ? Math.max(3, Math.min(Math.max(vmax, 10) * 1.1, d / tt * 1.08)) : Math.min(vmax, Math.max(4, d / tt * 1.1));
        o.vel.y = u.jv; o.ground = false; o.vel.x = ux * vh; o.vel.z = uz * vh; u.jh = vh; u.jumped = B.t; B.jumps++;
      }
    } else if (u.jh) vh = u.jh;
    move(o, ux * vh, uz * vh, dt);
  }
  function reset(o) { var u = o.ubx; u.path = null; u.goal = null; u.direct = false; u.pending = false; respawn(o); o.shield = 0.5; u.hp0 = o.hp; }

  // ---------- per bot, per frame (MODES.studio.bot) ----------
  function think(o, dt) {
    var u = o.ubx;
    if (!u || !B) { physics(o, dt, 0, 0, false, false); return; }
    // health: hits are scaled by 100 / Health (the hub's hp is 0..100)
    if (u.health != 100 && o.hp < u.hp0 && !o.ko) { o.hp = u.hp0 - (u.hp0 - o.hp) * 100 / u.health; if (o.hp <= 0) { knock(o, o.lastHitBy); u.hp0 = o.hp; return; } }
    if ((u.think -= dt) <= 0) { u.think = 0.22 + Math.random() * 0.08; decide(o); }
    runnerReach(o);
    steer(o, dt);
    u.hp0 = o.hp;
  }

  // ---------- run ----------
  function prepare(map) { // before studio-play builds the map: waypoints are invisible markers in play
    (map.parts || []).forEach(function (p) { if (p.kind == 'waypoint') { p.t = 1; p.collide = false; } });
  }
  function hasBotBlocks(map) {
    var s = JSON.stringify([map.scripts || null, (map.parts || []).map(function (p) { return p.scripts || null; })]);
    return s.indexOf('"ubx_bot_') >= 0;
  }
  function start(St) {
    stop();
    var sps = St.parts.filter(function (o) { return o.p.kind == 'botspawner'; });
    St.parts.forEach(function (o) { if (o.p.kind == 'waypoint' && o.mesh) o.mesh.visible = false; }); // also when the map was built before this file loaded
    var wps = St.parts.filter(function (o) { return o.p.kind == 'waypoint'; }).sort(function (a, b) { return (+a.p.wp || 0) - (+b.p.wp || 0); });
    B = { S: St, sps: sps.map(function (o) { return { o: o, cfg: norm(o.p.bot), bots: [], n: 0 }; }), bots: [], wps: wps, defeated: 0, t: 0, nav: null, queue: [], req: null,
      meKo: false, hudT: 0, on: sps.length > 0 || hasBotBlocks(St.map), searches: 0, repaths: 0, resets: 0, jumps: 0, swings: 0, navMs: 0 };
    if (!B.on) return;
    B.sps.forEach(function (sp) { var s = iconSprite('🤖', 2.2); var p = spTop(sp); s.position.set(p.x, p.y + 1.6, p.z); scene.add(s); });
    if (B.sps.length) ensureNav();
    B.sps.forEach(function (sp) { for (var i = 0; i < sp.cfg.count; i++) addBot(sp); });
  }
  function stop() {
    if (B) B.bots.slice().forEach(function (o) { try { removeBot(o); } catch (e) { } });
    B = null; var h = document.getElementById('ubx-bots-hud'); if (h) h.remove();
  }
  function tick(dt) {
    if (!B || !B.on || window.UBXStudioPlay.state() !== B.S) return;
    var St = B.S, i, j;
    B.t += dt;
    if (B.nav && !B.nav.ready) {
      var t0 = performance.now(); navWork(B.nav, 4); B.navMs += performance.now() - t0;
      if (B.nav.ready) B.bots.forEach(function (o) { var u = o.ubx; if (u.direct) { u.goal = null; u.direct = false; } });
    }
    serveQueue();
    // bots: KO / respawn bookkeeping, kill bricks, checkpoints, falling
    var list = B.bots.slice();
    for (i = 0; i < list.length; i++) {
      var o = list[i], u = o.ubx;
      if (!inGame(o)) continue;
      if (o.ko > 0 && !u.down) { // just defeated
        u.down = true; B.defeated++; u.path = null; u.goal = null; u.target = null;
        o.ko = u.cfg.respawn ? Math.max(0.6, u.cfg.delay) : 1.6;
        if (u.fin > 0) { u.fin = 0; }
        fireBot('botdefeat', o);
      }
      if (u.down) {
        if (!o.ko) { u.down = false; if (o.ubx.tag) o.ubx.tag.key = ''; onSpawn(o); }
        else if (!u.cfg.respawn && o.ko < 0.15) { removeBot(o); continue; }
        drawTag(o); continue;
      }
      if (u.fin > 0 && (u.fin -= dt) <= 0) { u.cp = 0; u.cpPos = null; u.wpi = 0; reset(o); onSpawn(o); continue; }
      if (o.pos.y < St.minY - 40) { knock(o, null); continue; }
      _pb.min.set(o.pos.x - 0.9, o.pos.y - 0.12, o.pos.z - 0.9); _pb.max.set(o.pos.x + 0.9, o.pos.y + 5, o.pos.z + 0.9);
      for (j = 0; j < St.trig.length; j++) {
        var tr = St.trig[j], hit = false;
        for (var k = 0; k < tr.boxes.length && !hit; k++) hit = _pb.intersectsBox(tr.boxes[k]);
        if (!hit) continue;
        var kd = tr.p.kind;
        if (kd == 'kill') { if (o.shield <= 0.5) { knock(o, null); break; } }
        else if (kd == 'bounce') { var vy = Math.max(0, tr.p.bounce) * St.vk; if (o.vel.y < vy * 0.8) { o.vel.y = vy; o.ground = false; } }
        else if (kd == 'checkpoint' && tr.p.cp > u.cp && u.beh == 'runner') { u.cp = tr.p.cp; u.cpPos = topOf(tr); u.goal = null; }
        else if (kd == 'finish' && u.beh == 'runner' && !u.fin && !u.cmd) { u.fin = 2.5; B.finishes = (B.finishes || 0) + 1; log('🏁 <b>' + escH(o.a.name) + '</b> finished!'); }
      }
      if (o.hp != u.hpDrawn) { u.hpDrawn = o.hp; drawTag(o); }
      npcTick(o, u, dt);
    }
    // the player: health bar shows hits; KO -> respawn fires the respawn hats
    if (me) { if (me.ko > 0) B.meKo = true; else if (B.meKo) { B.meKo = false; if (window.UBXRun) UBXRun.fire('respawn'); } }
    if ((B.hudT -= dt) <= 0) { B.hudT = 0.25; hud(); }
  }
  var escH = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); };
  function hud() {
    var e = document.getElementById('ubx-bots-hud');
    if (!e) { e = document.createElement('div'); e.id = 'ubx-bots-hud'; e.style.cssText = 'position:fixed;left:50%;top:10px;transform:translateX(-50%);z-index:6;background:#000a;color:#fff;font:700 14px system-ui,Segoe UI,sans-serif;padding:5px 12px;border-radius:999px;pointer-events:none;white-space:nowrap'; document.body.appendChild(e); }
    var alive = B.bots.filter(function (o) { return !o.ko; }).length;
    e.textContent = '🤖 ' + alive + ' bot' + (alive == 1 ? '' : 's') + ' · 💥 ' + B.defeated + ' defeated';
  }
  // MODES.studio hooks
  function spawnFor(o) { if (!B || !o.ubx) return null; var p = o.ubx.cpPos || spTop(o.ubx.sp); return V(p.x, p.y - 1, p.z); }
  function allowAttack(o) {
    if (!B || !B.on) return false;
    if (o === me) { // your swing never hits allies
      var saved = []; chars.forEach(function (t) { if (t.ubx && t.ubx.team == 'ally' && !t.ko) { saved.push(t); t.ko = 1e-9; } });
      if (saved.length) Promise.resolve().then(function () { saved.forEach(function (t) { if (t.ko === 1e-9) t.ko = 0; }); });
    }
    return true;
  }

  // ---------- NPC helpers: speech bubbles, follow, touch / click events, looks ----------
  function npcTick(o, u, dt) {
    if (u.say && (u.say.t -= dt) <= 0) sayClear(o);
    var near = !!(me && !me.ko && Math.abs(me.pos.x - o.pos.x) < 2.4 && Math.abs(me.pos.z - o.pos.z) < 2.4 && Math.abs(me.pos.y - o.pos.y) < 4.5);
    if (near && !u.touching) fireBot('bottouch', o);
    u.touching = near;
    if (u.follow && me && !me.ko && (u.followT = (u.followT || 0) - dt) <= 0) {
      u.followT = 0.5;
      var d = Math.hypot(me.pos.x - o.pos.x, me.pos.z - o.pos.z);
      if (d > 7 && (!u.cmd || Math.hypot(u.cmd.x - me.pos.x, u.cmd.z - me.pos.z) > 3)) goTo(o, me.pos, true);
      else if (d <= 5 && u.cmd) { u.cmd = null; u.goal = null; u.path = null; }
    }
  }
  function wrap(g, text, w) {
    var words = String(text).split(/\s+/), lines = [], cur = '';
    words.forEach(function (wd) { var t = cur ? cur + ' ' + wd : wd; if (g.measureText(t).width > w && cur) { lines.push(cur); cur = wd; } else cur = t; });
    if (cur) lines.push(cur); return lines.slice(0, 4);
  }
  function say(o, text, secs) {
    sayClear(o); text = String(text == null ? '' : text).slice(0, 160); if (!text) return;
    var c = document.createElement('canvas'); c.width = 512; c.height = 192; var g = c.getContext('2d');
    g.font = 'bold 30px system-ui,Segoe UI,sans-serif'; var L = wrap(g, text, 460), h = L.length * 36 + 28, w = Math.min(500, Math.max.apply(null, L.map(function (l) { return g.measureText(l).width; })) + 40);
    var x = (512 - w) / 2, y = 192 - h - 22;
    g.fillStyle = '#ffffff'; g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 3;
    g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, 18); else g.rect(x, y, w, h); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(246, y + h - 1); g.lineTo(256, 190); g.lineTo(268, y + h - 1); g.fill();
    g.fillStyle = '#1b1f2a'; g.textAlign = 'center'; g.textBaseline = 'middle';
    L.forEach(function (l, i) { g.fillText(l, 256, y + 14 + 18 + i * 36); });
    var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, depthTest: false }));
    s.scale.set(8, 3, 1); s.position.y = 10; s.renderOrder = 7; o.c.root.add(s);
    o.ubx.say = { s: s, t: Math.max(0.2, Math.min(60, secs)) };
  }
  function sayClear(o) { var S = o.ubx && o.ubx.say; if (!S) return; if (S.s.parent) S.s.parent.remove(S.s); S.s.material.map.dispose(); S.s.material.dispose(); o.ubx.say = null; }
  function relook(o, patch) { // new avatar look: rebuild the character model (like net.js does for players)
    if (typeof makeChar != 'function') return;
    var TLs = window.UBXTools, held = TLs && TLs.holding(o); if (held) TLs.unequip(o); // a held tool moves to the new body
    var old = o.c, a = Object.assign({}, o.a, patch);
    var c = makeChar(a); c.root.position.copy(old.root.position); c.root.rotation.copy(old.root.rotation); c.root.visible = old.root.visible;
    if (old.root.parent) old.root.parent.remove(old.root);
    o.a = a; o.c = c; scene.add(c.root);
    if (typeof equip == 'function') { try { equip(o, o.w == null ? -1 : o.w); } catch (e) { } }
    if (a.scale && a.scale != 1) c.root.scale.setScalar(a.scale);
    if (c.sw) c.sw.visible = a.held != 'none';
    var u = o.ubx; if (u.tag) { c.root.add(u.tag.s); u.tag.key = ''; drawTag(o); } if (u.say) c.root.add(u.say.s);
    if (held) TLs.equip(o, held.name);
  }
  // clicking a bot: a ray from the camera (screen centre while the mouse is locked, else the mouse) against each bot's body
  var _ray = new THREE.Raycaster(), _bb = new THREE.Box3(), _hit = new THREE.Vector3(), _ndc = new THREE.Vector2();
  function clickBot(e) {
    if (!B || !B.on || typeof GAME == 'undefined' || GAME != 'studio' || mode != 'game' || typeof cam == 'undefined') return;
    if (e.button !== 0 && e.button !== 2) return;
    var el = e.target; if (!el || el.tagName != 'CANVAS') return;
    if (document.pointerLockElement) _ndc.set(0, 0);
    else { var r = el.getBoundingClientRect(); _ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); }
    _ray.setFromCamera(_ndc, cam);
    var best = null, bd = 1e9;
    B.bots.forEach(function (o) {
      if (!inGame(o) || o.ko) return; var k = (o.a && o.a.scale) || 1;
      _bb.min.set(o.pos.x - 1.3 * k, o.pos.y - 0.2, o.pos.z - 1.3 * k); _bb.max.set(o.pos.x + 1.3 * k, o.pos.y + 5.6 * k, o.pos.z + 1.3 * k);
      if (_ray.ray.intersectBox(_bb, _hit)) { var d = _hit.distanceTo(_ray.ray.origin); if (d < bd && d < 150) { bd = d; best = o; } }
    });
    if (best) fireBot('botclick', best);
  }
  addEventListener('pointerdown', clickBot, true);

  // ---------- Bots blocks (studio/blocks-runtime.js extension) ----------
  function who(n, th) {
    if (!B) return [];
    if (n.f.WHO != 'all' && th.bot) return th.bot.ubx && inGame(th.bot) ? [th.bot] : [];
    return B.bots.filter(inGame);
  }
  function goTo(o, pos, keepFollow) { var u = o.ubx; if (!keepFollow) u.follow = false; u.cmd = pos.clone(); u.hold = false; u.goal = null; u.path = null; u.direct = false; u.target = null; }
  function setBeh(o, b) { var u = o.ubx; u.follow = false; u.beh = BEHAVIORS.indexOf(b) >= 0 ? b : u.beh; u.cmd = null; u.hold = false; u.goal = null; u.path = null; u.direct = false; u.target = null; u.fin = 0; }
  function regBlocks() {
    var X = window.UBXRun && UBXRun.ext; if (!X) return;
    
    X.DO.ubx_bot_goto = function (n, th) { var p = X.parts(n, th)[0]; if (!p) return; var pos = topOf(p); pos.copy(X.getPos(p)); pos.y = p.top + 0.05; who(n, th).forEach(function (o) { goTo(o, pos); }); };
    X.DO.ubx_bot_attack = function (n, th) { who(n, th).forEach(function (o) { setBeh(o, 'fighter'); }); };
    X.DO.ubx_bot_speed = function (n, th) { var v = Math.max(0, Math.min(200, X.num(X.ev(n.i.V, th)))); who(n, th).forEach(function (o) { o.ubx.walk = v; }); };
    X.DO.ubx_bot_behavior = function (n, th) { who(n, th).forEach(function (o) { setBeh(o, n.f.BEH); }); };
    X.DO.ubx_bot_spawn = function (n, th) {
      if (!B) return; B.on = true;
      var p = X.parts(n, th)[0], k = Math.max(0, Math.min(20, Math.round(X.num(X.ev(n.i.N, th)))));
      var sp = p ? spawnerOf(p) : B.sps[0]; if (!sp) return;
      ensureNav(); for (var i = 0; i < k; i++) addBot(sp);
    };
    X.DO.ubx_bot_remove = function () { if (B) B.bots.slice().forEach(removeBot); };
    X.EV.ubx_bot_count = function () { return B ? B.bots.filter(function (o) { return inGame(o) && !o.ko; }).length : 0; };
    X.EV.ubx_bot_defeats = function () { return B ? B.defeated : 0; };
    // NPC blocks
    X.addHats({ ubx_bot_spawned: 'botspawn', ubx_bot_defeated: 'botdefeat', ubx_bot_touched: 'bottouch', ubx_bot_clicked: 'botclick' });
    X.GEN.ubx_bot_say = function* (n, th) {
      var t = X.str(X.ev(n.i.TEXT, th)), secs = Math.max(0, X.num(X.ev(n.i.SECS, th)));
      who(n, th).forEach(function (o) { say(o, t, secs || 2); });
      if (secs > 0) { th.wake = X.time() + secs; yield; }
    };
    X.DO.ubx_bot_follow = function (n, th) {
      var on = n.f.ON == '1';
      who(n, th).forEach(function (o) { var u = o.ubx; if (on) { u.follow = true; u.followT = 0; } else { u.follow = false; u.cmd = null; u.goal = null; u.path = null; } });
    };
    X.DO.ubx_bot_sethp = function (n, th) {
      var v = Math.max(0, Math.min(100, X.num(X.ev(n.i.V, th))));
      who(n, th).forEach(function (o) { if (o.ko) return; if (v <= 0) { knock(o, null); return; } o.hp = v; o.ubx.hp0 = v; drawTag(o); });
    };
    X.EV.ubx_bot_hp = function (n, th) { var o = who(n, th)[0]; return o ? Math.round(o.hp * 10) / 10 : 0; };
    X.DO.ubx_bot_name = function (n, th) {
      var t = cleanName(X.str(X.ev(n.i.TEXT, th))) || 'Bot';
      who(n, th).forEach(function (o) { o.a.name = t; if (o.ubx.tag) { o.ubx.tag.key = ''; drawTag(o); } });
    };
    X.DO.ubx_bot_color = function (n, th) {
      var c = X.colour(X.ev(n.i.COLOR, th)), k = n.f.PART;
      who(n, th).forEach(function (o) { relook(o, k == 'skin' ? { head: c, arms: c } : k == 'legs' ? { legs: c } : k == 'hairColor' ? { hairColor: c } : { torso: c }); });
    };
    X.DO.ubx_bot_dress = function (n, th) {
      var a = typeof av != 'undefined' && av ? av : null; if (!a) return;
      who(n, th).forEach(function (o) { relook(o, { head: a.head, torso: a.torso, arms: a.arms, legs: a.legs, hairColor: a.hairColor, hat: a.hat, hair: a.hair, face: a.face, sword: a.sword, bt: a.bt }); });
    };
    X.DO.ubx_bot_weapon = function (n, th) { var on = n.f.ON == '1'; who(n, th).forEach(function (o) { o.a.held = on ? 'sword' : 'none'; if (o.c.sw) o.c.sw.visible = on; }); };
    // tools (studio/tools.js): NPCs hold / use a tool the game made from a model
    var TL = function () { return window.UBXTools; };
    X.DO.ubx_bot_tool = function (n, th) { var t = X.str(X.ev(n.i.TOOL, th)).trim(); if (!TL() || !t) return; who(n, th).forEach(function (o) { if (!o.ko && TL().equip(o, t)) o.a.held = 'sword'; }); };
    X.DO.ubx_bot_droptool = function (n, th) { if (!TL()) return; who(n, th).forEach(function (o) { TL().unequip(o); }); };
    X.DO.ubx_bot_usetool = function (n, th) { // at most about 3 uses a second per bot (activate has no cooldown of its own for bots)
      if (!TL()) return; var t = X.time();
      who(n, th).forEach(function (o) { var u = o.ubx; if (o.ko || !TL().holding(o) || t - (u.toolT || -9) < 0.33) return; u.toolT = t; if (!o.target && u.target) o.target = u.target; TL().activate(o); });
    };
    X.EV.ubx_bot_holding = function (n, th) { var o = who(n, th)[0], d = o && TL() && TL().holding(o); return d ? (d.name || '') : ''; };
    X.DO.ubx_bot_team = function (n, th) { var t = TEAMS.indexOf(n.f.TEAM) >= 0 ? n.f.TEAM : 'none'; who(n, th).forEach(function (o) { o.ubx.team = t; if (o.ubx.tag) { o.ubx.tag.key = ''; drawTag(o); } }); };
  }
  regBlocks();

  window.UBXBots = {
    prepare: prepare, start: start, stop: stop, tick: tick, think: think, spawnFor: spawnFor, attack: allowAttack,
    active: function () { return !!(B && B.on); },
    state: function () { return B; },
    // for tests / debugging
    _nav: { nodeAt: nodeAt, expand: expand, smooth: smooth }
  };
  // play-test (?studio=play) starts the map while studio-play.js loads, before this file: pick that run up now (after window.UBXBots exists, so respawn finds the spawner)
  try { var cur = window.UBXStudioPlay.state(); if (cur) start(cur); } catch (e) { console.warn(e); }
})();
