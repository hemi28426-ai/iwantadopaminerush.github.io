// Deal Finder UI. Talks to the app over /api; works in the app window or any browser while the app runs.
const $ = s => document.querySelector(s);
const money = n => n == null ? '–' : (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString();
const signed = n => n == null ? '–' : (n >= 0 ? '+' : '') + money(n);
const SRC = { ebaySold: 'eBay sold', ebayActive: 'eBay', mercariSold: 'Mercari sold', offerup: 'OfferUp', facebook: 'Facebook', amazon: 'Amazon new' };
const DEALS = new Set(['steal', 'great', 'good']);

let es = null;
let items = new Map(); // id -> { l, p, miles, el }
let radius = 125;
let tab = 'auction';
const sortFor = { auction: 'ending', fb: 'deal' };

const api = (path, body) => fetch('/api/' + path, body === undefined ? {} : {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
}).then(r => r.json()).catch(() => ({}));

// ---------- accounts ----------

async function refreshStatus(first) {
  const s = await api('status');
  if (!s.settings) return;
  const fb = $('#fbBtn'), eb = $('#ebayBtn');
  fb.className = 'chip ' + (s.facebook ? 'on' : 'off');
  fb.querySelector('.txt').textContent = s.facebook ? 'Facebook: signed in' : 'Sign in to Facebook';
  eb.className = 'chip ' + (s.ebaySold === 'ok' ? 'on' : s.ebaySold === 'blocked' ? 'off' : '');
  eb.querySelector('.txt').textContent = s.ebaySold === 'ok' ? 'eBay sold prices: on' : 'Sign in to eBay (sold prices)';
  groups = s.settings.fbGroups || [];
  $('#groupsBtn').textContent = `FB groups (${groups.length})`;
  watches = s.settings.watches || [];
  updateWatchBtn();
  $('#alertsBtn').textContent = s.unreadAlerts ? `🔔 Alerts (${s.unreadAlerts} new)` : `Alerts · watching ${watches.length}`;
  $('#alertsBtn').classList.toggle('unread', !!s.unreadAlerts);
  if (s.openAlerts) openAlerts(); // a notification was clicked
  if (first) {
    $('#zip').value = s.settings.zip || '';
    $('#radius').value = String(s.settings.radius || 125);
    $('#mode').value = s.settings.mode || 'both';
    $('#browserBtn').hidden = !/Electron/.test(navigator.userAgent);
  }
}
for (const b of document.querySelectorAll('.accounts [data-site]')) b.onclick = () => api('login?site=' + b.dataset.site, {});

// Facebook groups to search: one link per line.
let groups = [];
$('#groupsBtn').onclick = () => { $('#groupsList').value = groups.join('\n'); $('#groupsDlg').showModal(); };
$('#groupsDlg').addEventListener('close', async () => {
  if ($('#groupsDlg').returnValue !== 'save') return;
  const list = $('#groupsList').value.split('\n').map(s => s.trim()).filter(Boolean);
  await api('settings', { fbGroups: list });
  refreshStatus();
});
$('#browserBtn').onclick = () => api('open-browser', {});
refreshStatus(true);
setInterval(refreshStatus, 4000);

// ---------- search ----------

const searchBtn = $('#search .go:not(.scan)'), scanBtn = $('#scanBtn');
let busyBtn = null, lastSearch = null;

$('#search').onsubmit = e => { e.preventDefault(); start(false); };
scanBtn.onclick = () => start(true);

// scan: sweep all of Marketplace in the radius for deals, instead of searching for what's in the box.
function start(scan) {
  const q = $('#q').value.trim();
  if (!q && !scan) { $('#q').focus(); return; }
  radius = +$('#radius').value;
  const zip = $('#zip').value.trim();
  const mode = scan ? 'scan' : $('#mode').value;
  if (mode !== 'marketplace' && !/^\d{5}$/.test(zip)) {
    $('#progress').hidden = false;
    setStatus(scan ? 'Enter your 5-digit ZIP so the scan knows where "near you" is.' : 'Enter your 5-digit ZIP to find auctions near you.');
    $('#zip').focus();
    return;
  }
  api('settings', scan ? { zip, radius } : { zip, radius, mode });

  if (es) es.close();
  resetButton();
  items = new Map();
  $('#grid').innerHTML = '';
  $('#sources').innerHTML = '';
  $('#market').hidden = true;
  $('#empty').hidden = true;
  $('#progress').hidden = false;
  $('#toolbar').hidden = false;
  $('[data-tab=auction]').hidden = mode === 'marketplace';
  $('[data-tab=fb]').hidden = mode === 'auctions';
  setTab(mode === 'marketplace' || scan ? 'fb' : 'auction');
  if (scan) { sortFor.fb = 'deal'; sortFor.auction = 'deal'; $('#sort').value = 'deal'; }
  lastSearch = scan ? null : { q, zip, radius, mode };
  updateWatchBtn();
  setStatus(scan ? 'Scanning everything near you (Marketplace, eBay auctions, K-BID)… deals rise to the top as they come in.'
    : mode === 'marketplace' ? 'Searching Facebook Marketplace and price sites…' : 'Searching auctions near you and price sites…');
  // Stays clickable: pressing it again starts over with whatever is in the box now.
  busyBtn = scan ? scanBtn : searchBtn;
  busyBtn.classList.add('busy');
  busyBtn.textContent = scan ? 'Scanning…' : 'Searching…';
  busyBtn.title = 'Still checking prices. Click to start over.';

  const p = new URLSearchParams({ q: scan ? '' : q, zip, radius, mode, min: $('#min').value.trim(), max: $('#max').value.trim() });
  es = new EventSource('/api/search?' + p);
  const on = (ev, fn) => es.addEventListener(ev, m => fn(JSON.parse(m.data)));

  on('source', s => {
    let el = document.getElementById('src-' + s.id);
    if (!el) { el = document.createElement('span'); el.id = 'src-' + s.id; $('#sources').append(el); }
    el.className = 'src ' + s.state;
    el.innerHTML = `<b>${s.name}</b> ${s.state === 'ok' || s.state === 'empty' ? (s.count || 0) : s.state === 'blocked' ? '— needs sign-in / captcha, click to fix' : s.state === 'error' ? '— failed' : ''}`;
    el.title = s.state === 'blocked' ? 'Opens the page so you can sign in or pass the check, then search again' : '';
    el.onclick = s.state === 'blocked' || s.state === 'error' ? () => api('fix?id=' + s.id, {}) : null;
  });
  on('listings', d => {
    for (const l of d.listings) items.set(l.id, { l, p: null, miles: l.miles ?? null });
    const n = d.listings.length, isAuc = d.listings[0] && d.listings[0].kind === 'auction';
    // Group posts trickle in one by one, and the scan reports its own progress.
    if (d.scan || (d.listings[0] && d.listings[0].site === 'fbgroup')) { render(); return; }
    if (isAuc) setStatus(`Found ${n} auctions within ${radius} mi (eBay + K-BID). Pricing them…`);
    else if (d.area !== undefined) setStatus(n ? `Found ${n} Marketplace listings${d.area ? ' around ' + d.area.split('·')[0].trim() : ''}. Pricing them…`
      : 'No Facebook listings found. Try another search, or sign in to Facebook.');
    render();
  });
  on('distance', d => { const it = items.get(d.id); if (it) { it.miles = d.miles; render(); } });
  on('market', showMarket);
  on('priced', d => { const it = items.get(d.id); if (it) { it.p = d; render(); } });
  on('status', s => setStatus(s.msg));
  on('ready', () => resetButton());
  on('done', () => finish('Done.'));
  on('fail', f => finish('Something went wrong: ' + f.msg));
  es.onerror = () => finish(null);
};

function finish(msg) {
  if (es) es.close();
  es = null;
  resetButton();
  if (msg) setStatus(msg);
  for (const el of document.querySelectorAll('.src.loading')) el.className = 'src empty';
  // Nothing on this tab but results on the other: show those.
  const n = k => [...items.values()].filter(it => it.l.kind === k).length;
  const other = tab === 'auction' ? 'fb' : 'auction';
  if (!n(tab) && n(other) && !$(`[data-tab=${other}]`).hidden) setTab(other);
  refreshStatus();
  render();
}

function resetButton() {
  searchBtn.classList.remove('busy');
  searchBtn.textContent = 'Search';
  scanBtn.classList.remove('busy');
  scanBtn.textContent = 'Scan for deals';
  searchBtn.title = '';
  scanBtn.title = 'Sweep every popular flip search on Marketplace in your radius and rank the best deals';
}

// ---------- watched searches & alerts ----------

let watches = [];
const watchKey = w => [w.q, w.zip, w.radius, w.mode].join('|').toLowerCase();

function updateWatchBtn() {
  const b = $('#watchBtn');
  b.hidden = !lastSearch;
  const on = lastSearch && watches.some(w => watchKey(w) === watchKey(lastSearch));
  b.classList.toggle('on', !!on);
  b.textContent = on ? '★ Watching this search' : '☆ Watch this search';
  b.title = on ? 'Checked every 10 min while the app is open. Manage in Alerts.' : 'Get a notification when a new deal for this search shows up';
}
$('#watchBtn').onclick = async () => {
  if (!lastSearch) return;
  const i = watches.findIndex(w => watchKey(w) === watchKey(lastSearch));
  watches = i >= 0 ? await api('unwatch?i=' + i, {}) : await api('watch', lastSearch);
  updateWatchBtn();
};

$('#alertsBtn').onclick = openAlerts;
async function openAlerts() {
  const list = await api('alerts');
  $('#alertsList').innerHTML = Array.isArray(list) && list.length ? list.map(a => `
    <div class="alert-row ${a.unread ? 'unread' : ''}">
      <img src="${esc(a.img)}" alt="">
      <div class="t">
        <a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.title)}</a>
        <div class="m">${money(a.price)} · worth ~${money(a.value)} · ${a.kind === 'auction' ? 'max bid' : 'offer'} ${money(a.offer)} · ${esc(a.label)}${a.miles != null ? ` · ${a.miles} mi` : ''}</div>
        <div class="m">watching “${esc(a.watch)}” · ${new Date(a.at).toLocaleString()}</div>
      </div>
    </div>`).join('') : '<p>No alerts yet. Watch a search (☆ button after searching) and new deals will show up here.</p>';
  renderWatches();
  $('#alertsDlg').showModal();
  api('alerts/read', {}).then(() => refreshStatus());
}
function renderWatches() {
  $('#watchList').innerHTML = watches.length ? watches.map((w, i) => `
    <div class="watch-row"><span><b>${esc(w.q)}</b> · ${esc(w.zip)} · ${w.radius} mi · ${esc(w.mode === 'both' ? 'auctions + Marketplace' : w.mode)}</span>
    <button type="button" data-i="${i}" title="Stop watching">✕</button></div>`).join('') : '<p>None yet.</p>';
  for (const b of $('#watchList').querySelectorAll('button')) b.onclick = async () => {
    watches = await api('unwatch?i=' + b.dataset.i, {});
    renderWatches();
    updateWatchBtn();
  };
}

function setStatus(t) { $('#status').textContent = t; }

function showMarket(m) {
  const box = $('#market');
  if (m.value == null) { box.hidden = true; return; }
  const per = Object.entries(m.bySource || {}).map(([s, v]) => `<span>${SRC[s] || s} <b>${money(v.median)}</b> (${v.n})</span>`).join('');
  box.innerHTML = `
    <div><div class="lbl">${m.sixMonth ? `6-month eBay average · ${m.sixMonth.count.toLocaleString()} sold` : 'Typical price'} · “${esc(m.q)}”</div><div class="big">${money(m.value)}</div></div>
    <div class="per">${per}${m.newRetail ? `<span>New on Amazon <b>${money(m.newRetail)}</b></span>` : ''}</div>`;
  box.hidden = false;
}

// ---------- tabs, filters, sorting ----------

function setTab(t) {
  tab = t;
  for (const b of document.querySelectorAll('.tab')) b.classList.toggle('active', b.dataset.tab === t);
  $('#sort option[value=ending]').hidden = t !== 'auction';
  $('#sort').value = sortFor[t];
  render();
}
for (const b of document.querySelectorAll('.tab')) b.onclick = () => setTab(b.dataset.tab);
$('#sort').onchange = () => { sortFor[tab] = $('#sort').value; render(); };
['#onlyDeals', '#inRadius'].forEach(s => $(s).onchange = render);
setInterval(render, 30000); // keep auction countdowns current

let raf = 0;
function render() {
  if (raf) return;
  raf = requestAnimationFrame(() => { raf = 0; draw(); });
}

function sortKey(it, how) {
  const p = it.p || {};
  if (how === 'ending') return it.l.endsAt ?? 1e15;
  if (how === 'profit') return -(p.profitAtMax ?? p.profit ?? -1e9);
  if (how === 'price') return it.l.price;
  if (how === 'dist') return it.miles ?? 1e9;
  // A $0 bid with a week left says nothing yet: the auction deals that matter are under max bid and ending soonest.
  if (it.l.kind === 'auction') return DEALS.has(p.verdict) ? (it.l.endsAt ?? 1e14) : 1e15 + (p.ratio ?? 99);
  // Suspiciously cheap listings go after the real deals.
  if (p.verdict === 'sus') return 50 + p.ratio;
  return p.ratio ?? 99;
}

function draw() {
  const how = $('#sort').value, onlyDeals = $('#onlyDeals').checked, inRadius = $('#inRadius').checked;
  const all = [...items.values()];
  for (const k of ['auction', 'fb']) $(`[data-tab=${k}] span`).textContent = all.filter(it => it.l.kind === k).length;
  let far = 0;
  const list = all.filter(it => {
    if (it.l.kind !== tab) return false;
    if (onlyDeals && !(it.p && DEALS.has(it.p.verdict))) return false;
    if (inRadius && it.miles != null && it.miles > radius) { far++; return false; }
    return true;
  }).sort((a, b) => sortKey(a, how) - sortKey(b, how));

  const grid = $('#grid');
  list.forEach((it, i) => {
    if (!it.el) it.el = $('#cardTpl').content.firstElementChild.cloneNode(true);
    fill(it.el, it);
    if (grid.children[i] !== it.el) grid.insertBefore(it.el, grid.children[i] || null);
  });
  while (grid.children.length > list.length) grid.lastChild.remove();

  const deals = list.filter(it => it.p && DEALS.has(it.p.verdict)).length;
  const noun = tab === 'auction' ? 'auction' : 'listing';
  $('#count').textContent = `${list.length} ${noun}${list.length === 1 ? '' : 's'} · ${deals} deal${deals === 1 ? '' : 's'}` +
    (far ? ` · ${far} hidden (over ${radius} mi away)` : '');
}

function timeLeft(endsAt) {
  if (!endsAt) return 'time left: see listing';
  const s = Math.round((endsAt - Date.now()) / 1000);
  if (s <= 0) return 'Ended';
  const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
  return (d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${Math.max(m, 1)}m`) + ' left';
}

function fill(el, it) {
  const { l, p, miles } = it;
  const auc = l.kind === 'auction';
  const v = p ? p.verdict : null;
  const ended = auc && l.endsAt && l.endsAt <= Date.now();
  el.className = 'card' + (v ? ' v-' + v : ' pending') + (miles != null && miles > radius ? ' far' : '') + (ended ? ' ended' : '');
  const img = el.querySelector('img');
  if (img.getAttribute('src') !== l.img) img.src = l.img;
  el.querySelector('.thumb').href = l.url;
  el.querySelector('.title').href = l.url;
  el.querySelector('.title').textContent = l.title;
  el.querySelector('.dist').textContent = miles != null ? `${miles} mi` : '';
  el.querySelector('.badge').textContent = p ? p.label : 'Pricing…';
  el.querySelector('.worth').innerHTML = p && p.value != null
    ? (p.sixMonth ? `6-mo avg <b>${money(p.value)}</b>` : `worth ~<b>${money(p.value)}</b>`) : '';
  // Past sales of this item: the 6-month eBay range when signed in, else the sold listings found.
  const six = p && p.sixMonth, sold = p && p.sold;
  el.querySelector('.hist').innerHTML = six && six.min != null
    ? `Sold last 6 mo: <b>${money(six.min)}</b> – <b>${money(six.max)}</b> · avg <b>${money(six.avg)}</b> · ${six.count.toLocaleString()} sold`
    : sold ? `Recent sales: <b>${money(sold.low)}</b> – <b>${money(sold.high)}</b> · avg <b>${money(sold.avg)}</b> · ${sold.n} sold`
    : '';

  const pr = el.querySelector('.profit');
  if (auc) {
    const soon = l.endsAt && l.endsAt - Date.now() < 3600e3;
    el.querySelector('.loc').innerHTML = siteTag(l) +
      (l.site === 'fbgroup' ? `${esc(l.location)} · ` : '') +
      (l.bids != null ? `<span class="bids">${l.bids} bid${l.bids === 1 ? '' : 's'}</span> · ` : '') +
      `<span class="${soon ? 'soon' : ''}" title="${esc(l.endText)}">${timeLeft(l.endsAt)}</span> · ` +
      (l.pickupOnly ? `pickup${l.location ? ' in ' + esc(l.location) : ''}` : l.site === 'fbgroup' ? 'shipping per post'
        : l.ship == null ? 'shipping not listed' : l.ship ? `+${money(l.ship)} shipping` : 'free shipping') +
      (l.premium ? ` · +${Math.round(l.premium * 100)}% buyer's premium` : '') +
      (l.needsCheck ? ' · <span class="check" title="Read from a free-form post: double-check the high bid and end time">check post</span>' : '');
    el.querySelector('.ask').textContent = money(l.price);
    el.querySelector('.old').textContent = '';
    el.querySelector('.l1').textContent = 'Max bid';
    el.querySelector('.l2').textContent = 'Profit @ max';
    el.querySelector('.l3').textContent = 'Profit now';
    el.querySelector('.offer').textContent = p ? money(p.maxBid) : '…';
    el.querySelector('.max').textContent = p ? signed(p.profitAtMax) : '…';
    pr.textContent = p ? signed(p.profitNow) : '…';
    pr.className = 'profit ' + (p && p.profitNow != null ? (p.profitNow >= 0 ? 'pos' : 'neg') : '');
  } else {
    el.querySelector('.loc').innerHTML = siteTag(l) + esc(l.location + (l.extra && l.site !== 'fbgroup' ? ' · ' + l.extra : ''));
    el.querySelector('.ask').textContent = l.price === 0 ? 'Free' : money(l.price);
    el.querySelector('.old').textContent = l.oldPrice ? money(l.oldPrice) : '';
    el.querySelector('.l1').textContent = 'Offer';
    el.querySelector('.l2').textContent = 'Max pay';
    el.querySelector('.l3').textContent = 'Profit';
    el.querySelector('.offer').textContent = p ? money(p.offer) : '…';
    el.querySelector('.max').textContent = p ? money(p.maxPay) : '…';
    pr.textContent = p ? signed(p.profit) : '…';
    pr.className = 'profit ' + (p && p.profit != null ? (p.profit >= 0 ? 'pos' : 'neg') : '');
  }

  // Cards the automatic pass couldn't price (or didn't reach) can be looked up one at a time.
  const btn = el.querySelector('.lookup');
  btn.hidden = !p || !!es || p.looked || (p.value != null && p.refined);
  if (!btn.hidden && !btn.disabled) btn.textContent = p.value == null ? 'Look up price on eBay' : 'Get exact price from eBay';
  btn.onclick = async () => {
    btn.disabled = true;
    btn.textContent = 'Looking up…';
    const r = await api('lookup?id=' + encodeURIComponent(l.id), {});
    btn.disabled = false;
    if (r.id) { it.p = { ...r, looked: true, ...(r.value == null ? { label: 'No matches on eBay' } : {}) }; render(); }
    else btn.textContent = r.error || 'Try again';
  };

  const det = el.querySelector('.comps');
  if (p && p.examples && p.examples.length) {
    det.hidden = false;
    det.querySelector('summary').textContent =
      (p.sixMonth ? `6-month eBay average from ${p.sixMonth.count.toLocaleString()} sold · ${p.confidence} confidence`
        : p.partsGuess ? `For parts: guessed at ~⅓ of ${p.comps} working one${p.comps === 1 ? '' : 's'} · low confidence`
        : `Based on ${p.comps} similar item${p.comps === 1 ? '' : 's'} · ${p.confidence} confidence`) + (p.refined || !es ? '' : ' (checking eBay…)');
    const key = p.examples.map(e => e.url).join('|') + p.comps;
    if (det.dataset.key !== key) {
      det.dataset.key = key;
      det.querySelector('ul').innerHTML = p.examples.map(e =>
        `<li><span class="s">${SRC[e.source] || e.source}</span><span class="p">${money(e.price)}</span><a href="${esc(e.url)}" target="_blank" rel="noopener" title="${esc(e.title)}">${esc(e.title)}</a></li>`).join('');
    }
  } else {
    det.hidden = !p;
    det.querySelector('summary').textContent = p ? 'No matching items found on other sites' : '';
    det.querySelector('ul').innerHTML = '';
  }
}

function siteTag(l) {
  if (l.site === 'kbid') return '<span class="site">K-BID</span> ';
  if (l.site === 'fbgroup') return '<span class="site fbg">FB Group</span> ';
  return l.kind === 'auction' ? '<span class="site ebay">eBay</span> ' : '';
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
