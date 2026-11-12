# Farming Unblocked — module contract (read fully before writing code)

Original farming game for the Dopamine Rush site. Plays like the farming-sim genre (drive tractors,
cultivate, seed, harvest, sell, buy fields/machines) but EVERYTHING is original: no real brands or
logos (no John Deere/Fendt/Claas/New Holland/Case/Massey etc.), never mention "Farming Simulator" or
GIANTS. Fictional brands: **Ridgeway** (tractors), **Harvestmaster** (combines), **Tillco** (tools).

## Tech rules
- three.js **r128** global `THREE` (classic scripts, NO ES modules/imports, NO examples/ addons, NO
  `THREE.Geometry` — only BufferGeometry primitives like BoxGeometry/CylinderGeometry). Plain ES2017 JS.
- One file per module: `html-main/farming/js/<name>.js`. Write ONLY your own file.
- File shape: `(function(){ 'use strict'; ... FU.register({ name:'<name>', order:N, ui:false, init:function(G){}, update:function(dt,G){} }); })();`
  Assign your public API to `FU.<name>` at load time (top level of the IIFE) so others can call it later.
  Only touch other modules inside init/update/event handlers, and always guard: `if (FU.fields) ...`.
- `core.js` already exists (read it: `html-main/farming/js/core.js`). It provides `FU.G` (= `G`), `FU.util`,
  `FU.LAYOUT`, the loop and input. Init order = `order` ascending; update each frame in the same order.
  While `G.paused` only modules with `ui:true` get `update`.
- No network, no image/audio files: all art procedural (geometry, CanvasTexture via `FU.util.canvasTexture`),
  all sound procedural (WebAudio). Keep it light for school Chromebooks: share geometries/materials,
  MeshLambertMaterial, few draw calls, no per-frame allocations in big loops.
- Never open a browser and never play audio while testing. Check syntax with `node --check <file>`.

## Coordinates
Meters, Y up, ground FLAT at y = 0. World spans -300..300 on X and Z (`FU.LAYOUT.mapSize = 600`).
Heading `h` (radians): forward = `(sin h, 0, cos h)`; a mesh modeled facing +Z uses `mesh.rotation.y = h`.
Steering LEFT increases h. `FU.util.fwd(h)`, `FU.util.right(h)`, `FU.util.localToWorld(x,z,h,lx,lz)` (lx = right, lz = forward).

## Shared layout — `FU.LAYOUT` (in core.js; use it, don't hardcode copies)
roads (N-S at x=0 and E-W at z=-60, 8 m wide), farmyard (x -50..-10, z -50..0), buildings (farmhouse,
shed, dealer, silos with x,z,w,d), points (spawn, shop r=7, delivery, sell r=11, farmhouse), starter
vehicles/implements, `cell` = 2 m, 13 fields `{id,x,z,w,d,owned?,price,name}` (centers; w along X, d along Z).
Nothing may be built on fields, roads or the points.

## Core API (`G = FU.G`)
- `G.scene`, `G.camera`, `G.renderer`, `G.ui` (full-screen DOM overlay; it has pointer-events:none, so
  interactive children need class `fu-interactive` or be `<button>/<input>/<select>`), `G.settings` {volume, shadows, quality}, `G.saveSettings()`.
- `G.money`; `G.spend(amount, reason)` → bool (blocks + notifies if not enough); `G.charge(amount, reason)` (small running
  costs, never blocks); `G.earn(amount, reason)`. All emit `moneyChanged`.
- `G.time` {day, hour (0-24 float), minutesPerSecond: 2 (game minutes per real second), scale (fast-forward multiplier)}.
  Game hours elapsed this frame = `dt * G.time.minutesPerSecond * G.time.scale / 60`.
- `G.input.down(code)`, `G.input.pressed(code)` (true on the frame the key went down), `G.input.mouse`
  {x,y,dx,dy,wheel,buttons,clicked}, `G.input.blocked` (true when paused or a panel is open → gameplay ignores keys). Codes are `KeyboardEvent.code` ('KeyW', 'Space', 'ShiftLeft', 'ArrowUp' ...).
- `G.on(name, fn)`, `G.emit(name, data)`, `G.notify(text, kind)` kind 'info'|'good'|'bad', `G.prompt(text)` (context hint
  for THIS frame, e.g. `'[E] Enter Ridgeway 80'`; HUD shows them), `G.colliders` (array of {x,z,hw,hd,rot} boxes),
  `G.activeVehicle` (vehicle being driven or null), `G.started`, `G.paused`.
- Panels: `G.openPanel(name, closeFn)`, `G.closePanel(name)`, `G.isPanelOpen(name)`. Core pops the top panel and calls its
  closeFn on Esc; with no panel open, Esc emits `pause`. A panel's closeFn must hide its DOM.
- `G.start({load})` (menu calls it). New game: core sets money 20000, day 1 06:00 and emits `newGame` — every module resets its state on `newGame`.
- Events: `ready`, `newGame`, `gameStarted`, `gameLoaded`, `pause`, `moneyChanged`, `notify`, `enterVehicle` {vehicle},
  `exitVehicle` {vehicle}, `fieldChanged` {field, op}, `fieldBought` {field}, `vehicleBought` {item, obj}, `sold` {cropId, liters, money}, `newDay` {day}.
- Save: every stateful module exposes `serialize()` → plain JSON and `deserialize(data)`.

## Keys (do not use keys owned by another module)
W/S/A/D + arrows drive/walk (vehicles, player) · Space brake (vehicles) · Shift run (player) · E enter/exit (player) ·
Q attach/detach, F lower/raise, R cycle seed (implements; F also toggles the combine header in harvest) · U unload/sell (harvest) ·
B shop (shopui) · M map (map) · J jobs (missions) · H help (hud) · T hold fast-forward (daynight) · C camera view (camera) · Esc (core). · ` Admin Abuse panel, Duke only (mutations).

## UI style (CSS in the page)
Classes: `.fu-panel` (centered modal), `.fu-title`, `.fu-btn` (+ `.secondary`, `.danger`), `.fu-box` (small HUD box),
`.fu-small`, `.fu-key` (key cap). Font system-ui, white text, dark translucent green-gray panels, accent #4caf50, money gold #ffd54f.
Layers: HUD z-index 10, panels 20, menu 30, toasts 40.

## Modules (file — order — owner responsibilities and public API)

**models.js — order 1.** `FU.models`: procedural low-poly meshes (THREE.Group, origin on the ground at the center, forward +Z, castShadow, cached shared geometries/materials). Original designs and colors.
- `tractor({color, size:'s'|'m'})` ~4.2 m long (m: ~5 m), cab, big rear/small front wheels. `userData`: `wheels` [{mesh, radius, front}], `hitchZ` (local z of rear hitch, ~-2.3), `exhaust` (THREE.Vector3 local), `length`, `width`.
- `combine({color, headerWidth})` ~8 m long, header across the front. `userData`: `wheels`, `reel` (rotate on X), `header` (raise/lower via position.y), `pipe` (unload auger, rotate on Y to swing out left), `fill` (grain mesh in tank, scale.y 0..1), `length`, `width`.
- `trailer({capacity})` ~6 m, `userData`: `wheels`, `drawbar` (distance from origin to front hitch point), `fill` (grain heap mesh; scale.y 0..1; caller sets material color).
- `cultivator({width})`, `seeder({width})`: `userData`: `drawbar`, `workZ` (local z of the working line, negative = behind origin), `width`.
- `farmer()` ~1.8 m person (overalls + cap): `userData`: `legs` [l,r], `arms` [l,r] for swing animation.

**world.js — order 5.** Ground (big grass plane with noise CanvasTexture, repeat), roads, gravel farmyard, buildings from LAYOUT (farmhouse, machine shed, dealer with a "RIDGEWAY DEALER" canvas sign, grain silos with "GRAIN MARKET" sign), floating labels/markers at the shop and sell points (bobbing sprite + ground ring) so players find them, trees (InstancedMesh) along edges and gaps but never on fields/roads/points, hills ring outside the map, a few fences. Push building colliders into `G.colliders`. `FU.world` = {points: FU.LAYOUT.points, isOnRoad(x,z)}.

**fields.js — order 50.** Field data + ground look + work operations. `FU.fields`:
- `STATE` = {GRASS:0, STUBBLE:1, CULTIVATED:2, GROWING:3, RIPE:4}; `list` (field objects); `byId(id)`.
- Field: `{id,name,x,z,w,d,nx,nz,owned,price,contract:null, state:Uint8Array, crop:Uint8Array, growth:Float32Array}`; cell k = j*nx + i; cell center x = f.x - f.w/2 + (i+0.5)*2, z = f.z - f.d/2 + (j+0.5)*2.
- `at(x,z)` → {field,i,j,k}|null; `stats(field)` → {total, grass, stubble, cultivated, growing, ripe, crops:{id:count}}.
- `work(op, o)` op 'cultivate' | 'seed' | 'harvest'; o = {x, z, heading, width, length, cropId (seed), cropFilter (harvest: only this crop id, or null = any; the first harvested crop locks the call)}. Affects cells whose centers lie in the oriented rectangle (center x,z; width across heading; length along heading), only on fields with `owned || contract`. cultivate: any state → CULTIVATED (clears crop); seed: CULTIVATED → GROWING (crop=cropId, growth 0); harvest: RIPE (matching filter) → STUBBLE. Returns {changed, liters, cropId} (liters = Σ crop yield per cell from `FU.crops.byId(id).yield`). Emits `fieldChanged` {field, op} (throttle per field to ≤ 4/s) and redraws the ground.
- `setAll(field, state, cropId, growth)`, `redraw(field)`, `buy(id)` → G.spend(price) → owned, emit `fieldBought`, notify. `serialize/deserialize`.
- Ground look: one plane per field at y = 0.03 with a CanvasTexture (≥ 4 px per cell, furrow/stubble patterns by state; growing cells tinted toward green; colors per crop from FU.crops when present). Only repaint changed cells; set needsUpdate at most ~10×/s. Owned fields get a subtle border; for-sale fields a "FOR SALE $X" sign post at a corner (sprite).
- newGame: field 1 owned and fully RIPE wheat (crop 1); the other fields get random whole-field looks (GROWING random crop/growth, RIPE, CULTIVATED or STUBBLE).

**crops.js — order 55.** `FU.crops.types` = [{id, name, color (ripe), green, height, growHours, yield (liters per cell), price ($ per liter), seedCost ($ per cell)}] with id 1 Wheat, 2 Barley, 3 Corn (tall), 4 Canola (yellow), 5 Sunflower (tall, yellow heads), 6 Soybeans. Tune so a 70×70 m field (1225 cells) earns roughly $3–6k per harvest and growth takes ~6–12 game hours (≈3–6 real minutes). `byId(id)`. Each frame grows GROWING cells (growth += gameHours / growHours; at ≥ 1 → RIPE) and emits `fieldChanged` when cells ripen. Visuals: per-field InstancedMesh (cheap tuft geometry, ≤ 4–8 triangles), one instance per GROWING/RIPE cell, height by growth, instance color green → ripe color; rebuild a field's instances when it changes (listen to `fieldChanged`, throttle ~1 field rebuild per frame) and when growth crosses visual steps.

**vehicles.js — order 30.** `FU.vehicles`:
- `types` = { tractor_s: {name:'Ridgeway 80', kind:'tractor', size:'s', color, price:30000, maxSpeed:11, workSpeed:4.5, accel, wheelbase:2.4, radius:2.2}, tractor_m: {name:'Ridgeway 160', size:'m', price:65000, maxSpeed:13, ... can pull 6 m tools}, combine_s: {name:'Harvestmaster 5', kind:'combine', headerWidth:4.5, tank:6000, price:90000, maxSpeed:7, workSpeed:3.2, wheelbase:3.4, radius:3.2}, combine_m: {name:'Harvestmaster 8', headerWidth:7.5, tank:10000, price:160000, maxSpeed:8, workSpeed:3.6, radius:3.8} }.
- `list`, `byId(id)`, `spawn(type, x, z, heading)` → v = {id:'v'+n, type, def, x, z, heading, speed, steer, throttle, mesh, attached:null (implement id), cargo:{cropId:0, liters:0, capacity:def.tank||0}, working:false, speedLimit:null, engineOn}, `remove(v)`, `nearest(x,z,maxDist)`, `hitchWorld(v)` → {x,z} of a tractor's rear hitch.
- Drives `G.activeVehicle` when `!G.input.blocked`: W/↑ throttle, S/↓ brake then reverse (≤ 4 m/s), A/D ←/→ steer (≤ 0.6 rad, less at speed), Space hard brake; bicycle model `heading += speed / wheelbase * tan(steer) * dt`; respect `v.speedLimit` (set by implements/harvest each frame, then reset to null after use). Parked vehicles roll to a stop. Collisions: circle vs `G.colliders` (`FU.util.circleVsBox`), vs other vehicles, map edge. Animate wheels/steering, combine reel when working. Optional headlights for the active vehicle at night (`FU.daynight.isNight()`).
- newGame: clear, spawn `FU.LAYOUT.starter.vehicles`. serialize/deserialize keep ids.

**implements.js — order 40.** `FU.implements`:
- `types` = { cultivator_3m: {name:'Tillco Cultivator 3m', kind:'cultivator', op:'cultivate', width:3, workSpeed:4.5, price:6000}, cultivator_6m: {width:6, price:14000, needs:'m'}, seeder_3m: {name:'Tillco Seed Drill 3m', kind:'seeder', op:'seed', width:3, workSpeed:4, price:9000}, seeder_6m: {width:6, price:20000, needs:'m'}, trailer_12k: {name:'Grain Trailer 12,000 L', kind:'trailer', capacity:12000, price:8000}, trailer_24k: {capacity:24000, price:18000, needs:'m'} } (needs:'m' = only the Ridgeway 160 can pull it; tell the player).
- `list`, `byId`, `spawn(type,x,z,heading)` → imp = {id:'i'+n, type, def, x, z, heading, mesh, attachedTo:null, lowered:false, seedCrop:1, cargo:{cropId:0, liters:0, capacity} (trailers)}; `attach(v, imp)`, `detach(v)`, `attachedTo(v)`.
- With an active tractor (not blocked): Q attaches the nearest free implement whose hitch is ≤ 4 m from the tractor hitch, or detaches; F lowers/raises (not trailers); R cycles the seeder crop. Show prompts. Attached implements trail: heading toward the hitch, origin = hitch − fwd(heading)·drawbar. Lowered + moving forward (speed > 0.3): call `FU.fields.work(def.op, {x,z of the work line center, heading, width, length: speed·dt + 0.6, cropId: seedCrop})`; seeding costs `G.charge(changed · seedCost)`; set the tractor's `speedLimit = def.workSpeed`. Trailer fill mesh shows cargo. newGame: spawn `FU.LAYOUT.starter.implements`. serialize/deserialize (relink attachedTo; save loads vehicles first).

**harvest.js — order 45.** Combine: F toggles `v.working` (header down); working + moving forward → `FU.fields.work('harvest', {header center ahead of the combine, heading, width: def.headerWidth, length: speed·dt+0.6, cropFilter: cargo.liters>0 ? cargo.cropId : null})`, add liters to `v.cargo` up to capacity (notify once when full), `speedLimit = def.workSpeed`, tank fill visual. U near (≤ 9 m) a trailer with the same/empty crop: auto-unload combine → trailer at ~1000 L/s with the auger swung out. Selling: the active vehicle's cargo, or the trailer attached to the active tractor, inside the sell point radius → prompt `'[U] Sell 5,432 L Wheat for $1,901'`; U → `G.earn(liters × FU.economy.price(cropId))`, emit `sold`, notify, clear cargo. `FU.harvest` = {sell(holder), unloadTarget(v)}.

**economy.js — order 60.** `FU.economy`: `price(cropId)` ($/L = crop.price × daily factor 0.8–1.25, random walk on `newDay`), `trend(cropId)` (-1/0/1), `catalog` = items built from vehicle + implement types: {key, kind:'vehicle'|'implement', category:'Tractors'|'Combines'|'Tools'|'Trailers', name, price, desc, stats}, `buy(key)` → G.spend → spawn at `LAYOUT.points.delivery` (offset if occupied) → emit `vehicleBought`, notify "Delivered to the dealer lot", `sell(obj)` (50% refund, removes it; never the last tractor). serialize/deserialize; reset on newGame.

**shopui.js — order 94, ui.** B opens/closes the shop panel (`G.openPanel('shop', close)`), anywhere once the game started. Tabs: Tractors, Combines, Tools, Trailers, Fields (each field: size, state summary from `FU.fields.stats`, price, Buy → `FU.fields.buy`), Prices (crop prices + trend arrows), Sell (owned machines, 50%). Cards with a small procedural icon (canvas drawing or emoji), stats, price, Buy (disabled when too expensive). Shows money.

**hud.js — order 90, ui.** Hidden until `G.started`. Money (gold) + "Day N · HH:MM", fast-forward indicator when `G.time.scale > 1`; vehicle box (name, km/h, attached tool + Lowered/Raised, seeder crop, cargo bar with crop name + liters/capacity); prompts from `G.prompts` as key hints (bottom center); toasts from `notify` (top center, stacked, fade); H toggles a controls overlay (all keys above); a short new-game tips sequence ("Walk to the red tractor and press E", "Drive into Field 1", ...) shown once.

**map.js — order 92, ui.** Minimap (bottom-left canvas ~190 px, north-up, ~220 m around you): roads, fields (owned = green, for sale = gray, contract = blue; fill tinted by state), sell ($) / shop / home icons, vehicles (active = yellow arrow) and the player. M toggles a full-map panel (`G.openPanel('map')`) of the whole 600 m map; clicking a field shows its info + Buy (`FU.fields.buy`). Pre-render static layers; refresh field colors on `fieldChanged` (throttled).

**daynight.js — order 10.** Advances `G.time` (emit `newDay`), hold T = `G.time.scale = 15` (not while blocked; prompt "Fast forward"). Creates the lights: HemisphereLight + DirectionalLight sun with shadows when `G.settings.shadows` (shadow box ~±70 m that follows `FU.camera.target` or the camera), sun angle/color/intensity by hour (sunrise 6, sunset 20; night dark blue but playable), `scene.background` + `scene.fog` matching sky color, optional sky dome/sun/stars. `FU.daynight` = {sun, hemi, isNight(), daylight 0..1}.

**camera.js — order 80.** Third-person camera on `G.activeVehicle` or `FU.player.obj`: mouse drag orbits (yaw/pitch), wheel zooms (vehicle 6–45 m, default 14; on foot 2.5–15, default 5), eases back behind a moving vehicle 1.5 s after the last drag; C toggles a cabin view in vehicles. Keep above ground. Before `G.started`: slow cinematic orbit over the farmyard/fields. `FU.camera` = {yaw, pitch, dist, target:{x,y,z}, forward() → {x,z}}.

**player.js — order 20.** On-foot farmer (`FU.models.farmer()`): WASD relative to `FU.camera.yaw`, Shift run (3 / 6 m/s), collisions (colliders, vehicles, map edge), walk swing. E enters the nearest vehicle ≤ 4 m (`G.activeVehicle = v`, hide farmer, emit `enterVehicle`); E in a vehicle exits to its left side (emit `exitVehicle`). Prompts ('[E] Enter Ridgeway 80'; near the shop point '[B] Open shop'). `FU.player` = {obj:{x,z,heading,mesh}, serialize, deserialize}; newGame → spawn point.

**audio.js — order 85, ui.** WebAudio created lazily on the first user gesture, never before, and NOT at all while `G.settings.volume === 0`. Master gain follows `G.settings.volume` each frame. Engine sound for `G.activeVehicle` (detuned low oscillators + lowpass, pitch by speed/throttle, idle when stopped, fade out when you leave), working noise when a tool is lowered / combine working and moving, one-shots `FU.audio.play('buy'|'sell'|'click'|'notify'|'attach'|'error')`, auto on `sold`/`vehicleBought`/`fieldBought`/bad notify. Gentle volumes.

**save.js — order 98.** `FU.save` = {hasSave(), save(), load() → bool, reset()}; key `farming_unblocked_save_v1`; data {v:1, money, time:{day,hour}, fields, vehicles, implements, player, economy, missions, activeVehicleId}; load order fields → vehicles → implements → player → economy → missions, then set G.activeVehicle, emit `gameLoaded`, return true (guard every module call). Autosave every 60 s while playing + on `visibilitychange` hidden / `beforeunload`.

**menu.js — order 96, ui.** Title screen (big "Farming Unblocked" logo, subtitle "Grow it. Haul it. Sell it.") with Continue (if `FU.save.hasSave()`), New Game (confirm overwrite), Controls, Settings (volume 0–100 → `G.settings.volume`; shadows toggle → `G.renderer.shadowMap.enabled` + mark materials; quality low/high "applies after reload"; `G.saveSettings()`). Calls `G.start({load})`. On `pause`: `G.paused = true`, pause panel registered with `G.openPanel('pause', resume)`: Resume, Save game (`FU.save.save()` + notify), Settings, Controls, Quit to title (save, then reload).

**missions.js — order 65.** `FU.missions` = {offers, active, accept(id), cancel(), serialize, deserialize}. Offers (max 3, refreshed on newGame, newDay and every ~4 game hours) on fields not owned: cultivate (field not cultivated), seed crop X (field cultivated), harvest (field ripe). Reward ≈ area × $0.5–0.9/m². Accept → `field.contract = {missionId, op}` (fields lets you work it); progress = share of cells in the target state; ≥ 95% → `G.earn(reward)`, notify, clear contract; limit 2 game days. J opens a jobs panel (offers + Accept, active progress + Cancel); small progress box under the HUD money while active.

**fx.js — order 70.** Pooled THREE.Points particles (dust brown, chaff yellow, smoke gray; ≤ 1500 total, one draw call each): poll `FU.implements.list` (lowered + moving → dust at the work line) and `FU.vehicles.list` (combine working → chaff behind + dust; exhaust puffs when throttling). Particles drift, grow and fade.

**mutations.js — order 13, ui.** Crop mutations + 🛠 Admin Abuse. `fields.js` keeps a bitmask per cell (`f.mut`, saved as rle `m` only when non-zero); seeding / cultivating clear it, harvesting adds `res.bonusL` (extra liters' worth = yield × (multOf − 1)) and `harvest.js` hands that to `FU.mutations.payout` → paid with `G.earn` once a second (+ toast). 18 mutations (bit = list index), multipliers add up (1 + Σ(mult − 1)); `crops.js` recolours mutated plants via `FU.mutations.tint` and `FU.crops.touch(f)`. Events spread a mutation in seeded-noise patches every 2 s (same result on every computer) and/or by strikes (lightning / lava / meteors). Natural: rain → Soaked patches, rare Golden on ripening. Only Duke can start events (panel only when signed in as duke; ` key / HUD button): he types the admin password, the game sends sha256(pw + '::fu-admin') to Supabase (farming-admin.sql: `fu_admin_check`, `fu_admin_cmd_new` → one-time token, `fu_admin_cmd_take`; only the hash is stored, 20 wrong tries / 5 min locks everyone out for a bit). Solo or host: the token means go; a client sends `admev` {tok} and the host redeems it, then broadcasts `admgo` {x, k, d, n}; `admsync` gives late joiners the running events. Clients only take these from the host. Farms online: a co-op host calls `fu_room_beat` once a minute (farming-rooms.sql; not the Main Server) and `fu_room_end` when it stops; Duke's panel lists every farm with its code via `fu_room_list` (admin password) and can Join. net.js: `codeHidden()`, `setCodeHidden(on)`, `shownCode()` ('••••' when hidden) — netui / nethud show that, Copy invite link still copies the real link. `FU.mutations` = {list, events, multOf, tint, ripened, payout, active(), unlock(pw), unlocked(), lock(), command(x, k, d), open, close, isDuke}.

**motm.js — order 97, ui.** Farmer of the Month. Reads `fu_motm_get()` (farming-motm.sql, NOT in the repo — kept in Supabase) on load / account change; shows a newspaper article on the title menu once per crowning (sessionStorage `fu_motm_seen`). The winner (account name == the crowned username) gets: a gold farmer skin (recolors `FU.player.obj.mesh` materials, re-applied after rebuild), a HUD button to spawn a gold `tractor_xl` + `combine_xl` with `v.speedBoost` (vehicles `vmax` and workers `workMult` honor it; saved as `boost`), and 2x money in solo (wraps `G.earn`). Duke crowns from admin.html → `fu_motm_set` (dr_is_admin). `FU.motm` = {get, refresh, isWinner, bonusActive, spawnGolden, showArticle}.

## Report back (keep it short)
What you implemented, any API deviations from this contract, and anything other modules must know.
