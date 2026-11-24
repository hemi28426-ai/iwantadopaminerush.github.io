# Smack Island — shared brief for the 10 plug-in agents

Ten agents work in parallel. The user is away: don't ask questions, make good choices.

## The game

Project root: `C:\Users\landh\OneDrive\Documents\iwantadopaminerush.github.io\html-main` (the user's games website).
Unbloxed (`html-main/unbloxed.html`) is the user's Roblox-style hub. Its games are "modes" running on one shared engine:
- R6 avatars
- 16-stud walking, jumping, knockback, kill feed and Bux
- bots
- P2P multiplayer

**Smack Island** is a new original mode, a slap-fight game.
- You spawn in a safe beach hut on a tropical island in the sea and pick a glove.
- Then you walk out and slap other players and bots.
- A slap does no damage. It is a big knockback (shove + lift) and a short stun.
- Getting knocked off the island into the water (or the void) is a KO ("smacked out"). The last slapper gets the KO, called a "Smack", and Bux.
- Gloves have different power/speed/reach, and many have an ability on E.
- Gloves unlock with total Smacks or are bought with Bux.

**Originality is required.** This is a game in the slap-battle genre. It must NOT recreate Slap Battles (the Roblox game).
- Never use its name, items, maps or signature features.
- Banned glove names (theirs): Default, Diamond, ZZZZZZZ, Extended, Brick, Snow, Pull, Flash, Spring, Swapper, Bull, Dice, Ghost, Thanos, Stun, Za Hando, Fort, Magnet, Pusher, Anchor, Space, Boomerang, Speedrun, Mail, Golden, MR, Reaper, Replica, Defense, Killstreak, Reverse, Shukuchi, Duelist, Woah, Ice, Adios, Blocked, Engineer, Rocky, Conveyor, STOP, Phantom, Wormhole, Acrobat, Plague, Bus, Phase, Kinetic, Cloud, Bomb, Glitch, Snowball, Hammer, Overkill, Rhythm, Nightmare, Sparky, Charge, Tycoon, Bubble, Jet, Orbit, Grapple, Hitman, Booster, Tableflip, Counter, Lamp, Pocket, Hybrid, Tinkerer.
- Banned features: Slapples, Cannon Island, a cube of death, a glove-stand lobby that copies theirs, and their badges.
- Our gloves have our own names, looks and abilities, themed on our island.
- Also no Roblox logos, icons or trademarked art. The font is Montserrat; Builder Sans and Gotham are not allowed.

## Engine facts (unbloxed.html globals; read the code around lines 640-900)

- `scene` is reassigned per mode by `skyScene(bool)`. Also `sun`, `cam` (the camera), `R` (the renderer), `chars` (all characters), `me`, `GAME` (mode id), `mode` (`'hub'` or `'game'`), `K` (keys down by `e.code`), `camYaw`/`camPitch`/`camDist`, `av` (your saved avatar incl. `av.bux`), `esc()`, `$()` (getElementById), `toast()`, `log(html)` (kill feed), `addBux(n)`.
- `spawn(a,bot)` and `spawnBot(i)`: bots are always named `'🤖 '+name`. Never pass bots off as real players.
- `respawn(o)` uses `MODES[GAME].spawnFor(o)`.
- `physics(o,dt,mx,mz,jump,sprint)`:
  - walk 16 studs/s, sprint 24, jump `vel.y` 19.5, gravity 34
  - velocity approaches the input at 9/s on the ground and 2.7/s in the air, so a velocity impulse (knockback) decays naturally
  - AABB collision against `near(x,z)` boxes
  - `pos.y < -160` → `knock`
- `attack(o)` is called on click (and by bots). If `MODES[GAME].attack(o)` returns `false`, the default sword logic is skipped.
- `knock(t,by)`:
  - sets `t.ko = 2.5` s, then respawns
  - `by.kills++`
  - `addBux(5)` when `by === me`
  - writes a kill-feed line
  - announces through `UBXNET.ko` when online
- `animate(o,dt)` runs classic R6 code animations, with the `UBXA` plug-in hooks `UBXA.slash(c,f,o)` / `UBXA.lunge` / `UBXA.trail` for swings.
- Collision: `addSolid(THREE.Box3)` adds a box. Reset with `solids.length=0; GRID.clear();`.
- Other per-mode state: `SPAWNS`, `PORTALS`, `pickups`.
- Hub tiles: `LIST`, `SOON`, `cards()`, `joinServer(id, card, startFn)`. A mode pushes its own LIST entry.
- **The model mode plug-in is `unbloxed/obby.js`.** Copy its structure: an IIFE, `startObby` resetting the world the way `buildHeights` does, `LIST.push`, and `window.MODES.obby = {tick, bot, spawnFor, attack}`.
- A character `o` has:
  - `a` (its look; `a.name`)
  - `c` (makeChar parts: `root`, `body`, `head`, `torso`, `aL`, `aR`, `lL`, `lR`, `sw` = sword group, `blade`)
  - `bot`, `net` (true for a remote online player)
  - `pos`, `vel`, `yaw`, `hp`, `ko`, `kills`, `deaths`
  - `swing` (swing anim timer), `lunge`, `cd`, `ground`
  - `shield` (spawn-bubble seconds), `spawnT`, `lastHitBy`, `target`, `think`
- R6 rig facts (unbloxed/avatar.js):
  - The avatar faces +Z and its RIGHT side is -X: `aR` is at body-local x=-1.5 and is the glove hand.
  - Limbs pivot at their joints (shoulders at (±1.5,.5), hips at (±.5,-1)). Rotate `.rotation.x` to swing.
  - The fist is about 2 studs below the shoulder.
  - Hide the sword with `c.sw.visible=false`.
- Multiplayer: `unbloxed/net.js` (`UBXNET`, PeerJS host/client rooms). Remote characters have `o.net`.
  - The default `attack()` forwards hits on remote characters with `UBXNET.hit`, and the victim's own screen applies them (`applyHit`).
  - Heights already works online. The smack-net agent makes Smack Island work.

## SMACK API (unbloxed/smack-api.js, already written; read it)

```
SMACK.add(name, fn) / SMACK.call / SMACK.collect / SMACK.every   (hooks, like the code in smack-api.js)
SMACK.addGlove(def)   SMACK.gloves (array)   SMACK.byId
```

**Glove definition** (defaults are filled in by `addGlove`):

```
{id, name, desc, color, color2?, unlock:{smacks:N} or {bux:N}, power (1 = normal knockback), cooldown (s, default .8),
 reach (studs, default 5), speed (walk x, default 1), build?(THREE) -> Object3D (custom glove mesh; else the default builder),
 onSlap?(o,t,hit) -> change hit or return false, ability?:{name, cooldown, use(o) -> true if it was used},
 passive?:{tick(o,dt)}, onEquip?(o), onUnequip?(o)}
```

**The hit object** (built by smack.js, passed to hooks and `onSlap`):

```
{dir: THREE.Vector3 (unit, horizontal, attacker → target), kb (horizontal speed added; default 36 * power),
 up (vertical speed; default 15), stun (s; default .9), glove (id), power}
```

**Functions smack.js provides** (other plug-ins may call them; check they exist first):

- `SMACK.start()` (also `window.startSmack`)
- `SMACK.equip(o, id)`, `SMACK.gloveOf(o)` → def
- `SMACK.slap(o)` (the attack)
- `SMACK.applyHit(t, from, hit)` applies knockback/stun to a LOCAL character (me or a local bot)
- `SMACK.useAbility(o)`, `SMACK.inSafe(o)`
- `SMACK.save` = `{smacks, owned:[ids], equipped}`, `SMACK.saveNow()`, `SMACK.owned(id)`, `SMACK.unlock(id)`
- `SMACK.info` = whatever `SMACK.map.build()` returned

**Fields on characters** in smack mode:

- `o.glove` (id)
- `o.stun` (s; no moving or attacking while > 0)
- `o.abilityCd` (s)
- `o.lastHitT` (`performance.now()` of the last hit taken)

**Set by other plug-ins:**

| Field | Set by | What it is |
|---|---|---|
| `SMACK.map = {build()}` | smack-map.js | `build()` creates the island in the current scene and returns `{spawns:[V3] (inside the hut), arena:[V3] (spots around the island for bots), safe:{x,z,r}, waterY, killY, center:{x,z}, radius}` |
| `SMACK.bot = function(o,dt)` | smack-bots.js | Bot brain; must call `physics()` itself |
| `SMACK.sendHit(o,t,hit)` | smack-net.js | Forwards a slap on a remote character `t` |

**Hooks** (`SMACK.call`/`every` from smack.js, others add handlers):

| Hook | When it fires |
|---|---|
| `'start'()` | Mode started (map built, me spawned) |
| `'stop'()` | Leaving the mode |
| `'tick'(dt)` | Every frame in smack mode |
| `'beforeSlap'(o,t,hit)` | Before a slap lands (`every`: any false cancels) |
| `'slap'(o,t,hit)` | A slap landed |
| `'whiff'(o)` | A swing hit nobody |
| `'ko'(t,by)` | Someone was smacked out (`by` may be null) |
| `'equip'(o,glove)` | A glove was put on |
| `'ability'(o,glove)` | An ability was used |
| `'gloveAdded'(g)` | A glove was registered |
| `'openPicker'()` | The glove picker should open (smack-ui.js handles it) |

**Load order** (script tags already in unbloxed.html; a missing file is skipped):

1. smack-api
2. smack-map
3. smack
4. smack-gloves
5. smack-gloves-a, smack-gloves-b, smack-gloves-c
6. smack-ui
7. smack-bots
8. smack-fx
9. smack-net

All of them load after unbloxed.html's main script and after unbloxed/net.js. Files load before the mode starts: gloves register at load; most other work happens on `'start'`.

## Rules

- **File ownership.** Only create or edit YOUR files, the ones named in your task.
  - Do NOT edit unbloxed.html or other agents' files. (smack-net is the only agent allowed to make small, additive edits to unbloxed/net.js.)
  - Never touch html-main/fishing* or html-main/fishing/; other agents are working there.
- **Fail safe.** Your file must work alone, because the others may be missing or broken, and must catch its own errors. The hub and the other modes must keep working.
- **Code style.** Plain browser JS (no modules or build), three.js r128, no new libraries or CDNs. Sounds are made with WebAudio, never sound files.
- **Look.** Roblox-like (smooth plastic parts, bright colors), but our own.
  - Smooth and rounded, never faceted/low-poly creatures; the user hates those.
  - No mouths or teeth on fish.
  - Code animations only; no imported animation clips.
- **No git commits or pushes. Don't touch Roblox Studio.**
- **Time limit: 25 minutes** from your start (check with `date`). Have a working first version by ~12 min, then polish. At 25 min, stop and report.

## Testing

- **Use ONLY the muted test server** `http://localhost:8780/unbloxed.html` (audio is muted there; any other way plays sound on the user's PC).
- **Browser tools.** Use the built-in browser tools (`mcp__Claude_Browser__*`; load them with ToolSearch if deferred).
  - Open ONE tab of your own with `tabs_create` and pass its `tabId` on EVERY call.
  - Never touch other tabs. Close yours when done.
- **Starting the mode.** After load, call `startSmack()` from JS (or click the tile). Until smack.js exists, test your part with a small harness in your tab; don't ship the harness.
- **Stepping frames.** The pane is hidden, so `requestAnimationFrame` doesn't run. Step the loop by hand: `window.requestAnimationFrame=()=>0; let t=performance.now(); for(let i=0;i<N;i++){t+=1000/60; loop(t);}` (keep the fake clock ≥ `performance.now()`; N ≤ 600 per call; restore rAF afterwards). Press keys by setting `K.KeyW=1` etc.; click-attack by calling `attack(me)`.
- **Capturing frames.** Right after `loop()`, in the same JS call and before any await:
  1. `drawImage(R.domElement)` into a 2D canvas (draw DOM overlays yourself if needed).
  2. POST `canvas.toDataURL('image/jpeg',.85)` as the body to `http://127.0.0.1:8794/?f=smack-<task>-<name>`.
  3. It is saved as `C:\Users\landh\AppData\Local\Temp\claude\48832ff3d0995ee8\fc20c45b-f989-4a12-a385-6ebfd1d8a03a\scratchpad\fish-shots\smack-<task>-<name>.jpg`; look at it with Read.
  - Check close-ups of everything visual. The user is picky: "it HAS to be perfect".
- **Test data.** localStorage on localhost:8780 is test-only.

## Report

Keep it short:
- the files you wrote
- what works and how you tested it (shot names)
- known issues
- which hooks and functions you used or expect from others
