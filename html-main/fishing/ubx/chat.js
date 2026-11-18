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
  function nameColor(n) { let h = 0; n = String(n); for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) | 0; return NCOL[Math.abs(h) % NCOL.length]; }

  // ---------- font + styles ----------
  try {
    if (!document.querySelector('link[href*="Montserrat"]')) {
      const l = document.createElement('link'); l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800&display=swap';
      document.head.appendChild(l);
    }
    if (document.fonts && document.fonts.load) document.fonts.load('600 15px Montserrat').catch(() => {});
  } catch (e) { warn('font', e); }

  const st = document.createElement('style');
  st.textContent = [
    '#fuxChat{position:fixed;left:12px;top:52px;width:340px;height:180px;z-index:4;box-sizing:border-box;border-radius:10px;display:none;',
    ' background:rgba(16,18,24,.6);font-family:Montserrat,system-ui,sans-serif;transition:background-color .3s ease;-webkit-user-select:text;user-select:text}',
    '#fuxChat.on{display:block}',
    '#fuxChat.idle{background:rgba(16,18,24,.07);transition:background-color 1s ease 2.5s}',
    '#fuxChatLog{position:absolute;left:0;right:0;top:0;bottom:38px;padding:7px 10px 3px;overflow-y:auto;overflow-x:hidden;box-sizing:border-box;',
    ' color:#fff;font-size:14px;font-weight:600;line-height:1.36;text-shadow:0 1px 2px rgba(0,0,0,.95),0 0 4px rgba(0,0,0,.6);',
    ' overflow-wrap:anywhere;word-break:break-word;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.3) transparent}',
    '#fuxChatLog::-webkit-scrollbar{width:6px}#fuxChatLog::-webkit-scrollbar-track{background:transparent}',
    '#fuxChatLog::-webkit-scrollbar-thumb{background:rgba(255,255,255,.3);border-radius:3px}',
    '#fuxChat.idle #fuxChatLog::-webkit-scrollbar-thumb{background:transparent}',
    '#fuxChatLog>div{padding:1px 0}#fuxChatLog b{font-weight:800}',
    '#fuxChatLog .sys{color:#efe5a8}',
    '#fuxChatBar{position:absolute;left:6px;right:6px;bottom:6px;height:28px;border-radius:7px;background:rgba(0,0,0,.42);',
    ' box-shadow:inset 0 0 0 1px rgba(255,255,255,.14);transition:background-color .3s,box-shadow .3s,opacity .3s}',
    '#fuxChat.idle #fuxChatBar{background:rgba(0,0,0,.22);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);',
    ' transition:background-color 1s ease 2.5s,box-shadow 1s ease 2.5s}',
    '#fuxChat.typing #fuxChatBar{background:rgba(0,0,0,.6);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.65)}',
    '#fuxChatIn{display:block;width:100%;height:100%;margin:0;border:0;outline:0;background:transparent;box-sizing:border-box;padding:0 10px;',
    ' color:#fff;font:600 13px Montserrat,system-ui,sans-serif;text-shadow:0 1px 2px rgba(0,0,0,.8)}',
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
  function upd() { const t = typing(); box.classList.toggle('typing', t); box.classList.toggle('idle', !(t || hover)); }
  function render() {
    const was = box.classList.contains('on'), on = live && !userHidden;
    box.classList.toggle('on', on);
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
    d.innerHTML = html; log.appendChild(d);
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
  const FONT = '600 ' + FS + 'px Montserrat, system-ui, sans-serif';

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
  function texOf(c) {
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding; t.isLabel = true; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter;
    return t;
  }
  function spriteOf(tex, order) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, sizeAttenuation: false }));
    s.renderOrder = order; s.frustumCulled = false; s.center.set(.5, 0); s.visible = false;
    return s;
  }
  function makeTail() {
    if (!tailTex) {
      const R = 3, c = document.createElement('canvas'); c.width = TAILW * R; c.height = (TAILH + 2) * R;
      const x = c.getContext('2d'); x.scale(R, R); x.fillStyle = '#fff';
      x.beginPath(); x.moveTo(0, 0); x.lineTo(TAILW, 0); x.quadraticCurveTo(TAILW * .62, TAILH * .45, TAILW / 2, TAILH + 1.5);
      x.quadraticCurveTo(TAILW * .38, TAILH * .45, 0, 0); x.closePath(); x.fill();
      tailTex = texOf(c);
    }
    const s = spriteOf(tailTex, 20); scene.add(s); return s;   // same order as bubbles: nearer speakers draw on top
  }
  function makeBubble(text) {
    const R = Math.min(3, Math.max(2, Math.ceil(W.devicePixelRatio || 1)));
    const c = document.createElement('canvas'), x = c.getContext('2d');
    x.font = FONT;
    const lines = wrapText(x, text, MAXW, 5);
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
    const spr = spriteOf(texOf(c), 20); scene.add(spr);
    return { spr, w: cw, h: ch, vis: bh, born: clockT, cur: null };
  }
  function kill(b) { try { scene.remove(b.spr); b.spr.material.map.dispose(); b.spr.material.dispose(); } catch (e) {} }
  function killAll(id) {
    const B = BUB[id]; if (!B) return;
    B.list.forEach(kill);
    try { scene.remove(B.tail); B.tail.material.dispose(); } catch (e) {}
    delete BUB[id];
  }
  function addBubble(id, text) {
    try {
      if (!avOf(id)) return;
      const B = BUB[id] || (BUB[id] = { list: [], tail: makeTail() });
      B.list.push(makeBubble(text));
      while (B.list.length > BMAX) kill(B.list.shift());
    } catch (e) { warn('bubble', e); }
  }
  FUX.bubble = addBubble;                              // FUX.bubble('me'|peerId, text) for other plug-ins

  function tickBubbles(dt) {
    clockT += dt;
    let k = 0;
    for (const id in BUB) {
      const B = BUB[id], av = avOf(id);
      while (B.list.length && clockT - B.list[0].born > BLIFE) kill(B.list.shift());
      if (!B.list.length || !av || !av.g || !av.g.parent) { killAll(id); continue; }
      if (!k) {                                        // world size of 1 CSS px at depth 1 (sizeAttenuation:false sprites)
        camera.updateMatrixWorld();
        const vh = (renderer.domElement && renderer.domElement.clientHeight) || innerHeight || 700;
        k = 2 * Math.tan(camera.fov * Math.PI / 360) / Math.max(200, vh);
      }
      anchor.copy(av.g.position); anchor.y += BY * (av.g.scale.y || 1);
      tmp.copy(anchor).applyMatrix4(camera.matrixWorldInverse);
      const dist = -tmp.z, show = av.g.visible !== false && dist > .3 && dist < 95;
      const f = dist > 26 ? Math.max(.55, 1 - (dist - 26) / 70) : 1;   // far players' bubbles shrink a little
      let off = TAILH, a0 = 0;                          // newest bubble sits on the tail (2 px overlap, both white)
      for (let i = B.list.length - 1; i >= 0; i--) {     // newest (bottom) first
        const b = B.list[i], age = clockT - b.born, newest = i === B.list.length - 1;
        const a = Math.max(0, Math.min(1, age / .15, BLIFE - age));
        const pop = newest ? .7 + .3 * (1 - Math.pow(1 - Math.min(1, age / .18), 3)) : 1;
        if (b.cur === null) b.cur = off;
        b.cur += (off - b.cur) * Math.min(1, dt * 14);  // older bubbles slide up smoothly
        b.spr.position.copy(anchor);
        b.spr.center.set(.5, (SH - b.cur) / b.h);
        b.spr.scale.set(b.w * k * f * pop, b.h * k * f * pop, 1);
        b.spr.material.opacity = a;
        b.spr.visible = show && a > .01;
        if (newest) a0 = a;
        off += b.vis + BGAP;
      }
      const t = B.tail;
      t.position.copy(anchor); t.center.set(.5, 0);
      t.scale.set(TAILW * k * f, (TAILH + 2) * k * f, 1);
      t.material.opacity = a0; t.visible = show && a0 > .01;
    }
  }

  FUX.add('onStart', goLive);
  FUX.add('tick', dt => {
    if (!live && isStarted()) goLive();
    tickBubbles(dt || 0);
  });
})();
