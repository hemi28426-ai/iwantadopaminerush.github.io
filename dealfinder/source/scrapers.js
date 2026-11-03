// Loads pages in hidden browser windows (sharing the app's logged-in session) and pulls listings out of them.
const { BrowserWindow } = require('electron');
const { parsePrice } = require('./pricing');

const enc = encodeURIComponent;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const BLOCKED_URL = /captcha|splashui|challenge|signin\.ebay|\/login|checkpoint|\/ap\/signin|validateCaptcha/i;
const BLOCKED_TITLE = /security measure|just a moment|access denied|robot check|pardon our interruption|attention required|are you a human/i;
// eBay randomly serves this to ~1 in 3 searches; a reload usually gets the real page.
const FLAKY_TITLE = /^error page|something went wrong/i;

// ---------- in-page extractors (serialized and run inside the page) ----------

function fbExtract() {
  const out = [], seen = new Set();
  for (const a of document.querySelectorAll('a[href*="/marketplace/item/"]')) {
    const m = a.getAttribute('href').match(/\/marketplace\/item\/(\d+)/);
    if (!m || seen.has(m[1])) continue;
    const lines = (a.innerText || '').split('\n').map(s => s.trim()).filter(Boolean);
    if (lines.length < 2) continue;
    seen.add(m[1]);
    const img = a.querySelector('img');
    out.push({ id: m[1], lines, img: img ? img.src : '' });
  }
  const area = [...document.querySelectorAll('span')].map(s => s.innerText || '').find(t => /·\s*Within\s+\d+/.test(t)) || '';
  return { items: out, area: area.replace(/\s+/g, ' ').trim() };
}

function ebayExtract() {
  return [...document.querySelectorAll('li.s-card, li.s-item')].map(c => {
    const q = sel => (c.querySelector(sel) || {}).innerText || '';
    const a = c.querySelector('a[href*="/itm/"]');
    const img = c.querySelector('img');
    return {
      title: q('.s-card__title, .s-item__title'),
      price: q('.s-card__price, .s-item__price'),
      cond: q('.s-card__subtitle, .s-item__subtitle'),
      url: a ? a.href.split('?')[0] : '',
      img: img ? img.src : '',
      text: (c.innerText || '').slice(0, 800),
    };
  }).filter(x => x.title && x.price && x.url && !/shop on ebay/i.test(x.title));
}

function amazonExtract() {
  return [...document.querySelectorAll('[data-component-type="s-search-result"]')].map(c => {
    const h = c.querySelector('h2');
    const p = c.querySelector('.a-price .a-offscreen');
    const a = c.querySelector('a.a-link-normal[href*="/dp/"], h2 a, a[href*="/dp/"]');
    const img = c.querySelector('img.s-image');
    return {
      title: (h && (h.getAttribute('aria-label') || h.innerText)) || '',
      price: p ? p.textContent : '',
      url: a ? a.href.split('?')[0].split('/ref=')[0] : '',
      img: img ? img.src : '',
    };
  }).filter(x => x.title && x.price && x.url);
}

// K-BID search results: each lot starts with an <h4 id="itemTitle…"> row, followed by rows of details.
function kbidExtract() {
  const list = document.querySelector('.lot-list');
  if (!list) return { items: [] };
  const out = [];
  let cur = null;
  for (const ch of list.children) {
    const h = ch.querySelector && ch.querySelector('h4[id^="itemTitle"]');
    if (h) {
      const a = h.querySelector('a');
      cur = { id: h.id.replace('itemTitle', ''), title: h.innerText.trim(), href: a ? a.href : '', text: '', img: '' };
      out.push(cur);
      continue;
    }
    if (!cur) continue;
    cur.text += '\n' + (ch.innerText || '');
    if (!cur.img) { const im = ch.querySelector && ch.querySelector('img'); if (im) cur.img = im.src; }
  }
  // An empty result page still has the list, so return a marker instead of waiting for items forever.
  const total = +((list.innerText.match(/of\s+([\d,]+)\s+items/) || [])[1] || '0').replace(/,/g, '');
  return { items: out, total, loaded: true };
}

// eBay Terapeak (Seller Hub > Research), sold tab: the summary tiles for the chosen date range.
function terapeakExtract() {
  const t = document.body.innerText || '';
  const num = (...res) => { for (const re of res) { const m = t.match(re); if (m) return parseFloat(m[1].replace(/,/g, '')); } return null; };
  const avg = num(/Avg sold price\s*\$([\d,.]+)/i, /\$([\d,.]+)\s*Avg sold price/i);
  const count = num(/Total sold\s*([\d,]+)/i, /([\d,]+)\s*Total sold/i);
  const range = t.match(/Sold price range\s*\$([\d,.]+)\s*[-–]\s*\$([\d,.]+)/i) || t.match(/\$([\d,.]+)\s*[-–]\s*\$([\d,.]+)\s*Sold price range/i);
  const none = /no (sold )?(items|results) found|we didn't find|0 results/i.test(t);
  const n = s => parseFloat(s.replace(/,/g, ''));
  return avg != null || none ? [{ avg, count, min: range ? n(range[1]) : null, max: range ? n(range[2]) : null }] : [];
}

// Any site: find item links, climb to the card that holds a $ price, return its text.
function genericExtract(sel) {
  const out = [], seen = new Set();
  for (const a of document.querySelectorAll(sel)) {
    const url = a.href.split('?')[0];
    if (seen.has(url)) continue;
    let el = a, txt = a.innerText || '';
    for (let i = 0; i < 5 && !/\$\s?\d/.test(txt); i++) {
      if (!el.parentElement) break;
      el = el.parentElement; txt = el.innerText || '';
    }
    const label = a.getAttribute('aria-label') || a.getAttribute('title') || '';
    if (!/\$\s?\d/.test(txt + label) || txt.length > 1000) continue;
    seen.add(url);
    const img = el.querySelector('img');
    out.push({ url, text: txt, label, alt: img ? img.alt : '', img: img ? (img.currentSrc || img.src) : '' });
  }
  return out;
}

const run = (fn, ...args) => `(${fn})(${args.map(a => JSON.stringify(a)).join(',')})`;

// ---------- parsers (run in Node) ----------

function parseGeneric(items, source) {
  return items.map(it => {
    const price = parsePrice(it.label) ?? parsePrice(it.text);
    const lines = it.text.split('\n').map(s => s.trim()).filter(s => s && !/\$\s?\d/.test(s) && !/^(sold|new|free shipping|liked|like)$/i.test(s));
    let title = it.alt || it.label.replace(/,?\s*\$[\d,.]+.*$/, '') || lines.sort((a, b) => b.length - a.length)[0] || '';
    return { source, title: title.trim(), price, url: it.url, img: it.img };
  }).filter(c => c.title && c.price > 0);
}

function parseSimple(items, source) {
  return items.map(it => ({
    source,
    title: it.title.replace(/^new listing/i, '').replace(/opens in a new window or tab/ig, '').trim(),
    price: parsePrice(it.price),
    cond: it.cond || '',
    url: it.url, img: it.img,
  })).filter(c => c.title && c.price > 0);
}

// eBay auction card text has e.g. "32 bids · ", "Time left\n12m left (Today 09:12 PM)", "+$18.85 delivery", "50 mi from 75201".
function parseAuctions(items) {
  const now = Date.now();
  return parseSimple(items, 'ebayAuction').map((c, i) => {
    const t = items.find(it => it.url === c.url).text;
    // eBay writes either "12m left (Today 09:12 PM)" or "Time left\n17h 29m".
    const left = (t.match(/((?:\d+[dhms]\s*)+)left/) || t.match(/Time left\s*((?:\d+[dhms]\s*)+)/) || [])[1] || '';
    let secs = 0;
    for (const [, n, u] of left.matchAll(/(\d+)([dhms])/g)) secs += n * { d: 86400, h: 3600, m: 60, s: 1 }[u];
    const ship = /free (delivery|shipping)|free local pickup/i.test(t) ? 0 : parsePrice((t.match(/\+\$[\d,.]+\s*(delivery|shipping)/i) || [''])[0]);
    const id = (c.url.match(/\/itm\/(\d+)/) || [])[1] || String(i);
    const mi = t.match(/([\d,]+)\s*mi from/);
    return {
      id: 'e' + id,
      kind: 'auction',
      title: c.title,
      price: c.price,
      cond: c.cond,
      bids: +((t.match(/(\d+)\s+bids?/) || [])[1] || 0),
      endsAt: secs ? now + secs * 1000 : null,
      endText: (t.match(/left \(([^)]+)\)/) || [])[1] || '',
      ship,
      miles: mi ? +mi[1].replace(/,/g, '') : null,
      pickupOnly: /local pickup/i.test(t) && !/delivery|shipping/i.test(t),
      location: (t.match(/[\d,]+\s*mi from \S+/) || [''])[0],
      img: c.img,
      url: c.url,
    };
  });
}

// K-BID lot text has "Current Bid:\n$210.00", "Time Remaining:\n1d 21h 33m" (also "1w 1d"),
// "Lake Lillian, MN | 111.50 miles from 57223". K-BID is pickup only.
function parseKbid(items) {
  const now = Date.now();
  return items.map(it => {
    const t = it.text;
    const left = (t.match(/Time Remaining:\s*((?:\d+[wdhms]\s*)+)/) || [])[1] || '';
    let secs = 0;
    for (const [, n, u] of left.matchAll(/(\d+)([wdhms])/g)) secs += n * { w: 604800, d: 86400, h: 3600, m: 60, s: 1 }[u];
    const mi = t.match(/([\d,.]+)\s*miles from/);
    const close = t.match(/Begins Closing:\s*([^\n]+)\n\s*([^\n]+)/);
    return {
      id: 'k' + it.id,
      kind: 'auction',
      site: 'kbid',
      title: it.title,
      price: parsePrice((t.match(/Current Bid:\s*(\$[\d,.]+)/) || [])[1]) ?? 0,
      bids: null,
      endsAt: secs ? now + secs * 1000 : null,
      endText: close ? `${close[1]} ${close[2]}`.trim() : '',
      ship: 0,
      pickupOnly: true,
      miles: mi ? Math.round(+mi[1].replace(/,/g, '')) : null,
      location: ((t.match(/\n\s*([^\n|]+?)\s*\|\s*[\d,.]+\s*miles from/) || [])[1] || '').trim(),
      auctionId: (it.href.match(/auction\/(\d+)/) || [])[1],
      img: it.img,
      url: it.href,
    };
  }).filter(l => l.title && l.url);
}

// FB card lines look like ["$1,300", "$1,500", "Sony PlayStation 5 Pro", "San Francisco, CA", ...]
function parseFacebook(items) {
  const isPrice = s => /^(free|\$|us\$|ca\$)/i.test(s);
  return items.map(it => {
    const prices = [];
    let i = 0;
    // Skip badges in front of the price ("Just listed", "Partner listing").
    while (i < 2 && i < it.lines.length && !isPrice(it.lines[i])) i++;
    while (i < it.lines.length && isPrice(it.lines[i])) prices.push(parsePrice(it.lines[i++]));
    const title = it.lines[i++] || '';
    const location = it.lines[i++] || '';
    return {
      id: it.id,
      kind: 'fb',
      title,
      price: prices.length ? prices[0] : null,
      oldPrice: prices.length > 1 && prices[1] > prices[0] ? prices[1] : null,
      location,
      // "Ships to you" listings aren't local pickups; the scanner leaves them out.
      shipsOnly: /^ships to you$/i.test(location),
      extra: it.lines.slice(i).join(' · '),
      img: it.img,
      url: `https://www.facebook.com/marketplace/item/${it.id}/`,
    };
  }).filter(l => l.title && l.price != null);
}

// ---------- sites ----------

const SITES = {
  facebook: {
    name: 'Facebook',
    url: (q, o) => {
      // /marketplace/search/ drops signed-out users in San Francisco; /marketplace/category/search/ uses their real
      // location (signed in: the location set on their Facebook account).
      const base = o.fbCity ? `https://www.facebook.com/marketplace/${enc(o.fbCity)}/search/` : 'https://www.facebook.com/marketplace/category/search/';
      const p = new URLSearchParams({ query: q, exact: 'false', radius: String(Math.ceil((o.radius || 125) * 1.609)) });
      if (o.newest) p.set('sortBy', 'creation_time_descend');
      if (o.minPrice) p.set('minPrice', o.minPrice);
      if (o.maxPrice) p.set('maxPrice', o.maxPrice);
      return `${base}?${p}`;
    },
    extract: run(fbExtract),
    scrolls: 4,
  },
  ebaySold: {
    name: 'eBay sold', host: 'ebay',
    url: q => `https://www.ebay.com/sch/i.html?_nkw=${enc(q)}&LH_Sold=1&LH_Complete=1&_ipg=120&rt=nc`,
    extract: run(ebayExtract), parse: parseSimple,
    login: 'https://signin.ebay.com/ws/eBayISAPI.dll?SignIn',
  },
  ebayActive: {
    // Buy It Now only: an auction's current bid isn't what the item is worth.
    name: 'eBay', host: 'ebay',
    url: q => `https://www.ebay.com/sch/i.html?_nkw=${enc(q)}&LH_BIN=1&_ipg=120&rt=nc`,
    extract: run(ebayExtract), parse: parseSimple,
  },
  ebayAuctions: {
    // Auctions near the ZIP, nearest first (eBay pads results with far-away items, so this keeps the page local;
    // the app sorts by ending time itself). _fspt=1 makes eBay apply the distance.
    name: 'eBay auctions', host: 'ebay',
    url: (q, o) => `https://www.ebay.com/sch/i.html?_nkw=${enc(q)}&LH_Auction=1&_sop=7&_stpos=${enc(o.zip)}&_sadis=${o.radius || 125}` +
      `&LH_PrefLoc=99&_fspt=1&_ipg=120&rt=nc${o.minPrice ? '&_udlo=' + enc(o.minPrice) : ''}${o.maxPrice ? '&_udhi=' + enc(o.maxPrice) : ''}`,
    extract: run(ebayExtract), parse: parseAuctions,
  },
  kbid: {
    // K-BID only offers fixed distances, so ask for the next size up and trim to the radius afterwards.
    name: 'K-BID', host: 'kbid',
    url: (q, o, page = 1) => {
      const r = [10, 25, 50, 75, 100, 150, 250].find(d => d >= (o.radius || 125)) || 250;
      return `https://www.k-bid.com/auction/search?lot_list_format=short&page=${page}&search_phrase_inline=${enc(q)}` +
        `&distance_radius=${r}&distance_zip=${enc(o.zip)}&lot_sort_field=close&search=Search` +
        `${o.minPrice ? '&min_bid_amount=' + enc(o.minPrice) : ''}${o.maxPrice ? '&max_bid_amount=' + enc(o.maxPrice) : ''}`;
    },
    extract: run(kbidExtract), parse: parseKbid,
  },
  terapeak: {
    // 6 months (180 days) of eBay sold history. Needs the user signed in to eBay.
    name: 'eBay 6-mo sold', host: 'ebay',
    url: q => `https://www.ebay.com/sh/research?marketplace=EBAY-US&keywords=${enc(q)}&dayRange=180&categoryId=0&tabName=SOLD`,
    extract: run(terapeakExtract), parse: items => items,
  },
  mercariSold: {
    name: 'Mercari sold',
    url: q => `https://www.mercari.com/search/?keyword=${enc(q)}&itemStatuses=2`,
    extract: run(genericExtract, 'a[href*="/item/m"]'), parse: parseGeneric,
  },
  offerup: {
    name: 'OfferUp',
    url: q => `https://offerup.com/search?q=${enc(q)}`,
    extract: run(genericExtract, 'a[href*="/item/detail/"]'), parse: parseGeneric,
  },
  amazon: {
    name: 'Amazon (new)',
    url: q => `https://www.amazon.com/s?k=${enc(q)}`,
    extract: run(amazonExtract), parse: parseSimple,
  },
};

// Load a page hidden, keep re-reading it until listings show up (scrolling for more), then close it.
async function scrapePage(ses, url, extract, o = {}) {
  const timeout = o.timeout || 25000, settle = o.settle || 9000;
  const win = new BrowserWindow({
    show: false, width: 1280, height: 1800,
    webPreferences: { session: ses, backgroundThrottling: false, contextIsolation: true },
  });
  win.webContents.setAudioMuted(true);
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  let start = Date.now();
  try {
    win.loadURL(url).catch(() => {});
    let res = { items: [] }, scrolls = 0, lastCount = -1, reloads = 0;
    while (Date.now() - start < timeout) {
      await sleep(1200);
      if (o.isCancelled && o.isCancelled()) return { items: [], cancelled: true };
      const cur = win.webContents.getURL(), title = win.webContents.getTitle();
      if (FLAKY_TITLE.test(title) && reloads < 3) {
        reloads++;
        await sleep(800 + 700 * reloads);
        win.loadURL(url).catch(() => {});
        start = Date.now();
        continue;
      }
      // Keep whatever loaded before a login wall / captcha appeared.
      if (BLOCKED_URL.test(cur) || BLOCKED_TITLE.test(title)) return { ...res, blocked: !res.items.length, url: cur };
      try {
        const r = await win.webContents.executeJavaScript(extract, true);
        res = Array.isArray(r) ? { items: r } : r;
      } catch { /* page still loading */ }
      const n = res.items.length;
      if (n > 0) {
        if (scrolls < (o.scrolls || 0) && n !== lastCount) {
          lastCount = n; scrolls++;
          await win.webContents.executeJavaScript('window.scrollTo(0, document.body.scrollHeight)').catch(() => {});
          continue;
        }
        break;
      }
      // Loaded fine but nothing matched: no results.
      if (Date.now() - start > settle && !win.webContents.isLoading()) break;
    }
    return { ...res, url: win.webContents.getURL(), title: win.webContents.getTitle() };
  } finally {
    win.destroy();
  }
}

module.exports = { SITES, scrapePage, parseFacebook };
