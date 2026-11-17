// Unbloxed Studio remix schemas (window.UBX_REMIX_SCHEMAS) + the shared rule validator (window.UBX_REMIX_VALIDATE).
// Loaded by the Studio editor (studio/remix.js) AND by the standalone games themselves (trench-war.html, trench-war-world.html)
// so both sides validate the same way. Contract: studio/FORMAT.md "Remix".
// Each schema: { name, icon, desc, kind: 'standalone' | 'unbloxed', file (standalone: page relative to unbloxed/studio/),
//   groups: [{ name, items: [{ key, label, type: 'number'|'bool'|'choice'|'text', min, max, step, def, options, hint, set }] }] }
// `def` values are the games' current built-in values (tests compare them with the live game tables).
// Unbloxed-game items with `set` ('settings.walk', 'sky') are written straight into the Studio map by the editor.
(function () {
  'use strict';
  var S = {};
  function N(key, label, def, min, max, step, hint) { return { key: key, label: label, type: 'number', def: def, min: min, max: max, step: step || 1, hint: hint || '' }; }
  function B(key, label, def, hint) { return { key: key, label: label, type: 'bool', def: def, hint: hint || '' }; }
  function C(key, label, def, options, hint) { return { key: key, label: label, type: 'choice', def: def, options: options, hint: hint || '' }; }
  function T(key, label, def, hint) { return { key: key, label: label, type: 'text', def: def, hint: hint || '' }; }

  // ---------- Trench War (html-main/trench-war.html) ----------
  // copy of the GUNS table's tunable fields (n = display name only)
  var TW_GUNS = {"knife":{"n":"Trench Knife","cost":0,"dmg":40,"rew":1500,"spd":1,"pen":0.85},"service":{"n":"Service Pistol","cost":200,"dmg":30,"rpm":350,"mag":12,"res":36,"rel":2.2,"spr":0.004,"mov":0.025,"kick":0.014,"hs":4,"pen":0.5,"rew":300,"spd":1},"machpist":{"n":"Machine Pistol","cost":500,"dmg":21,"rpm":750,"auto":1,"mag":20,"res":80,"rel":2.3,"spr":0.012,"mov":0.03,"kick":0.01,"hs":3.5,"pen":0.5,"rew":300,"spd":1},"revolver":{"n":"Heavy Revolver","cost":700,"dmg":62,"rpm":130,"mag":6,"res":30,"rel":2.4,"spr":0.004,"mov":0.06,"kick":0.07,"hs":3,"pen":0.9,"rew":300,"spd":1},"grease":{"n":"Grease Gun","cost":1050,"dmg":29,"rpm":600,"auto":1,"mag":32,"res":120,"rel":2.6,"spr":0.009,"mov":0.03,"kick":0.009,"hs":3.5,"pen":0.6,"rew":600,"spd":0.96},"smg":{"n":"Trench SMG","cost":1250,"dmg":26,"rpm":800,"auto":1,"mag":30,"res":120,"rel":2.1,"spr":0.008,"mov":0.025,"kick":0.008,"hs":3.5,"pen":0.6,"rew":600,"spd":0.97},"pump":{"n":"Pump Shotgun","cost":1100,"dmg":24,"pel":9,"rpm":68,"mag":7,"res":32,"rel":3,"spr":0.06,"mov":0.07,"kick":0.1,"hs":3,"pen":0.5,"rew":900,"spd":0.92},"auto12":{"n":"Auto Shotgun","cost":2000,"dmg":18,"pel":8,"rpm":240,"mag":8,"res":32,"rel":3.2,"spr":0.07,"mov":0.07,"kick":0.06,"hs":3,"pen":0.6,"rew":900,"spd":0.9},"lmg":{"n":"Lewis LMG","cost":5200,"dmg":32,"rpm":600,"auto":1,"mag":100,"res":200,"rel":5.7,"spr":0.008,"mov":0.15,"kick":0.016,"hs":4,"pen":0.75,"rew":300,"spd":0.78},"carbine":{"n":"Field Carbine","cost":2050,"dmg":30,"rpm":666,"auto":1,"mag":35,"res":90,"rel":3,"spr":0.005,"mov":0.1,"kick":0.016,"hs":4,"pen":0.77,"rew":300,"spd":0.9},"ak":{"n":"Mk.2 Assault Rifle","cost":2700,"dmg":36,"rpm":600,"auto":1,"mag":30,"res":90,"rel":2.5,"spr":0.004,"mov":0.12,"kick":0.022,"hs":4,"pen":0.78,"rew":300,"spd":0.86},"m4":{"n":"Storm Rifle","cost":3100,"dmg":33,"rpm":666,"auto":1,"mag":25,"res":75,"rel":3.1,"spr":0.003,"mov":0.1,"kick":0.017,"hs":4,"pen":0.7,"rew":300,"spd":0.88},"scout":{"n":"Bolt Rifle","cost":1700,"dmg":88,"rpm":48,"mag":10,"res":90,"rel":3.7,"spr":0.002,"uns":0.05,"mov":0.1,"kick":0.05,"hs":2.5,"pen":0.85,"rew":300,"spd":1,"scope":3},"awp":{"n":"Elephant Gun","cost":4750,"dmg":115,"rpm":41,"mag":5,"res":30,"rel":3.7,"spr":0.001,"uns":0.12,"mov":0.2,"kick":0.1,"hs":4,"pen":0.97,"rew":100,"spd":0.84,"scope":4.5},"he":{"n":"HE Grenade","pen":0.6,"rew":300}};
  // field -> [label, min, max, step, hint]
  var GF = {
    cost: ['Price $', 0, 20000, 50], dmg: ['Damage', 1, 1000, 1, 'per bullet / pellet'], pel: ['Pellets per shot', 1, 30, 1], rpm: ['Fire rate (rounds/min)', 10, 2000, 1],
    auto: ['Full auto', 0, 0, 0], mag: ['Magazine', 1, 500, 1], res: ['Reserve ammo', 0, 2000, 1], rel: ['Reload time (s)', 0.1, 15, 0.1],
    spr: ['Spread (standing)', 0, 0.3, 0.001], uns: ['Spread unscoped', 0, 0.5, 0.005], mov: ['Spread while moving', 0, 0.5, 0.005], kick: ['Recoil kick', 0, 0.5, 0.001],
    hs: ['Headshot multiplier', 1, 10, 0.1], pen: ['Armor penetration (0-1)', 0, 1, 0.01], rew: ['Kill reward $', 0, 10000, 50], spd: ['Move speed while held', 0.3, 2, 0.01],
    scope: ['Scope zoom', 1, 10, 0.1], zoom: ['Aim zoom', 1, 10, 0.1], slow: ['Move speed while held', 0.3, 2, 0.01]
  };
  function gunGroups(table, prefix, order) {
    return Object.keys(table).map(function (id) {
      var g = table[id], items = [];
      (order || Object.keys(GF)).forEach(function (f) {
        if (!(f in g)) return; var m = GF[f];
        items.push(f == 'auto' ? B(prefix + id + '.' + f, m[0], !!g[f]) : N(prefix + id + '.' + f, m[0], g[f], m[1], m[2], m[3], m[4]));
      });
      return { name: '🔫 ' + g.n, items: items };
    });
  }
  var BOTN0 = 'Higgs, Barnes, Moss, Hale, Reed, Shaw, Ames, Bryce', BOTN1 = 'Klein, Weber, Dorn, Vogel, Lang, Brandt, Roth, Adler';
  S['trench-war'] = {
    name: 'Trench War', icon: '🪖', kind: 'standalone', file: '../trench-war.html', hub: 'trench-war.html',
    desc: 'Team shooter in the trenches: bomb defusal rounds, Classic team deathmatch and Free For All with killstreaks.',
    groups: [
      { name: '🎮 Match', items: [
        C('MODE', 'Default mode', 'bomb', [['bomb', 'Bomb Defusal · rounds'], ['classic', 'Classic · team deathmatch'], ['ffa', 'Free For All · killstreaks']]),
        N('BUYT', 'Buy time (s)', 15, 1, 120), N('ROUNDT', 'Round time (s)', 135, 10, 900), N('BOMBT', 'Bomb timer (s)', 40, 5, 300),
        N('ENDT', 'Round end pause (s)', 6, 1, 30), N('HALF', 'Rounds before halftime (sides swap)', 6, 1, 30), N('WINR', 'Rounds to win', 7, 1, 30),
        N('BUYWIN', 'Buy window after round start (s)', 20, 0, 300), N('PLANT', 'Plant time (s)', 3.2, 0.2, 30, 0.1), N('DEFUSE', 'Defuse time (s)', 10, 0.5, 60, 0.5), N('DEFKIT', 'Defuse time with kit (s)', 5, 0.5, 60, 0.5),
        N('CLASSIC_WIN', 'Classic: kills to win', 50, 1, 1000), N('FFA_WIN', 'Free For All: kills to win', 60, 1, 1000)] },
      { name: '💰 Money', items: [
        N('START$', 'Start money $', 800, 0, 100000, 50), N('MAX$', 'Max money $', 16000, 100, 1000000, 100),
        N('WIN_ELIM$', 'Round win (eliminated) $', 3250, 0, 100000, 50), N('WIN_OBJ$', 'Round win (bomb/defuse/time) $', 3500, 0, 100000, 50),
        N('LOSS$', 'Loss bonus $', 1400, 0, 100000, 50), N('LOSS_STEP$', 'Loss bonus per lost round $', 500, 0, 100000, 50), N('LOSS_MAX$', 'Max loss bonus $', 3400, 0, 100000, 50),
        N('PLANT$', 'Plant / defuse reward $', 300, 0, 100000, 50), N('PLANTED$', 'Losing attackers who planted $', 800, 0, 100000, 50), N('TK$', 'Team kill penalty $', 300, 0, 100000, 50)] },
      { name: '🧍 Player', items: [
        N('HP', 'Health', 100, 1, 10000), N('ARMOR', 'Armor from a vest', 100, 1, 10000),
        N('SPEED', 'Run speed', 5.2, 0.5, 30, 0.1), N('JUMP', 'Jump power', 7.6, 0, 40, 0.1), N('GRAV', 'Gravity', 22, 1, 100, 0.5), N('CROUCH', 'Crouch speed (x run)', 0.4, 0, 2, 0.05),
        N('ADS', 'Aim-down-sights speed (x run)', 0.55, 0, 2, 0.05), N('HE_DMG', 'HE grenade damage', 98, 0, 2000), N('HE_RAD', 'HE grenade radius', 9, 1, 60, 0.5),
        N('BOMB_DMG', 'Bomb blast damage', 520, 0, 10000, 10), N('BOMB_RAD', 'Bomb blast radius', 28, 1, 150)] },
      { name: '🛒 Gear & grenades', items: [
        N('GEAR.vest.cost', 'Kevlar Vest price $', 650, 0, 20000, 50), N('GEAR.helm.cost', 'Vest + Helmet price $', 1000, 0, 20000, 50), N('GEAR.kit.cost', 'Defuse Kit price $', 400, 0, 20000, 50),
        N('NADES.he.cost', 'HE Grenade price $', 300, 0, 20000, 50), N('NADES.he.max', 'HE Grenades you can carry', 1, 0, 20),
        N('NADES.flash.cost', 'Flashbang price $', 200, 0, 20000, 50), N('NADES.flash.max', 'Flashbangs you can carry', 2, 0, 20),
        N('NADES.smoke.cost', 'Smoke price $', 300, 0, 20000, 50), N('NADES.smoke.max', 'Smokes you can carry', 1, 0, 20)] },
      { name: '☢️ Killstreaks (Free For All)', items: [
        B('KS_ON', 'Killstreaks on', true), N('KS.turret.at', 'Turret at kills', 20, 1, 1000), N('KS.shield.at', 'Shield at kills', 35, 1, 1000), N('KS.nuke.at', 'NUKE at kills', 50, 1, 1000),
        N('TURRET_T', 'Turret lasts (s)', 60, 1, 600), N('TURRET_DMG', 'Turret damage per hit', 15, 0, 500), N('SHIELD_T', 'Shield lasts (s)', 60, 1, 600)] },
      { name: '🤖 Bots', items: [
        N('BOTS', 'Bots per team', 5, 0, 16, 1, 'the menu box starts at this'), N('BOT_REACT', 'Reaction time (s)', 0.35, 0, 5, 0.05, 'plus up to the same again at random'),
        N('BOT_AIM', 'Aim error', 0.012, 0, 0.2, 0.001, 'grows with distance'), N('BOT_AIMDIST', 'Aim error per metre', 0.0009, 0, 0.02, 0.0001),
        N('BOT_THINK', 'Think every (s)', 0.3, 0.05, 5, 0.05, 'how often bots look for targets'), N('BOT_SIGHT', 'Sight range (m)', 65, 5, 300),
        N('BOT_FIRE', 'Shot delay (x)', 1, 0.1, 10, 0.05, 'bigger = slower trigger finger'), N('BOT_DMG', 'Bot damage (x)', 1, 0, 10, 0.05), N('BOT_SPEED', 'Bot run speed', 5.2, 0.5, 30, 0.1),
        T('BOTN.0', 'Allies bot names', BOTN0, 'comma separated'), T('BOTN.1', 'Central bot names', BOTN1, 'comma separated')] }
    ].concat(gunGroups(TW_GUNS, 'GUNS.'))
  };

  // ---------- Trench War: World (html-main/trench-war-world.html) ----------
  var TWW_GUNS = {"rifle":{"n":"Bolt Rifle","cost":0,"dmg":70,"rpm":55,"auto":0,"mag":5,"rel":2.2,"spr":0.004,"pel":1,"zoom":1.6,"kick":0.05},"pistol":{"n":"Trench Pistol","cost":150,"dmg":34,"rpm":260,"auto":0,"mag":8,"rel":1.3,"spr":0.012,"pel":1,"zoom":1.3,"kick":0.025},"smg":{"n":"Trench SMG","cost":300,"dmg":21,"rpm":620,"auto":1,"mag":32,"rel":2,"spr":0.03,"pel":1,"zoom":1.3,"kick":0.012},"shotgun":{"n":"Trench Shotgun","cost":450,"dmg":13,"rpm":75,"auto":0,"mag":6,"rel":2.6,"spr":0.075,"pel":9,"zoom":1.2,"kick":0.09},"lmg":{"n":"Lewis LMG","cost":750,"dmg":30,"rpm":520,"auto":1,"mag":47,"rel":3.4,"spr":0.024,"pel":1,"zoom":1.4,"kick":0.016,"slow":0.8},"sniper":{"n":"Scoped Rifle","cost":1000,"dmg":130,"rpm":40,"auto":0,"mag":5,"rel":2.6,"spr":0.001,"pel":1,"zoom":5,"kick":0.08}};
  S['trench-war-world'] = {
    name: 'Trench War: World', icon: '🌍', kind: 'standalone', file: '../trench-war-world.html', hub: 'trench-war-world.html',
    desc: 'One big persistent front: two nations push sector by sector toward the enemy capital.',
    groups: [
      { name: '🧍 Player', items: [
        N('HP', 'Health', 100, 1, 10000), N('WALK', 'Walk speed', 4.6, 0.5, 30, 0.1), N('SPRINT', 'Sprint speed', 7.8, 0.5, 40, 0.1), N('JUMP', 'Jump power', 8.4, 0, 40, 0.1),
        N('GRAV', 'Gravity', 22, 1, 100, 0.5), N('HS', 'Headshot multiplier', 2, 1, 10, 0.1), N('NADES', 'Grenades on deploy', 2, 0, 50), N('NADE_DMG', 'Grenade damage', 120, 0, 2000), N('NADE_RAD', 'Grenade radius', 8, 1, 60, 0.5),
        N('RESPAWN', 'Redeploy wait (s)', 4, 0, 60, 0.5)] },
      { name: '💰 Cash (remix runs never touch your saved cash)', items: [
        N('START$', 'Start cash $', 0, 0, 1000000, 50, 'remix only: replaces your saved cash while you play the remix'), B('UNLOCK', 'All guns unlocked', false),
        N('KILL$', 'Kill reward $', 100, 0, 100000, 10), N('HS$', 'Headshot bonus $', 50, 0, 100000, 10), N('CAP$', 'Capture reward $', 300, 0, 100000, 10), N('WARWIN$', 'War win reward $', 1000, 0, 1000000, 50)] },
      { name: '⚑ War', items: [
        N('CAPT', 'Capture time (s, 1 attacker)', 45, 1, 600), N('LOSET', 'Capture decay time (s)', 25, 1, 600), N('ART_MIN', 'Artillery: seconds between shells', 6, 0.5, 120, 0.5), N('ART_RND', 'Artillery: extra random seconds', 5, 0, 120, 0.5),
        N('ART_DMG', 'Artillery damage', 140, 0, 2000), N('ART_RAD', 'Artillery radius', 10, 1, 60, 0.5), N('BOMBT', 'Sabotage bomb timer (s)', 12, 1, 300)] },
      { name: '🤖 Bots', items: [
        N('BOTS', 'Bots per team', 7, 0, 16), N('BOT_THINK', 'Think every (s)', 0.4, 0.05, 5, 0.05), N('BOT_AIM', 'Aim error', 0.025, 0, 0.2, 0.001), N('BOT_AIMDIST', 'Aim error per metre', 0.0012, 0, 0.02, 0.0001),
        N('BOT_DMG', 'Bot damage (x)', 0.7, 0, 10, 0.05), N('BOT_SIGHT', 'Sight range (m)', 80, 5, 300), N('BOT_SPEED', 'Bot run speed', 4.3, 0.5, 30, 0.1), N('BOT_RESPAWN', 'Bot respawn (s)', 5, 0, 60, 0.5),
        T('BOTN.0', 'Aldor bot names', 'Pvt. Higgs, Cpl. Barnes, Sgt. Moss, Pvt. Hale, Pvt. Reed, Cpl. Shaw, Pvt. Ames, Lt. Bryce, Pvt. Cole, Pvt. Finch', 'comma separated'),
        T('BOTN.1', 'Varsk bot names', 'Pvt. Klein, Pvt. Weber, Cpl. Dorn, Sgt. Vogel, Pvt. Lang, Pvt. Brandt, Cpl. Roth, Lt. Adler, Pvt. Kurz, Pvt. Sauer', 'comma separated')] }
    ].concat(gunGroups(TWW_GUNS, 'GUNS.', ['cost', 'dmg', 'pel', 'rpm', 'auto', 'mag', 'rel', 'spr', 'kick', 'zoom', 'slow']))
  };

  // ---------- Unbloxed games (the map is loaded into Studio; rules map onto the Studio map's settings) ----------
  function moveGroup(walk, jump) {
    return { name: '🏃 Movement', items: [
      { key: 'walk', label: 'Walk speed', type: 'number', def: walk, min: 0, max: 200, step: 1, set: 'settings.walk', hint: '16 = normal Unbloxed walk' },
      { key: 'jump', label: 'Jump power', type: 'number', def: jump, min: 0, max: 300, step: 1, set: 'settings.jump', hint: '50 ≈ 5.4 studs' },
      { key: 'gravity', label: 'Gravity', type: 'number', def: 196, min: 10, max: 1000, step: 1, set: 'settings.gravity', hint: '196 = Roblox default' }] };
  }
  function gameGroup(sky, lives) {
    return { name: '🎮 Game', items: [
      { key: 'lives', label: 'Lives (0 = unlimited)', type: 'number', def: lives || 0, min: 0, max: 99, step: 1, set: 'settings.lives' },
      { key: 'timer', label: 'Show run timer', type: 'bool', def: true, set: 'settings.timer' },
      { key: 'sky', label: 'Sky', type: 'choice', def: sky, options: [['day', 'Day'], ['sunset', 'Sunset'], ['night', 'Night']], set: 'sky' }] };
  }
  function U(name, icon, desc, sky, extra, walk, jump) { return { name: name, icon: icon, kind: 'unbloxed', desc: desc, groups: [moveGroup(walk || 16, jump || 50), gameGroup(sky)].concat(extra || []) }; }
  S.obby = U('Obby Unbloxed', '🧗', 'The 10-stage obstacle course: gap jumps, ladder, spinners, rainbow spiral, zigzag, disc hop, planks, balls and pillars. Every stage is real Studio parts you can change.', 'day', [], 16, 52);
  S.heights = U('Unblocked On The Heights', '⚔️', 'The summit tower map. Remixed as a climb to the top (sword fights are not part of Studio games yet).', 'sunset');
  S.steal = U('Steal a Blocker', '🛡️', 'The bases map. Remixed as a map to explore and build on (stealing is not part of Studio games yet).', 'day');
  S.disaster = U('Natural Disasters', '🌋', 'The island map. Remixed as a map to build on (disasters are not part of Studio games yet: use block scripts to add your own).', 'sunset');
  S.mystery = U('Murder Mystery', '🔪', 'The house map. Remixed as a map to explore and build on (roles are not part of Studio games yet).', 'night');

  // ---------- validator: rules object -> cleaned {key: value} (only keys in the schema, values typed + clamped) ----------
  function items(base) { var sc = S[base], out = {}; if (!sc) return out; sc.groups.forEach(function (g) { g.items.forEach(function (it) { out[it.key] = it; }); }); return out; }
  function clean(it, v) {
    if (it.type == 'number') {
      var n = typeof v == 'string' ? parseFloat(v) : v; if (typeof n != 'number' || !isFinite(n)) return undefined;
      if (it.min != null) n = Math.max(it.min, n); if (it.max != null) n = Math.min(it.max, n);
      if (it.step && it.step >= 1 && Math.round(it.step) == it.step) n = Math.round(n);
      return n;
    }
    if (it.type == 'bool') return v === true || v === 1 || v === 'true' ? true : v === false || v === 0 || v === 'false' ? false : undefined;
    if (it.type == 'choice') { for (var i = 0; i < it.options.length; i++) if (it.options[i][0] === v) return v; return undefined; }
    if (it.type == 'text') return typeof v == 'string' ? v.replace(/[<>&"]/g, '').slice(0, 400) : undefined;
    return undefined;
  }
  window.UBX_REMIX_SCHEMAS = S;
  window.UBX_REMIX_ITEMS = items;
  window.UBX_REMIX_CLEAN = clean;
  window.UBX_REMIX_VALIDATE = function (base, rules) {
    var it = items(base), out = {};
    if (!rules || typeof rules != 'object') return out;
    for (var k in rules) { if (!Object.prototype.hasOwnProperty.call(it, k)) continue; var v = clean(it[k], rules[k]); if (v !== undefined) out[k] = v; }
    return out;
  };
  // read the remix a game page was started with: trench-war.html?remix=1 + localStorage ubx_remix_play
  // returns {on, base, rules, name, author}; on=false (and no rules) for any problem, so the game runs unchanged.
  window.UBX_REMIX_READ = function (base) {
    var o = { on: false, base: base, rules: {}, name: '', author: '' };
    try {
      if (!/[?&]remix=1(&|$)/.test(location.search)) return o;
      var r = JSON.parse(localStorage.getItem('ubx_remix_play') || 'null');
      if (!r || r.base !== base) return o;
      o.on = true; o.rules = window.UBX_REMIX_VALIDATE(base, r.rules);
      o.name = String(r.name || 'Remix').replace(/[<>&"]/g, '').slice(0, 60); o.author = String(r.author || '').replace(/[<>&"]/g, '').slice(0, 40);
    } catch (e) { o.on = false; o.rules = {}; }
    return o;
  };
})();
