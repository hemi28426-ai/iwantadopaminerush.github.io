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
  var T = function (v) { return { shadow: { type: 'ubx_text', fields: { TEXT: v } } }; };
  var N = function (v) { return { shadow: { type: 'math_number', fields: { NUM: v } } }; };
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
    { id: 'hideseek', name: 'Hide & Seek House', icon: '🙈', desc: 'A house with rooms, a closet, an attic and a garden full of hiding spots.', make: hideSeek }
  ];
})();
