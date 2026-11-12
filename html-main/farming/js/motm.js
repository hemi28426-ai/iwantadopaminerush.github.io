// Farming Unblocked — Farmer of the Month. Duke crowns a winner (admin page → fu_motm_set). Everyone sees a
// front-page article on the title menu saying how much they farmed. The winning account gets: a gold farmer skin,
// golden machines (a Titan tractor + Colossus combine, painted gold and stupidly fast) they can spawn any time from a
// HUD button, and a 2x money bonus in solo until the chosen date. Needs farming-motm.sql in Supabase. No server =
// no article and no perks (fails quietly).
(function () {
  'use strict';
  var FU = window.FU = window.FU || {};
  var G = null, data = null, fetchedAt = 0, box = null, article = null, shownFor = '', goldT = 0, btnT = 0;
  var GOLD = 0xffd54a;

  function online() { return !!(FU.net && FU.net.online); }
  function mainServer() { return !!(FU.town && FU.town.main); }
  function acct() { return (FU.account && FU.account.user) ? (FU.account.user() || '') : ''; }
  function isWinner() { return !!(data && data.username && acct() && acct().toLowerCase() === String(data.username).toLowerCase()); }
  function bonusActive() { return isWinner() && data.bonus_until && Date.now() < new Date(data.bonus_until).getTime(); }
  function money(n) { return '$' + Math.round(n || 0).toLocaleString('en-US'); }
  function fmt(n) { return Math.round(n || 0).toLocaleString('en-US'); }
  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // ---------- fetch who the farmer of the month is ----------
  function fetchMotm(force) {
    var A = FU.account; if (!A || !A.URL) return Promise.resolve(null);
    if (!force && Date.now() - fetchedAt < 60000) return Promise.resolve(data);
    fetchedAt = Date.now();
    return fetch(A.URL + '/rest/v1/rpc/fu_motm_get', { method: 'POST', headers: A.headers(), body: '{}' })
      .then(function (r) { return r.ok ? r.text() : null; })
      .then(function (t) { var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) {} data = (j && j.username) ? j : null; onData(); return data; })
      .catch(function () { return null; });
  }
  function onData() {
    applyGold();
    if (G && FU.menu && FU.menu.isTitle && FU.menu.isTitle()) maybeArticle();
    paintBtn();
  }

  // ---------- the front-page article (everyone, on the menu, once per crowning) ----------
  function css() {
    if (document.getElementById('fu-motm-css')) return;
    var st = document.createElement('style'); st.id = 'fu-motm-css';
    st.textContent =
      '#fu-motm{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:rgba(5,8,4,.72);pointer-events:auto;padding:16px}' +
      '#fu-motm.hid{display:none}' +
      '#fu-motm .mo-paper{width:min(560px,96vw);max-height:90vh;overflow:auto;background:#f6f1e2;color:#20170a;border-radius:10px;box-shadow:0 20px 60px rgba(0,0,0,.6);border:1px solid #c9b78e;padding:22px 26px;font-family:Georgia,"Times New Roman",serif;transform:rotate(-.6deg)}' +
      '#fu-motm .mo-masthead{text-align:center;border-bottom:3px double #20170a;padding-bottom:8px;margin-bottom:10px}' +
      '#fu-motm .mo-rag{font:800 13px system-ui;letter-spacing:4px;color:#6b5a2e;text-transform:uppercase}' +
      '#fu-motm .mo-title{font-size:30px;font-weight:900;line-height:1.05;margin:4px 0 2px}' +
      '#fu-motm .mo-sub{font-size:12px;color:#5a4a28;letter-spacing:1px}' +
      '#fu-motm .mo-crown{text-align:center;font-size:40px;margin:6px 0 2px}' +
      '#fu-motm .mo-name{text-align:center;font-size:26px;font-weight:900;color:#8a6d16;letter-spacing:1px}' +
      '#fu-motm .mo-body{font-size:15px;line-height:1.5;margin:12px 2px;text-align:justify}' +
      '#fu-motm .mo-body:first-letter{float:left;font-size:46px;line-height:40px;padding:2px 8px 0 0;font-weight:900;color:#8a6d16}' +
      '#fu-motm .mo-stats{display:flex;gap:8px;justify-content:space-between;border-top:1px solid #c9b78e;border-bottom:1px solid #c9b78e;padding:8px 0;margin:10px 0}' +
      '#fu-motm .mo-stat{flex:1;text-align:center}#fu-motm .mo-stat b{display:block;font-size:19px;color:#20170a}#fu-motm .mo-stat span{font-size:11px;color:#6b5a2e;text-transform:uppercase;letter-spacing:1px}' +
      '#fu-motm .mo-perks{font-size:12.5px;color:#4a3c1e;background:rgba(138,109,22,.1);border:1px dashed #b89b4e;border-radius:8px;padding:8px 10px;margin:8px 0}' +
      '#fu-motm .mo-x{display:block;margin:12px auto 0;background:#20170a;color:#f6f1e2;border:0;border-radius:8px;padding:9px 20px;font:700 14px system-ui;cursor:pointer}' +
      '#fu-motm .mo-you{text-align:center;font:800 13px system-ui;color:#2e7d32;margin-top:8px}' +
      '#fu-motm-btn{cursor:pointer;font-weight:800;font-size:13px;background:linear-gradient(90deg,#8a6d16,#ffd54a,#8a6d16);color:#1a1300;text-shadow:0 1px 0 rgba(255,255,255,.3)}';
    document.head.appendChild(st);
  }
  function monthName() { try { return new Date(data.since).toLocaleString('en-US', { month: 'long' }); } catch (e) { return 'This month'; } }
  function buildArticle() {
    css();
    article = document.createElement('div'); article.id = 'fu-motm'; article.className = 'hid';
    document.body.appendChild(article);
    article.addEventListener('click', function (e) {
      if (e.target === article || (e.target.getAttribute && e.target.getAttribute('data-x') === '1')) closeArticle();
    });
  }
  function maybeArticle() {
    if (!data) return;
    var key = data.username + '|' + data.since;
    var seen = ''; try { seen = sessionStorage.getItem('fu_motm_seen') || ''; } catch (e) {}
    if (seen === key || shownFor === key) return;
    shownFor = key;
    showArticle();
  }
  function showArticle() {
    if (!data) return;
    if (!article) buildArticle();
    var mine = isWinner();
    article.innerHTML = '<div class="mo-paper"><div class="mo-masthead"><div class="mo-rag">The Farming Unblocked Gazette</div>' +
      '<div class="mo-title">Farmer of the Month</div><div class="mo-sub">' + esc(monthName()) + ' &middot; Special Harvest Edition</div></div>' +
      '<div class="mo-crown">👑</div><div class="mo-name">' + esc(data.username) + '</div>' +
      '<p class="mo-body">' + esc(data.blurb || (data.username + ' farmed more than anyone this month. A true farmer.')) + '</p>' +
      ((data.harvested || data.earned || data.fields) ? '<div class="mo-stats">' +
        '<div class="mo-stat"><b>' + fmt(data.harvested) + ' L</b><span>Harvested</span></div>' +
        '<div class="mo-stat"><b>' + money(data.earned) + '</b><span>Earned</span></div>' +
        '<div class="mo-stat"><b>' + fmt(data.fields) + '</b><span>Fields</span></div></div>' : '') +
      '<div class="mo-perks">🏆 This month ' + esc(data.username) + ' carries a <b>gold skin</b>, spawns <b>golden machines</b> that scream across the fields, and earns <b>double money</b>' +
      (data.bonus_until ? ' until ' + esc(new Date(data.bonus_until).toLocaleDateString('en-US', { weekday: 'long' })) : '') + '.</div>' +
      (mine ? '<div class="mo-you">That’s you — go show them how it’s done. 👑</div>' : '') +
      '<button class="mo-x" data-x="1">' + (mine ? 'Let’s farm' : 'Read &amp; close') + '</button></div>';
    article.className = '';
    try { sessionStorage.setItem('fu_motm_seen', data.username + '|' + data.since); } catch (e) {}
    try { if (FU.audio) FU.audio.play(mine ? 'buy' : 'click'); } catch (e) {}
  }
  function closeArticle() { if (article) article.className = 'hid'; }

  // ---------- the winner's gold skin ----------
  function goldify(root) {
    if (!root || !root.traverse) return;
    root.traverse(function (o) {
      if (!o.isMesh || !o.material) return;
      var mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach(function (m) {
        if (!m || !m.color || (m.userData && m.userData.fuGold)) return;
        m.userData = m.userData || {}; m.userData.fuGold = true;
        var lum = 0.35 * m.color.r + 0.5 * m.color.g + 0.15 * m.color.b, k = 0.45 + 0.55 * lum;
        m.color.setRGB(Math.min(1, 1.0 * k), Math.min(1, 0.8 * k), Math.min(1, 0.22 * k));
        if (m.emissive) m.emissive.setRGB(0.22, 0.16, 0.0);
      });
    });
  }
  function applyGold() {
    if (!G || !isWinner()) return;
    var pm = FU.player && FU.player.obj && FU.player.obj.mesh;
    if (pm) goldify(pm);
  }

  // ---------- golden machines (winner only) ----------
  function spawnGolden() {
    if (!isWinner() || !G || !G.started || !FU.vehicles || !FU.vehicles.spawn) return;
    var p = FU.player && FU.player.obj, bx = p ? p.x : 0, bz = p ? p.z : 0;
    var made = [];
    var t = FU.vehicles.spawn('tractor_xl', bx + 7, bz + 5, 0); if (t) made.push(t);
    var c = FU.vehicles.spawn('combine_xl', bx + 7, bz - 7, 0); if (c) made.push(c);
    made.forEach(function (v) { v.upg = 3; v.speedBoost = 2.6; if (FU.vehicles.paint) FU.vehicles.paint(v, GOLD); });
    if (made.length) { G.notify('👑 Your golden machines have arrived — ludicrous speed. Get in and go!', 'good'); try { if (FU.audio) FU.audio.play('buy'); } catch (e) {} }
    else G.notify('No room to drop the golden machines here — move to open ground and try again.', 'bad');
  }
  function paintBtn() {
    var col = FU.hud && FU.hud.rightColumn;
    if (!box && col) {
      box = document.createElement('div'); box.id = 'fu-motm-btn'; box.className = 'fu-box fu-interactive';
      box.textContent = '👑 Golden machines'; box.title = 'Spawn your Farmer of the Month machines';
      box.addEventListener('click', spawnGolden); col.insertBefore(box, col.firstChild);
    }
    if (box) box.style.display = (isWinner() && G && G.started && !mainServer()) ? '' : 'none';
  }

  // ---------- 2x money (solo only, until the bonus date) ----------
  var origEarn = null;
  function hookEarn() {
    if (origEarn || !G || typeof G.earn !== 'function') return;
    origEarn = G.earn;
    G.earn = function (amount, reason) {
      origEarn.call(G, amount, reason);
      if (amount > 0 && reason !== 'Farmer of the Month 2x' && bonusActive() && !online()) {
        origEarn.call(G, amount, 'Farmer of the Month 2x'); // the doubling half, shown as its own gain
      }
    };
  }

  FU.motm = {
    get: function () { return data; }, refresh: function () { return fetchMotm(true); },
    isWinner: isWinner, bonusActive: bonusActive, spawnGolden: spawnGolden, showArticle: showArticle
  };

  FU.register({
    name: 'motm', order: 97, ui: true, // ui so it runs on the title screen too (to show the article)
    init: function (g) {
      G = g; css(); hookEarn();
      fetchMotm(true);
      g.on('accountChanged', function () { fetchMotm(true); });
      g.on('newGame', function () { setTimeout(applyGold, 60); paintBtn(); });
      g.on('gameLoaded', function () { setTimeout(applyGold, 60); paintBtn(); });
      g.on('ready', function () { if (FU.menu && FU.menu.isTitle && FU.menu.isTitle()) maybeArticle(); });
    },
    update: function (dt, g) {
      // show the article when the title screen is up
      if (g.started) { /* in game */ } else if (FU.menu && FU.menu.isTitle && FU.menu.isTitle()) { if (data) maybeArticle(); }
      btnT -= dt; if (btnT <= 0) { btnT = 1.5; paintBtn(); }
      if (isWinner() && g.started) { goldT -= dt; if (goldT <= 0) { goldT = 2; applyGold(); } } // re-gild after the mesh rebuilds
    }
  });
})();
