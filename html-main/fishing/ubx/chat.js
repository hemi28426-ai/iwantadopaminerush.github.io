// Unbloxed mode (fishing-unblocked.html?ubx=1): Roblox-style chat.
// - Chat window at left 12, top 52 (340x180): last 50 lines (name in a per-player color, then the message) and an input bar.
//   "/" or Enter focuses it, Enter sends, Esc leaves. The background fades almost clear when not in use; text keeps a shadow.
// - Bubble chat: white speech bubbles above the speaker's head (up to 3 stacked, fade after ~8 s), for everyone incl. you.
// - FUX.toggleChat(force?) shows/hides the window (menu.js's chat button) and returns true when shown.
// - FUX.sys(text) adds a system line (net.js: "X joined the game.").
// Wraps the global onMsg: 'chat' messages come here instead of the game's feed; everything else calls through.
(function () {
  'use strict';
  if (!window.FUX || !FUX.on) return;
  const W = window;
  const MAXC = 120, MAXL = 50, RATE = 600;           // chars per message, lines kept, ms between your messages
  const BLIFE = 8, BMAX = 3, BGAP = 4, BY = 4.3;      // bubble life (s), stacked bubbles, gap (px), height above the feet
  const warned = {};
  function warn(k, e) { if (!warned[k]) { warned[k] = 1; console.warn('[ubx chat ' + k + ']', e); } }

  // ---------- small helpers (game globals are read by bare name inside try: they are top-level let/const) ----------
  function isStarted() { try { return !!started; } catch (e) { return false; } }
  function myName() { try { return String((S && S.name) || 'You').slice(0, 16); } catch (e) { return 'You'; } } // others see 16 chars (same name color)
  function E(s) {
    try { if (typeof esc === 'function') return esc(s); } catch (e) {}
    return String(s).replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  // drop control + bidi-override characters, collapse whitespace, cap the length
  function clean(t, max) {
    return String(t == null ? '' : t).replace(/[\u0000-\u001f\u007f​-‏‪-‮⁦-⁩﻿]/g, ' ')
      .replace(/\s+/g, ' ').trim().slice(0, max || MAXC);
  }
  function rel() { try { if (typeof releaseAll === 'function') releaseAll(); } catch (e) {} }
  const NCOL = ['#ff6b6b', '#52b1ff', '#45d483', '#c08cff', '#ffa94d', '#ffd84d', '#ff8ccb', '#e2c08d'];
  function nameColor(n) { let h = 0; n = String(n); for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) | 0; h = Math.abs(h); return 'hsl(' + Math.round((h % 997) * 137.508 % 360) + ',' + (68 + h % 3 * 8) + '%,' + (66 + (h >> 3) % 3 * 5) + '%)'; }

  // ---------- font + styles ----------
  try {
    if (false && !document.querySelector('link[href*="Montserrat"]')) {
      const l = document.createElement('link'); l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800&display=swap';
      document.head.appendChild(l);
    }
    if (document.fonts && document.fonts.load) document.fonts.load('600 15px "Source Sans Pro"').catch(() => {});
  } catch (e) { warn('font', e); }

  const st = document.createElement('style');
  st.textContent = [
    '#fuxChat{position:fixed;left:12px;top:56px;width:340px;height:176px;z-index:4;box-sizing:border-box;border-radius:10px;display:none;',
    ' background:rgba(16,18,24,.6);font-family:"Source Sans Pro",system-ui,sans-serif;transition:background-color .3s ease;-webkit-user-select:text;user-select:text}',
    'html.ubx.ubx-nochat #hud{top:56px}',
    '#fuxChat.on{display:block}#fuxChat.covered{visibility:hidden}',
    '#fuxChat.idle{background:rgba(16,18,24,0);transition:background-color 1s ease 2.5s}',
    '#fuxChat.has.idle{background:rgba(12,14,18,.38);transition:background-color .4s ease}',
    '#fuxChatLog{-webkit-mask-image:linear-gradient(transparent 0,rgba(0,0,0,.35) 10px,#000 28px);mask-image:linear-gradient(transparent 0,rgba(0,0,0,.35) 10px,#000 28px)}',
    '#fuxChatLog{position:absolute;left:0;right:0;top:0;bottom:38px;padding:7px 10px 3px;overflow-y:auto;display:flex;flex-direction:column;overflow-x:hidden;box-sizing:border-box;',
    ' color:#fff;font-size:14px;font-weight:600;line-height:1.36;text-shadow:0 1px 2px #000,0 0 2px #000,0 0 1px #000,0 0 6px rgba(0,0,0,.6);',
    ' overflow-wrap:anywhere;word-break:break-word;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.3) transparent}',
    '#fuxChatLog::-webkit-scrollbar{width:6px}#fuxChatLog::-webkit-scrollbar-track{background:transparent}',
    '#fuxChatLog::-webkit-scrollbar-thumb{background:rgba(255,255,255,.3);border-radius:3px}',
    '#fuxChat.idle #fuxChatLog::-webkit-scrollbar-thumb{background:transparent}',
    '#fuxChatLog>div{flex:none;padding:1px 0}#fuxChatLog>div:first-child{margin-top:auto}#fuxChatLog b{font-weight:800}',
    '#fuxChatLog .sys{color:#b9c6d4;font-style:normal;font-weight:600}',
    '#fuxChatBar{position:absolute;left:6px;right:6px;bottom:6px;height:28px;border-radius:7px;background:rgba(0,0,0,.42);',
    ' box-shadow:inset 0 0 0 1px rgba(255,255,255,.14);transition:background-color .3s,box-shadow .3s,opacity .3s}',
    '#fuxChat.idle #fuxChatBar{opacity:0;transition:opacity 1s ease 2.5s}',
    '#fuxChat.typing #fuxChatBar{background:rgba(0,0,0,.6);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.65)}',
    '#fuxChatIn{display:block;width:100%;height:100%;margin:0;border:0;outline:0;background:transparent;box-sizing:border-box;padding:0 10px;',
    ' color:#fff;font:600 13px "Source Sans Pro",system-ui,sans-serif;text-shadow:0 1px 2px rgba(0,0,0,.8)}',
    '#fuxChatIn::placeholder{color:rgba(255,255,255,.78);opacity:1;text-shadow:0 1px 2px rgba(0,0,0,.95)}',
    'html.ubx #chatin{display:none!important}'          // the game's own chat input never shows in Unbloxed mode
  ].join('\n');
  document.head.appendChild(st);

  // ---------- chat window ----------
  const box = document.createElement('div');
  box.id = 'fuxChat';
  box.innerHTML = '<div id="fuxChatLog" role="log" aria-live="polite"></div>' +
    '<div id="fuxChatBar"><input id="fuxChatIn" type="text" maxlength="' + MAXC + '" autocomplete="off" spellcheck="false" ' +
    'placeholder="To chat click here or press / key" aria-label="Chat"></div>';
  document.body.appendChild(box);
  const log = box.querySelector('#fuxChatLog'), inp = box.querySelector('#fuxChatIn');

  let live = false, userHidden = false, hover = false;
  const typing = () => document.activeElement === inp;
  function upd() { const t = typing(); box.classList.toggle('typing', t); box.classList.toggle('idle', !(t || hover)); cover(); }
  // a big game window (shop, book, rods, map...) over the chat window: the chat steps aside until it closes (not while typing)
  function cover() {
    try {
      let c = false;
      if (box.classList.contains('on') && !typing()) {
        const b = box.getBoundingClientRect();
        for (const w of document.querySelectorAll('.win')) {
          if (getComputedStyle(w).display === 'none') continue; const a = w.getBoundingClientRect();
          if (a.width && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) { c = true; break; }
        }
      }
      box.classList.toggle('covered', c);
    } catch (e) {}
  }
  try { const mo = new MutationObserver(cover); document.querySelectorAll('.win').forEach(w => mo.observe(w, { attributes: true, attributeFilter: ['style', 'class'] })); } catch (e) {}
  W.addEventListener('resize', cover);
  function render() {
    const was = box.classList.contains('on'), on = live && !userHidden;
    box.classList.toggle('on', on);
    try { document.documentElement.classList.toggle('ubx-nochat', !on); } catch (e) {}
    if (on && !was) log.scrollTop = log.scrollHeight;     // scroll position is lost while display:none
    if (!on && typing()) inp.blur();
    upd();
    try { const cb = document.getElementById('uxmChatBtn'); if (cb) cb.classList.toggle('on', !userHidden); } catch (e) {} // menu.js's chat button look
  }
  function leave() { inp.blur(); upd(); }               // blur events can be late/missing in a background tab
  function goLive() {
    if (live) return; live = true; render();
    // show the dark background for a few seconds so the chat is noticed, then let it fade
    box.classList.remove('idle'); setTimeout(upd, 3000);
  }
  box.addEventListener('mouseenter', () => { hover = true; upd(); });
  box.addEventListener('mouseleave', () => { hover = false; upd(); });
  function grab() {                                    // starting to type: stop walking/reeling and drop a half-charged cast
    rel();
    try { if (charge) { charge = null; const m = document.getElementById('cmeter'); if (m) m.style.display = 'none'; } } catch (e) {}
  }
  inp.addEventListener('focus', () => { grab(); upd(); });
  inp.addEventListener('blur', upd);
  upd();

  function stuck() { return log.scrollHeight - log.scrollTop - log.clientHeight < 24; }
  function pushLine(html, cls) {
    const at = stuck(), d = document.createElement('div');
    if (cls) d.className = cls;
    d.innerHTML = window.FICON ? FICON.strip(html) : html; log.appendChild(d); box.classList.add('has');
    while (log.children.length > MAXL) log.firstChild.remove();
    if (at) log.scrollTop = log.scrollHeight;
  }
  function chatLine(name, text) { pushLine('<b style="color:' + nameColor(name) + '">' + E(name) + ':</b> ' + E(text)); }

  FUX.toggleChat = function (force) {
    userHidden = force === undefined ? !userHidden : !force;
    render(); return !userHidden;
  };
  FUX.chatShown = () => live && !userHidden;
  FUX.sys = function (text) { try { const t = clean(text, 240); if (t) pushLine(E(t), 'sys'); } catch (e) { warn('sys', e); } };

  function openChat() {
    if (userHidden) { userHidden = false; render(); }
    if (!box.classList.contains('on')) return;
    grab(); inp.focus(); upd();
  }

  // ---------- sending ----------
  let lastSend = -1e9, lastWarn = -1e9;
  function send() {
    const t = clean(inp.value);
    if (!t) { inp.value = ''; leave(); return; }
    const now = performance.now();
    if (now - lastSend < RATE) {                       // too fast: keep the text so Enter can be pressed again
      if (now - lastWarn > 1500) { lastWarn = now; FUX.sys('You are chatting too fast. Wait a moment.'); }
      return;
    }
    lastSend = now;
    try { if (typeof netSend === 'function') netSend('chat', { t }); } catch (e) { warn('send', e); }
    chatLine(myName(), t);
    addBubble('me', t);
    inp.value = ''; leave();
  }

  // ---------- keys (capture phase: runs before the game's own keydown, so its chat input never opens) ----------
  function otherInput() {
    const a = document.activeElement;
    if (!a || a === document.body || a === document.documentElement || a === inp) return false;
    return a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable;
  }
  function npcTalking() { try { return !!(W.FN && typeof W.FN.isOpen === 'function' && W.FN.isOpen()); } catch (e) { return false; } }
  W.addEventListener('keydown', e => {
    try {
      if (typing()) {                                  // typing: nothing reaches the game (no walking/casting/hotkeys)
        e.stopImmediatePropagation(); rel();
        if (e.key === 'Enter') { if (!e.isComposing && e.keyCode !== 229) { e.preventDefault(); if (!e.repeat) send(); } }
        else if (e.key === 'Escape') { e.preventDefault(); leave(); }
        else if (e.key === 'Tab') e.preventDefault();  // stay in the chat bar
        return;
      }
      if (!live || e.ctrlKey || e.metaKey || e.altKey || otherInput()) return;
      if (e.key === 'Enter' && npcTalking()) return;   // Enter belongs to an open NPC dialog (next line / first option); "/" still chats
      if (e.key === 'Enter' || e.key === '/') {
        e.preventDefault(); e.stopImmediatePropagation();
        if (!e.repeat) openChat();                     // holding Enter after sending must not reopen the bar
      }
    } catch (err) { warn('keydown', err); }
  }, true);
  W.addEventListener('keyup', e => { if (typing()) e.stopImmediatePropagation(); }, true);

  // ---------- receiving: wrap the game's onMsg ----------
  const bucket = {};                                   // per-sender flood guard: burst 3, refills 1 per 0.5 s
  function recv(m) {
    const id = String(m.f || ''), d = m.d || {};
    try { if (NET && id === NET.id) return; } catch (e) {}
    const t = clean(d.t); if (!t) return;
    const now = performance.now(), b = bucket[id] || (bucket[id] = { tok: 3, at: now });
    b.tok = Math.min(3, b.tok + (now - b.at) / 500); b.at = now;
    if (b.tok < 1) return;
    b.tok -= 1;
    let r = null; try { r = remotes[id] || null; } catch (e) {}
    chatLine(clean(r && r.name, 20) || 'Player', t);
    if (r) addBubble(id, t);
  }
  (function wrap() {
    const orig = W.onMsg;
    if (typeof orig !== 'function') { warn('wrap', 'onMsg missing'); return; }
    W.onMsg = function (m) {
      if (m && m.t === 'chat') { try { recv(m); } catch (e) { warn('recv', e); } return; }
      return orig.apply(this, arguments);
    };
  })();

  // ---------- bubble chat ----------
  const BUB = {};                                      // id ('me' or peer id) -> {list:[bubble...] (oldest first), tail}
  let clockT = 0, tailTex = null;
  const FS = 15, LH = 19, PADX = 11, PADY = 7, MAXW = 228, SH = 6, TAILW = 18, TAILH = 10;
  const anchor = new THREE.Vector3(), tmp = new THREE.Vector3();
  const FONT = '600 ' + FS + 'px "Source Sans Pro", system-ui, sans-serif';

  function avOf(id) {
    try { if (id === 'me') return me && me.av; const r = remotes[id]; return r && r.av; } catch (e) { return null; }
  }
  function wrapText(x, text, maxW, maxLines) {
    const lines = []; let cur = '';
    const fits = s => x.measureText(s).width <= maxW;
    for (const w0 of text.split(' ')) {
      const test = cur ? cur + ' ' + w0 : w0;
      if (fits(test)) { cur = test; continue; }
      if (cur) lines.push(cur);
      let ch = Array.from(w0);                         // a word longer than a line is split by characters
      while (ch.length && !fits(ch.join(''))) {
        let i = ch.length - 1; while (i > 1 && !fits(ch.slice(0, i).join(''))) i--;
        lines.push(ch.slice(0, i).join('')); ch = ch.slice(i);
      }
      cur = ch.join('');
    }
    if (cur) lines.push(cur);
    if (lines.length > maxLines) {
      lines.length = maxLines; let l = Array.from(lines[maxLines - 1]);
      while (l.length && !fits(l.join('') + '…')) l.pop();
      lines[maxLines - 1] = l.join('') + '…';
    }
    return lines;
  }
  function rrect(x, l, t, w, h, r) {
    x.beginPath(); x.moveTo(l + r, t); x.lineTo(l + w - r, t); x.quadraticCurveTo(l + w, t, l + w, t + r);
    x.lineTo(l + w, t + h - r); x.quadraticCurveTo(l + w, t + h, l + w - r, t + h); x.lineTo(l + r, t + h);
    x.quadraticCurveTo(l, t + h, l, t + h - r); x.lineTo(l, t + r); x.quadraticCurveTo(l, t, l + r, t); x.closePath();
  }
  const BR = Math.min(2, Math.max(1, Math.round(window.devicePixelRatio || 1))); // texels match screen pixels: crisp text, no 3x downsample shimmer
  // ---------- in-world text layer ----------
  // Name tags (net.js), NPC plates (npc.js), catch plates (uihud FLOAT3D) and chat bubbles are drawn onto ONE 2D canvas over the
  // game at devicePixelRatio (max 2), so they stay sharp when the 3D view runs at a lower resolution (Fast mode / auto-res).
  // Their sprites stay in the scene only as data holders: their materials are switched off. Layout runs from a helper sprite's
  // onBeforeRender, so it uses the camera exactly as it is drawn this frame.
  let tailC = null, TX = null, TXX = null, TXD = 1, txW = 0, txH = 0, dirty = null;
  function textLayer() {
    if (TX) return TX;
    try {
      TX = document.createElement('canvas'); TX.id = 'ubxText';
      TX.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:0;pointer-events:none';
      const gc = renderer.domElement; if (gc && gc.parentNode) gc.parentNode.insertBefore(TX, gc.nextSibling); else document.body.appendChild(TX);
      TXX = TX.getContext('2d'); if (!TXX) { TX.remove(); TX = null; return null; }
    } catch (e) { TX = null; warn('layer', e); }
    return TX;
  }
  function sizeLayer(W, H) {
    const d = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    if (W !== txW || H !== txH || d !== TXD) { txW = W; txH = H; TXD = d; TX.width = Math.round(W * d); TX.height = Math.round(H * d); dirty = null; lastHash = -1; }
  }
  function makeTailC() {
    if (tailC) return tailC;
    const R = BR, c = document.createElement('canvas'); c.width = TAILW * R; c.height = (TAILH + 2) * R;
    const x = c.getContext('2d'); x.scale(R, R); x.fillStyle = '#fff';
    x.beginPath(); x.moveTo(0, 0); x.lineTo(TAILW, 0); x.quadraticCurveTo(TAILW * .62, TAILH * .45, TAILW / 2, TAILH + 1.5);
    x.quadraticCurveTo(TAILW * .38, TAILH * .45, 0, 0); x.closePath(); x.fill();
    return (tailC = c);
  }
  // balanced wrap: try narrower widths so the last line is not a lone word
  function wrapBalanced(x, text) {
    let lines = wrapText(x, text, MAXW, 5);
    if (lines.length < 2 || lines.length > 4) return lines;
    const lastW = l => x.measureText(l[l.length - 1]).width, maxW = l => Math.max(...l.map(t => x.measureText(t).width));
    let best = lines;
    for (let w = MAXW - 12; w >= 90; w -= 12) {
      const L = wrapText(x, text, w, 5); if (L.length !== lines.length) break;
      best = L; if (lastW(L) >= maxW(L) * .55) break;
    }
    return best;
  }
  function makeBubble(text) {
    if (window.FICON) text = FICON.strip(text);
    const R = BR;
    const c = document.createElement('canvas'), x = c.getContext('2d');
    x.font = FONT;
    const lines = wrapBalanced(x, text);
    let tw = 0; for (const l of lines) tw = Math.max(tw, x.measureText(l).width);
    const bw = Math.max(46, Math.ceil(tw) + PADX * 2), bh = lines.length * LH + PADY * 2;
    const cw = bw + SH * 2, ch = bh + SH * 2;
    c.width = cw * R; c.height = ch * R;
    x.scale(R, R);
    x.shadowColor = 'rgba(0,0,0,.3)'; x.shadowBlur = 5; x.shadowOffsetY = 1.5;
    x.fillStyle = '#fff'; rrect(x, SH, SH, bw, bh, Math.min(11, bh / 2)); x.fill();
    x.shadowColor = 'transparent';
    x.font = FONT; x.fillStyle = '#1b1f26'; x.textAlign = 'center'; x.textBaseline = 'middle';
    lines.forEach((l, i) => x.fillText(l, SH + bw / 2, SH + PADY + LH * i + LH / 2 + .5));
    return { cv: c, w: cw, h: ch, vis: bh, born: clockT, cur: null, ox: null };
  }
  function kill(b) { b.cv = null; }
  function killAll(id) { delete BUB[id]; }
  function addBubble(id, text) {
    try {
      if (!avOf(id)) return;
      const B = BUB[id] || (BUB[id] = { list: [] });
      B.list.push(makeBubble(text));
      while (B.list.length > BMAX) kill(B.list.shift());
    } catch (e) { warn('bubble', e); }
  }
  FUX.bubble = addBubble;                              // FUX.bubble('me'|peerId, text) for other plug-ins

  const _tp = new THREE.Vector3(), _ws = new THREE.Vector3();
  function scr(v, W, H, o) { _tp.copy(v).project(camera); o = o || {}; o.x = (_tp.x + 1) / 2 * W; o.y = (1 - _tp.y) / 2 * H; o.z = _tp.z; return o; }
  function tagOf(av) {
    let l = av && av.label;
    try { if (av && me && av === me.av && FUX.net && FUX.net.myTag) l = FUX.net.myTag(); } catch (e) {}   // your own tag is not av.label
    return l && l.userData && l.userData.hc && l.userData.cv && l.parent && l.visible !== false ? l : null; }
  const TOPMIN = 64, TAGGAP = 6;
  // 2D panels the bubbles must not hide under: chat log, player list, HUD column; the plate/chips set the top limit.
  // Re-read only when their classes or the window size change (or once a second), and from the game tick, never mid-render.
  let domSig = '', domT = 0, domR = [], domTop = TOPMIN;
  const $id = id => document.getElementById(id);
  function domObstacles(force) {
    const ch = $id('fuxChat'), pl = $id('ubxPlist'), bn = $id('banner'), ec = $id('evChips'), now = performance.now();
    const sig = document.body.className + '|' + (ch ? ch.className : '') + '|' + (pl ? pl.className : '') + '|' + (bn ? bn.className + bn.childElementCount : '') + '|' + (ec ? ec.childElementCount : '') + '|' + innerWidth + 'x' + innerHeight;
    if (!force && sig === domSig && now - domT < 1000) return;
    domSig = sig; domT = now; domR = []; domTop = TOPMIN;
    try {
      const cover = document.body.classList.contains('st-cover');
      const add = e => { if (!e || !e.offsetWidth) return; const b = e.getBoundingClientRect(); if (b.width && b.height) domR.push({ l: b.left, r: b.right, t: b.top, b: b.bottom, tag: 'dom' }); };
      if (ch && ch.classList.contains('on') && ch.classList.contains('has') && !ch.classList.contains('covered')) add(ch);
      if (pl && pl.classList.contains('show')) add(pl);
      add($id('hud'));
      if (!cover) for (const e of [bn, ec]) { if (!e || !e.childElementCount || !e.offsetWidth) continue; if (e === bn && !e.classList.contains('on')) continue; const b = e.getBoundingClientRect(); if (b.height) domTop = Math.max(domTop, b.bottom + 10); }
    } catch (e) {}
  }
  let pendDt = 0, hookSpr = null;
  function tickBubbles(dt) {
    clockT += dt; pendDt += dt;
    for (const id in BUB) { const B = BUB[id], av = avOf(id);
      while (B.list.length && clockT - B.list[0].born > BLIFE) kill(B.list.shift());
      if (!B.list.length || !av || !av.g || !av.g.parent) killAll(id); }
    if (!hookSpr) { try {
      hookSpr = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
      hookSpr.renderOrder = 19; hookSpr.frustumCulled = false; hookSpr.scale.set(1e-4, 1e-4, 1);
      hookSpr.onBeforeRender = (r, sc, cam) => { if (cam === camera) { try { layoutBubbles(); } catch (e) { warn('layout', e); } } };
      scene.add(hookSpr); } catch (e) { warn('hook', e); } }
    if (hookSpr && hookSpr.parent !== scene) scene.add(hookSpr);
    if (hookSpr) hookSpr.position.copy(camera.position);
    if (TX) domObstacles(false);
  }
  const hit = (a, b) => a.l < b.r + 4 && b.l < a.r + 4 && a.t < b.b + 4 && b.t < a.b + 4;
  let tidN = 0, lastHash = -1, lastW = 0;
  FUX.textLayer = { redraw() { lastHash = -1; }, canvas: () => TX };   // for tests and other plug-ins
  const D = [];                                        // this frame's draw list: [canvas, x, y, w, h, alpha]
  function layoutBubbles() {   // lays out and draws ALL in-world text (name kept for the perf harness)
    const dt = Math.min(.1, pendDt); pendDt = 0;
    if (!textLayer()) return;
    const W = (renderer.domElement && renderer.domElement.clientWidth) || innerWidth || 1000;
    const H = (renderer.domElement && renderer.domElement.clientHeight) || innerHeight || 700;
    sizeLayer(W, H);
    D.length = 0;
    const e5 = camera.projectionMatrix.elements[5] || 1.7;
    const placed = [], P = {};
    // 1. NPC plates (world-sized, so they shrink with distance); they are obstacles for tags and bubbles
    try { for (const n of (window.FN && FN.list) || []) { const l = n.g && n.g.userData && n.g.userData.label; if (!l) continue;
      if (l.material.visible) l.material.visible = false;
      if (!l.visible || !n.g.visible || !n.g.parent || !(l.material.map && l.material.map.image)) continue;
      const me_ = l.matrixWorld.elements; anchor.set(me_[12], me_[13], me_[14]); tmp.copy(anchor).applyMatrix4(camera.matrixWorldInverse); const dz = -tmp.z; if (dz < .5 || dz > 120) continue;
      const sx = Math.hypot(me_[0], me_[1], me_[2]), sy = Math.hypot(me_[4], me_[5], me_[6]); const ph = sy * e5 * H / 2 / dz, pw = sx * e5 * H / 2 / dz; if (ph < 4) continue;
      scr(anchor, W, H, P); if (P.x < -pw || P.x > W + pw || P.y < -ph || P.y > H + ph) continue;
      const R = { l: P.x - pw / 2, r: P.x + pw / 2, t: P.y - ph / 2, b: P.y + ph / 2, tag: 'npc' }; placed.push(R);
      D.push([l.material.map.image, R.l, R.t, pw, ph, l.material.opacity == null ? 1 : l.material.opacity, dz]); } } catch (e) {}
    // 2. name tags, nearest first: a farther tag that hits a nearer tag or an NPC plate moves up (at most its height), else fades to .35
    const TG = [];
    try { const add = (id, av) => { const tg = tagOf(av); if (!tg || !av.g || av.g.visible === false) return;
        if (tg.material.visible) tg.material.visible = false;
        const a = tg.material.opacity == null ? 1 : tg.material.opacity; if (a < .02) return;
        anchor.setFromMatrixPosition(tg.matrixWorld); tmp.copy(anchor).applyMatrix4(camera.matrixWorldInverse); const dz = -tmp.z; if (dz < .3) return;
        const Q = scr(anchor, W, H, {}); const u = tg.userData; TG.push({ id, av, tg, u, x: Q.x, y: Q.y, dz, a, ty: 0 }); };
      add('me', avOf('me')); for (const id in remotes) add(id, avOf(id)); } catch (e) {}
    TG.sort((a, b) => a.dz - b.dz);
    const TAG = {};
    for (const T of TG) { const u = T.u; let R = { l: T.x - u.wc / 2, r: T.x + u.wc / 2, t: T.y - u.hc, b: T.y, tag: T.id };
      let o = placed.find(q => hit(R, q));
      if (o) { const need = Math.min(u.hc, R.b - o.t + 2); T.ty = need; R = { l: R.l, r: R.r, t: R.t - need, b: R.b - need, tag: T.id };
        if (placed.some(q => hit(R, q))) { T.ty = 0; R = { l: T.x - u.wc / 2, r: T.x + u.wc / 2, t: T.y - u.hc, b: T.y, tag: T.id }; T.a *= .35; } }
      placed.push(R); TAG[T.id] = T; T.R = R;
      D.push([u.cv, R.l, R.t, u.wc, u.hc, T.a, T.dz]); }
    // 3. another player's catch plate sits on its owner's tag and climbs past other tags; that player's bubbles go above it
    for (const T of TG) { const fs = T.av._float; if (!fs || !fs.parent || !fs.userData || !fs.userData.cv) { T.fh = 0; continue; }
      if (fs.material.visible) fs.material.visible = false;
      const u = fs.userData, an = u.h0 ? fs.scale.y / u.h0 : 1, w = u.wc * u.sc * an, h = u.hc * u.sc * an;
      let R = { l: T.x - w / 2, r: T.x + w / 2, t: T.R.t - 5 - h, b: T.R.t - 5, tag: 'f' + T.id };
      for (let it = 0; it < 6; it++) { const o = placed.find(q => q.tag !== T.id && hit(R, q)); if (!o) break; const need = R.b - o.t + 4; R = { l: R.l, r: R.r, t: R.t - need, b: R.b - need, tag: R.tag }; }
      T.fh = T.R.t - R.t; T.av._floatH = T.fh; placed.push(R);
      D.push([u.cv, R.l, R.t, w, h, fs.material.opacity == null ? 1 : fs.material.opacity, T.dz - .01]); }
    // 4. chat bubbles: stacks sit just above their speaker's tag (or catch plate); nearest speaker keeps its place, later stacks
    // collapse to their newest bubble when they collide, then look for the cheapest free spot (up, or sideways), else wait hidden
    const ST = [];
    for (const id in BUB) { const B = BUB[id], av = avOf(id); if (!B.list.length || !av || !av.g || !av.g.parent || av.g.visible === false) continue;
      const T = TAG[id]; let px, py, dz;
      if (T) { px = T.x; py = T.R.t - (T.fh || 0) - TAGGAP; dz = T.dz; }
      else { anchor.copy(av.g.position); anchor.y += BY * (av.g.scale.y || 1); tmp.copy(anchor).applyMatrix4(camera.matrixWorldInverse); dz = -tmp.z; if (dz < .3) continue; const Q = scr(anchor, W, H, {}); px = Q.x; py = Q.y; }
      if (dz > 95) continue;
      const f = dz > 26 ? Math.max(.55, 1 - (dz - 26) / 70) : 1;
      ST.push({ id, B, px, py, dz, f, newestOnly: false, dx: 0, up: 0, hide: false }); }
    if (ST.length) {
      const TOPM = domTop; for (const q of domR) placed.push(q);
      const rectOf = S0 => { const L = S0.B.list, n = L.length; let h = TAILH, w = 0;
        for (let i = n - 1; i >= 0; i--) { if (S0.newestOnly && i < n - 1) break; h += L[i].vis + BGAP; w = Math.max(w, L[i].w - SH * 2); }
        h *= S0.f; w *= S0.f; const bot = S0.py - S0.up; return { l: S0.px + S0.dx - w / 2, r: S0.px + S0.dx + w / 2, t: bot - h, b: bot }; };
      ST.sort((a, b) => a.dz - b.dz);
      for (const S0 of ST) {
        const others = placed.filter(r => r.tag !== S0.id);
        let R = rectOf(S0);
        if (R.t >= TOPM && R.l >= 8 && R.r <= W - 8 && !others.some(r => hit(R, r))) { placed.push(R); continue; }   // the first spot is free
        if (others.some(r => !r.tag && hit(R, r))) S0.newestOnly = true;
        const search = () => {
          let best = null; S0.dx = 0; S0.up = 0; const R0 = rectOf(S0); if (R0.t < TOPM) S0.up -= TOPM - R0.t;
          const up0 = S0.up;
          for (let j = 0; j <= 18; j++) {
            const dx = j === 0 ? 0 : (j % 2 ? 1 : -1) * Math.ceil(j / 2) * 40;
            S0.dx = dx; S0.up = up0; let Rc = rectOf(S0), ok = true;
            if (Rc.l < 8 || Rc.r > W - 8) continue;
            for (let it = 0; it < 10; it++) { const o = others.find(r => hit(Rc, r)); if (!o) break; S0.up += Rc.b - o.t + BGAP; Rc = rectOf(S0); if (Rc.t < TOPM) { ok = false; break; } }
            if (ok) { const cost = Math.abs(dx) * 1.2 + (S0.up - up0); if (!best || cost < best.cost) best = { cost, dx, up: S0.up, R: Rc }; if (S0.up === up0) break; }
          }
          S0.dx = 0; S0.up = up0; return best;
        };
        let best = search();
        if (!best && !S0.newestOnly && S0.B.list.length > 1) { S0.newestOnly = true; best = search(); }
        if (best) { S0.dx = best.dx; S0.up = best.up; placed.push(best.R); } else S0.hide = true;
      }
      // bubble positions ease toward their targets (screen px), then go into the draw list
      for (const S0 of ST) {
        const B = S0.B, f = S0.f; let off = S0.up / f + TAILH, a0 = 0, nb = null;
        for (let i = B.list.length - 1; i >= 0; i--) {     // newest (bottom) first
          const b = B.list[i], age = clockT - b.born, newest = i === B.list.length - 1;
          let a = Math.max(0, Math.min(1, age / .15, BLIFE - age));
          if ((S0.newestOnly && !newest) || S0.hide) a = 0;
          const pop = newest ? .7 + .3 * (1 - Math.pow(1 - Math.min(1, age / .18), 3)) : 1;
          if (b.cur === null) b.cur = off;
          b.cur += (off - b.cur) * Math.min(1, dt * 14);
          b.ox = (b.ox == null ? S0.dx : b.ox + (S0.dx - b.ox) * Math.min(1, dt * 14));
          const w = b.w * f * pop, h = b.h * f * pop, bot = S0.py - (b.cur - SH) * f * pop;
          if (a > .01) D.push([b.cv, S0.px + b.ox - w / 2, bot - h, w, h, a, S0.dz - .02]);
          if (newest) { a0 = a; nb = b; }
          if (!(S0.newestOnly && !newest)) off += b.vis + BGAP;
        }
        if (nb && a0 > .01) { const tw = TAILW * f, th = (TAILH + 2) * f, bot = S0.py - (nb.cur - TAILH) * f; D.push([makeTailC(), S0.px + nb.ox - tw / 2, bot - th, tw, th, a0, S0.dz - .021]); }
      }
    }
    // 5. draw: farther first; clear only what was drawn last frame
    const X = TXX, d = TXD;
    let hs = D.length * 7919;
    for (let i = 0; i < D.length; i++) { const q = D[i], c = q[0]; if (!c.__tid) c.__tid = ++tidN;
      hs = (hs * 31 + c.__tid * 131 + Math.round(q[1] * 2) * 7 + Math.round(q[2] * 2) * 13 + Math.round(q[3] * 2) + Math.round(q[5] * 64) * 17) % 2147483647; }
    if (hs === lastHash && TX.width === lastW) return; lastHash = hs; lastW = TX.width;
    if (dirty) { for (let i = 0; i < dirty.length; i += 4) X.clearRect(dirty[i] - 2, dirty[i + 1] - 2, dirty[i + 2] + 4, dirty[i + 3] + 4); dirty = null; }   // only last frame's own rects
    if (!D.length) return;
    D.sort((a, b) => b[6] - a[6]);
    X.setTransform(1, 0, 0, 1, 0, 0); X.imageSmoothingEnabled = true;   // drawn in device pixels
    const dr = [];
    for (const q of D) { if (q[1] > W || q[2] > H || q[1] + q[3] < 0 || q[2] + q[4] < 0) continue;
      X.globalAlpha = Math.max(0, Math.min(1, q[5]));
      const cw = q[0].width, chh = q[0].height, dw = q[3] * d, dh = q[4] * d, ix = Math.round(q[1] * d), iy = Math.round(q[2] * d);
      const one = Math.abs(dw - cw) < .75 && Math.abs(dh - chh) < .75, rw = one ? cw : Math.round(dw), rh = one ? chh : Math.round(dh);
      if (one) X.drawImage(q[0], ix, iy); else X.drawImage(q[0], ix, iy, rw, rh);   // 1:1 blit on whole pixels: sharp and cheap
      dr.push(ix, iy, rw, rh); }
    X.globalAlpha = 1;
    if (dr.length) dirty = dr;
  }

  FUX.add('onStart', goLive);
  FUX.add('tick', dt => {
    if (!live && isStarted()) goLive();
    tickBubbles(dt || 0);
  });
})();
