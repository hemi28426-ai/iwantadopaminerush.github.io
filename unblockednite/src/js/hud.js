'use strict';
// ===== HUD: vitals, hotbar, minimap, kill feed, prompts, overlays =====
const ICONS = (() => {
  const r = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1"/>`;
  const svg = (inner) => `<svg viewBox="0 0 64 32" aria-hidden="true">${inner}</svg>`;
  return {
    pickaxe: svg(`${r(30, 8, 4, 23)}<path d="M12 10 Q32 -1 52 10 L50 13 Q32 5 14 13Z"/>`),
    ar: svg(r(14, 10, 32, 7) + r(46, 12, 16, 3) + r(2, 11, 12, 8) + r(30, 17, 6, 11) + r(20, 17, 5, 8) + r(24, 7, 8, 3)),
    smg: svg(r(16, 10, 24, 8) + r(40, 12, 10, 3) + r(26, 18, 5, 12) + r(34, 18, 5, 7) + r(8, 11, 8, 4)),
    shotgun: svg(r(10, 11, 46, 5) + r(34, 16, 14, 4) + r(2, 12, 10, 8) + r(14, 16, 5, 8)),
    sniper: svg(r(12, 12, 36, 5) + r(48, 13, 15, 2) + r(22, 6, 16, 4) + r(2, 12, 10, 8) + r(20, 17, 4, 8)),
    pistol: svg(r(20, 9, 24, 6) + r(22, 15, 7, 13) + r(44, 10, 3, 3)),
    rocket: svg(r(6, 9, 52, 10) + r(24, 19, 5, 9) + r(30, 4, 4, 5) + r(2, 7, 6, 14)),
    bandage: svg(`<circle cx="32" cy="16" r="11"/><rect x="32" y="20" width="22" height="7" rx="1"/>`),
    medkit: svg(`${r(14, 6, 36, 22)}<rect x="29" y="9" width="6" height="16" fill="#e53935"/><rect x="24" y="14" width="16" height="6" fill="#e53935"/>`),
    mini: svg(`<path d="M27 6h10v6l5 5v11H22V17l5-5z"/>`),
    big: svg(`<path d="M26 3h12v6l7 7v14H19V16l7-7z"/>`),
  };
})();

const HUD = {
  el: {}, mapOpen: false, sig: '', miniT: 0, timers: {}, dmgDirs: [],
  init() {
    for (const id of ['hud', 'killfeed', 'minimap', 'alive', 'kills', 'stormlabel', 'shieldfill', 'shieldtxt', 'hpfill', 'hptxt', 'hotbar', 'ammoinfo', 'mats', 'buildbar', 'prompt', 'toast', 'banner', 'bannertitle', 'bannersub', 'elimtoast', 'progress', 'progressfill', 'progresslabel', 'stormoverlay', 'dmgdir', 'scope', 'structhp', 'structfill', 'hitmarker', 'bigmap', 'bigmapcanvas', 'spectate', 'busprompt', 'pickups', 'crosshair', 'phaseinfo', 'wcard'])
      this.el[id] = document.getElementById(id);
    this.mini = this.el.minimap.getContext('2d');
    this.big = this.el.bigmapcanvas.getContext('2d');
  },
  reset() {
    this.el.killfeed.innerHTML = ''; this.el.pickups.innerHTML = ''; this.el.dmgdir.innerHTML = '';
    this.sig = ''; this.mapOpen = false; this.el.bigmap.hidden = true; this.dmgDirs = [];
    for (const k of ['toast', 'banner', 'elimtoast', 'structhp', 'hitmarker']) this.el[k].classList.remove('show');
  },
  flash(el, key, ms) {
    el.classList.add('show');
    clearTimeout(this.timers[key]);
    this.timers[key] = setTimeout(() => el.classList.remove('show'), ms);
  },
  toast(msg) { this.el.toast.textContent = msg; this.flash(this.el.toast, 'toast', 2200); },
  banner(t, s) { this.el.bannertitle.textContent = t; this.el.bannersub.textContent = s || ''; this.flash(this.el.banner, 'banner', 3500); },
  elimToast(c) { this.el.elimtoast.innerHTML = `ELIMINATED <b>${esc(c.name)}</b>`; this.flash(this.el.elimtoast, 'elim', 2200); },
  hitMarker(head) { this.el.hitmarker.classList.toggle('head', !!head); this.flash(this.el.hitmarker, 'hit', 120); },
  structHp(s) {
    this.el.structfill.style.width = clamp(s.hp / s.maxHp, 0, 1) * 100 + '%';
    this.flash(this.el.structhp, 'struct', 900);
  },
  matGain(mat, n) { this.pickupLine(`+${n} ${MAT_INFO[mat].name}`, '#ffffff'); },
  weaponCard(it, c) {
    const W = WEAPONS[it.id], R = RARITY[it.rarity];
    const dmgOf = (x) => Array.isArray(W.dmg) ? W.dmg[Math.min(x.rarity, W.dmg.length - 1)] * (x.rarity >= 5 ? RARITY_MULT[5] / RARITY_MULT[4] : 1) : W.dmg;
    const mine = c.slots.find(s => s && s.kind === 'weapon' && s.id === it.id && s !== it);
    const row = (label, v, mv, better, fmt = (x) => x) => {
      let cmp = '';
      if (mv != null && Math.abs(v - mv) > 1e-6) cmp = `<i class="${better(v, mv) ? 'up' : 'down'}">${better(v, mv) ? '▲' : '▼'} ${fmt(Math.abs(v - mv))}</i>`;
      return `<div class="wrow"><span>${label}</span><b>${fmt(v)}</b>${cmp}</div>`;
    };
    const hi = (a, b) => a > b, lo = (a, b) => a < b, r1 = (x) => +x.toFixed(1);
    let rows = '';
    if (W.throwable) rows = row('Count', it.count, null, hi);
    else {
      const per = dmgOf(it) * (W.pellets || 1), mper = mine ? dmgOf(mine) * (W.pellets || 1) : null;
      rows = row(W.pellets ? 'Damage (all pellets)' : 'Damage', Math.round(per), mper != null ? Math.round(mper) : null, hi, Math.round)
        + row('Fire rate', W.rate, null, hi, r1) + row('Magazine', W.mag, null, hi) + row('Reload', W.reload, null, lo, (x) => r1(x) + 's');
    }
    const note = mine ? (mine.rarity < it.rarity ? '<div class="wnote up">Better than yours: walk over it to swap</div>' : `<div class="wnote">You have a ${RARITY[mine.rarity].name} one</div>`) : '';
    return `<div class="whead" style="--rc:${R.color}"><div class="wname">${W.name}</div><div class="wrar">${R.name}${W.ammo ? ' · ' + W.ammo + ' ammo' : ''}</div></div>${rows}${note}`;
  },
  pickupToast(item) {
    const n = item.kind === 'ammo' || item.kind === 'mats' ? ` x${item.count}` : item.kind === 'cons' ? ` x${item.count}` : '';
    this.pickupLine(`+ ${ITEMS.name(item)}${n}`, RARITY[ITEMS.rarityOf(item)].color);
  },
  pickupLine(text, color) {
    const d = document.createElement('div');
    d.className = 'pickline'; d.textContent = text; d.style.color = color;
    this.el.pickups.appendChild(d);
    while (this.el.pickups.children.length > 5) this.el.pickups.firstChild.remove();
    setTimeout(() => d.remove(), 2400);
  },
  killfeedText(html) {
    const d = document.createElement('div');
    d.className = 'feedline'; d.innerHTML = html;
    this.el.killfeed.prepend(d);
    setTimeout(() => d.remove(), 7000);
  },
  killfeed(killer, victim, weapon) {
    const d = document.createElement('div');
    d.className = 'feedline' + ((killer && killer.isPlayer) || victim.isPlayer ? ' me' : '');
    let txt;
    if (!killer || killer === victim) txt = weapon === 'the Storm' ? `<b>${esc(victim.name)}</b> was lost in the Storm` : weapon === 'gravity' ? `<b>${esc(victim.name)}</b> fell too far` : `<b>${esc(victim.name)}</b> was eliminated`;
    else txt = `<b>${esc(killer.name)}</b> eliminated <b>${esc(victim.name)}</b>${weapon ? ' <span>with ' + esc(weapon) + '</span>' : ''}`;
    d.innerHTML = txt;
    this.el.killfeed.prepend(d);
    while (this.el.killfeed.children.length > 6) this.el.killfeed.lastChild.remove();
    setTimeout(() => d.classList.add('fade'), 6000);
    setTimeout(() => d.remove(), 7000);
  },
  damageFrom(attacker, storm) {
    if (!attacker || storm || attacker === PC.c) return;
    const el = document.createElement('div');
    el.className = 'dmgarc';
    this.el.dmgdir.appendChild(el);
    this.dmgDirs.push({ el, src: attacker.pos.clone(), t: 1.2 });
    if (this.dmgDirs.length > 5) { const o = this.dmgDirs.shift(); o.el.remove(); }
  },
  toggleMap() { this.mapOpen = !this.mapOpen; this.el.bigmap.hidden = !this.mapOpen; },

  slotHTML(item, key, sel) {
    let cls = 'slot', icon = '', label = '', style = '';
    if (item) {
      const rar = ITEMS.rarityOf(item);
      style = `--rar:${RARITY[rar].color}`;
      cls += ' r' + rar;
      if (item.kind === 'weapon') {
        icon = GUNS.icons[item.id] ? `<img class="gunicon" src="${GUNS.icons[item.id]}" alt="">` : (ICONS[item.id] || ICONS.ar);
        label = item.id === 'pickaxe' ? '' : item.special ? '∞' : WEAPONS[item.id].throwable ? 'x' + item.count : `${item.mag}`;
      }
      else { icon = ICONS[item.id]; label = 'x' + item.count; }
    } else cls += ' empty';
    if (sel) cls += ' sel';
    return `<div class="${cls}" style="${style}"><span class="key">${key}</span>${icon}<span class="cnt">${label}</span></div>`;
  },

  update(dt) {
    const c = PC.c;
    if (!c) return;
    const E = this.el;
    // vitals
    E.shieldfill.style.width = c.shield + '%'; E.shieldtxt.textContent = Math.ceil(c.shield);
    E.hpfill.style.width = Math.max(0, c.hp) / (c.maxHp || 100) * 100 + '%'; E.hptxt.textContent = Math.max(0, Math.ceil(c.hp));
    E.alive.textContent = G.teamMode ? G.teamAlive(G.player.team) + ' v ' + G.teamAlive(G.player.team === 'hero' ? 'villain' : 'hero') : G.aliveCount();
    E.kills.textContent = c.kills;
    E.stormlabel.textContent = STORM.label();
    E.phaseinfo.textContent = 'Storm damage: ' + STORM.dps + '/s';
    // hotbar (rebuild only when changed)
    const item = CHARS.currentItem(c);
    const sig = [c.sel, c.buildType, c.buildMat, c.mats.wood, c.mats.brick, c.mats.metal, ...c.slots.map(s => s ? s.id + s.rarity + (s.mag ?? '') + (s.count ?? '') : '-'), item && item.kind === 'weapon' && item.id !== 'pickaxe' && !WEAPONS[item.id].throwable ? c.ammo[WEAPONS[item.id].ammo] : '', item && WEAPONS[item.id] && WEAPONS[item.id].heat ? Math.round((c.heat || 0) / 10) + (G.time < (c.overheatUntil || 0) ? 'X' : '') : ''].join('|');
    if (sig !== this.sig) {
      this.sig = sig;
      let h = this.slotHTML(PICKAXE_ITEM, 'G', c.sel === -1 && !c.buildType);
      for (let i = 0; i < c.slots.length; i++) h += this.slotHTML(c.slots[i], i + 1, c.sel === i && !c.buildType);
      E.hotbar.innerHTML = h;
      if (item && WEAPONS[item.id] && WEAPONS[item.id].heat && !c.buildType) {
        const hot = G.time < (c.overheatUntil || 0);
        E.ammoinfo.innerHTML = `<b style="color:${hot ? '#ff5a5a' : '#fff'}">${hot ? 'OVERHEATED' : 'Heat ' + Math.round(c.heat || 0) + '%'}</b> <span>${WEAPONS[item.id].name} · Mythic</span>`;
      } else if (item && item.special && !c.buildType) {
        E.ammoinfo.innerHTML = `<b>∞</b> <span>${WEAPONS[item.id].name} · 6 or R swaps arm cannon / laser</span>`;
      } else if (item && item.kind === 'weapon' && WEAPONS[item.id].throwable && !c.buildType) {
        E.ammoinfo.innerHTML = `<b>x${item.count}</b> <span>${WEAPONS[item.id].name} · click to throw</span>`;
      } else if (item && item.kind === 'weapon' && item.id !== 'pickaxe' && !c.buildType) {
        const W = WEAPONS[item.id];
        E.ammoinfo.innerHTML = `<b>${item.mag}</b> / ${c.ammo[W.ammo]} <span>${W.name} · ${RARITY[item.rarity].name}</span>`;
      } else if (item && item.kind === 'cons' && !c.buildType) E.ammoinfo.innerHTML = `<span>${CONSUMABLES[item.id].name} · click to use</span>`;
      else E.ammoinfo.innerHTML = c.buildType ? '<span>Build mode · R changes material</span>' : '<span>Harvest Tool · hit trees, rocks, walls</span>';
      E.mats.innerHTML = ['wood', 'brick', 'metal'].map(m => `<div class="mat ${m}${c.buildType && c.buildMat === m ? ' sel' : ''}"><i></i>${c.mats[m]}</div>`).join('');
      const pieces = [['Z', 'wall', 'Wall'], ['X', 'floor', 'Floor'], ['C', 'ramp', 'Ramp'], ['V', 'cone', 'Roof']];
      E.buildbar.innerHTML = pieces.map(([k, t, n]) => `<div class="piece${c.buildType === t ? ' sel' : ''}"><span class="key">${k}</span>${n}</div>`).join('');
      E.buildbar.classList.toggle('active', !!c.buildType);
    }
    // prompt
    let prompt = '';
    if (c.state === 'bus') prompt = '';
    else if (PC.interact) {
      if (PC.interact.type === 'chest') prompt = '<kbd>E</kbd> Open chest';
      else if (PC.interact.type === 'car') prompt = '<kbd>E</kbd> Drive';
      else if (PC.interact.type === 'zip') prompt = '<kbd>E</kbd> Ride zipline';
      else { const it = PC.interact.obj.item; prompt = `<kbd>E</kbd> Pick up <b style="color:${RARITY[ITEMS.rarityOf(it)].color}">${ITEMS.name(it)}</b>${it.kind === 'weapon' ? ' · ' + RARITY[it.rarity].name : ''}`; }
    }
    if (PC.rebootPrompt) prompt = PC.rebootPrompt;
    if (c.vehicle) prompt = `<kbd>W</kbd><kbd>S</kbd> drive · <kbd>A</kbd><kbd>D</kbd> steer · <kbd>Space</kbd> brake · <kbd>E</kbd> get out · ${Math.round(Math.abs(c.vehicle.speed) * 3.6)} km/h`;
    else if (c.zip) prompt = '<kbd>Space</kbd> let go';
    if (E.prompt.innerHTML !== prompt) E.prompt.innerHTML = prompt;
    E.prompt.hidden = !prompt;
    // weapon card: stats of the gun you're standing at, compared with your own copy of it
    const wp = !c.vehicle && !c.zip && PC.interact && PC.interact.type === 'pickup' && PC.interact.obj.item.kind === 'weapon' ? PC.interact.obj.item : null;
    if (wp !== this._wcardItem) { this._wcardItem = wp; E.wcard.innerHTML = wp ? this.weaponCard(wp, c) : ''; E.wcard.hidden = !wp; }
    E.busprompt.hidden = !(c.state === 'bus' && c.alive);
    // progress (reload/use)
    let prog = -1, plabel = '';
    if (c.reloading) { prog = 1 - c.reloadT / WEAPONS[c.reloadItem.id].reload; plabel = 'Reloading'; }
    else if (c.using) { prog = c.useT / CONSUMABLES[c.using.id].time; plabel = CONSUMABLES[c.using.id].name; }
    E.progress.hidden = prog < 0;
    if (prog >= 0) { E.progressfill.style.width = clamp(prog, 0, 1) * 100 + '%'; E.progresslabel.textContent = plabel; }
    // overlays
    E.stormoverlay.style.opacity = c.alive && c.state !== 'bus' && !STORM.isSafe(c.pos.x, c.pos.z) ? 1 : 0;
    const scoped = PC.firstPerson;
    E.scope.hidden = !scoped;
    E.crosshair.className = c.buildType ? 'build' : (item && item.id === 'shotgun' ? 'wide' : '');
    E.crosshair.style.setProperty('--spread', (8 + c.bloom * 300 + (c.ads ? 0 : 6)) + 'px');
    E.crosshair.hidden = scoped || c.state !== 'ground' || !c.alive;
    // damage direction arcs
    for (let i = this.dmgDirs.length - 1; i >= 0; i--) {
      const d = this.dmgDirs[i]; d.t -= dt;
      if (d.t <= 0) { d.el.remove(); this.dmgDirs.splice(i, 1); continue; }
      const dx = d.src.x - c.pos.x, dz = d.src.z - c.pos.z, y = PC.camYaw;
      const lx = dx * Math.cos(y) - dz * Math.sin(y), ly = -dx * Math.sin(y) - dz * Math.cos(y);
      d.el.style.transform = `rotate(${Math.atan2(lx, ly)}rad)`;
      d.el.style.opacity = Math.min(1, d.t);
    }
    // minimap
    this.miniT -= dt;
    if (this.miniT <= 0) { this.miniT = 0.08; this.drawMini(); if (this.mapOpen) this.drawBig(); }
  },

  drawStorm(g, toPx, scale, w, h) {
    const cur = STORM.cur, nx = STORM.next;
    const [cx, cy] = toPx(cur.x, cur.z);
    g.save();
    g.fillStyle = 'rgba(140,60,230,0.42)';
    g.beginPath(); g.rect(0, 0, w, h); g.arc(cx, cy, Math.max(0, cur.r * scale), 0, TAU, true); g.fill('evenodd');
    g.strokeStyle = 'rgba(190,120,255,0.95)'; g.lineWidth = 2;
    g.beginPath(); g.arc(cx, cy, Math.max(0, cur.r * scale), 0, TAU); g.stroke();
    if (STORM.state !== 'done') {
      const [nx2, ny2] = toPx(nx.x, nx.z);
      g.strokeStyle = '#ffffff'; g.lineWidth = 1.5; g.setLineDash([5, 4]);
      g.beginPath(); g.arc(nx2, ny2, Math.max(0, nx.r * scale), 0, TAU); g.stroke();
    }
    g.restore();
  },
  drawBossMark(g, x, y, r, color) {
    g.save();
    g.fillStyle = color || '#d7263d'; g.strokeStyle = '#fff'; g.lineWidth = 2;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(x, y - r * 0.12, r * 0.5, 0, TAU); g.fill();
    g.fillRect(x - r * 0.3, y + r * 0.2, r * 0.6, r * 0.35);
    g.fillStyle = '#d7263d';
    g.beginPath(); g.arc(x - r * 0.2, y - r * 0.15, r * 0.13, 0, TAU); g.arc(x + r * 0.2, y - r * 0.15, r * 0.13, 0, TAU); g.fill();
    g.restore();
  },
  drawArrow(g, x, y, yaw, size, color) {
    g.save(); g.translate(x, y); g.rotate(-yaw);
    g.fillStyle = color; g.strokeStyle = '#111'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(0, -size); g.lineTo(size * 0.7, size * 0.8); g.lineTo(0, size * 0.4); g.lineTo(-size * 0.7, size * 0.8); g.closePath();
    g.fill(); g.stroke(); g.restore();
  },
  drawMini() {
    const g = this.mini, W = g.canvas.width, H = g.canvas.height, c = PC.c;
    const view = 320, S = WORLD.mapCanvas.width, k = S / WORLD.SIZE;
    const tgt = G.phase === 'dead' && PC.spectating ? PC.spectating : c;
    const px = tgt.state === 'bus' ? BUS.pos.x : tgt.pos.x, pz = tgt.state === 'bus' ? BUS.pos.z : tgt.pos.z;
    g.fillStyle = '#2a7fb8'; g.fillRect(0, 0, W, H);
    g.drawImage(WORLD.mapCanvas, (px + WORLD.HALF - view / 2) * k, (pz + WORLD.HALF - view / 2) * k, view * k, view * k, 0, 0, W, H);
    const scale = W / view;
    const toPx = (x, z) => [(x - px) * scale + W / 2, (z - pz) * scale + H / 2];
    this.drawStorm(g, toPx, scale, W, H);
    for (const u of BOSS.units) if (u.c && u.c.alive && !u.c.dormant) { const [bx, by] = toPx(u.c.pos.x, u.c.pos.z); if (bx > -10 && bx < W + 10 && by > -10 && by < H + 10) this.drawBossMark(g, bx, by, 7, u.T.color); }
    EXPOSE.draw(g, toPx, scale); EVENTS.draw(g, toPx);
    if (BUS.active) {
      const [ax, ay] = toPx(BUS.start.x, BUS.start.z), e = BUS.end(), [bx, by] = toPx(e.x, e.z);
      g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 2; g.setLineDash([6, 5]);
      g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); g.setLineDash([]);
    }
    this.drawArrow(g, W / 2, H / 2, tgt === c ? PC.camYaw : tgt.yaw, 7, '#ffe14a');
  },
  drawBig() {
    const g = this.big, W = g.canvas.width, H = g.canvas.height, c = PC.c;
    g.drawImage(WORLD.mapCanvas, 0, 0, W, H);
    const scale = W / WORLD.SIZE;
    const toPx = (x, z) => [(x + WORLD.HALF) * scale, (z + WORLD.HALF) * scale];
    this.drawStorm(g, toPx, scale, W, H);
    for (const u of BOSS.units) if (u.c && u.c.alive && !u.c.dormant) { const [bx, by] = toPx(u.c.pos.x, u.c.pos.z); this.drawBossMark(g, bx, by - 18, 10, u.T.color); }
    EXPOSE.draw(g, toPx, scale); EVENTS.draw(g, toPx);
    g.font = '600 13px "Bricolage Grotesque", system-ui, sans-serif'; g.textAlign = 'center';
    for (const p of WORLD.pois) {
      const [x, y] = toPx(p.x, p.z);
      g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillText(p.name.toUpperCase(), x + 1, y + 1);
      g.fillStyle = '#ffffff'; g.fillText(p.name.toUpperCase(), x, y);
    }
    if (BUS.active || c.state === 'bus') {
      const [ax, ay] = toPx(BUS.start.x, BUS.start.z), e = BUS.end(), [bx, by] = toPx(e.x, e.z);
      g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.setLineDash([10, 8]);
      g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); g.setLineDash([]);
      const [qx, qy] = toPx(BUS.pos.x, BUS.pos.z);
      g.fillStyle = '#ffc62b'; g.beginPath(); g.arc(qx, qy, 6, 0, TAU); g.fill();
    }
    const tgt = G.phase === 'dead' && PC.spectating ? PC.spectating : c;
    const [x, y] = toPx(tgt.state === 'bus' ? BUS.pos.x : tgt.pos.x, tgt.state === 'bus' ? BUS.pos.z : tgt.pos.z);
    this.drawArrow(g, x, y, tgt === c ? PC.camYaw : tgt.yaw, 9, '#ffe14a');
  },
};

function esc(s) { return String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }
