// Built-in sample Unbloxed Studio game (v1 map format, see FORMAT.md), shown in the hub's "Made in Studio" row.
// Course runs along +Z: spawn -> hop pads -> CP1 -> kill-bar corridor -> stepping discs -> spinning cross
// -> bounce pad -> CP2 -> moving platform over lava -> wedge ramp -> finish.
window.UBX_STUDIO_SAMPLES = [(function () {
  var n = 0, parts = [];
  function P(o) {
    var p = { id: 's' + (++n), name: o.name || 'Part', shape: o.shape || 'block', p: o.p, s: o.s, r: o.r || [0, 0, 0], c: o.c || '#a3a2a5',
      mat: o.mat || 'plastic', t: o.t || 0, collide: o.collide !== false, kind: o.kind || 'none' };
    ['spin', 'move', 'bounce', 'cp', 'scripts'].forEach(function (k) { if (o[k] !== undefined) p[k] = o[k]; });
    parts.push(p);
  }
  // block scripts, as the editor saves them (Blockly JSON, see FORMAT.md "Scripts")
  function N(v) { return { shadow: { type: 'math_number', fields: { NUM: v } } }; }
  function T(v) { return { shadow: { type: 'ubx_text', fields: { TEXT: v } } }; }
  var ME = { shadow: { type: 'ubx_this_part' } };
  function B(type, inputs, fields) { var b = { type: type }; if (inputs) b.inputs = inputs; if (fields) b.fields = fields; return b; }
  function seq(list) { for (var i = list.length - 2; i >= 0; i--) list[i].next = { block: list[i + 1] }; return list[0]; }
  function hat(type, x, y, list, fields) { var h = B(type, null, fields); h.x = x; h.y = y; if (list.length) h.next = { block: seq(list) }; return h; }
  function script(name, hats, vars) { var b = { blocks: { languageVersion: 0, blocks: hats } }; if (vars) b.variables = vars; return [{ name: name, blocks: b }]; }
  var coinScript = function () {
    return script('Coin', [
      hat('ubx_start', 30, 30, [B('ubx_spin', { PART: ME, SPEED: N(140) }, { AXIS: 'Y' })]),
      hat('ubx_touched', 30, 170, [B('ubx_stat_change', { V: N(1) }, { STAT: 'Coins' }), B('ubx_sound', null, { SND: 'coin' }), B('ubx_hide', { PART: ME }),
        B('ubx_gui_text', { TEXT: { shadow: T('').shadow, block: B('ubx_join', { A: T('Coins: '), B: { shadow: T('').shadow, block: B('ubx_stat_get', null, { STAT: 'Coins' }) } }) } }, { ELEM: 'CoinsLabel' })])
    ]);
  };
  // start island
  P({ name: 'Baseplate', p: [0, 0, 0], s: [24, 2, 24], c: '#4b9a3c', mat: 'grass' });
  P({ name: 'SpawnLocation', p: [0, 1.1, 0], s: [6, 0.2, 6], c: '#e8e8e8', mat: 'smooth', kind: 'spawn' });
  P({ name: 'Back wall', p: [0, 3, -11.5], s: [24, 4, 1], c: '#a0503a', mat: 'brick' });
  P({ name: 'Trunk', shape: 'cylinder', p: [-8, 4, -6], s: [1.6, 6, 1.6], c: '#6b4626', mat: 'wood' });
  P({ name: 'Leaves', shape: 'ball', p: [-8, 8, -6], s: [6, 6, 6], c: '#2f8f3a', mat: 'grass' });
  P({ name: 'Trunk', shape: 'cylinder', p: [8, 4, -4], s: [1.6, 6, 1.6], c: '#6b4626', mat: 'wood' });
  P({ name: 'Leaves', shape: 'ball', p: [8, 8, -4], s: [5, 5, 5], c: '#3aa346', mat: 'grass' });
  P({ name: 'Crate', p: [-8, 2.5, 7], s: [3, 3, 3], c: '#b98a4e', mat: 'wood' });
  P({ name: 'Crate', p: [-7.5, 5, 7.2], s: [2, 2, 2], r: [0, 0.5, 0], c: '#c99a5e', mat: 'wood' });
  // scripted: a colour-cycling neon sign, a door that slides up when touched (gate frame around it)
  P({ name: 'Neon Sign', p: [0, 6.6, -11.2], s: [10, 1.6, 0.4], c: '#ff4fd8', mat: 'neon', scripts: script('Rainbow', [
    hat('ubx_start', 30, 30, [B('variables_set', { VALUE: T('0') }, { VAR: { id: 'vhue' } }), B('ubx_forever', { DO: { block: seq([B('math_change', { DELTA: N(8) }, { VAR: { id: 'vhue' } }),
      B('ubx_color', { PART: ME, COLOR: { shadow: { type: 'ubx_colour', fields: { COLOR: '#ff4fd8' } }, block: B('ubx_hue', { HUE: { shadow: N(0).shadow, block: B('variables_get', null, { VAR: { id: 'vhue' } }) } }) } }),
      B('ubx_wait', { SECS: N(0.1) })]) } })])
  ], [{ name: 'hue', id: 'vhue' }]) });
  P({ name: 'Gate Post', p: [-3.6, 4, 11.5], s: [1, 6, 1], c: '#555b66', mat: 'metal' });
  P({ name: 'Gate Post', p: [3.6, 4, 11.5], s: [1, 6, 1], c: '#555b66', mat: 'metal' });
  P({ name: 'Gate Top', p: [0, 7.5, 11.5], s: [8.2, 1, 1], c: '#555b66', mat: 'metal' });
  P({ name: 'Door', p: [0, 3.5, 11.5], s: [6.2, 5, 0.6], c: '#c0392b', mat: 'wood', scripts: script('Open on touch', [
    hat('ubx_touched', 30, 30, [B('ubx_sound', null, { SND: 'pop' }), B('ubx_move_secs', { PART: ME, X: N(0), Y: N(5.5), Z: N(0), SECS: N(0.6) }),
      B('ubx_wait', { SECS: N(2.5) }), B('ubx_move_secs', { PART: ME, X: N(0), Y: N(-5.5), Z: N(0), SECS: N(0.6) })])
  ]) });
  // stage 1: hop pads
  var rb = ['#ff4d5e', '#ffa53a', '#ffe14a', '#46d36b'];
  [16, 23, 30, 37].forEach(function (z, i) { P({ name: 'Hop', p: [i % 2 ? 1.5 : -1.5, 1 + i, z], s: [4, 1, 4], c: rb[i], mat: 'smooth' }); });
  [16, 23, 30].forEach(function (z, i) { P({ name: 'Coin', shape: 'cylinder', p: [i % 2 ? 1.5 : -1.5, 3.3 + i, z], s: [1.8, 0.3, 1.8], r: [Math.PI / 2, 0, 0], c: '#ffcc33', mat: 'metal', collide: false, scripts: coinScript() }); });
  // checkpoint 1
  P({ name: 'CP1 Platform', p: [0, 4, 46], s: [12, 1, 10], c: '#8a8f98', mat: 'metal' });
  P({ name: 'Checkpoint 1', p: [0, 4.6, 46], s: [5, 0.2, 5], c: '#2ecc71', mat: 'neon', kind: 'checkpoint', cp: 1 });
  // stage 2: corridor with kill bars
  P({ name: 'Corridor', p: [0, 4, 66], s: [6, 1, 30], c: '#d9d4c7', mat: 'smooth' });
  P({ name: 'Rail', p: [-3.25, 6, 66], s: [0.5, 3, 30], c: '#9ad8ff', mat: 'glass', t: 0.5 });
  P({ name: 'Rail', p: [3.25, 6, 66], s: [0.5, 3, 30], c: '#9ad8ff', mat: 'glass', t: 0.5 });
  [57, 65, 73].forEach(function (z) { P({ name: 'KillBar', p: [0, 5.1, z], s: [6, 1.2, 1], c: '#ff2020', mat: 'neon', kind: 'kill' }); });
  [[-4.5, 54], [4.5, 62], [-4.5, 70], [4.5, 78]].forEach(function (q) { P({ name: 'Lamp', shape: 'cylinder', p: [q[0], 7, q[1]], s: [0.6, 6, 0.6], c: '#7cf', mat: 'neon', collide: false }); });
  // stage 3: stepping discs then a spinning cross
  [[-1.5, 85], [1.5, 90], [-1.5, 95]].forEach(function (q) { P({ name: 'Disc', shape: 'cylinder', p: [q[0], 4, q[1]], s: [4, 1, 4], c: '#b06cff', mat: 'smooth' }); });
  P({ name: 'Spinner', p: [0, 4, 106], s: [16, 1, 3], c: '#ff8a1a', mat: 'smooth', kind: 'spinner', spin: [0, 0.9, 0] });
  P({ name: 'Spinner', p: [0, 4, 106], s: [3, 1, 16], c: '#ff8a1a', mat: 'smooth', kind: 'spinner', spin: [0, 0.9, 0] });
  P({ name: 'Pole', shape: 'cylinder', p: [0, -6.5, 106], s: [2, 20, 2], c: '#555b66', mat: 'metal' });
  // stage 4: bounce pad up to checkpoint 2
  P({ name: 'Landing', p: [0, 4, 121], s: [8, 1, 8], c: '#d9d4c7', mat: 'smooth' });
  P({ name: 'Bounce Pad', p: [0, 4.65, 121], s: [4, 0.3, 4], c: '#ffe14a', mat: 'neon', kind: 'bounce', bounce: 80 });
  P({ name: 'High Platform', p: [0, 13, 132], s: [10, 1, 10], c: '#8a8f98', mat: 'metal' });
  P({ name: 'Checkpoint 2', p: [0, 13.6, 134], s: [5, 0.2, 5], c: '#2ecc71', mat: 'neon', kind: 'checkpoint', cp: 2 });
  // stage 5: moving platform over lava
  P({ name: 'Mover', p: [0, 13, 142], s: [6, 1, 6], c: '#3aa0ff', mat: 'smooth', kind: 'mover', move: { d: [0, 0, 14], t: 3 } });
  P({ name: 'Lava', p: [0, -2, 147], s: [30, 1, 44], c: '#ff5a1a', mat: 'neon', kind: 'kill' });
  P({ name: 'Last Platform', p: [0, 13, 164], s: [12, 1, 10], c: '#d9d4c7', mat: 'smooth' });
  P({ name: 'Pillar', shape: 'cylinder', p: [-5, 5, 164], s: [2, 16, 2], c: '#555b66', mat: 'metal' });
  P({ name: 'Pillar', shape: 'cylinder', p: [5, 5, 164], s: [2, 16, 2], c: '#555b66', mat: 'metal' });
  // stage 6: ramp (wedge rises toward +Z) to the finish
  P({ name: 'Ramp', shape: 'wedge', p: [0, 15.5, 173], s: [6, 4, 8], c: "#c9b28a", mat: 'wood' });
  P({ name: 'Finish Platform', p: [0, 17, 182], s: [12, 1, 10], c: '#f2f2f2', mat: 'smooth' });
  P({ name: 'Finish', p: [0, 17.6, 184], s: [6, 0.2, 6], c: '#ffc933', mat: 'neon', kind: 'finish' });
  P({ name: 'Arch', p: [-5, 21, 180], s: [1, 7, 1], c: '#c0c6d0', mat: 'metal' });
  P({ name: 'Arch', p: [5, 21, 180], s: [1, 7, 1], c: '#c0c6d0', mat: 'metal' });
  P({ name: 'Arch', p: [0, 25, 180], s: [11, 1, 1], c: '#ff4fd8', mat: 'neon' });
  P({ name: 'Gem', shape: 'ball', p: [0, 27, 184], s: [2, 2, 2], c: '#7cf', mat: 'glass', t: 0.3, collide: false, kind: 'spinner', spin: [0, 2, 0] });
  // screen GUI (FORMAT.md "Screen GUI"): a coin counter at the top and a Speed Boost button with a timer bar on the right
  var gui = [
    { id: 'g1', name: 'CoinFrame', type: 'frame', pos: [0.5, 0, 0, 14], anchor: [0.5, 0], size: [0, 190, 0, 52], bg: '#0d1230', bgT: 0.25, corner: 14, stroke: 2, strokeC: '#ffcc33' },
    { id: 'g2', name: 'CoinIcon', type: 'emoji', parent: 'g1', pos: [0, 8, 0.5, 0], anchor: [0, 0.5], size: [0, 44, 0, 44], bgT: 1, text: '🪙', textSize: 32 },
    { id: 'g3', name: 'CoinsLabel', type: 'text', parent: 'g1', pos: [0, 56, 0, 0], size: [1, -62, 1, 0], bgT: 1, text: 'Coins: 0', textColor: '#ffd84a', textSize: 24, font: 'bold', align: 'left' },
    { id: 'g4', name: 'SpeedButton', type: 'button', pos: [1, -20, 0.5, 0], anchor: [1, 0.5], size: [0, 200, 0, 60], bg: '#ff8a1a', text: '⚡ Speed Boost', textSize: 22, font: 'cartoon', corner: 14, stroke: 3, strokeC: '#a64d00' },
    { id: 'g5', name: 'BoostBar', type: 'bar', pos: [1, -20, 0.5, 40], anchor: [1, 0], size: [0, 200, 0, 16], bg: '#0d1230', bgT: 0.2, corner: 8, value: 100, fill: '#ffd84a', visible: false }
  ];
  var GC = function (c) { return { shadow: { type: 'ubx_colour', fields: { COLOR: c } } }; };
  var VB = { VAR: { id: 'vboost' } };
  return {
    v: 1, name: 'Sample Obby', desc: 'A quick tour of Studio parts: kill bricks, a spinner, a bounce pad, a mover, block scripts (coins, a door, a neon sign) and a screen GUI (coin counter, speed boost button).', gui: gui, author: 'Unbloxed', icon: '🧱', sky: 'day', sample: true,
    settings: { walk: 16, jump: 50, gravity: 196, lives: 0, timer: true }, parts: parts,
    scripts: script('GameScript', [
      hat('ubx_start', 30, 30, [B('ubx_stat_set', { V: N(0) }, { STAT: 'Coins' }), B('ubx_message', { TEXT: T('Grab the 3 coins!'), SECS: N(2.5) })]),
      hat('ubx_finish', 30, 250, [B('ubx_if', { COND: { block: B('ubx_compare', { A: { shadow: T('').shadow, block: B('ubx_stat_get', null, { STAT: 'Coins' }) }, B: T('3') }, { OP: '=' }) },
        DO: { block: B('ubx_message', { TEXT: T('All 3 coins! ⭐'), SECS: N(3) }) } })]),
      // Speed Boost button: 5 seconds of fast walking, the bar counts down
      hat('ubx_gui_click', 520, 30, [B('ubx_setplayer', { V: N(40) }, { WHAT: 'walk' }), B('ubx_sound', null, { SND: 'pop' }),
        B('ubx_gui_text', { TEXT: T('⚡ Zoom!') }, { ELEM: 'SpeedButton' }), B('ubx_gui_color', { COLOR: GC('#46d36b') }, { ELEM: 'SpeedButton', WHAT: 'bg' }),
        B('variables_set', { VALUE: T('100') }, VB), B('ubx_gui_bar', { V: N(100) }, { ELEM: 'BoostBar' }), B('ubx_gui_show', null, { ELEM: 'BoostBar' }),
        B('ubx_repeat', { TIMES: N(20), DO: { block: seq([B('ubx_wait', { SECS: N(0.25) }), B('math_change', { DELTA: N(-5) }, VB),
          B('ubx_gui_bar', { V: { shadow: N(0).shadow, block: B('variables_get', null, VB) } }, { ELEM: 'BoostBar' })]) } }),
        B('ubx_setplayer', { V: N(16) }, { WHAT: 'walk' }), B('ubx_gui_hide', null, { ELEM: 'BoostBar' }),
        B('ubx_gui_text', { TEXT: T('⚡ Speed Boost') }, { ELEM: 'SpeedButton' }), B('ubx_gui_color', { COLOR: GC('#ff8a1a') }, { ELEM: 'SpeedButton', WHAT: 'bg' })
      ], { ELEM: 'SpeedButton' })
    ], [{ name: 'boost', id: 'vboost' }])
  };
})()];
