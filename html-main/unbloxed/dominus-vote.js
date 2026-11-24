// Dominus vote (prize 4, Most Respectable) + the Dominus Awards ceremony (all 4 prizes).
// Server side: dominus-vote.sql (ubx_poll_state / ubx_poll_vote / ubx_poll_pick; admin.html runs the vote and the ceremony).
// One vote per account and no voting for yourself are enforced by Supabase. Calls: 1 on hub open, then every 15 s only while the poll popup is open.
// Prizes: every Dominus handed out (ceremony, the vote winner's pick, or duke's Give button) comes back in ubx_poll_state.grants
// and is added to this player's hats here (av.own.hat) on every visit, so it also reaches them on another computer.
// Dominus names/pictures and their hats come from dominus-choices.js (window.UBX_DOMINUS_CHOICES / UBX_DOMINUS_RENDER / UBX_DOMINUS_HAT).
(function () {
  'use strict';
  if (/[?&](studio|game|remix|import)=/.test(location.search)) return;
  var URL = 'https://zznsfdcpondfnacherxv.supabase.co', KEY = 'sb_publishable_P6Xw_9hNrt-1_sKE7SsN7w_nN7eum3I';
  var S = null, timer = 0, open = null, after = null; // S = last poll state; open = 'poll' | 'win' | 'cer' | 'gift' | null

  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { } }
  function acct() { return window.FU && FU.account; }
  function me() { var A = acct(); return A && A.signedIn() ? A.user() : ''; }
  function same(a, b) { return String(a == null ? '' : a).toLowerCase() === String(b == null ? '' : b).toLowerCase(); }
  function color(n) { var h = 0; for (var i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) % 360; return 'hsl(' + h + ',55%,48%)'; }

  async function call(fn, args) {
    var A = acct(), c = A && A.creds(), base = { p_user: '', p_hash: '' };
    if (c) base = { p_user: c.u, p_hash: await A.hash(c.u, c.p) };
    var r = await fetch(URL + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign(base, args || {})) });
    var t = await r.text(), j = null; try { j = JSON.parse(t); } catch (e) { }
    if (!r.ok) throw new Error((j && j.message) || ('HTTP ' + r.status));
    return j;
  }

  var css = '.dv-bg{position:fixed;inset:0;z-index:90001;display:flex;align-items:center;justify-content:center;background:#000a;font-family:"Builder Sans","Gotham SSm",system-ui,Segoe UI,sans-serif;padding:16px}' +
    '.dv{position:relative;width:min(520px,100%);max-height:100%;overflow:auto;background:#393b3d;color:#fff;border-radius:8px;box-shadow:0 10px 40px #000a;padding:22px 24px 20px;box-sizing:border-box}' +
    '.dv h1{margin:0 0 6px;font-size:26px;font-weight:900;line-height:1.15;text-align:center;letter-spacing:.3px;color:#ffd84a;text-shadow:0 2px 0 #0006}' +
    '.dv p{margin:0 0 10px;font-size:15px;line-height:1.4;color:#e8e8e8;text-align:center}.dv .sub{font-size:13px;color:#bdbebe}' +
    '.dv-x{position:absolute;top:8px;right:10px;width:32px;height:32px;border:0;border-radius:6px;background:transparent;color:#bdbebe;font:700 22px/1 system-ui,sans-serif;cursor:pointer}.dv-x:hover{background:#ffffff1a;color:#fff}' +
    '.dv-list{display:grid;gap:8px;margin:12px 0 14px}' +
    '.dv-c{position:relative;display:flex;align-items:center;gap:12px;width:100%;box-sizing:border-box;padding:10px 12px;border:2px solid transparent;border-radius:8px;background:#2c2e30;color:#fff;text-align:left;font:inherit;overflow:hidden}' +
    'button.dv-c{cursor:pointer}button.dv-c:hover{background:#333638}.dv-c.sel{border-color:#335fff}.dv-c.mine{border-color:#ffd84a}.dv-c.won{border-color:#ffd84a;background:#3d3824}.dv-c.self{opacity:.65}' +
    '.dv-bar{position:absolute;left:0;top:0;bottom:0;background:#335fff33;transition:width .4s}.dv-c.mine .dv-bar,.dv-c.won .dv-bar{background:#ffd84a2e}' +
    '.dv-h{position:relative;width:44px;height:44px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;font:800 21px system-ui,sans-serif;box-shadow:inset 0 -3px 0 #0003}' +
    '.dv-n{position:relative;flex:1;min-width:0;font-weight:700;font-size:17px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dv-n i{display:block;font-style:normal;font-weight:400;font-size:12px;color:#bdbebe}' +
    '.dv-pc{position:relative;font-weight:800;font-size:16px;min-width:48px;text-align:right}' +
    '.dv-go{display:block;width:100%;border:0;border-radius:8px;padding:12px;font-weight:700;font-size:17px;font-family:inherit;color:#fff;background:#335fff;cursor:pointer}' +
    '.dv-go:disabled{background:#5a5d61;color:#c8c8c8;cursor:default}.dv-go:not(:disabled):hover{background:#2b50db}.dv-go.gold{background:#e2b400;color:#1b1b1b}.dv-go.gold:not(:disabled):hover{background:#f0c419}' +
    '.dv-msg{min-height:18px;margin:8px 0 0;font-size:13px;text-align:center;color:#bdbebe}.dv-msg.bad{color:#ff8a8a}' +
    '.dv-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:14px 0}@media(max-width:460px){.dv-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}' +
    '.dv-t{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;aspect-ratio:1;padding:8px;box-sizing:border-box;border:2px solid transparent;border-radius:8px;background:#2c2e30;color:#fff;font-weight:600;font-size:13px;font-family:inherit;text-align:center;cursor:pointer}' +
    '.dv-t:hover{border-color:#ffd84a}.dv-t img{width:100%;height:72%;object-fit:contain}.dv-t.ph{cursor:default;border:2px dashed #5a5d61;color:#8d9095;font-weight:400}.dv-t.ph:hover{border-color:#5a5d61}' +
    '.dv-t.ph b{font-size:30px;color:#5a5d61}.dv-t.picked{border-color:#ffd84a;background:#3d3824}' +
    // awards ceremony + "you got a Dominus" rows
    '.dv-pic{position:relative;width:60px;height:60px;flex:none;border-radius:8px;background:#232527;display:flex;align-items:center;justify-content:center;font-size:30px;overflow:hidden}.dv-pic img{width:100%;height:100%;object-fit:contain}' +
    '.dv-aw .dv-n{white-space:normal;font-size:16px;line-height:1.25}.dv-lb{display:block;color:#ffd84a;font-size:12px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;margin-bottom:2px}' +
    '.dv-you{margin:4px 0 6px;padding:10px 12px;border-radius:8px;background:#3d3824;border:2px solid #ffd84a;font-weight:700;text-align:center;font-size:15px;line-height:1.35}' +
    '#dv-pill{position:fixed;right:14px;bottom:14px;z-index:19;border:0;border-radius:999px;padding:10px 16px;background:#e2b400;color:#1b1b1b;font:800 14px "Builder Sans",system-ui,Segoe UI,sans-serif;box-shadow:0 4px 14px #0006;cursor:pointer}#dv-pill:hover{background:#f0c419}';

  function close() {
    var b = document.querySelector('.dv-bg'); if (b) b.remove(); open = null; clearInterval(timer); timer = 0;
    var f = after; after = null; if (f) setTimeout(f, 0); // e.g. the ceremony popup hands over to the "you got a Dominus" popup
  }
  function shell(kind, then) {
    after = null; close(); open = kind; after = then || null;
    if (!document.getElementById('dv-style')) { var st = el('style'); st.id = 'dv-style'; st.textContent = css; document.head.appendChild(st); }
    var bg = el('div', 'dv-bg'), box = el('div', 'dv'), x = el('button', 'dv-x', '×');
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); x.type = 'button'; x.title = 'Close'; x.onclick = close;
    bg.onclick = function (e) { if (e.target === bg) close(); };
    box.appendChild(x); bg.appendChild(box); document.body.appendChild(bg);
    return box;
  }
  function left(s) {
    if (!s.ends_at) return '';
    var ms = new Date(s.ends_at) - new Date(s.now || Date.now()); if (ms <= 0) return '';
    var m = Math.floor(ms / 60000), d = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60);
    return 'Voting ends in ' + (d ? d + 'd ' + h + 'h' : h ? h + 'h ' + (m % 60) + 'm' : Math.max(1, m) + 'm') + ' (' + new Date(s.ends_at).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' }) + ')';
  }
  function ended() { return !!(S && S.ceremony && S.ceremony.ended); }

  // ---------- Dominus prizes: names, pictures and the hat each one unlocks ----------
  // the announced prizes 1-3 ('builder' = the custom Builder Dominus, which is Dominus Doom in the game)
  var NAMES = { builder: 'Dominus Doom', aureus: 'Dominus Aureus', pittacium: 'Dominus Pittacium' };
  function choices() { return Array.isArray(window.UBX_DOMINUS_CHOICES) ? window.UBX_DOMINUS_CHOICES : []; }
  function choiceFor(prize) {
    var p = String(prize == null ? '' : prize).trim(), L = choices(), i; if (!p) return null;
    for (i = 0; i < L.length; i++) if (same(L[i].id, p) || same(L[i].name, p)) return L[i];
    // dominus-choices.js knows the prize words ('builder' -> Dominus Doom): use the choice for the hat it names
    if (typeof window.UBX_DOMINUS_HAT === 'function') { try { var h = window.UBX_DOMINUS_HAT(p); if (h >= 0) for (i = 0; i < L.length; i++) if (L[i].hat === h) return L[i]; } catch (e) { } }
    var k = p.toLowerCase(); // 'aureus' -> 'Dominus Aureus'
    if (k.length >= 4) for (i = 0; i < L.length; i++) if (String(L[i].name || '').toLowerCase().indexOf(k) >= 0) return L[i];
    return null;
  }
  function prizeName(prize) { var c = choiceFor(prize); return c ? String(c.name || c.id) : (NAMES[String(prize).toLowerCase()] || String(prize || '')); }
  function prizeImg(prize) { var c = choiceFor(prize); return (c && c.img) || ''; }
  // the HATS index a prize unlocks (-1 = not in the game yet)
  function hatIndex(prize) {
    if (typeof window.UBX_DOMINUS_HAT === 'function') { try { var r = window.UBX_DOMINUS_HAT(prize); if (r >= 0) return r | 0; } catch (e) { } }
    var c = choiceFor(prize);
    if (c && typeof c.hat === 'number' && c.hat >= 0) return c.hat | 0;
    if (c && /^\d+$/.test(String(c.id))) return +c.id;
    if (typeof HATS === 'undefined' || typeof HAT_BASE === 'undefined') return -1;
    var want = [c && c.name, c && c.id, NAMES[String(prize).toLowerCase()], prize], i, j;
    for (j = 0; j < want.length; j++) if (want[j]) for (i = HAT_BASE; i < HATS.length; i++) if (same(HATS[i], want[j])) return i;
    var k = String(prize).toLowerCase(); // last resort: a Dominus hat with the prize word in its name
    if (k.length >= 4) for (i = HAT_BASE; i < HATS.length; i++) { var n = String(HATS[i]).toLowerCase(); if (n.indexOf('dominus') >= 0 && n.indexOf(k) >= 0) return i; }
    return -1;
  }
  function validHat(i) { return i >= 0 && (typeof HATS === 'undefined' || i < HATS.length); }
  function awardLabel(id) { var a = ((S && S.awards) || []).filter(function (x) { return x.id === id; })[0]; return a ? a.label : ''; }
  function why(g) { return g.award === 'manual' ? 'A gift from Duke' : 'For ' + (awardLabel(g.award) || g.award); }
  // dominus-choices.js can hand out a placeholder picture until the 3D thumbnail is drawn: swap in the real one when it lands
  function liveImg(im, get) {
    var n = 0, t = setInterval(function () { var s = ''; try { s = get(); } catch (e) { } if (s && s !== im.getAttribute('src')) im.src = s; if (++n > 25 || (n > 2 && !im.isConnected)) clearInterval(t); }, 600);
  }
  function pic(prize) {
    var box = el('div', 'dv-pic'), src = prizeImg(prize);
    if (src) { var im = el('img'); im.src = src; im.alt = ''; im.onerror = function () { im.remove(); box.textContent = '🏆'; }; box.appendChild(im); liveImg(im, function () { return prizeImg(prize); }); } else box.textContent = '🏆';
    return box;
  }

  // add every Dominus this account was given to its hats (again on every visit: survives a reset or another computer)
  function applyGrants() {
    var list = (S && Array.isArray(S.grants)) ? S.grants : [], got = 0;
    if (!list.length || typeof av === 'undefined' || !av || !av.own || !Array.isArray(av.own.hat)) return;
    list.forEach(function (g) { var i = hatIndex(g.prize); if (validHat(i) && av.own.hat.indexOf(i) < 0) { av.own.hat.push(i); got++; } }); // not in the game yet: next visit
    if (got && typeof save === 'function') { try { save(); } catch (e) { } }
  }
  function seenGifts() { try { var a = JSON.parse(lsGet('ubx_dv_gifts') || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function newGifts() { var seen = seenGifts(); return ((S && S.grants) || []).filter(function (g) { return seen.indexOf(g.id) < 0 && validHat(hatIndex(g.prize)); }); }
  function markGifts(list) { var seen = seenGifts(); list.forEach(function (g) { if (seen.indexOf(g.id) < 0) seen.push(g.id); }); lsSet('ubx_dv_gifts', JSON.stringify(seen.slice(-300))); }

  // ---------- the poll ----------
  var sel = '';
  function openPoll() {
    var box = shell('poll');
    var h1 = el('h1'), intro = el('p', '', 'Most Respectable wins prize 4: any Dominus they want. Who should win it?'); box.appendChild(h1); box.appendChild(intro);
    var sub = el('p', 'sub'); box.appendChild(sub);
    var list = el('div', 'dv-list'); box.appendChild(list);
    var go = el('button', 'dv-go'); go.type = 'button'; box.appendChild(go);
    var msg = el('div', 'dv-msg'); box.appendChild(msg);
    function draw() {
      var s = S, u = me(); if (!s) return;
      var voting = s.open && u && !s.mine, max = 0;
      if (same(sel, u)) sel = '';
      h1.textContent = s.winner ? s.winner.toUpperCase() + ' WON THE DOMINUS!' : 'VOTE FOR THE MOST RESPECTABLE!'; intro.style.display = s.winner ? 'none' : '';
      s.choices.forEach(function (c) { max = Math.max(max, s.counts[c] | 0); });
      sub.textContent = s.winner ? 'Voting is over. The winner is ' + s.winner + '!' : !s.open ? 'Voting has ended. The winner is announced soon.' :
        (u ? (s.mine ? 'You voted for ' + s.mine + '. Thanks!' : 'One vote per account. You can\'t vote for yourself or change your vote.') : 'Log in to vote.') + (left(s) ? ' ' + left(s) + '.' : '');
      list.textContent = '';
      s.choices.forEach(function (c) {
        var n = s.counts[c] | 0, pc = s.total ? Math.round(n * 100 / s.total) : 0, self = !!u && same(c, u), can = voting && !self;
        var row = el(can ? 'button' : 'div', 'dv-c' + (same(c, sel) && can ? ' sel' : '') + (same(c, s.mine) ? ' mine' : '') + (same(c, s.winner) ? ' won' : '') + (voting && self ? ' self' : ''));
        if (can) { row.type = 'button'; row.onclick = function () { sel = c; draw(); }; }
        var bar = el('div', 'dv-bar'); bar.style.width = pc + '%'; row.appendChild(bar);
        var h = el('div', 'dv-h', c.charAt(0).toUpperCase()); h.style.background = color(c.toLowerCase()); row.appendChild(h);
        var nm = el('div', 'dv-n', c); nm.appendChild(el('i', '', n + ' vote' + (n === 1 ? '' : 's') + (same(c, s.winner) ? ' · WINNER' : same(c, s.mine) ? ' · your vote' : self ? ' · that\'s you' : n && n === max && s.total ? ' · leading' : ''))); row.appendChild(nm);
        row.appendChild(el('div', 'dv-pc', pc + '%'));
        list.appendChild(row);
      });
      go.className = 'dv-go';
      if (voting) { go.disabled = !sel; go.textContent = sel ? 'Vote for ' + sel : 'Pick a player'; go.onclick = vote; }
      else if (s.open && !u) { go.disabled = false; go.textContent = 'Log in to vote'; go.onclick = function () { close(); var L = document.getElementById('login'); if (L) L.style.display = 'flex'; }; }
      else if (s.winner && same(s.winner, u)) { go.disabled = false; go.className = 'dv-go gold'; go.textContent = s.winner_pick ? 'You won! See your Dominus' : 'You won! Pick your Dominus'; go.onclick = openWin; }
      else if (ended()) { go.disabled = false; go.className = 'dv-go gold'; go.textContent = '🏆 See all the award winners'; go.onclick = openCeremony; }
      else { go.disabled = false; go.textContent = 'Close'; go.onclick = close; }
    }
    async function vote() {
      if (!sel) return; go.disabled = true; go.textContent = 'Voting...'; msg.className = 'dv-msg'; msg.textContent = '';
      try { S = await call('ubx_poll_vote', { p_choice: sel }); sel = ''; msg.textContent = 'Vote counted!'; applyGrants(); }
      catch (e) { msg.className = 'dv-msg bad'; msg.textContent = /already voted/.test(e.message) ? 'You already voted.' : /yourself/.test(e.message) ? 'You can\'t vote for yourself.' : /closed/.test(e.message) ? 'Voting is closed.' : /log in/.test(e.message) ? 'Your login expired. Log out and back in, then vote.' : 'Could not vote: ' + e.message; refresh(); }
      draw(); pill();
    }
    open = 'poll'; box._draw = draw; draw();
    // live-ish results, only while this popup is open and the tab is visible
    timer = setInterval(function () { if (!document.hidden) refresh(); }, 15000);
  }
  async function refresh() {
    try { S = await call('ubx_poll_state') || S; } catch (e) { return; }
    applyGrants();
    var box = document.querySelector('.dv'); if (open === 'poll' && box && box._draw) box._draw(); pill();
  }

  // ---------- the vote winner's popup: pick a Dominus ----------
  function openWin() {
    var box = shell('win');
    box.appendChild(el('h1', '', 'YOU WON!'));
    box.appendChild(el('p', '', 'The players voted you Most Respectable! Pick the Dominus you want as your prize.'));
    var sub = el('p', 'sub'); box.appendChild(sub);
    // HOOK: the empty container below is filled from dominus-choices.js (UBX_DOMINUS_CHOICES or UBX_DOMINUS_RENDER)
    var grid = el('div', 'dv-grid'); grid.id = 'ubx-dominus-choices'; grid.setAttribute('data-hook', 'dominus-choices'); box.appendChild(grid);
    var msg = el('div', 'dv-msg'); box.appendChild(msg);
    var done = el('button', 'dv-go'); done.type = 'button'; done.textContent = 'Close'; done.onclick = close; box.appendChild(done);
    function status() {
      sub.textContent = !S.winner_pick ? 'You can only pick once, so choose carefully.' :
        'You picked: ' + S.winner_pick + '. ' + (!ended() ? 'You get it when the awards ceremony ends!' : validHat(hatIndex(S.winner_pick)) ? 'It\'s in your hats now. Open Avatar to wear it!' : 'It shows up in your hats soon!');
    }
    async function pick(ch) {
      ch = ch || {}; var name = String(ch.name || ch.id || '').slice(0, 80); if (!name) return;
      if (S.winner_pick) { msg.textContent = 'You already picked ' + S.winner_pick + '.'; return; }
      if (!confirm('Pick ' + name + ' as your prize? You can\'t change it after.')) return;
      msg.className = 'dv-msg'; msg.textContent = 'Saving...';
      try { S = await call('ubx_poll_pick', { p_pick: name }); msg.textContent = 'Saved!'; applyGrants(); markGifts(((S && S.grants) || []).filter(function (g) { return g.award === 'respectable'; })); status(); fill(); pill(); }
      catch (e) { msg.className = 'dv-msg bad'; msg.textContent = /already picked/.test(e.message) ? 'You already picked.' : 'Could not save: ' + e.message; }
    }
    function fill() {
      grid.textContent = '';
      if (typeof window.UBX_DOMINUS_RENDER === 'function') { try { window.UBX_DOMINUS_RENDER(grid, pick, S); } catch (e) { console.error(e); } return; }
      var list = choices();
      if (!list.length) { // placeholders until the Dominus logos are added (dominus-choices.js)
        for (var i = 0; i < 6; i++) { var t = el('div', 'dv-t ph'); t.appendChild(el('b', '', '?')); t.appendChild(el('span', '', 'Dominus coming soon')); grid.appendChild(t); }
        msg.textContent = 'The Dominus choices are being added. Check back soon!'; return;
      }
      list.forEach(function (ch) {
        var t = el('button', 'dv-t' + (S.winner_pick && same(S.winner_pick, ch.name || ch.id) ? ' picked' : '')); t.type = 'button';
        if (ch.img) { var im = el('img'); im.src = ch.img; im.alt = ''; im.onerror = function () { im.remove(); }; t.appendChild(im); liveImg(im, function () { return ch.img; }); }
        t.appendChild(el('span', '', ch.name || ch.id)); t.onclick = function () { pick(ch); }; grid.appendChild(t);
      });
    }
    status(); fill();
  }

  // ---------- the awards ceremony: all 4 winners and their Dominus ----------
  function openCeremony() {
    if (!S || !ended()) return;
    lsSet('ubx_dv_cer_seen', String(S.ceremony.ended_at || '1'));
    var u = me(), awards = S.awards || [];
    var mineAw = awards.filter(function (a) { return u && a.winner && same(a.winner, u); });
    // the award prizes are announced here, so only a gift from Duke still gets its own popup afterwards
    markGifts(((S && S.grants) || []).filter(function (g) { return g.award !== 'manual'; }));
    var box = shell('cer', function () { var g = newGifts(); if (g.length) openGift(g); });
    box.appendChild(el('h1', '', '🏆 THE DOMINUS AWARDS'));
    box.appendChild(el('p', '', 'The results are in! Here are this week\'s winners.'));
    if (mineAw.length) {
      var gotAll = mineAw.every(function (a) { return a.prize && validHat(hatIndex(a.prize)); });
      box.appendChild(el('div', 'dv-you', 'You won ' + mineAw.map(function (a) { return a.label; }).join(' and ') + '! ' +
        (mineAw.some(function (a) { return a.id === 'respectable' && !a.prize; }) ? 'Pick your Dominus to get it.' : gotAll ? 'Your Dominus is in your hats now. Open Avatar to wear it!' : 'Your Dominus shows up in your hats soon.')));
    }
    var list = el('div', 'dv-list'); box.appendChild(list);
    awards.forEach(function (a) {
      var won = !!(u && a.winner && same(a.winner, u)), row = el('div', 'dv-c dv-aw' + (won ? ' won' : ''));
      row.appendChild(pic(a.prize));
      var nm = el('div', 'dv-n'); nm.appendChild(el('span', 'dv-lb', a.label));
      nm.appendChild(document.createTextNode(a.winner ? a.winner + (won ? ' (you!)' : '') : 'No winner'));
      nm.appendChild(el('i', '', (a.game ? 'for ' + a.game + ' · ' : '') + (a.prize ? prizeName(a.prize) : a.id === 'respectable' ? 'Any Dominus they want' : 'Dominus')));
      row.appendChild(nm); list.appendChild(row);
    });
    var pickNow = S.winner && same(S.winner, u) && !S.winner_pick;
    var go = el('button', 'dv-go' + (pickNow ? ' gold' : '')); go.type = 'button';
    go.textContent = pickNow ? 'Pick your Dominus' : 'Close'; go.onclick = pickNow ? openWin : close; box.appendChild(go);
  }

  // ---------- "you got a Dominus!" (duke's Give button, or a prize that only just reached this computer) ----------
  function openGift(list) {
    if (!list || !list.length) return;
    markGifts(list);
    var box = shell('gift');
    box.appendChild(el('h1', '', list.length > 1 ? 'YOU GOT ' + list.length + ' DOMINUS!' : 'YOU GOT A DOMINUS!'));
    box.appendChild(el('p', '', 'It\'s in your hats now. Open Avatar to wear it!'));
    var rows = el('div', 'dv-list'); box.appendChild(rows);
    list.forEach(function (g) {
      var row = el('div', 'dv-c dv-aw won'); row.appendChild(pic(g.prize));
      var nm = el('div', 'dv-n'); nm.appendChild(el('span', 'dv-lb', why(g))); nm.appendChild(document.createTextNode(prizeName(g.prize)));
      row.appendChild(nm); rows.appendChild(row);
    });
    var go = el('button', 'dv-go gold'); go.type = 'button'; go.textContent = 'Awesome!'; go.onclick = close; box.appendChild(go);
  }

  // ---------- small button so the popups can be opened again ----------
  function pill() {
    var p = document.getElementById('dv-pill');
    if (!S) { if (p) p.remove(); return; }
    if (!p) { if (!document.getElementById('dv-style')) { var st = el('style'); st.id = 'dv-style'; st.textContent = css; document.head.appendChild(st); } p = el('button'); p.id = 'dv-pill'; p.type = 'button'; document.body.appendChild(p); }
    var u = me(), won = S.winner && same(S.winner, u), pickNow = won && !S.winner_pick, cer = ended();
    p.textContent = pickNow ? '★ You won! Pick your Dominus' : cer ? '🏆 Award winners' : won ? '★ You won! Your Dominus' : S.winner ? 'Dominus vote: ' + S.winner + ' won' : S.open && u && !S.mine ? '★ Vote for the Most Respectable' : 'Dominus vote results';
    p.onclick = function () { if (pickNow || (won && !cer)) openWin(); else if (cer) openCeremony(); else openPoll(); };
  }

  // ---------- start: after the login screen and the giveaway announcement are out of the way ----------
  function ready() {
    var L = document.getElementById('login');
    return document.body && acct() && !(L && L.style.display === 'flex') && !document.querySelector('.dmx-bg') && !document.querySelector('.dv-bg');
  }
  async function start() {
    try { S = await call('ubx_poll_state'); } catch (e) { return; } // not set up yet (dominus-vote.sql not run): stay hidden
    if (!S || !S.choices) { S = null; return; }
    applyGrants(); pill(); auto();
  }
  function auto() {
    var u = me(), s = S, gifts;
    if (s.winner && same(s.winner, u) && !s.winner_pick) { openWin(); return; }
    if (ended() && lsGet('ubx_dv_cer_seen') !== String(s.ceremony.ended_at || '1')) { openCeremony(); return; }
    gifts = newGifts(); if (gifts.length) { openGift(gifts); return; }
    if (ended()) return; // after the ceremony the vote stays reachable from the button
    if (s.winner) { if (!same(s.winner, u) && lsGet('ubx_dv_seen_winner') !== s.winner) { lsSet('ubx_dv_seen_winner', s.winner); openPoll(); } }
    else if (s.open && !s.mine && !ssGet('ubx_dv_auto')) { ssSet('ubx_dv_auto', '1'); openPoll(); }
  }
  var waited = 0, lastUser = null;
  (function wait() {
    if (ready()) { lastUser = me(); start(); return; }
    if (++waited < 600) setTimeout(wait, 500); // up to 5 min (login screen)
  })();
  // signing in / out on the hub: re-check (a newly logged-in winner gets their popup and their Dominus)
  setInterval(function () {
    if (lastUser === null || !S) return; var u = me();
    if (u !== lastUser && ready()) { lastUser = u; start(); }
  }, 2000);

  window.UBXDominusVote = { openPoll: openPoll, openWin: openWin, openCeremony: openCeremony, openGift: openGift, refresh: refresh, hatIndex: hatIndex, state: function () { return S; } };
})();
