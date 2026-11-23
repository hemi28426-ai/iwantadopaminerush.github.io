// Fishing Unblocked v2 UI: Fish Book + Rod collection windows (pair with ui.css).
// window.FUI = { renderBook(el, islId?), renderRods(el), icon:null|fn(fishId)->url|Node, onEquip:null|fn(rodId), onClose:null|fn() }
// Uses globals FWFISH, FWRODS, S (S.book[fishId]={n,best}, S.ownedRods, S.rod, S.seen), optional FW.islands, FRL.rodMods.
(function () {
  'use strict';
  // Windows whose content scrolls (Book, Rods, Shop...) left a 40-50 px band under their bottom edge where the game was not
  // drawn (Chromium culls what is under the window's whole scrolled content, then clips it): clip each window to its own
  // rounded box. The clip also cuts the outside ledge shadow, so the ledge is drawn inside instead.
  try {
    if (!document.getElementById('fui-winclip')) {
      var wc = document.createElement('style'); wc.id = 'fui-winclip';
      wc.textContent = '.panel.win{clip-path:inset(0 round 14px);box-shadow:inset 0 -5px 0 rgba(0,0,0,.22)}';
      (document.head || document.documentElement).appendChild(wc);
    }
  } catch (e) {}
  var RAR = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Divine', 'Secret'];
  var RCOL = ['#d3dbe0', '#5fd35f', '#4aa3ff', '#c070ff', '#ffb020', '#ff4fd8', '#fff3a0', '#ff3b3b'];
  var ISL = [ // fallback when FW.islands is not loaded (same order/ids as CONTRACT.md)
    { id: 'harbor', n: 'Driftwood Harbor' }, { id: 'coral', n: 'Coral Lagoon' },
    { id: 'frost', n: 'Frostpeak' }, { id: 'dunes', n: 'Sunscorch Dunes' },
    { id: 'mire', n: 'Mirewood Swamp' }, { id: 'crystal', n: 'Crystal Hollow' },
    { id: 'ember', n: 'Ember Peak' }, { id: 'sky', n: 'Skyreach' },
    { id: 'elder', n: 'Elderstone Ruins' }, { id: 'grotto', n: 'Hidden Grotto', hidden: true }];
  var C = {
    time: { day: ['sun', 'Day'], night: ['moon', 'Night'] },
    wx: { rain: ['rain', 'Rain'], fog: ['fog', 'Fog'], wind: ['wind', 'Wind'], storm: ['storm', 'Storm'], clear: ['sun', 'Clear'] },
    event: { meteor: ['event', 'Meteor shower'], aurora: ['aurora', 'Aurora'], whirlpool: ['sea', 'Whirlpool'], surge: ['fish', 'Fish surge'], bloodtide: ['warning', 'Blood tide'] },
    bait: { worm: ['bait', 'Worm'], cheese: ['bait', 'Cheese'], shrimp: ['bait', 'Shrimp'], minnow: ['fish', 'Minnow'], glow: ['event', 'Glow bait'] },
    spot: { lake: ['sea', 'Lake'], sea: ['sea', 'Sea'], deep: ['sea', 'Deep sea'], cloud: ['cloud', 'Clouds'], lava: ['ember', 'Lava'], hollow: ['island', 'Tree hollow'] }
  };
  var PASS = { night: 'moon', day: 'sun', rain: 'rain', mut: 'dna', size: 'ruler', shiny: 'event', isl: 'island', event: 'event', lake: 'sea', deep: 'sea', xp: 'star', money: 'money', tension: 'rod' };
  function ic(n, s) { return window.FICON ? FICON(n, s || 14) : ''; }
  var STATS = [ // key, label, min, max, colour, format
    ['luck', 'Luck', 0, 3, '#7ee36f', function (v) { return +v ? '+' + (+v).toFixed(1) : 'Base'; }],
    ['pow', 'Power', 1, 4.5, '#ff8a5c', function (v) { return (+v).toFixed(1); }],
    ['zone', 'Reel bar', 0.18, 0.42, '#2fd3c0', function (v) { return Math.round(v * 100) + '%'; }],
    ['cast', 'Cast', 9, 32, '#6fb6ff', function (v) { return Math.round(v) + 'm'; }],
    ['spd', 'Bite speed', 0, 0.45, '#ffd25a', function (v) { return '+' + Math.round(v * 100) + '%'; }],
    ['ctl', 'Control', 0, 1, '#c79bff', function (v) { return Math.round(v * 100) + '%'; }]];

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
  function st() { return window.S || {}; }
  function islands() {
    var L = (window.FW && FW.islands && FW.islands.length) ? FW.islands : ISL;
    return L.filter(function (d) { return !d.secret; }).map(function (d) { return { id: d.id, n: d.n, icon: d.id, hidden: !!d.hidden || d.id === 'grotto' }; }); // secret spots (the Angler's rock) have no fish and no Book tab
  }
  function islById(id) { var L = islands(); for (var i = 0; i < L.length; i++) if (L[i].id === id) return L[i]; return { id: id, n: id, icon: id }; }
  function fishOf(id) { return (window.FWFISH || []).filter(function (f) { return f.isl === id; }).sort(function (a, b) { return (a.tier - b.tier) || (a.n < b.n ? -1 : 1); }); }
  function got(fid) { var b = (st().book || {})[fid]; return b && b.n > 0 ? b : null; }
  function caughtOn(id) { return fishOf(id).filter(function (f) { return got(f.id); }).length; }
  function seenIsl(I) {
    var s = st().seen || {};
    if (I.hidden) return !!s[I.id];
    return I.id === 'harbor' || !!s[I.id] || caughtOn(I.id) > 0;
  }
  function closeBtn(el) {
    return '<button class="btn x" data-fui-close title="Close">' + ic('close', 16) + '</button>';
  }
  function bindClose(el) {
    var b = el.querySelector('[data-fui-close]');
    if (b) b.onclick = function () {
      if (FUI.onClose) FUI.onClose(el); else if (typeof window.closeWins === 'function') window.closeWins(); else el.style.display = 'none';
    };
  }
  function iconHTML(f) {
    var r = null;
    if (typeof FUI.icon === 'function') { try { r = FUI.icon(f.id); } catch (e) { r = null; } }
    if (typeof r === 'string' && r) return '<img alt="" src="' + esc(r) + '">';
    if (r && r.nodeType) return '<span data-fui-node></span>';
    return '<span class="emo">' + ic('fish', 40) + '</span>';
  }
  function chip(t, pair, extra) { return '<span class="chip t-' + t + '">' + ic(pair[0], 12) + esc(extra || pair[1]) + '</span>'; }
  function condHTML(f) {
    var w = f.when || {}, h = '';
    if (w.time && C.time[w.time]) h += chip('time', C.time[w.time]);
    if (w.wx && w.wx.length) {
      var wi = [], nm = [];
      w.wx.forEach(function (x) { var p = C.wx[x]; if (p) { if (wi.indexOf(p[0]) < 0) wi.push(p[0]); nm.push(p[1]); } });
      if (nm.length) h += '<span class="chip t-wx">' + wi.map(function (n) { return ic(n, 12); }).join('') + esc(nm.join(' or ')) + '</span>';
    }
    if (w.event && C.event[w.event]) h += chip('event', C.event[w.event]);
    if (w.bait && C.bait[w.bait]) h += chip('bait', C.bait[w.bait]);
    if (w.spot && C.spot[w.spot]) h += chip('spot', C.spot[w.spot]);
    return h || '<span class="chip any">' + ic('clock', 12) + 'Any time, anywhere</span>';
  }
  function kg(v) { v = +v || 0; return v >= 100 ? Math.round(v) : v >= 10 ? v.toFixed(1) : v.toFixed(2); }

  var FUI = window.FUI = window.FUI || {};
  FUI.RAR = RAR; FUI.RCOL = RCOL; FUI.icon = FUI.icon || null; FUI.onEquip = FUI.onEquip || null;
  FUI.bookTab = FUI.bookTab || null;

  FUI.renderBook = function (el, islId) {
    if (!el) return;
    var L = islands().filter(seenIsl);
    if (islId && L.some(function (I) { return I.id === islId; })) FUI.bookTab = islId;
    if (!L.some(function (I) { return I.id === FUI.bookTab; })) FUI.bookTab = L.length ? L[0].id : 'harbor';
    var all = 0, have = 0;
    islands().forEach(function (I) { if (I.hidden && !seenIsl(I)) return; var F = fishOf(I.id); all += F.length; have += F.filter(function (f) { return got(f.id); }).length; });
    var h = '<div class="fui"><div class="fui-head">' + closeBtn(el) + '<h2>' + ic('book', 22) + 'Fish Book</h2>' +
      '<div class="fui-sub"><span class="fui-num">' + have + ' / ' + all + '</span><div class="fui-prog"><b style="width:' + (all ? (have / all * 100).toFixed(1) : 0) + '%"></b></div><span>species discovered</span></div><div class="fui-tabs">';
    L.forEach(function (I) {
      var F = fishOf(I.id), c = caughtOn(I.id);
      h += '<button class="fui-tab' + (I.id === FUI.bookTab ? ' on' : '') + (F.length && c === F.length ? ' done' : '') + (I.hidden ? ' secret' : '') + '" data-tab="' + esc(I.id) + '">' + ic(I.id, 14) + esc(I.n) + ' <small>' + c + '/' + F.length + '</small></button>';
    });
    var hidden = islands().filter(function (I) { return !I.hidden && !seenIsl(I); }).length;
    h += '</div></div>';
    var I = islById(FUI.bookTab), F = fishOf(I.id), any = caughtOn(I.id) > 0;
    if (!any) h += '<div class="fui-note">' + ic('search', 14) + ' <b>No catches on ' + esc(I.n) + ' yet.</b> Catch any fish here to reveal the clues for every species on this island.</div>';
    if (!F.length) h += '<div class="fui-empty">No fish recorded for this island.</div>';
    h += '<div class="fui-fish">';
    F.forEach(function (f) {
      var b = got(f.id), t = Math.max(0, Math.min(7, f.tier | 0));
      h += '<div class="fc rc' + t + (b ? '' : ' no') + '" data-fid="' + esc(f.id) + '"' + (b && f.d ? ' title="' + esc(f.d) + '"' : '') + '>' +
        '<div class="ic">' + iconHTML(f) + '<span class="rtag rc' + t + '">' + RAR[t] + '</span>' + (b ? '<span class="cnt">Caught ' + b.n + '</span>' : '') + '</div><div class="bd">' +
        '<div class="nm">' + (b ? esc(f.n) : '???') + '</div>';
      if (b) h += '<div class="st"><span class="rec">' + ic('trophy', 12) + ' Best <b>' + kg(b.best) + ' kg</b></span>' + (f.kg ? '<span>usual ' + kg(f.kg[0]) + '–' + kg(f.kg[1]) + '</span>' : '') + '</div>';
      if (b && f.d) h += '<div class="ds">' + esc(f.d) + '</div>';
      h += '<div class="cd">';
      if (b || (any && t < 7)) h += condHTML(f);
      else if (t === 7) h += '<span class="chip lock">' + ic('lock', 12) + 'Some secrets must be found</span>';
      else h += '<span class="chip lock">' + ic('lock', 12) + 'Clues hidden</span>';
      h += '</div></div></div>';
    });
    h += '</div></div>';
    el.innerHTML = h;
    if (typeof FUI.icon === 'function') el.querySelectorAll('[data-fui-node]').forEach(function (s) {
      var c = s.closest('.fc'), r = null; try { r = FUI.icon(c.getAttribute('data-fid')); } catch (e) { }
      if (r && r.nodeType) s.parentNode.replaceChild(r, s); else s.parentNode.removeChild(s);
    });
    el.querySelectorAll('[data-tab]').forEach(function (b) { b.onclick = function () { FUI.bookTab = b.getAttribute('data-tab'); FUI.renderBook(el); el.scrollTop = 0; }; });
    bindClose(el);
    // island tabs: one scrolling row with arrows and edge fades, so every island can be found
    var tb = el.querySelector('.fui-tabs');
    if (tb) {
      var wrap = document.createElement('div'); wrap.className = 'fui-tabw'; tb.parentNode.insertBefore(wrap, tb); wrap.appendChild(tb);
      ['l', 'r'].forEach(function (d) { var b = document.createElement('button'); b.type = 'button'; b.className = 'fui-ar ' + d; b.title = d === 'l' ? 'Previous islands' : 'More islands'; b.innerHTML = ic('arrow', 14);
        b.onclick = function () { tb.scrollBy({ left: (d === 'l' ? -1 : 1) * tb.clientWidth * .7, behavior: 'smooth' }); }; wrap.appendChild(b); });
      var updT = function () { wrap.classList.toggle('cl', tb.scrollLeft > 4); wrap.classList.toggle('cr', tb.scrollLeft + tb.clientWidth < tb.scrollWidth - 4); };
      tb.addEventListener('scroll', updT);
      var onT = tb.querySelector('.on'); if (onT && onT.offsetLeft + onT.offsetWidth > tb.clientWidth) tb.scrollLeft = onT.offsetLeft - 40;
      setTimeout(updT, 0); updT();
    }
  };

  function owned() {
    var o = st().ownedRods || [];
    if (!Array.isArray(o)) o = Object.keys(o).filter(function (k) { return o[k]; });
    return o;
  }
  function srcText(r) {
    if (r.quest) { var q = islById(String(r.quest).replace(/^sq-/, '')); return 'Quest · ' + q.n; }
    if (!r.p && !r.lvl) return 'Starter rod';
    if (r.sold) { var s = islById(r.sold); return 'Shop · ' + s.n; }
    return r.p ? 'Shop' : 'Starter rod';
  }
  function myMoney() { var m = st().money; return typeof m === 'number' ? m : null; }
  function myLevel() { try { if (typeof window.level === 'function') return +window.level() || 0; } catch (e) { } return null; }
  // price: green when you can pay it now, red when you cannot (colour only changes meaning, the text is the same)
  function priceTag(r) {
    if (!r.p) return '';
    var m = myMoney(), cls = m == null ? '' : (m >= r.p ? ' ok' : ' no');
    return '<span class="pr' + cls + '">$' + Number(r.p).toLocaleString() + '</span>';
  }
  // level requirement: a lock chip while you are below it, a quiet "Lv N" once you meet it
  function lvTag(r) {
    if (!r.lvl) return '';
    var l = myLevel();
    if (l != null && l < r.lvl) return '<span class="lv lockd" title="Reach level ' + r.lvl + ' to buy this rod">' + ic('lock', 11) + 'Lv ' + r.lvl + '</span>';
    return '<span class="lv">Lv ' + r.lvl + '</span>';
  }
  function statRows(r, mods) {
    var h = '<div class="st6">';
    STATS.forEach(function (s) {
      var v = +r[s[0]] || 0, add = mods && +mods[s[0]] || 0, span = s[3] - s[2];
      var p = Math.max(0, Math.min(1, (v - s[2]) / span)), q = Math.max(0, Math.min(1 - p, add / span));
      h += '<span>' + s[1] + '</span><div class="sbar" style="--sc:' + s[4] + '"><b style="width:' + (p * 100).toFixed(1) + '%"></b>' +
        (q > 0 ? '<u style="left:' + (p * 100).toFixed(1) + '%;width:' + (q * 100).toFixed(1) + '%"></u>' : '') + '</div><em' + (add ? ' style="color:#ffd25a"' : '') + '>' + s[5](v + add) + '</em>';
    });
    return h + '</div>';
  }
  FUI.renderRods = function (el) {
    if (!el) return;
    var R = window.FWRODS || [], O = owned(), cur = st().rod;
    var mine = R.filter(function (r) { return O.indexOf(r.id) >= 0 || r.id === cur; });
    var rest = R.filter(function (r) { return mine.indexOf(r) < 0; });
    var h = '<div class="fui"><div class="fui-head">' + closeBtn(el) + '<h2>' + ic('rod', 22) + 'Rod Collection</h2><div class="fui-sub"><span class="fui-num">' + mine.length + ' / ' + R.length + '</span><div class="fui-prog"><b style="width:' + (R.length ? (mine.length / R.length * 100).toFixed(1) : 0) + '%"></b></div><span>rods collected</span></div></div>';
    h += '<div class="fui-rods">';
    mine.sort(function (a, b) { return (b.id === cur) - (a.id === cur); }).forEach(function (r) {
      var eq = r.id === cur, mods = null;
      if (window.FRL && typeof FRL.rodMods === 'function') { try { mods = FRL.rodMods(r.id); } catch (e) { } }
      var p = r.passive;
      h += '<div class="rd' + (eq ? ' eq' : '') + '" style="--rod:#' + ('00000' + ((r.col >>> 0) || 0xb08850).toString(16)).slice(-6) + '">' +
        '<div class="top"><div class="sw"><i></i></div><div><div class="nm">' + esc(r.n) + '</div><div class="src">' + esc(srcText(r)) + '</div></div>' + '</div>' +
        statRows(r, mods) +
        (r.t ? '<div class="tr"><b>Trait:</b> ' + esc(r.t) + '</div>' : '') +
        (p ? '<div class="ps">' + ic(PASS[String(p.id).split(':')[0]] || 'star', 13) + ' <b>Passive:</b> ' + esc(p.desc || p.id) + '</div>' : '') +
        (r.mx ? '<div class="ps">' + ic('dna', 13) + ' <b>Mutation:</b> ' + Math.round(r.mx.c * 1000) / 10 + '% chance to make catches ' + esc(r.mx.n) + '.</div>' : '') +
        '<div class="act">' + (eq ? '<span class="eqb">' + ic('check', 14) + ' Equipped</span>' : '<button class="btn g" data-eq="' + esc(r.id) + '">Equip</button>') + '</div></div>';
    });
    var next = rest.filter(function (r) { return r.p && !r.quest; }).sort(function (a, b) { return a.p - b.p; }).slice(0, 4);
    if (next.length && mine.length < 3) {
      var cr = R.filter(function (r) { return r.id === cur; })[0] || {};
      h += '<div class="rd nx"><div class="nx-h">' + ic('star', 14) + ' Next rods to get</div>';
      next.forEach(function (r) {
        var dp = (+r.pow || 0) - (+cr.pow || 0), dl = (+r.luck || 0) - (+cr.luck || 0);
        h += '<div class="nx-r" style="--rod:#' + ('00000' + ((r.col >>> 0) || 0xb08850).toString(16)).slice(-6) + '"><span class="sw"><i></i></span><span class="nx-b"><b>' + esc(r.n) + '</b><small>' + esc(srcText(r)) + '</small><small class="mt">' + priceTag(r) + lvTag(r) + '</small></span>' +
          '<span class="nx-d"><em class="' + (dp > 0 ? 'up' : dp < 0 ? 'dn' : '') + '">Power ' + (+r.pow).toFixed(1) + '</em><em class="' + (dl > 0 ? 'up' : dl < 0 ? 'dn' : '') + '">Luck +' + (+r.luck).toFixed(1) + '</em></span></div>';
      });
      h += '</div>';
    }
    h += '</div>';
    var shown = (next.length && mine.length < 3) ? next : [];
    rest = rest.filter(function (r) { return shown.indexOf(r) < 0; });
    if (rest.length) {
      h += '<h3>' + (shown.length ? 'More to find · ' : 'Still to find · ') + rest.length + '</h3><div class="fui-rods small">';
      rest.forEach(function (r) {
        h += '<div class="rd lk" style="--rod:#' + ('00000' + ((r.col >>> 0) || 0xb08850).toString(16)).slice(-6) + '"><div class="top"><div class="sw"><i></i></div><div><div class="nm">' + (r.quest ? ic('lock', 13) + ' ' : '') + esc(r.n) + '</div><div class="src">' + esc(srcText(r)) + '</div><div class="src mt">' + priceTag(r) + lvTag(r) + '</div></div></div></div>';
      });
      h += '</div>';
    }
    h += '</div>';
    el.innerHTML = h;
    el.querySelectorAll('[data-eq]').forEach(function (b) {
      b.onclick = function () { var id = b.getAttribute('data-eq'); if (FUI.onEquip) FUI.onEquip(id); else st().rod = id; FUI.renderRods(el); };
    });
    bindClose(el);
  };

  // ---- window polish: open/close scale+fade, a light dim over the world, chevron only when something scrolls ----
  // Opening is a CSS animation (the game toggles style.display); closing plays on a throwaway clone of the window so the
  // game's instant display:none still works. No blur filters: just opacity + transform, which stay cheap on a Chromebook.
  try {
    if (!window.__fuiWin) {
      window.__fuiWin = 1;
      var dim = null, seen = {}, rects = {};
      var fitEnd = function (w) { // the "more below" chevron lives in ::after (adds ~26px): drop it when nothing really scrolls
        var over = w.scrollHeight - w.clientHeight;
        w.classList.toggle('at-end', over <= 34 || w.scrollTop >= over - 6);
      };
      window.__fuiFitEnd = fitEnd;
      var syncDim = function () {
        var any = false, ws = document.querySelectorAll('.win');
        for (var i = 0; i < ws.length; i++) if (ws[i].style.display === 'block' && ws[i].id && !ws[i].classList.contains('fui-ghost')) { any = true; break; }
        if (!dim) { dim = document.createElement('div'); dim.id = 'fui-dim'; document.body.appendChild(dim); }
        dim.classList.toggle('on', any);
      };
      var ghost = function (w) {
        var r = rects[w.id]; if (!r || w.id === 'w-map' || w.id === 'w-trade') return;
        try {
          var g = w.cloneNode(true); g.removeAttribute('id'); g.className = (g.className + ' fui-ghost').replace(/\bat-end\b/, '');
          var all = g.querySelectorAll('[id]'); for (var i = 0; i < all.length; i++) all[i].removeAttribute('id');
          g.setAttribute('aria-hidden', 'true'); g.style.cssText = 'display:block;position:fixed;left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;margin:0;transform:none;max-height:none;overflow:hidden;pointer-events:none;z-index:4';
          document.body.appendChild(g); setTimeout(function () { if (g.parentNode) g.parentNode.removeChild(g); }, 140);
        } catch (e) { }
      };
      var onWin = function (w) {
        var on = w.style.display === 'block';
        if (on === !!seen[w.id]) return; seen[w.id] = on;
        if (on) { requestAnimationFrame(function () { rects[w.id] = w.getBoundingClientRect(); fitEnd(w); }); }
        else ghost(w);
        syncDim();
      };
      var hook = function () {
        var ws = document.querySelectorAll('.win'); if (!ws.length) return false;
        var mo = window.MutationObserver ? new MutationObserver(function (ms) { for (var i = 0; i < ms.length; i++) onWin(ms[i].target); }) : null;
        for (var i = 0; i < ws.length; i++) {
          if (mo) mo.observe(ws[i], { attributes: true, attributeFilter: ['style'] });
          // keep the last rendered box so the closing clone lands exactly where the window was (content may rerender while open)
          ws[i].addEventListener('scroll', (function (w) { return function () { rects[w.id] = w.getBoundingClientRect(); }; })(ws[i]), { passive: true });
        }
        return true;
      };
      var tries = 0, tm = setInterval(function () { if (hook() || ++tries > 40) clearInterval(tm); }, 250);
    }
  } catch (e) { }
})();
