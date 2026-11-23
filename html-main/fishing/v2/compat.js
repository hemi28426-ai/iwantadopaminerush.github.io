// Fishing Unblocked v2: turns the v2 islands (FW), fish (FWFISH) and rods (FWRODS) into the FISHDATA shape the game reads.
// Replaces the old biomedata.js. Load after world.js, the isl-*.js files, fishdata.js and rods.js.
(function () {
  'use strict';
  const D = window.FISHDATA = {};
  // mult = how strong fish are there (vs rod Power), q = how often rare fish bite there. Not a ladder: every island has easy fish and its own rare ones.
  const TUNE = { harbor: [1, 0], coral: [1.5, .15], dunes: [2, .2], mire: [2.2, .25], frost: [3, .3], crystal: [2.8, .35], ember: [4, .4], sky: [3.6, .45], elder: [3.2, .4], grotto: [6, 1.1] };
  const L = (window.FW && FW.islands) || [];
  L.forEach(b => { const t = TUNE[b.id] || [2, .2]; b.mult = t[0]; b.q = t[1]; b.boat = 0; b.key = null; b.keyHere = null; });
  D.BIOMES = L;
  D.KEYS = {}; D.KEY_CHANCE = 0;
  D.BOATS = [null, { n: 'Rowboat', p: 5000, spd: 16, d: 'Sails to every island' }, { n: 'Motorboat', p: 60000, spd: 28, d: 'Much faster' }, { n: 'Ironclad', p: 750000, spd: 36, d: 'Fastest boat on the sea' }];
  // same price for every fish of a rarity, wherever it lives
  const TB = D.TB = [8, 45, 250, 1400, 10000, 100000, 800000, 4000000];
  const bi = id => { const k = L.findIndex(b => b.id === id); return k < 0 ? -1 : k; };
  D.FISH = []; // [name, tier, price, minKg, maxKg, colour, biomeIndex (-1 = event fish), look] + .v2 = the v2 fish
  (window.FWFISH || []).forEach(f => { const r = [f.n, f.tier, TB[f.tier], f.kg[0], f.kg[1], f.look.c, f.isl ? bi(f.isl) : -1, f.look]; r.v2 = f; D.FISH.push(r); });
  D.RODS = (window.FWRODS || []).map(r => Object.assign({}, r, { biome: r.sold ? bi(r.sold) : -1 }));
})();
