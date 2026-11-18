#!/usr/bin/env bash
# One-button publish: rebuild Unblockednite, write update-manifest.json (every site file + its hash, read by
# Update.html), commit, push, and clear the CDN cache so everyone's updater sees it right away.
# Usage: bash publish.sh "what changed"
set -e
cd "$(dirname "$0")"
MSG="${1:-Update site}"
if [ -f unblockednite/build.sh ]; then (cd unblockednite && bash build.sh | tail -1); fi
# every tracked change (edits and deletions) plus the site's new files; a missing path doesn't stop the rest
git add -u
for p in games.html index.html profile.html html-main Update.html autoupdate.js publish.sh unblockednite/Unblockednite.html unblockednite/lebron-intro.mp4; do [ -e "$p" ] && git add -A "$p"; done
git commit -q -m "$MSG" || true
# GitHub may have commits this computer doesn't (edits made online). Bring them in first so the push isn't
# refused; where both changed the same lines, this computer's version wins.
git fetch -q origin main
if ! git merge -q --no-edit -X ours origin/main; then
  echo "Could not merge GitHub's newer changes automatically. Fix the conflicts (git status), commit, then run publish.sh again."
  exit 1
fi
node -e '
const fs = require("fs"), crypto = require("crypto"), path = require("path"), { execSync } = require("child_process");
const git = (cmd, opts) => execSync("git " + cmd, { encoding: "utf8", maxBuffer: 64 << 20, ...opts });
// dealfinder/ is a separate download (a 71 MB .exe), not part of the site the updater keeps in sync
const skip = (f) => !f || f === "update-manifest.json" || f.startsWith(".parts/") || f.startsWith("dealfinder/");
const files = git("ls-files -c").split("\n").filter((f) => !skip(f) && fs.existsSync(f));
const out = { version: new Date().toISOString().slice(0, 16).replace("T", " "), shards: [], files: {} };
// jsDelivr refuses files over 20 MB: big ones also go up in 15 MB pieces under .parts/ (Update.html joins them)
fs.rmSync(".parts", { recursive: true, force: true });
const PART = 15 * 1048576;
for (const f of files) {
  const b = fs.readFileSync(f); out.files[f] = [crypto.createHash("sha1").update(b).digest("hex").slice(0, 16), b.length, 0];
  if (b.length > 19 * 1048576) {
    const n = Math.ceil(b.length / PART); out.files[f][2] = n;
    fs.mkdirSync(path.dirname(".parts/" + f), { recursive: true });
    for (let i = 0; i < n; i++) fs.writeFileSync(".parts/" + f + "." + i, b.subarray(i * PART, (i + 1) * PART));
  }
}
git("add -A .parts");
// jsDelivr also refuses a whole repo over 50 MB, so the site goes up a second time split into "shards":
// small commits (branches updater-shard-N) of about 35 MB each that jsDelivr will serve file by file.
// They reuse the same stored files, so this costs almost nothing in the repo.
const blob = {};
for (const line of git("ls-files -s").split("\n")) { const m = line.match(/^(\d+) ([0-9a-f]+) \d\t(.*)$/); if (m) blob[m[3]] = [m[1], m[2]]; }
const LIMIT = 35 * 1048576, shards = [];
let cur = null;
for (const f of Object.keys(out.files).sort()) {
  const [, size, parts] = out.files[f];
  const items = parts ? Array.from({ length: parts }, (_, i) => ".parts/" + f + "." + i) : [f];
  if (!cur || (cur.bytes + size > LIMIT && cur.items.length)) shards.push(cur = { items: [], bytes: 0 });
  cur.items.push(...items); cur.bytes += size; out.files[f][3] = shards.length - 1;
}
const idx = git("rev-parse --git-path updater-index").trim();
shards.forEach((s, i) => {
  const env = { ...process.env, GIT_INDEX_FILE: idx };
  fs.rmSync(idx, { force: true });
  git("update-index --add --index-info", { env, input: s.items.filter((p) => blob[p]).map((p) => blob[p][0] + " " + blob[p][1] + " 0\t" + p).join("\n") + "\n" });
  const tree = git("write-tree", { env }).trim();
  out.shards.push(git("commit-tree " + tree + " -m \"updater shard " + i + "\"").trim());
});
fs.rmSync(idx, { force: true });
fs.writeFileSync("update-manifest.json", JSON.stringify(out));
fs.writeFileSync(".git/updater-shards", out.shards.map((c, i) => "+" + c + ":refs/heads/updater-shard-" + i).join("\n"));
console.log("manifest:", files.length, "files in", shards.length, "shards, version", out.version);
'
git add -A .parts update-manifest.json
git commit -q -m "$MSG (manifest)" || git diff --cached --quiet || exit 1
# shards first (the manifest points at them), then the site itself
git push -q origin $(cat .git/updater-shards)
git push origin HEAD:main
# point latest.json at this exact commit: the updater downloads everything by commit, which CDNs never serve stale
echo "{\"commit\":\"$(git rev-parse HEAD)\"}" > latest.json
git add latest.json && git commit -q -m "latest -> $(git rev-parse --short HEAD)" && git push -q origin HEAD:main
curl -s "https://purge.jsdelivr.net/gh/hemi28426-ai/iwantadopaminerush.github.io@main/latest.json" > /dev/null || true
echo "Published. Everyone can press Update now."
