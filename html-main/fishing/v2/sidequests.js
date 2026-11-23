// Fishing Unblocked v2: island side quests (one story chain per island NPC). Classic script, defines window.SQ.
// State: S.sq[questId] = {s:step, a:chosenApproach(-1 none), p:progress, ok:objectiveMet, started, done}
(function () {
  var NAMES = { harbor: 'Driftwood Harbor', coral: 'Coral Lagoon', frost: 'Frostpeak', dunes: 'Sunscorch Dunes', mire: 'Mirewood Swamp', crystal: 'Crystal Hollow', ember: 'Ember Peak', sky: 'Skyreach', elder: 'Elderstone Ruins', grotto: 'the Hidden Grotto' };
  var ICO = { coral: '', frost: '', dunes: '', mire: '', crystal: '', ember: '', sky: '', elder: '', grotto: '', harbor: '' };
  function nm(i) { return (ICO[i] || '') + ' ' + NAMES[i]; }
  function env() { try { if (typeof ENV === 'function') { var e = ENV(); if (e) return e; } } catch (x) {} return { wx: 'clear', night: false }; }
  function rain(e) { return e.wx === 'rain' || e.wx === 'storm'; }

  // goal builders
  function C(n, d, f) { return { k: 'catch', n: n, d: d, f: f }; }
  function V(ids, d) { return { k: 'visit', n: 1, ids: ids, d: d }; }
  function P(m, d) { return { k: 'pay', n: 1, m: m, d: d }; }

  var Q = {};
  Q['sq-coral'] = {
    npc: 'npc-coral', isl: 'coral', title: 'The Silent Reef', rod: 'rod-reefsong',
    idle: ['The tide chimes are quiet today. Strange, for a lagoon this lively.', 'Mind the coral heads. They bite harder than the fish.', 'Floating on your back out there is the best seat in the world.'],
    steps: [
      { say: 'Every dusk the shell chimes under our huts sing. Three nights now: silence. Something is wrong with the reef. Help me listen.',
        alts: [{ label: 'Net the lagoon shallows', goal: C(4, 'Catch 4 fish at ' + nm('coral'), function (c) { return c.isl === 'coral'; }) },
               { label: 'Dive the blue water', goal: C(2, 'Catch 2 fish in open deep water', function (c) { return c.spot === 'deep'; }) }],
        done: 'Their bellies are full of grey sand. The reef is choking on something, not dying. Good, that I can fix.', money: 300, xp: 30 },
      { say: 'Sand that fine is not ours. I want to know where it blows from. Take a pinch of it to a place that has far too much sand.',
        alts: [{ label: 'Ask the desert', goal: V(['dunes'], 'Visit ' + nm('dunes')) }, { label: 'Ask the marsh', goal: V(['mire'], 'Visit ' + nm('mire')) }],
        done: 'Not a match for either? Then it is old sand, stirred up from below. The storms must be digging it up.', money: 400, xp: 40 },
      { say: 'Storm swells stir the bottom. I need to see what rises in the rain. Fish a wet day and bring me what bites.',
        alts: [{ label: 'Fish in the rain', goal: C(3, 'Catch 3 fish while it rains', function (c, e) { return rain(e); }) },
               { label: 'Fish the whirlpool', goal: C(1, 'Catch a fish during a whirlpool', function (c) { return c.event === 'whirlpool'; }) }],
        done: 'Look at the scales. They hum when I tap them. The reef\'s song is in the fish, hiding.', money: 500, xp: 50 },
      { say: 'Tonight the song may rise. If a good fish is going to sing, it will be after dark, here at the lagoon.',
        goal: C(1, 'Catch a Rare+ fish at ' + nm('coral') + ' at night', function (c, e) { return c.isl === 'coral' && c.tier >= 2 && e.night; }),
        done: 'There it is. One note, clean as glass! The chimes answered. We need new strings to carry it.', money: 700, xp: 70 },
      { say: 'Spun kelp-silk and shell for new chimes costs a bit. Pay the weaver and I will craft you something that sings back to the reef.',
        goal: P(2500, 'Pay the weaver 2,500'), done: 'Hold this. A rod made from the first reed that sang again. Fish with it and the sea will fish with you.', money: 0, xp: 300 }
    ]
  };
  Q['sq-frost'] = {
    npc: 'npc-frost', isl: 'frost', title: 'Brann\'s Cold Hands', rod: 'rod-frostfang',
    idle: ['Ice is honest. It tells you exactly when it will crack, if you listen.', 'The Keeper by the door? Never blinked once in all the years I have known him.', 'Wool, then fur, then more wool. That is the whole of survival here.'],
    steps: [
      { say: 'My hands stopped feeling the line last winter. I need a catch to prove they still work, and I will not do it alone on bad ice. Fish near me.',
        alts: [{ label: 'Work the cold water', goal: C(4, 'Catch 4 fish at ' + nm('frost'), function (c) { return c.isl === 'frost'; }) },
               { label: 'Wait for the aurora', goal: C(1, 'Catch a fish during an aurora', function (c) { return c.event === 'aurora'; }) }],
        done: 'Ha! They still remember. Now I need to warm them up for real.', money: 300, xp: 40 },
      { say: 'Lamp oil is dear. Either pay the trader for a drum, or catch enough fish in nasty weather that the oil is free from the dock fishermen.',
        alts: [{ label: 'Buy lamp oil', goal: P(900, 'Pay 900 for lamp oil') }, { label: 'Fish through foul weather', goal: C(2, 'Catch 2 fish in fog or storm', function (c, e) { return e.wx === 'fog' || e.wx === 'storm'; }) }],
        done: 'That will keep the lantern lit till spring, with luck.', money: 300, xp: 40 },
      { say: 'Beneath the shelf ice there is a fish with a fang as long as my thumb. Catch me something Epic or better from these waters, so I know it is real.',
        goal: C(1, 'Catch an Epic+ fish at ' + nm('frost'), function (c) { return c.isl === 'frost' && c.tier >= 3; }),
        done: 'It is real. Then the old tale of the frostfang is real too. A fang needs a warm place to be carved. I hear the volcano makes the best forges.', money: 600, xp: 80 },
      { say: 'Go see the forge-folk at Ember Peak. Stand in their heat for a moment, then come back to me. I want your hands warm when you tell me about it.',
        goal: V(['ember'], 'Visit ' + nm('ember')), done: 'Your cheeks are red! They told you of the cold-forging, did they? Good. One last thing.', money: 500, xp: 60 },
      { say: 'The great fish of this mountain only rises for those who have earned it. Bring me a Legendary from Frostpeak and I will hand over my best.',
        goal: C(1, 'Catch a Legendary+ fish at ' + nm('frost'), function (c) { return c.isl === 'frost' && c.tier >= 4; }),
        done: 'Take it. Frostfang. Carved from the tooth you proved was real. May your line never freeze.', money: 4000, xp: 400 }
    ]
  };
  Q['sq-dunes'] = {
    npc: 'npc-dunes', isl: 'dunes', title: 'The Mirage Ledger', rod: 'rod-sunspear',
    idle: ['Never trust a puddle in this place. Or a fish that smiles. Then again, fish do not smile.', 'Water is the only coin that matters here.', 'The temple casts a shadow at dawn that points to nothing. Yet.'],
    steps: [
      { say: 'I keep a ledger of debts the desert owes me. The oasis owes me fish. Collect for me in daylight, when the water is clearest.',
        goal: C(3, 'Catch 3 fish at ' + nm('dunes') + ' by day', function (c, e) { return c.isl === 'dunes' && !e.night; }),
        done: 'The ledger is happy. Now the sea owes me too. Let us see who pays.', money: 300, xp: 40 },
      { say: 'Spices from another shore will sweeten a trade. Go to a trading island and show them my sign; I do not care which.',
        alts: [{ label: 'Sail for the lagoon', goal: V(['coral'], 'Visit ' + nm('coral')) }, { label: 'Sail for the swamp', goal: V(['mire'], 'Visit ' + nm('mire')) }, { label: 'Sail for the harbor', goal: V(['harbor'], 'Visit ' + nm('harbor')) }],
        done: 'They remembered my name! And added a line to my ledger. I do like being owed.', money: 400, xp: 40 },
      { say: 'The oasis pool glitters with something old at the bottom. Fish the pool, not the sea. Two will do.',
        goal: C(2, 'Catch 2 fish from a lake at ' + nm('dunes'), function (c) { return c.isl === 'dunes' && c.spot === 'lake'; }),
        done: 'Look at the scales on that one. Fire and sand. The old kings loved them.', money: 500, xp: 60 },
      { say: 'The desert at night is a different animal. Cold, silent. The best fish only bite then. Show me you are no fair-weather angler.',
        goal: C(2, 'Catch 2 fish at ' + nm('dunes') + ' at night', function (c, e) { return c.isl === 'dunes' && e.night; }),
        done: 'Cold fingers, warm heart. The ledger shows you in the black.', money: 600, xp: 70 },
      { say: 'Final entry. A trophy. Bring me something Legendary from the pools or the surf, and the debt is paid in spear.',
        alts: [{ label: 'Hunt from the oasis', goal: C(1, 'Catch a Legendary+ fish from the oasis', function (c) { return c.isl === 'dunes' && c.spot === 'lake' && c.tier >= 4; }) },
               { label: 'Hunt from the surf', goal: C(1, 'Catch a Legendary+ fish from the sea at the Dunes', function (c) { return c.isl === 'dunes' && c.spot !== 'lake' && c.tier >= 4; }) }],
        done: 'Settled. Sunspear is yours. It is warm in the hand, always.', money: 4000, xp: 400 }
    ]
  };
  Q['sq-mire'] = {
    npc: 'npc-mire', isl: 'mire', title: 'Lantern in the Bog', rod: 'rod-tidecaller',
    idle: ['Some mushrooms glow when you do not look at them. Others glow when you do.', 'The planks creak because they like you. Or they hate you.', 'The bog remembers everything that has ever fallen into it.'],
    steps: [
      { say: 'The glow-lanterns on the stilt village keep dimming, and I think it is the fog. Fish out in the damp and see what stirs.',
        alts: [{ label: 'Fish in the fog or rain', goal: C(3, 'Catch 3 fish in fog or rain', function (c, e) { return e.wx === 'fog' || rain(e); }) },
               { label: 'Fish the bog pools', goal: C(4, 'Catch 4 fish from a lake', function (c) { return c.spot === 'lake'; }) }],
        done: 'The mushrooms leaned toward your bucket. They are interested. Good.', money: 300, xp: 40 },
      { say: 'Something in the water is odd. Find me a fish with a strange shape or colour, a mutation, or one so heavy it cannot be natural.',
        alts: [{ label: 'A mutated fish', goal: C(1, 'Catch a mutated fish', function (c) { return !!c.mutation; }) },
               { label: 'A heavyweight', goal: C(1, 'Catch a fish of 5 kg or more', function (c) { return c.kg >= 5; }) }],
        done: 'There. The bog is bending them. Not sickness. Dreaming. The old tide-caller did this on purpose once.', money: 400, xp: 50 },
      { say: 'The tide-caller is a legend, but her notes were in a place with tall glowing stones, or a place of wind and white rock. Find a sign of her at either.',
        alts: [{ label: 'Crystal glow', goal: V(['crystal'], 'Visit ' + nm('crystal')) }, { label: 'Windy heights', goal: V(['sky'], 'Visit ' + nm('sky')) }],
        done: 'A word: patience. She wrote, "the water listens to those who wait." I should have guessed that.', money: 500, xp: 60 },
      { say: 'After dark the bog starts to talk. Come stand on my plank and catch two fish when the lanterns are the only light.',
        goal: C(2, 'Catch 2 fish at ' + nm('mire') + ' at night', function (c, e) { return c.isl === 'mire' && e.night; }),
        done: 'Did you hear it? Like a voice under the planks. I think it just said thanks.', money: 600, xp: 70 },
      { say: 'Last step. Wake the water properly. A big one, Epic or better, from the swamp. Then the rod is yours.',
        goal: C(1, 'Catch an Epic+ fish at ' + nm('mire'), function (c) { return c.isl === 'mire' && c.tier >= 3; }),
        done: 'The Tidecaller. It sways when the tide changes, even in a still room. Take good care of it.', money: 4000, xp: 400 }
    ]
  };
  Q['sq-crystal'] = {
    npc: 'npc-crystal', isl: 'crystal', title: 'The Prism Cutter', rod: 'rod-prismheart',
    idle: ['Hold a stone to the light and it tells you its whole life. Most boring, honestly.', 'Never tap the big spires. They ring for hours.', 'The lake has no bottom, I swear. I have dropped a lot of things.'],
    steps: [
      { say: 'My lens-fish are shy. They gather in the glowing lake. Fish it, and pull up three so I can study the light.',
        goal: C(3, 'Catch 3 fish from the Crystal Lake', function (c) { return c.isl === 'crystal' && c.spot === 'lake'; }),
        done: 'Fine specimens. Their scales split sunlight into stripes. I can use that.', money: 300, xp: 40 },
      { say: 'Something beyond the ordinary now. A mutated fish, or anything you catch while the sea is acting up, an event.',
        alts: [{ label: 'A mutated fish', goal: C(1, 'Catch a mutated fish', function (c) { return !!c.mutation; }) },
               { label: 'During a world event', goal: C(1, 'Catch a fish during any world event', function (c) { return !!c.event; }) }],
        done: 'Different light, different edges. Oh, I can work with this.', money: 400, xp: 50 },
      { say: 'To cut a true prism you need two extremes. Intense heat to soften, deep cold to crack. Pick one pilgrimage.',
        alts: [{ label: 'Heat of Ember Peak', goal: V(['ember'], 'Visit ' + nm('ember')) }, { label: 'Cold of Frostpeak', goal: V(['frost'], 'Visit ' + nm('frost')) }],
        done: 'Your coat still smells of it. Perfect, the stone remembers.', money: 500, xp: 60 },
      { say: 'My tools are worn through. Either fund new ones, or earn their equivalent from the lake with a rare find.',
        alts: [{ label: 'Pay for tools', goal: P(2500, 'Pay 2,500 for new tools') }, { label: 'Find a gem-worthy fish', goal: C(1, 'Catch an Epic+ fish at ' + nm('crystal'), function (c) { return c.isl === 'crystal' && c.tier >= 3; }) }],
        done: 'Sharp as a promise. Now the real cut.', money: 500, xp: 60 },
      { say: 'The heart-stone only forms around a worthy catch. Bring me a Legendary from this island and I will set it into a rod for you.',
        goal: C(1, 'Catch a Legendary+ fish at ' + nm('crystal'), function (c) { return c.isl === 'crystal' && c.tier >= 4; }),
        done: 'Prismheart. All the colours in one rod. Do not stare at it for too long.', money: 4500, xp: 450 }
    ]
  };
  Q['sq-ember'] = {
    npc: 'npc-ember', isl: 'ember', title: 'Quench and Strike', rod: 'rod-emberlash',
    idle: ['Steel is just stone that has been argued with.', 'Smell that? That is dinner. And also the mountain.', 'Do not fish the lava. I am saying this because someone always asks.'],
    steps: [
      { say: 'My forge sulks when it is hungry. Food, then metal. Warm waters hold fat fish. Bring me some.',
        goal: C(3, 'Catch 3 fish at ' + nm('ember'), function (c) { return c.isl === 'ember'; }),
        done: 'Good, plump ones. The forge is purring.', money: 300, xp: 40 },
      { say: 'A blade must be quenched in something that fights back. Either wild weather water, or the deep sea. You choose.',
        alts: [{ label: 'Wild weather', goal: C(2, 'Catch 2 fish in rain or storm', function (c, e) { return rain(e); }) },
               { label: 'Open deep water', goal: C(2, 'Catch 2 fish in open deep water', function (c) { return c.spot === 'deep'; }) }],
        done: 'The steam it made! The old folk say a good quench screams a little.', money: 400, xp: 50 },
      { say: 'The steel needs folding and my supplier wants coin. Or, if you prefer, catch a proper beast from my shore and trade it.',
        alts: [{ label: 'Buy the steel', goal: P(3000, 'Pay 3,000 for steel') }, { label: 'Trade a catch', goal: C(1, 'Catch an Epic+ fish at ' + nm('ember'), function (c) { return c.isl === 'ember' && c.tier >= 3; }) }],
        done: 'It has the right ring to it. Good. Now it needs a cold lesson and a hot one.', money: 500, xp: 60 },
      { say: 'It needs a long, steady cooling in a different air. Pick: the high cold wind of the cloud isle, or the frozen mountain.',
        alts: [{ label: 'Cloud heights', goal: V(['sky'], 'Visit ' + nm('sky')) }, { label: 'Frozen peak', goal: V(['frost'], 'Visit ' + nm('frost')) }],
        done: 'You brought the temper back with you. I can feel it.', money: 600, xp: 70 },
      { say: 'Finally, prove it. A Legendary from our warm sea, and you wield the lash.',
        goal: C(1, 'Catch a Legendary+ fish at ' + nm('ember'), function (c) { return c.isl === 'ember' && c.tier >= 4; }),
        done: 'Emberlash. Forged, folded, and quenched in a storm. Try not to singe the dock.', money: 5000, xp: 450 }
    ]
  };
  Q['sq-sky'] = {
    npc: 'npc-sky', isl: 'sky', title: 'The Windcaller\'s Loom', rod: 'rod-starweaver',
    idle: ['The clouds up there are thicker than they look. Do not lean on them.', 'From Cloudtop a sunrise lasts all day, if you squint.', 'Everything that falls off Cloudtop ends up in my pond. Mostly hats.'],
    steps: [
      { say: 'The updraft that carried us up to Cloudtop has gone still. Before I can wake it, I need to know what the falls are bringing down. Fish Skyfall Pond and bring me three catches.',
        goal: C(3, 'Catch 3 fish from Skyfall Pond', function (c) { return c.isl === 'sky' && c.spot === 'lake'; }),
        done: 'Spray in their gills, cloud-silk in their fins. The top is still alive. Good.', money: 300, xp: 40 },
      { say: 'An updraft is only wind that remembers the way up. Fish here on a gusty day and let the wind get to know you.',
        goal: C(2, 'Catch 2 fish at ' + nm('sky') + ' while it is windy', function (c, e) { return c.isl === 'sky' && e.wx === 'wind'; }),
        done: 'Hear that? The chimes stirred, just for a moment.', money: 400, xp: 50 },
      { say: 'Wind needs a push to climb: warm air rising through cold. Bring me a breath of one or the other from far away.',
        alts: [{ label: 'Cold air of Frostpeak', goal: V(['frost'], 'Visit ' + nm('frost')) }, { label: 'Hot air of Ember Peak', goal: V(['ember'], 'Visit ' + nm('ember')) }],
        done: 'Your coat still holds it. Look, the pond is steaming round your boots.', money: 500, xp: 60 },
      { say: 'The old chimes were strung with moonlit fin-thread. Something rare rises in the pond after dark. Catch it for me.',
        goal: C(1, 'Catch a Rare+ fish from Skyfall Pond at night', function (c, e) { return c.isl === 'sky' && c.spot === 'lake' && c.tier >= 2 && e.night; }),
        done: 'See how its fins hold the moon? That is the thread we need.', money: 600, xp: 70 },
      { say: 'Now the wind chimes need restringing, and the stringer in the village wants paying. Do that, and the wind will find its way up again.',
        goal: P(3000, 'Pay 3,000 for new chime strings'), flag: 'skylift', flagMsg: 'The updraft roars to life!',
        done: 'Listen... there! The updraft is singing again. Step into it on the point and it will carry you up to Cloudtop.', money: 0, xp: 120 },
      { say: 'My old loom waits on Cloudtop. Cast over the cloud sea from the rim and bring me two catches for thread. Jump into the falls when you want to come back down.',
        goal: C(2, 'Catch 2 fish from the cloud sea', function (c) { return c.spot === 'cloud'; }),
        done: 'Cloud-silk! Fine as breath. The loom will want more.', money: 500, xp: 60 },
      { say: 'To weave stars I need a sky that is willing. Wait for a meteor shower, or fish the cloud sea after dark.',
        alts: [{ label: 'Wait for a meteor shower', goal: C(1, 'Catch a fish during a meteor shower', function (c) { return c.event === 'meteor'; }) },
               { label: 'Fish clouds at night', goal: C(1, 'Catch a fish from the cloud sea at night', function (c, e) { return c.spot === 'cloud' && e.night; }) }],
        done: 'The thread glows. I have not seen that since the old days.', money: 700, xp: 80 },
      { say: 'One last knot: a Legendary from Skyreach, from the pond or the clouds, and the loom is finished.',
        goal: C(1, 'Catch a Legendary+ fish at ' + nm('sky'), function (c) { return c.isl === 'sky' && c.tier >= 4; }),
        done: 'Starweaver. Light as a thought, strong as a promise. Go catch something beautiful.', money: 5000, xp: 450 }
    ]
  };
  Q['sq-elder'] = {
    npc: 'npc-elder', isl: 'elder', title: 'Roots Beneath the Stone', rod: 'rod-elderroot',
    idle: ['The heads do not watch you. They are just very attentive.', 'If a vine moves and there is no wind, do not tell me.', 'Everything here was built to outlast its builders, and did.'],
    steps: [
      { say: 'I am cataloguing these ruins, but my notes are soaked in river water. Fish by the aqueduct and bring me three catches so I can lighten my mood.',
        goal: C(3, 'Catch 3 fish at ' + nm('elder'), function (c) { return c.isl === 'elder'; }),
        done: 'Excellent. I am happier, which means my handwriting is better.', money: 300, xp: 40 },
      { say: 'The builders left similar marks elsewhere. See if the temples agree, in the desert, or marble in the sky.',
        alts: [{ label: 'The buried temple', goal: V(['dunes'], 'Visit ' + nm('dunes')) }, { label: 'The marble ruins', goal: V(['sky'], 'Visit ' + nm('sky')) }],
        done: 'Same hand. They knew each other. Fascinating.', money: 400, xp: 50 },
      { say: 'The statues drink at the altar pools. See what rises from the water. Anything Rare or better.',
        goal: C(1, 'Catch a Rare+ fish at ' + nm('elder'), function (c) { return c.isl === 'elder' && c.tier >= 2; }),
        done: 'Look at the carvings on its scales. Nature copying art, or art copying nature?', money: 500, xp: 60 },
      { say: 'The inscription says to give an offering. You can pay for incense, or fish after dark when the statues are said to listen.',
        alts: [{ label: 'Buy incense', goal: P(2000, 'Pay 2,000 for incense') }, { label: 'Night watch', goal: C(2, 'Catch 2 fish at ' + nm('elder') + ' at night', function (c, e) { return c.isl === 'elder' && e.night; }) }],
        done: 'The incense smoke curled the wrong way. Neat.', money: 500, xp: 60 },
      { say: 'The final inscription: "give the stone what it wants." I suspect it wants a Legendary fish.',
        goal: C(1, 'Catch a Legendary+ fish at ' + nm('elder'), function (c) { return c.isl === 'elder' && c.tier >= 4; }),
        done: 'The statue... smiled? Take this root-rod, grown from the oldest tree. Thank you.', money: 4500, xp: 450 }
    ]
  };
  Q['sq-grotto'] = {
    npc: 'npc-grotto', isl: 'grotto', title: 'What the Dark Remembers', rod: 'rod-hollowlight',
    idle: ['No sun here. You will not miss it. Much.', 'Hear the drip? It keeps time. Always slightly wrong.', 'The pond is older than the mountain. Probably.'],
    steps: [
      { say: 'Few find their way in. Stay a while. Catch three from the pond so the pond remembers your name.',
        goal: C(3, 'Catch 3 fish at ' + nm('grotto'), function (c) { return c.isl === 'grotto'; }),
        done: 'The ripples spread. It knows you now.', money: 400, xp: 50 },
      { say: 'The water dreams. Find a fish with a strange glow (a mutation), or any rare thing beyond these walls, to show me what the world looks like.',
        alts: [{ label: 'A mutated fish', goal: C(1, 'Catch a mutated fish', function (c) { return !!c.mutation; }) },
               { label: 'An Epic+ catch', goal: C(1, 'Catch an Epic+ fish anywhere', function (c) { return c.tier >= 3; }) }],
        done: 'Oh. That is how the surface shines. I had forgotten.', money: 500, xp: 60 },
      { say: 'Do me a kindness. Go up and see the open sky once more for me, at the bright harbor, or the lagoon with its blue.',
        alts: [{ label: 'The harbor', goal: V(['harbor'], 'Visit ' + nm('harbor')) }, { label: 'The lagoon', goal: V(['coral'], 'Visit ' + nm('coral')) }],
        done: 'You smell of salt and sun. I will keep that in the cave.', money: 600, xp: 70 },
      { say: 'The pond needs a gift. Either pay in coin, or pull a Mythic from the dark water and let it go.',
        alts: [{ label: 'Offer coin', goal: P(5000, 'Pay 5,000') }, { label: 'A Mythic catch', goal: C(1, 'Catch a Mythic+ fish at ' + nm('grotto'), function (c) { return c.isl === 'grotto' && c.tier >= 5; }) }],
        done: 'The cave glows a little brighter. It likes you.', money: 800, xp: 80 },
      { say: 'One more. A Legendary from the pond, and the cave will give you its light.',
        goal: C(1, 'Catch a Legendary+ fish at ' + nm('grotto'), function (c) { return c.isl === 'grotto' && c.tier >= 4; }),
        done: 'Hollowlight. A rod that glows without a lamp. Go and be bright out there.', money: 6000, xp: 500 }
    ]
  };

  var BYNPC = {};
  for (var k in Q) { Q[k].id = k; BYNPC[Q[k].npc] = Q[k]; }

  var flagsFor = null; // once per save: re-apply flags of finished steps (e.g. S.skylift for a quest finished under an older version)
  function st() {
    if (typeof S === 'undefined' || !S) return null;
    if (!S.sq || typeof S.sq !== 'object') S.sq = {};
    if (flagsFor !== S) {
      flagsFor = S;
      for (var id in Q) { var q = S.sq[id]; if (!q) continue; var n = q.done ? Q[id].steps.length : Math.min(q.s || 0, Q[id].steps.length);
        for (var i = 0; i < n; i++) { var f = Q[id].steps[i].flag; if (f && !S[f]) S[f] = 1; } }
    }
    return S.sq;
  }
  function qs(def) {
    var s = st(); if (!s) return null;
    if (!s[def.id]) s[def.id] = { s: 0, a: -1, p: 0, ok: false, started: false, done: false };
    return s[def.id];
  }
  function goalOf(def, q) {
    var step = def.steps[q.s]; if (!step) return null;
    if (step.alts) return q.a >= 0 ? step.alts[q.a].goal : null;
    return step.goal;
  }
  function sv() { try { if (typeof save === 'function') save(); } catch (x) {} }
  function say(t) { try { if (typeof hint === 'function') hint(t, 3); } catch (x) {} }
  function bn(t, c) { try { if (typeof banner === 'function') banner(t, c); } catch (x) {} }
  function feed(t) { try { if (typeof addFeed === 'function') addFeed(t); } catch (x) {} }
  function bp(f) { try { if (typeof beep === 'function') beep(f, .15, 'triangle'); } catch (x) {} }
  function fm(n) { try { if (typeof fmt === 'function') return fmt(n); } catch (x) {} return '$' + n; }
  var pending = {}; // npc -> one-time reply line after an action

  function giveMoney(m, x) {
    if (m) { S.money = (S.money || 0) + m; S.earned = (S.earned || 0) + m; }
    if (x) S.xp = (S.xp || 0) + x;
  }
  function advance(def, q) {
    var step = def.steps[q.s];
    pending[def.npc] = step.done;
    giveMoney(step.money, step.xp);
    if (step.flag) S[step.flag] = 1;   // e.g. skylift: wakes the Skyreach updraft (saved with S by sv() below)
    q.s++; q.a = -1; q.p = 0; q.ok = false;
    if (q.s >= def.steps.length) {
      q.done = true;
      if (!Array.isArray(S.ownedRods)) S.ownedRods = [];
      if (S.ownedRods.indexOf(def.rod) < 0) S.ownedRods.push(def.rod);
      bn('' + def.title + ' complete! New rod unlocked', '#ffe066');
      feed('<b>' + (S.name || 'Someone') + '</b> finished the quest "' + def.title + '" and earned a rare rod!');
    } else { bn(step.flagMsg || ('+' + fm(step.money) + ' · ' + def.title), '#ffe066'); }
    bp(880); sv();
  }
  function goalMet(def, q) {
    var g = goalOf(def, q);
    q.ok = true; bp(990);
    say('' + def.title + ': ' + g.d + ' done. Return to the NPC');
    sv();
  }

  var SQ = {
    defs: Q,
    options: function (npcId) {
      var def = BYNPC[npcId], q = def && qs(def), o = [];
      if (!def || !q) return o;
      if (q.done) return o;
      if (!q.started) { o.push({ label: 'Ask about "' + def.title + '"', fn: function () { q.started = true; pending[npcId] = def.steps[0].say; sv(); } }); return o; }
      var step = def.steps[q.s];
      if (step.alts && q.a < 0) {
        step.alts.forEach(function (al, i) { o.push({ label: al.label + ': ' + al.goal.d, fn: function () { q.a = i; q.p = 0; q.ok = false; pending[npcId] = 'Good. ' + al.goal.d + '.'; sv(); } }); });
        return o;
      }
      var g = goalOf(def, q);
      if (g.k === 'pay') {
        o.push({ label: 'Hand over ' + fm(g.m), fn: function () {
          if ((S.money || 0) < g.m) { pending[npcId] = 'You are a bit short. Come back with ' + fm(g.m) + '.'; return; }
          S.money -= g.m; advance(def, q);
        } });
      } else if (q.ok) {
        o.push({ label: 'Report back', fn: function () { advance(def, q); } });
      }
      if (step.alts && !q.ok) o.push({ label: 'Try a different approach', fn: function () { q.a = -1; q.p = 0; pending[npcId] = 'Fair enough. Pick again.'; sv(); } });
      return o;
    },
    lines: function (npcId) {
      var def = BYNPC[npcId], out = [];
      if (!def) return out;
      var q = qs(def);
      if (pending[npcId]) { out.push(pending[npcId]); pending[npcId] = null; }
      if (!q || q.done) { out.push(def.idle[Math.floor(Date.now() / 20000) % def.idle.length]); return out; }
      if (!q.started) { out.push(def.idle[0]); out.push('(They look like they have a story to tell.)'); return out; }
      var step = def.steps[q.s], g = goalOf(def, q);
      if (!out.length) out.push(step.say);
      if (g) out.push(q.ok ? 'You did it. Talk to me.' : g.d + (g.k === 'catch' ? ' (' + q.p + '/' + g.n + ')' : ''));
      return out;
    },
    onCatch: function (fish, ctx) {
      var s = st(); if (!s || !ctx) return;
      var e = env(), any = false;
      for (var id in Q) {
        var def = Q[id], q = s[id];
        if (!q || !q.started || q.done || q.ok) continue;
        var g = goalOf(def, q);
        if (!g || g.k !== 'catch') continue;
        if (g.f(ctx, e, fish)) {
          q.p++; any = true;
          if (q.p >= g.n) goalMet(def, q); else say('' + def.title + ' (' + q.p + '/' + g.n + ')');
        }
      }
      if (any) sv();
    },
    onEvent: function (name, data) {
      var s = st(); if (!s || name !== 'island') return;
      for (var id in Q) {
        var def = Q[id], q = s[id];
        if (!q || !q.started || q.done || q.ok) continue;
        var g = goalOf(def, q);
        if (g && g.k === 'visit' && g.ids.indexOf(data) >= 0) goalMet(def, q);
      }
    },
    hud: function () {
      var s = st(); if (!s) return '';
      for (var id in Q) {
        var def = Q[id], q = s[id];
        if (!q || !q.started || q.done) continue;
        var g = goalOf(def, q);
        if (!g) return '' + def.title + ': choose an approach with ' + NAMES[def.isl];
        if (q.ok) return '' + def.title + ': return to the NPC at ' + NAMES[def.isl];
        if (g.k === 'pay') return '' + def.title + ': ' + g.d + ' to the NPC';
        return '' + def.title + ': ' + g.d + (g.k === 'catch' ? ' (' + q.p + '/' + g.n + ')' : '');
      }
      return '';
    }
  };
  window.SQ = SQ;
  if (typeof module !== 'undefined') module.exports = SQ;
})();
