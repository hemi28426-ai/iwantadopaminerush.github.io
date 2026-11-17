// Unbloxed Studio: Scratch-style block definitions for Blockly (vendor/blockly, 'zelos' renderer).
// Loaded lazily by blocks-editor.js after Blockly itself. Play mode never loads this: blocks-runtime.js interprets the
// saved JSON by block type, so every type here must also be handled there.
(function () {
  'use strict';
  var Bk = window.Blockly;
  // Scratch 3 category colours: [primary, secondary, tertiary]
  var COL = {
    events: ['#FFBF00', '#E6AC00', '#CC9900'], motion: ['#4C97FF', '#4280D7', '#3373CC'], looks: ['#9966FF', '#855CD6', '#774DCB'],
    sound: ['#CF63CF', '#C94FC9', '#BD42BD'], control: ['#FFAB19', '#EC9C13', '#CF8B17'], sensing: ['#5CB1D6', '#47A8D1', '#2E8EB8'],
    operators: ['#59C059', '#46B946', '#389438'], variables: ['#FF8C1A', '#FF8000', '#DB6E00'], stats: ['#FF661A', '#FF5500', '#E64D00'],
    gui: ['#0FBD8C', '#0DA57A', '#0B8E69'] // Scratch's teal (pen extension colour) for screen GUI blocks
  };
  var blockStyles = {}, categoryStyles = {};
  Object.keys(COL).forEach(function (k) {
    blockStyles[k + '_blocks'] = { colourPrimary: COL[k][0], colourSecondary: COL[k][1], colourTertiary: COL[k][2] };
    categoryStyles[k + '_category'] = { colour: COL[k][0] };
  });
  blockStyles.events_blocks.hat = 'cap'; blockStyles.gui_blocks.hat = 'cap';
  // Blockly's built-in blocks (variables, math_number) use these style names
  ['math_blocks', 'text_blocks', 'logic_blocks'].forEach(function (s) { blockStyles[s] = blockStyles.operators_blocks; });
  ['variable_blocks', 'variable_dynamic_blocks'].forEach(function (s) { blockStyles[s] = blockStyles.variables_blocks; });
  ['loop_blocks', 'procedure_blocks'].forEach(function (s) { blockStyles[s] = blockStyles.control_blocks; });
  ['colour_blocks', 'list_blocks'].forEach(function (s) { blockStyles[s] = blockStyles.looks_blocks; });
  var theme = Bk.Theme.defineTheme('ubxscratch', {
    base: Bk.Themes.Classic, blockStyles: blockStyles, categoryStyles: categoryStyles, startHats: true,
    componentStyles: { workspaceBackgroundColour: '#F9F9F9', toolboxBackgroundColour: '#FFFFFF', toolboxForegroundColour: '#575E75', flyoutBackgroundColour: '#F2F3F7', flyoutForegroundColour: '#575E75', flyoutOpacity: 1, scrollbarColour: '#CECDCE', scrollbarOpacity: 0.8, insertionMarkerColour: '#000000', insertionMarkerOpacity: 0.2 },
    fontStyle: { family: '"Helvetica Neue", Helvetica, Arial, sans-serif', weight: '500', size: 12 }
  });

  // ---------- colour field (Blockly 11+ moved it to a plugin; this is a small Scratch-like swatch picker) ----------
  var SWATCHES = ['#ff4d4d', '#ff8a1a', '#ffd84a', '#46d36b', '#2ecc71', '#1fb5a8', '#4cc9ff', '#3a7bff', '#7a4dff', '#b06cff', '#ff4fd8', '#ff7aa8',
    '#ffffff', '#d9d9d9', '#a3a2a5', '#6b6b6b', '#333333', '#000000', '#8b5a2b', '#c9a36b', '#7cf2ff', '#b7ff6a', '#ffe9a8', '#ffb3c6'];
  class FieldColourSwatch extends Bk.Field {
    constructor(v) { super(v || '#ff4d4d'); this.SERIALIZABLE = true; this.EDITABLE = true; this.CURSOR = 'default'; }
    static fromJson(o) { return new FieldColourSwatch(o.colour); }
    initView() {
      var c = this.getConstants(); this.size_ = new Bk.utils.Size(c.FIELD_COLOUR_DEFAULT_WIDTH, c.FIELD_COLOUR_DEFAULT_HEIGHT);
      this.createBorderRect_(); this.borderRect_.style.fillOpacity = '1'; this.borderRect_.setAttribute('stroke', '#fff'); this.borderRect_.setAttribute('stroke-width', '2');
    }
    applyColour() { if (this.borderRect_) this.borderRect_.style.fill = this.getValue(); }
    render_() { var c = this.getConstants(); this.size_.width = c.FIELD_COLOUR_DEFAULT_WIDTH; this.size_.height = c.FIELD_COLOUR_DEFAULT_HEIGHT; this.positionBorderRect_(); this.applyColour(); }
    doClassValidation_(v) { return typeof v == 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : null; }
    getText() { return this.getValue(); }
    showEditor_() {
      var self = this, div = Bk.DropDownDiv.getContentDiv(); div.innerHTML = '';
      var g = document.createElement('div'); g.className = 'ubxSwatchGrid';
      SWATCHES.forEach(function (c) {
        var s = document.createElement('div'); s.className = 'ubxSwatch' + (c == self.getValue() ? ' on' : ''); s.style.background = c; s.title = c;
        s.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); self.setValue(c); Bk.DropDownDiv.hideIfOwner(self); });
        g.appendChild(s);
      });
      var row = document.createElement('label'); row.className = 'ubxSwatchMore';
      var inp = document.createElement('input'); inp.type = 'color'; inp.value = this.getValue();
      inp.addEventListener('input', function () { self.setValue(inp.value); });
      row.appendChild(inp); row.appendChild(document.createTextNode(' More colors…'));
      div.appendChild(g); div.appendChild(row);
      Bk.DropDownDiv.setColour('#ffffff', '#dddddd');
      Bk.DropDownDiv.showPositionedByField(this);
    }
  }
  Bk.fieldRegistry.register('ubx_colour', FieldColourSwatch);

  // ---------- GUI element picker: a dropdown of map.gui names (editor's live map) that also keeps any typed name ----------
  // "✏️ Type a name…" asks for a name, so a script can name an element that doesn't exist yet (or was renamed).
  var OTHER = '\u0000other';
  function guiNames(only) {
    var m = window.UBXStudio && window.UBXStudio.map, out = [], seen = {};
    ((m && Array.isArray(m.gui)) ? m.gui : []).forEach(function (g) {
      if (!g || typeof g.name != 'string' || !g.name.trim() || (only && g.type != only) || seen[g.name]) return;
      seen[g.name] = 1; out.push(g.name);
    });
    return out;
  }
  class FieldGuiName extends Bk.FieldDropdown {
    constructor(v, only) { super(function () { return []; }); this.only_ = only || ''; if (v) this.setValue(v); }
    static fromJson(o) { return new FieldGuiName(o.value, o.only); }
    getOptions() {
      var names = guiNames(this.only_), v = this.value_;
      if (typeof v == 'string' && v && names.indexOf(v) < 0) names.unshift(v);
      if (!names.length) names.push(this.only_ == 'button' ? 'Button' : 'TextLabel');
      var o = names.map(function (n) { return [n, n]; }); o.push(['✏️ Type a name…', OTHER]);
      this.generatedOptions = o; return o;
    }
    doClassValidation_(v) {
      if (v === OTHER) { var self = this; setTimeout(function () { Bk.dialog.prompt('GUI element name:', self.getValue() || '', function (t) { t = t && String(t).trim().slice(0, 60); if (t) self.setValue(t); }); }, 0); return null; }
      return typeof v == 'string' && v.trim() ? v.slice(0, 60) : null;
    }
  }
  Bk.fieldRegistry.register('ubx_gui_name', FieldGuiName);

  // ---------- Scratch-like toolbox categories (coloured dot + label) ----------
  class UbxCategory extends Bk.ToolboxCategory {
    addColourBorder_(c) { if (this.rowDiv_) this.rowDiv_.style.setProperty('--cat', c || '#999'); }
    createIconDom_() { var s = document.createElement('span'); s.className = 'ubxCatDot'; return s; }
    setSelected(on) { super.setSelected(on); if (this.rowDiv_) { this.rowDiv_.style.backgroundColor = ''; this.rowDiv_.classList.toggle('ubxCatOn', !!on); } }
  }
  Bk.registry.register(Bk.registry.Type.TOOLBOX_ITEM, Bk.ToolboxCategory.registrationName, UbxCategory, true);

  // ---------- block specs ----------
  // arg tokens: 'P' part input (shadow "this part"), 'N:NAME:default' number input, 'T:NAME:default' text input,
  // 'B:NAME' boolean input, 'C:NAME:#hex' colour input, 'D:NAME:a|b|c' dropdown (label=value unless 'Label=value'),
  // 'F:NAME:default' number field, 'I:NAME:default' text field, 'K:NAME' key dropdown, 'S:NAME' statement input,
  // 'G:NAME:default' GUI element picker ('GB:...' buttons only)
  var AXES = 'Y|X|Z';
  var KEYS = [['space', 'Space'], ['any', 'any'], ['↑ up arrow', 'ArrowUp'], ['↓ down arrow', 'ArrowDown'], ['← left arrow', 'ArrowLeft'], ['→ right arrow', 'ArrowRight']];
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(function (c) { KEYS.push([c.toLowerCase(), 'Key' + c]); });
  '0123456789'.split('').forEach(function (c) { KEYS.push([c, 'Digit' + c]); });
  // [type, kind, style, message, args]  kind: hat | stmt | cap (no next) | num | str | bool | part | colour | c1 (C block) | c2 (if/else)
  var SPECS = [
    ['ubx_start', 'hat', 'events', 'when game starts ▶', []],
    ['ubx_touched', 'hat', 'events', 'when this part is touched', []],
    ['ubx_untouched', 'hat', 'events', 'when player stops touching this part', []],
    ['ubx_key', 'hat', 'events', 'when %1 key pressed', ['K:KEY']],
    ['ubx_every', 'hat', 'events', 'every %1 seconds', ['F:SECS:1']],
    ['ubx_checkpoint', 'hat', 'events', 'when player reaches checkpoint %1', ['F:CP:1']],
    ['ubx_finish', 'hat', 'events', 'when player finishes 🏁', []],
    ['ubx_respawn', 'hat', 'events', 'when player respawns', []],
    ['ubx_receive', 'hat', 'events', 'when I receive %1', ['I:MSG:message1']],
    ['ubx_broadcast', 'stmt', 'events', 'broadcast %1', ['T:MSG:message1']],

    ['ubx_move', 'stmt', 'motion', 'move %1 by x %2 y %3 z %4', ['P', 'N:X:0', 'N:Y:1', 'N:Z:0']],
    ['ubx_move_secs', 'stmt', 'motion', 'move %1 by x %2 y %3 z %4 in %5 secs', ['P', 'N:X:0', 'N:Y:5', 'N:Z:0', 'N:SECS:1']],
    ['ubx_glide', 'stmt', 'motion', 'glide %1 to x %2 y %3 z %4 in %5 secs', ['P', 'N:X:0', 'N:Y:10', 'N:Z:0', 'N:SECS:1']],
    ['ubx_setpos', 'stmt', 'motion', 'set %1 position to x %2 y %3 z %4', ['P', 'N:X:0', 'N:Y:10', 'N:Z:0']],
    ['ubx_turn', 'stmt', 'motion', 'turn %1 %2 degrees around %3', ['P', 'N:DEG:15', 'D:AXIS:' + AXES]],
    ['ubx_spin', 'stmt', 'motion', 'spin %1 forever at %2 degrees/sec around %3', ['P', 'N:SPEED:90', 'D:AXIS:' + AXES]],
    ['ubx_setsize', 'stmt', 'motion', 'set %1 size to x %2 y %3 z %4', ['P', 'N:X:4', 'N:Y:1', 'N:Z:4']],
    ['ubx_pos', 'num', 'motion', '%1 of %2', ['D:WHAT:x position=x|y position=y|z position=z|size x=sx|size y=sy|size z=sz', 'P']],

    ['ubx_color', 'stmt', 'looks', 'set %1 color to %2', ['P', 'C:COLOR:#ff4d4d']],
    ['ubx_material', 'stmt', 'looks', 'set %1 material to %2', ['P', 'D:MAT:neon|plastic|smooth|metal|wood|glass|grass|brick']],
    ['ubx_transp', 'stmt', 'looks', 'set %1 transparency to %2', ['P', 'N:T:0.5']],
    ['ubx_show', 'stmt', 'looks', 'show %1', ['P']],
    ['ubx_hide', 'stmt', 'looks', 'hide %1', ['P']],
    ['ubx_collide', 'stmt', 'looks', 'set %1 can collide %2', ['P', 'D:ON:off=0|on=1']],
    ['ubx_glow', 'stmt', 'looks', 'turn %1 neon glow %2', ['P', 'D:ON:on=1|off=0']],
    ['ubx_message', 'stmt', 'looks', 'show message %1 for %2 secs', ['T:TEXT:Hello!', 'N:SECS:2']],
    ['ubx_toast', 'stmt', 'looks', 'show notification %1', ['T:TEXT:Nice!']],
    ['ubx_hue', 'colour', 'looks', 'color with hue %1', ['N:HUE:0']],
    ['ubx_randcolor', 'colour', 'looks', 'random color', []],
    ['ubx_colour', 'colour', 'looks', '%1', ['FC:COLOR:#ff4d4d']],

    ['ubx_sound', 'stmt', 'sound', 'play sound %1', ['D:SND:coin|beep|jump|pop|oof|win|boom']],

    ['ubx_wait', 'stmt', 'control', 'wait %1 seconds', ['N:SECS:1']],
    ['ubx_repeat', 'c1', 'control', 'repeat %1', ['N:TIMES:10']],
    ['ubx_forever', 'c1cap', 'control', 'forever', []],
    ['ubx_if', 'c1', 'control', 'if %1 then', ['B:COND']],
    ['ubx_ifelse', 'c2', 'control', 'if %1 then', ['B:COND']],
    ['ubx_waituntil', 'stmt', 'control', 'wait until %1', ['B:COND']],
    ['ubx_repeatuntil', 'c1', 'control', 'repeat until %1', ['B:COND']],
    ['ubx_stop', 'cap', 'control', 'stop %1', ['D:WHAT:this script=this|all scripts=all']],

    ['ubx_kill', 'stmt', 'sensing', 'kill player ☠', []],
    ['ubx_tp_part', 'stmt', 'sensing', 'teleport player to %1', ['P']],
    ['ubx_tp_xyz', 'stmt', 'sensing', 'teleport player to x %1 y %2 z %3', ['N:X:0', 'N:Y:10', 'N:Z:0']],
    ['ubx_setplayer', 'stmt', 'sensing', 'set player %1 to %2', ['D:WHAT:walk speed=walk|jump power=jump|gravity=gravity', 'N:V:16']],
    ['ubx_launch', 'stmt', 'sensing', 'launch player up at speed %1', ['N:V:80']],
    ['ubx_touching', 'bool', 'sensing', 'player touching %1 ?', ['P']],
    ['ubx_keydown', 'bool', 'sensing', 'key %1 pressed?', ['K:KEY']],
    ['ubx_distance', 'num', 'sensing', 'distance from %1 to player', ['P']],
    ['ubx_playerpos', 'num', 'sensing', 'player %1', ['D:WHAT:x position=x|y position=y|z position=z']],
    ['ubx_playercp', 'num', 'sensing', "player's checkpoint", []],
    ['ubx_timer', 'num', 'sensing', 'timer', []],
    ['ubx_resettimer', 'stmt', 'sensing', 'reset timer', []],
    ['ubx_part_named', 'part', 'sensing', 'part named %1', ['I:NAME:Door']],
    ['ubx_this_part', 'part', 'sensing', 'this part', []],

    ['ubx_arith', 'num', 'operators', '%1 %2 %3', ['N:A:', 'D:OP:+|-|*|/', 'N:B:']],
    ['ubx_random', 'num', 'operators', 'pick random %1 to %2', ['N:A:1', 'N:B:10']],
    ['ubx_compare', 'bool', 'operators', '%1 %2 %3', ['T:A:', 'D:OP:<|=|>', 'T:B:50']],
    ['ubx_and', 'bool', 'operators', '%1 and %2', ['B:A', 'B:B']],
    ['ubx_or', 'bool', 'operators', '%1 or %2', ['B:A', 'B:B']],
    ['ubx_not', 'bool', 'operators', 'not %1', ['B:A']],
    ['ubx_join', 'str', 'operators', 'join %1 %2', ['T:A:apple ', 'T:B:banana']],
    ['ubx_mod', 'num', 'operators', '%1 mod %2', ['N:A:', 'N:B:']],
    ['ubx_round', 'num', 'operators', 'round %1', ['N:A:']],
    ['ubx_mathop', 'num', 'operators', '%1 of %2', ['D:OP:abs|floor|ceiling|sqrt|sin|cos|tan', 'N:A:']],
    ['ubx_text', 'str', 'operators', '%1', ['I:TEXT:']],

    ['ubx_stat_set', 'stmt', 'stats', 'set leaderstat %1 to %2', ['I:STAT:Coins', 'N:V:0']],
    ['ubx_stat_change', 'stmt', 'stats', 'change leaderstat %1 by %2', ['I:STAT:Coins', 'N:V:1']],
    ['ubx_stat_get', 'num', 'stats', 'leaderstat %1', ['I:STAT:Coins']],

    ['ubx_gui_click', 'hat', 'gui', 'when %1 clicked', ['GB:ELEM:Button']],
    ['ubx_gui_text', 'stmt', 'gui', 'set text of %1 to %2', ['G:ELEM:TextLabel', 'T:TEXT:Hello!']],
    ['ubx_gui_show', 'stmt', 'gui', 'show %1', ['G:ELEM:Frame']],
    ['ubx_gui_hide', 'stmt', 'gui', 'hide %1', ['G:ELEM:Frame']],
    ['ubx_gui_color', 'stmt', 'gui', 'set %1 %2 color to %3', ['G:ELEM:Frame', 'D:WHAT:background=bg|text=text|bar fill=fill', 'C:COLOR:#46d36b']],
    ['ubx_gui_bar', 'stmt', 'gui', 'set bar %1 to %2 %', ['G:ELEM:Bar', 'N:V:50']],
    ['ubx_gui_gettext', 'str', 'gui', 'text of %1', ['G:ELEM:TextLabel']]
  ];
  var CHECK = { num: null, str: null, bool: 'Boolean', part: 'Part', colour: 'Colour' };
  function dd(list) { return list.split('|').map(function (o) { var i = o.indexOf('='); return i > 0 ? [o.slice(0, i), o.slice(i + 1)] : [o, o]; }); }
  function argDef(tok) {
    var t = tok.split(':'), k = t[0], name = t[1];
    if (k == 'P') return { type: 'input_value', name: 'PART', check: 'Part' };
    if (k == 'N' || k == 'T') return { type: 'input_value', name: name };
    if (k == 'C') return { type: 'input_value', name: name };
    if (k == 'B') return { type: 'input_value', name: name, check: 'Boolean' };
    if (k == 'D') return { type: 'field_dropdown', name: name, options: dd(t.slice(2).join(':')) };
    if (k == 'K') return { type: 'field_dropdown', name: name, options: KEYS };
    if (k == 'F') return { type: 'field_number', name: name, value: +t[2] || 0, min: 0 };
    if (k == 'I') return { type: 'field_input', name: name, text: t.slice(2).join(':') };
    if (k == 'FC') return { type: 'ubx_colour', name: name, colour: t[2] };
    if (k == 'G' || k == 'GB') return { type: 'ubx_gui_name', name: name, value: t.slice(2).join(':'), only: k == 'GB' ? 'button' : '' };
  }
  // shadow for the toolbox / default inputs
  function shadowOf(tok) {
    var t = tok.split(':'), k = t[0];
    if (k == 'P') return { shadow: { type: 'ubx_this_part' } };
    if (k == 'N') return { shadow: { type: 'math_number', fields: { NUM: t[2] === '' ? '' : +t[2] } } };
    if (k == 'T') return { shadow: { type: 'ubx_text', fields: { TEXT: t.slice(2).join(':') } } };
    if (k == 'C') return { shadow: { type: 'ubx_colour', fields: { COLOR: t[2] } } };
    return null;
  }
  var defs = [], TB = {};
  SPECS.forEach(function (s) {
    var type = s[0], kind = s[1], d = { type: type, message0: s[3], args0: s[4].map(argDef), style: s[2] + '_blocks', inputsInline: true, tooltip: '' };
    if (kind == 'stmt' || kind == 'c1' || kind == 'c2') { d.previousStatement = null; d.nextStatement = null; }
    if (kind == 'cap' || kind == 'c1cap') d.previousStatement = null;
    if (kind == 'hat') d.nextStatement = null;
    if (CHECK.hasOwnProperty(kind)) d.output = CHECK[kind];
    if (kind[0] == 'c' && kind != 'colour' && kind != 'cap') { d.message1 = '%1'; d.args1 = [{ type: 'input_statement', name: 'DO' }]; }
    if (kind == 'c2') { d.message2 = 'else'; d.message3 = '%1'; d.args3 = [{ type: 'input_statement', name: 'ELSE' }]; }
    if (type == 'ubx_this_part' || type == 'ubx_colour' || type == 'ubx_text') d.tooltip = '';
    defs.push(d);
    var tb = { kind: 'block', type: type }, inputs = {};
    s[4].forEach(function (tok) { var sh = shadowOf(tok); if (sh) inputs[tok == 'P' ? 'PART' : tok.split(':')[1]] = sh; });
    if (Object.keys(inputs).length) tb.inputs = inputs;
    TB[type] = tb;
  });
  Bk.common.defineBlocksWithJsonArray(defs);
  // number/text shadows in reporter math slots stay empty-able like Scratch
  function blocks(list) { return list.map(function (t) { return typeof t == 'string' ? JSON.parse(JSON.stringify(TB[t])) : t; }); }
  function label(t) { return { kind: 'label', text: t }; }
  var named = { kind: 'block', type: 'ubx_part_named', fields: { NAME: 'Door' } };
  var toolbox = {
    kind: 'categoryToolbox',
    contents: [
      { kind: 'category', name: 'Events', categorystyle: 'events_category', contents: blocks(['ubx_start', 'ubx_touched', 'ubx_untouched', 'ubx_key', 'ubx_every', 'ubx_checkpoint', 'ubx_finish', 'ubx_respawn', 'ubx_receive', 'ubx_broadcast']) },
      { kind: 'category', name: 'Motion', categorystyle: 'motion_category', contents: [label('Use "part named" to move another part')].concat(blocks([named, 'ubx_move', 'ubx_move_secs', 'ubx_glide', 'ubx_setpos', 'ubx_turn', 'ubx_spin', 'ubx_setsize', 'ubx_pos'])) },
      { kind: 'category', name: 'Looks', categorystyle: 'looks_category', contents: blocks(['ubx_color', 'ubx_material', 'ubx_transp', 'ubx_show', 'ubx_hide', 'ubx_collide', 'ubx_glow', 'ubx_message', 'ubx_toast', 'ubx_hue', 'ubx_randcolor']) },
      { kind: 'category', name: 'Sound', categorystyle: 'sound_category', contents: blocks(['ubx_sound']) },
      { kind: 'category', name: 'Control', categorystyle: 'control_category', contents: blocks(['ubx_wait', 'ubx_repeat', 'ubx_forever', 'ubx_if', 'ubx_ifelse', 'ubx_waituntil', 'ubx_repeatuntil', 'ubx_stop']) },
      { kind: 'category', name: 'Player', categorystyle: 'sensing_category', contents: blocks(['ubx_kill', 'ubx_tp_part', 'ubx_tp_xyz', 'ubx_setplayer', 'ubx_launch', 'ubx_touching', 'ubx_keydown', 'ubx_distance', 'ubx_playerpos', 'ubx_playercp', 'ubx_timer', 'ubx_resettimer', named, 'ubx_this_part']) },
      { kind: 'category', name: 'Operators', categorystyle: 'operators_category', contents: blocks(['ubx_arith', 'ubx_random', 'ubx_compare', 'ubx_and', 'ubx_or', 'ubx_not', 'ubx_join', 'ubx_mod', 'ubx_round', 'ubx_mathop']) },
      { kind: 'category', name: 'Variables', categorystyle: 'variables_category', custom: 'UBXVARS' },
      { kind: 'category', name: 'Leaderstats', categorystyle: 'stats_category', contents: blocks(['ubx_stat_set', 'ubx_stat_change', 'ubx_stat_get']) },
      { kind: 'category', name: 'GUI', categorystyle: 'gui_category', custom: 'UBXGUI' } // filled by blocks-editor.js from map.gui
    ]
  };
  // Scratch wording for Blockly's own variable blocks
  Bk.Msg.VARIABLES_SET = 'set %1 to %2'; Bk.Msg.MATH_CHANGE_TITLE = 'change %1 by %2'; Bk.Msg.NEW_VARIABLE = 'Make a Variable';
  // a toolbox block (with its default shadows) of the given type, fields overridden: for dynamic categories
  function tbBlock(type, fields) { var b = JSON.parse(JSON.stringify(TB[type])); if (fields) b.fields = Object.assign({}, b.fields || {}, fields); return b; }
  window.UBXBlockDefs = { theme: theme, toolbox: toolbox, COL: COL, KEYS: KEYS, block: tbBlock, guiNames: guiNames };
})();
