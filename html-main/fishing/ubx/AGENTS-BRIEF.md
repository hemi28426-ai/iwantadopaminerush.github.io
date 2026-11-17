# Fishing Unblocked → Unbloxed: shared brief for the plug-in agents

There are 10 plug-in agents working in parallel. The user is away, so don't ask questions; make good choices.

## The projects

Project root: `C:\Users\landh\OneDrive\Documents\iwantadopaminerush.github.io\html-main` (the user's games website).

- **Fishing Unblocked** is `html-main/fishing-unblocked.html`: three.js r128 and one big inline game script. Helpers live in `html-main/fishing/`.
- **Unbloxed** is `html-main/unbloxed.html`, the user's Roblox-style hub. It has a white Roblox-site look, R6 avatars with hats, and a currency called Bux.
  - Its Fishing Unblocked tile opens `fishing-unblocked.html?ubx=1`. That URL is "Unbloxed mode".
- **Precedent:** Trench War (`html-main/trench-war.html?ubx=1`). Players are their own Unbloxed R6 avatars and kills earn Bux. See `trench-war.html` lines 349-378 and line 364.

## Goal

In Unbloxed mode, Fishing Unblocked must feel like a Roblox game inside Unbloxed:

- You are your own R6 avatar holding a fishing rod.
- Other players see your avatar.
- Catches earn Bux.
- There is a Roblox-style menu, chat and player list.
- There is no standalone title screen.

Standalone mode (no `?ubx=1`) must stay exactly as it is.

## Plug-in system

This is already in the page. Do not edit the page.

### `window.FUX`

| Member | What it does |
|---|---|
| `FUX.on` | True in Unbloxed mode. |
| `FUX.prefix` | Lobby id prefix. |
| `FUX.add(name, fn)` | Registers a hook handler. Several plug-ins can share a hook. |
| `FUX.call(name, ...args)` | Runs all handlers and returns the first non-null result. |
| `FUX.collect(name, ...args)` | Merges the objects the handlers return. |

Errors in handlers are caught and logged once.

### Load order

Plug-in files load only in Unbloxed mode. They load at the END of the body, after the main game script, in this order:

1. `fishing/ubx/avatar.js`
2. `anim-move.js`
3. `anim-fish.js`
4. `net.js`
5. `bux.js`
6. `menu.js`
7. `chat.js`
8. `players.js`
9. `boot.js`

At load time all game globals exist. The game has not started yet: the title menu stays up until `boot.js` starts it.

### Hooks the game calls

- **`makeAvatar(color, rod, skin, who)`**: return an avatar object (the first non-null result wins). If nothing is returned, the old avatar is used.
  - `who==='me'` for your own avatar.
  - `who` is undefined for remote players. Their look arrives later through the net plug-in.
- **`onStart()`**: called right after PLAY.
  - `me.av` exists, and the game has added `me.av.label` (a yellow name sprite at y=3.6 in `av.g`).
  - Multiplayer starts right after.
- **`stExtra()`**: return an object of extra fields for your `'st'` state message.
  - The message is sent every 100 ms.
  - Core fields are `n,x,z,ry,rod,sk,b,ru,bt`. Don't reuse those names.
- **`onSt(id, r, d)`**: called for every remote `'st'` message, after the game has updated `r`.
  - `r = remotes[id] = {av,name,pos,ry,rod,rodUp,bt,boatG,last,...}`
  - `d` is the message data, including their `stExtra` fields.
- **`onCatch(f, info)`**: your catch just went into `S.bag`.
  - `f={i,kg,v,sh?}`. `FISH[f.i][0]` is the fish name.
  - `info={perfect,streak,rarity,big}`.
  - `RAR[rarity]` is one of `'Common','Uncommon','Rare','Epic','Legendary','Mythic','Divine','Secret','ABYSSAL','DUKE'`. `RCOL[rarity]` is its color.
- **`heldFish(av, m, f, fx)`**: the caught fish model `m` was just added to `av.g`. It is held up for `fx.life` seconds.
  - Every frame the FX loop does `m.rotation.y+=dt*2` and `m.position.y = fx.y0 + sin(t*4)*.1`.
  - `y0` is 3.8, or 5 for the two giants.
- **`tick(dt, T)`**: called every frame, just before drawing.

## Avatar object contract

The game uses this object. `makeAvatarOld` in `fishing-unblocked.html` (~line 290) is the reference implementation.

| Member | Meaning |
|---|---|
| `g` | Group added to the scene. The game sets `g.position` and `g.rotation.y` every frame. Rotation 0 faces +Z. |
| `rodG` | Object3D whose `rotation.x` the game writes every frame as a rod-angle SIGNAL (values below). In Unbloxed mode it is invisible; the anim plug-ins turn it into arm poses. |
| `tip` | Object3D at the visible rod's tip. The line starts at its world position. |
| `bob` | Bobber Mesh added to the scene. The game sets `visible` and `position`. |
| `line` | `THREE.Line` in the scene with 2 points. Set `frustumCulled=false`. The game updates it. |
| `setRod(i)` | Recolors the rod. `ROD_COL[i]` is the rod color. |
| `setSkin(s)` | Optional; ignore it. |
| `dispose()` | Removes everything from the scene. |
| `label` | Set by the game. |

Values the game writes to `rodG.rotation.x`:

- idle: .9
- cast: swings .9→.1→.9 over .6 s
- wait: .9
- reel: .6 plus a fast wiggle
- remote players: .7 when their line is out, else .9

The game calls `g.userData.animate(T, speed)` every frame. `speed` is in world units/s, 0 in a boat, capped at 14.

Before calling `animate`, the game sets:

```js
av.ctx = {me:1|0, boat:bool, state:'idle'|'cast'|'wait'|'bite'|'reel', t:secondsInState, speed}
```

For remote players, `state` is `r.fstate` if the net plug-in sets it.

## Extras of the Unbloxed avatar

This is the contract between `avatar.js` and the anim/net plug-ins. Code against it even before `avatar.js` exists.

- `av.rig = {c, aL, aR, lL, lR, head, body, torso, rod, hand}`
  - `c` is the `makeChar` result.
  - `rod` is the visible rod group, held in the right fist.
  - `hand` is an Object3D at the right fist.
  - R6 parts are in studs, scaled down inside `g`.
- `av.setLook(look)` rebuilds the character in another Unbloxed look. The rod, bob and line are kept.
  - `look` is the compact form `{h,t,r,l,hc,ha,hr,f,bt}`, like `cleanAv` in `trench-war.html`.
- `av.animState = {}` is free per-avatar scratch space for the anim plug-ins.
- `g.userData.animate(T,speed)` calls `FUX.call('poseMove', av, T, speed)`, then `FUX.call('poseFish', av, T)`.

## R6 and makeChar facts

`unbloxed/avatar.js` and `unbloxed/r6.js` are loaded in Unbloxed mode.

- `makeChar({head,torso,arms,legs,hairColor,hat,hair,face,sword:0,bt})` returns `{root, body, head, torso, aL, aR, lL, lR, blade, face, H, HG, sw}`.
- Remove the sword with `c.sw.parent.remove(c.sw)`.
- Units are studs:
  - The body group is at y=3, and the torso is 2 tall.
  - Shoulders are at body-local (±1.5,.5); hips at (±.5,-1).
  - Limbs pivot at their joints. Rotate `.rotation.x` to swing them.
- The avatar faces +Z. Its RIGHT side is -X: `aR` is at x=-1.5, and tools go in the right hand.
- `animate()` in `unbloxed.html` has the classic R6 walk the user approved. Copy its feel.
- The fishing world is smaller than Unbloxed's:
  - The old avatar is ~2.9 units tall, the name label sits at y=3.6, and the held fish at 3.8.
  - So scale R6 to about .6 (head top ≈ 3.1).
- Colors: fishing renders with sRGB output and ACES tone mapping, which is `avatar.js`'s default mode. Never set `UBX_LINEAR`.

## Unbloxed player data

- `localStorage 'unbloxed_av'` holds `{name, bux, head, torso, arms, legs, hairColor, hat, hair, face, bt, ...}`. It is written by `unbloxed.html` on the same origin.
- To award Bux, add to `unbloxed_av.bux` the way `ubxBux` does in `trench-war.html` (line 364).

## Game globals plug-ins may use

- Engine: `THREE`, `scene`, `camera`, `renderer`, `clock`, `step`.
- Player and world state:
  - `me` = `{pos,ry,state,t,av,inBoat,fish,...}`
  - `S` = `{name,rod,bag,streak,money,book,...}`
  - `remotes`
  - `NET` = `{id,host,lobby,conns}`
  - `started`, `keys`, `boat`
  - `charge`: the cast meter object, null when not charging; `chargePow()` gives its power.
- Networking: `netSend(type,data,to)`, `onMsg`.
- UI helpers: `addFeed(html)`, `hint(text,dur)`, `makeLabel(text,color,scale)`, `$` (= `getElementById`), `esc(html)`.
- Data: `RODS`, `ROD_COL`, `FISH`, `RAR`, `RCOL`, `rarOf(f)`, `BIGFISH(i)`.
- Effects: `emit(pos,n,color,spd,up,grav)`.

Top-level function declarations (`onMsg`, `addFeed`, `dropRemote`, `showHeldFish`, ...) are reassignable globals. If you need a hook that doesn't exist, you may wrap one: call through and keep its behavior. Say so in your report.

Game keys already in use:

| Key | Action |
|---|---|
| WASD / arrows | move |
| Space | cast / reel |
| Enter | chat input |
| E | shop / vault / angler |
| B | boat |
| M | map |
| I | bag |
| K | book |
| T | trade |
| Esc | closes windows |

## Screen zones

These zones keep plug-ins from overlapping. The viewport can be as small as ~1280x650.

| Element | Position | Owner |
|---|---|---|
| Menu button | top-left row (y 8–44), left 12 | `menu.js` |
| Chat button | top-left row (y 8–44), left 56 | `menu.js` |
| Chat window | left 12, top 52, 340x180 | `chat.js` |
| Fishing `#hud` panel (money/rod/bait/island; now at left 12, top 12, ~241x264) | moved down to top 244 | `menu.js` |
| Bux counter | top-right row (y 8–44), right 12 | `bux.js` |
| Player list | right 12, top 52, width ~250 | `players.js` |
| Game's `#bar` buttons | bottom center | keep as is |
| Hints, Shake button, reel bar | center | keep as is |

`players.js` also hides the game's `#net` lobby label at top-right and shows the server info in its own header.

## Rules

- Only create or edit YOUR files, the ones named in your task.
  - Do NOT edit `fishing-unblocked.html`, `unbloxed.html`, `trench-war.html`, `unbloxed/*.js`, or other agents' files.
  - Nine other agents write the other plug-ins at the same time. Your file must work on its own, since the others may be missing or broken.
  - Your file must fail safe: catch your errors so the game keeps working.
- Plain browser JS (no modules, no build) and the three.js r128 API. No new CDNs or libraries, and no big data.
- Look: Roblox-like but our own.
  - No Roblox logos, icons or trademarked art.
  - Use the font Montserrat; Builder Sans and Gotham are NOT allowed. If the page lacks Montserrat, add `<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800&display=swap" rel="stylesheet">` once (check first).
  - No names or art from Fisch (the Roblox fishing game).
  - Keep the fishing gameplay and the existing fishing HUD as they are, unless your task says otherwise.
- No git commits or pushes. Don't touch Roblox Studio.
- Hard time limit: 25 minutes from your start; check the time with `date`.
  - Have a working first version written by ~12 minutes, then refine.
  - At 25 minutes, stop and report.

## Testing

- **Server:** use ONLY the muted test server `http://localhost:8780/`. It serves `html-main` with audio muted. Opening the game any other way plays sound on the user's PC.
  - Unbloxed-mode test URL: `http://localhost:8780/fishing-unblocked.html?ubx=1&offline=1` (`offline` = no multiplayer).
  - For multiplayer tests, drop `offline=1` and add `&lobby=<yourtask><random digits>`. That is a private lobby; never use the public one.
- **Browser:** use the built-in browser tools (`mcp__Claude_Browser__*`; load them with ToolSearch if they are deferred).
  - Open ONE tab of your own with `tabs_create` and pass its `tabId` on EVERY call.
  - Never touch other tabs, and close yours when you are done.
- **Driving the game:** the browser pane is hidden, so `requestAnimationFrame` doesn't run and screenshots are stale.
  - Start the game with JS, then wait for `started`. Once `boot.js` exists, the game may start by itself.
    ```js
    [...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='PLAY').click()
    ```
  - Step frames by hand. Keep N ≤ 600 per call, and restore `requestAnimationFrame` afterwards.
    ```js
    window.requestAnimationFrame=()=>0;
    clock.getDelta=function(){this.elapsedTime+=1/60;return 1/60};
    for(let i=0;i<N;i++)step();
    ```
  - To cast and catch:
    1. Run `castTarget=()=>me.pos.clone().add(new THREE.Vector3(6,0,0)); tryCast(.9)`.
    2. Step ~40 frames → state `'wait'`.
    3. Set `me.wait=0` and step 1 frame → a bite starts the reel (state `'reel'`).
    4. Set `reel.p=1` and step → the fish is caught.
- **Seeing the result:**
  1. Right after `step()`, in the same JS call and before any `await`, `drawImage(renderer.domElement)` into a 2D canvas. You can draw DOM overlays on top yourself, e.g. through an SVG foreignObject image.
  2. POST `canvas.toDataURL('image/jpeg',.85)` as the request body to `http://127.0.0.1:8794/?f=<task>-<name>`.
  3. The image is saved as `C:\Users\landh\AppData\Local\Temp\claude\48832ff3d0995ee8\fc20c45b-f989-4a12-a385-6ebfd1d8a03a\scratchpad\fish-shots\<task>-<name>.jpg`. Look at it with the Read tool.
  - Check close-ups of anything visual before calling it done. The user is picky: "it HAS to be perfect".
- **Test data:** `localStorage` on `localhost:8780` is test-only. You may set `'unbloxed_av'` there, e.g. `{"name":"Tester","bux":0,"head":"#f5c99b","torso":"#e74c3c","arms":"#f5c99b","legs":"#2c3e50","hairColor":"#8d5524","hat":3,"hair":2,"face":1}`.

## Report

Keep it short:

- The files you wrote.
- What works and how you tested it, with shot file names.
- Known issues.
- Hooks you used and any globals you wrapped.
