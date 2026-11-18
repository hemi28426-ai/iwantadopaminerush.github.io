// Unbloxed Studio: "Tools" block category (holdable tools / weapons). Loaded by studio.html BEFORE blocks-editor.js, so it
// can add itself to window.UBX_BLOCK_EXT, which blocks-defs.js reads once Blockly has loaded. Every block here is run by
// studio/tools.js (play mode). The tool picker lists the game's tools (map.tools) and keeps any typed name.
(function () {
  'use strict';
  var COL = ['#5B6EE1', '#4A5CCB', '#3D4EB3']; // indigo: not used by any other category
  function toolNames() {
    var m = window.UBXStudio && window.UBXStudio.map, out = [];
    ((m && Array.isArray(m.tools)) ? m.tools : []).forEach(function (t) { if (t && typeof t.name == 'string' && t.name.trim() && out.indexOf(t.name) < 0) out.push(t.name); });
    return out;
  }
  var defined = false;
  // called by blocks-defs.js (through the specs getter) after Blockly loaded: register the picker + define the blocks
  function define() {
    if (defined) return; defined = true;
    var Bk = window.Blockly, OTHER = '\u0000other';
    class FieldToolName extends Bk.FieldDropdown {
      constructor(v, any) { super(function () { return []; }); this.any_ = any || ''; this.setValue(v || toolNames()[0] || (any ? 'any' : 'Sword')); }
      static fromJson(o) { return new FieldToolName(o.value, o.any); }
      getOptions() {
        var names = toolNames(), v = this.value_, o;
        if (typeof v == 'string' && v && v != 'any' && names.indexOf(v) < 0) names.unshift(v);
        o = names.map(function (n) { return [n, n]; });
        if (this.any_) o.push([this.any_, 'any']);
        if (!o.length) o.push(['Sword', 'Sword']);
        o.push(['✏️ Type a name…', OTHER]);
        this.generatedOptions = o; return o;
      }
      doClassValidation_(v) {
        if (v === OTHER) { var self = this; setTimeout(function () { Bk.dialog.prompt('Tool name:', self.getValue() == 'any' ? '' : self.getValue(), function (t) { t = t && String(t).trim().slice(0, 40); if (t) self.setValue(t); }); }, 0); return null; }
        return typeof v == 'string' && v.trim() ? v.slice(0, 40) : null;
      }
    }
    Bk.fieldRegistry.register('ubx_tool_name', FieldToolName);
    var tool = function (any) { return { type: 'ubx_tool_name', name: 'TOOL', value: '', any: any || '' }; };
    var nIn = function (n) { return { type: 'input_value', name: n }; };
    var D = function (name, list) { return { type: 'field_dropdown', name: name, options: list }; };
    var st = 'tools_blocks';
    var hat = function (type, msg, any) { return { type: type, message0: msg, args0: [tool(any)], style: st, nextStatement: null, inputsInline: true, tooltip: '' }; };
    var stmt = function (type, msg, args) { return { type: type, message0: msg, args0: args, style: st, previousStatement: null, nextStatement: null, inputsInline: true, tooltip: '' }; };
    Bk.common.defineBlocksWithJsonArray([
      hat('ubx_tool_activated', 'when %1 is clicked (activated) 🖱️', 'any tool'),
      hat('ubx_tool_equipped', 'when %1 is equipped', 'any tool'),
      hat('ubx_tool_unequipped', 'when %1 is unequipped', 'any tool'),
      hat('ubx_tool_ko', 'when %1 knocks someone out 💥', 'any tool'),
      stmt('ubx_tool_give', 'give the player %1 🎒', [tool('all tools')]),
      stmt('ubx_tool_remove', 'take %1 away from the player', [tool('all tools')]),
      stmt('ubx_tool_equip', 'make the player hold %1', [tool()]),
      stmt('ubx_tool_unequip', 'put the tool away', []),
      stmt('ubx_tool_swing', 'swing the tool, damage %1', [nIn('DMG')]),
      stmt('ubx_tool_shoot', 'shoot %1 speed %2 damage %3 color %4', [D('STYLE', [['a bullet', 'bullet'], ['a ball (falls)', 'ball'], ['a rocket (explodes)', 'rocket'], ['a laser', 'laser']]), nIn('SPEED'), nIn('DMG'), nIn('COLOR')]),
      stmt('ubx_tool_touchdmg', '%1 deals %2 damage when it touches someone', [tool(), nIn('DMG')]),
      stmt('ubx_tool_cooldown', 'set %1 cooldown to %2 secs', [tool(), nIn('SECS')]),
      stmt('ubx_tool_action', 'set %1 click action to %2', [tool(), D('ACT', [['nothing (scripts only)', 'none'], ['sword swing', 'sword'], ['gun', 'gun']])]),
      { type: 'ubx_tool_has', message0: 'player has %1?', args0: [tool('any tool')], style: st, output: 'Boolean', inputsInline: true, tooltip: '' },
      { type: 'ubx_tool_held', message0: 'tool the player is holding', args0: [], style: st, output: null, inputsInline: true, tooltip: '' }
    ]);
  }
  var num = function (v) { return { shadow: { type: 'math_number', fields: { NUM: v } } }; };
  var b = function (type, inputs, fields) { var o = { kind: 'block', type: type }; if (inputs) o.inputs = inputs; if (fields) o.fields = fields; return o; };
  (window.UBX_BLOCK_EXT = window.UBX_BLOCK_EXT || []).push({
    col: { tools: COL },
    get specs() { try { define(); } catch (e) { console.warn('Tools blocks:', e); } return []; }, // defined above (they need the tool picker field)
    category: { name: 'Tools', style: 'tools', blocks: [
      { kind: 'label', text: 'Make a tool: select a model, then 🗡️ Make Tool in the ribbon' },
      b('ubx_tool_activated'), b('ubx_tool_equipped'), b('ubx_tool_unequipped'), b('ubx_tool_ko'),
      { kind: 'label', text: 'Backpack' },
      b('ubx_tool_give'), b('ubx_tool_remove'), b('ubx_tool_equip'), b('ubx_tool_unequip'), b('ubx_tool_has'), b('ubx_tool_held'),
      { kind: 'label', text: 'Weapons: use these under "when … is clicked"' },
      b('ubx_tool_swing', { DMG: num(20) }),
      b('ubx_tool_shoot', { SPEED: num(120), DMG: num(15), COLOR: { shadow: { type: 'ubx_colour', fields: { COLOR: '#ffd84a' } } } }),
      b('ubx_tool_touchdmg', { DMG: num(10) }),
      b('ubx_tool_cooldown', { SECS: num(0.5) }),
      b('ubx_tool_action')
    ] }
  });
  window.UBXToolDefs = { names: toolNames };
})();
