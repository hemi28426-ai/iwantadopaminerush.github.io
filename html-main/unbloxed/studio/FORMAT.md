# Unbloxed Studio map format (v1)

A Studio game is one JSON object. The editor (`html-main/unbloxed/studio.html`) writes it; the play mode
(`html-main/unbloxed/studio-play.js`, a mode inside `unbloxed.html`) reads it.

```json
{
  "v": 1,
  "name": "My Obby",
  "desc": "Short description",
  "author": "username or Guest",
  "icon": "🧱",                       // emoji for the hub card
  "sky": "day",                       // day | sunset | night
  "settings": { "walk": 16, "jump": 50, "gravity": 196, "lives": 0, "timer": true, "gears": false },
  "parts": [
    {
      "id": "p1",                     // unique string
      "name": "Part",
      "shape": "block",               // block | ball | cylinder | wedge
      "p": [0, 0.5, 0],               // centre position (studs; Y up)
      "s": [4, 1, 2],                 // size x,y,z (cylinder: s[0]=s[2]=diameter, s[1]=height, axis = Y)
      "r": [0, 0, 0],                 // rotation radians, THREE Euler order 'YXZ'
      "c": "#a3a2a5",                 // color
      "mat": "plastic",               // plastic | smooth | neon | metal | wood | glass | grass | brick
      "t": 0,                         // transparency 0..1
      "collide": true,                // CanCollide
      "shadow": false,                // CastShadow: optional, only saved when off (default: casts a shadow when t < 0.5)
      "kind": "none",                 // none | spawn | kill | checkpoint | finish | spinner | mover | bounce
      "spin": [0, 1.5, 0],            // kind=spinner: rad/s around local x,y,z
      "move": { "d": [0, 0, 10], "t": 3 },   // kind=mover: ping-pong offset d over t seconds each way
      "bounce": 80,                   // kind=bounce: upward speed
      "cp": 1                         // kind=checkpoint: order number (1,2,3...). finish ends the run
    }
  ]
}
```

Rules
- Unknown fields must be ignored and kept (forward compatible). Missing fields take the defaults above.
- `kind: spawn` parts are drawn (like Roblox SpawnLocation) and players start on top of a random one (or (0,5,0) if none).
- `kill` resets the player to the last checkpoint touched (or spawn).
- Checkpoints and finish are touch-triggered pads; finish shows the run time.
- Movers/spinners carry players standing on them where practical.

Shapes (all are unit meshes scaled by `s`, then rotated by `r`, then moved to `p`)
- `block`: box.
- `ball`: sphere (ellipsoid) filling the size box. The editor keeps balls uniform (s0=s1=s2).
- `cylinder`: upright along local Y (THREE.CylinderGeometry). Diameter s[0] (= s[2]), height s[1].
- `wedge`: Roblox WedgePart orientation. In local unit space the bottom face (y=-0.5) and the back face
  (z=+0.5) are full; the slope runs from the top-back edge (y=+0.5, z=+0.5) down to the bottom-front edge
  (y=-0.5, z=-0.5). So the slope faces -Z (outward normal (0,1,-1)) and rises toward +Z; height at local z is
  (z+0.5)*s[1]. Vertices: (+-0.5,-0.5,-0.5), (+-0.5,-0.5,+0.5), (+-0.5,+0.5,+0.5).

Compact maps: published maps (UBXCloud.publish) round numbers to 3 decimals and leave out part fields that equal
their defaults (`name:"Part"`, `shape:"block"`, `r:[0,0,0]`, `c:"#a3a2a5"`, `mat:"plastic"`, `t:0`, `collide:true`,
`kind:"none"`), plus kind fields that don't match the part's kind. Readers must apply the defaults.
Editor-only top-level fields: `cloudId` (published game id; stripped from the published copy), `src` (e.g. "legacy:obby").
Optional part field `group` (string, e.g. "Small House"): the model a part belongs to, set by the Toolbox
(`studio/toolbox.js`). The Explorer shows consecutive parts with the same `group` as one collapsible "📦 Small House" row,
and clicking one of them in the 3D view selects the whole model (Alt+click: just that part). Play mode ignores it.

## Scripts (block coding)
Optional `scripts` on a part (`part.scripts`) and on the map (`map.scripts`, the "game script" under Workspace):
`[{ "name": "Script", "blocks": <Blockly.serialization.workspaces.save(ws) JSON> }]`.
The editor (`studio/blocks-editor.js`, Blockly + `blocks-defs.js` vendored in `studio/vendor/blockly`, loaded the first
time a script opens) saves it compactly: no block `id`s, x/y rounded, only the variables that are used, and no
`blocks` key when the script is empty. Shape: `{blocks:{languageVersion:0, blocks:[topBlock...]}, variables?:[{name,id}]}`;
a block is `{type, x?, y?, fields?:{NAME:value | {id}}, inputs?:{NAME:{block?, shadow?}}, next?:{block}}`.
- Only top blocks that are event hats run (`ubx_start`, `ubx_touched`, `ubx_untouched`, `ubx_key` KEY = KeyboardEvent.code
  or "any", `ubx_every` SECS, `ubx_checkpoint` CP (0 = any), `ubx_finish`, `ubx_respawn`, `ubx_receive` MSG). Touch hats
  only work in part scripts. Block types are listed in `blocks-defs.js`; every one is implemented in `blocks-runtime.js`.
- "this part" (`ubx_this_part`) is the script's part (nothing in a game script). `ubx_part_named` NAME matches part names
  case-insensitively and acts on every part with that name (reporters use the first).
- Variables (Blockly `variables_get/set`, `math_change`) are shared by name across all scripts of a game. Leaderstats
  (`ubx_stat_*`) show in a Roblox-style panel at the top right while playing.
- Play mode (`studio/blocks-runtime.js`, `window.UBXRun`) interprets the JSON (no eval, no Blockly): each started hat is a
  generator thread; waits, glides, message-for-secs and every loop iteration wait for the next frame, and a thread is paused
  after 5000 blocks in one frame, so scripts can't freeze the game. Touched hats and key/every hats don't restart while
  their script is still running; start/receive/checkpoint/finish/respawn restart it.
- Parts that scripts can change (parts with scripts + parts named by `ubx_part_named`) are never merged and keep their
  own material. The first time a script moves, turns, resizes, hides or changes collision of a part, the runtime takes
  over its collision boxes (re-registered in the grid as it moves; players standing on it are carried); a built-in
  mover/spinner taken over this way stops its own motion. Hidden parts have no collision and can't be touched;
  transparency 1 only hides the mesh.

## Screen GUI (`map.gui`, like Roblox StarterGui)
Optional top-level `gui`: a flat array of elements; nesting is by `parent` id. Edited by `studio/gui-editor.js`
(ribbon "🖥️ GUI", Explorer "🖥️ StarterGui"); drawn by `window.UBXGuiView` in `studio/blocks-runtime.js` (same code for the
editor preview and play mode).
```json
{ "id": "g1", "name": "SpeedButton", "type": "button", "parent": null,
  "pos": [1, -20, 0.5, 0], "size": [0, 200, 0, 60], "anchor": [1, 0.5],
  "bg": "#ff8a1a", "bgT": 0, "text": "⚡ Speed Boost", "textColor": "#ffffff", "textSize": 22, "font": "bold", "align": "center",
  "corner": 14, "stroke": 3, "strokeC": "#a64d00", "visible": true, "z": 1,
  "value": 100, "fill": "#46d36b", "msg": "" }
```
- `type`: `frame` (box), `text` (TextLabel), `button` (TextButton), `emoji` (big emoji label; `image-emoji` is read as
  `emoji`), `bar` (progress bar: track = `bg`, `fill` colour, `value` 0..100 %).
- `pos` / `size` are Roblox UDim2 `[xScale, xOffset, yScale, yOffset]`: scale is a fraction of the parent (the screen for
  top-level elements), offset is pixels. `anchor` `[0..1, 0..1]` is the AnchorPoint. Children are positioned inside
  their parent's box and hidden with it. A missing parent (or a cycle) puts the element on the screen.
- `bgT` background transparency 0..1; `corner` radius px; `stroke` border px (outside the box) + `strokeC`;
  `textSize` px; `font` `normal | bold | cartoon | arcade` (system fonts only); `align` `left | center | right`;
  `z` ZIndex among siblings. `msg` (buttons): clicking also broadcasts this message (starts `ubx_receive` hats).
- Defaults (missing fields): `parent:null, pos:[0,0,0,0], size:[0,100,0,100], anchor:[0,0], bg:"#ffffff", bgT:0, text:"",
  textColor:"#ffffff", textSize:20, font:"normal", align:"center", corner:0, stroke:0, strokeC:"#000000", visible:true,
  z:1, value:100, fill:"#46d36b", msg:""`. Invalid colours fall back to the default (only `#rrggbb` is used).
- Blocks (teal "GUI" category): `ubx_gui_click` hat (field `ELEM` = button name), `ubx_gui_text` (ELEM, TEXT),
  `ubx_gui_show` / `ubx_gui_hide` (ELEM), `ubx_gui_color` (ELEM, WHAT `bg|text|fill`, COLOR), `ubx_gui_bar` (ELEM, V %),
  `ubx_gui_gettext` reporter (ELEM). Names match case-insensitively and act on every element with that name. A click
  restarts its hat like Scratch. The editor's element picker lists `map.gui` names and keeps typed names.
- Play: the GUI is built when `UBXRun.start` runs and removed by `UBXRun.stop` (div `#ubx-gui`, fixed, full window,
  only buttons take clicks; plain divs + `textContent`). Pointer lock: a click on a button never reaches the 3D canvas.
  While mouse look has the pointer locked and a button is on screen, a hint says "Press Alt to use the mouse on
  buttons"; Alt releases the lock, clicking the 3D view locks it again.
- The editor previews a 1366×768 screen (offsets 1:1); "Scale with screen" / "Fixed pixels" convert pos+size.

## Toolbox models (`studio/toolbox-data.js`)
`window.UBX_TOOLBOX = [{id, name, cat, icon, desc, from?, big?, parts:[...]}]`, loaded by the Toolbox on first open.
`cat` is one of Buildings, Obby, Kits, Nature, Props, Gameplay; `from` names the Unbloxed game a kit was taken from.
`parts` are compact v1 parts (no `id`) relative to the model origin: x/z centred on the model, y = 0 its lowest point,
front facing -Z. Inserting renames them "Model.Part", sets `group`, and renumbers checkpoints (`cp`) to continue after
the map's highest one, keeping their order. Bump `window.UBX_TOOLBOX_VER` when models change (thumbnail cache key).
The file is generated by a build script (kits are cut from the `UBX_MAPS` maps and rebuilt from obby.js / disaster.js).

## Legacy Unbloxed maps
The existing maps (`unbloxed/*-map.json`, also in `window.UBX_MAPS` via `assets.js`) use
`{size, spawns:[[x,y,z]], pickups:[[x,y,z,kind]], parts:[[x,y,z, sx,sy,sz, rx,ry,rz, "#color", transparency, collide(1/0), shape?, name?]]}`
where shape is 0/absent = block, or a string like "cylinder", "ball", "wedge", "union". Rotations are
Roblox ToEulerAnglesYXZ (radians). Importers convert each array part to a v1 part (shape "union", "laser", "mesh" -> block)
and each spawn to a small transparent `kind:"spawn"` part.
Studio's importer details:
- Roblox cylinders have their axis along local X; v1 cylinders are along Y. So `s = [d, sx, d]` with
  `d = min(sy, sz)`, and the rotation becomes `R_old * Rz(-90deg)` re-expressed as Euler YXZ.
- Balls get a uniform size `min(sx, sy, sz)`.
- Each spawn `[x,y,z]` becomes a 4x1x4 part at `[x, y-0.5, z]` (top surface at y), `t:1`, `collide:false`, `kind:"spawn"`.
  Maps with no spawns get one on top of the largest solid, visible part.
- Material is `plastic` (legacy maps have none).

## Storage keys (browser)
- `ubx_studio_projects`: JSON array of {id, name, updated} ; each project body at `ubx_studio_p_<id>`.
- `ubx_studio_play`: the map being play-tested (written by the editor right before Play).
- `ubx_studio_last`: id of the project open last in the editor.
- `ubx_studio_low`: "1" when the editor's Low graphics toggle is on (no shadows, pixel ratio 1).

## Play test
The editor shows `../unbloxed.html?studio=play` in a full-screen iframe with a Stop button above it.
The iframe can close itself with `parent.postMessage({type:'ubx-studio-stop'}, '*')`.

## Play mode notes (studio-play.js)
- Entry: `window.startStudio(map)` (map object or JSON string). `unbloxed.html?studio=play` plays `ubx_studio_play` at once
  (no login, no join screen; the ⟵ Hub button becomes "■ Stop (Esc)"). Stop/Esc in an iframe posts
  `{type:'ubx-studio-stop'}` to the parent; outside an iframe it goes back in history (or to unbloxed/studio.html).
  In an iframe it also posts `{type:'ubx-studio-ready'}` on load and accepts `{type:'ubx-studio-play', map}` from the parent
  to restart with a new map without reloading. The iframe needs `allow="pointer-lock"` for mouse look (no sandbox, or
  sandbox with allow-scripts allow-same-origin allow-pointer-lock).
- Wedge: same as the editor / Roblox WedgePart: low edge at local -Z, tall face at local +Z (`WEDGE_HIGH = 1`).
- Settings mapping onto the hub physics (current hub: gravity 34, walk 16, sprint 24, jump ≈ 5.6 studs; the older hub walked
  at 9 / 14 and jumped 2.5): gravity scales as 34*g/196.2, walk speed scales by walk/16 (so 16 = the hub's normal walk),
  jump height = jump²/(2*gravity) * 0.85 (defaults ≈ 5.4 studs), bounce speed is
  scaled the same way (80 ≈ 14 studs up). Shift still sprints.
- Collision: blocks exact when axis-aligned; rotated parts become a chain of small AABBs; balls 5 stacked slices;
  upright cylinders a square ~85% of the diameter; wedges a staircase (walkable). Kill/checkpoint/finish/bounce trigger on
  those same boxes (touching or standing on them). Spinners/movers with collide carry players standing on top
  (spinners: only the world-Y part of the spin carries). Kinds other than none are never merged; static parts that share a
  material are merged into one mesh per material (few draw calls).
- `settings.gears` ("Ability to use gears in your game", default false): when true the player's equipped Marketplace gear works in play mode
  (unbloxed/gear-fx.js asks `MODES.studio.gears()`); C = back to checkpoint (R is free for gears). Editor: Settings dialog and the Rules tab.
- Falling more than 40 studs below the lowest part = death. `settings.lives` > 0: running out sends you back to the start.
- Best times per map in localStorage `ubx_studio_best`.

## Remix (`map.remix`, studio/remix.js + studio/remix-schemas.js)
Optional top-level `remix: { "base": "<schema id>", "rules": { "<key>": value } }` marks a project as a remix of a built-in game.
`rules` holds only the keys changed from the game's normal value. Schemas: `window.UBX_REMIX_SCHEMAS` in `studio/remix-schemas.js`
(`{name, icon, desc, kind:'standalone'|'unbloxed', file?, groups:[{name, items:[{key, label, type:'number'|'bool'|'choice'|'text',
min, max, step, def, options?, hint?, set?}]}]}`); `def` = the game's built-in value. `UBX_REMIX_VALIDATE(base, rules)` drops unknown
keys and wrong types, clamps numbers to min/max (integer steps are rounded) and strips `<>&"` from text. Both Studio and the games use it.
- Standalone games (`trench-war`, `trench-war-world`): the map is built in code; the project's parts are only a preview. Play writes
  localStorage `ubx_remix_play` = `{base, rules, name, author}` and opens the game page with `?remix=1` (Studio: in the play frame;
  hub: `startStudio` in studio-play.js redirects to `<base>.html?remix=1&ubx=1`). The game reads it only when `?remix=1` is present
  (`UBX_REMIX_READ(base)`), applies it through its "UBX REMIX HOOK" (`RX(key, default)` at each constant, `RXT` for the GUNS / GEAR /
  NADES / KS tables keyed `TABLE.<id>.<field>`, `RXL` for comma lists) and shows "REMIX: <name> by <author>" at the bottom.
  Without `?remix=1` nothing changes. Trench War: World remixes play offline and never save cash or world progress.
- Unbloxed games (`obby`, `heights`, `steal`, `disaster`, `mystery`): the legacy map is converted into real Studio parts and plays in Studio
  play mode. Items with `set` (`settings.walk|jump|gravity|lives|timer`, `sky`) are written straight into the map, so play mode needs
  nothing new. Obby: pads become spawn / checkpoints 1-8 / finish, spinners, movers, kill strips, sweepers (spinner + touched→kill script),
  rainbow steps instead of the climbable truss, rebuilt trophy. Heights gets a summit finish pad; Steal's lasers are kill bricks.
  Mode mechanics (swords, stealing, disasters, murder roles) are not part of a remix.
- API: `UBXRemix.templates()` → `[{id, name, icon, desc, kind, featured}]`; `UBXRemix.open(id)` (also `studio.html?remix=<id>`, hub alias
  `trench` → `trench-war`) creates the project "<Game> Remix"; `UBXRemix.playSrc(map)` is the editor's Play hook; `UBXRemix.get/set(key)`.
- Editor: "📋 Rules" tab next to Properties (and ribbon button): search, per-row reset, Reset all; each change is one undo step.

## Bots (`studio/bots.js`)
- `kind: "botspawner"`: bots spawn on its top. Settings in `part.bot` (all optional; bad values take the defaults):
  `{count:2 (1-20), behavior:"fighter"|"runner"|"wanderer"|"guard"|"idle", team:"none"|"red"|"blue"|"green"|"yellow"|"ally",
  diff:"easy"|"normal"|"hard"|"custom", react:0.4 (s), aim:0.72 (0-1), speed:1 (x walk; used when diff is custom), health:100,
  walk:16, jump:50, respawn:true, delay:3 (s), radius:20 (guard), names:"" (comma list; empty = random),
  look:null|{head,torso,arms,legs,hairColor,hat,hair,face,sword,held:"sword"|"none",scale:1,bt:0}, mix:false, pool:null|{hat:[],hair:[],face:[],sword:[]}}`.
  `look:null` = random colours with the free items. Bot names always start with "🤖".
- `kind: "waypoint"`: `wp` order number, optional `wpJump:true`. Invisible and not solid in play. Runners follow waypoints
  in order and then go to the finish; without waypoints they go through the checkpoints in order and then to the finish.
- Teams: fighters/guards attack the player (except `ally`) and bots of other colour teams; `ally` bots fight every non-ally bot.
- Play builds a nav grid (2-stud columns, at most ~20k, built a few ms per frame) from static solid parts, with walk, step,
  drop and gap/ledge jump links; kill bricks are blocked, bounce pads and spinner/mover sweeps cost more. A* runs with a
  per-frame budget. Movers and spinners are not part of the grid.

## 3D World blocks (procedural generation)

Toolbox category "3D World" (`blocks-defs.js`, run by `blocks-runtime.js`). Maps can build themselves with blocks instead of
a one-click generator: loops + random + noise + spawn/clone give full control over what gets made.

- Build: `ubx_w_spawn` (SHAPE, X/Y/Z, SX/SY/SZ, COLOR, MAT, TAG), `ubx_w_last` (last spawned part), `ubx_w_clone`
  (GROUP = a model: parts whose `group` or name matches; placed by its bottom centre, turned DEG around Y, all clones get TAG),
  `ubx_w_model` (the live parts of a model), `ubx_w_rotate` (absolute rotation, degrees), `ubx_w_lookat`, `ubx_w_kind`
  (none | kill | bounce | finish), `ubx_w_settag`, `ubx_w_tagged`, `ubx_w_count`, `ubx_w_delete`, `ubx_w_deltag`.
- Loops (no frame wait per pass, so a whole map builds at once; STEP_CAP still pauses very long ones): `ubx_w_for`
  (variable field VAR, A, B, STEP), `ubx_w_grid` (VX, VZ count 1..W and 1..D), `ubx_w_grid3` (VX, VY, VZ over W x H x D).
  At most 100,000 passes per loop.
- Random: `ubx_w_seed` / `ubx_w_newseed` / `ubx_w_getseed`. Every play starts with a random seed, or `settings.seed` if the
  map sets one. The seed also drives "pick random", "random color", `ubx_w_chance` (PCT %), `ubx_w_pick` / `ubx_w_item` /
  `ubx_w_listlen` (comma-separated lists). Same seed = same map.
- Noise + math: `ubx_w_noise2` (X, Z, ZOOM in studs) and `ubx_w_noise3` return 0..1 smooth value noise (3 octaves, seeded);
  `ubx_w_mapv`, `ubx_w_clamp`, `ubx_w_lerp`, `ubx_w_minmax`, `ubx_w_dist`, `ubx_w_partdist` (PART, PART2), `ubx_w_yaw` (degrees,
  0 = +Z, 90 = +X).
- World queries (collidable parts only): `ubx_w_ground` (top of the highest part at x,z, or -1000), `ubx_w_ray` (distance to
  the first hit, max 1000, or -1), `ubx_w_empty`, `ubx_w_partat` (parts whose box contains the point).
- Rounds: hat `ubx_w_round` ("when new round starts", restarts if already running), `ubx_w_newround`, `ubx_w_roundnum`.

Spawned parts are runtime-only (never saved into the map) and are full script parts: Motion / Looks blocks work on them.
They are drawn with one InstancedMesh per shape + material + transparency (few draw calls) and at most 4,000 can exist at
once (`UBXRun.MAX_SPAWN`; extra spawns are skipped with one warning). Spawned parts have no scripts, and bots' path finding
only knows the map's own parts. Templates "Random Maze" and "Hill Terrain" (`templates.js`) show the blocks in use.

## Tools (holdable models, like Roblox Tools)

A tool is a model built from normal parts that players hold in the right hand. Editor: select parts, ribbon
"🗡️ Make Tool" (`studio/tools-editor.js`); Properties then shows a "🗡️ Tool" section with a live hold preview.
```json
"tools": [{ "id": "t1", "name": "Sword", "icon": "🗡️", "handle": "p12", "grip": [0, 0, 0], "gripR": [0, 0, 0],
            "give": "start", "act": "sword", "dmg": 20, "cd": 0.5, "speed": 120 }]
```
- Each of the tool's parts has `tool: "<id>"` (and `group: <tool name>`, so the Explorer shows one 🗡️ model and a click
  selects all of it). A tool without parts is ignored (and dropped by the editor). Names are unique per game.
- `handle`: part id the hand holds (default: a part named "Handle", else the first part). `grip`: offset of the hand from the
  handle's centre in studs, `gripR`: extra rotation in degrees (Euler YXZ). Build tools as if the character faces -Z with the
  right arm held straight forward: a sword standing up, a gun pointing to -Z. In play, tool space maps to the hand group
  (`c.sw`) by `(x, y, z) -> (-x, z, y)` (`UBXTools.QB`), so holding is `QB * gripR * (part - handle - grip)`.
- `give`: `start` (StarterPack: in the backpack when the game starts), `pickup` (the model floats where it was built; touching
  it adds it to the backpack and equips it if the hands are empty), `script` (only the "give" block).
- `act` (click while holding it, no scripts needed): `sword` (slash animation, damages characters in front within the tool's
  reach), `gun` (bullet from the tool's tip toward the crosshair, speed `speed`), `none`. `dmg` 0-1000, `cd` cooldown 0-60 s.
- Play (`studio/tools.js`, `window.UBXTools`, loaded before studio-play.js): the tool's parts are not built into the world
  (`UBXTools.skip` in build()). Roblox-style hotbar (keys 1-9 or click, ` puts it away, max 9 tools); in a game with tools the
  default sword is hidden unless `settings.gears` is on. Damage uses gear-fx.js's `GX.hurt` / `GX.shot` (knock-outs, kill feed,
  bot health); the player never hurts `ally` bots. Tools stay in the backpack after a respawn.
- Blocks ("Tools" category, `studio/tools-defs.js`; run by tools.js through `UBXRun.ext`): hats `ubx_tool_activated`,
  `ubx_tool_equipped`, `ubx_tool_unequipped`, `ubx_tool_ko` (field TOOL = tool name or `any`); `ubx_tool_give`, `ubx_tool_remove`
  (TOOL or `any` = all), `ubx_tool_equip`, `ubx_tool_unequip`, `ubx_tool_swing` (DMG), `ubx_tool_shoot` (STYLE
  `bullet|ball|rocket|laser`, SPEED, DMG, COLOR), `ubx_tool_touchdmg` (TOOL, DMG: damage on touch while held, 0 = off),
  `ubx_tool_cooldown` (TOOL, SECS), `ubx_tool_action` (TOOL, ACT); reporters `ubx_tool_has` (bool) and `ubx_tool_held` (name).
  The activated hat does not fire during the cooldown.
- NPCs: `UBXTools.equip(char, toolName)`, `UBXTools.unequip(char)`, `UBXTools.activate(char)` (runs the tool's built-in action).
