// Fishing Unblocked v2 - fish data (window.FWFISH). All names original. Fish have no mouths
// (sole exception: the 'grin' extra on the Travis Scott Triggerfish shiny). Row index 9 (optional): its shiny form {n, x:[extra looks]}.
(function(){
var OUT=[];
function I(isl,rows){
  rows.forEach(function(r){
    var w=r[6]||{}, l=r[7]||{};
    OUT.push({
      id:r[0], n:r[1], isl:isl, tier:r[2], kg:[r[3],r[4]], beh:r[5],
      when:{time:w.time||null, wx:w.wx||null, event:w.event||null, bait:w.bait||null, spot:w.spot||null},
      look:{k:l.k||'fish', c:l.c, b:l.b!=null?l.b:l.c, f:l.f!=null?l.f:l.c, pat:l.pat||'none', pc:l.pc!=null?l.pc:0xffffff,
        glow:l.glow||0, o:l.o!=null?l.o:1, L:l.L||1, H:l.H||1, W:l.W||1, tail:l.tail||'fork', x:l.x||[]},
      d:r[8], shiny:r[9]||null
    });
  });
}

// ---------------- HARBOR ----------------
I('harbor',[
 ['harbor-pierling','Pierling',0,0.2,1.2,'steady',{},{c:0x8a9aa8,b:0xdde4e8,f:0x6b7a88,pat:'scales',pc:0xaab6c0},'Hangs around the pilings, nibbling barnacle scraps.'],
 ['harbor-tarnfin','Tarnfin',0,0.3,1.5,'darter',{},{c:0x4a5a66,b:0x9aa8b2,f:0x38444e,pat:'stripes',pc:0x2a343c,L:0.9},'Dull as old iron, quick as a dropped coin.'],
 ['harbor-ropeeel','Rope Eel',0,0.4,2,'erratic',{time:'night'},{k:'eel',c:0x8b7a55,b:0xc8b98a,f:0x6e5f40,pat:'bands',pc:0x5a4a2c,L:1.1},'Tangles itself in knots and bites nothing it cannot untie.'],
 ['harbor-buoyfish','Buoyfish',0,0.5,2.4,'steady',{},{k:'puffer',c:0xd24a3a,b:0xf4e6d8,f:0xb03a2c,pat:'bands',pc:0xffffff},'Bobs on the surface like a tiny marker buoy.'],
 ['harbor-silverlamp','Silverlamp',1,0.6,3,'darter',{time:'night'},{c:0xc6d4e0,b:0xffffff,f:0x9fb4c6,glow:0x88aacc,pat:'gradient',pc:0x7a90a8},'Its flank catches harbour lamps and throws them back.'],
 ['harbor-bargeback','Bargeback',1,1,5,'tank',{bait:'shrimp'},{k:'long',c:0x5c6b50,b:0xb8bfa0,f:0x46543c,pat:'scales',pc:0x7a8a66,W:1.2,tail:'fan'},'Broad, slow and always heading somewhere heavy.'],
 ['harbor-gullray','Gull Ray',1,1.5,6,'steady',{wx:['wind','clear']},{k:'ray',c:0xe4e8ec,b:0xffffff,f:0xc4ccd4,pat:'spots',pc:0x8a96a2,x:['wings']},'Glides under the surface with wings like a gull.'],
 ['harbor-lanternroach','Lantern Roach',1,0.3,1.1,'erratic',{spot:'lake'},{c:0xd8a838,b:0xfff0b8,f:0xc08a28,glow:0xffcc55,pat:'spots',pc:0xfff2a0},'Pond-dweller that blinks gold at dusk.'],
 ['harbor-mudscale','Mudscale Carp',0,0.8,4,'steady',{spot:'lake'},{c:0x6e6a3c,b:0xbdb585,f:0x585530,pat:'scales',pc:0x8e8a58,W:1.1},'A patient pond carp wearing a coat of silt.'],
 ['harbor-reedglass','Reedglass',1,0.3,1.4,'darter',{spot:'lake',time:'day'},{c:0xb8e0d0,b:0xf0fff8,f:0x98c8b8,o:0.6,pat:'stripes',pc:0x6aa090},'Nearly invisible among the pond reeds.'],
 ['harbor-brinebream','Brine Bream',2,2,9,'puller',{wx:['rain','storm']},{c:0x3e6a8a,b:0xb0cce0,f:0x2c5070,pat:'bands',pc:0x1e3c58,H:1.2},'Rain stirs it up from the mud to feed in a frenzy.'],
 ['harbor-wickeljack','Wickeljack',2,3,12,'tank',{bait:'minnow'},{c:0x7a5a3a,b:0xd0b890,f:0x5a4028,pat:'stripes',pc:0x3e2c1a,x:['spikes']},'A stout, stripe-backed brawler, heavy for its size.'],
 ['harbor-foghorn','Foghorn Eel',3,6,26,'puller',{wx:['fog']},{k:'eel',c:0x586878,b:0xa0b0c0,f:0x44525e,pat:'bands',pc:0x2e3a44,L:1.5,x:['eye-glow']},'Only surfaces when the harbour is thick with fog.'],
 ['harbor-oldtollkeeper','Old Tollkeeper',4,25,90,'tank',{time:'night',bait:'cheese'},{c:0x6a6a52,b:0xc0bca0,f:0x504e3a,pat:'scales',pc:0x8a8870,L:1.4,H:1.2,x:['crown','armor']},'Legend says it charges one coin from every boat that passes.'],
 ['harbor-wreckwhale','Wreckwhale Pup',5,120,400,'tank',{wx:['storm'],spot:'sea'},{k:'blob',c:0x3a4a5a,b:0x9aa8b4,f:0x2a3640,pat:'spots',pc:0x6a7a88,L:1.8,H:1.5,W:1.4,tail:'fan'},'A drifting leviathan calf that wandered in after a storm.'],
 ['harbor-beaconkoi','Beacon Koi',6,8,30,'erratic',{spot:'lake',time:'night'},{c:0xfff0d0,b:0xffffff,f:0xffd890,glow:0xffe8a0,pat:'spots',pc:0xe84a2a,tail:'fan',x:['halo','frills']},'A pond koi said to guide lost sailors home.'],
 ['harbor-ledgerfish','The Ledgerfish',7,40,150,'puller',{time:'night',wx:['fog'],bait:'glow',spot:'sea'},{c:0x1c1c28,b:0x585872,f:0x2a2a40,pat:'stripes',pc:0xd4b25a,glow:0xd4b25a,L:1.3,x:['gems','eye-glow']},'Every catch ever made in the harbour is inked on its scales.']
]);

// ---------------- CORAL ----------------
I('coral',[
 ['coral-sunstripe','Sunstripe',0,0.2,1.4,'darter',{time:'day'},{c:0xffb830,b:0xfff0b0,f:0xff9020,pat:'stripes',pc:0xffffff,H:1.2},'Painted in the colours of a lagoon morning.'],
 ['coral-tidepip','Tidepip',0,0.1,0.8,'erratic',{},{c:0x40c8d8,b:0xd8fff8,f:0x20a0b8,pat:'spots',pc:0xffffff,L:0.8},'Barely a speck of colour darting around the shallows.'],
 ['coral-fanwrasse','Fanwrasse',0,0.5,2.5,'steady',{},{c:0xe86a8a,b:0xffd8e0,f:0xc84868,pat:'scales',pc:0xff98b0,tail:'fan'},'A pink fan of a fish that drifts with the current.'],
 ['coral-lagoonling','Lagoonling',0,0.4,2,'steady',{spot:'sea'},{c:0x58d0a8,b:0xe8fff0,f:0x38a888,pat:'gradient',pc:0x2a8a78},'Turquoise from nose to tail, the lagoon\'s common companion.'],
 ['coral-mossback','Mossback Parrot',1,1,6,'puller',{bait:'shrimp'},{c:0x2aa888,b:0xa0e8d0,f:0xe858a0,pat:'scales',pc:0x58d8b8,x:['armor']},'Crunches coral and leaves white sand behind it.'],
 ['coral-skiff-ray','Skiff Ray',1,2,10,'steady',{time:'day'},{k:'ray',c:0x5ab0d0,b:0xf0fcff,f:0x3a90b0,pat:'spots',pc:0xffffff,x:['wings']},'Flat as a small boat and about as quick.'],
 ['coral-gilded-trigger','Gilded Triggerfin',1,1,5,'darter',{},{c:0xe8c040,b:0xfff4b8,f:0x30a8c8,pat:'bands',pc:0x286a8a,x:['spikes']},'Spiny dorsal, gold cheeks, bad attitude.'],
 ['coral-wreckwhisker','Wreck Eel',2,3,14,'erratic',{time:'night'},{k:'eel',c:0x4a7a5a,b:0xa8d0a0,f:0x365a42,pat:'spots',pc:0xd8e8a0,L:1.4,x:['whiskers']},'Lives in the beached ship\'s ribs and comes out when it\'s dark.'],
 ['coral-pearlmantle','Pearlmantle',2,4,16,'steady',{wx:['clear'],time:'day'},{k:'disc',c:0xf4ecf0,b:0xffffff,f:0xe8d0e0,glow:0xffe8f8,pat:'gradient',pc:0xc8a8d0,x:['shell']},'Wears a shell of true pearl on its back.'],
 ['coral-bloomsquid','Bloomsquid',3,5,24,'erratic',{time:'night',bait:'glow'},{k:'squid',c:0xe85a98,b:0xffc0d8,f:0xc83878,glow:0xff70b8,pat:'spots',pc:0xffe0f0,x:['tendrils']},'Pulses with colour like a coral flower opening.'],
 ['coral-reefjudge','Reef Judge',3,10,38,'puller',{spot:'deep'},{k:'shark',c:0x4a6a7a,b:0xe0ecf0,f:0x38525e,pat:'bands',pc:0x2a404a,x:['sail']},'Patrols the atoll\'s edge and fears nothing.'],
 ['coral-saltcrown','Saltcrown Marlin',4,60,220,'puller',{wx:['wind','clear'],spot:'deep'},{k:'long',c:0x2858a8,b:0xe0f0ff,f:0x1a3c78,pat:'stripes',pc:0x70b0f0,L:1.6,x:['horn','sail']},'A blue spear wearing a crown of dorsal spines.'],
 ['coral-tidewyrm','Tidewyrm',5,80,300,'tank',{time:'night',event:null,spot:'sea'},{k:'eel',c:0x18808a,b:0x80d8c8,f:0x106068,pat:'scales',pc:0x40c8b0,glow:0x30e0c0,L:2,x:['frills','eye-glow']},'A sea serpent that coils around the atoll when the moon is high.'],
 ['coral-aurelia-throne','Aurelia of the Reef',6,12,50,'erratic',{wx:['clear'],time:'day',bait:'shrimp'},{c:0xffd870,b:0xfffbe0,f:0xff9ac0,glow:0xffe898,pat:'scales',pc:0xffffff,tail:'fan',x:['halo','crown','gems']},'All the reef\'s colours in a single golden fish.'],
 ['coral-drownedbell','The Drowned Bell',7,50,200,'tank',{time:'night',wx:['fog'],bait:'glow',spot:'deep'},{k:'disc',c:0x2a5a6a,b:0x68a0a8,f:0x1a3c48,pat:'bands',pc:0x58c0b0,glow:0x50e0d0,L:1.2,H:1.3,x:['shell','eye-glow','gems']},'Some say it rings beneath the wreck at midnight.'],
 ['coral-triggerfish','Triggerfish',1,1,6,'puller',{},{k:'fish',c:0xd9863a,b:0xf2c98e,f:0x5a3d22,pat:'scales',pc:0x4a2e18,H:1.3,W:0.9,tail:'fan'},'A grumpy reef guard that locks a spine on its back and bites anything that gets close.',{n:'Travis Scott Triggerfish',x:['braids','chain','grin']}]
]);

// ---------------- FROST ----------------
I('frost',[
 ['frost-icechip','Icechip',0,0.1,0.9,'darter',{},{c:0xc0e0f0,b:0xffffff,f:0xa0c8e0,o:0.8,L:0.8},'A shard of sea-ice that learned to swim.'],
 ['frost-snowperch','Snowperch',0,0.4,2.2,'steady',{},{c:0xe8f0f4,b:0xffffff,f:0xb8ccd8,pat:'spots',pc:0x8aa0b0},'Speckled like snowfall on slate.'],
 ['frost-slatecod','Slate Cod',0,1,5,'steady',{},{c:0x5a6a78,b:0xc8d4dc,f:0x44525e,pat:'gradient',pc:0x8898a6,W:1.1},'Grey, stoic and cold to the touch.'],
 ['frost-pinesmelt','Pinesmelt',0,0.2,1,'erratic',{wx:['wind','clear']},{c:0x4a7a5a,b:0xd0e8d0,f:0x365a42,pat:'stripes',pc:0x24402e,L:0.9},'Smells faintly of evergreen resin.'],
 ['frost-glacierling','Glacierling',1,1,6,'puller',{},{c:0x8ac8e8,b:0xe8faff,f:0x60a8d0,o:0.75,pat:'bands',pc:0xd8f4ff,x:['frost']},'Carries a rime of frost wherever it goes.'],
 ['frost-hoarfin','Hoarfin',1,1,5,'darter',{time:'day',wx:['clear']},{c:0xd0e4f0,b:0xffffff,f:0xf4fcff,pat:'scales',pc:0xa8c8dc,tail:'fan',x:['frost']},'Its fins look like sugared glass.'],
 ['frost-blizzardback','Blizzardback',1,2,9,'puller',{wx:['storm','wind']},{c:0x48688a,b:0xdce8f4,f:0x344e6c,pat:'stripes',pc:0xffffff},'Rises to the surface when the squalls roll in.'],
 ['frost-keeperscarp','Cairncarp',2,3,14,'steady',{spot:'lake'},{c:0x7a8a7a,b:0xcad4c4,f:0x606e60,pat:'scales',pc:0x98a898,x:['armor']},'Lives under the frozen falls and wears stone-grey plates.'],
 ['frost-nightsleet','Nightsleet',2,2,10,'erratic',{time:'night'},{c:0x2a3a5a,b:0x7a90b8,f:0x1c2840,pat:'spots',pc:0xc8e0ff,glow:0x7aa8ff},'A dark fish dotted with cold blue lights.'],
 ['frost-rimeray','Rime Ray',3,6,26,'steady',{wx:['fog','clear'],bait:'shrimp'},{k:'ray',c:0xa8d8f0,b:0xffffff,f:0x78b8d8,pat:'gradient',pc:0xe8f8ff,x:['wings','frost']},'Glides beneath the ice shelf in perfect silence.'],
 ['frost-tuskshark','Tusk Shark',3,15,60,'puller',{spot:'deep'},{k:'shark',c:0x4e6a82,b:0xe4eef4,f:0x3a5266,pat:'bands',pc:0x2e4256,x:['horn','armor']},'A great bruiser with a bony horn on its snout.'],
 ['frost-narwhal-king','Boreal Lancer',4,70,260,'puller',{time:'night',wx:['clear'],spot:'deep'},{k:'long',c:0xc0d0e0,b:0xffffff,f:0x90a8c0,pat:'spots',pc:0x6a7a90,L:1.7,x:['horn','frost']},'A spiralling lance of a fish, lord of the ice shelf.'],
 ['frost-whitegale-wyrm','Whitegale Wyrm',5,90,320,'tank',{wx:['storm'],spot:'sea'},{k:'eel',c:0xf0f6fa,b:0xffffff,f:0xb0d0e8,pat:'bands',pc:0x7aa8d0,glow:0x9ad0ff,L:2.1,x:['frills','frost']},'Rides the blizzard like a ribbon of snow.'],
 ['frost-crystalis','Crystalis',6,10,45,'erratic',{wx:['clear'],time:'day',bait:'minnow'},{c:0xc8f0ff,b:0xffffff,f:0x88d8ff,o:0.7,glow:0xa8e8ff,pat:'scales',pc:0xffffff,x:['gems','halo','frost']},'Sunlight passes through it and comes out as rainbow.'],
 ['frost-mountainsheart','The Frostbound Heart',7,60,240,'tank',{time:'night',bait:'glow',wx:['fog'],spot:'lake'},{k:'disc',c:0x1a2a4a,b:0x4a68a0,f:0x101a30,pat:'spots',pc:0x70c0ff,glow:0x60b0ff,L:1.2,H:1.3,x:['gems','eye-glow','frost']},'A slow pulse of light, deep under frozen stone.']
]);

// ---------------- DUNES ----------------
I('dunes',[
 ['dunes-sandskipper','Sandskipper',0,0.2,1.2,'darter',{},{c:0xe0c890,b:0xfff4d8,f:0xc0a468,pat:'spots',pc:0xa88a50},'Skims the shallows so fast it looks like it is walking.'],
 ['dunes-dustfin','Dustfin',0,0.3,1.6,'steady',{},{c:0xc8a068,b:0xf0dcb0,f:0xa88048,pat:'gradient',pc:0x8a6838},'Brown as a dry riverbed.'],
 ['dunes-mirageperch','Mirage Perch',0,0.5,2.5,'erratic',{time:'day',wx:['clear']},{c:0xf0c860,b:0xfff8d0,f:0xe0a040,o:0.7,pat:'stripes',pc:0xffffff},'Shimmers so much you doubt it is there.'],
 ['dunes-oasiscarp','Oasis Carp',0,0.8,4,'steady',{spot:'lake'},{c:0x58a868,b:0xd8f0c8,f:0x408850,pat:'scales',pc:0x78c888,W:1.1},'Green and calm in the date palms\' shade.'],
 ['dunes-scarabfin','Scarabfin',1,0.8,3.5,'darter',{},{k:'disc',c:0x2a8a7a,b:0x80d0b8,f:0x1a6a5c,pat:'bands',pc:0xe8c850,x:['shell']},'A glossy shell the colour of an old scarab beetle.'],
 ['dunes-ochrebass','Ochre Bass',1,1.5,7,'puller',{bait:'worm'},{c:0xc86a30,b:0xf0c890,f:0xa04c20,pat:'stripes',pc:0x7a3414,H:1.2},'A heavy-shouldered fish with the colour of sandstone.'],
 ['dunes-sunreed','Sunreed Eel',1,1,5,'erratic',{spot:'lake',time:'day'},{k:'eel',c:0xd8a838,b:0xfff0b0,f:0xb88820,pat:'bands',pc:0x8a6418,L:1.2},'Moves like a reed in a hot wind.'],
 ['dunes-templeguard','Templeguard',2,3,14,'tank',{bait:'cheese'},{c:0x8a7a60,b:0xd8ccb0,f:0x6c5e48,pat:'scales',pc:0xb0a080,x:['armor','crown']},'Hides amid fallen columns, scarred with old carvings.'],
 ['dunes-nightadder','Nightadder Eel',2,3,15,'puller',{time:'night'},{k:'eel',c:0x2a2230,b:0x6a5a78,f:0x1a141e,pat:'bands',pc:0xe8a830,L:1.5,x:['eye-glow']},'Cold-blooded and only active when the sand cools.'],
 ['dunes-dunewing','Dunewing Ray',3,8,32,'steady',{wx:['wind'],spot:'sea'},{k:'ray',c:0xe8c078,b:0xfff0d0,f:0xc8a058,pat:'spots',pc:0x987838,x:['wings']},'Sails the surf like a dune carried on the wind.'],
 ['dunes-sirocco-shark','Sirocco Shark',3,18,70,'puller',{wx:['wind','storm'],spot:'deep'},{k:'shark',c:0xb88a58,b:0xf0dcc0,f:0x946a3c,pat:'gradient',pc:0x704a28,x:['sail']},'Arrives with the hot wind and leaves with it too.'],
 ['dunes-pharaoh-gar','Sunking Gar',4,40,160,'tank',{time:'day',wx:['clear'],bait:'minnow'},{k:'long',c:0xd8a830,b:0xfff0b0,f:0xb08418,pat:'scales',pc:0xffe078,L:1.6,x:['crown','armor','gems']},'Gold-scaled and ancient, said to have swum in the temple pools.'],
 ['dunes-glasswyrm','Glasswyrm',5,60,240,'puller',{time:'day',wx:['clear'],spot:'sea'},{k:'eel',c:0xf8e8b0,b:0xffffff,f:0xe8c870,o:0.6,glow:0xffd860,pat:'scales',pc:0xffffff,L:2,x:['frills','flame']},'A serpent of fused sand that glows like noon.'],
 ['dunes-mirage-queen','Queen of Mirages',6,10,40,'erratic',{wx:['clear'],time:'day',spot:'lake'},{c:0xffb860,b:0xfff4d0,f:0xff8a60,o:0.75,glow:0xffd890,pat:'gradient',pc:0xff6a50,tail:'fan',x:['halo','frills','gems']},'Appears only to those who stare at the oasis too long.'],
 ['dunes-buriedstar','The Buried Star',7,50,200,'tank',{time:'night',bait:'glow',spot:'lake'},{k:'disc',c:0x14182e,b:0x4a5890,f:0x0e1020,pat:'spots',pc:0xffe890,glow:0xffe070,L:1.2,H:1.2,x:['stars','eye-glow','gems']},'It fell from the sky in an age forgotten and slept under the sand.']
]);

// ---------------- MIRE ----------------
I('mire',[
 ['mire-bogminnow','Bog Minnow',0,0.1,0.8,'darter',{},{c:0x5a6a3c,b:0xb8c488,f:0x44522c,pat:'spots',pc:0x8a9a58,L:0.8},'A dark little fish of brown water.'],
 ['mire-mangrovekin','Mangrovekin',0,0.4,2,'steady',{},{c:0x6a5438,b:0xc8b088,f:0x4e3c28,pat:'stripes',pc:0x3a2c1c},'Swims among the roots in tight schools.'],
 ['mire-peatfin','Peatfin',0,0.5,3,'steady',{spot:'lake'},{c:0x3e3028,b:0x8a7a68,f:0x2c221c,pat:'gradient',pc:0x1c140e,W:1.1},'Stained black from living in peat water.'],
 ['mire-stilt-gar','Stiltgar',0,0.6,3,'erratic',{},{k:'long',c:0x8a9a60,b:0xe0e8b8,f:0x6a7a46,pat:'bands',pc:0x4a5a2c},'Thin and long as the stilts of the village.'],
 ['mire-sporeback','Sporeback',1,1,5,'puller',{wx:['rain','fog']},{k:'blob',c:0x7a4a8a,b:0xd8b8e0,f:0x5a3468,pat:'spots',pc:0xe8a8f0,glow:0xc878e0,x:['spikes']},'Mushrooms sprout across its back, glowing faintly.'],
 ['mire-lilywing','Lilywing',1,1,4,'darter',{time:'day',spot:'lake'},{k:'ray',c:0xe8a8c8,b:0xfff0f8,f:0xc880a8,pat:'spots',pc:0x68a860,x:['wings']},'Floats under lily pads with flat pink wings.'],
 ['mire-murkeel','Murk Eel',1,1.5,6,'erratic',{time:'night'},{k:'eel',c:0x384a30,b:0x7a9468,f:0x2a3824,pat:'spots',pc:0xa8c878,L:1.3},'Loves still, dark water.'],
 ['mire-knotbark','Knotbark Perch',1,0.8,4,'steady',{spot:'hollow'},{c:0x7a5634,b:0xd8b888,f:0x5a3c22,pat:'bands',pc:0x2e1c10,H:1.2,x:['spikes']},'Brown and furrowed like old bark, it rests against the roots inside the great tree.'],
 ['mire-lanternmoth','Lantern Gill',2,2,10,'erratic',{time:'night',bait:'glow'},{c:0x58d8a8,b:0xd0fff0,f:0x38b888,glow:0x60ffc8,pat:'spots',pc:0xffffff,x:['lantern']},'Follows will-o-wisps through the swamp.'],
 ['mire-rotjaw','Rootback Bream',2,4,18,'tank',{bait:'worm'},{c:0x6a4a2a,b:0xc8a478,f:0x4c3418,pat:'scales',pc:0x886038,x:['armor']},'Its back looks like a gnarled mangrove root.'],
 ['mire-emberroot','Emberroot Eel',2,2,9,'erratic',{spot:'hollow'},{k:'eel',c:0x4a2c1a,b:0xd8925a,f:0x341c10,pat:'bands',pc:0xffa040,glow:0xff8c30,L:1.25,x:['tendrils']},'Coils through the hanging roots of the hollow, its bands glowing like coals.'],
 ['mire-hexscale','Hexscale',3,6,24,'puller',{wx:['fog'],time:'night'},{c:0x4a2a6a,b:0xa888c8,f:0x341e4e,pat:'scales',pc:0xd088ff,glow:0xb060f0,x:['eye-glow','spikes']},'Each scale carries a faint violet sigil.'],
 ['mire-bogwhale','Bog Behemoth',3,20,80,'tank',{spot:'lake'},{k:'blob',c:0x3a4430,b:0x8a9468,f:0x2a3224,pat:'spots',pc:0x5a6a44,L:1.5,W:1.3,tail:'fan'},'The largest thing hiding in the dark pools.'],
 ['mire-fenwraith','Fenwraith',4,15,60,'erratic',{time:'night',wx:['fog'],spot:'lake'},{k:'jelly',c:0xa0e8d0,b:0xe8fff8,f:0x70c8a8,o:0.5,glow:0x80ffd0,x:['tendrils']},'A pale spirit-fish that drifts at midnight.'],
 ['mire-amberheart','Amberheart',4,6,22,'puller',{time:'night',spot:'hollow'},{k:'disc',c:0x8a4a18,b:0xffd48a,f:0x6a3410,pat:'gradient',pc:0xffb040,glow:0xffa83c,o:0.85,x:['gems','frills']},'Sap-gold and slow, it glows from inside like amber held up to a lamp. It only rises after dark.'],
 ['mire-mycelium-eel','Mycelium Serpent',5,70,260,'tank',{wx:['rain'],time:'night',spot:'sea'},{k:'eel',c:0x6a2a5a,b:0xc880b0,f:0x4a1a40,pat:'spots',pc:0xff98e0,glow:0xff68c8,L:2.1,x:['frills','tendrils']},'Threaded with glowing fungus from end to end.'],
 ['mire-swampsaint','Saint of the Reeds',6,10,40,'steady',{time:'day',wx:['fog'],spot:'lake'},{c:0xf0f8d0,b:0xffffff,f:0xc8e088,glow:0xe8ffa0,pat:'bands',pc:0x78b848,tail:'fan',x:['halo','frills']},'Mist wraps around it like a robe.'],
 ['mire-thousandeyes','The Thousand-Eyed',7,40,160,'puller',{time:'night',bait:'glow',wx:['rain'],spot:'lake'},{k:'blob',c:0x1a1a22,b:0x483858,f:0x100e16,pat:'spots',pc:0xffe060,glow:0xffd040,L:1.4,H:1.3,x:['eye-glow','gems','spikes']},'Countless pale eyes open across its hide as you reel.']
]);

// ---------------- CRYSTAL ----------------
I('crystal',[
 ['crystal-prismling','Prismling',0,0.1,1,'darter',{},{c:0xb8d8f8,b:0xffffff,f:0x98c0f0,o:0.8,pat:'gradient',pc:0xf8c0f8,L:0.8},'Splits light into tiny rainbows.'],
 ['crystal-geodeperch','Geode Perch',0,0.5,2.5,'steady',{},{c:0x8a7aa8,b:0xd8d0e8,f:0x6c5c8c,pat:'scales',pc:0xb8a8e0},'Hard-shelled and ringed with purple crystal flecks.'],
 ['crystal-quartzfin','Quartzfin',0,0.3,1.8,'darter',{time:'day'},{c:0xf0f0f8,b:0xffffff,f:0xd8d8f0,o:0.85,pat:'stripes',pc:0xc0c8e8},'Clear as quartz and twice as sharp.'],
 ['crystal-caveglint','Caveglint',0,0.2,1.4,'erratic',{time:'night'},{c:0x4a5a98,b:0xa8b8e8,f:0x34428a,glow:0x7a98ff,pat:'spots',pc:0xd8e4ff},'A cave fish that glitters in the dark.'],
 ['crystal-amethystback','Amethystback',1,1,6,'puller',{},{c:0x8a3ac8,b:0xe0b8f8,f:0x6a24a0,pat:'bands',pc:0xd890ff,x:['gems']},'Its dorsal gems catch every light.'],
 ['crystal-emeraldray','Emerald Ray',1,2,9,'steady',{spot:'lake'},{k:'ray',c:0x28b878,b:0xc0f8e0,f:0x1a9060,pat:'spots',pc:0x90ffc8,x:['wings','gems']},'A flat, green gem that sweeps the crystal lake.'],
 ['crystal-shardshark','Shardshark',2,5,22,'puller',{bait:'minnow'},{k:'shark',c:0x60789a,b:0xdce8f8,f:0x48607c,pat:'bands',pc:0xa8c0e8,x:['spikes','sail']},'Angular and cold, like a knife of ice.'],
 ['crystal-echoeel','Echo Eel',2,3,14,'erratic',{time:'night',spot:'lake'},{k:'eel',c:0x3a5a9a,b:0x98b8f0,f:0x2a4478,pat:'bands',pc:0xe0f0ff,glow:0x70a0ff,L:1.4},'Flickers with the echoes of the cavern.'],
 ['crystal-cavernsquid','Cavern Squid',3,5,22,'erratic',{bait:'glow',spot:'lake'},{k:'squid',c:0xa870e8,b:0xe8d0ff,f:0x8048c8,glow:0xc898ff,pat:'spots',pc:0xffffff,x:['tendrils']},'Blinks signals in colour through the dark water.'],
 ['crystal-rosequartz-carp','Rosequartz Carp',3,8,34,'tank',{wx:['clear'],time:'day'},{c:0xf8a8c8,b:0xfff0f8,f:0xe080a8,o:0.9,pat:'scales',pc:0xffd0e4,W:1.2,x:['armor','gems']},'Looks carved from rose crystal and swims as slowly.'],
 ['crystal-spirecrown','Spirecrown Wyrm',4,40,150,'puller',{spot:'lake',time:'night'},{k:'long',c:0x2a6ac8,b:0xa0d0ff,f:0x1a4a9c,glow:0x60b0ff,pat:'scales',pc:0x90d8ff,L:1.7,x:['crown','spikes','eye-glow']},'Crowned in blue crystal spires.'],
 ['crystal-heartstone-whale','Heartstone Leviathan',5,100,380,'tank',{spot:'lake',bait:'glow'},{k:'blob',c:0x7a28a8,b:0xd8a0f0,f:0x5a1a80,glow:0xb868ff,pat:'spots',pc:0xf0c8ff,L:1.9,H:1.5,W:1.4,tail:'fan',x:['gems','eye-glow']},'A slow giant whose heartbeat makes the crystals hum.'],
 ['crystal-aurora-prism','Prisma Seraph',6,10,45,'erratic',{wx:['clear'],spot:'lake'},{c:0xffffff,b:0xf8e8ff,f:0xc8e8ff,o:0.7,glow:0xe8f0ff,pat:'gradient',pc:0xff98e8,tail:'fan',x:['wings','halo','gems']},'Every facet of it shines a different colour.'],
 ['crystal-voidgeode','The Voidgeode',7,50,200,'tank',{time:'night',bait:'glow',spot:'lake',wx:['fog']},{k:'disc',c:0x0e0a1c,b:0x3a2a6a,f:0x080612,pat:'spots',pc:0xb878ff,glow:0xa060ff,L:1.2,H:1.3,x:['gems','eye-glow','spikes']},'A hollow stone with a star trapped inside.']
]);

// ---------------- EMBER ----------------
I('ember',[
 ['ember-ashfin','Ashfin',0,0.2,1.4,'darter',{},{c:0x6a6a6e,b:0xc0c0c4,f:0x4a4a50,pat:'spots',pc:0x303034},'Grey as old ash, quick as a spark.'],
 ['ember-steamling','Steamling',0,0.3,1.6,'erratic',{},{c:0xe8c8b0,b:0xfff4ec,f:0xd0a888,o:0.75,pat:'gradient',pc:0xffffff},'Rises in clouds of mist where the sea is warm.'],
 ['ember-basaltbarb','Basalt Barb',0,0.6,3,'steady',{},{c:0x2e2e38,b:0x7a7a88,f:0x1e1e26,pat:'scales',pc:0x505060,x:['armor']},'Plated like cooled lava rock.'],
 ['ember-cinderperch','Cinderperch',0,0.4,2,'darter',{time:'night'},{c:0xc84a28,b:0xf0b898,f:0x982a14,pat:'stripes',pc:0x401a10,glow:0xff6a30},'Its stripes glow like cooling embers.'],
 ['ember-obsidianback','Obsidianback',1,1.5,7,'tank',{},{k:'disc',c:0x14141c,b:0x4a4a5a,f:0x0c0c12,pat:'bands',pc:0x7a2a2a,x:['armor','spikes']},'A glassy black fish with edges to match.'],
 ['ember-magmaray','Magma Ray',1,2,9,'steady',{spot:'sea'},{k:'ray',c:0x6a2a1a,b:0xe8a070,f:0x4a1a0e,pat:'spots',pc:0xff8a30,glow:0xff5a20,x:['wings']},'Glowing orange spots on a charred wing.'],
 ['ember-sulfurdart','Sulfur Dart',1,0.8,3.5,'darter',{wx:['clear']},{c:0xe8d838,b:0xfffbb0,f:0xc8b820,pat:'stripes',pc:0x6a6010},'Bright yellow, fast, and smelling of rotten eggs.'],
 ['ember-lavasnapper','Lava Snapper',2,3,14,'puller',{spot:'lava'},{c:0xff5a20,b:0xffd890,f:0xd83a10,glow:0xff7a30,pat:'scales',pc:0xffc040,x:['flame']},'Wriggles through the glowing rivers of the caldera.'],
 ['ember-forgeeel','Forge Eel',2,3,16,'erratic',{spot:'lava'},{k:'eel',c:0xff7a18,b:0xffe8a0,f:0xd85a08,glow:0xff9a30,pat:'bands',pc:0x2a1008,L:1.5,x:['flame']},'Hot as an anvil and always angry.'],
 ['ember-kilnshark','Kiln Shark',3,15,60,'puller',{spot:'deep',wx:['storm']},{k:'shark',c:0x5a3028,b:0xe8b898,f:0x3e2018,pat:'gradient',pc:0xff7a30,glow:0xc84818,x:['sail','flame']},'Cruises the steaming sea like a ship on fire.'],
 ['ember-calderaling','Caldera Squid',3,5,22,'erratic',{spot:'lava',bait:'glow'},{k:'squid',c:0xe83828,b:0xffb890,f:0xc01c14,glow:0xff5a30,pat:'spots',pc:0xffd860,x:['tendrils','flame']},'Pulses like the molten heart of the volcano.'],
 ['ember-phoenix-gar','Phoenix Gar',4,40,150,'puller',{spot:'lava',time:'night'},{k:'long',c:0xff6a20,b:0xffe8b0,f:0xffc030,glow:0xffa030,pat:'scales',pc:0xfff090,L:1.7,x:['wings','crown','flame']},'It rises, burns, and rises again.'],
 ['ember-magmawyrm','Magma Wyrm',5,80,300,'tank',{wx:['storm'],time:'night',spot:'sea'},{k:'eel',c:0x2a0e0a,b:0x8a2a1a,f:0x1a0806,pat:'bands',pc:0xff5a18,glow:0xff4810,L:2.2,x:['frills','flame','eye-glow']},'A river of fire that swims.'],
 ['ember-suncore','Suncore',6,10,40,'erratic',{time:'day',wx:['clear'],spot:'lava'},{c:0xffe878,b:0xffffff,f:0xffb838,glow:0xffe060,pat:'gradient',pc:0xff8a28,tail:'fan',x:['halo','flame','gems']},'A fish of living sunlight, too hot to hold.'],
 ['ember-hollowforge','The Hollowforge',7,50,200,'tank',{time:'night',bait:'glow',spot:'lava',wx:['storm']},{k:'disc',c:0x120808,b:0x582018,f:0x0a0404,pat:'bands',pc:0xff7a20,glow:0xff5010,L:1.3,H:1.3,x:['armor','flame','eye-glow','gems']},'A living anvil, cast in the volcano\'s first fires.']
]);

// ---------------- SKY ----------------
I('sky',[
 ['sky-breezeling','Breezeling',0,0.1,0.9,'darter',{spot:'sea'},{c:0xd8ecf8,b:0xffffff,f:0xb8d8f0,o:0.8,L:0.8},'Skips over the waves around Skyreach like a blown leaf.'],
 ['sky-falldart','Falldart',0,0.3,1.6,'darter',{spot:'sea'},{c:0x70b8e8,b:0xe8f8ff,f:0x4898d0,pat:'stripes',pc:0xffffff},'Leaps clear of the swell as if it were still falling from the sky.'],
 ['sky-marblefin','Marblefin',0,0.5,2.5,'steady',{spot:'sea'},{c:0xeceae4,b:0xffffff,f:0xd0ccc0,pat:'bands',pc:0xa8a498,x:['armor']},'Veined like polished marble.'],
 ['sky-cloudpuff','Cloudpuff',0,0.2,1.2,'steady',{spot:'cloud'},{k:'puffer',c:0xfafcff,b:0xffffff,f:0xe0eaf4,o:0.85,pat:'none'},'A fluffy puff that lives in the cloud sea.'],
 ['sky-spraysprat','Spray Sprat',0,0.1,0.8,'darter',{spot:'skypond'},{c:0x4fb3ad,b:0xeafff9,f:0x2f8f8a,pat:'spots',pc:0xffffff,L:0.8},'Hatched in the mist at the foot of the falls. Its spots glitter like flung droplets.'],
 ['sky-mossgudgeon','Moss Gudgeon',0,0.3,1.6,'steady',{spot:'skypond'},{c:0x6d8a38,b:0xdfe6ae,f:0x55702a,pat:'spots',pc:0xa3c64e,W:1.1,x:['whiskers']},'Grazes the green fur on the wet rocks and wears a little of it home.'],
 ['sky-vaporfin','Vaporfin',1,0.6,3,'erratic',{spot:'cloud'},{c:0xe4f0fa,b:0xffffff,f:0xc8dcf0,o:0.6,pat:'gradient',pc:0xa8c8e8,tail:'fan'},'Barely more than a shape in the cloud.'],
 ['sky-gustray','Gust Ray',1,1.5,7,'steady',{spot:'cloud',wx:['wind']},{k:'ray',c:0xc0d8f0,b:0xffffff,f:0x90b8e0,pat:'spots',pc:0x6898c8,x:['wings']},'Surfs the wind where the clouds gather.'],
 ['sky-templekoi','Temple Koi',1,1,5,'steady',{spot:'sea',time:'day'},{c:0xf8f0e0,b:0xffffff,f:0xf0c868,pat:'spots',pc:0xe86a38,tail:'fan'},'Gathers off the pier, where pilgrims toss coins for luck.'],
 ['sky-pebblechub','Pebble Chub',1,0.6,3,'steady',{spot:'skypond'},{c:0x8a8378,b:0xdcd5c6,f:0x6c665c,pat:'spots',pc:0xbab2a2,H:1.1,x:['armor']},'Speckled grey like a river stone. Hold still and you will lose it on the bottom.'],
 ['sky-reedrunner','Reedrunner',1,0.4,2.2,'darter',{spot:'skypond',time:'day'},{k:'long',c:0x8aa84a,b:0xf0f5cc,f:0x6b8a35,pat:'stripes',pc:0x46661f,L:1.2},'Threads through the pond reeds so fast it leaves them swaying.'],
 ['sky-cumulus-eel','Cumulus Eel',2,3,14,'erratic',{spot:'cloud',wx:['clear']},{k:'eel',c:0xf0f6fc,b:0xffffff,f:0xd0e0f0,o:0.75,pat:'bands',pc:0xb0c8e0,L:1.5,x:['whiskers']},'A fat, soft eel that looks like a cloud.'],
 ['sky-stormkite','Stormkite',2,4,16,'puller',{spot:'cloud',wx:['storm','wind']},{k:'ray',c:0x4a5a78,b:0xc0ccdc,f:0x363e58,pat:'bands',pc:0xf8e868,glow:0xf0e060,x:['wings','spikes']},'Crackles with lightning when the weather turns.'],
 ['sky-pillarpike','Pillar Pike',2,5,20,'puller',{spot:'deep'},{k:'long',c:0x8a9aa8,b:0xe0e8ee,f:0x68788a,pat:'stripes',pc:0x485664,L:1.4},'Long and straight as a marble column. Hunts the deep water off Skyreach.'],
 ['sky-plungebass','Plunge Bass',2,2,9,'puller',{spot:'skypond'},{c:0x2e6c78,b:0xcdeeee,f:0x1e505a,pat:'bands',pc:0x9adfe6,H:1.15,x:['spikes']},'Waits right under the falls and strikes anything that tumbles in.'],
 ['sky-wetstoneloach','Wetstone Loach',2,1.5,6,'erratic',{spot:'skypond',wx:['rain','storm']},{k:'eel',c:0x485a50,b:0xa9baa9,f:0x34443c,pat:'spots',pc:0x93a493,L:1.1,x:['whiskers']},'Leaves its crack in the rocks only when rain drums on the pond.'],
 ['sky-skywhale','Cloudwhale',3,20,90,'tank',{spot:'cloud',wx:['clear','wind']},{k:'blob',c:0xdce8f4,b:0xffffff,f:0xb8d0e8,o:0.85,pat:'gradient',pc:0x98b8d8,L:1.8,H:1.4,W:1.4,tail:'fan'},'A vast, gentle cloud whale.'],
 ['sky-halcyon','Halcyon Sailfin',3,10,40,'puller',{spot:'cloud',time:'day'},{k:'long',c:0x3aa8e8,b:0xf0fcff,f:0xf8f0a8,pat:'stripes',pc:0xffffff,L:1.5,x:['sail','wings']},'Flies from cloud to cloud faster than sight.'],
 ['sky-prismspray','Prismspray Trout',3,4,16,'puller',{spot:'skypond',time:'day',wx:['clear']},{c:0x56c4c8,b:0xfff8ec,f:0xffb35c,pat:'gradient',pc:0xc08cff,glow:0xfff2d0,tail:'fan',x:['frills']},'Leaps through the spray on sunny days and paints a rainbow on every jump.'],
 ['sky-celestine','Celestine Drake',4,40,160,'puller',{spot:'cloud',time:'day',wx:['wind']},{k:'eel',c:0x88c0f8,b:0xf8fcff,f:0xffe898,glow:0xb8e0ff,pat:'scales',pc:0xffffff,L:2,x:['wings','frills','halo']},'A sky dragon of cloud and light.'],
 ['sky-moonspill','Moonspill Sovereign',4,30,120,'tank',{spot:'skypond',time:'night'},{c:0x1e3a4e,b:0x9cbcd2,f:0x122636,pat:'scales',pc:0xe4f6ff,glow:0xbfe6ff,L:1.6,H:1.25,tail:'fan',x:['crown','eye-glow']},'Rises only when moonlight pours down the falls, and wears the spill like a crown.'],
 ['sky-thunderwyrm','Thunderwyrm',5,70,280,'tank',{spot:'cloud',wx:['storm']},{k:'eel',c:0x2a2e58,b:0x7a84b8,f:0x1a1c3a,pat:'bands',pc:0xf8f070,glow:0xf0e868,L:2.2,x:['frills','spikes','eye-glow']},'Arrives with thunder and takes it away again.'],
 ['sky-seraph-ray','Seraphim Ray',6,10,45,'steady',{spot:'cloud',time:'day',wx:['clear'],bait:'minnow'},{k:'ray',c:0xfff8e0,b:0xffffff,f:0xffe8a0,glow:0xfff0b8,pat:'gradient',pc:0xffd860,x:['wings','halo','gems']},'A golden messenger of the clear sky.'],
 ['sky-starwell-leviathan','Starwell Leviathan',7,60,260,'tank',{spot:'cloud',time:'night',wx:['clear'],bait:'glow'},{k:'blob',c:0x0e1030,b:0x3a4890,f:0x080a20,pat:'spots',pc:0xffffff,glow:0x8aa8ff,L:2,H:1.4,W:1.4,tail:'fan',x:['stars','eye-glow','gems']},'It swims among cloud and carries an entire night sky on its back.']
]);

// ---------------- ELDER ----------------
I('elder',[
 ['elder-mosscarp','Mosscarp',0,0.5,3,'steady',{},{c:0x5a7a3c,b:0xc0d498,f:0x486030,pat:'scales',pc:0x7a9a52,W:1.1},'Covered in green moss.'],
 ['elder-runefin','Runefin',0,0.3,1.8,'darter',{},{c:0x7a8a78,b:0xd0d8c8,f:0x5c6a5a,pat:'stripes',pc:0xd8e8a0},'Marked with faint grooved glyphs.'],
 ['elder-vinesprat','Vine Sprat',0,0.1,0.9,'erratic',{},{k:'eel',c:0x3a8a48,b:0xa8e0a8,f:0x286a34,L:0.7},'Wriggles like a loose vine.'],
 ['elder-jungleperch','Junglerain Perch',0,0.5,2.5,'steady',{wx:['rain']},{c:0x2a8a68,b:0xc8f0d8,f:0x1a6a50,pat:'spots',pc:0xf8e858},'Only the rain brings it out.'],
 ['elder-aqueduct-eel','Aqueduct Eel',1,1,5,'erratic',{spot:'lake'},{k:'eel',c:0x8a8a6a,b:0xd8d8b8,f:0x6c6c50,pat:'bands',pc:0x58583c,L:1.3},'Slides through broken stone channels.'],
 ['elder-idolfish','Idolfish',1,1.5,7,'tank',{},{k:'disc',c:0x7a7a70,b:0xc8c8be,f:0x5c5c54,pat:'spots',pc:0x8a9a60,x:['armor','crown']},'A stone-faced fish that never seems to blink.'],
 ['elder-ringray','Standing Ray',1,2,9,'steady',{time:'day'},{k:'ray',c:0x8a9a78,b:0xe8f0d8,f:0x6a7a5a,pat:'spots',pc:0xc8d89a,x:['wings']},'Circles in slow rings like the stones above.'],
 ['elder-oathscale','Oathscale',2,3,14,'puller',{time:'night'},{c:0x58602a,b:0xc0c488,f:0x424a1c,pat:'scales',pc:0xe8d878,glow:0xe8d060,x:['gems']},'Its gold-green scales hold the memory of old promises.'],
 ['elder-statuegar','Statue Gar',2,4,18,'tank',{bait:'cheese'},{k:'long',c:0x7a8a7a,b:0xd0d8d0,f:0x5c6a5c,pat:'bands',pc:0x4a5a4a,L:1.5,x:['armor']},'Rigid as stone, with a green patina.'],
 ['elder-pilgrimray','Pilgrim Manta',3,10,40,'steady',{wx:['fog'],time:'day'},{k:'ray',c:0x4a7a78,b:0xd8f0e8,f:0x365c5a,pat:'bands',pc:0xe8f4c8,x:['wings','halo']},'Glides in slow procession.'],
 ['elder-jadeking','Jade Warden',3,8,34,'puller',{spot:'lake',bait:'shrimp'},{c:0x28b078,b:0xc0f8d8,f:0x1a8a5a,glow:0x58e8a0,pat:'scales',pc:0x90ffc8,x:['crown','gems']},'Guards the pools where the ancient altars stand.'],
 ['elder-oldgod-koi','Elder Koi',4,30,120,'tank',{time:'night',wx:['fog'],spot:'lake'},{c:0xe8e8d0,b:0xffffff,f:0xf0d080,glow:0xe8e0a0,pat:'spots',pc:0x588a48,tail:'fan',x:['halo','frills','crown']},'Older than the ruins, and wiser than all of them.'],
 ['elder-rootwyrm','Rootwyrm',5,80,300,'puller',{wx:['rain'],spot:'sea'},{k:'eel',c:0x4a3a20,b:0xa88858,f:0x32260e,pat:'bands',pc:0x68a048,L:2.2,x:['tendrils','frills']},'Roots bind its spine like a living tree.'],
 ['elder-sunstone-seraph','Sunstone Seraph',6,10,45,'erratic',{time:'day',wx:['clear'],spot:'lake'},{c:0xffe090,b:0xfffbe8,f:0xf8c860,glow:0xffe8a0,pat:'scales',pc:0xffffff,tail:'fan',x:['halo','wings','gems']},'It shines when light falls on the old altars.'],
 ['elder-forgotten-name','The Forgotten',7,50,200,'tank',{time:'night',bait:'glow',wx:['fog'],spot:'lake'},{k:'disc',c:0x242a20,b:0x5a6a50,f:0x181c14,pat:'bands',pc:0x98e898,glow:0x70ff98,L:1.3,H:1.3,x:['armor','eye-glow','gems']},'No chronicle names it, but every statue faces it.']
]);

// ---------------- GROTTO ----------------
I('grotto',[
 ['grotto-glowmoth','Glowmoth Fry',0,0.1,0.8,'darter',{},{c:0x68e8d0,b:0xe0fff8,f:0x40c8b0,glow:0x60ffe0,pat:'spots',pc:0xffffff,L:0.8},'Tiny lights in black water.'],
 ['grotto-dripscale','Dripscale',0,0.3,1.8,'steady',{},{c:0x4a6a8a,b:0xb8cce0,f:0x365270,pat:'scales',pc:0x78a0c8},'Slick, cold, and constantly dripping.'],
 ['grotto-blindpearl','Blind Pearl',0,0.4,2.2,'steady',{},{k:'puffer',c:0xe8e0f0,b:0xffffff,f:0xc8c0d8,pat:'none',o:0.9},'White and eyeless, it finds its way by feel.'],
 ['grotto-stalactite-eel','Stalactite Eel',1,1,5,'erratic',{},{k:'eel',c:0x7a8a98,b:0xd0d8e0,f:0x5c6a78,pat:'bands',pc:0x3a4654,L:1.3,x:['spikes']},'Thin, hard and shaped like a hanging stone.'],
 ['grotto-lumenray','Lumen Ray',1,2,8,'steady',{time:'night'},{k:'ray',c:0x2a4a8a,b:0x80a8e8,f:0x1c3468,glow:0x60a0ff,pat:'spots',pc:0xc8e0ff,x:['wings']},'Wings spotted with cold light.'],
 ['grotto-cavecarp','Chasm Carp',1,2,10,'tank',{},{c:0x3a4a5a,b:0x8a9aaa,f:0x2a3644,pat:'scales',pc:0x5a6e82,W:1.2,x:['armor']},'Heavy and calm, adrift in the dark.'],
 ['grotto-glasseel','Glass Eel',2,2,10,'erratic',{},{k:'eel',c:0xb8e8f8,b:0xffffff,f:0x88d0e8,o:0.45,glow:0x70d8ff,L:1.4},'A transparent glow in black water.'],
 ['grotto-echoshark','Echo Shark',2,8,30,'puller',{spot:'deep'},{k:'shark',c:0x28384a,b:0x7a8ea4,f:0x1c2836,pat:'bands',pc:0x48f0e8,glow:0x38d8d0,x:['sail','eye-glow']},'Listens, then strikes.'],
 ['grotto-dripping-jelly','Hollow Jelly',2,2,8,'erratic',{bait:'glow'},{k:'jelly',c:0x9a68e8,b:0xe0c8ff,f:0x7848c8,o:0.55,glow:0xb888ff,x:['tendrils']},'Hangs in the cave like a violet lantern.'],
 ['grotto-moonquill','Moonquill Squid',3,6,26,'erratic',{time:'night',bait:'glow'},{k:'squid',c:0x2a2a6a,b:0x8a88d8,f:0x1c1c4a,glow:0x8a98ff,pat:'spots',pc:0xf0f0ff,x:['tendrils','stars']},'Its mantle is dotted with a map of constellations.'],
 ['grotto-cragmaw-gar','Crag Gar',3,15,60,'tank',{spot:'deep'},{k:'long',c:0x4a5a50,b:0x9aa8a0,f:0x364238,pat:'scales',pc:0x7a8a80,L:1.6,x:['armor','spikes']},'Armoured like the cave wall itself.'],
 ['grotto-dawnchoir','Dawnchoir Fish',3,5,22,'steady',{wx:['clear'],bait:'shrimp'},{c:0xf8c8e0,b:0xffffff,f:0xf0a0c8,glow:0xffd8f0,pat:'gradient',pc:0xffe0a0,tail:'fan',x:['frills']},'Seems to hum a note when pulled out.'],
 ['grotto-prism-leviathan','Prism Leviathan',4,80,300,'tank',{time:'night',spot:'deep'},{k:'blob',c:0x38c8e8,b:0xd0f8ff,f:0x1a98c0,glow:0x60e8ff,pat:'gradient',pc:0xff80f0,L:1.9,H:1.4,W:1.4,tail:'fan',x:['gems','eye-glow']},'Refracts the glow of the whole cavern.'],
 ['grotto-lanternking','Lantern King',4,30,120,'puller',{bait:'glow',time:'night'},{k:'long',c:0xffc848,b:0xfff4c0,f:0xe89828,glow:0xffe070,pat:'scales',pc:0xffffff,L:1.5,x:['lantern','crown','eye-glow']},'Bears a golden lamp that never goes out.'],
 ['grotto-abyssal-serpent','Abyssal Serpent',5,100,380,'puller',{time:'night',spot:'deep',wx:['storm']},{k:'eel',c:0x10182a,b:0x405a80,f:0x080c18,pat:'bands',pc:0x48d8ff,glow:0x40c8ff,L:2.4,x:['frills','eye-glow','spikes']},'Coiled in the deepest drop of the pond.'],
 ['grotto-vaultspirit','Vault Spirit',5,40,160,'erratic',{wx:['fog'],spot:'lake',bait:'glow'},{k:'jelly',c:0xe0f8ff,b:0xffffff,f:0xb8e8ff,o:0.4,glow:0xc8f0ff,x:['halo','tendrils']},'Rises as a pale ghost light and vanishes if you blink.'],
 ['grotto-sunken-star','The Sunken Star',6,20,80,'tank',{time:'night',bait:'glow'},{c:0xffffff,b:0xfff8d8,f:0xffe898,glow:0xfff0b0,pat:'gradient',pc:0xaad8ff,tail:'fan',x:['stars','halo','gems']},'A star that came down to cool in the cave pond.'],
 ['grotto-cavernheart','The Cavernheart',7,100,400,'tank',{time:'night',bait:'glow',spot:'deep',wx:['fog']},{k:'disc',c:0x0a0a1a,b:0x4a3a8a,f:0x06060e,pat:'spots',pc:0xc890ff,glow:0xb070ff,L:1.4,H:1.4,x:['gems','eye-glow','armor','halo']},'The grotto itself, if it were a fish.'],
 ['grotto-hollow-oracle','The Hollow Oracle',7,40,180,'puller',{wx:['storm'],time:'night',bait:'glow',spot:'lake'},{c:0xe0e8ff,b:0xffffff,f:0xa0b0f0,o:0.6,glow:0xd0e0ff,pat:'bands',pc:0x4a5ae0,tail:'fan',x:['stars','eye-glow','halo','gems']},'It knows which fish you wanted all along.']
]);

// ---------------- EVENT FISH ----------------
I(null,[
 ['meteor-stardust-minnow','Stardust Minnow',3,0.5,3,'darter',{event:'meteor',time:'night'},{c:0x2a2a58,b:0x9a98e0,f:0x1c1c3c,pat:'spots',pc:0xffffff,glow:0xb8b0ff,L:0.9,x:['stars']},'Fell with the meteors, still glittering.'],
 ['meteor-slagfin','Slagfin Skate',4,10,50,'puller',{event:'meteor',time:'night'},{k:'ray',c:0x3a2a28,b:0x9a6858,f:0x241816,pat:'spots',pc:0xff7a40,glow:0xff6a30,x:['wings','armor']},'A rock-hard ray, forged in the fall.'],
 ['meteor-comet-eel','Comet Eel',5,30,140,'erratic',{event:'meteor',time:'night'},{k:'eel',c:0xe8f0ff,b:0xffffff,f:0x88b0ff,glow:0xc8e0ff,pat:'gradient',pc:0x5a78e8,L:2,x:['stars','frills']},'Trails a tail of light.'],
 ['meteor-fallen-sovereign','Fallen Sovereign',6,15,60,'tank',{event:'meteor',time:'night',bait:'glow'},{k:'disc',c:0x201a38,b:0x6a5a9a,f:0x120e22,pat:'spots',pc:0xffe890,glow:0xffe070,L:1.2,H:1.2,x:['crown','stars','gems']},'A comet lord that crowned itself in the crash.'],
 ['frost-aurora-ribbon','Aurora Ribbon',3,3,14,'erratic',{event:'aurora',time:'night'},{k:'eel',c:0x58f0b0,b:0xd8fff0,f:0x38d0e8,glow:0x70ffd0,pat:'gradient',pc:0xb878ff,L:1.6,x:['frills']},'Colour like the curtains overhead.'],
 ['frost-aurora-lancer','Polar Lancer',4,15,70,'puller',{event:'aurora',time:'night'},{k:'long',c:0x3a98e8,b:0xd0f0ff,f:0xa878f8,glow:0x78c8ff,pat:'stripes',pc:0x90ffe0,L:1.6,x:['horn','frost']},'A lance of green light.'],
 ['frost-aurora-wyrm','Aurorawyrm',5,50,220,'tank',{event:'aurora',time:'night'},{k:'eel',c:0x20c8a8,b:0xe0fff4,f:0x9858f0,glow:0x60ffd8,pat:'bands',pc:0xff80e8,L:2.2,x:['frills','halo','eye-glow']},'Ripples across the sky and the sea.'],
 ['whirl-spindle','Spindlefish',3,2,14,'erratic',{event:'whirlpool'},{k:'long',c:0x2a5a8a,b:0xa0c8e8,f:0x1c4268,pat:'bands',pc:0xe8f4ff,L:1.4},'Spins as it swims, always in circles.'],
 ['whirl-vortexray','Vortex Ray',4,10,60,'puller',{event:'whirlpool'},{k:'ray',c:0x1a4a78,b:0x78a8d0,f:0x123658,pat:'bands',pc:0x80e0ff,glow:0x50c0ff,x:['wings','eye-glow']},'Spiral lines wind across its wings.'],
 ['whirl-maelstrom-colossus','Maelstrom Colossus',6,60,260,'tank',{event:'whirlpool'},{k:'blob',c:0x0a2a4a,b:0x3a7aa8,f:0x061a30,pat:'spots',pc:0x70d8ff,glow:0x40b8f0,L:1.9,H:1.4,W:1.4,tail:'fan',x:['armor','eye-glow']},'Lives at the bottom of the whirlpool.'],
 ['surge-tideglow','Tideglow Bass',2,2,10,'puller',{event:'surge'},{c:0x38d8c8,b:0xd0fff8,f:0x20b0a8,glow:0x50ffe8,pat:'stripes',pc:0xffffff},'Shows up in swarms when the sea surges.'],
 ['surge-bountyfin','Bountyfin',4,12,55,'darter',{event:'surge'},{c:0xffc838,b:0xfff4b0,f:0xf0a020,glow:0xffe060,pat:'scales',pc:0xffffff,tail:'fan',x:['gems']},'A swarm of bounty-seekers follows it.'],
 ['surge-abundance','Abundance Whale',5,60,240,'tank',{event:'surge'},{k:'blob',c:0xf8e8b0,b:0xffffff,f:0xe8c870,glow:0xffe898,pat:'gradient',pc:0xffb838,L:1.8,H:1.4,W:1.4,tail:'fan',x:['halo','gems']},'A gentle gold giant of the tides.'],
 ['blood-crimsonray','Crimson Ray',3,6,28,'puller',{event:'bloodtide'},{k:'ray',c:0x8a1a1a,b:0xe08888,f:0x5e1010,pat:'spots',pc:0xff4a4a,x:['wings','spikes']},'Stained deep red by the tide it swims in.'],
 ['blood-reaver','Tideshark Reaver',4,25,110,'puller',{event:'bloodtide'},{k:'shark',c:0x601010,b:0xd09080,f:0x3a0808,pat:'bands',pc:0xff3030,glow:0xc01818,x:['sail','spikes','eye-glow']},'Cuts the water like a red blade.'],
 ['blood-leviathan','Bloodmoon Leviathan',6,80,320,'tank',{event:'bloodtide',time:'night'},{k:'blob',c:0x3a0606,b:0x9a2a2a,f:0x1e0303,pat:'spots',pc:0xff5050,glow:0xe02020,L:2,H:1.5,W:1.4,tail:'fan',x:['armor','eye-glow','spikes','horn']},'Awakens when the sea runs red.']
]);
OUT.forEach(function(f){ if(f.id.indexOf('frost-aurora')===0) f.isl='frost'; });
window.FWFISH=OUT;
})();
