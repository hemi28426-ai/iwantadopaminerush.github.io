'use strict';
// ===== Unblockednite :: shared helpers =====
const TAU = Math.PI * 2;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// World-gen RNG (seeded) vs gameplay RNG (Math.random)
let WRNG = mulberry32(1);
const wr = (a, b) => a + (b - a) * WRNG();
const wri = (a, b) => Math.floor(wr(a, b + 1));
const wpick = (arr) => arr[Math.floor(WRNG() * arr.length)];
// Fisher-Yates shuffle in place (a sort with a random comparator isn't reliable: how many random numbers
// it uses can vary, which would make friends' islands differ). rng: WRNG for world generation.
function shuffle(arr, rng = Math.random) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

const rand = (a, b) => a + (b - a) * Math.random();
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr, rng = Math.random) => arr[Math.floor(rng() * arr.length)];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const dist2D = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

function wrapAngle(a) {
  while (a > Math.PI) a -= TAU;
  while (a < -Math.PI) a += TAU;
  return a;
}

function weightedPick(weights, rng = Math.random) {
  let total = 0;
  for (const w of weights) total += w;
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r <= 0) return i; }
  return weights.length - 1;
}

function fmtTime(s) {
  s = Math.max(0, Math.ceil(s));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

// ----- Seeded 2D Perlin noise -----
class Perlin {
  constructor(seed) {
    const r = mulberry32(seed);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
    this.perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }
  grad(h, x, y) {
    switch (h & 7) {
      case 0: return x + y; case 1: return -x + y; case 2: return x - y; case 3: return -x - y;
      case 4: return x; case 5: return -x; case 6: return y; default: return -y;
    }
  }
  noise(x, y) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = x * x * x * (x * (x * 6 - 15) + 10), v = y * y * y * (y * (y * 6 - 15) + 10);
    const P = this.perm;
    const aa = P[P[X] + Y], ab = P[P[X] + Y + 1], ba = P[P[X + 1] + Y], bb = P[P[X + 1] + Y + 1];
    const x1 = lerp(this.grad(aa, x, y), this.grad(ba, x - 1, y), u);
    const x2 = lerp(this.grad(ab, x, y - 1), this.grad(bb, x - 1, y - 1), u);
    return lerp(x1, x2, v) * 0.7071;
  }
  fbm(x, y, oct = 5, lac = 2, gain = 0.5) {
    let a = 1, f = 1, s = 0, n = 0;
    for (let i = 0; i < oct; i++) { s += a * this.noise(x * f, y * f); n += a; a *= gain; f *= lac; }
    return s / n;
  }
}

// ----- Settings (persisted per browser when storage is available) -----
// ---- loading screen (boot progress and match loading) ----
const LOADING = {
  TIPS: [
    'Walk over a better copy of a gun you carry and it swaps in automatically.',
    "Bosses drop their powers when they go down. Powers stack, but holding them puts you on everyone's map.",
    'In Reload every boss is already on the island when you drop. Loot up before you take them on.',
    'Chests in Reload are mostly Epic and Legendary. Open everything.',
    'Meteor showers are marked on your map. Get out of the circle or get under cover.',
    'Supply drops fall into the safe zone with Legendary loot inside.',
    "Doom's airship crash has a vault with a Mythic weapon. Everyone will be heading there.",
    'Press Q to switch between building and your weapons. Z X C V place walls, floors, ramps and roofs.',
    'Zero Build turns off building for everyone, bots included. Pick it in the mode list.',
    'Press E at a car to drive it. Launch pads throw you back into the sky.',
    "In Duos and Squads, grab a fallen teammate's Reboot Card and bring it to a Reboot Van.",
    'Party up with friends using a 4-letter code. The host picks the mode.',
    'Hidden golden chests glow with a tall beam. They hold Mythic weapons.',
    'Storm surges make the circle close early and hurt more. Keep moving.',
    'The shop rotates every day: 3 skins and 10 emotes.',
  ],
  set(frac, label) {
    const f = document.getElementById('ls-fill'), b = document.getElementById('ls-bus'), bar = document.getElementById('ls-bar'), st = document.getElementById('ls-step');
    if (!f) return;
    bar.classList.remove('busy');
    const pct = Math.round(clamp(frac, 0, 1) * 100) + '%';
    f.style.width = pct; b.style.left = pct;
    if (label) st.textContent = label;
  },
  tip() { const t = document.getElementById('ls-tip'); if (t) t.innerHTML = '<b>TIP</b>' + this.TIPS[Math.floor(Math.random() * this.TIPS.length)]; },
  // a match is being built: mode and size up top, a bar that keeps moving while the island generates
  match(title, sub) {
    const m = document.getElementById('ls-mode'), bar = document.getElementById('ls-bar'), st = document.getElementById('ls-step');
    if (!m) return;
    m.textContent = title; st.textContent = sub || 'Generating a fresh island…';
    bar.classList.add('busy'); this.tip();
  },
};

// big numbers for small stat boxes: 12,345 / 123.4K / 1.2M
function fmtBig(n) {
  n = Math.round(n);
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M';
  if (n >= 1e5) return Math.round(n / 1e3) + 'K';
  return n.toLocaleString();
}
const SETTINGS = { sens: 1.0, bots: 49, difficulty: 'normal', quality: 'high', volume: 0.6, invertY: false };
function loadSettings() {
  let saved = false;
  try {
    const s = JSON.parse(localStorage.getItem('unblockednite_settings') || '{}');
    saved = 'quality' in s;
    Object.assign(SETTINGS, s);
  } catch (e) { /* storage unavailable */ }
  // Chromebooks start in Performance mode until someone picks a graphics setting
  if (!saved && /CrOS/.test(navigator.userAgent)) SETTINGS.quality = 'perf';
}
// Performance mode (for Chromebooks and slow laptops): lower resolution, no shadows or antialiasing,
// fewer trees, shorter view distance, far-away players drawn less often
const PERF = { get on() { return SETTINGS.quality === 'perf'; } };
function saveSettings() {
  try { localStorage.setItem('unblockednite_settings', JSON.stringify(SETTINGS)); } catch (e) { /* ignore */ }
}

// ----- Fun name generator for bots -----
const NAME_A = ['Sneaky', 'Turbo', 'Hall', 'Lunch', 'Recess', 'Homework', 'Pencil', 'Locker', 'Sweaty', 'Cracked', 'Lazy', 'Default', 'Noob', 'Pro', 'Silent', 'Toxic', 'Chill', 'Spicy', 'Cosmic', 'Mega', 'Tiny', 'Big', 'Captain', 'Doctor', 'Sir', 'Glitchy', 'Laggy', 'Hyper', 'Frosty', 'Rusty'];
const NAME_B = ['Pass', 'Lady', 'Monitor', 'Builder', 'Sniper', 'Goblin', 'Ninja', 'Potato', 'Waffle', 'Noodle', 'Taco', 'Llama', 'Gamer', 'Eraser', 'Ruler', 'Crayon', 'Backpack', 'Teacher', 'Janitor', 'Bus', 'Panda', 'Shark', 'Pickle', 'Toast', 'Bean', 'Wizard', 'Dragon', 'Moose', 'Badger', 'Cactus'];
function botName() {
  const style = Math.random();
  const a = pick(NAME_A), b = pick(NAME_B);
  if (style < 0.35) return a + b + randi(1, 999);
  if (style < 0.55) return 'xX_' + a + b + '_Xx';
  if (style < 0.75) return a.toLowerCase() + '_' + b.toLowerCase();
  if (style < 0.9) return b + 'Main' + randi(10, 99);
  return 'TTV_' + a + b;
}
