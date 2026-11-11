// Farming Unblocked — audio: fully procedural WebAudio. The AudioContext is created only after the first
// user gesture AND only while G.settings.volume > 0 (never with ?mute). Engine drone for the active
// vehicle, working rumble for lowered tools / a working combine, and one-shot UI/game sounds.
(function () {
  'use strict';
  var FU = window.FU = window.FU || {};

  var ctx = null, broken = false, gestured = false;
  var master = null, sfx = null, noiseBuf = null;
  var pF1, pF2, pCut, pEAmp, pELfo, pWAmp, pWCut, pWQ, pWLfo, wFilt; // cached param wrappers
  var lastActive = null, workKindNow = null, zeroSince = 0;
  var lastPlay = {}, lastPriority = 0, pendingNotify = null;
  var attachMap = {}, attachResync = true;
  var PRIORITY = { buy: 1, sell: 1, error: 1 };

  function nowMs() { return (window.performance && performance.now) ? performance.now() : Date.now(); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // 0..1 volume (accepts 0..1 or 0..100 settings); 0 when muted / missing
  function vol() {
    var G = FU.G;
    if (!G || !G.settings || G.muted) return 0;
    var v = +G.settings.volume;
    if (!(v > 0)) return 0;
    if (v > 1) v = v / 100;
    return v > 1 ? 1 : v;
  }

  function wrap(param) { return { p: param, t: param.value }; }
  function to(w, v, tau) {
    if (!ctx || !w) return;
    if (Math.abs(w.t - v) <= Math.abs(v) * 0.004 + 1e-4) return;
    w.t = v;
    try { w.p.setTargetAtTime(v, ctx.currentTime, tau); } catch (e) {}
  }
  function snap(w, v) {
    if (!ctx || !w) return;
    w.t = v;
    try { w.p.cancelScheduledValues(ctx.currentTime); w.p.setValueAtTime(v, ctx.currentTime); } catch (e) {}
  }
  function quietResume() {
    if (!ctx || ctx.state === 'running' || document.hidden) return;
    try { var p = ctx.resume(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
  }
  function quietSuspend() {
    if (!ctx || ctx.state !== 'running') return;
    try { var p = ctx.suspend(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
  }

  function osc(type, f) { var o = ctx.createOscillator(); o.type = type; o.frequency.value = f; return o; }
  function gain(v) { var g = ctx.createGain(); g.gain.value = v; return g; }

  // ---------- lazy context + static graph ----------
  function ensureCtx() {
    if (ctx) return ctx;
    if (broken || !gestured || vol() <= 0) return null;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { broken = true; return null; }
    try { ctx = new AC(); } catch (e) { broken = true; ctx = null; return null; }
    try {
      master = gain(0); master.connect(ctx.destination);
      sfx = gain(1); sfx.connect(master);

      // shared white-noise buffer (2 s)
      var n = Math.floor(ctx.sampleRate * 2);
      noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;

      // engine: two detuned low oscillators -> lowpass -> chug (LFO) -> amp
      var o1 = osc('sawtooth', 44), o2 = osc('square', 44);
      o1.detune.value = -6; o2.detune.value = 14;
      var o2g = gain(0.45); o2.connect(o2g);
      var ef = ctx.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 300; ef.Q.value = 0.9;
      o1.connect(ef); o2g.connect(ef);
      var chug = gain(1), lfo = osc('sine', 11), lfoG = gain(0.28);
      lfo.connect(lfoG); lfoG.connect(chug.gain);
      var eAmp = gain(0);
      ef.connect(chug); chug.connect(eAmp); eAmp.connect(master);
      o1.start(); o2.start(); lfo.start();
      pF1 = wrap(o1.frequency); pF2 = wrap(o2.frequency); pCut = wrap(ef.frequency);
      pEAmp = wrap(eAmp.gain); pELfo = wrap(lfo.frequency);

      // working rumble: looped noise -> filter -> clatter (LFO) -> amp
      var src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
      wFilt = ctx.createBiquadFilter(); wFilt.type = 'lowpass'; wFilt.frequency.value = 450; wFilt.Q.value = 0.8;
      var wChug = gain(1), wl = osc('sine', 8), wlG = gain(0.3);
      wl.connect(wlG); wlG.connect(wChug.gain);
      var wAmp = gain(0);
      src.connect(wFilt); wFilt.connect(wChug); wChug.connect(wAmp); wAmp.connect(master);
      src.start(); wl.start();
      pWAmp = wrap(wAmp.gain); pWCut = wrap(wFilt.frequency); pWQ = wrap(wFilt.Q); pWLfo = wrap(wl.frequency);
      lastActive = null; workKindNow = null;
    } catch (e) {
      console.error('[FU] audio setup failed', e);
      try { ctx.close(); } catch (e2) {}
      ctx = null; broken = true; return null;
    }
    masterW = wrap(master.gain);
    to(masterW, vol() * 0.5, 0.05);
    return ctx;
  }
  var masterW = null;

  // ---------- one-shot building blocks ----------
  function tone(type, f0, f1, t0, dur, peak) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + Math.min(0.012, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(sfx);
    o.onended = function () { try { g.disconnect(); } catch (e) {} };
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function burst(t0, dur, peak, ftype, freq, q) {
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf;
    f.type = ftype; f.frequency.value = freq; f.Q.value = q || 1;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(sfx);
    s.onended = function () { try { f.disconnect(); g.disconnect(); } catch (e) {} };
    s.start(t0, Math.random() * 1.5, dur + 0.05);
  }

  var SFX = {
    click: function (t) { tone('triangle', 1400, 900, t, 0.05, 0.10); },
    notify: function (t) {
      tone('sine', 740, 740, t, 0.16, 0.10);
      tone('sine', 988, 988, t + 0.09, 0.24, 0.09);
    },
    buy: function (t) {
      tone('triangle', 784, 784, t, 0.12, 0.12);
      tone('triangle', 1047, 1047, t + 0.08, 0.14, 0.12);
      tone('triangle', 1568, 1568, t + 0.16, 0.32, 0.10);
    },
    sell: function (t) { // "ka-ching": drawer clack + bell
      burst(t, 0.05, 0.10, 'highpass', 3000, 0.7);
      tone('sine', 1318, 1318, t + 0.05, 0.55, 0.11);
      tone('sine', 1976, 1976, t + 0.05, 0.45, 0.06);
      tone('triangle', 2637, 2637, t + 0.05, 0.25, 0.03);
    },
    attach: function (t) { // hitch clunk: low thump + metal clank
      tone('sine', 150, 55, t, 0.16, 0.22);
      burst(t, 0.08, 0.09, 'bandpass', 2400, 3);
      tone('triangle', 620, 540, t + 0.01, 0.09, 0.04);
    },
    // guns (k = 0..1 loudness for distant shots)
    shot: function (t, k) { k = k == null ? 1 : k; burst(t, 0.16, 0.32 * k, 'lowpass', 1900, 0.7); burst(t, 0.05, 0.22 * k, 'highpass', 2600, 0.8); tone('sine', 130, 48, t, 0.18, 0.2 * k); },
    shotgun: function (t, k) { k = k == null ? 1 : k; burst(t, 0.32, 0.38 * k, 'lowpass', 1300, 0.6); burst(t, 0.07, 0.22 * k, 'highpass', 2000, 0.7); tone('sine', 95, 36, t, 0.3, 0.26 * k); },
    rifle: function (t, k) { k = k == null ? 1 : k; burst(t, 0.42, 0.36 * k, 'lowpass', 2600, 0.6); burst(t, 0.05, 0.26 * k, 'highpass', 3600, 0.9); tone('sine', 160, 40, t, 0.3, 0.22 * k); },
    hit: function (t) { tone('square', 1900, 1600, t, 0.05, 0.05); },
    hurt: function (t) { tone('sawtooth', 240, 120, t, 0.16, 0.09); },
    reload: function (t) { burst(t, 0.04, 0.1, 'bandpass', 3000, 4); burst(t + 0.28, 0.05, 0.12, 'bandpass', 2200, 4); tone('triangle', 900, 700, t + 0.55, 0.06, 0.05); },
    empty: function (t) { tone('square', 1250, 1150, t, 0.03, 0.04); },
    ko: function (t) { tone('triangle', 440, 110, t, 0.7, 0.12); tone('sine', 220, 70, t + 0.1, 0.7, 0.08); },
    error: function (t) {
      tone('triangle', 233, 220, t, 0.13, 0.13);
      tone('triangle', 175, 165, t + 0.14, 0.22, 0.13);
      tone('sine', 88, 82, t, 0.3, 0.06);
    }
  };

  function play(name, k) {
    if (vol() <= 0) return false;
    var fn = SFX[name];
    if (!fn || !ensureCtx()) return false;
    var now = nowMs();
    if (lastPlay[name] && now - lastPlay[name] < 120) return false;
    lastPlay[name] = now;
    if (PRIORITY[name]) lastPriority = now;
    quietResume();
    try { fn(ctx.currentTime + 0.01, k); } catch (e) { return false; }
    return true;
  }

  // ---------- helpers on game state ----------
  function isCombine(v) { return !!v && ((v.def && v.def.kind === 'combine') || /combine/.test(v.type || '')); }
  function throttleOf(v, G) {
    var t = typeof v.throttle === 'number' ? Math.abs(v.throttle) : 0;
    if (G.input && !G.input.blocked) {
      if (G.input.down('KeyW') || G.input.down('ArrowUp')) t = Math.max(t, 1);
      else if ((G.input.down('KeyS') || G.input.down('ArrowDown')) && (v.speed || 0) < 0.5) t = Math.max(t, 0.7);
    }
    return clamp(t, 0, 1);
  }
  // 'combine' | 'cultivator' | 'seeder' | 'tool' | null
  function workKind(v) {
    if (!v) return null;
    if (isCombine(v)) return v.working ? 'combine' : null;
    var imps = FU.implements && FU.implements.list;
    if (!imps) return null;
    for (var i = 0; i < imps.length; i++) {
      var im = imps[i];
      if (!im || !im.lowered) continue;
      if (im.attachedTo !== v.id && im.attachedTo !== v) continue;
      var k = im.def && im.def.kind;
      if (k === 'trailer') continue;
      return k === 'seeder' ? 'seeder' : k === 'cultivator' ? 'cultivator' : 'tool';
    }
    return null;
  }
  function pollAttach() {
    var imps = FU.implements && FU.implements.list;
    if (!imps) return;
    if (attachResync) attachMap = {};
    var changed = false;
    for (var i = 0; i < imps.length; i++) {
      var im = imps[i];
      if (!im || im.id == null) continue;
      var a = im.attachedTo;
      if (a && typeof a === 'object') a = a.id;
      if (a == null) a = null;
      var prev = attachMap[im.id];
      if (prev === undefined) { attachMap[im.id] = a; continue; }
      if (prev !== a) { attachMap[im.id] = a; changed = true; }
    }
    if (changed && !attachResync) play('attach');
    attachResync = false;
  }

  // ---------- per-frame sound state ----------
  function updateEngine(G) {
    var av = G.activeVehicle || null;
    if (av !== lastActive) {
      lastActive = av;
      if (av) { var idle = isCombine(av) ? 35 : 44; snap(pF1, idle * 0.6); snap(pF2, idle * 0.6); }
    }
    var audible = av && G.started && !G.paused && !document.hidden;
    if (!audible) { to(pEAmp, 0, 0.25); to(pWAmp, 0, 0.2); return; }

    var comb = isCombine(av), def = av.def || {};
    var maxS = def.maxSpeed || (comb ? 7 : 11);
    var sp = av.speed || 0, sf = clamp(Math.abs(sp) / maxS, 0, 1.2);
    var wk = sp > 0.3 ? workKind(av) : null;
    var load = clamp(0.62 * sf + 0.4 * throttleOf(av, G) + (wk ? 0.12 : 0), 0, 1);
    var lo = comb ? 35 : 44, hi = comb ? 88 : 110, f = lo + (hi - lo) * load;
    to(pF1, f, 0.12); to(pF2, f, 0.12); to(pELfo, f * 0.25, 0.2);
    to(pCut, comb ? 160 + 650 * load : 210 + 950 * load, 0.12);
    to(pEAmp, (comb ? 0.16 : 0.13) + 0.11 * load, 0.15);

    if (wk) {
      var ws = def.workSpeed || 4.5, fr = clamp(sp / ws, 0, 1.3);
      if (wk !== workKindNow) {
        workKindNow = wk;
        try { wFilt.type = (wk === 'cultivator' || wk === 'tool') ? 'lowpass' : 'bandpass'; } catch (e) {}
      }
      var cut, g, q;
      if (wk === 'combine') { cut = 700 + 300 * fr; g = 0.10 + 0.07 * fr; q = 0.7; }
      else if (wk === 'seeder') { cut = 1300 + 400 * fr; g = 0.05 + 0.05 * fr; q = 0.8; }
      else { cut = 320 + 300 * fr; g = 0.10 + 0.09 * fr; q = 0.9; }
      to(pWCut, cut, 0.15); to(pWQ, q, 0.15); to(pWLfo, 6 + 8 * fr, 0.2);
      to(pWAmp, g, 0.15);
    } else to(pWAmp, 0, 0.2);
  }

  function onGesture() {
    gestured = true;
    if (vol() <= 0) return;
    if (ensureCtx()) quietResume();
  }
  function resync() { attachResync = true; pendingNotify = null; lastActive = null; }

  FU.audio = {
    play: play,
    unlock: onGesture,                       // call from a user-gesture handler if you like
    isActive: function () { return !!ctx && ctx.state === 'running' && vol() > 0; },
    sounds: Object.keys(SFX)
  };

  FU.register({
    name: 'audio', order: 85, ui: true,
    init: function (G) {
      ['pointerdown', 'mousedown', 'keydown', 'touchstart', 'touchend', 'click'].forEach(function (ev) {
        window.addEventListener(ev, onGesture, { capture: true, passive: true });
      });
      document.addEventListener('click', function (e) {
        var t = e.target;
        if (t && t.closest && t.closest('button, .fu-btn')) play('click');
      }, true);
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) quietSuspend(); else if (vol() > 0) quietResume();
      });
      G.on('sold', function () { play('sell'); });
      G.on('vehicleBought', function () { play('buy'); });
      G.on('fieldBought', function () { play('buy'); });
      G.on('notify', function (d) {
        var bad = d && d.kind === 'bad';
        pendingNotify = (bad || pendingNotify === 'error') ? 'error' : 'notify';
      });
      G.on('exitVehicle', function () { to(pEAmp, 0, 0.25); to(pWAmp, 0, 0.2); });
      G.on('newGame', resync);
      G.on('gameLoaded', resync);
      G.on('gameStarted', function () { attachResync = true; });
    },
    update: function (dt, G) {
      if (G.started && !G.paused) pollAttach(); else attachResync = true;
      var v = vol();
      if (v <= 0) { // silent no-op; park the context if one exists
        pendingNotify = null;
        if (ctx) {
          to(masterW, 0, 0.05);
          if (!zeroSince) zeroSince = nowMs();
          else if (nowMs() - zeroSince > 600) quietSuspend();
        }
        return;
      }
      zeroSince = 0;
      if (!ctx) { if (!gestured || !ensureCtx()) { pendingNotify = null; return; } }
      quietResume();
      to(masterW, v * 0.5, 0.05);
      if (pendingNotify) {
        var kind = pendingNotify; pendingNotify = null;
        if (nowMs() - lastPriority > 350 && (!lastPlay.notify || nowMs() - lastPlay.notify > 400 || kind === 'error')) play(kind);
      }
      updateEngine(G);
    }
  });
})();
