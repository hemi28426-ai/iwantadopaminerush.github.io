'use strict';
// ===== Player profile: outfits, levels, Lunch Money, item shop, daily quests, career stats =====
// Each outfit is a 3D skin (models/<folder>, packed by tools/build-skins.sh). The colors are only used
// by the fallback block character if the skins fail to load.
const OUTFITS = [
  { id: 'jonesy', side: 'hero', model: 'jonesy', name: 'Jonesy', rarity: 1, shirt: 0x4a6b3a, pants: 0x3b3b3b, skin: 0xe0ac69, hat: 0x5b4636, hatStyle: 1, desc: 'The original. Default, never basic.' },
  { id: 'banana', side: 'hero', model: 'banana', name: 'Banana', rarity: 2, shirt: 0xffe135, pants: 0xffe135, skin: 0xffe135, hat: 0x6b4f1d, hatStyle: 2, desc: 'Ripe for a Victory.' },
  { id: 'spidey', marvel: true, side: 'hero', model: 'spidey', name: 'Spider-Man', rarity: 3, shirt: 0xd62828, pants: 0x1d4ed8, skin: 0xd62828, hat: 0xd62828, hatStyle: 0, desc: 'With great loot comes great responsibility.' },
  { id: 'cr7', noShop: true, only: ['cr7', 'junior', 'duke'], emotes: ['sui'], side: 'hero', model: 'cr7', name: 'Cristiano Ronaldo', rarity: 5, shirt: 0xc8102e, pants: 0x0b6b3a, skin: 0xc68e6a, hat: 0x2a1a10, hatStyle: 2, desc: 'Exclusive. Comes with the SUIII emote.' },
  { id: 'doggo', noShop: true, only: ['duke', 'xenox.6'], side: 'hero', model: 'doggo', name: 'Shady Doggo', rarity: 5, shirt: 0x222222, pants: 0x111111, skin: 0x8a6a4a, hat: 0x111111, hatStyle: 2, desc: 'Exclusive. Not for sale.' },
  { id: 'v1', side: 'villain', model: 'v1', name: 'V1', rarity: 3, shirt: 0x2f4f8f, pants: 0x1c2b4a, skin: 0x2f4f8f, hat: 0xffc400, hatStyle: 2, desc: 'Mankind is dead. Blood is fuel.' },
  { id: 'adam', noShop: true, side: 'villain', model: 'adam', name: 'Adam Smasher', rarity: 5, shirt: 0x2b2b2b, pants: 0x1a1a1a, skin: 0x8a8a8a, hat: 0xd7263d, hatStyle: 2, desc: 'Full borg. Wear the legend. (Beat him in a match to become him for real.)' },
  { id: 'thanos', marvel: true, side: 'villain', model: 'thanos', name: 'Thanos', rarity: 4, shirt: 0x6b4fa0, pants: 0x3a2d5c, skin: 0x7a5aa8, hat: 0xc9a227, hatStyle: 2, desc: 'Perfectly balanced, as all things should be.' },
  { id: 'cap', marvel: true, side: 'hero', model: 'cap', name: 'Captain America', rarity: 4, shirt: 0x1f3a7a, pants: 0x1f3a7a, skin: 0xe0ac69, hat: 0x1f3a7a, hatStyle: 0, desc: 'I can do this all day.' },
  { id: 'ironman', marvel: true, side: 'hero', model: 'ironman', name: 'Iron Man', rarity: 4, shirt: 0xb3261e, pants: 0xb3261e, skin: 0xd4a72c, hat: 0xb3261e, hatStyle: 2, desc: 'Genius. Billionaire. Playboy. Philanthropist.' },
  { id: 'strange', marvel: true, side: 'hero', model: 'strange', name: 'Doctor Strange', rarity: 4, shirt: 0x1f3a7a, pants: 0x1f3a7a, skin: 0xe0ac69, hat: 0xb3261e, hatStyle: 0, desc: 'Sorcerer Supreme. Saw 14,000,605 futures.' },
  { id: 'hulk', marvel: true, side: 'hero', model: 'hulk', name: 'Hulk', rarity: 4, shirt: 0x4caf50, pants: 0x5b3a8a, skin: 0x4caf50, hat: 0x222222, hatStyle: 0, desc: 'Hulk smash.' },
  // hidden: saved for a mid-chapter special event (not in the shop, locker picks, bots or henchmen)
  { id: 'ultron', hidden: true, marvel: true, side: 'villain', model: 'ultron', name: 'Infinity Ultron', rarity: 5, shirt: 0x9aa3ad, pants: 0x6b7280, skin: 0x9aa3ad, hat: 0xd7263d, hatStyle: 2, desc: 'Earned by beating 1 vs 100. There are no strings on him.' },
  { id: 'doom', marvel: true, side: 'villain', model: 'doom', name: 'Doctor Doom', rarity: 4, shirt: 0x2e5e2e, pants: 0x777777, skin: 0x9a9a9a, hat: 0x2e5e2e, hatStyle: 2, desc: 'Doom does not wait for the storm.' },
  { id: 'lebron', hidden: true, side: 'hero', model: 'lebron', name: 'LeBron James', rarity: 5, shirt: 0x552583, pants: 0xfdb927, skin: 0x5a3a28, hat: 0x111111, hatStyle: 2, desc: 'Earned by beating LeBron on his court in the sky.' },
  { id: 'venom', hidden: true, v15: true, marvel: true, side: 'villain', model: 'venom', name: 'Venom', rarity: 4, shirt: 0x111111, pants: 0x0a0a0a, skin: 0x111111, hat: 0xffffff, hatStyle: 2, desc: 'We are Venom.' },
];
const OUTFIT_PRICE = [0, 300, 600, 1000, 1600, 3000];
const XP_PER_LEVEL = 1000;

const QUEST_POOL = [
  { id: 'chest', text: 'Open {n} chests', n: [4, 7], xp: 350 },
  { id: 'kill', text: 'Eliminate {n} opponents', n: [2, 4], xp: 450 },
  { id: 'damage', text: 'Deal {n} damage to opponents', n: [6, 12], step: 50, xp: 400 },
  { id: 'build', text: 'Place {n} building pieces', n: [15, 30], xp: 300 },
  { id: 'mats', text: 'Harvest {n} materials', n: [3, 6], step: 50, xp: 300 },
  { id: 'storm', text: 'Survive {n} storm circles', n: [2, 4], xp: 350 },
  { id: 'heal', text: 'Use {n} healing or shield items', n: [2, 4], xp: 300 },
  { id: 'land', text: 'Land at a named location', n: [1, 1], xp: 250 },
  { id: 'top25', text: 'Finish in the top 25', n: [1, 2], xp: 400 },
  { id: 'match', text: 'Play {n} matches', n: [2, 3], xp: 250 },
];

// Season 2 starts with the Season 1 finale (Mon Nov 2 2026, 1:50 PM, each player's clock): almost every
// skin is vaulted for good (owners keep them). Only Jonesy, Peely, V1 and LeBron stay, and the shop sells
// V1, LeBron and Peely.
const SEASON2 = new Date(2026, 10, 2, 13, 50).getTime();
const S2_KEEP = ['jonesy', 'banana', 'v1', 'lebron'], S2_SHOP = ['v1', 'lebron', 'banana'];
function season2() {
  for (const o of OUTFITS) o.hidden = !S2_KEEP.includes(o.id);
}
// Last chance before the vault: all eight Marvel skins in one bundle, from Thu Oct 29 (each player's clock)
// until Season 2 starts. Each skin you already own takes its share off the price. #bundle previews it early.
const MARVEL_BUNDLE = { ids: ['spidey', 'thanos', 'cap', 'ironman', 'strange', 'hulk', 'doom', 'venom'], price: 10000, from: new Date(2026, 9, 29).getTime() };
// #s2 previews Season 2 (Zephara and its loot) before it starts
function isSeason2() { return Date.now() >= SEASON2 || location.hash === '#s2'; }
if (isSeason2()) season2();

const PROFILE = {
  data: null,
  defaults() {
    return {
      v: 1, name: '', level: 1, xp: 0, coins: 600, owned: ['jonesy'], outfit: 'jonesy', mode: 'solo',
      emotes: EMOTE_FREE.slice(), wheel: EMOTE_FREE.slice(),
      stats: { matches: 0, wins: 0, kills: 0, top10: 0, top25: 0, damage: 0, chests: 0, builds: 0, time: 0, best: 0 },
      quests: { day: '', list: [] },
    };
  },
  load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem('unblockednite_profile') || 'null'); } catch (e) { d = null; }
    const def = this.defaults();
    this.fresh = !d; // nothing saved on this browser yet (a cloud save always wins over this)
    this.data = Object.assign(def, d || {});
    this.data.stats = Object.assign(def.stats, (d && d.stats) || {});
    if (!d) {
      if (SETTINGS.name) this.data.name = SETTINGS.name;
    }
    // older saves owned the block-character outfits: everyone gets Jonesy, and keeps any skin they bought
    if (!this.data.owned.includes('jonesy')) this.data.owned.push('jonesy');
    // Adam is out of the shop: only the duke account gets him in the locker
    this.dukeUnlock();
    // everyone keeps the free emotes (saves from before emotes existed get them too)
    if (!Array.isArray(this.data.emotes)) this.data.emotes = [];
    for (const id of EMOTE_FREE) if (!this.data.emotes.includes(id)) this.data.emotes.push(id);
    if (!Array.isArray(this.data.wheel) || !this.data.wheel.length) this.data.wheel = EMOTE_FREE.slice();
    if (!OUTFITS.some(o => o.id === this.data.outfit) || !this.data.owned.includes(this.data.outfit)) this.data.outfit = 'jonesy';
    this.ensureQuests();
  },
  // saved on this browser right away, and to your account a moment later (see ACCOUNT)
  save(noCloud) {
    this.data.savedAt = Date.now();
    try { localStorage.setItem('unblockednite_profile', JSON.stringify(this.data)); } catch (e) { /* storage unavailable */ }
    if (!noCloud && typeof ACCOUNT !== 'undefined') ACCOUNT.queue();
  },
  dukeUnlock() {
    let who = ''; try { who = (JSON.parse(localStorage.getItem('shooter_creds') || 'null') || {}).u || ''; } catch (e) {}
    who = who.toLowerCase();
    if (who === 'duke' && !this.data.owned.includes('adam')) { this.data.owned.push('adam'); this.save(); }
    // duke also gets the live-event rewards early (for testing): the Snap emote and the Infinity Gauntlet tool
    if (who === 'duke' && (!this.data.emotes.includes('fn_snap') || !(this.data.tools || []).includes('gauntlet'))) { if (!this.data.emotes.includes('fn_snap')) this.data.emotes.push('fn_snap'); this.data.tools = [...new Set([...(this.data.tools || []), 'gauntlet'])]; this.data.pickaxe = 'gauntlet'; this.save(); }
    // exclusive skins: only the accounts listed in their 'only'
    for (const o of OUTFITS) if (o.only && o.only.includes(who) && !this.data.owned.includes(o.id)) { this.data.owned.push(o.id); this.save(); }
    // ...and the emotes that come with them (onto the wheel if there's room)
    for (const o of OUTFITS) for (const id of (o.only && o.only.includes(who) && o.emotes) || []) {
      if (!Array.isArray(this.data.emotes)) this.data.emotes = EMOTE_FREE.slice();
      if (!Array.isArray(this.data.wheel) || !this.data.wheel.length) this.data.wheel = EMOTE_FREE.slice();
      if (this.data.emotes.includes(id)) continue;
      this.data.emotes.push(id); if (this.data.wheel.length < 8) this.data.wheel.push(id); this.save();
    }
  },
  // a hidden outfit someone had equipped falls back to the default until its event
  outfit(id) { const o = OUTFITS.find(o => o.id === (id || this.data.outfit)); return o && (!o.hidden || this.data.owned.includes(o.id)) ? o : OUTFITS[0]; },
  displayName() { return (this.data.name || 'Player').slice(0, 16); },

  dayKey(off = 0) {
    const d = new Date(Date.now() + off * 86400000);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },
  daySeed() { let h = 7; for (const ch of this.dayKey()) h = (h * 31 + ch.charCodeAt(0)) | 0; return h >>> 0; },
  msToReset() { const n = new Date(); const m = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1); return m - n; },

  ensureQuests() {
    const q = this.data.quests;
    if (q.day === this.dayKey() && q.list.length) return;
    const r = mulberry32(this.daySeed());
    const pool = QUEST_POOL.slice();
    q.day = this.dayKey(); q.list = [];
    for (let i = 0; i < 3; i++) {
      const def = pool.splice(Math.floor(r() * pool.length), 1)[0];
      const n = (def.n[0] + Math.floor(r() * (def.n[1] - def.n[0] + 1))) * (def.step || 1);
      q.list.push({ id: def.id, target: n, progress: 0, done: false, xp: def.xp });
    }
    this.save();
  },
  questText(q) { const def = QUEST_POOL.find(d => d.id === q.id); return def.text.replace('{n}', q.target.toLocaleString()); },

  // Item shop: every skin except the free default; Epic and Legendary ones are featured
  // The shop rotates daily: 3 skins and 10 emotes, picked by the date so everyone's shop matches.
  // Picks are walked forward day by day so anything sold recently is skipped (skins: the day before,
  // emotes: the last 6 days), and the whole catalog cycles through.
  dailyPicks(pool, count, memory, salt, off = 0) {
    const n = new Date();
    const day0 = Math.round((new Date(n.getFullYear(), n.getMonth(), n.getDate() + off) - new Date(2026, 0, 1)) / 86400000);
    const recent = [];
    let today = [];
    for (let d = Math.max(0, day0 - 12); d <= day0; d++) {
      const r = mulberry32(salt + d * 2654435761 >>> 0);
      const avail = pool.filter(e => !recent.slice(-memory).includes(e.id));
      today = [];
      while (today.length < count && avail.length) today.push(avail.splice(Math.floor(r() * avail.length), 1)[0]);
      for (const e of today) recent.push(e.id);
    }
    return today;
  },
  shop(off = 0) {
    if (Date.now() >= SEASON2) return S2_SHOP.map((id) => OUTFITS.find((o) => o.id === id)).filter(Boolean);
    const forSale = OUTFITS.filter(o => o.id !== 'jonesy' && !o.hidden && !o.noShop && (!SKINS.ready || SKINS.defs[o.model]));
    return this.dailyPicks(forSale, 3, 3, 0x5c1e, off);
  },
  // (Thanos was vaulted at the Ultron event, but he's in the bundle: look skins up directly, not through outfit())
  bundleOutfit(id) { return OUTFITS.find((o) => o.id === id); },
  bundleOn() { return location.hash === '#bundle' || (Date.now() >= MARVEL_BUNDLE.from && Date.now() < SEASON2); },
  bundleMissing() { return MARVEL_BUNDLE.ids.filter((id) => !this.data.owned.includes(id)); },
  bundlePrice() {
    const B = MARVEL_BUNDLE, worth = (id) => OUTFIT_PRICE[this.bundleOutfit(id).rarity], full = B.ids.reduce((a, id) => a + worth(id), 0);
    return Math.max(0, Math.round(this.bundleMissing().reduce((a, id) => a + B.price * worth(id) / full, 0)));
  },
  buyBundle() {
    const missing = this.bundleMissing(), price = this.bundlePrice();
    if (!missing.length) return 'owned';
    if (this.data.coins < price) return 'poor';
    this.data.coins -= price;
    this.data.owned.push(...missing);
    this.save();
    return 'ok';
  },
  emoteShop(off = 0) {
    // the shop sells the Fortnite emotes (the older hand-made ones stay in lockers that own them)
    const fn = EMOTES.list.filter(e => e.id.startsWith('fn_') && !EMOTE_FREE.includes(e.id) && !EMOTE_EVENT.includes(e.id));
    return this.dailyPicks(fn.length >= 20 ? fn : EMOTES.list.filter(e => !EMOTE_FREE.includes(e.id)), 10, 60, 0xe7a1, off);
  },
  buyEmote(id) {
    const e = EMOTES.get(id);
    if (!e || EMOTE_EVENT.includes(id)) return 'none';
    if (this.data.emotes.includes(id)) return 'owned';
    const price = EMOTES.price(e);
    if (this.data.coins < price) return 'poor';
    this.data.coins -= price;
    this.data.emotes.push(id);
    if (this.data.wheel.length < 8) this.data.wheel.push(id);
    this.save();
    return 'ok';
  },
  buy(id) {
    const o = this.outfit(id);
    if (this.data.owned.includes(id)) return 'owned';
    const price = OUTFIT_PRICE[o.rarity];
    if (this.data.coins < price) return 'poor';
    this.data.coins -= price;
    this.data.owned.push(id);
    this.save();
    return 'ok';
  },
  addXP(n) {
    this.data.xp += n;
    let gained = 0;
    while (this.data.xp >= XP_PER_LEVEL) { this.data.xp -= XP_PER_LEVEL; this.data.level++; this.data.coins += 100; gained++; }
    return gained;
  },
};

// Per-match tracking that feeds quests and rewards (player actions only)
const STATS = {
  match: null,
  begin() { this.match = { kills: 0, damage: 0, chests: 0, builds: 0, mats: 0, questXP: 0, questsDone: [], landed: false }; },
  event(id, amount = 1) {
    const m = this.match;
    if (!m || G.phase === 'menu') return;
    if (id === 'kill') m.kills += amount;
    else if (id === 'damage') m.damage += amount;
    else if (id === 'chest') m.chests += amount;
    else if (id === 'build') m.builds += amount;
    else if (id === 'mats') m.mats += amount;
    for (const q of PROFILE.data.quests.list) {
      if (q.id !== id || q.done) continue;
      q.progress = Math.min(q.target, q.progress + amount);
      if (q.progress >= q.target) {
        q.done = true;
        m.questXP += q.xp; m.questsDone.push(PROFILE.questText(q));
        PROFILE.addXP(q.xp);
        PROFILE.save();
        if (typeof HUD !== 'undefined' && G.inMatch()) { HUD.pickupLine('Quest complete: ' + PROFILE.questText(q) + '  +' + q.xp + ' XP', '#ffd84a'); SFX.play('chest', 0.5); }
      }
    }
  },
  finish(placement, victory) {
    const m = this.match;
    if (!m) return null;
    this.match = null;
    const s = PROFILE.data.stats;
    s.matches++; s.kills += m.kills; s.damage += Math.round(m.damage); s.chests += m.chests; s.builds += m.builds; s.time += Math.round(G.time);
    if (victory) s.wins++;
    if (placement <= 10) s.top10++;
    if (placement <= 25) s.top25++;
    if (!s.best || placement < s.best) s.best = placement;
    this.match = m; // let the last two quest events land on this match
    this.event('match');
    if (placement <= 25) this.event('top25');
    this.match = null;
    const placeXP = victory ? 500 : placement <= 10 ? 200 : placement <= 25 ? 90 : 30;
    const xp = 120 + m.kills * 60 + placeXP + Math.round(G.time * 0.6);
    const coins = 25 + m.kills * 10 + (victory ? 200 : placement <= 10 ? 60 : placement <= 25 ? 25 : 0);
    const levels = PROFILE.addXP(xp);
    PROFILE.data.coins += coins;
    PROFILE.save();
    return { xp: xp + m.questXP, coins: coins + levels * 100, levels, quests: m.questsDone };
  },
};
