// Turns comparable listings from other sites into a fair value, an offer, and a verdict.

const STOP = new Set(`obo firm cash only pickup pick up must go gone like new brand great good excellent condition used
works working perfect mint sale selling sell for with and the a an w in of on to asap today price priced negotiable neg
deal comes come includes included including it is this my me or trade trades read description please serious buyers
inquiries lowball lowballs available still all as you your just barely gently lightly box tested clean nice
version edition console system sony apple samsung microsoft nintendo oem authentic genuine original free shipping
fast ship ships local meet obo. pending sold`.split(/\s+/));

// Comps that are clearly not the same thing unless the listing says so too.
const JUNK = ['for parts', 'parts only', 'broken', 'not working', 'doesnt work', 'does not work', 'cracked', 'damaged',
  'as is', 'box only', 'empty box', 'no console', 'replacement', 'skin', 'decal', 'sticker', 'faceplate', 'shell only',
  'manual only', 'read description', 'locked', 'icloud', 'bad esn', 'blacklisted'];

function norm(s) {
  return String(s || '').toLowerCase()
    .replace(/play\s*station\s*(\d)/g, 'ps$1')
    .replace(/\bps\s+(\d)\b/g, 'ps$1')
    .replace(/\bx\s*box\b/g, 'xbox')
    .replace(/\bdisk\b/g, 'disc')
    .replace(/\bi\s*phone\b/g, 'iphone')
    .replace(/(\d+)\s*(gb|tb|in|inch|"|mm|hp|cc)\b/g, '$1$2')
    .replace(/[^a-z0-9$ ]+/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function tokens(s) {
  return [...new Set(norm(s).split(' ').filter(t => t && !STOP.has(t) && !t.startsWith('$') && (t.length > 1 || /\d/.test(t))))];
}

const has = (n, phrase) => new RegExp(`\\b${phrase}\\b`).test(n);
const BROKEN = ['for parts', 'parts only', 'parts or repair', 'broken', 'not working', 'doesnt work', 'doesn t work', 'does not work', 'cracked', 'damaged', 'as is'];
const isBroken = s => { const n = norm(s); return BROKEN.some(j => has(n, j)); };

// Short search phrase for looking a single listing up on other sites.
// Broken / for-parts items are looked up as such, so they're compared with other broken ones.
function searchPhrase(title, cond) {
  const tok = tokens(title).filter(t => t !== 'parts' && t.length > 1);
  return isBroken(title + ' ' + (cond || '')) ? tok.slice(0, 3).join(' ') + ' for parts' : tok.slice(0, 6).join(' ');
}

function parsePrice(s) {
  if (/^\s*free\s*$/i.test(s || '')) return 0;
  const m = String(s || '').replace(/,/g, '').match(/\$\s?(\d+(?:\.\d{1,2})?)/);
  return m ? parseFloat(m[1]) : null;
}

const SOURCE_WEIGHT = {
  ebaySold: { w: 1.0, adj: 1.0 },     // what things actually sold for
  mercariSold: { w: 0.9, adj: 1.0 },
  ebayActive: { w: 0.55, adj: 0.82 }, // asking prices run well above what things sell for
  offerup: { w: 0.45, adj: 0.85 },
  facebook: { w: 0.45, adj: 0.85 },
  amazon: { w: 0, adj: 1.0 },         // new retail, used only as a ceiling
};

const EBAY_FEE = 0.1325;

function median(xs) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function weightedMedian(pairs) {
  const s = pairs.filter(p => p.w > 0).sort((a, b) => a.v - b.v);
  const total = s.reduce((t, p) => t + p.w, 0);
  let acc = 0;
  for (const p of s) { acc += p.w; if (acc >= total / 2) return p.v; }
  return null;
}

// How well a comp matches a listing: share of the listing's key words found in the comp.
function similarity(listTok, comp) {
  if (!listTok.length) return 0;
  const ct = comp._tok || (comp._tok = new Set(tokens(comp.title)));
  const cn = comp._norm || (comp._norm = norm(comp.title));
  let hit = 0;
  for (const t of listTok) if (ct.has(t) || (t.length > 3 && cn.includes(t))) hit++;
  let sim = hit / listTok.length;
  // Long, wordy listing titles vs short comp titles: also count it when (nearly) all the comp's words are in the listing.
  const compTok = [...ct].filter(t => t !== 'parts' && t !== 'repair');
  if (compTok.length >= 4 && sim >= 0.3) {
    const back = compTok.filter(t => listTok.includes(t)).length / compTok.length;
    sim = Math.max(sim, back * 0.9);
  }
  // Different model numbers (iphone 13 vs 14, ps4 vs ps5) are a different item.
  const ln = listTok.filter(t => /\d/.test(t));
  const extraNums = [...ct].filter(t => /\d/.test(t) && !listTok.includes(t) && !/^(19|20)\d\d$/.test(t));
  if (ln.length && extraNums.some(n => ln.some(l => l.replace(/\d+/g, '') === n.replace(/\d+/g, '')))) sim *= 0.4;
  return sim;
}

function isJunk(listNorm, comp) {
  const cn = comp._norm || (comp._norm = norm(comp.title));
  if (JUNK.some(j => has(cn, j) && !has(listNorm, j))) return true;
  // "case for iphone 13", "controller for ps5" -> an accessory, not the item.
  if (!/\bfor\b/.test(listNorm) && /\b(for|fits|compatible with)\b/.test(cn.split(' ').slice(0, 8).join(' '))) return true;
  return false;
}

function round5(x) { return Math.max(0, Math.round(x / 5) * 5); }

// listing: {title, price, url}; comps: [{source, title, price, url, cond}]
function priceListing(listing, comps, asWorking = false) {
  const listTok = tokens(listing.title).filter(t => t !== 'parts');
  const listNorm = norm(listing.title + ' ' + (listing.cond || ''));
  const broken = !asWorking && isBroken(listing.title + ' ' + (listing.cond || ''));
  // No for-parts sales to compare with: guess a broken item at about a third of a working one.
  const partsGuess = () => {
    if (!broken) return { value: null, comps: 0 };
    const r = priceListing(listing, comps, true);
    if (r.value == null) return r;
    return { ...r, value: Math.round(r.value * 0.35), newRetail: null, confidence: 'low', partsGuess: true };
  };
  const wantsNew = /\b(new|sealed|nib|bnib|unopened)\b/.test(norm(listing.title));
  const matched = [];
  let newPrices = [];
  for (const c of comps) {
    if (c.url && c.url === listing.url) continue;
    if (!(c.price > 0)) continue;
    // A for-parts item is only worth what other for-parts ones go for.
    if (broken ? !isBroken(c.title + ' ' + (c.cond || '')) && c.source !== 'amazon' : isJunk(listNorm, c)) continue;
    const sim = similarity(listTok, c);
    if (sim < 0.6) continue;
    const sw = SOURCE_WEIGHT[c.source] || { w: 0.4, adj: 0.9 };
    if (c.source === 'amazon') { newPrices.push(c.price); continue; }
    let w = sw.w * sim;
    if (!wantsNew && /brand new|new \(other\)|sealed/i.test(c.cond || '')) w *= 0.5;
    matched.push({ ...c, v: c.price * sw.adj, w, sim });
  }
  // Someone asking $300 isn't selling a $30 game or controller: drop comps far under the asking price.
  const anchor = listing.anchor ?? listing.price;
  if (anchor > 0) for (let i = matched.length - 1; i >= 0; i--) if (matched[i].v < anchor * 0.25) matched.splice(i, 1);
  if (!matched.length) return partsGuess();

  // Drop accessories / lots that slipped through: far below or far above the middle.
  const mid = median(matched.map(m => m.v));
  let kept = matched.filter(m => m.v >= mid * 0.35 && m.v <= mid * 2.8);
  if (kept.length >= 6) {
    const s = kept.map(m => m.v).sort((a, b) => a - b);
    const q1 = s[Math.floor(s.length * 0.25)], q3 = s[Math.floor(s.length * 0.75)], iqr = q3 - q1;
    kept = kept.filter(m => m.v >= q1 - 1.5 * iqr && m.v <= q3 + 1.5 * iqr);
  }
  let value = weightedMedian(kept);
  if (value == null) return partsGuess();
  const newRetail = newPrices.length >= 2 ? median(newPrices) : null;
  if (newRetail && !wantsNew) value = Math.min(value, newRetail * (broken ? 0.35 : 0.85));

  const soldCount = kept.filter(k => /Sold$/.test(k.source)).length;
  // Past sales of this item (sold comps only): low / average / high, ignoring the extreme 10% at each end.
  const soldPrices = kept.filter(k => /Sold$/.test(k.source)).map(k => k.price).sort((a, b) => a - b);
  const pct = q => soldPrices[Math.min(soldPrices.length - 1, Math.floor(q * soldPrices.length))];
  const sold = soldPrices.length >= 2 ? {
    low: Math.round(pct(0.1)), high: Math.round(pct(0.9)), n: soldPrices.length,
    avg: Math.round(soldPrices.reduce((a, b) => a + b, 0) / soldPrices.length),
  } : null;
  const bySource = {};
  for (const k of kept) (bySource[k.source] = bySource[k.source] || []).push(k.price);
  for (const s in bySource) bySource[s] = { median: Math.round(median(bySource[s])), n: bySource[s].length };
  const confidence = soldCount >= 6 || kept.length >= 12 ? 'high' : kept.length >= 4 ? 'medium' : 'low';
  return {
    value: Math.round(value),
    comps: kept.length,
    soldComps: soldCount,
    confidence,
    newRetail: newRetail ? Math.round(newRetail) : null,
    bySource,
    sold,
    examples: kept.sort((a, b) => b.w - a.w).slice(0, 6)
      .map(k => ({ source: k.source, title: k.title, price: k.price, url: k.url })),
  };
}

// The advice for one listing: what it's worth, what to offer, and whether it's a deal.
function advise(asking, est) {
  if (est.value == null) return { verdict: 'unknown', label: 'Not enough data' };
  const v = est.value;
  if (asking === 0) return { verdict: 'steal', label: 'Free', offer: 0, maxPay: 0, profit: Math.round(v * (1 - EBAY_FEE)), ratio: 0 };
  const ratio = asking / v;
  // Way under value is usually a scam, broken, or a different item than the title says.
  const verdict = ratio < 0.3 ? 'sus' : ratio <= 0.6 ? 'steal' : ratio <= 0.8 ? 'great' : ratio <= 0.95 ? 'good' : ratio <= 1.1 ? 'fair' : 'over';
  const label = { sus: 'Suspiciously cheap', steal: 'Steal', great: 'Great deal', good: 'Good price', fair: 'Fair price', over: 'Overpriced' }[verdict];
  // Aim to buy at ~70% of what it sells for, so there's room after fees.
  const offer = asking <= v * 0.7 ? asking : Math.min(asking, round5(v * 0.7));
  const maxPay = round5(v * 0.8);
  const profit = Math.round(v * (1 - EBAY_FEE) - offer);
  return { verdict, label, offer, maxPay, profit, ratio: Math.round(ratio * 100) / 100 };
}

// The advice for an auction: the most to bid (shipping included) and still make money reselling it.
// premium: buyer's premium as a fraction (K-BID auctions add e.g. 15% on top of the winning bid).
function adviseAuction(bid, ship, est, premium = 0) {
  if (est.value == null) return { verdict: 'unknown', label: 'Not enough data' };
  const v = est.value, net = v * (1 - EBAY_FEE);
  const cost = b => b * (1 + premium) + ship;
  const maxBid = Math.max(0, Math.floor((v * 0.7 - ship) / (1 + premium) / 5) * 5);
  const ratio = cost(bid) / v;
  const verdict = bid <= maxBid * 0.6 ? 'great' : bid <= maxBid ? 'good' : cost(bid) <= net ? 'fair' : 'over';
  const label = { great: 'Way under max bid', good: 'Under max bid', fair: 'Little profit left', over: 'Over max bid' }[verdict];
  return {
    verdict, label, maxBid, premium,
    profitAtMax: Math.round(net - cost(maxBid)),
    profitNow: Math.round(net - cost(bid)),
    ratio: Math.round(ratio * 100) / 100,
  };
}

// Describing words sellers add that eBay titles for the same item often leave out.
const SOFT = new Set(`style inspired custom handmade rare vintage lot set authentic official limited edition
collectible collector awesome beautiful cool cute amazing look l k gift`.split(/\s+/));

// Shorter phrases to try when the full one finds nothing: the first few key words, then the ones after them.
// "van gogh style flareon gold metal pokemon card" -> "van gogh flareon gold", "flareon gold metal pokemon".
function fallbackPhrases(title, cond) {
  const tok = tokens(title).filter(t => t !== 'parts' && t.length > 1 && !SOFT.has(t));
  const suffix = isBroken(title + ' ' + (cond || '')) ? ' for parts' : '';
  const first = searchPhrase(title, cond);
  return [tok.slice(0, 4), tok.slice(2, 6)]
    .filter(p => p.length >= 2).map(p => p.join(' ') + suffix)
    .filter((p, i, all) => p !== first && all.indexOf(p) === i);
}

module.exports = { tokens, norm, searchPhrase, fallbackPhrases, parsePrice, priceListing, advise, adviseAuction, median };
