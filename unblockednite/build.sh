#!/usr/bin/env bash
# Bundles src/ (and the packed V1 model) into one self-contained Unblockednite.html.
set -e
cd "$(dirname "$0")"
FILES="util audio textures physics world items build fx travel crowns skins anims emotes guns chars profile player bots storm boss powers events net board account hud lobby game hangout ultronmode lebron"
LIBS='<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/utils/SkeletonUtils.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/meshopt_decoder.js"></script>
<script src="https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js"></script>'
mkdir -p dist
node tools/pack-model.js models/v1/scene.gltf dist/model-v1.js V1_GLB
node tools/pack-model.js weapons/scene.gltf dist/model-weapons.js WEAPONS_GLB
if [ -d dist/props ]; then node tools/pack-props.js; fi
if [ -d models/ground ]; then node tools/pack-ground.js; fi
{
  echo "$LIBS"
  echo "<script>"
  cat dist/model-v1.js dist/model-weapons.js
  if [ -f dist/skins.js ]; then cat dist/skins.js; fi
  if [ -f dist/anims.js ]; then cat dist/anims.js; fi
  if [ -f dist/fnemotes.js ]; then cat dist/fnemotes.js; fi
  if [ -f dist/emote-music.js ]; then cat dist/emote-music.js; fi
  if [ -f dist/fnloco.js ]; then cat dist/fnloco.js; fi
  if [ -f dist/props.js ]; then cat dist/props.js; fi
  if [ -f dist/ground.js ]; then cat dist/ground.js; fi
  for f in $FILES; do echo "// ---- $f.js ----"; cat "src/js/$f.js"; echo; done
  echo "</script>"
} > dist/scripts.part
HEAD_END=$(grep -n '</style>' src/page.html | head -1 | cut -d: -f1)
{
  echo '<!doctype html>'
  echo '<html lang="en">'
  echo '<head>'
  echo '<meta charset="utf-8">'
  echo '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
  head -n "$HEAD_END" src/page.html
  echo '</head>'
  echo '<body>'
  tail -n +"$((HEAD_END + 1))" src/page.html
  cat src/lobby.html
  cat dist/scripts.part
  echo '</body>'
  echo '</html>'
} > Unblockednite.html
rm dist/scripts.part
echo "Built Unblockednite.html ($(wc -c < Unblockednite.html) bytes)"
