// Fishing Unblocked v2 - rods. Every rod is a side-grade: strengths come with real weaknesses.
// stats: luck 0..3, pow 1..4.5, zone .18..0.42, cast 9..32, spd 0..0.45, ctl 0..1
(function(){
  var R = [];
  function r(id,n,p,sold,lvl,s,t,passive,col,quest){
    R.push({id:id,n:n,p:p,sold:sold,quest:quest||null,lvl:lvl,luck:s[0],pow:s[1],zone:s[2],cast:s[3],spd:s[4],ctl:s[5],t:t,passive:passive,col:col});
  }
  function P(id,v,desc){ return {id:id,v:v,desc:desc}; }
  //            id, name, price, shop, lvl, [luck,pow,zone,cast,spd,ctl], trait, passive, color
  // ---- Driftwood Harbor (starters) ----
  r('rod-driftwood','Driftwood Stick',0,'harbor',0,[0,1.2,0.34,12,0.10,0.45],'Free and forgiving. Wide reel bar, weak against big fish.',null,0x9a7b52);
  r('rod-reedcane','Reed Cane',350,'harbor',0,[0.3,1.4,0.26,20,0.22,0.35],'Long whippy cast and quick bites, but the bar is narrow.',null,0xc8b45a);
  r('rod-ashbough','Ashbough Pole',900,'harbor',0,[0.2,2.4,0.28,11,0.02,0.65],'Stiff and sturdy: hauls heavy fish, but short casts and slow bites.',P('size',0.15,'Catches skew a little bigger.'),0x7a5a3a);
  r('rod-pondskipper','Pondskipper',1400,'harbor',0,[0.6,1.5,0.36,10,0.12,0.55],'Made for still water. Great in lakes, mediocre at sea.',P('lake',0.6,'+60% luck in lakes and ponds.'),0x5aa86a);
  // ---- Coral Lagoon ----
  r('rod-brinecomb','Brinecomb',3200,'coral',0,[0.9,1.8,0.27,18,0.18,0.40],'Sharp luck for sunny reefs, but it tangles in bad weather.',P('day',0.45,'+45% luck during the day.'),0xff8a70);
  r('rod-tidewarden','Tidewarden',6500,'coral',3,[0.5,2.9,0.30,14,0.08,0.70],'Heavy and calm. Slow to bite, wonderful against pullers.',P('tension',0.35,'Wider reel bar.'),0x2ab8b0);
  // ---- Frostpeak ----
  r('rod-rimeline','Rimeline',7800,'frost',0,[1.1,2.0,0.22,16,0.20,0.45],'Chilly precision. Luck shines in the cold north.',P('isl:frost',0.6,'+60% luck at Frostpeak.'),0xaee4ff);
  r('rod-glacierhook','Glacier Pole',14000,'frost',5,[0.4,3.6,0.33,9,0.02,0.80],'A slab of ice on a string. Huge power, tiny cast, very slow bites.',P('size',0.28,'Catches skew bigger.'),0x6ab4e8);
  // ---- Sunscorch Dunes ----
  r('rod-dustwhip','Dustwhip',9500,'dunes',0,[0.7,1.6,0.25,30,0.30,0.25],'Casts across the sand sea and bites fast, but wild and hard to steady.',null,0xe8c46a);
  r('rod-mirage','Mirage Reed',18000,'dunes',6,[1.4,1.7,0.24,17,0.14,0.35],'Fickle luck: bright by day, flat when the dunes go dark.',P('day',0.7,'+70% luck during the day.'),0xf0a84a);
  // ---- Mirewood Swamp ----
  r('rod-bogtangle','Bogtangle',11000,'mire',0,[0.8,2.2,0.31,12,0.10,0.60],'Slimy but reliable in still bog water.',P('lake',0.5,'+50% luck in lakes and pools.'),0x6a8a3a);
  r('rod-mothlamp','Mothlamp',21000,'mire',8,[1.2,1.5,0.23,15,0.24,0.30],'Glowing lure that thrives after dusk and attracts odd mutations.',P('night',0.55,'+55% luck at night.'),0xb8e86a);
  // ---- Crystal Hollow ----
  r('rod-geodefall','Geodefall',26000,'crystal',0,[0.8,3.2,0.27,13,0.06,0.55],'Dense stone rod. Mighty pull, but clumsy and slow.',P('mut',0.40,'+40% mutation chance.'),0x9a6ae8);
  r('rod-lumenrod','Lumen Rod',45000,'crystal',10,[1.6,1.3,0.20,19,0.26,0.20],'Dazzling luck, but fragile power and a jittery, narrow bar.',P('shiny',0.8,'+80% shiny chance.'),0xe86ad8);
  // ---- Ember Peak ----
  r('rod-cinderline','Cinderline',60000,'ember',12,[0.5,3.9,0.26,15,0.12,0.72],'Forged for brawls with monsters. Little luck of its own.',P('tension',0.5,'Much wider reel bar.'),0xe8602a);
  r('rod-steamcaster','Steamcaster',38000,'ember',0,[1.0,2.0,0.29,24,0.28,0.35],'Far, fast, and hot-tempered. Great during events.',P('event',0.45,'+45% luck during world events.'),0xff9a4a);
  // ---- Skyreach ----
  r('rod-cloudsnare','Cloudsnare',120000,'sky',15,[1.5,1.8,0.25,28,0.22,0.40],'Light as air, reaches the farthest, rewards the open sky.',P('isl:sky',0.7,'+70% luck at Skyreach.'),0xe8f4ff);
  r('rod-galefeather','Galefeather',75000,'sky',0,[0.9,1.4,0.32,32,0.34,0.22],'Longest cast in the game and fast bites; truly weak against strong fish.',null,0xffffff);
  // ---- Elderstone Ruins ----
  r('rod-mossbranch','Mossbranch',150000,'elder',0,[1.1,2.6,0.30,14,0.10,0.62],'Patient and wise. Learns fast from every catch.',P('xp',0.5,'+50% XP from catches.'),0x6a9a4a);
  r('rod-runestaff','Runestaff',380000,'elder',20,[2.0,2.2,0.21,16,0.12,0.30],'Ancient and demanding: high luck, a tiny reel bar.',P('isl:elder',0.8,'+80% luck at Elderstone Ruins.'),0xc8b88a);
  // ---- Quest-only rods (strong unique passives, still with flaws) ----
  r('rod-tidecaller','Tidecaller',0,null,0,[1.3,2.3,0.30,17,0.18,0.55],'Reads the rain. Storms feed it; calm skies leave it plain.',P('rain',1.2,'+120% luck in rain and storms.'),0x2a8a7a,'sq-mire');
  r('rod-frostfang','Frostfang',0,null,0,[1.0,3.4,0.24,12,0.06,0.78],'A brute of ice. Slow, short and very steady.',P('tension',0.8,'Widest reel bar.'),0x8ad0ff,'sq-frost');
  r('rod-sunspear','Sunspear',0,null,0,[1.8,1.6,0.26,20,0.26,0.28],'Blazing luck under the sun; useless luck after dark.',P('day',1.0,'+100% luck during the day.'),0xffc84a,'sq-dunes');
  r('rod-emberlash','Emberlash',0,null,0,[1.1,3.0,0.27,22,0.20,0.40],'Lashes up mutated catches, but is wild to hold.',P('mut',1.2,'+120% mutation chance.'),0xff4a1a,'sq-ember');
  r('rod-starweaver','Starweaver',0,null,0,[1.7,1.9,0.23,26,0.24,0.32],'Weaves moonlight into luck. Dim by day.',P('night',1.0,'+100% luck at night.'),0x6a7aff,'sq-sky');
  r('rod-elderroot','Elderroot',0,null,0,[1.0,3.6,0.31,11,0.04,0.70],'Ancient taproot: slow, short, and it pulls up giants.',P('size',0.6,'Catches skew much bigger.'),0x5a7a3a,'sq-elder');
  r('rod-reefsong','Reefsong',0,null,0,[1.5,2.0,0.34,18,0.22,0.45],'Gentle and wide. Gold and wisdom follow its songs.',P('money',0.35,'+35% sell value on all fish.'),0xff7ab8,'sq-coral');
  r('rod-prismheart','Prismheart',0,null,0,[2.2,1.4,0.19,16,0.14,0.18],'Enormous luck with the thinnest bar. For the steady-handed.',P('shiny',1.5,'+150% shiny chance.'),0xff8aff,'sq-crystal');
  r('rod-hollowlight','Hollowlight',0,null,0,[1.4,2.4,0.28,15,0.16,0.50],'Thrives far from land, where the deep water listens.',P('deep',1.0,'+100% luck in open deep sea.'),0x4affd0,'sq-grotto');
  // mutation touch: chance this rod puts its own mutation on a catch (bypasses weather/night rules)
  var MX = { 'rod-frostfang':['frostbite',.12,'Frostbitten'], 'rod-glacierhook':['frostbite',.05,'Frostbitten'], 'rod-rimeline':['frosted',.06,'Frosted'],
    'rod-cinderline':['scorched',.08,'Scorched'], 'rod-emberlash':['scorched',.10,'Scorched'], 'rod-mothlamp':['moonlit',.05,'Moonlit'],
    'rod-starweaver':['moonlit',.08,'Moonlit'], 'rod-tidecaller':['charged',.05,'Storm-Charged'], 'rod-lumenrod':['glossy',.15,'Glossy'],
    'rod-prismheart':['prismatic',.012,'Prismatic'] };
  R.forEach(function (o) { var m = MX[o.id]; if (m) o.mx = { k: m[0], c: m[1], n: m[2] }; });
  window.FWRODS = R;
})();
