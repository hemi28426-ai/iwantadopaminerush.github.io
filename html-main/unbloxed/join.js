// Unbloxed: "Joining server…" screen shown before every game, so entering a game feels like
// joining a server that is already running instead of being dropped straight into a fight.
// joinServer(gameId, cardInfo, onReady): shows the screen, calls onReady() behind it while the
// map loads, then fades out. window.UBX_SERVER = { id, game } describes the server you joined.
window.MODES = window.MODES || {};
(function () {
  var css = '#ubx-join{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;' +
    'background:radial-gradient(circle at 50% 38%,#26306b,#0b0f24);color:#fff;font-family:system-ui,Segoe UI,sans-serif;transition:opacity .45s}' +
    '#ubx-join .card{width:min(540px,92vw);border-radius:16px;overflow:hidden;background:#151b3c;box-shadow:0 24px 70px #000a}' +
    '#ubx-join .ban{height:150px;display:flex;align-items:flex-end;padding:16px 18px;font-weight:900;font-size:28px;text-shadow:0 2px 0 #0009;position:relative}' +
    '#ubx-join .ban .ic{position:absolute;right:18px;top:8px;font-size:76px}' +
    '#ubx-join .body{padding:16px 18px 18px}' +
    '#ubx-join .srv{display:flex;justify-content:space-between;gap:10px;color:#9ab;font-size:13px;margin-bottom:12px}' +
    '#ubx-join .bar{height:10px;border-radius:5px;background:#0d1230;overflow:hidden}' +
    '#ubx-join .fill{height:100%;width:0;background:linear-gradient(90deg,#4cf,#7dff9a);transition:width .4s}' +
    '#ubx-join .st{margin-top:10px;font-weight:700}' +
    '#ubx-join .tip{margin-top:6px;color:#9ab;font-size:13px;min-height:18px}';
  var TIPS = {
    heights: ['Click fast twice to lunge.', 'Frostfang waits at the very top. One hit, one KO.', 'Skyhop Boots: hold Space in the air.', 'The Waystone (E) takes you to the safe Vault.'],
    steal: ['Buy blockers off the belt with E.', 'Stand on your green pad to collect cash.', 'Lock your base when a thief shows up.', 'Get hit while carrying and you drop it.']
  };
  function hex4() { return Math.floor(Math.random() * 65536).toString(16).toUpperCase().padStart(4, '0'); }
  window.joinServer = function (game, info, onReady) {
    info = info || {};
    var st = document.createElement('style'); st.textContent = css;
    var el = document.createElement('div'); el.id = 'ubx-join';
    var sid = hex4();
    window.UBX_SERVER = { id: sid, game: game };
    var tips = TIPS[game] || ['Have fun!'];
    el.innerHTML = '<div class="card"><div class="ban" style="background:' + (info.bg || '#26306b') + '"><span class="ic">' + (info.ic || '🎮') + '</span>' +
      (info.t || 'Unbloxed') + '</div><div class="body"><div class="srv"><span>Server #' + sid + '</span><span id="ubx-join-n">finding players…</span></div>' +
      '<div class="bar"><div class="fill" id="ubx-join-fill"></div></div><div class="st" id="ubx-join-st">Finding a server…</div>' +
      '<div class="tip">💡 ' + tips[Math.floor(Math.random() * tips.length)] + '</div></div></div>';
    document.head.appendChild(st); document.body.appendChild(el);
    var fill = el.querySelector('#ubx-join-fill'), stx = el.querySelector('#ubx-join-st'), n = el.querySelector('#ubx-join-n');
    var steps = [[18, 'Finding a server…', 450], [42, 'Joining server #' + sid + '…', 550], [78, 'Loading the map…', 650], [100, 'Spawning…', 450]];
    var i = 0, started = false;
    function next() {
      if (i >= steps.length) {
        el.style.opacity = '0';
        setTimeout(function () { el.remove(); st.remove(); }, 480);
        return;
      }
      var s = steps[i++];
      fill.style.width = s[0] + '%'; stx.textContent = s[1];
      if (i === 2) n.textContent = 'connected';
      if (i === 3 && !started) {
        started = true;
        // build the world behind the screen
        setTimeout(function () { try { onReady && onReady(); } catch (e) { console.error(e); } }, 60);
      }
      setTimeout(next, s[2]);
    }
    next();
  };
})();
