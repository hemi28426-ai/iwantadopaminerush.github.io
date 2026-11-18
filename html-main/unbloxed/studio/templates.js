// Unbloxed Studio starter templates (v1 maps, FORMAT.md), shown by studio/onboard.js in File > New and the first-run screen.
// window.UBX_TEMPLATES = [{id, name, icon, desc, make() -> fresh v1 map}]
(function () {
  'use strict';
  var n = 0;
  function P(name, shape, p, s, c, o) {
    var q = { id: 't' + (++n), name: name, shape: shape, p: p, s: s, r: [0, 0, 0], c: c || '#a3a2a5', mat: 'plastic', t: 0, collide: true, kind: 'none' };
    if (o) for (var k in o) q[k] = o[k];
    return q;
  }
  // tiny Blockly-JSON helpers (the shape blocks-editor.js saves, read by blocks-runtime.js)
  var T = function (v) { return v && typeof v == 'object' ? { block: v, shadow: { type: 'ubx_text', fields: { TEXT: '' } } } : { shadow: { type: 'ubx_text', fields: { TEXT: v } } }; };
  var N = function (v) { return v && typeof v == 'object' ? { block: v, shadow: { type: 'math_number', fields: { NUM: 0 } } } : { shadow: { type: 'math_number', fields: { NUM: v } } }; };
  var THIS = { shadow: { type: 'ubx_this_part' } };
  function chain(list) { for (var i = 0; i < list.length - 1; i++) list[i].next = { block: list[i + 1] }; return list[0]; }
  function script(name, hat, body) { hat.x = 20; hat.y = 20; if (body.length) hat.next = { block: chain(body) }; return { name: name, blocks: { blocks: { languageVersion: 0, blocks: [hat] } } }; }
  var B = {
    msg: function (t, s) { return { type: 'ubx_message', inputs: { TEXT: T(t), SECS: N(s) } }; },
    toast: function (t) { return { type: 'ubx_toast', inputs: { TEXT: T(t) } }; },
    wait: function (s) { return { type: 'ubx_wait', inputs: { SECS: N(s) } }; },
    statSet: function (k, v) { return { type: 'ubx_stat_set', fields: { STAT: k }, inputs: { V: N(v) } }; },
    statAdd: function (k, v) { return { type: 'ubx_stat_change', fields: { STAT: k }, inputs: { V: N(v) } }; },
    hide: function () { return { type: 'ubx_hide', inputs: { PART: THIS } }; },
    show: function () { return { type: 'ubx_show', inputs: { PART: THIS } }; },
    sound: function (k) { return { type: 'ubx_sound', fields: { SND: k } }; }
  };
  var start = function () { return { type: 'ubx_start' }; }, touched = function () { return { type: 'ubx_touched' }; };
  var every = function (s) { return { type: 'ubx_every', fields: { SECS: s } }; };
  function map(name, icon, desc, sky, parts, extra) {
    var m = { v: 1, name: name, desc: desc, author: '', icon: icon, sky: sky, settings: { walk: 16, jump: 50, gravity: 196, lives: 0, timer: true }, parts: parts };
    if (extra) for (var k in extra) m[k] = extra[k];
    return m;
  }
  function coin(x, y, z) { // a spinning-free coin: touch it for +1 Coins, it comes back after 5 s
    return P('Coin', 'cylinder', [x, y, z], [2, 0.4, 2], '#ffd24a', { mat: 'neon', collide: false, r: [Math.PI / 2, 0, 0],
      scripts: [script('CoinScript', touched(), [B.statAdd('Coins', 1), B.hide(), B.wait(5), B.show()])] });
  }

  function obby() {
    n = 0;
    var L = [
      P('Lava', 'block', [0, -8, 70], [60, 1, 190], '#ff4a1a', { mat: 'neon', kind: 'kill' }),
      P('StartPlatform', 'block', [0, 0, 0], [14, 1, 14], '#d8dde6', { mat: 'smooth' }),
      P('SpawnLocation', 'block', [0, 1, 0], [6, 1, 6], '#d8dde6', { mat: 'smooth', kind: 'spawn' }),
      P('Sign', 'block', [0, 4, 7], [10, 5, 0.5], '#4c7dff', { mat: 'smooth' })
    ];
    // stage 1: jumps that go up
    [[12, 0], [18, 1], [24, 2], [30, 2.5]].forEach(function (a, i) { L.push(P('Jump' + (i + 1), 'block', [i % 2 ? 2 : -2, a[1], a[0]], [4, 1, 4], ['#ff6a8a', '#ffb84a', '#46d36b', '#4cc9ff'][i], { mat: 'smooth' })); });
    L.push(P('Stage1End', 'block', [0, 2.5, 39], [10, 1, 10], '#d8dde6', { mat: 'smooth' }));
    L.push(P('Checkpoint1', 'cylinder', [0, 3.5, 39], [6, 1, 6], '#2ecc71', { mat: 'neon', kind: 'checkpoint', cp: 1 }));
    // stage 2: a walkway with kill bricks to jump over
    L.push(P('Walkway', 'block', [0, 2.5, 60], [6, 1, 30], '#a3a2a5'));
    [52, 60, 68].forEach(function (z, i) { L.push(P('KillBrick' + (i + 1), 'block', [0, 3.5, z], [6, 1, 1.5], '#ff2b2b', { mat: 'neon', kind: 'kill' })); });
    L.push(coin(0, 6, 56)); L.push(coin(0, 6, 64));
    L.push(P('Stage2End', 'block', [0, 2.5, 80], [10, 1, 10], '#d8dde6', { mat: 'smooth' }));
    L.push(P('Checkpoint2', 'cylinder', [0, 3.5, 80], [6, 1, 6], '#2ecc71', { mat: 'neon', kind: 'checkpoint', cp: 2 }));
    // stage 3: moving platform, then a bounce pad up to the top
    L.push(P('MovingPlatform', 'block', [0, 2.5, 90], [6, 1, 6], '#3498db', { mat: 'smooth', kind: 'mover', move: { d: [0, 0, 10], t: 3 } }));
    L.push(P('BounceLanding', 'block', [0, 2.5, 108], [8, 1, 8], '#d8dde6', { mat: 'smooth' }));
    L.push(P('BouncePad', 'cylinder', [0, 3.2, 108], [5, 0.4, 5], '#ff6fb5', { mat: 'neon', kind: 'bounce', bounce: 85 }));
    L.push(P('TopPlatform', 'block', [0, 12, 118], [12, 1, 12], '#d8dde6', { mat: 'smooth' }));
    L.push(P('Checkpoint3', 'cylinder', [0, 13, 118], [6, 1, 6], '#2ecc71', { mat: 'neon', kind: 'checkpoint', cp: 3 }));
    // stage 4: spinner bar, then the finish
    L.push(P('SpinnerFloor', 'block', [0, 12, 134], [16, 1, 16], '#a3a2a5'));
    L.push(P('Spinner', 'block', [0, 13.5, 134], [14, 1, 1], '#ff8a2a', { mat: 'smooth', kind: 'spinner', spin: [0, 1.5, 0] }));
    L.push(coin(5, 15, 134));
    L.push(P('Finish', 'block', [0, 12.5, 148], [8, 1, 8], '#ffd24a', { mat: 'neon', kind: 'finish' }));
    return map('My Obby', '🧗', 'Jump, dodge the red, reach the finish!', 'day', L,
      { scripts: [script('GameScript', start(), [B.statSet('Coins', 0), B.msg("Reach the 🏁 finish! Don't touch the red.", 3)])] });
  }

  function arena() {
    n = 0;
    var L = [
      P('Baseplate', 'block', [0, -2, 0], [200, 4, 200], '#4b8b3b', { mat: 'grass' }),
      P('ArenaFloor', 'cylinder', [0, 0.25, 0], [90, 0.5, 90], '#8a8f98', { mat: 'brick' })
    ];
    // walls around the arena
    for (var i = 0; i < 16; i++) {
      var a = i / 16 * Math.PI * 2;
      L.push(P('Wall', 'block', [Math.sin(a) * 46, 4, Math.cos(a) * 46], [18.5, 8, 2], '#6b6f78', { mat: 'brick', r: [0, a, 0] }));
    }
    // four team spawns
    [[30, 0], [-30, 0], [0, 30], [0, -30]].forEach(function (s, i) {
      L.push(P('SpawnLocation', 'block', [s[0], 1, s[1]], [6, 1, 6], ['#ff4d4d', '#3a7bff', '#46d36b', '#ffd84a'][i], { mat: 'smooth', kind: 'spawn' }));
    });
    // the hill in the middle: ramps up to a golden pad that gives points while you stand on it
    L.push(P('HillBase', 'block', [0, 2, 0], [16, 4, 16], '#7a6a58', { mat: 'wood' }));
    [[0, -12, 0], [0, 12, Math.PI], [12, 0, -Math.PI / 2], [-12, 0, Math.PI / 2]].forEach(function (w) {
      L.push(P('Ramp', 'wedge', [w[0], 2, w[1]], [8, 4, 8], '#7a6a58', { mat: 'wood', r: [0, w[2], 0] }));
    });
    L.push(P('KingPad', 'cylinder', [0, 4.25, 0], [8, 0.5, 8], '#ffd24a', { mat: 'neon',
      scripts: [script('PointsScript', touched(), [B.statAdd('Points', 1), B.wait(1)])] }));
    // cover: pillars and crates
    [[20, 20], [-20, 20], [20, -20], [-20, -20]].forEach(function (c) {
      L.push(P('Pillar', 'cylinder', [c[0], 5, c[1]], [4, 10, 4], '#c9c3b5', { mat: 'smooth' }));
      L.push(P('Crate', 'block', [c[0] * 0.6 + 4, 2, c[1] * 1.3], [4, 4, 4], '#a0703c', { mat: 'wood' }));
    });
    // bounce pads to the sniper ledges
    [[36, 18], [-36, -18]].forEach(function (b, i) {
      L.push(P('BouncePad', 'cylinder', [b[0], 0.7, b[1]], [4, 0.4, 4], '#ff6fb5', { mat: 'neon', kind: 'bounce', bounce: 80 }));
      L.push(P('Ledge', 'block', [b[0] + (i ? -4 : 4), 11, b[1] + (i ? -8 : 8)], [8, 1, 8], '#6b6f78', { mat: 'brick' }));
    });
    return map('Sword Arena', '⚔️', 'Battle arena: hold the golden hill to score points.', 'sunset', L,
      { settings: { walk: 16, jump: 50, gravity: 196, lives: 0, timer: false },
        scripts: [script('GameScript', start(), [B.statSet('Points', 0), B.msg('⚔️ Sword Arena: stand on the golden hill to score!', 3)])] });
  }

  function hideSeek() {
    n = 0;
    var W = '#e9dfc9', F = '#a0703c', L = [
      P('Baseplate', 'block', [0, -2, 0], [200, 4, 200], '#4b8b3b', { mat: 'grass' }),
      P('SpawnLocation', 'block', [0, 0.5, -26], [6, 1, 6], '#d8dde6', { mat: 'smooth', kind: 'spawn' }),
      P('Path', 'block', [0, 0.05, -20], [4, 0.1, 10], '#b5a68a', { mat: 'smooth' }),
      P('Floor', 'block', [0, 0.5, 0], [40, 1, 30], F, { mat: 'wood' })
    ];
    var wall = function (x, z, sx, sz) { L.push(P('Wall', 'block', [x, 6, z], [sx, 10, sz], W, { mat: 'smooth' })); };
    // outer walls with a front door gap (x -2..2 at z = -15)
    wall(-11, -15, 18, 1); wall(11, -15, 18, 1); L.push(P('DoorTop', 'block', [0, 9.5, -15], [4, 3, 1], W, { mat: 'smooth' }));
    wall(0, 15, 40, 1); wall(-20, 0, 1, 30); wall(20, 0, 1, 30);
    // inner walls: four rooms, with doorways
    wall(-12.5, 0, 15, 1); wall(12.5, 0, 15, 1); wall(0, 7.5, 1, 15); wall(0, -10, 1, 10);
    // living room (front left): couch + table
    L.push(P('Couch', 'block', [-12, 2, -11], [10, 2, 3], '#3a7bff', { mat: 'smooth' }), P('CouchBack', 'block', [-12, 3.5, -12.7], [10, 3, 1], '#2f63cc', { mat: 'smooth' }));
    L.push(P('Table', 'block', [-12, 2.5, -5], [5, 0.4, 3], F, { mat: 'wood' }), P('TableLeg', 'block', [-12, 1.6, -5], [1, 1.6, 1], F, { mat: 'wood' }));
    // kitchen (front right): counters + fridge
    L.push(P('Counter', 'block', [12, 2.5, -13], [12, 3, 2.5], '#d9d9d9', { mat: 'smooth' }), P('Fridge', 'block', [18, 4.5, -8], [3, 7, 3], '#f2f2f2', { mat: 'metal' }));
    // bedroom (back left): bed + closet you can hide in (open at the front)
    L.push(P('Bed', 'block', [-14, 1.75, 9], [7, 1.5, 10], '#ff7aa8', { mat: 'smooth' }), P('Pillow', 'block', [-14, 2.8, 12.5], [5, 0.6, 2], '#ffffff', { mat: 'smooth' }));
    L.push(P('ClosetBack', 'block', [-6, 5, 14], [6, 8, 0.5], F, { mat: 'wood' }), P('ClosetLeft', 'block', [-9, 5, 12], [0.5, 8, 4], F, { mat: 'wood' }),
      P('ClosetRight', 'block', [-3, 5, 12], [0.5, 8, 4], F, { mat: 'wood' }), P('ClosetTop', 'block', [-6, 9, 12], [6, 0.5, 4], F, { mat: 'wood' }));
    // attic loft (back right) reached by stairs
    for (var i = 0; i < 6; i++) L.push(P('Stair', 'block', [4 + i * 2, 1.5 + i, 3], [2, 1, 4], F, { mat: 'wood' }));
    L.push(P('Loft', 'block', [16, 7, 9], [8, 1, 11], F, { mat: 'wood' }), P('LoftRail', 'block', [12, 8.5, 9], [0.4, 2, 11], W, { mat: 'smooth' }));
    L.push(P('Boxes', 'block', [17, 9, 12], [3, 3, 3], '#c9a36b', { mat: 'wood' }));
    // garden: hedges and a tree to hide behind
    [[-26, -10], [26, -10], [-26, 10], [26, 10]].forEach(function (h) { L.push(P('Hedge', 'block', [h[0], 2, h[1]], [3, 4, 12], '#2f7a2f', { mat: 'grass' })); });
    L.push(P('TreeTrunk', 'cylinder', [-30, 4, -24], [2, 8, 2], '#6b4a2f', { mat: 'wood' }), P('TreeTop', 'ball', [-30, 10, -24], [8, 8, 8], '#3c9a3c', { mat: 'grass' }));
    return map('Hide & Seek House', '🙈', 'A house full of hiding spots: closet, attic, behind the couch...', 'day', L,
      { settings: { walk: 16, jump: 50, gravity: 196, lives: 0, timer: false },
        scripts: [script('GameScript', start(), [B.statSet('Seconds hidden', 0), B.msg('🙈 Hide! The seeker counts to 20…', 4), B.wait(16), B.msg('Ready or not, here I come!', 3)]),
          script('HideTimer', every(1), [B.statAdd('Seconds hidden', 1)])] });
  }


  // ---------- 3D World templates: maps built by block scripts (FORMAT.md "3D World blocks") ----------
  // value input from a number, a text, or a block
  function I(v) { return typeof v == 'number' ? N(v) : typeof v == 'string' ? T(v) : { block: v }; }
  function vget(name) { return { type: 'variables_get', fields: { VAR: { id: 'v_' + name } } }; }
  function vset(name, v) { return { type: 'variables_set', fields: { VAR: { id: 'v_' + name } }, inputs: { VALUE: I(v) } }; }
  function op(a, o, b) { return { type: 'ubx_arith', fields: { OP: o }, inputs: { A: I(a), B: I(b) } }; }
  function eq(a, o, b) { return { type: 'ubx_compare', fields: { OP: o }, inputs: { A: I(a), B: I(b) } }; }
  function not(a) { return { type: 'ubx_not', inputs: { A: I(a) } }; }
  function and(a, b) { return { type: 'ubx_and', inputs: { A: I(a), B: I(b) } }; }
  function iff(c, body, els) { var b = { type: els ? 'ubx_ifelse' : 'ubx_if', inputs: { COND: I(c), DO: { block: chain(body) } } }; if (els) b.inputs.ELSE = { block: chain(els) }; return b; }
  function spawnB(shape, xyz, size, color, mat, tag) {
    return { type: 'ubx_w_spawn', fields: { SHAPE: shape, MAT: mat }, inputs: { X: I(xyz[0]), Y: I(xyz[1]), Z: I(xyz[2]), SX: I(size[0]), SY: I(size[1]), SZ: I(size[2]),
      COLOR: typeof color == 'string' ? { shadow: { type: 'ubx_colour', fields: { COLOR: color } } } : { block: color, shadow: { type: 'ubx_colour', fields: { COLOR: '#a3a2a5' } } }, TAG: I(tag) } };
  }
  function vscript(name, hat, body, vars) { var sc = script(name, hat, body); sc.blocks.variables = vars.map(function (v) { return { name: v, id: 'v_' + v }; }); return sc; }
  var W = {
    grid: function (w, d, body) { return { type: 'ubx_w_grid', fields: { VX: { id: 'v_gx' }, VZ: { id: 'v_gz' } }, inputs: { W: I(w), D: I(d), DO: { block: chain(body) } } }; },
    delTag: function (t) { return { type: 'ubx_w_deltag', inputs: { TAG: I(t) } }; },
    newSeed: function () { return { type: 'ubx_w_newseed' }; },
    seed: function () { return { type: 'ubx_w_getseed' }; },
    round: function () { return { type: 'ubx_w_roundnum' }; },
    newRound: function () { return { type: 'ubx_w_newround' }; },
    pick: function (l) { return { type: 'ubx_w_pick', inputs: { LIST: I(l) } }; },
    chance: function (p) { return { type: 'ubx_w_chance', inputs: { PCT: I(p) } }; },
    noise: function (x, z, zoom) { return { type: 'ubx_w_noise2', inputs: { X: I(x), Z: I(z), ZOOM: I(zoom) } }; },
    mapv: function (v, a, b, c, d) { return { type: 'ubx_w_mapv', inputs: { V: I(v), A: I(a), B: I(b), C: I(c), D: I(d) } }; },
    clamp: function (v, a, b) { return { type: 'ubx_w_clamp', inputs: { V: I(v), A: I(a), B: I(b) } }; },
    ground: function (x, z) { return { type: 'ubx_w_ground', inputs: { X: I(x), Z: I(z) } }; },
    clone: function (g, xyz, deg, tag) { return { type: 'ubx_w_clone', fields: { GROUP: g }, inputs: { X: I(xyz[0]), Y: I(xyz[1]), Z: I(xyz[2]), DEG: I(deg), TAG: I(tag) } }; },
    tp: function (x, y, z) { return { type: 'ubx_tp_xyz', inputs: { X: I(x), Y: I(y), Z: I(z) } }; },
    join: function (a, b) { return { type: 'ubx_join', inputs: { A: I(a), B: I(b) } }; },
    rand: function (a, b) { return { type: 'ubx_random', inputs: { A: I(a), B: I(b) } }; },
    round0: function (a) { return { type: 'ubx_round', inputs: { A: I(a) } }; },
    hue: function (h) { return { type: 'ubx_hue', inputs: { HUE: I(h) } }; },
    matOf: function (m) { return { type: 'ubx_material', fields: { MAT: m }, inputs: { PART: { block: { type: 'ubx_w_last' }, shadow: { type: 'ubx_this_part' } } } }; },
    delModel: function (g) { return { type: 'ubx_w_delete', inputs: { PART: { block: { type: 'ubx_w_model', fields: { GROUP: g } }, shadow: { type: 'ubx_this_part' } } } }; }
  };
  var key = function (k) { return { type: 'ubx_key', fields: { KEY: k } }; }, roundHat = function () { return { type: 'ubx_w_round' }; };

  // Random Maze: a new maze every round (binary-tree maze: each cell opens north or east, the rest are walls)
  function maze() {
    n = 0;
    var NC = 10, C = 12, H = NC * C / 2, G = vget('gx'), Z = vget('gz');
    var cx = op(op(G, '*', C), '-', H + C / 2), cz = op(op(Z, '*', C), '-', H + C / 2);
    var L = [
      P('Baseplate', 'block', [0, -1, 0], [NC * C + 40, 2, NC * C + 40], '#3b3f4a', { mat: 'smooth' }),
      P('SouthWall', 'block', [0, 4, -H], [NC * C + 1, 8, 1], '#2b2f3a', { mat: 'brick' }),
      P('WestWall', 'block', [-H, 4, 0], [1, 8, NC * C + 1], '#2b2f3a', { mat: 'brick' }),
      P('SpawnLocation', 'block', [-H + C / 2, 0.5, -H + C / 2], [6, 1, 6], '#d8dde6', { mat: 'smooth', kind: 'spawn' }),
      P('Exit', 'block', [H - C / 2, 0.5, H - C / 2], [6, 1, 6], '#ffd24a', { mat: 'neon', kind: 'finish' })
    ];
    var wallCol = W.hue(op(W.round(), '*', 70));
    var build = [
      W.delTag('Maze'), W.newSeed(),
      W.grid(NC, NC, [
        vset('carve', W.pick('north, east')),
        iff(eq(Z, '=', NC), [vset('carve', 'east')]),
        iff(eq(G, '=', NC), [vset('carve', 'north')]),
        iff(and(eq(G, '=', NC), eq(Z, '=', NC)), [vset('carve', 'none')]),
        iff(not(eq(vget('carve'), '=', 'north')), [spawnB('block', [cx, 4, op(cz, '+', C / 2)], [C + 1, 8, 1], wallCol, 'smooth', 'Maze')]),
        iff(not(eq(vget('carve'), '=', 'east')), [spawnB('block', [op(cx, '+', C / 2), 4, cz], [1, 8, C + 1], wallCol, 'smooth', 'Maze')])
      ]),
      W.tp(-H + C / 2, 3, -H + C / 2),
      B.toast(W.join(W.join('🔄 Round ', W.round()), W.join(' · maze seed ', W.seed())))
    ];
    return map('Random Maze', '🌀', 'A brand new maze every round, built by 3D World blocks. Find the golden exit!', 'night', L, {
      scripts: [
        script('GameScript', start(), [B.msg('🌀 Find the golden exit! New maze every 2 minutes.', 3), W.newRound()]),
        vscript('BuildMaze', roundHat(), build, ['gx', 'gz', 'carve']),
        script('RoundTimer', every(120), [W.newRound()]),
        script('NextRound', { type: 'ubx_finish' }, [B.wait(3), W.newRound()])
      ] });
  }

  // Hill Terrain: smooth hills from noise, sand / grass / rock / snow by height, trees cloned from the "Tree" model. R = new world
  function terrain() {
    n = 0;
    var NG = 40, S4 = 4, OFF = NG * S4 / 2 + S4 / 2, G = vget('gx'), Z = vget('gz'), h = vget('h');
    var x = op(op(G, '*', S4), '-', OFF), z = op(op(Z, '*', S4), '-', OFF);
    var L = [
      P('SpawnLocation', 'block', [0, 60, 0], [6, 1, 6], '#d8dde6', { mat: 'smooth', kind: 'spawn', t: 1, collide: false }),
      P('Water', 'block', [0, 2.5, 0], [NG * S4 + 40, 5, NG * S4 + 40], '#2f8fff', { mat: 'glass', t: 0.35, collide: false }),
      P('Seabed', 'block', [0, -1, 0], [NG * S4 + 40, 2, NG * S4 + 40], '#c9b37a', { mat: 'smooth' }),
      P('Tree.Trunk', 'cylinder', [300, 3, 300], [1.6, 6, 1.6], '#6b4a2f', { mat: 'wood', group: 'Tree' }),
      P('Tree.Leaves', 'ball', [300, 8, 300], [7, 7, 7], '#3c9a3c', { mat: 'grass', group: 'Tree' })
    ];
    var col = function (c, m, extra) { return [spawnB('block', [x, op(h, '/', 2), z], [S4, h, S4], c, m, 'Terrain')].concat(extra || []); };
    var build = [
      W.delTag('Terrain'), W.delTag('Trees'),
      iff(eq(W.round(), '>', 1), [W.newSeed()]),
      W.grid(NG, NG, [
        vset('h', W.round0(W.clamp(W.mapv(W.noise(x, z, 45), 0.25, 0.75, 1, 30), 1, 40))),
        iff(eq(h, '<', 6), col('#e6d28c', 'smooth'), [
          iff(eq(h, '<', 18), col('#4b8b3b', 'grass', [iff(and(eq(h, '>', 7), W.chance(4)), [W.clone('Tree', [x, h, z], W.rand(0, 360), 'Trees')])]), [
            iff(eq(h, '<', 25), col('#7a7a7a', 'smooth', [W.matOf('brick')]), col('#f4f7fb', 'smooth'))
          ])
        ])
      ]),
      W.tp(0, op(W.ground(0, 0), '+', 3), 0),
      B.msg(W.join('🌄 World seed ', W.seed()), 3)
    ];
    return map('Hill Terrain', '🌄', 'Hills, lakes, snowy peaks and trees, generated from noise by 3D World blocks. Press R for a new world.', 'day', L, {
      settings: { walk: 16, jump: 50, gravity: 196, lives: 0, timer: false },
      scripts: [
        script('GameScript', start(), [W.newRound()]),
        vscript('BuildTerrain', roundHat(), build, ['gx', 'gz', 'h']),
        script('NewWorldKey', key('KeyR'), [W.newRound()])
      ] });
  }

  function blank() {
    n = 0;
    return map('Untitled Game', '🧱', '', 'day', [
      P('Baseplate', 'block', [0, -2, 0], [256, 4, 256], '#5f6b7a'),
      P('SpawnLocation', 'block', [0, 0.5, 0], [6, 1, 6], '#d8dde6', { mat: 'smooth', kind: 'spawn' })
    ]);
  }

  window.UBX_TEMPLATES = [
    { id: 'blank', name: 'Blank', icon: '🧱', desc: 'A baseplate and a spawn. Build anything.', make: blank },
    { id: 'obby', name: 'Obby', icon: '🧗', desc: 'Jumps, kill bricks, checkpoints, a moving platform and a finish line.', make: obby },
    { id: 'arena', name: 'Sword Arena', icon: '⚔️', desc: 'A walled arena with 4 spawns, cover, bounce pads and a king-of-the-hill pad.', make: arena },
    { id: 'hideseek', name: 'Hide & Seek House', icon: '🙈', desc: 'A house with rooms, a closet, an attic and a garden full of hiding spots.', make: hideSeek },
    { id: 'maze', name: 'Random Maze', icon: '🌀', desc: 'Built with 3D World blocks: a new random maze every round. Open Game scripts to see how.', make: maze },
    { id: 'terrain', name: 'Hill Terrain', icon: '🌄', desc: 'Built with 3D World blocks: noise hills, lakes, snow and cloned trees. Press R in game for a new world.', make: terrain }
  ];
})();
