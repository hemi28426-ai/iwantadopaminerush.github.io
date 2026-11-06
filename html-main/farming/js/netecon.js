// Farming Unblocked — netecon: host-authoritative shared money, purchase/sell/field-buy routing and
// crop prices for co-op. Offline (or FU.net missing) every wrapper just calls through.
(function () {
  'use strict';
  var FU = window.FU = window.FU || {};

  var G = null;
  var seq = 0, pending = [];            // client: money deltas sent but not yet acked by the host
  var acks = {};                        // host: last applied money seq per client
  var lastSent = null, lastSentAt = 0, totalTimer = null, totalDirty = false;
  var pricesTimer = null, lastHostEcon = null;
  var requester = null;                 // host: player id whose request is being performed

  function N() { return FU.net; }
  function isHost() { var n = N(); return !!(n && n.online && n.isHost); }
  function isClient() { var n = N(); return !!(n && n.online && n.isClient); }
  function remote() { return !!(FU.net && FU.net.applyingRemote); }
  function withRemote(fn) {
    var n = N(); if (!n) return fn();
    var prev = n.applyingRemote; n.applyingRemote = true;
    try { return fn(); } finally { n.applyingRemote = prev; }
  }
  function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }
  function fmt(n) { return FU.util && FU.util.fmtMoney ? FU.util.fmtMoney(n) : '$' + Math.round(n); }
  function myId() { var n = N(); return (n && n.myId) || 'h'; }
  function nameOf(id) { var n = N(), p = n && n.players && n.players[id]; return (p && p.name) || (id === 'h' ? 'The host' : 'A farmer'); }
  function send(type, d) { try { N().send(type, d); } catch (e) { console.error('[FU] netecon send', e); } }
  function bcast(type, d) { try { var n = N(); if (n.broadcast) n.broadcast(type, d); else n.send(type, d); } catch (e) { console.error('[FU] netecon broadcast', e); } }
  function sendTo(id, type, d) { try { var n = N(); if (n.sendTo) n.sendTo(id, type, d); } catch (e) { console.error('[FU] netecon sendTo', e); } }
  function sysLine(text) { try { if (FU.chat && FU.chat.system) FU.chat.system(text); } catch (e) {} }

  // which module owns a machine (object or id)
  function describe(obj) {
    var V = FU.vehicles, I = FU.implements;
    if (typeof obj === 'string') obj = (V && V.byId && V.byId(obj)) || (I && I.byId && I.byId(obj)) || null;
    if (!obj) return null;
    if (V && V.list && V.list.indexOf(obj) >= 0) return { kind: 'vehicle', id: obj.id, obj: obj };
    if (I && I.list && I.list.indexOf(obj) >= 0) return { kind: 'implement', id: obj.id, obj: obj };
    return null;
  }
  function findMachine(kind, id) {
    var m = kind === 'vehicle' ? FU.vehicles : FU.implements;
    return (m && m.byId) ? m.byId(id) : null;
  }
  function busy(o) {
    var t = now();
    if (o && o.netControlled && o.netControlled > t) return true;
    if (o && o.attachedTo && FU.vehicles && FU.vehicles.byId) {
      var v = typeof o.attachedTo === 'object' ? o.attachedTo : FU.vehicles.byId(o.attachedTo);
      if (v && v.netControlled && v.netControlled > t) return true;
    }
    return false;
  }

  // run fn while capturing G.notify (host performing a client's request: messages go to the requester)
  function capture(fn) {
    var msgs = [], prev = G.notify, res;
    G.notify = function (text, kind) { msgs.push({ text: String(text), kind: kind || 'info' }); };
    try { res = fn(); } finally { G.notify = prev; }
    return { res: res, msgs: msgs };
  }

  // ---------- money ----------
  function afterLocal(before, reason) {
    if (!isClient() || remote()) return;
    var delta = G.money - before;
    if (!delta) return;
    var s = ++seq;
    pending.push({ s: s, d: delta, t: now() });
    send('money', { delta: delta, reason: reason || '', seq: s });
  }
  function wrapMoney() {
    ['spend', 'charge', 'earn'].forEach(function (fnName) {
      var prev = G[fnName];
      if (typeof prev !== 'function') return;
      G[fnName] = function (amount, reason) {
        var before = G.money;
        var r = prev.apply(this, arguments);
        afterLocal(before, reason);
        return r;
      };
    });
  }
  function scheduleTotal() {
    if (!isHost()) return;
    totalDirty = true;
    if (totalTimer) return;
    var wait = Math.max(0, lastSentAt + 250 - now());
    totalTimer = setTimeout(flushTotal, wait);
  }
  function flushTotal() {
    totalTimer = null;
    if (!isHost() || !totalDirty) return;
    totalDirty = false; lastSent = G.money; lastSentAt = now();
    bcast('moneyTotal', { total: G.money, ack: Object.assign({}, acks) });
  }
  function onMoney(d, from) {
    if (!isHost() || !d) return;
    var delta = +d.delta;
    if (typeof d.seq === 'number' && from) acks[from] = Math.max(acks[from] || 0, d.seq);
    if (isFinite(delta) && delta) {
      withRemote(function () {
        var before = G.money;
        G.money = Math.max(0, G.money + delta);
        G.emit('moneyChanged', { money: G.money, delta: G.money - before, reason: d.reason || '', from: from, remote: true });
      });
    }
    scheduleTotal();
  }
  function onMoneyTotal(d) {
    if (!isClient() || !d || typeof d.total !== 'number' || !isFinite(d.total)) return;
    var a = d.ack ? (+d.ack[myId()] || 0) : null, t = now();
    if (typeof a === 'number') pending = pending.filter(function (p) { return p.s > a && t - p.t < 8000; });
    else pending = [];
    var total = d.total;
    pending.forEach(function (p) { total += p.d; });
    var before = G.money;
    if (Math.abs(total - before) < 1e-6) return;
    withRemote(function () {
      G.money = total;
      G.emit('moneyChanged', { money: G.money, delta: total - before, reason: 'sync', remote: true, sync: true });
    });
  }

  // ---------- spawn / remove broadcasts (host) ----------
  function bcastSpawn(obj) {
    var r = describe(obj); if (!r) return;
    bcast('spawn', { kind: r.kind, type: obj.type, id: obj.id, x: obj.x, z: obj.z, heading: obj.heading || 0, by: requester || myId() });
  }

  // ---------- wrappers ----------
  function wrapEconomy() {
    var E = FU.economy; if (!E) return;
    var prevBuy = E.buy, prevSell = E.sell;
    if (typeof prevBuy === 'function') E.buy = function (key) {
      if (isClient() && !remote()) {
        var it = E.item ? E.item(key) : null;
        if (!it) { G.notify('That item is not for sale', 'bad'); return null; }
        if (G.money + 1e-6 < it.price) { G.notify('Not enough money for ' + it.name, 'bad'); return null; }
        send('buyReq', { key: key });
        G.notify('Asked the host to buy ' + it.name + '…', 'info');
        return null;
      }
      var obj = prevBuy.apply(this, arguments);
      if (obj && isHost() && !remote()) {
        bcastSpawn(obj);
        var item = E.item ? E.item(key) : null;
        sysLine(nameOf(requester || myId()) + ' bought ' + ((item && item.name) || obj.type));
      }
      return obj;
    };
    if (typeof prevSell === 'function') E.sell = function (obj) {
      if (isClient() && !remote()) {
        var r = describe(obj);
        if (!r) { G.notify('Nothing to sell', 'bad'); return false; }
        var chk = E.canSell ? E.canSell(r.obj) : { ok: true };
        if (!chk.ok) { G.notify("Can't sell: " + chk.reason, 'bad'); return false; }
        if (busy(r.obj)) { G.notify("Can't sell: someone is using it", 'bad'); return false; }
        send('sellReq', { kind: r.kind, id: r.id });
        G.notify('Asked the host to sell ' + ((r.obj.def && r.obj.def.name) || r.obj.type) + '…', 'info');
        return false;
      }
      var info = (isHost() && !remote()) ? describe(obj) : null;
      var ok = prevSell.apply(this, arguments);
      if (ok && info) bcast('remove', { kind: info.kind, id: info.id, by: requester || myId() });
      return ok;
    };
  }
  function wrapFields() {
    var F = FU.fields; if (!F || typeof F.buy !== 'function') return;
    var prevBuy = F.buy;
    F.buy = function (id) {
      if (isClient() && !remote()) {
        var f = F.byId ? F.byId(id) : null;
        if (!f) return false;
        if (f.owned) { G.notify(f.name + ' is already yours', 'info'); return false; }
        if (G.money + 1e-6 < f.price) { G.notify('Not enough money for ' + f.name, 'bad'); return false; }
        send('fieldBuyReq', { id: f.id });
        G.notify('Asked the host to buy ' + f.name + '…', 'info');
        return false;
      }
      var ok = prevBuy.apply(this, arguments);
      if (ok && isHost() && !remote()) {
        var fl = F.byId ? F.byId(id) : null;
        bcast('fieldOwned', { id: fl ? fl.id : id, by: requester || myId() });
        sysLine(nameOf(requester || myId()) + ' bought ' + (fl ? fl.name : 'a field'));
      }
      return ok;
    };
    FU.netecon._fieldBuy = prevBuy;
  }

  // ---------- host: perform client requests ----------
  function perform(from, fn) {
    requester = from;
    var out;
    try { out = capture(fn); } finally { requester = null; }
    var ok = !!out.res;
    var msgs = out.msgs.length ? out.msgs : [{ text: ok ? 'Done' : 'The host could not do that', kind: ok ? 'good' : 'bad' }];
    sendTo(from, 'econResult', { ok: ok, msgs: msgs });
    return ok;
  }
  function refuse(from, text) { sendTo(from, 'econResult', { ok: false, msgs: [{ text: text, kind: 'bad' }] }); }
  function onBuyReq(d, from) {
    if (!isHost() || !d || !FU.economy) return;
    perform(from, function () { return FU.economy.buy(d.key); });
  }
  function onSellReq(d, from) {
    if (!isHost() || !d || !FU.economy) return;
    var o = findMachine(d.kind, d.id);
    if (!o) return refuse(from, 'That machine is already gone');
    if (G.activeVehicle === o) return refuse(from, "Can't sell: the host is driving it");
    if (busy(o)) return refuse(from, "Can't sell: someone is using it");
    perform(from, function () { return FU.economy.sell(o); });
  }
  function onFieldBuyReq(d, from) {
    if (!isHost() || !d || !FU.fields) return;
    perform(from, function () { return FU.fields.buy(+d.id); });
  }

  // ---------- client: apply host results ----------
  function onSpawn(d) {
    if (!isClient() || !d || !d.id) return;
    var mod = d.kind === 'vehicle' ? FU.vehicles : FU.implements;
    if (!mod || !mod.spawn || (mod.byId && mod.byId(d.id))) return;
    withRemote(function () {
      var obj = null;
      try { obj = mod.spawn(d.type, +d.x || 0, +d.z || 0, +d.heading || 0, d.id); } catch (e) { console.error('[FU] netecon spawn', e); }
      if (!obj) return;
      if (obj.id !== d.id) obj.id = d.id;
      if (d.by === myId()) G.emit('vehicleBought', { item: FU.economy && FU.economy.item ? FU.economy.item(d.type) : null, obj: obj, remote: true });
    });
  }
  function onRemove(d) {
    if (!isClient() || !d) return;
    var o = findMachine(d.kind, d.id); if (!o) return;
    withRemote(function () {
      try {
        if (d.kind === 'vehicle') FU.vehicles.remove(o); else FU.implements.remove(o);
      } catch (e) { console.error('[FU] netecon remove', e); }
      G.emit('machineSold', { obj: o, kind: d.kind, money: 0, remote: true });
    });
  }
  function onFieldOwned(d) {
    if (!isClient() || !d || !FU.fields || !FU.fields.byId) return;
    var f = FU.fields.byId(+d.id); if (!f || f.owned) return;
    var realBuy = FU.netecon._fieldBuy || FU.fields.buy;
    withRemote(function () {
      var prevSpend = G.spend;
      G.spend = function () { return true; };         // host already paid; just flip ownership + visuals/events
      try { capture(function () { return realBuy.call(FU.fields, f.id); }); }
      catch (e) { console.error('[FU] netecon fieldOwned', e); f.owned = true; f.contract = null; }
      finally { G.spend = prevSpend; }
    });
    if (d.by && d.by !== myId()) G.notify(nameOf(d.by) + ' bought ' + f.name, 'info');
  }
  function onResult(d) {
    if (!isClient() || !d || !d.msgs) return;
    d.msgs.slice(0, 4).forEach(function (m) { G.notify(m.text, m.kind || (d.ok ? 'good' : 'bad')); });
  }

  // ---------- prices ----------
  function schedulePrices() {
    if (!isHost() || pricesTimer) return;
    pricesTimer = setTimeout(function () {
      pricesTimer = null;
      if (isHost() && FU.economy && FU.economy.serialize) bcast('prices', { economy: FU.economy.serialize() });
    }, 60);
  }
  function onPrices(d) {
    if (!isClient() || !d || !d.economy || !FU.economy || !FU.economy.deserialize) return;
    lastHostEcon = d.economy;
    withRemote(function () {
      FU.economy.deserialize(d.economy);
      G.emit('pricesChanged', { day: G.time.day, remote: true });
    });
  }
  // a client's own day change steps its prices randomly: put the host's back (day = now, so no re-step)
  function onLocalPrices() {
    if (!isClient() || remote() || !lastHostEcon || !FU.economy || !FU.economy.deserialize) return;
    var e = Object.assign({}, lastHostEcon, { day: G.time.day });
    withRemote(function () { FU.economy.deserialize(e); });
  }

  FU.netecon = {
    pending: function () { return pending.slice(); },
    flush: function () { totalDirty = true; flushTotal(); }
  };

  FU.register({
    name: 'netecon', order: 62, ui: false,
    init: function (g) {
      G = g;
      wrapMoney();
      wrapEconomy();
      wrapFields();
      var n = N();
      if (!n || !n.on) return;
      n.on('money', onMoney);
      n.on('moneyTotal', onMoneyTotal);
      n.on('buyReq', onBuyReq);
      n.on('sellReq', onSellReq);
      n.on('fieldBuyReq', onFieldBuyReq);
      n.on('spawn', onSpawn);
      n.on('remove', onRemove);
      n.on('fieldOwned', onFieldOwned);
      n.on('prices', onPrices);
      n.on('econResult', onResult);
      g.on('moneyChanged', function () { if (isHost()) scheduleTotal(); });
      g.on('newDay', function () { schedulePrices(); });
      g.on('pricesChanged', function () { if (isHost()) schedulePrices(); else onLocalPrices(); });
      g.on('netPlayerJoin', function () { if (isHost()) { scheduleTotal(); schedulePrices(); } });
      g.on('netJoined', function (e) {
        pending = []; seq = 0;
        var w = e && e.world;
        lastHostEcon = (w && w.economy) || null;
      });
      g.on('netStatus', function () { if (!N() || !N().online) { pending = []; acks = {}; lastHostEcon = null; } });
      g.on('netPlayerLeave', function (e) { var p = e && e.player; if (p && p.id) delete acks[p.id]; });
    },
    update: function (dt, g) {
      // fallback for direct assignments to G.money on the host (loads, other modules)
      if (isHost() && g.money !== lastSent && !totalTimer) scheduleTotal();
    }
  });
})();
