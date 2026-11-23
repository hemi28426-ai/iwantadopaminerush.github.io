// Fishing Unblocked: rotating Angler quests + the Keeper quest (Frostpeak door -> Hidden Grotto).
// Classic script. Top-level functions become globals. Game globals are only touched at call time.

var AQ_SLOT_MS = 600000; // a new Angler quest every 10 minutes
var AQ_SIZES = ['Large', 'Huge', 'Giant', 'Colossal'];

function _aqSlot() { return Math.floor(Date.now() / AQ_SLOT_MS); }
function _aqRng(seed) { // mulberry32
  var a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    var t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function _aqPick(r, arr) { return arr[Math.floor(r() * arr.length) % arr.length]; }
function _aqInt(r, lo, hi) { return lo + Math.floor(r() * (hi - lo + 1)); }
function _aqTier(i) { var F = FISH[i]; return F ? F[1] : 8; } // the big fish are past the table end
function _aqBig(i) { return typeof BIGFISH === 'function' && BIGFISH(i); }
function _aqSave() { if (typeof save === 'function') save(); }
function _aqState() {
  if (!S.aq || typeof S.aq !== 'object') S.aq = { cur: null, claimed: -1 };
  if (!('claimed' in S.aq)) S.aq.claimed = -1;
  return S.aq;
}
function _aqIslandIdx(B, k) { return typeof B.i === 'number' ? B.i : k; }
// islands that fit the player's level: open (no missing vault key), not hidden, not too rich for their level
function _aqIslands(lvl) {
  var cap = lvl < 8 ? 1.6 : lvl < 16 ? 2.3 : lvl < 30 ? 3.3 : Infinity, out = [];
  for (var k = 0; k < BIOMES.length; k++) {
    var B = BIOMES[k];
    if (!B || B.hidden || !unlocked(B)) continue;
    if ((B.mult || 1) <= cap) out.push(_aqIslandIdx(B, k));
  }
  if (!out.length) out.push(0);
  return out;
}
function _aqBiome(bi) {
  for (var k = 0; k < BIOMES.length; k++) if (_aqIslandIdx(BIOMES[k], k) === bi) return BIOMES[k];
  return BIOMES[bi] || BIOMES[0];
}
function _aqIsleName(bi) { var B = _aqBiome(bi); return B ? (B.icon ? B.icon + ' ' : '') + B.n : 'that island'; }

// The offer for a slot is a pure function of (slot, level), so reopening the window never rerolls it.
function _aqMakeOffer(slot, lvl) {
  var r = _aqRng(Math.imul(slot, 2654435761) ^ (lvl * 7919 + 101));
  var types = ['rar', 'rar', 'isle', 'isle', 'sp', 'mut', 'size'];
  if (lvl < 5) types = ['rar', 'isle', 'isle', 'sp', 'size']; // mutations are rare early on
  var t = _aqPick(r, types), q = { t: t, n: 1, have: 0, slot: slot, lvl: lvl }, fac = 1;
  if (t === 'rar') {
    if (lvl < 10) { q.r = 1; q.n = _aqInt(r, 5, 8); fac = 0.9; }
    else if (lvl < 25) { q.r = 2; q.n = _aqInt(r, 3, 5); fac = 1.1; }
    else if (lvl < 45) { q.r = 3; q.n = _aqInt(r, 2, 3); fac = 1.3; }
    else { q.r = 4; q.n = 1; fac = 1.6; }
  } else if (t === 'isle') {
    q.b = _aqPick(r, _aqIslands(lvl)); q.n = _aqInt(r, 4, 8); fac = 0.8;
  } else if (t === 'sp') {
    var isles = _aqIslands(lvl), maxT = lvl < 10 ? 2 : lvl < 25 ? 3 : lvl < 45 ? 4 : 5, minT = Math.max(0, maxT - 2), L = [];
    for (var i = 0; i < FISH.length; i++) {
      var F = FISH[i];
      if (_aqBig(i) || F[1] < minT || F[1] > maxT) continue;
      if (isles.indexOf(F[6] || 0) >= 0) L.push(i);
    }
    if (!L.length) for (var j = 0; j < FISH.length; j++) if (!_aqBig(j) && FISH[j][1] <= 1 && (FISH[j][6] || 0) === 0) L.push(j);
    if (L.length) { q.sp = _aqPick(r, L); q.n = 1; fac = 1.2 + 0.1 * FISH[q.sp][1]; }
    else { q.t = 'size'; q.n = 3; fac = 1; }
  } else if (t === 'mut') {
    q.n = lvl < 20 ? 1 : _aqInt(r, 1, 2); fac = 1.3 + 0.15 * (q.n - 1);
  } else {
    q.n = _aqInt(r, 2, 4); fac = 1;
  }
  fac = Math.max(0.8, Math.min(1.6, fac));
  q.money = Math.round((500 + 120 * Math.pow(lvl, 1.6)) * fac);
  q.xp = Math.round(20 * lvl + 50);
  return q;
}

function _aqText(q) {
  if (q.t === 'rar') return q.r >= 4 && q.n === 1 ? 'Catch a ' + RAR[q.r] + '-or-rarer fish' : 'Catch ' + q.n + ' ' + RAR[q.r] + '+ fish';
  if (q.t === 'isle') return 'Catch ' + q.n + ' fish at ' + _aqIsleName(q.b);
  if (q.t === 'sp') return 'Catch a ' + FISH[q.sp][0] + ' (' + _aqIsleName(FISH[q.sp][6] || 0) + ')';
  if (q.t === 'mut') return q.n === 1 ? 'Catch a mutated fish' : 'Catch ' + q.n + ' mutated fish';
  return 'Catch ' + q.n + ' Large-or-bigger fish';
}
function _aqMatch(q, f, bi) {
  if (q.t === 'rar') return _aqTier(f.i) >= q.r;
  if (q.t === 'isle') return bi === q.b;
  if (q.t === 'sp') return f.i === q.sp;
  if (q.t === 'mut') return !!f.m;
  if (q.t === 'size') return AQ_SIZES.indexOf(sizeName(f)) >= 0;
  return false;
}

function questOnCatch(f, bi) {
  if (!f || !S) return;
  var dirty = false, A = _aqState(), q = A.cur;
  if (q && q.have < q.n && _aqMatch(q, f, bi)) {
    q.have++; dirty = true;
    if (q.have >= q.n) {
      addFeed('Quest complete: <b>' + esc(_aqText(q)) + '</b> · return to the Angler on his hidden rock for your reward!');
      hint('Quest done! Return to the Angler', 3);
      beep(880, .15, 'triangle');
    }
  }
  // Keeper flag: a Legendary-or-rarer (not a big fish) caught on Frostpeak
  var B = _aqBiome(bi);
  if (B && B.id === 'frost' && !_aqBig(f.i) && _aqTier(f.i) >= 4) {
    if (!S.kq || typeof S.kq !== 'object') S.kq = {};
    if (!S.kq.leg) {
      S.kq.leg = 1; dirty = true;
      if (!S.grotto) addFeed('The Keeper on Frostpeak heard of your catch. The mountain stirs…');
    }
  }
  if (dirty) _aqSave();
}

function _aqMmss(ms) { var s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
function _aqBar(have, n) {
  var p = Math.min(100, Math.round(100 * have / n));
  return '<div style="height:8px;border-radius:5px;background:rgba(255,255,255,.15);overflow:hidden;margin:4px 0"><b style="display:block;height:100%;width:' + p + '%;background:#7fe07f"></b></div>';
}
function _aqReward(q) { return fmt(q.money) + ' + ' + q.xp + ' XP'; }

function anglerQuestHTML() {
  var A = _aqState(), slot = _aqSlot(), q = A.cur, h = '<h3>Angler Quest</h3>';
  if (q) {
    var done = q.have >= q.n;
    h += '<div class="row"><span><b>' + esc(_aqText(q)) + '</b> (' + Math.min(q.have, q.n) + '/' + q.n + ')<br><span style="font-size:12px;opacity:.8">Reward: ' + _aqReward(q) + '</span></span>' +
      (done ? '<button class="btn g" data-aq="claim" ' + (A.claimed === slot ? 'disabled' : '') + '>Claim</button>' : '<button class="btn r" data-aq="abandon">Abandon</button>') + '</div>' + _aqBar(q.have, q.n);
    if (done && A.claimed === slot) h += '<p style="font-size:12px;opacity:.75">You already claimed a reward this round. Claim in <span data-aqcd="1">' + _aqMmss((slot + 1) * AQ_SLOT_MS - Date.now()) + '</span>.</p>';
  } else if (A.claimed === slot) {
    h += '<div class="row"><span>"Good work. Come back later, I\'ll have another job."</span></div>' +
      '<p style="font-size:13px;opacity:.85">Next quest in <b data-aqcd="1">' + _aqMmss((slot + 1) * AQ_SLOT_MS - Date.now()) + '</b></p>';
  } else {
    var o = _aqMakeOffer(slot, level());
    h += '<div class="row"><span><b>' + esc(_aqText(o)) + '</b><br><span style="font-size:12px;opacity:.8">Reward: ' + _aqReward(o) + ' · new offer in <span data-aqcd="1">' + _aqMmss((slot + 1) * AQ_SLOT_MS - Date.now()) + '</span></span></span>' +
      '<button class="btn g" data-aq="accept">Accept</button></div>';
  }
  return h;
}

function anglerQuestBind(w, rerender) {
  if (!w) return;
  var go = function () { if (typeof rerender === 'function') rerender(); };
  var bs = w.querySelectorAll('[data-aq]');
  for (var k = 0; k < bs.length; k++) (function (b) {
    b.onclick = function () {
      var A = _aqState(), slot = _aqSlot(), act = b.getAttribute('data-aq');
      if (act === 'accept') {
        if (A.cur || A.claimed === slot) return go();
        A.cur = _aqMakeOffer(slot, level());
        beep(660, .1, 'triangle'); hint('Quest accepted: ' + _aqText(A.cur), 2.5);
      } else if (act === 'abandon') {
        if (!A.cur) return go();
        A.cur = null; hint('Quest abandoned', 1.5);
      } else if (act === 'claim') {
        var q = A.cur;
        if (!q || q.have < q.n || A.claimed === slot) return go();
        S.money += q.money; S.earned = (S.earned || 0) + q.money; S.xp = (S.xp || 0) + q.xp;
        A.claimed = slot; A.cur = null; A.done = (A.done || 0) + 1;
        banner('Quest complete! +' + fmt(q.money) + ' · +' + q.xp + ' XP', '#ffe066');
        beep(990, .2, 'triangle');
      }
      _aqSave(); go();
    };
  })(bs[k]);
  // live countdown; stops itself when the window is re-rendered or closed
  var cds = w.querySelectorAll('[data-aqcd]');
  if (cds.length && typeof setInterval === 'function') {
    var slot0 = _aqSlot();
    var iv = setInterval(function () {
      var alive = false;
      for (var j = 0; j < cds.length; j++) if (cds[j].isConnected && cds[j].offsetParent !== null) alive = true;
      if (!alive) return clearInterval(iv);
      var s = _aqSlot();
      if (s !== slot0) { clearInterval(iv); return go(); }
      for (var m = 0; m < cds.length; m++) cds[m].textContent = _aqMmss((s + 1) * AQ_SLOT_MS - Date.now());
    }, 1000);
  }
}

function questHud() {
  var q = S && S.aq && S.aq.cur;
  if (!q) return '';
  if (q.have >= q.n) return 'Quest done! Return to the Angler';
  return '' + _aqText(q) + ' (' + q.have + '/' + q.n + ')';
}

/* ================= The Keeper (Frostpeak) ================= */
var KEEPER_COST = 25000, KEEPER_LVL = 15, KEEPER_POW = 2;
var KEEPER_LINES = [
  'Mm. Another one drawn by the cold. They always come for the door.',
  'Behind this stone there is water that has never seen the sky.',
  'My lantern has burned since before your grandmother\'s grandmother. It is not cheap.',
  'Show me a hand that is steady, a rod that is strong, and a catch worth telling of.',
  'The mountain does not open for the hurried. Nor for the poor.'
];
function _kqSay(t) {
  return '<div class="row" style="justify-content:flex-start;gap:10px"><span style="font-size:15px"><b>"' + t + '"</b></span></div>';
}
function _kqSteps() {
  var rod = RODS[S.rod] || {}, kq = S.kq || {};
  return [
    { ok: level() >= KEEPER_LVL, t: 'Reach level ' + KEEPER_LVL + ' (you are ' + level() + ')' },
    { ok: (rod.pow || 0) >= KEEPER_POW, t: 'Equip a rod with Power ' + KEEPER_POW.toFixed(1) + ' or more (yours: ' + (rod.pow || 0) + ')' },
    { ok: !!kq.leg, t: 'Catch a Legendary-or-rarer fish on Frostpeak' },
    { ok: S.money >= KEEPER_COST, t: 'Pay ' + fmt(KEEPER_COST) + ' for the Keeper\'s lantern' }
  ];
}

function keeperHTML() {
  if (S.grotto) {
    return _kqSay('The door stands open, lantern-bearer. Walk to it and press E. Mind the dark water below.') +
      '<p style="font-size:13px;opacity:.8">The Hidden Grotto is open. Press <b>E</b> at the mountain door on Frostpeak.</p>';
  }
  var st = _kqSteps(), ready = st[0].ok && st[1].ok && st[2].ok, can = ready && st[3].ok;
  var line = can ? 'You have done what I asked. Give me the coin, and take the light.'
    : KEEPER_LINES[Math.floor(Date.now() / 20000) % KEEPER_LINES.length];
  var h = _kqSay(line) + '<h3>The Mountain Door</h3>';
  for (var k = 0; k < st.length; k++) h += '<div class="row" style="justify-content:flex-start;gap:8px"><span>' + (st[k].ok ? 'Done' : 'To do') + '</span><span>' + (k + 1) + ') ' + esc(st[k].t) + '</span></div>';
  h += '<div class="row"><span style="font-size:12px;opacity:.75">' + (ready ? 'The Keeper waits for your coin.' : 'Finish steps 1-3 first.') + '</span>' +
    '<button class="btn g" data-kq="open" ' + (can ? '' : 'disabled') + '>Open the door (' + fmt(KEEPER_COST) + ')</button></div>';
  return h;
}

function keeperBind(w, rerender) {
  if (!w) return;
  var b = w.querySelector('[data-kq="open"]');
  if (!b) return;
  b.onclick = function () {
    if (S.grotto) return rerender && rerender();
    var st = _kqSteps();
    if (!(st[0].ok && st[1].ok && st[2].ok && st[3].ok)) return rerender && rerender();
    S.money -= KEEPER_COST; S.grotto = 1; _aqSave();
    banner('The mountain door opens…<br><span style="font-size:.55em">Press E at the door on Frostpeak to enter the Hidden Grotto</span>', '#ffd27a');
    addFeed('<b>' + esc(S.name || 'Someone') + '</b> was given the Keeper\'s lantern. The door into the mountain is open!');
    beep(440, .2, 'sine'); setTimeout(function () { beep(660, .3, 'triangle'); }, 180);
    if (typeof rerender === 'function') rerender();
  };
}
