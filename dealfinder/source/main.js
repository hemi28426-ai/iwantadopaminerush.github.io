// Deal Finder: Facebook Marketplace listings near you, priced against eBay, Mercari, OfferUp and Amazon.
// The UI is a plain web page served on localhost, so it opens in this app window or in any browser.
const { app, BrowserWindow, session, shell, Notification } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { SITES, scrapePage, parseFacebook } = require('./scrapers');
const P = require('./pricing');
const G = require('./groups');

const PORT = 47125;
const COMP_SOURCES = ['ebaySold', 'ebayActive', 'mercariSold', 'offerup', 'amazon'];
const LOGINS = {
  facebook: 'https://www.facebook.com/login',
  ebay: 'https://signin.ebay.com/ws/eBayISAPI.dll?SignIn',
};

let ses, mainWin, origin;
// refineCount: how many listings get their own eBay lookup. It runs in the background, so it covers everything.
let settings = { zip: '', radius: 125, maxListings: 60, refineCount: 300, fbCity: '', mode: 'both', fbGroups: [], watches: [], scanTerms: [] };
const lastUrls = {};
const lastState = {};

const userFile = name => path.join(app.getPath('userData'), name);
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };

// ---------- small helpers ----------

function limiter(n) {
  let active = 0;
  const q = [];
  const next = () => {
    if (active >= n || !q.length) return;
    active++;
    const { fn, res, rej } = q.shift();
    fn().then(res, rej).finally(() => { active--; next(); });
  };
  return fn => new Promise((res, rej) => { q.push({ fn, res, rej }); next(); });
}
const pagePool = limiter(4);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// eBay throws its error page at bursts of searches, so its pages go one at a time with a gap.
const hostGates = {};
function gate(host) {
  if (!host) return fn => fn();
  if (!hostGates[host]) {
    const one = limiter(1);
    hostGates[host] = fn => one(async () => { try { return await fn(); } finally { await sleep(800); } });
  }
  return hostGates[host];
}

async function fetchSite(id, url, opts) {
  const site = SITES[id];
  const load = () => gate(site.host)(() => pagePool(() => scrapePage(ses, url, site.extract, opts)));
  let r = await load();
  // eBay sometimes throws a one-off captcha; a second try a few seconds later usually gets through.
  // (A sign-in redirect is real: sold prices need the user signed in, so don't retry that.)
  const flakyBlock = r.blocked && site.host === 'ebay' && !/signin/i.test(r.url || '');
  if (flakyBlock || (!r.items.length && !r.blocked && /error page|something went wrong/i.test(r.title || ''))) {
    await sleep(4000);
    r = await load();
  }
  return r;
}

const STATES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut',
  DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
  NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah',
  VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

let geoCache = {}, geoSaveTimer;
async function geocode(place) {
  place = String(place || '').split('·')[0].trim();
  const key = place.toLowerCase();
  if (!key) return null;
  if (key in geoCache) return geoCache[key];
  let name = place, state = null;
  const m = place.match(/^(.+?),\s*(.+)$/);
  if (m) { name = m[1].trim(); state = STATES[m[2].trim().toUpperCase()] || m[2].trim(); }
  let hit = null;
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=10&language=en&format=json&countryCode=US`;
    const j = await fetch(url).then(r => r.json());
    const rs = (j && j.results) || [];
    hit = state ? rs.find(r => r.admin1 && r.admin1.toLowerCase() === state.toLowerCase()) : rs[0];
  } catch { return null; } // offline: don't cache
  geoCache[key] = hit ? { lat: hit.latitude, lon: hit.longitude, label: `${hit.name}, ${hit.admin1}` } : null;
  clearTimeout(geoSaveTimer);
  geoSaveTimer = setTimeout(() => fs.writeFile(userFile('geocache.json'), JSON.stringify(geoCache), () => {}), 2000);
  return geoCache[key];
}

function miles(a, b) {
  const R = 3958.8, rad = x => x * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

async function loginStatus() {
  const fb = await ses.cookies.get({ url: 'https://www.facebook.com', name: 'c_user' }).catch(() => []);
  return { facebook: fb.length > 0, ebaySold: lastState.ebaySold || 'unknown' };
}

// ---------- the search ----------

let searchSeq = 0;
let quitting = false;

// bg: a background run (watched searches). It doesn't cancel or replace the user's own search, and only looks up
// listings bg.isNew(listing) says are new.
async function runSearch(params, emit, bg = null) {
  const mySeq = bg ? 0 : ++searchSeq;
  const cancelled = bg ? () => quitting : () => mySeq !== searchSeq;
  const q = String(params.q || '').trim();
  const radius = +params.radius || settings.radius;
  const zip = (params.zip || settings.zip || '').trim();
  const o = { ...settings, radius, zip, minPrice: params.min || '', maxPrice: params.max || '', newest: !!bg };
  const mode = params.mode || 'both';
  const comps = [];
  const srcEvent = (id, state, extra = {}) => { lastState[id] = state; emit('source', { id, name: SITES[id].name, state, ...extra }); };

  // Facebook Marketplace first (it's queued first, so it gets a page slot right away).
  let fbP = Promise.resolve({ listings: [], area: '' });
  if (mode !== 'auctions') {
    srcEvent('facebook', 'loading');
    const fbUrl = SITES.facebook.url(q, o);
    lastUrls.facebook = fbUrl;
    fbP = fetchSite('facebook', fbUrl, {
      scrolls: Math.ceil(settings.maxListings / 20), timeout: 45000, isCancelled: cancelled,
    }).then(r => {
      const listings = parseFacebook(r.items || []).slice(0, settings.maxListings);
      srcEvent('facebook', r.blocked ? 'blocked' : listings.length ? 'ok' : 'empty', { count: listings.length, url: r.url || fbUrl });
      if (!cancelled()) emit('listings', { listings, area: r.area || '' }); // show right away
      return { listings, area: r.area || '' };
    }).catch(e => { srcEvent('facebook', 'error', { msg: e.message }); return { listings: [], area: '' }; });
  }

  // eBay auctions near the ZIP (eBay filters by distance itself).
  let aucP = Promise.resolve([]);
  if (mode !== 'marketplace' && zip) {
    srcEvent('ebayAuctions', 'loading');
    const url = SITES.ebayAuctions.url(q, o);
    lastUrls.ebayAuctions = url;
    aucP = fetchSite('ebayAuctions', url, { isCancelled: cancelled }).then(r => {
      // eBay pads the results with items from farther away; keep only ones inside the radius.
      const auctions = SITES.ebayAuctions.parse(r.items || []).filter(a => a.miles == null || a.miles <= radius).slice(0, settings.maxListings);
      srcEvent('ebayAuctions', r.blocked ? 'blocked' : auctions.length ? 'ok' : 'empty', { count: auctions.length, url: r.url || url });
      if (auctions.length && !cancelled()) emit('listings', { listings: auctions }); // show right away
      return auctions;
    }).catch(e => { srcEvent('ebayAuctions', 'error', { msg: e.message }); return []; });
  }

  // K-BID auctions near the ZIP (Midwest estate / consignment auctions). Up to 3 pages.
  let kbidP = Promise.resolve([]);
  if (mode !== 'marketplace' && zip) {
    srcEvent('kbid', 'loading');
    lastUrls.kbid = SITES.kbid.url(q, o);
    kbidP = (async () => {
      let lots = [], blocked = false;
      for (let page = 1; page <= 3; page++) {
        const r = await fetchSite('kbid', SITES.kbid.url(q, o, page), { isCancelled: cancelled, settle: 6000 });
        blocked = r.blocked;
        lots = lots.concat(SITES.kbid.parse(r.items || []));
        if (!r.items || !r.items.length || lots.length >= (r.total || 0)) break;
      }
      lots = lots.filter(l => l.miles == null || l.miles <= radius).slice(0, settings.maxListings);
      await Promise.all(lots.map(async l => { l.premium = await kbidPremium(l.auctionId); }));
      srcEvent('kbid', blocked ? 'blocked' : lots.length ? 'ok' : 'empty', { count: lots.length });
      if (lots.length && !cancelled()) emit('listings', { listings: lots }); // show right away
      return lots;
    })().catch(e => { srcEvent('kbid', 'error', { msg: e.message }); return []; });
  }

  // Facebook groups the user listed: comment auctions and for-sale posts matching the search (needs Facebook sign-in).
  // Posts show up one by one as they're read; once prices exist, each new one is priced on arrival.
  const groupItems = [];
  let onGroupItem = null;
  const groupsP = (async () => {
    const gids = (settings.fbGroups || []).map(G.groupId).filter(Boolean).slice(0, 10);
    if (!gids.length) return;
    const gEvent = (state, extra = {}) => { lastState.fbgroups = state; emit('source', { id: 'fbgroups', name: 'FB groups', state, ...extra }); };
    if (!(await loginStatus()).facebook) { lastUrls.fbgroups = LOGINS.facebook; gEvent('blocked'); return; }
    gEvent('loading');
    const fbGate = gate('facebook');
    const load = (url, extract) => fbGate(() => pagePool(() =>
      scrapePage(ses, url, extract, { isCancelled: cancelled, scrolls: 1, settle: 8000, timeout: 20000 }))).catch(() => ({ items: [] }));
    let found = 0;
    for (const gid of gids) {
      if (cancelled()) return;
      const s = await load(`https://www.facebook.com/groups/${encodeURIComponent(gid)}/search/?q=${encodeURIComponent(q)}`, `(${G.groupSearchExtract})()`);
      if (s.blocked) { lastUrls.fbgroups = s.url; gEvent('blocked'); return; }
      for (const { url } of (s.items || []).slice(0, 8)) {
        if (cancelled()) return;
        const r = await load(url, `(${G.groupPostExtract})()`);
        const post = (r.items || [])[0];
        const l = post && G.parseGroupPost({ ...post, url, group: s.group });
        // Skip finished auctions, and auctions / for-sale posts the chosen "Find" mode leaves out.
        if (!l || l.ended || (l.kind === 'auction' ? mode === 'marketplace' : mode === 'auctions')) continue;
        groupItems.push(l);
        emit('listings', { listings: [l] });
        if (onGroupItem) onGroupItem(l);
        gEvent('loading', { count: ++found });
      }
    }
    gEvent(found ? 'ok' : 'empty', { count: found });
  })().catch(e => emit('source', { id: 'fbgroups', name: 'FB groups', state: 'error', msg: e.message }));

  // 6 months of eBay sold prices for the search as a whole (needs eBay sign-in). Tells us if per-item lookups can use it.
  srcEvent('terapeak', 'loading');
  lastUrls.terapeak = SITES.terapeak.url(q);
  const sixP = fetchSite('terapeak', SITES.terapeak.url(q), { isCancelled: cancelled, settle: 12000 }).then(r => {
    const six = (r.items || [])[0] || null;
    srcEvent('terapeak', r.blocked ? 'blocked' : six && six.avg ? 'ok' : 'empty', six && six.count ? { count: six.count } : {});
    return { six, usable: !r.blocked && !!six, signedOut: r.blocked && /signin/i.test(r.url || '') };
  }).catch(() => { srcEvent('terapeak', 'error', {}); return { six: null, usable: false }; });

  const compPs = COMP_SOURCES.map(id => {
    srcEvent(id, 'loading');
    const url = SITES[id].url(q);
    lastUrls[id] = url;
    // Sold prices need eBay sign-in too: if Terapeak just bounced to sign-in, don't wait on eBay to say so again.
    const load = id === 'ebaySold'
      ? sixP.then(s => s.signedOut ? { items: [], blocked: true, url } : fetchSite(id, url, { isCancelled: cancelled }))
      : fetchSite(id, url, { isCancelled: cancelled });
    return load.then(r => {
      const items = SITES[id].parse(r.items || [], id);
      comps.push(...items);
      srcEvent(id, r.blocked ? 'blocked' : items.length ? 'ok' : 'empty', { count: items.length, url: r.url || url });
      return items;
    }).catch(e => { srcEvent(id, 'error', { msg: e.message }); return []; });
  });

  const [ebayAucs, kbidLots] = await Promise.all([aucP, kbidP]);
  if (cancelled()) return;
  const auctions = ebayAucs.concat(kbidLots);
  const { listings: fbListings, area } = await fbP;
  if (cancelled()) return;
  for (const l of fbListings) comps.push({ source: 'facebook', title: l.title, price: l.price, url: l.url });
  const listings = auctions.concat(fbListings);
  const takeGroupItems = () => { const got = groupItems.splice(0); listings.push(...got); return got; };

  // Distances, in the background.
  const distancesP = (async () => {
    const center = (zip && await geocode(zip)) || (area && await geocode(area));
    if (!center) { emit('center', { label: null }); return; }
    emit('center', { label: zip ? `${zip} (${center.label})` : center.label });
    for (const l of fbListings) {
      if (cancelled()) return;
      const g = await geocode(l.location);
      emit('distance', { id: l.id, miles: g ? miles(center, g) : null });
    }
  })();

  // Price with whatever comps are in by 20s; slower sites still count once they arrive (comps is shared).
  const allComps = Promise.all(compPs);
  const late = await Promise.race([allComps.then(() => false), sleep(20000).then(() => true)]);
  const { six: marketSix, usable: sixOk } = await sixP;
  if (cancelled()) return;

  // Market summary for the search as a whole, then a quick price for every listing.
  // Asking prices anchor the "not an accessory" filter; auction bids start at $1, so they can't.
  const market = withSix(P.priceListing({ title: q, anchor: P.median(fbListings.map(l => l.price).filter(p => p > 0)) }, comps), marketSix);
  emit('market', { q, ...market, advice: null });
  takeGroupItems();
  const ctx = {
    comps, cache: new Map(), cancelled, quick: {}, refined: new Set(),
    byId: new Map(listings.map(l => [l.id, l])),
    // Best price history available: 6 months of sold (Terapeak) > 90 days sold > current Buy It Now prices.
    source: sixOk ? 'terapeak' : lastState.ebaySold === 'ok' ? 'ebaySold' : 'ebayActive',
  };
  if (!bg) current = ctx;
  for (const l of listings) emit('priced', priceOne(ctx, l));
  // Group posts read from now on: price on arrival, then look them up like the rest.
  onGroupItem = async l => {
    takeGroupItems();
    ctx.byId.set(l.id, l);
    emit('priced', priceOne(ctx, l));
    const found = await lookupComps(ctx, l);
    if (found !== 'blocked' && !cancelled() && (found.length || found.six)) emit('priced', priceOne(ctx, l, found));
  };
  // Everything has a first price now: the search counts as done, and sharper prices keep arriving in the background.
  emit('ready', {});
  if (late) allComps.then(() => {
    if (cancelled()) return;
    for (const l of listings) if (!ctx.refined.has(l.id)) emit('priced', priceOne(ctx, l));
  });

  // Then look listings up on eBay by their own titles for a sharper price:
  // auctions ending in the next day first (soonest first), then the likeliest deals.
  const qn = P.searchPhrase(q);
  const soon = l => l.kind === 'auction' && !!l.endsAt && l.endsAt - Date.now() < 864e5;
  const todo = listings.filter(l => { const ph = P.searchPhrase(l.title, l.cond); return ph && ph !== qn && (!bg || bg.isNew(l)); })
    .sort((a, b) => (soon(b) - soon(a)) || (soon(a) ? a.endsAt - b.endsAt : ctx.quick[a.id] - ctx.quick[b.id]))
    .slice(0, settings.refineCount);
  let done = 0;
  for (const l of todo) {
    if (cancelled()) return;
    emit('status', { msg: `Getting exact prices in the background (${SITES[ctx.source].name})… ${++done}/${todo.length}. You can search again anytime.` });
    const found = await lookupComps(ctx, l);
    if (found === 'blocked') break; // eBay wants a captcha now; stop rather than hammer it
    if (cancelled()) return;
    if (found.length || found.six) emit('priced', priceOne(ctx, l, found));
  }
  await distancesP;
  await groupsP;
  if (!cancelled()) emit('done', {});
}

// ---------- deal scanner ----------
// No site will list "everything near you" (empty searches return nothing on Facebook, eBay and K-BID, and Facebook's
// category pages ignore the radius), so the scanner sweeps searches covering every kind of thing people sell —
// Marketplace (newest first), eBay auctions and K-BID auctions for each — at the full radius, and ranks it all.
const SCAN_TERMS = [
  // electronics & games
  'ps5', 'ps4', 'xbox', 'nintendo switch', 'video games', 'iphone', 'samsung galaxy', 'ipad', 'macbook', 'laptop',
  'gaming pc', 'graphics card', 'monitor', 'tv', 'projector', 'speakers', 'airpods', 'apple watch', 'camera', 'drone', 'vr headset',
  // tools & shop
  'dewalt', 'milwaukee', 'makita', 'ryobi', 'snap on', 'craftsman', 'tool box', 'welder', 'air compressor', 'table saw',
  'generator', 'pressure washer', 'ladder', 'power tools',
  // yard & outdoor
  'chainsaw', 'snowblower', 'lawn mower', 'riding mower', 'leaf blower', 'grill', 'smoker', 'trailer', 'atv', 'boat',
  'kayak', 'fishing', 'hunting', 'camping', 'mountain bike', 'golf clubs', 'treadmill', 'weights',
  // home
  'couch', 'sectional', 'recliner', 'dresser', 'dining table', 'desk', 'bed frame', 'mattress', 'washer dryer',
  'refrigerator', 'kitchenaid', 'vacuum', 'dyson', 'rug', 'lamp',
  // collectibles & more
  'pokemon', 'sports cards', 'lego', 'hot wheels', 'coins', 'antique', 'vintage', 'vinyl records', 'guitar', 'amp',
  'jewelry', 'watch', 'jordans', 'purse', 'yeti', 'baby stroller', 'kids toys', 'piano', 'drum set',
];

async function runScan(params, emit) {
  const mySeq = ++searchSeq;
  const cancelled = () => mySeq !== searchSeq;
  const radius = +params.radius || settings.radius;
  const zip = (params.zip || settings.zip || '').trim();
  const o = { ...settings, radius, zip, newest: true };
  const terms = settings.scanTerms && settings.scanTerms.length ? settings.scanTerms : SCAN_TERMS;
  const ctx = current = {
    comps: [], cache: new Map(), cancelled, quick: {}, refined: new Set(), byId: new Map(),
    source: lastState.ebaySold === 'ok' ? 'ebaySold' : 'ebayActive',
  };
  const center = zip ? await geocode(zip) : null;
  if (center) emit('center', { label: `${zip} (${center.label})` });
  emit('source', { id: 'scan', name: 'Deal scan', state: 'loading' });
  const all = [];
  let n = 0;
  for (const term of terms) {
    if (cancelled()) return;
    emit('status', { msg: `Scanning everything near you: "${term}" (${++n}/${terms.length}) · ${all.length} items so far…` });
    // Each sweep: newest Marketplace listings, eBay auctions and K-BID auctions for the term, plus eBay prices to judge them by.
    const none = { items: [] };
    const [fb, cr, eba, kb] = await Promise.all([
      fetchSite('facebook', SITES.facebook.url(term, o), { scrolls: 2, timeout: 30000, isCancelled: cancelled }).catch(() => none),
      fetchSite(ctx.source, SITES[ctx.source].url(term), { isCancelled: cancelled }).catch(() => none),
      fetchSite('ebayAuctions', SITES.ebayAuctions.url(term, o), { isCancelled: cancelled }).catch(() => none),
      fetchSite('kbid', SITES.kbid.url(term, o), { isCancelled: cancelled, settle: 6000 }).catch(() => none),
    ]);
    if (cancelled()) return;
    const found = parseFacebook(fb.items || []);
    ctx.comps.push(...SITES[ctx.source].parse(cr.items || [], ctx.source));
    for (const l of found) ctx.comps.push({ source: 'facebook', title: l.title, price: l.price, url: l.url });
    const lots = SITES.kbid.parse(kb.items || []);
    await Promise.all(lots.map(async l => { l.premium = await kbidPremium(l.auctionId); }));
    const fresh = [
      ...found.filter(l => !l.shipsOnly && l.price >= 20),
      ...SITES.ebayAuctions.parse(eba.items || []).concat(lots).filter(a => a.miles != null && a.miles <= radius),
    ].filter(l => !ctx.byId.has(l.id));
    if (!fresh.length) continue;
    for (const l of fresh) { ctx.byId.set(l.id, l); all.push(l); }
    emit('listings', { listings: fresh, scan: true });
    for (const l of fresh) emit('priced', priceOne(ctx, l));
    if (center) for (const l of fresh.filter(x => x.kind === 'fb')) {
      const g = await geocode(l.location);
      l.miles = g ? miles(center, g) : null;
      emit('distance', { id: l.id, miles: l.miles });
    }
  }
  emit('source', { id: 'scan', name: 'Deal scan', state: 'ok', count: all.length });
  emit('ready', {});

  // Double-check the most promising ones on eBay by their own titles.
  const todo = all.filter(l => (l.miles == null || l.miles <= radius) && (ctx.quick[l.id] ?? 9) < 0.95)
    .sort((a, b) => ctx.quick[a.id] - ctx.quick[b.id]).slice(0, 80);
  let done = 0;
  for (const l of todo) {
    if (cancelled()) return;
    emit('status', { msg: `Scanned ${all.length} listings. Double-checking the best ones on eBay… ${++done}/${todo.length}. You can search again anytime.` });
    const found = await lookupComps(ctx, l);
    if (found === 'blocked') break;
    if (cancelled()) return;
    if (found.length || found.six) emit('priced', priceOne(ctx, l, found));
  }
  if (!cancelled()) emit('done', {});
}

// ---------- watched searches ----------
// Every 10 minutes (while the app is open) each saved search runs in the background, newest first. A new listing
// that prices as a deal raises a Windows notification and lands in Alerts. The first run only learns what's there.
const DEAL_VERDICTS = new Set(['steal', 'great', 'good']);
let alerts = [], watchSeen = {}, watchBusy = false, openAlertsNext = false;
const watchKey = w => [w.q, w.zip, w.radius, w.mode].join('|').toLowerCase();
const money = n => '$' + Math.round(n).toLocaleString();

async function runWatches() {
  if (watchBusy || quitting || !settings.watches.length) return;
  watchBusy = true;
  try {
    for (const w of settings.watches) {
      if (quitting) break;
      const key = watchKey(w);
      const first = !watchSeen[key];
      const seen = new Set(watchSeen[key] || []);
      const listings = new Map(), priced = new Map();
      await runSearch({ ...w }, (ev, d) => {
        if (ev === 'listings') for (const l of d.listings) listings.set(l.id, l);
        else if (ev === 'priced') priced.set(d.id, d);
        else if (ev === 'distance' && listings.has(d.id)) listings.get(d.id).miles = d.miles;
      }, { isNew: l => !first && !seen.has(l.id) });
      const fresh = [...listings.values()].filter(l => !seen.has(l.id));
      if (!first) for (const l of fresh) {
        const p = priced.get(l.id);
        if (!p || !DEAL_VERDICTS.has(p.verdict) || (l.miles != null && l.miles > (+w.radius || settings.radius))) continue;
        addAlert({ watch: w.q, title: l.title, price: l.price, kind: l.kind, site: l.site, value: p.value,
          offer: l.kind === 'auction' ? p.maxBid : p.offer, label: p.label, url: l.url, img: l.img, miles: l.miles });
      }
      watchSeen[key] = [...seen, ...fresh.map(l => l.id)].slice(-3000);
    }
    fs.writeFile(userFile('watch-seen.json'), JSON.stringify(watchSeen), () => {});
  } catch (e) {
    console.error('watch run failed', e);
  } finally {
    watchBusy = false;
  }
}

function addAlert(a) {
  alerts.unshift({ ...a, at: Date.now(), unread: true });
  alerts = alerts.slice(0, 100);
  fs.writeFile(userFile('alerts.json'), JSON.stringify(alerts), () => {});
  if (!Notification.isSupported()) return;
  const n = new Notification({
    title: `Deal: ${a.title}`.slice(0, 90),
    body: `${money(a.price)} · worth ~${money(a.value)} · ${a.label} (watching "${a.watch}")`,
  });
  n.on('click', () => { openAlertsNext = true; if (mainWin) { if (mainWin.isMinimized()) mainWin.restore(); mainWin.show(); mainWin.focus(); } });
  n.show();
}

// K-BID buyer's premium is set per auction ("Buyer's Premium  Cap  15.00%  $1,500.00" on the auction page).
const premiums = new Map();
function kbidPremium(auctionId) {
  if (!auctionId) return Promise.resolve(0);
  if (!premiums.has(auctionId)) {
    premiums.set(auctionId, ses.fetch(`https://www.k-bid.com/auction/${auctionId}`).then(r => r.text()).then(html => {
      const text = html.replace(/<[^>]+>/g, ' ').replace(/&#0?39;|&apos;/g, "'").replace(/\s+/g, ' ');
      const m = text.match(/Buyer'?s Premium[^%]{0,60}?([\d.]+)\s*%/i);
      return m ? +m[1] / 100 : 0;
    }).catch(() => 0));
  }
  return premiums.get(auctionId);
}

// Use the 6-month eBay average sold price as the value when there's enough sales behind it.
function withSix(est, six) {
  if (!six || !six.avg || !(six.count >= 3)) return est;
  return { ...est, value: Math.round(six.avg),
    sixMonth: { avg: Math.round(six.avg), count: six.count, min: six.min != null ? Math.round(six.min) : null, max: six.max != null ? Math.round(six.max) : null },
    confidence: six.count >= 10 ? 'high' : 'medium', comps: Math.max(est.comps || 0, six.count) };
}

// The latest search's comps and listings, kept so a single card can be looked up on demand.
let current = null;

// found: comps from a per-item lookup (an array), optionally carrying .six = that item's 6-month eBay average.
function priceOne(ctx, l, found = []) {
  const seen = new Set(ctx.comps.map(c => c.url));
  const all = found.length ? ctx.comps.concat(found.filter(c => !seen.has(c.url))) : ctx.comps;
  let est = l.kind === 'auction'
    // An opening $1 bid says nothing, but once 3+ people are bidding the current bid is real evidence of value.
    ? P.priceListing({ title: l.title, cond: l.cond, url: l.url, anchor: l.bids >= 3 ? l.price : 0 }, all)
    : P.priceListing(l, all);
  est = withSix(est, found.six);
  const adv = l.kind === 'auction' ? P.adviseAuction(l.price, l.ship || 0, est, l.premium || 0) : P.advise(l.price, est);
  ctx.quick[l.id] = adv.ratio ?? 9;
  const refined = found.length > 0 || !!found.six;
  if (refined && ctx.refined) ctx.refined.add(l.id);
  return { id: l.id, ...est, ...adv, refined };
}

// Look a listing up by its title; if nothing matches, retry with shorter phrases.
async function lookupComps(ctx, l) {
  const phrase = P.searchPhrase(l.title, l.cond);
  if (!phrase) return [];
  let found = await lookupPhrase(ctx, phrase);
  for (const alt of P.fallbackPhrases(l.title, l.cond)) {
    if (found === 'blocked' || ctx.cancelled() || usable(ctx, l, found)) break;
    found = await lookupPhrase(ctx, alt);
  }
  return found;
}

// Found something that actually prices this listing (not just unrelated results)?
function usable(ctx, l, found) {
  if (found.six) return !!found.six.avg;
  if (!found.length) return false;
  return priceOne({ ...ctx, quick: {}, refined: null }, l, found).value != null;
}

async function lookupPhrase(ctx, phrase) {
  if (!ctx.cache.has(phrase)) {
    const src = SITES[ctx.source];
    const r = await fetchSite(ctx.source, src.url(phrase), { isCancelled: ctx.cancelled, timeout: 20000, settle: 12000 }).catch(() => ({ items: [] }));
    if (r.blocked) return 'blocked';
    let found;
    if (ctx.source === 'terapeak') { found = []; found.six = (r.items || [])[0] || null; }
    else found = src.parse(r.items || [], ctx.source);
    ctx.cache.set(phrase, found);
  }
  return ctx.cache.get(phrase);
}

// ---------- local web server (the UI and its API) ----------

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };

function json(res, obj, code = 200) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise(r => { let b = ''; req.on('data', d => b += d); req.on('end', () => { try { r(JSON.parse(b || '{}')); } catch { r({}); } }); });
}

function openWindow(url, title) {
  const w = new BrowserWindow({ width: 1100, height: 850, title, autoHideMenuBar: true, webPreferences: { session: ses } });
  w.webContents.setWindowOpenHandler(({ url }) => { w.loadURL(url); return { action: 'deny' }; });
  // Reload past eBay's random "SORRY, something went wrong" page so the user never has to.
  let reloads = 0;
  w.webContents.on('page-title-updated', (e, title) => {
    if (!/^error page|something went wrong/i.test(title)) { reloads = 0; return; }
    if (reloads++ < 5) setTimeout(() => { if (!w.isDestroyed()) w.webContents.reload(); }, 1000 + 500 * reloads);
  });
  w.loadURL(url);
  return w;
}

async function handle(req, res) {
  // Only this app's own page may call the API (stops other websites poking localhost).
  const from = req.headers.origin;
  if (from && from !== origin && from !== origin.replace('127.0.0.1', 'localhost')) return json(res, { error: 'forbidden' }, 403);
  const u = new URL(req.url, origin);
  const p = u.pathname;

  if (p === '/api/search') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    let open = true;
    res.on('close', () => { open = false; });
    const emit = (ev, data) => { if (open) res.write(`event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`); };
    const params = Object.fromEntries(u.searchParams);
    (params.mode === 'scan' ? runScan : runSearch)(params, emit).catch(e => emit('fail', { msg: e.message })).finally(() => { if (open) res.end(); });
    return;
  }
  if (p === '/api/status') {
    const openAlerts = openAlertsNext;
    openAlertsNext = false;
    return json(res, { ...(await loginStatus()), settings, url: origin, unreadAlerts: alerts.filter(a => a.unread).length, openAlerts });
  }
  if (p === '/api/watch' && req.method === 'POST') {
    const b = await readBody(req);
    const w = { q: String(b.q || '').trim(), zip: String(b.zip || ''), radius: +b.radius || settings.radius, mode: String(b.mode || 'both') };
    if (!w.q || w.mode === 'scan') return json(res, { error: 'nothing to watch' }, 400);
    if (!settings.watches.some(x => watchKey(x) === watchKey(w))) settings.watches.push(w);
    fs.writeFileSync(userFile('settings.json'), JSON.stringify(settings, null, 2));
    setTimeout(runWatches, 5000); // learn what's there now, so only newer listings alert
    return json(res, settings.watches);
  }
  if (p === '/api/unwatch' && req.method === 'POST') {
    settings.watches.splice(+u.searchParams.get('i'), 1);
    fs.writeFileSync(userFile('settings.json'), JSON.stringify(settings, null, 2));
    return json(res, settings.watches);
  }
  if (p === '/api/alerts') return json(res, alerts);
  if (p === '/api/alerts/read' && req.method === 'POST') {
    for (const a of alerts) a.unread = false;
    fs.writeFile(userFile('alerts.json'), JSON.stringify(alerts), () => {});
    return json(res, { ok: true });
  }
  if (p === '/api/settings' && req.method === 'POST') {
    const b = await readBody(req);
    for (const k of Object.keys(settings)) {
      if (!(k in b) || k === 'watches') continue; // watches change through /api/watch and /api/unwatch
      if (Array.isArray(settings[k])) settings[k] = Array.isArray(b[k]) ? b[k].map(String).filter(Boolean).slice(0, 30) : settings[k];
      else settings[k] = typeof settings[k] === 'number' ? +b[k] || settings[k] : String(b[k]);
    }
    fs.writeFileSync(userFile('settings.json'), JSON.stringify(settings, null, 2));
    return json(res, settings);
  }
  if (p === '/api/login' && req.method === 'POST') {
    const site = u.searchParams.get('site');
    if (!LOGINS[site]) return json(res, { error: 'unknown site' }, 400);
    openWindow(LOGINS[site], `Sign in to ${site}`);
    return json(res, { ok: true });
  }
  if (p === '/api/fix' && req.method === 'POST') {
    // Show a blocked page (captcha / sign-in) so the user can clear it themselves.
    const id = u.searchParams.get('id');
    if (!lastUrls[id]) return json(res, { error: 'nothing to open' }, 400);
    openWindow(lastUrls[id], SITES[id] ? SITES[id].name : id);
    return json(res, { ok: true });
  }
  if (p === '/api/lookup' && req.method === 'POST') {
    // Price one card right now (for ones the automatic pass didn't get to).
    const l = current && current.byId.get(u.searchParams.get('id'));
    if (!l) return json(res, { error: 'search again first' }, 404);
    const ctx = { ...current, cancelled: () => false };
    const extra = await lookupComps(ctx, l);
    if (extra === 'blocked') return json(res, { error: 'eBay wants a captcha: click its pill to fix' }, 409);
    return json(res, priceOne(ctx, l, extra));
  }
  if (p === '/api/open-browser' && req.method === 'POST') {
    shell.openExternal(origin + '/');
    return json(res, { ok: true });
  }

  const file = path.join(__dirname, 'ui', p === '/' ? 'index.html' : path.normalize(p).replace(/^([\\/])+/, ''));
  if (!file.startsWith(path.join(__dirname, 'ui'))) return json(res, { error: 'not found' }, 404);
  fs.readFile(file, (err, data) => {
    if (err) return json(res, { error: 'not found' }, 404);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}

function listen(port) {
  return new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => handle(req, res).catch(e => json(res, { error: e.message }, 500)));
    srv.once('error', reject);
    srv.listen(port, '127.0.0.1', () => resolve(srv.address().port));
  });
}

// ---------- app ----------

const SELFTEST = process.argv.includes('--selftest');
const DEV = process.argv.includes('--dev');
// Test and dev runs get their own profile (and dev its own port) so they never clash with the real app.
if (SELFTEST || DEV) app.setPath('userData', path.join(app.getPath('temp'), 'dealfinder-dev'));
else if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => { if (mainWin) { mainWin.show(); mainWin.focus(); } });

app.setAppUserModelId('com.landh.dealfinder'); // Windows shows notifications under this app id
app.on('before-quit', () => { quitting = true; });

app.whenReady().then(async () => {
  const saved = readJson(userFile('settings.json'), {});
  for (const k of ['zip', 'radius', 'mode', 'fbCity', 'fbGroups', 'watches', 'scanTerms']) if (k in saved) settings[k] = saved[k];
  alerts = readJson(userFile('alerts.json'), []);
  watchSeen = readJson(userFile('watch-seen.json'), {});
  geoCache = readJson(userFile('geocache.json'), {});

  ses = session.fromPartition('persist:dealfinder');
  // Look like regular Chrome, not "Electron", so sites serve their normal pages.
  ses.setUserAgent(ses.getUserAgent().replace(/\s(Electron|deal-finder|Deal Finder)\/\S+/g, ''));
  ses.setPermissionRequestHandler((wc, perm, cb) => cb(false));

  let port;
  try { port = await listen(DEV ? PORT + 1 : PORT); } catch { port = await listen(0); }
  origin = `http://127.0.0.1:${port}`;

  if (SELFTEST) return require('./selftest')(ses, { runSearch, geocode });

  mainWin = new BrowserWindow({
    width: 1400, height: 950, title: 'Deal Finder', autoHideMenuBar: true, backgroundColor: '#0f1115',
  });
  mainWin.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  mainWin.loadURL(origin + '/');
  mainWin.on('closed', () => app.quit());

  // Watched searches: first pass a minute after start, then every 10 minutes.
  setTimeout(runWatches, 60e3);
  setInterval(runWatches, 10 * 60e3);
});

// Hidden scraping windows open and close constantly; only closing the main window quits.
app.on('window-all-closed', () => {});
