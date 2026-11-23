# Fishing Unblocked v2 — shared contract (READ FULLY BEFORE WORKING)

We are fully reworking the browser game `html-main/fishing-unblocked.html` (Three.js r128, classic scripts, no modules, no build step).
It must run on a **heavily restricted, low-end school Chromebook**: no new CDNs or network requests, no image/audio files (draw everything with Three.js geometry, canvas textures and WebAudio synth), keep triangles and draw calls low (merge geometry, use InstancedMesh, few lights, no per-frame allocations).
**All content must be ORIGINAL.** The owner likes the *feel* of the Roblox game "Fisch" (unique islands, non-linear progression, legendaries that feel rare, secrets that feel secret) but we must NOT copy any Fisch names, islands, rods, fish, NPCs, art or sounds.
**Fish have NO mouths** (no mouth/lip/teeth geometry) — the only exceptions are the existing special fish "Abyssal Angler" and "DUKE Anglerfish", which are handled by the game and are not your concern.

Everything new lives in `html-main/fishing/v2/`. Each worker owns ONLY the files named in their task. Never edit files owned by others, the main game HTML, or anything outside `fishing/v2/` unless your task says so. The lead engineer integrates everything into the game.

Globals already available in the game page (and in the test harness): `THREE` (r128), `FG` (graphics helpers from `fishing/gfx/*.js`: `FG.noise(x,y)`, `FG.fbm(x,y,oct)`, `FG.smoothstep(a,b,x)`, `FG.merge(geos)`, `FG.slab/log/post/blob/lathe/tube/xf`, `FG.makeDock(seed)`, `FG.makeShop()`, `FG.makeTrees(spots, heightAt)`, `FG.makeRocks(spots, heightAt)`, `FG.makeLantern()`, `FG.makeBarrel()`, `FG.makeBucket()`, `FG.makeSmoke(origin)`, `FG.std(color, opts)`, `FG.linearize(root)`), and `FW` from `fishing/v2/world.js` (read it: `FW.reg`, `FW.ss`, `FW.lerp`, `FW.rng(seed)`, `FW.heightfield(isl, {res,color,floor})`, `FW.mergeParts(parts, mat)`, `FW.label(text,color,scale)`, `FW.mat(hex)`, `FW.heightAt(x,z)`).

Colors: the renderer uses sRGB output + ACES tone mapping. The game calls `FG.linearize(scene)` periodically, which converts material colors set with plain hex to linear — so just use normal hex colors.

## World layout (fixed — use these exactly)
Sea level is y = 0. Open sea floor is -9. Map spans x,z in [-1100, 1100]. Islands are spread out (not a ring):

| id | name | icon | center c | R | theme |
|---|---|---|---|---|---|
| `harbor` | Driftwood Harbor | ⚓ | [0, 0] | 170 | starting harbour town: docks, shop, houses on a hillside, lighthouse on a cliff, the Angler's hut, a small freshwater pond, tutorial area. Player spawns here. |
| `coral` | Coral Lagoon | 🪸 | [520, -260] | 120 | ring atoll with a shallow turquoise lagoon, a beached shipwreck, palm huts on stilts, coral heads |
| `frost` | Frostpeak | 🏔️ | [-420, -620] | 150 | snowy island dominated by a huge mountain with a sealed stone DOOR in its side (portal to the Hidden Grotto), ice shelves, frozen waterfall, a cabin, the Keeper NPC stands by the door |
| `dunes` | Sunscorch Dunes | 🏜️ | [760, 380] | 140 | desert: tall dunes, sandstone cliffs/mesas, an oasis pool, half-buried ancient temple with columns |
| `mire` | Mirewood Swamp | 🍄 | [-760, 60] | 140 | mangrove swamp: twisted trees with roots, giant glowing mushrooms, a stilt village with plank walkways, murky bog pools |
| `crystal` | Crystal Hollow | 💎 | [-380, 560] | 120 | rocky island with huge crystal spires and a big open cave/crater holding a glowing crystal lake |
| `ember` | Ember Peak | 🌋 | [220, 880] | 150 | volcano with a crater, lava falls and lava rivers (not swimmable/fishable lava; the sea around it is warm and steamy), obsidian, a forge outpost |
| `sky` | Skyreach | ☁️ | [900, -760] | 120 | tall pillar island rising high with floating rock chunks around it and a waterfall pouring off the top into the sea; marble ruins and a temple on top reached by a long winding path/stairs |
| `elder` | Elderstone Ruins | 🗿 | [140, -900] | 130 | ancient overgrown island: giant moss-covered stone statues/heads, a ring of standing stones, broken aqueduct, jungle |
| `grotto` | Hidden Grotto | 🕳️ | [0, -2200] | 70 | HIDDEN: an enclosed cave interior (walls + ceiling) around a big glowing pond. Only reachable through the Frostpeak door portal. Not on the map until found. |

NPC ids (fixed): harbor: `angler` (gives a quest every 10 min), `shopkeep`, `harbormaster` (boats), `guide` (tutorial); every other island has one quest giver `npc-<islandId>` (e.g. `npc-coral`), plus frost has `keeper`. Grotto has `npc-grotto`.

## 1. Island file — `fishing/v2/isl-<id>.js` (one per island)
```js
FW.reg({
  id:'coral', n:'Coral Lagoon', icon:'🪸', c:[520,-260], R:120, hidden:false,
  vis:{ hor:0xd6f4f6, zen:0x2a9ad8, fog:0xd2f0f2, sh:0x2ad0c8, dp:0x0a6a90, sun:0xfff0c8, wx:'motes' }, // sky horizon/zenith, fog, shallow & deep water, sun color, ambient particle type: motes|snow|embers|spores|sparkle|sand|stars
  height(x,z){ ... },   // WORLD coords -> ground height. MUST be cheap & allocation-free (called thousands of times per second).
                        // Return null (or <= -9) when (x,z) is outside this island. Land > 0.3. Shore must drop below -1.5 within R so boats can circle the island.
                        // Inland fishing water (lakes/ponds/lagoons/pools) = negative height (-1.5..-4) AND listed in `lakes`.
  lakes:[{x,z,r}],      // inland water that is NOT open sea (boats can't launch there; fish caught there count as spot 'lake').
  shop:{x,z,yaw},       // where the island's shop counter stands (on flat land). The GAME places its shop model + interaction here unless shop.custom=true (then you built your own shop building; the interaction point is x,z).
  dock:{x,z,yaw},       // end of a pier where boats launch/land: the point (x,z) must be deep water (height <= -1.5) right next to walkable pier/land. yaw = direction the pier points out to sea.
  spawn:{x,z},          // harbor only: where new players appear.
  npcs:[{id:'npc-coral', x, z, yaw}],   // standing spots on flat land for your island's NPCs (ids from the table above). The NPC system draws them.
  portals:[{x,z,r:4, to:'grotto', tx, tz, need:'grotto'}], // frost: mountain door -> grotto spawn; grotto: exit -> back outside the door. `need` = save flag required (S.grotto).
  landmarks:[{x,z,n:'Lighthouse'}],     // named places for the map.
  build(api){ const g=new THREE.Group(); ...; return g; },  // ALL visuals of the island: terrain (use FW.heightfield(this,{...})), buildings, props, plants.
  update(t,dt,cam){ }   // optional per-frame animation (keep it cheap; you can skip work when cam is far).
});
```
`api` passed to build: `{ THREE, FG, FW, solid(x,z,r), solidBox(x,z,w,d,yaw), heightAt }`
- `solid(x,z,r)` / `solidBox(x,z,w,d,yaw)`: register circles/boxes the player can't walk through (buildings, big rocks, statues, tree trunks you care about). Walkable surfaces like piers/walkways/bridges over water must be described by `walk` (below).
- Piers, plank walkways, bridges over water: add `walk:[{x,z,w,d,yaw,y}]` to the def (boxes the player can stand on at height y even though the ground below is water).
- Stairs/paths up mountains: just make height() itself form the path/ramp (the player walks on height()).
**HARD performance budget (the game MUST run on the cheapest school Chromebook — this matters more than looks):** per island ≤ 25k triangles total (terrain included), ≤ 20 meshes/draw calls (merge static props with FW.mergeParts / FG.merge, use InstancedMesh for repeats), terrain res ≤ 120, MeshLambertMaterial or MeshBasicMaterial only (no MeshStandard/Physical, no custom shaders, no transparency except water/glow sprites), no textures bigger than 256px, no shadows, NO extra lights (fake glow with MeshBasicMaterial). update() must do almost nothing when the camera is > 400 away. The harness prints tris/meshes — stay under budget. Get the drama from SHAPE (silhouette, height, cliffs) and color, not from triangle count.
Make each island feel UNIQUE and dramatic with real verticality (cliffs, hills, peaks, overhang-looking rock stacks, terraces), not a low blob. Leave clear flat spots for the shop, the NPCs, the dock path, and some walkable shoreline to fish from.

## 2. Fish data — `fishing/v2/fishdata.js`
`window.FWFISH = [ {id:'coral-clownfin', n:'Clownfin', isl:'coral', tier:0..7, kg:[min,max], beh:'steady'|'darter'|'puller'|'erratic'|'tank', when:{time:'day'|'night'|null, wx:['rain','fog','wind','storm','clear']|null, event:'meteor'|'aurora'|'whirlpool'|'surge'|'bloodtide'|null, bait:'worm'|'cheese'|'shrimp'|'minnow'|'glow'|null, spot:'lake'|'sea'|'deep'|null}, look:{...} , d:'one-line flavour text' }, ... ]`
Tiers: 0 Common, 1 Uncommon, 2 Rare, 3 Epic, 4 Legendary, 5 Mythic, 6 Divine, 7 Secret. Price is computed by the game from tier only (same on every island).
`look` schema (the fish model builder implements it): `{k:'fish'|'eel'|'ray'|'shark'|'puffer'|'disc'|'long'|'blob'|'squid'|'jelly', c:0xBODY, b:0xBELLY, f:0xFINS, pat:'none'|'stripes'|'spots'|'bands'|'scales'|'gradient', pc:0xPATTERN, glow:0xEMISSIVE|0, o:opacity(0.3-1), L:length scale, H:height scale, W:width scale, tail:'fork'|'fan'|'round'|'whip'|'none', x:[extras]}` with extras from: `horn, crown, halo, spikes, whiskers, gems, frost, flame, wings, lantern, stars, shell, sail, frills, tendrils, armor, eye-glow`. NO mouths.

## 3. Rods — `fishing/v2/rods.js`
`window.FWRODS = [ {id:'rod-...', n:'...', p:price, sold:'harbor'|islandId|null, quest:'sq-<islandId>'|null, lvl:0, luck, pow, zone, cast, spd, ctl, t:'short trait', passive:{id, v, desc}|null, col:0xHEX } ]`
- luck 0..3 (gentle), pow 1..4.5 (rod strength vs fish strength), zone .18..0.42 (reel bar width), cast 9..32 (meters), spd 0..0.45 (bite speed), ctl 0..1 (how much the fish pulls the bar around; higher = steadier).
- Passive ids the game supports: `night` (luck x(1+v) at night), `day`, `rain` (luck x(1+v) in rain/storm), `mut` (mutation chance x(1+v)), `size` (weights skew bigger by v), `shiny` (shiny chance x(1+v)), `isl:<id>` (luck x(1+v) at that island), `event` (luck x(1+v) during events), `lake` (luck x(1+v) in lakes), `deep` (luck x(1+v) in open sea far from land), `xp` (XP x(1+v)), `money` (sell value x(1+v)), `tension` (line snaps less: v 0..1).
- Quest-only rods (sold:null): `rod-tidecaller` quest `sq-mire`, `rod-frostfang` quest `sq-frost`, `rod-sunspear` `sq-dunes`, `rod-emberlash` `sq-ember`, `rod-starweaver` `sq-sky`, `rod-elderroot` `sq-elder`, `rod-reefsong` `sq-coral`, `rod-prismheart` `sq-crystal`, `rod-hollowlight` `sq-grotto`.

## 4. Reel fight — `fishing/v2/reel.js`
`window.FR = { start(o), update(dt, holding), abort(), active }` where `o = {name, tier, kg, rel(0..1.5 size in range), need(strength), beh, rod:{pow,zone,ctl,passive}, env:{storm:bool}, big:bool}`. `update` returns `null` while fighting or `{win:true|false, perfect:bool, snapped:bool}` when over. FR owns its own DOM (create it on first start; remove/hide on end) and must look good and be readable on a 1366x768 Chromebook screen; input `holding` = mouse/space held. Fish behaviour types must feel different. Strength vs power must matter (too strong = very hard, line tension can snap).

## 5. World events — `fishing/v2/events.js`
`window.FE = { now(t?) -> [{id, n, ico, isl|null, x,z,r|null, until, desc}], luckAt(x,z) -> multiplier, build(scene), update(t,dt,cam), feedText(ev) }`. Event ids: `surge` (rare-fish surge at one island, +luck), `whirlpool` (a whirlpool at sea; special fish inside radius), `meteor` (night only; falling stars, meteor fish), `aurora` (night, near frost; aurora fish), `bloodtide` (red sea, dangerous rare fish). Deterministic from the real clock (Date.now()) so all players share them without networking. Visuals around the given positions.

## 6. NPCs — `fishing/v2/npc.js`
`window.FN = { make(look) -> THREE.Group, LOOKS: {<npcId>: look}, place(scene, island, heightAt) (build all island.npcs), nearest(pos, maxDist) -> npc|null, talk(npcId, opts) (open dialog window), close() }`. Stylized blocky/low-poly people with distinct outfits per NPC (fisher hats, coats, robes...), idle animation, name label. Dialog window: portrait-less panel with name, text lines, and option buttons supplied by `opts.options=[{label, fn}]`.

## 7. Side quests — `fishing/v2/sidequests.js`
One multi-step quest chain per non-harbor island NPC (`npc-<id>` → quest id `sq-<id>`), rewards money/XP and the quest rod listed in §3 at the end. API: `window.SQ = { options(npcId) -> [{label, fn}], lines(npcId) -> [text], onCatch(fish, ctx{isl, spot, event, mutation, kg, tier}), onEvent(name, data), hud() -> string }`. State in `S.sq`. The Angler's 10-minute quests and the Keeper's grotto quest already exist in `fishing/quests.js` (read it, reuse its style).

## 8. Tutorial — `fishing/v2/tutorial.js`
`window.FT = { start(), on(evt, data), active() }`. Events the game sends: `spawn, move, cast, bite, catch, miss, sell, buyRod, equipRod, openBook, boat, talk:<npcId>, island:<id>`. The guide NPC (`guide`) explains steps; a step panel + an on-screen arrow pointing toward the next target (world position → screen via `camera` passed in `FT.start({camera, getTarget})`). Skippable. State in `S.tut`.

## 9. UI — `fishing/v2/ui.js` + `fishing/v2/ui.css`
New look for HUD and windows, plus `window.FUI = { renderBook(el), renderRods(el) }` (bestiary per island incl. conditions/records/hidden entries; rod collection with stats, trait, passive). Keep the existing element ids the game uses (see the main HTML).

## 10. Map — `fishing/v2/map.js`
`window.FMAP = { render(el) }` — stylized top-down map of all non-hidden islands (shape traced from each island's height()), landmarks, NPC/quest markers, events, player arrow, other players. Hidden Grotto appears only if `S.seen.grotto`.

## Testing
A harness exists: `html-main/fishing/v2/harness.html?isl=<id>&files=isl-coral.js` renders one island over a flat ocean. From the scratchpad folder `w/` run `node harness-shot.js <id> <outfile.png> [camX camY camZ lookX lookY lookZ]` to get a screenshot (three.js is served locally; no internet). Use it to check your work visually, iterate until it looks great.

## 11. Two island mechanics the owner loves (keep them)
- **Skyreach cloud fishing:** the `sky` island def adds `clouds:{y:<height>, x, z, r1, r2}` — a visible cloud sea (a soft white layer) ringing the summit at height y between radius r1 and r2 around (x,z). Casting from the summit edge onto the cloud layer counts as fishing water with spot `'cloud'`; fish with `when.spot:'cloud'` live only there, and wind weather (`wx:['wind']`) changes which cloud fish bite. The game handles the bobber landing at y.
- **Elderstone relics:** while fishing at `elder`, a catch sometimes brings up an ancient relic instead of a fish. Relics are offered at giant statues (the `elder` def adds `altars:[{x,z,n}]`, 3 statues) to permanently power up the equipped rod. Owned by `fishing/v2/relics.js`: `window.FRL = { roll(ctx{isl,spot,tier}) -> relic|null, altarHTML(altarIndex) , altarBind(el, altarIndex, rerender), rodMods(rodId) -> {luck, pow, zone, ctl, spd, passive?} , list() }`; state in `S.relics` (inventory) and `S.rodEnch` (per-rod upgrades). 5–7 original relic types with rarity; upgrades stack with caps.

## Portals (frost <-> grotto)
frost def: `portals:[{x,z,r:4,to:'grotto',need:'grotto',out:{x,z}}]` (door position on the mountain; `out` = standing spot just outside the door). grotto def: `spawn:{x:0,z:-2155}` (where you appear inside) and `portals:[{x:0,z:-2140,r:4,to:'frost'}]` (exit; the game puts you at frost's `out`).

## High quality mode (`FW.HQ`) — added Nov 19
- The owner wants two builds of every island and fish: the default Chromebook build (`FW.HQ === false`) and a denser **High quality** build for the "Pretty (gaming PC)" graphics setting.
- `world.js` sets `FW.HQ` once at load: `?hq=1` in the URL turns it on (`?hq=0` forces it off); otherwise it follows `localStorage['fishunb-gfx'] === 'high'`. In a harness, just add `?hq=1`. `FW.q(lo, hi)` returns `hi` in HQ.
- Read `FW.HQ` inside your `build()`; never change the default build's look or budget because of HQ.
- In HQ: terrain grid about 1.6–2x per axis (no visible faceting/triangles), smooth normals, more segments on round props (cylinders, cones, spheres, tubes), extra cheap detail where it helps. `FW.heightfield` already multiplies `res` by 1.6 in HQ (`o.hqRes` overrides).
- HQ budget per island: up to 90,000 triangles, build time up to about 500 ms in a harness, draw calls at most 2 more than the default build.
- Reviewers judge the HQ shots. Shoot every review view with `?hq=1` (name them `*-hq.png`) plus one default-build aerial to prove the Chromebook build still works.

## Same-island lifts (Skyreach, added Nov 19)
A portal can move the player to another spot on the SAME island: `portals:[{x,z,r:4,to:'sky',tx,tz,tyaw,need:'skylift',label:'Press E to ride the updraft',lockHint:'🔒 The updraft is still',lock:'(longer locked message)',msg:'(hint shown on arrival)'}]`.
- `tx,tz` = arrival spot (the game puts you on walkY/height there), `tyaw` = facing on arrival.
- `need` = save flag `S[need]` required (set by a side quest step). `label` = the soft prompt; `lockHint`/`lock` = prompt / message while locked.


## Tagged pools (added Nov 19)
A lake can carry a tag: `lakes:[{x,z,r,tag:'hollow'}]`. Fish with `when.spot:'hollow'` bite ONLY in that pool; normal lake fish still bite there too unless the lake has `only:true`. The book chip label for a new tag goes in ui.js `C.spot` (hollow = '🌳 Tree hollow' already exists).
