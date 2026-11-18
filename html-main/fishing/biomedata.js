// Fishing Unblocked: biome islands, keys, boats, biome fish and biome rods (data only).
(function () {
  'use strict';
  const D = window.FISHDATA = {};
  // c = island centre, R = radius, mult = fish value multiplier, boat = boat tier needed, key = vault key needed, keyHere = key you can fish up here
  D.BIOMES = [
    { id: 'start', n: 'Starter Isle', icon: '🏝️', c: [0, 0], R: 150, mult: 1, boat: 0, key: null, keyHere: null },
    { id: 'coral', n: 'Coral Lagoon', icon: '🪸', c: [640, 140], R: 100, mult: 3, boat: 1, key: null, keyHere: 'sand', lake: null },
    { id: 'desert', n: 'Desert Oasis', icon: '🏜️', c: [440, -540], R: 110, mult: 6, boat: 1, key: 'sand', keyHere: 'spore', lake: [-10, -15] },
    { id: 'snow', n: 'Frostpeak', icon: '🏔️', c: [-120, -680], R: 115, mult: 12, boat: 2, key: null, keyHere: 'crystal' },
    { id: 'swamp', n: 'Mushroom Swamp', icon: '🍄', c: [-620, -310], R: 105, mult: 25, boat: 2, key: 'spore', keyHere: 'infernal', lake: [10, 5] },
    { id: 'crystal', n: 'Crystal Caverns', icon: '💎', c: [-660, 310], R: 100, mult: 50, boat: 2, key: 'crystal', keyHere: null, lake: [-5, 10] },
    { id: 'hell', n: 'Inferno', icon: '🔥', c: [-200, 680], R: 120, mult: 120, boat: 3, key: 'infernal', keyHere: 'star' },
    { id: 'celestial', n: 'Celestial Isle', icon: '✨', c: [400, 660], R: 100, mult: 400, boat: 3, key: 'star', keyHere: null },
  ];
  D.KEYS = { sand: { n: 'Sandstone Key', col: '#e0b870', opens: 'desert' }, spore: { n: 'Spore Key', col: '#a0ff70', opens: 'swamp' }, crystal: { n: 'Crystal Key', col: '#c090ff', opens: 'crystal' },
    infernal: { n: 'Infernal Key', col: '#ff5020', opens: 'hell' }, star: { n: 'Star Key', col: '#fff0a0', opens: 'celestial' } };
  D.KEY_CHANCE = 1 / 60;
  D.BOATS = [null, { n: 'Rowboat', p: 2500, spd: 16, d: 'Reaches Coral Lagoon & Desert Oasis' }, { n: 'Motorboat', p: 60000, spd: 28, d: 'Handles the cold seas: Frostpeak, Swamp, Caverns' },
    { n: 'Ironclad', p: 5000000, spd: 36, d: 'Heat-proof hull: Inferno & Celestial Isle' }];
  // tier base prices (times the biome multiplier)
  const TB = [8, 45, 250, 1400, 10000, 100000, 800000, 4000000];
  // [name, tier, price variation, min kg, max kg, look]
  const F = {
    coral: [
      ['Clownfish', 0, 1, .1, .4, { c: 0xff7a1a, b: 0xffa040, f: 0xff8a30, st: 3, sc: 0xffffff, L: .8, H: .4 }],
      ['Blue Tang', 0, 1.2, .2, .8, { c: 0x2a5cff, b: 0x3a70ff, f: 0xffd020, L: .8, H: .5, W: .16 }],
      ['Parrotfish', 1, 1, 1, 6, { c: 0x30d0b0, b: 0xff8ac0, f: 0xff70b0, x: ['beak'], L: 1, H: .42 }],
      ['Moorish Idol', 1, 1.2, .3, 1.5, { k: 'd', c: 0xf2f2e8, st: 3, sc: 0x111111, f: 0xffe040, x: ['rays'] }],
      ['Lionfish', 2, 1, .5, 2, { c: 0xe8d0c0, st: 8, sc: 0xb02010, f: 0xc03020, x: ['rays'], L: .9, H: .38 }],
      ['Pufferfish', 2, 1.3, .5, 3, { k: 'p', c: 0xd8c070, b: 0xfff4d0, sp: 0x5a4a20, x: ['nubs'] }],
      ['Mandarin Dragonet', 3, 1, .1, .5, { c: 0x2060ff, st: 7, sc: 0xff7010, f: 0x20e0ff, g: 0x102040, L: .85, H: .35 }],
      ['Hammerhead Shark', 4, 1, 80, 400, { k: 'h', c: 0x7a8a98, b: 0xe8ecf0 }],
      ['Coral Leviathan', 5, 1, 200, 1500, { k: 'e', c: 0xff5080, g: 0x401020, x: ['spines'], sc: 0xffd040 }],
      ['Pearl Queen', 6, 1, 10, 60, { c: 0xfff0f4, b: 0xffffff, f: 0xffc0e0, t: 'fan', g: 0x806070, x: ['pearls', 'crown'] }],
      ['Reef Spirit', 7, 1, 5, 50, { c: 0x40ffd0, b: 0xff80ff, o: .6, g: 0x20a080, t: 'fan', x: ['halo'] }]],
    desert: [
      ['Sand Darter', 0, 1, .05, .3, { c: 0xd8b878, b: 0xf4e4c0, L: .8, H: .22 }],
      ['Oasis Tilapia', 0, 1.1, .5, 3, { c: 0x8a9a70, b: 0xe0e0c0, st: 6, sc: 0x5a6a40, L: .85, H: .48 }],
      ['Desert Pupfish', 1, 1, .05, .2, { c: 0x3a7ad0, b: 0xd0d8e0, f: 0x1a3a80, L: .7, H: .4 }],
      ['Sandstone Catfish', 1, 1.2, 2, 20, { c: 0xc89a60, b: 0xf0d8a8, x: ['whisk'], t: 'round', L: 1.15, H: .3, W: .32 }],
      ['Scarab Fish', 2, 1, 1, 5, { c: 0x205a40, g: 0x103020, b: 0x40a070, x: ['shell'], L: .85, H: .45 }],
      ['Mirage Ghost', 3, 1, 1, 8, { c: 0xfff0d0, o: .45, g: 0x605030, L: 1.1, H: .32 }],
      ['Pharaoh Koi', 4, 1, 5, 30, { c: 0x2050c0, b: 0xffd040, f: 0xffd040, t: 'fan', x: ['crown'], g: 0x101830 }],
      ['Sand Wyrm', 5, 1, 100, 900, { k: 'e', c: 0xc8a060, x: ['spines'], sc: 0x8a6030 }],
      ['Sun Disk', 6, 1, 20, 80, { k: 'd', c: 0xffd030, g: 0xa07000, x: ['halo'] }],
      ['Sphinx Fish', 7, 1, 50, 400, { c: 0xd8b070, b: 0xf0d8a0, x: ['crown', 'whisk'], f: 0x2050c0, t: 'fan', H: .5 }]],
    snow: [
      ['Ice Minnow', 0, 1, .05, .3, { c: 0xc8e8ff, o: .75, L: .8, H: .22 }],
      ['Arctic Char', 0, 1.2, 1, 8, { c: 0x5a7080, b: 0xff7050, sp: 0xf0f0f0, L: 1, H: .32 }],
      ['Snow Cod', 1, 1, 2, 15, { c: 0xd8dce0, b: 0xffffff, sp: 0x8a909a, x: ['whisk'], L: 1.05, H: .36 }],
      ['Glacier Trout', 1, 1.2, 1, 7, { c: 0x80b8e0, b: 0xeaf6ff, x: ['frost'], L: 1, H: .32 }],
      ['Frost Pike', 2, 1, 3, 20, { c: 0xa0d0f0, o: .8, x: ['frost', 'snout'], L: 1.4, H: .24 }],
      ['Narwhal Fish', 3, 1, 20, 120, { c: 0x8090a0, b: 0xe0e4e8, sp: 0x50606a, x: ['horn'], L: 1.3, H: .4 }],
      ['Yeti Grouper', 4, 1, 50, 300, { c: 0xf4f4f4, b: 0xffffff, x: ['fur', 'frost'], L: 1.1, H: .55, W: .4 }],
      ['Aurora Eel', 5, 1, 20, 150, { k: 'e', c: 0x205060, g: 0x104030, x: ['rainbow'] }],
      ['Blizzard Spirit', 6, 1, 5, 40, { c: 0xe8f8ff, o: .5, g: 0x6090c0, t: 'fan', x: ['frost', 'halo'] }],
      ['The Frozen King', 7, 1, 200, 2000, { c: 0x9ad8ff, b: 0xffffff, o: .85, g: 0x204060, x: ['crown', 'frost'], t: 'fan', H: .55 }]],
    swamp: [
      ['Mud Minnow', 0, 1, .05, .3, { c: 0x6a6040, b: 0x9a9070, L: .8, H: .24 }],
      ['Bog Bullhead', 0, 1.2, .5, 4, { c: 0x4a4a30, b: 0xa8a070, x: ['whisk'], t: 'round', L: 1, H: .32, W: .3 }],
      ['Spotted Gar', 1, 1, 2, 15, { c: 0x7a7a50, sp: 0x2a2a1a, x: ['snout'], t: 'round', L: 1.4, H: .2 }],
      ['Toad Fish', 1, 1.2, .5, 3, { k: 'p', c: 0x7a8a40, b: 0xe0d890, sp: 0x4a5020 }],
      ['Spore Puffer', 2, 1, .5, 4, { k: 'p', c: 0xb060d0, b: 0xf0d0ff, g: 0x401050, x: ['nubs'] }],
      ['Mushroom Carp', 3, 1, 3, 20, { c: 0x8a6a50, b: 0xe8dcc8, x: ['caps'], L: 1, H: .45 }],
      ['Witch Pike', 4, 1, 5, 40, { c: 0x3a2a50, b: 0x7a6a90, g: 0x200040, sp: 0x80ff60, x: ['snout'], L: 1.4, H: .25 }],
      ['Swamp Hag', 5, 1, 50, 400, { k: 'a', c: 0x3a4a2a, g: 0x102010 }],
      ['Toxic Leviathan', 6, 1, 300, 3000, { k: 'e', c: 0x50e040, g: 0x206010, x: ['spines'], sc: 0xc0ff40 }],
      ['The Bog Lord', 7, 1, 500, 4000, { k: 'q', c: 0x3a5a2a, g: 0x104010, x: ['crown'] }]],
    crystal: [
      ['Quartz Minnow', 0, 1, .05, .3, { c: 0xf0f0ff, o: .6, g: 0x404060, L: .8, H: .22 }],
      ['Amethyst Perch', 0, 1.2, .3, 2, { c: 0x9a50d0, b: 0xe0c0ff, g: 0x301050, L: .9, H: .38 }],
      ['Geode Grouper', 1, 1, 5, 40, { c: 0x6a6070, b: 0xb070ff, x: ['gems'], L: 1.1, H: .5, W: .38 }],
      ['Prism Tetra', 1, 1.2, .1, .5, { c: 0xffffff, o: .55, x: ['rainbow'], L: .85, H: .3 }],
      ['Sapphire Ray', 2, 1, 10, 60, { k: 'r', c: 0x2050e0, g: 0x102060 }],
      ['Emerald Eel', 3, 1, 5, 40, { k: 'e', c: 0x20c070, g: 0x105030 }],
      ['Ruby Dragonfish', 4, 1, 5, 30, { c: 0xe01040, b: 0xff8090, g: 0x400010, x: ['whisk', 'gems'], t: 'fan' }],
      ['Diamond Shark', 5, 1, 100, 700, { k: 's', c: 0xe0f4ff, o: .7, g: 0x305060 }],
      ['Prismatic Wyrm', 6, 1, 500, 3000, { k: 'e', c: 0xffffff, x: ['rainbow'], g: 0x404040 }],
      ['Heart of the Cave', 7, 1, 100, 999, { k: 'd', c: 0xff40a0, g: 0xa01050, x: ['gems', 'halo'] }]],
    hell: [
      ['Ember Fry', 0, 1, .05, .3, { c: 0xff6010, g: 0x802000, L: .8, H: .24 }],
      ['Cinder Perch', 0, 1.2, .5, 3, { c: 0x3a2a2a, st: 5, sc: 0xff5010, g: 0x401000, L: .9, H: .38 }],
      ['Magma Carp', 1, 1, 3, 20, { c: 0x2a1a1a, x: ['cracks'], g: 0x300800, L: 1, H: .45 }],
      ['Brimstone Catfish', 1, 1.2, 5, 50, { c: 0xd0c040, b: 0x6a5a20, x: ['whisk'], t: 'round', L: 1.15, H: .3, W: .32 }],
      ['Hellhound Pike', 2, 1, 5, 30, { c: 0x2a1010, b: 0x8a2020, x: ['snout', 'horns', 'teeth'], g: 0x300000, L: 1.4, H: .25 }],
      ['Imp Fish', 3, 1, .5, 5, { c: 0xd02020, b: 0xff6040, x: ['horns', 'wings'], L: .8, H: .42 }],
      ['Obsidian Shark', 4, 1, 200, 900, { k: 's', c: 0x101018, g: 0x200810, x: ['cracks'] }],
      ['Phoenix', 5, 1, 10, 60, { c: 0xff8020, b: 0xffe040, g: 0x803000, x: ['flame', 'crown'], t: 'fan' }],
      ['Lava Leviathan', 6, 1, 1000, 6000, { k: 'e', c: 0x201010, x: ['cracks', 'horns'], g: 0x401000 }],
      ['The Devil Ray', 7, 1, 500, 5000, { k: 'r', c: 0x400810, g: 0x600010, x: ['horns', 'flame'] }]],
    celestial: [
      ['Stardust Minnow', 0, 1, .05, .3, { c: 0xfff8e0, g: 0x806030, x: ['stars'], L: .8, H: .22 }],
      ['Comet Tetra', 0, 1.2, .2, 1, { c: 0x80c0ff, g: 0x2040a0, x: ['trail'], L: .85, H: .3 }],
      ['Halo Angelfish', 1, 1, .5, 3, { k: 'd', c: 0xffffff, f: 0xffe080, x: ['halo'] }],
      ['Nebula Guppy', 1, 1.2, .1, .5, { c: 0x8040ff, b: 0xff60c0, g: 0x301060, t: 'fan', x: ['stars'] }],
      ['Seraph Koi', 2, 1, 5, 30, { c: 0xffffff, b: 0xfff0c0, f: 0xffd040, t: 'fan', x: ['wings', 'halo'], g: 0x605030 }],
      ['Galaxy Ray', 3, 1, 20, 200, { k: 'r', c: 0x201040, x: ['stars'], g: 0x100830 }],
      ['Sun Serpent', 4, 1, 200, 1500, { k: 'e', c: 0xffc020, g: 0x804000, x: ['halo'] }],
      ['Black Hole Fish', 5, 1, 1, 999, { k: 'p', c: 0x050505, x: ['ring'] }],
      ['Archangel Whale', 6, 1, 5000, 50000, { k: 's', c: 0xf0f0ff, g: 0x605870, x: ['wings', 'halo'] }],
      ['The Creator', 7, 1, 1, 1, { k: 'd', c: 0xffffff, g: 0xb0a080, x: ['halo', 'stars', 'crown', 'wings'] }]],
  };
  D.FISH = []; // [name, tier, price, minKg, maxKg, colour, biomeIndex, look]
  D.BIOMES.forEach((b, bi) => { (F[b.id] || []).forEach(r => D.FISH.push([r[0], r[1], Math.round(TB[r[1]] * b.mult * r[2]), r[3], r[4], r[5].c, bi, r[5]])); });
  // biome rods: sold only in that island's shop
  const RR = [['coral', 'Reef Rod', 60e3, 2.8, .31, 1.6, 18, .22, 0xff7a8a], ['coral', 'Pearl Rod', 250e3, 3.2, .33, 1.8, 20, .26, 0xfff0f4],
    ['desert', 'Sandstorm Rod', 600e3, 3.6, .34, 1.95, 21, .28, 0xd8b070], ['desert', 'Pharaoh Rod', 2e6, 4.6, .35, 2.1, 22, .3, 0x2050c0],
    ['snow', 'Frostbite Rod', 5e6, 6.2, .36, 2.25, 23, .32, 0xa0d8ff], ['snow', 'Glacier Rod', 15e6, 7.4, .37, 2.4, 24, .34, 0xe8f8ff],
    ['swamp', 'Spore Rod', 40e6, 7.8, .38, 2.55, 25, .35, 0x9050c0], ['swamp', 'Toadstool Rod', 120e6, 8.2, .39, 2.7, 26, .36, 0xd03030],
    ['crystal', 'Prism Rod', 300e6, 8.6, .4, 2.9, 27, .37, 0x50e0ff], ['crystal', 'Geode Rod', 900e6, 9, .41, 3.1, 28, .38, 0xb070ff],
    ['hell', 'Hellfire Rod', 3e9, 14, .42, 3.4, 29, .39, 0xff5010], ['hell', 'Demon Rod', 10e9, 18, .44, 3.7, 30, .4, 0x400810],
    ['celestial', 'Starlight Rod', 40e9, 24, .46, 4, 31, .42, 0xfff0a0], ['celestial', 'Cosmic Rod', 150e9, 32, .5, 4.5, 33, .45, 0x8040ff],
    ['celestial', 'Nebula Rod', 15e9, 20, .45, 3.85, 31, .41, 0xff70d0]]; // appended last so saved rod numbers never shift
  D.RODS = RR.map(r => ({ biome: D.BIOMES.findIndex(b => b.id === r[0]), n: r[1], p: r[2], luck: r[3], zone: r[4], pow: r[5], cast: r[6], spd: r[7], col: r[8] }));
})();
