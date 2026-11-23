# fishx: per-species fish looks

Each file `fishx/<group>.js` belongs to one island group. Edit ONLY your own file.

## Two tools
- `L[id] = { ...look patch }` merges into `fish.look` before build. Keys you can use are the same as fishdata looks: k (body kind: fish, eel, ray, shark, puffer, disc, long, blob, squid, jelly), c / b / f (main, belly, fin colours), pat / pc (pattern + pattern colour), glow, L / H / W (length/height/width), tail, x (extras array: gems, eye-glow, clear, armor, wings, spikes, frills, halo, fog, storm, crown, wind, tendrils, flame, stars, sail, frost, rain, horn, whiskers, shell, lantern, chain, braids).
- `B[id] = function (a) { ... }` adds custom geometry after the base body is built. `a` gives you:
  - buffers: `a.fins`, `a.solid`, `a.glowA` (emissive), `a.tailA`, `a.tubesA`. Each has `.tri(p1,p2,p3,col)`, `.quad(...)`, `.geo(threeGeometry, matrix4, colourOrFn)`.
  - prims `a.P` (sph, sphS, sphT, cyl, box, oct ...), matrix helper `a.M(pos, dir|null, scale[3])`, `a.Mdir`.
  - body surface: `a.surf(u, th, pad)` point on body at u (1 = nose, 0 = tail; check with a test render) and angle th; `a.nrm(u, th)`; shortcuts `a.top(u)`, `a.bot(u)`, `a.side(u, s)`; eye info `a.eyesP`, `a.er`.
  - helpers: add, sub, norm, lerp3, mix, shade, lum, chroma, tubeX, strip, f, fTip, PI, TAU, `a.rng()` (seeded), `a.look`, `a.HQ`, `a.lod`.
  - Look at the template test in fishmodel.js (search "per-species custom geometry") and the existing extras in fishmodel.js for real usage.

## Rules
- Every fish should read as its OWN creature at a glance: silhouette first, then colour/pattern, then detail. Style reference: the Sandsea Wyrm giant (fishing/v2/giants-c.js): a body designed as a creature, not a stock fish with things glued on.
- Aim for "good, clearly improved", not perfection. Don't go overboard.
- NO mouths (no jaws/teeth/lips). Keep names, ids, data, odds, prices unchanged. Don't touch abyssal angler or DUKE.
- Budget: under 1500 tris at default (or auto-LOD rebuilds it cheaper), under 6000 at HQ. Max 2 draw calls (lit + glow). No textures, no new materials.
- Keep it within the existing palette feel of its island.

## Render
`cd fishing/v2/fishx && node shoot.js <group> <outdir> side,q 0` writes `<group>-side.png`, `<group>-q.png` and a cells json (tris per fish). Read the PNGs to check your work.
