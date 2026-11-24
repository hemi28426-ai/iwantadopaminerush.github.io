// Farming Unblocked — Duke Token skins (duke.js). Your equipped skin replaces the farmer model, for you
// and (via `sk` in the netplayers `st` message) for co-op friends. Reuses Fishing's skin files + rig.
// FU.applySkin(group, id): hides the farmer meshes in `group`, adds the skin, and points
// group.userData.legs/arms at the skin's limbs so the existing walk animation drives it.
(function () {
  'use strict';
  var FU = window.FU = window.FU || {};
  var live = [];
  FU.dukeSkin = '';
  FU.applySkin = function (g, id) {
    if (!g || !window.FG || !FG.loadSkin || typeof SKINS === 'undefined') return;
    id = FG.SKIN_IDS.indexOf(id) < 0 ? '' : id;
    var ud = g.userData; if ((ud.skinWant || '') === id) return;
    ud.skinWant = id;
    if (!id) return; // keep current look; a farmer never goes back mid-session
    FG.loadSkin(id).then(function () {
      if (ud.skinWant !== id) return;
      if (ud.skinM) { g.remove(ud.skinM.root); live.splice(live.indexOf(ud.skinM), 1); }
      if (!ud.farmerHidden) {
        ud.farmerHidden = true; ud.farmerLegs = ud.legs; ud.farmerArms = ud.arms;
        g.children.forEach(function (c) { if (!c.isSprite) c.visible = false; });
      }
      var m = SKINS.create({ model: id }, { hi: true });
      m.root.rotation.y = Math.PI; m.root.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
      g.add(m.root); ud.skinM = m; live.push(m);
      ud.legs = [m.legL, m.legR]; ud.arms = [m.armL, m.armR];
    }).catch(function (e) { console.warn('[FU] skin failed', id, e); });
  };
  function loop(t) {
    for (var i = 0; i < live.length; i++) { try { SKINS.sync(live[i], t / 1000, false, false, null); } catch (e) { /* ignore */ } }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  // my own skin: whatever is equipped on my Duke account
  function mine() {
    var me = FU.player && FU.player.obj && FU.player.obj.mesh;
    if (!me) return setTimeout(mine, 500);
    if (!window.DUKE || !DUKE.user()) return;
    DUKE.refresh().then(function (d) { if (d && d.equipped) { FU.dukeSkin = d.equipped; FU.applySkin(me, d.equipped); } }).catch(function () {});
  }
  if (window.DUKE) DUKE.on(function (s) {
    var me = FU.player && FU.player.obj && FU.player.obj.mesh;
    if (s && s.equipped && me) { FU.dukeSkin = s.equipped; FU.applySkin(me, s.equipped); }
  });
  setTimeout(mine, 500);
})();
