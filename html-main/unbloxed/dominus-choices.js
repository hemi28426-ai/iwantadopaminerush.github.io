// ====================================================================================================
// DOMINUS CHOICES for the "You won!" popup (dominus-vote.js).
// Each entry is one tile the winner can pick:  { id, name, img, hat }
//   id   - short unique id (saved to Supabase as the winner's pick, along with the name)
//   name - shown under the logo
//   img  - the hat's Marketplace thumbnail (rendered locally; '' until the avatar renderer is ready)
//   hat  - the HATS index of that Dominus (unbloxed/dominus-hats.js): give it with av.own.hat.push(hat)
// Built from the Dominus hats (dominus-hats.js); Robux Dominus and Dominus Doom are award-only (never sold).
// Want a fully custom grid instead? Set window.UBX_DOMINUS_RENDER = function (grid, pick) { ... } where grid is the
// empty <div id="ubx-dominus-choices"> and pick({id, name}) saves the winner's choice.
// ====================================================================================================
window.UBX_DOMINUS_CHOICES = (function () {
  var out = [];
  try {
    if (typeof UBX_HATS === 'undefined' || typeof HAT_BASE === 'undefined' || window.UBX_DOMINUS_AT == null) return out;
    for (var k = window.UBX_DOMINUS_AT, end = k + (window.UBX_DOMINUS_N || 0); k < end; k++) {
      (function (h, idx) {
        out.push({
          id: String(h.nm || ('dominus' + idx)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          name: h.nm || 'Dominus',
          hat: idx,
          get img() { try { return typeof thumb === 'function' ? thumb('hat', idx) : ''; } catch (e) { return ''; } }
        });
      })(UBX_HATS[k], HAT_BASE + k);
    }
  } catch (e) { console.warn('[dominus choices]', e); }
  return out;
})();
// Prize text -> HATS index, for dominus-vote.js's grants: the giveaway's prize words ('builder' = Best Game = Dominus Doom (the custom Builder Dominus), 'aureus' = Most
// Playtime, 'pittacium' = Most Money) or the vote winner's pick (a choice's name or id). Exact first, so 'pittacium' is
// Dominus Pittacium and not Pittacium II. Returns undefined when nothing matches (the grant stays pending).
window.UBX_DOMINUS_HAT = function (prize) {
  var p = String(prize || '').trim().toLowerCase(), list = window.UBX_DOMINUS_CHOICES || [];
  if (!p) return undefined;
  var WORD = { builder: 'dominus-doom', aureus: 'dominus-aureus', pittacium: 'dominus-pittacium', doom: 'dominus-doom', robux: 'robux-dominus' };
  var want = WORD[p] || p.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  for (var i = 0; i < list.length; i++) if (list[i].id === want || list[i].name.toLowerCase() === p) return list[i].hat;
  for (var j = 0; j < list.length; j++) if (list[j].name.toLowerCase().split(/\s+/).indexOf(p) >= 0) return list[j].hat; // a whole word: 'messor' -> Dominus Messor
  return undefined;
};
