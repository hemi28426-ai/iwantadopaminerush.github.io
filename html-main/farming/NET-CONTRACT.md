# Farming Unblocked — online contract: co-op multiplayer, logins, cloud saves, leaderboard

Read `CONTRACT.md` (same folder) first: every rule there still applies (three r128, one IIFE file per module,
`FU.register`, guard other modules, no browser/audio while testing, `node --check`, no real brands,
never "Farming Simulator"). The game already works single-player; you are adding online features.

## Hard rules
- **Multiplayer is peer-to-peer only (PeerJS)**, never Supabase or any shared server. PeerJS 1.5.4 is loaded as `window.Peer`
  (cdn script in the page). Use the default PeerJS cloud broker like Unblockednite does
  (`new Peer('fu-farm-' + CODE, {debug:0})` for the host, `new Peer({debug:0})` + `peer.connect(id, {reliable:true})` to join;
  see `unblockednite/src/js/net.js` for the pattern). If `window.Peer` is missing, online features say so and the game still works.
- Logins, cloud saves and the leaderboard use the site's Supabase REST API exactly like `unblockednite/src/js/board.js`
  and `unblockednite/src/js/account.js` (same URL, publishable key, `shooter_players` accounts, `'shooter_creds'` localStorage
  entry, same password hash). Read those two files. New database functions are in `farming-setup.sql` (repo root):
  `fu_save(p_user,p_hash,p_data jsonb) → timestamptz`, `fu_load(p_user,p_hash) → {data, saved_at} | null`,
  `fu_submit_score(p_user,p_hash,p_value,p_earned,p_harvested,p_fields)`, public table `fu_scores(username, farm_value, earned, harvested, fields, updated_at)`.
  The user may not have run the SQL yet: treat 404/PGRST errors as "not set up yet", fall back quietly (local saves keep working), never spam notifications.
- Never touch an existing file you don't own (table below). Prefer **wrapping** public functions from your own file:
  `var orig = FU.x.fn; FU.x.fn = function(){ ...; return orig.apply(this, arguments); };` — always call the previous function
  (others may wrap the same one). Do wrapping inside `init` (all files are loaded by then).
- While applying something that came from the network set `FU.net.applyingRemote = true` (try/finally) so wrappers don't send it back out.

## Existing-file ownership for this round (only these edits are allowed)
| file | owner | allowed change |
|---|---|---|
| vehicles.js, player.js | netvehicles | skip physics/input for `v.netControlled`; occupancy check before entering |
| implements.js, harvest.js | netfields | skip field work / trailing / harvest / unload / sell for netControlled machines; send `cargo` updates |
| map.js | netmap | call `FU.netmap.draw(...)` hooks in minimap + full map |
| save.js | networld | `save()` does nothing while `FU.net.isClient` |
| games.html (repo root) | hubboard | add the TOP FARMERS board |
Everything else: new files only. `menu.js` has `FU.menu.addButton(where, {id, label (string|function), onClick(ctx), order, primary, visible()})`
(where `'title'|'pause'`), `FU.menu.refresh()`, `FU.menu.isTitle()`, `FU.menu.startGame(load)`. `hud.js` has `FU.hud.rightColumn`
(DOM column under money/time — append small boxes), `FU.hud.toast(text, kind)`. Script tags for every new file are already in the page.

## Network model (co-op shared farm, host-relayed star, max 8 players)
- The host plays their farm and shares a 4-letter code; friends join and play the host's farm together. Shared money.
- Host is authoritative for: money, time, crop prices, field ownership, buying/selling machines, jobs, spawns/removals.
- Each player simulates only their own farmer and the machines they are touching (the vehicle they drive, its attached tool, the trailer they unload into) and streams their state.
- Field work is applied locally by whoever does it and sent as an operation; field ops are idempotent so re-applying is safe. The host also sends full field snapshots every 12 s to fix drift.
- Clients never save the host's farm locally or to the cloud. Leaving (or the host leaving) reloads the page to the title, where Continue loads the player's own farm.

## FU.net (net.js)
`available()`, `online`, `isHost`, `isClient`, `code`, `myId` ('h' host, 'c1','c2'... clients, 'solo' offline), `name`, `color` (hex int),
`players` {id: {id, name, color, ping, host}} incl. you, `host()` → Promise(code), `join(code)` → Promise, `leave(reason)`,
`send(type, data)` (client → host; on the host: broadcast to all clients), `sendTo(id, type, data)` (host), `broadcast(type, data, exceptId)` (host),
`on(type, fn(data, fromId))`, `off`, `applyingRemote`, `setName(n)`, `setColor(c)`.
Envelope `{t, d, f}`; the host stamps `f` with the sender id. **net.js never relays by itself** — feature modules relay with `broadcast(type, d, fromId)`.
Handshake: client → `hello` {name, color, ver:1}; host → `welcome` {you, players, world: FU.networld.snapshot()}; host → all `players` {players} on every change.
Heartbeat `ping`/`pong` every 2 s (ping ms in players), drop a silent client after 10 s. Default name: `FU.account.user()` || localStorage `fu_name` || 'Farmer' + 3 digits.
G events: `netStatus` {online, isHost, code}, `netJoined` {world} (client got welcome), `netPlayerJoin` {player}, `netPlayerLeave` {player}, `netLeft` {reason}.

## Message types (type — direction — owner — data)
- `st` — every player → host → others — netplayers — {x, z, h, v (vehicle id or null), mv (moving)} at ~12 Hz
- `vs` — driver → host → others — netvehicles — {e: [entity states]} at ~15 Hz for every machine you touch:
  vehicle `{k:'v', id, x, z, h, s (speed), st (steer), w (working), c:[cropId, liters], a (attached implement id|null)}`,
  implement `{k:'i', id, x, z, h, l (lowered), sc (seedCrop), c:[cropId, liters]}`. Receivers set `ent.netControlled = performance.now() + 600`
  and interpolate; the flag expiring makes the machine a normal parked one again.
- `occ` — host → all — netvehicles — {vid, by (player id|null)} driver seat ownership; `enter`/`exit` — client → host — {vid}
- `work` — worker → host → others — netfields — {op, o} exactly the arguments of `FU.fields.work`
- `cargo` — toucher → host → others — netfields — {k:'v'|'i', id, c:[cropId, liters]}
- `snapFields` (12 s) / `snapMachines` (6 s: vehicles+implements serialize; clients add missing ids, remove extra ones, and update only machines that are not netControlled and not driven by them) / `time` (1 s: {day, hour, scale}) — host → all — networld
- `money` — client → host — netecon — {delta, reason}; `moneyTotal` — host → all — {total}
- `buyReq` {key}, `sellReq` {kind, id}, `fieldBuyReq` {id} — client → host — netecon; `spawn` {kind:'vehicle'|'implement', type, id, x, z, heading}, `remove` {kind, id}, `fieldOwned` {id} — host → all — netecon; `prices` {economy} — host → all on newDay
- `jobs` {missions: FU.missions.serialize()} — host → all — netjobs; `jobReq` {action:'accept'|'cancel', id} — client → host
- `chat` {text} client → host; host → all `chat` {from, name, color, text}; `sys` {text} host → all — chat

## New modules (file — order — owner job)
- **net.js — 3 (ui:true).** FU.net transport as above (PeerJS, codes A–Z without I/O, prefix 'fu-farm-', retries on unavailable-id, join timeout 12 s with a clear error, max 8 players, colors from a fixed palette by join order, heartbeat, clean leave, `netLeft` on host loss).
- **networld.js — 7 (ui:true).** `FU.networld.snapshot()` / `apply(world)` (money, time, fields, vehicles, implements, economy, missions in save order, under applyingRemote; joining from the title starts the game first and hides the title), periodic host snapshots + client reconcile, time sync (clients ignore their own T fast-forward), the save.js guard, reload-to-title on `netLeft` for clients (notify first).
- **netecon.js — 62.** Money authority (wrap G.spend/earn/charge on clients: apply locally + send `money`; host broadcasts `moneyTotal` ≤ 4/s), buy/sell/field-buy routing (wrap FU.economy.buy/sell and FU.fields.buy on clients → requests; host performs them and broadcasts `spawn`/`remove`/`fieldOwned`; clients create machines with the host's ids), prices on newDay.
- **netjobs.js — 66.** Jobs are the host's: host broadcasts `jobs` on change + every 10 s; clients mirror them (deserialize) and their accept/cancel become `jobReq`; disable the missions module's own progress/payout on clients (wrap its update) so nobody gets paid twice.
- **netplayers.js — 22.** Streams `st`; remote farmers (FU.models.farmer with overalls tinted to the player color) with name tags (canvas sprite), ~120 ms interpolation, hidden while driving (tag floats over their vehicle), removed on leave. `FU.netplayers.list()` → [{id, name, color, x, z, h, vehicleId}].
- **netvehicles.js — 28 (+ vehicles.js, player.js).** Seat ownership (`occ`), entering someone's machine is blocked with a notify, `vs` streaming + receiving/interpolation, attach/detach mirrored (FU.implements.attach/detach under applyingRemote), vehicles.js skips input/physics/collision for netControlled vehicles but still animates them, player.js asks `FU.netvehicles.canEnter(v)` before entering.
- **netfields.js — 52 (+ implements.js, harvest.js).** Wrap FU.fields.work → send `work`; apply incoming ops (host relays clients' ops); implements.js/harvest.js don't run work/trailing/harvest/unload/sell for netControlled machines; send `cargo` when local unloading or selling changes another machine's cargo; apply incoming `cargo`.
- **netmap.js — 93 ui (+ map.js).** Remote farmers and the machines they drive on the minimap and full map, in player colors with names.
- **nethud.js — 91 ui.** Online badge in `FU.hud.rightColumn` ("Co-op · ABCD · 3 farmers", host/you, ping, red when connection is bad) and a hold-Tab player list overlay.
- **netui.js — 95 ui.** Co-op panel: title button "Co-op with friends" (order 15) + pause button + key P in game. Your name (saved to `fu_name`; locked to the account name when signed in), Host co-op farm (from the title: Continue your farm, or start a new one, then host; in game: host the current farm), big code + copy invite link (`?join=CODE` on this page; that URL auto-opens the panel with the code filled; joining still needs a click), Join with code, player list (host can kick), Leave. Clear errors (no internet / blocked network / wrong code / farm full).
- **chat.js — 97 ui.** Enter opens a chat box while online (G.openPanel('chat') while typing; Esc cancels), last 6 lines above the minimap (left, bottom ≈ 230 px), fade after 10 s, names in player colors, simple bad-word filter, 120 chars, `FU.chat.system(text)` for join/leave/purchase lines.
- **accounts.js — 2.** `FU.account` = {URL, KEY, CREDS, headers(), creds(), user(), signedIn(), hash(u,p), signIn(u,p) → Promise('' or error text), signUp(u,p), signOut(), rpc(fn, args, keepalive) → JSON (throws {status})}, identical behavior to board.js/account.js (signed in on the site = signed in here). Emits `accountChanged` {user}.
- **accountui.js — 95 ui.** Title + pause button (label "Sign in" or "👤 name"), account panel: sign in / create account forms with errors, signed-in view (name, cloud save status from FU.cloudsave, Sign out). Never shows or logs passwords.
- **cloudsave.js — 99.** `FU.cloudsave` = {status() 'off'|'syncing'|'saved'|'error'|'setup', lastSync, push(force), pull()}. After a successful local save (wrap FU.save.save) push the saved JSON (localStorage `farming_unblocked_save_v1`) at most every 45 s (keepalive on page hide) when signed in and not a co-op client. On the title (and on `accountChanged`) pull: if the cloud save is newer than the local one (compare `savedAt`), write it to localStorage and `FU.menu.refresh()` so Continue loads it. Small status chip on the title ("☁ Cloud save ✓").
- **stats.js — 64.** `FU.stats` = {data:{earned, spent, harvested, byCrop:{}, worked:{cultivate, seed, harvest}, distance, playSeconds, fieldsBought, machinesBought, jobsDone}, farmValue() (money + 50% of owned machines' prices + owned fields' prices), ownedFields()}; hooks moneyChanged / sold / fieldBought / vehicleBought / missionComplete / fieldChanged / driving distance / play time; serialize/deserialize (save.js stores extra modules automatically).
- **leaderboard.js — 99.** `FU.leaderboard` = {submit(force), fetch(sort 'farm_value'|'earned'|'harvested', limit) → Promise(rows), status()}: submit via `fu_submit_score` when signed in and playing your own farm (not a client), every 2 min + after sales (throttled 30 s); fetch via REST `GET /rest/v1/fu_scores?select=username,farm_value,earned,harvested,fields&order=<sort>.desc&limit=50`.
- **lbui.js — 95 ui.** Key L + title button "Leaderboard" + pause button: panel with tabs Farm value / Money earned / Grain harvested, rank/name/value rows (you highlighted), "Sign in to get on the board", "Leaderboard isn't set up yet" when the table is missing, refresh, and your own stats from FU.stats.
- **hubboard (edit games.html only).** Under the Farming Unblocked card, a "🚜 TOP FARMERS" board (top 10 by farm value) in the same style as the "UNBLOCKEDNITE WINS" board, fetched from `fu_scores` the same way that board is fetched; hide quietly if the table is missing.

## Keys added
P co-op panel (netui) · Tab hold player list (nethud) · Enter chat (chat) · L leaderboard (lbui).

## Report back (≤ 8 lines)
What you built, deviations, what others must know.
