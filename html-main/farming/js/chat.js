// Farming Unblocked — co-op chat: Enter opens a chat box while online, last 6 lines above the minimap
// (fade after 10 s, all visible while typing), names in player colors, school-friendly word filter,
// 120 chars, 1 msg / 0.6 s. Host relays `chat` {from,name,color,text} to everyone; `sys` {text} lines.
(function () {
  'use strict';

  var MAX_LINES = 6, MAX_LEN = 120, RATE_MS = 600, HOST_RATE_MS = 450, SHOW_MS = 10000, FADE_MS = 1000;

  // ---------- bad-word filter (char-by-char normalized copy keeps indices, letters may repeat) ----------
  var ANY = ['fuck', 'fuk', 'fck', 'shit', 'cunt', 'nigg', 'bitch', 'whore', 'slut', 'porn', 'dildo', 'jizz',
    'penis', 'vagina', 'asshole', 'wank', 'faggot', 'motherf', 'cocksuck', 'blowjob'];
  var WORD = ['ass', 'arse', 'dumbass', 'jackass', 'bastard', 'damn', 'dammit', 'dick', 'cock', 'pussy', 'piss',
    'pissed', 'fag', 'retard', 'retarded', 'sex', 'sexy', 'nude', 'boob', 'tits', 'titty', 'titties', 'wtf',
    'stfu', 'kys', 'rape', 'raped', 'horny', 'crap', 'crappy', 'twat', 'prick', 'douche', 'thot', 'cum', 'milf',
    'bollocks', 'bugger', 'nazi'];
  function pat(w) { return w.split('').map(function (ch) { return ch + '+'; }).join(''); }
  var RE_ANY = new RegExp('[a-z0-9]*(?:' + ANY.map(pat).join('|') + ')[a-z0-9]*', 'g');
  var RE_WORD = new RegExp('\\b(?:' + WORD.map(pat).join('|') + ')s?\\b', 'g');
  var LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i' };
  function normalize(s) {
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s[i], l = c.toLowerCase();
      if (l.length !== 1) l = c;
      out += LEET[l] || l;
    }
    return out;
  }
  function filter(text) {
    text = String(text == null ? '' : text);
    var n = normalize(text), mask = null, m, k;
    [RE_ANY, RE_WORD].forEach(function (re) {
      re.lastIndex = 0;
      while ((m = re.exec(n))) {
        if (!m[0].length) { re.lastIndex++; continue; }
        mask = mask || new Uint8Array(text.length);
        for (k = m.index; k < m.index + m[0].length; k++) mask[k] = 1;
      }
    });
    if (!mask) return text;
    var out = '', inMask = false;
    for (k = 0; k < text.length; k++) {
      if (mask[k]) { if (!inMask) out += '***'; inMask = true; } else { out += text[k]; inMask = false; }
    }
    return out;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var CTRL = (function () { var C = String.fromCharCode; return new RegExp('[' + C(0) + '-' + C(31) + C(127) + C(0x200b) + '-' + C(0x200f) + C(0x2028) + '-' + C(0x202e) + ']', 'g'); })();
  // strip control chars, collapse spaces, trim, cap length, filter
  function cleanText(t, max) {
    t = String(t == null ? '' : t).replace(CTRL, ' ')
      .replace(/\s+/g, ' ').trim();
    if (t.length > max) t = t.slice(0, max);
    return filter(t).trim();
  }
  function cleanName(n) { return cleanText(n, 20) || 'Farmer'; }
  function cssColor(c) {
    if (typeof c === 'number' && isFinite(c)) return '#' + ('000000' + (Math.max(0, Math.min(0xffffff, c | 0))).toString(16)).slice(-6);
    if (typeof c === 'string' && /^#?[0-9a-f]{6}$/i.test(c)) return c.charAt(0) === '#' ? c : '#' + c;
    return '#ffffff';
  }

  // ---------- state ----------
  var G = null, wrap = null, logEl = null, input = null, hint = null;
  var lines = [];           // {el, t, op}
  var open = false, closedAt = 0, lastSend = 0, hintUntil = 0, wasOnline = false;
  var hostLast = {};        // host-side rate limit per sender id

  function net() { return FU.net || null; }
  function online() { var n = net(); return !!(n && n.online); }

  function addLine(msg, system) {
    if (!logEl) return;
    var el = document.createElement('div');
    el.className = 'fu-chat-line' + (system ? ' sys' : '');
    if (system) {
      el.textContent = cleanText(msg && msg.text, 160);
    } else {
      var nm = document.createElement('b');
      nm.textContent = cleanName(msg && msg.name) + ': ';
      nm.style.color = cssColor(msg && msg.color);
      el.appendChild(nm);
      el.appendChild(document.createTextNode(cleanText(msg && msg.text, MAX_LEN)));
    }
    if (!el.textContent.replace(/^.*?: /, '') && !system) return;
    logEl.appendChild(el);
    lines.push({ el: el, t: performance.now(), op: 1 });
    while (lines.length > MAX_LINES) { var old = lines.shift(); if (old.el.parentNode) old.el.parentNode.removeChild(old.el); }
    if (wrap) wrap.style.display = '';
  }
  function clearLog() {
    lines.forEach(function (l) { if (l.el.parentNode) l.el.parentNode.removeChild(l.el); });
    lines.length = 0;
  }

  // ---------- sending ----------
  function hostDeliver(fromId, text) {
    var n = net(); if (!n) return;
    text = cleanText(text, MAX_LEN); if (!text) return;
    var p = (n.players && n.players[fromId]) || {};
    var mine = fromId === n.myId;
    var msg = {
      from: fromId,
      name: cleanName(p.name || (mine ? n.name : '') || 'Farmer'),
      color: p.color != null ? p.color : (mine && n.color != null ? n.color : 0xffffff),
      text: text
    };
    try { n.broadcast('chat', msg); } catch (e) { console.error('[FU] chat broadcast failed', e); }
    addLine(msg, false);
  }
  function send(text) {
    var n = net(); if (!n || !n.online) return false;
    text = cleanText(text, MAX_LEN); if (!text) return false;
    var now = performance.now();
    if (now - lastSend < RATE_MS) return false;
    lastSend = now;
    if (n.isHost) hostDeliver(n.myId, text);
    else { try { n.send('chat', { text: text }); } catch (e) { console.error('[FU] chat send failed', e); } }
    return true;
  }
  function system(text) {
    var n = net(); if (!n || !n.online) return;
    text = cleanText(text, 160); if (!text) return;
    if (n.isHost) { try { n.broadcast('sys', { text: text }); } catch (e) { console.error('[FU] chat sys failed', e); } }
    addLine({ text: text }, true);
  }

  // ---------- chat box ----------
  function openChat() {
    if (open || !input) return;
    open = true;
    G.openPanel('chat', closeChat);
    input.style.display = '';
    if (wrap) wrap.style.display = '';
    try { input.focus(); } catch (e) {}
  }
  function closeChat() {
    if (!open) return;
    open = false; closedAt = performance.now();
    G.closePanel('chat');
    if (input) { input.style.display = 'none'; try { input.blur(); } catch (e) {} }
    if (hint) hint.style.display = 'none';
  }
  function submit() {
    var text = cleanText(input.value, MAX_LEN);
    if (!text) { input.value = ''; closeChat(); return; }
    if (performance.now() - lastSend < RATE_MS) {
      hintUntil = performance.now() + 1200;
      if (hint) { hint.textContent = 'Slow down a little…'; hint.style.display = ''; }
      return;
    }
    if (send(text)) input.value = '';
    closeChat();
  }

  function buildDom() {
    var css = document.createElement('style');
    css.textContent = [
      '#fu-chat{position:absolute;left:12px;bottom:230px;width:min(380px,calc(100vw - 24px));display:flex;flex-direction:column;align-items:flex-start;gap:3px;pointer-events:none;z-index:10;font:14px system-ui,sans-serif;color:#fff}',
      '#fu-chat .fu-chat-log{display:flex;flex-direction:column;align-items:flex-start;gap:3px;max-width:100%}',
      '#fu-chat .fu-chat-line{background:rgba(12,16,14,.55);border-radius:7px;padding:3px 9px;max-width:100%;box-sizing:border-box;word-wrap:break-word;overflow-wrap:anywhere;text-shadow:0 1px 2px rgba(0,0,0,.8);transition:opacity .25s linear}',
      '#fu-chat .fu-chat-line b{font-weight:700}',
      '#fu-chat .fu-chat-line.sys{color:#ffe082;font-style:italic}',
      '#fu-chat input.fu-chat-input{pointer-events:auto;width:100%;box-sizing:border-box;margin-top:3px;padding:7px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.25);background:rgba(12,16,14,.88);color:#fff;font:14px system-ui,sans-serif;outline:none}',
      '#fu-chat input.fu-chat-input:focus{border-color:#4caf50}',
      '#fu-chat .fu-chat-hint{font-size:12px;color:#ffb74d;padding-left:4px}'
    ].join('\n');
    document.head.appendChild(css);
    wrap = document.createElement('div'); wrap.id = 'fu-chat'; wrap.style.display = 'none';
    logEl = document.createElement('div'); logEl.className = 'fu-chat-log';
    input = document.createElement('input');
    input.className = 'fu-chat-input'; input.type = 'text'; input.maxLength = MAX_LEN;
    input.autocomplete = 'off'; input.spellcheck = false;
    input.placeholder = 'Say something… (Enter to send, Esc to cancel)';
    input.style.display = 'none';
    hint = document.createElement('div'); hint.className = 'fu-chat-hint'; hint.style.display = 'none';
    wrap.appendChild(logEl); wrap.appendChild(input); wrap.appendChild(hint);
    (G.ui || document.body).appendChild(wrap);
    input.addEventListener('keydown', function (e) {
      e.stopPropagation(); // no gameplay/other-module keys while typing (core ignores inputs anyway)
      if (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter') { e.preventDefault(); submit(); }
      else if (e.key === 'Escape' || e.code === 'Escape') { e.preventDefault(); input.value = ''; closeChat(); }
      else if (e.key === 'Tab') e.preventDefault();
    });
    // clicking away (e.g. on the 3D view) closes the box but keeps the draft
    input.addEventListener('blur', function () { if (open) closeChat(); });
  }

  // ---------- public API ----------
  FU.chat = {
    system: system,            // host: broadcast `sys` + show; client: show locally only; offline: ignored
    send: send,                // send a chat message as yourself (rate limited, filtered)
    filter: filter,            // school-friendly mask with ***
    escapeHtml: esc,
    open: function () { if (online() && G && G.started) openChat(); },
    close: closeChat,
    isOpen: function () { return open; },
    clear: clearLog
  };

  FU.register({
    name: 'chat', order: 97, ui: true,
    init: function (g) {
      G = g;
      buildDom();
      var n = net();
      if (n && n.on) {
        n.on('chat', function (d, fromId) {
          var nn = net(); if (!nn || !d) return;
          if (nn.isHost) {
            if (!fromId || fromId === nn.myId) return; // our own messages are shown in hostDeliver
            var now = performance.now();
            if (now - (hostLast[fromId] || -1e9) < HOST_RATE_MS) return;
            hostLast[fromId] = now;
            hostDeliver(fromId, d.text);
          } else addLine(d, false);
        });
        n.on('sys', function (d) { var nn = net(); if (nn && !nn.isHost && d) addLine(d, true); });
      }
      G.on('netPlayerJoin', function (e) {
        var nn = net(); if (!nn || !nn.isHost || !e || !e.player || e.player.id === nn.myId) return;
        system(cleanName(e.player.name) + ' joined the farm');
      });
      G.on('netPlayerLeave', function (e) {
        var nn = net(); if (!nn || !nn.isHost || !e || !e.player || e.player.id === nn.myId) return;
        delete hostLast[e.player.id];
        system(cleanName(e.player.name) + ' left the farm');
      });
      G.on('netLeft', function () { closeChat(); clearLog(); hostLast = {}; });
    },
    update: function (dt, g) {
      if (!wrap) return;
      var on = online(), now = performance.now();
      if (on !== wasOnline) {
        wasOnline = on;
        if (on) addLine({ text: 'Co-op chat: press Enter to talk.' }, true);
        else { closeChat(); clearLog(); hostLast = {}; }
      }
      if (open && (!on || !g.isPanelOpen('chat'))) {
        // offline, or someone else closed our panel: hide the box
        if (g.isPanelOpen('chat')) g.closePanel('chat');
        open = true; closeChat();
      }
      if (!open && on && g.started && !g.input.blocked && now - closedAt > 250 &&
          (g.input.pressed('Enter') || g.input.pressed('NumpadEnter'))) openChat();
      else if (open && document.activeElement !== input && (g.input.pressed('Enter') || g.input.pressed('NumpadEnter'))) {
        try { input.focus(); } catch (e) {}
      }
      if (hint && hint.style.display !== 'none' && now > hintUntil) hint.style.display = 'none';
      wrap.style.display = g.started && (on || lines.length) ? '' : 'none';
      for (var i = 0; i < lines.length; i++) {
        var l = lines[i], age = now - l.t;
        var op = open ? 1 : age < SHOW_MS - FADE_MS ? 1 : age < SHOW_MS ? (SHOW_MS - age) / FADE_MS : 0;
        op = Math.round(op * 20) / 20;
        if (op !== l.op) { l.op = op; l.el.style.opacity = op; l.el.style.display = op > 0 ? '' : 'none'; }
      }
    }
  });
})();
