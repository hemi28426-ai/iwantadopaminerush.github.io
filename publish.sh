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
for p in games.html index.html profile.html html-main Update.html publish.sh unblockednite/Unblockednite.html unblockednite/lebron-intro.mp4; do [ -e "$p" ] && git add -A "$p"; done
node -e '
const fs = require("fs"), crypto = require("crypto"), { execSync } = require("child_process");
const files = execSync("git ls-files -c", { encoding: "utf8" }).split("\n").filter((f) => f && f !== "update-manifest.json" && !f.startsWith(".parts/") && fs.existsSync(f));
const out = { version: new Date().toISOString().slice(0, 16).replace("T", " "), files: {} };
// jsDelivr refuses files over 20 MB: big ones also go up in 15 MB pieces under .parts/ (Update.html joins them)
fs.rmSync(".parts", { recursive: true, force: true });
const PART = 15 * 1048576;
for (const f of files) {
  const b = fs.readFileSync(f); out.files[f] = [crypto.createHash("sha1").update(b).digest("hex").slice(0, 16), b.length];
  if (b.length > 19 * 1048576) {
    const n = Math.ceil(b.length / PART); out.files[f].push(n);
    fs.mkdirSync(require("path").dirname(".parts/" + f), { recursive: true });
    for (let i = 0; i < n; i++) fs.writeFileSync(".parts/" + f + "." + i, b.subarray(i * PART, (i + 1) * PART));
  }
}
fs.writeFileSync("update-manifest.json", JSON.stringify(out));
console.log("manifest:", files.length, "files, version", out.version);
'
git add -A .parts update-manifest.json
git commit -m "$MSG" || git diff --cached --quiet || exit 1
git push
# point latest.json at this exact commit: the updater downloads everything by commit, which CDNs never serve stale
echo "{\"commit\":\"$(git rev-parse HEAD)\"}" > latest.json
git add latest.json && git commit -m "latest -> $(git rev-parse --short HEAD)" && git push
curl -s "https://purge.jsdelivr.net/gh/hemi28426-ai/iwantadopaminerush.github.io@main/latest.json" > /dev/null || true
echo "Published. Everyone can press Update now."
