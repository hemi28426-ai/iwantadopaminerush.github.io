// Facebook group sales and comment-auctions: find matching posts in the user's groups and read them.
// Group auctions have no structure: the post says "start $50, $5 bids, ends 8pm CST" and people bid by commenting "55".
const { parsePrice } = require('./pricing');

// "https://www.facebook.com/groups/123456789/" or "/groups/pokemontradesd" -> "123456789" / "pokemontradesd"
function groupId(link) {
  const m = String(link || '').trim().match(/groups\/([A-Za-z0-9_.-]+)/) || String(link || '').trim().match(/^([A-Za-z0-9_.-]+)$/);
  return m ? m[1] : null;
}

const AUCTION_WORDS = /\b(auction|bids?|bidding|sb|starting bid|start(?:ing)?\s*(?:at|@)|min(?:imum)?\s*bid|ends?|ending|closes?|bin)\b/i;
const ENDED_WORDS = /\b(sold|won|winner|congrats|ended|closed|pending payment|paid)\b/i;

// --- end time ---------------------------------------------------------------------------------------------

const TZ = { EST: -5, EDT: -4, ET: -5, CST: -6, CDT: -5, CT: -6, MST: -7, MDT: -6, MT: -7, PST: -8, PDT: -7, PT: -8 };
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

// Finds "ends 8pm CST", "ending tonight at 9:30", "closes Sunday 7 pm", "ends 11/5 8pm". Returns { at, text, sure }.
function parseEnd(text, now = new Date()) {
  const m = text.match(/\b(?:ends?|ending|closes?|closing|ends? at|auction ends?)\b[^\n]{0,60}/i);
  if (!m) return { at: null, text: '', sure: false };
  const s = m[0];
  const t = s.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?\s*(EST|EDT|ET|CST|CDT|CT|MST|MDT|MT|PST|PDT|PT)?\b(?!\s*\/)/i);
  const times = [...s.matchAll(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)\s*(EST|EDT|ET|CST|CDT|CT|MST|MDT|MT|PST|PDT|PT)?/gi)];
  const tm = times[0] || (t && t[2] ? t : null);
  if (!tm) return { at: null, text: s.trim(), sure: false };
  let hour = +tm[1] % 12;
  const min = +(tm[2] || 0);
  const ap = (tm[3] || '').toLowerCase();
  if (ap.startsWith('p')) hour += 12;
  if (!ap && hour < 8) hour += 12; // "ends 8" almost always means 8 pm
  const zone = tm[4] ? TZ[tm[4].toUpperCase()] : null;

  // Which day: an explicit date, a weekday, tomorrow, or today.
  const d = new Date(now);
  const date = s.match(/\b(\d{1,2})\/(\d{1,2})\b/);
  const wd = s.toLowerCase().match(/\b(sun|mon|tue|wed|thu|fri|sat)[a-z]*\b/);
  let sure = true;
  if (date) { d.setMonth(+date[1] - 1, +date[2]); }
  else if (/tomorrow/i.test(s)) d.setDate(d.getDate() + 1);
  else if (wd) { const diff = (DAYS.indexOf(wd[1]) - d.getDay() + 7) % 7; d.setDate(d.getDate() + diff); }
  else if (!/today|tonight/i.test(s)) sure = false; // just "ends 8pm": today, but the post might be from another day

  let at;
  if (zone != null) {
    at = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), hour - zone, min);
  } else {
    const local = new Date(d); local.setHours(hour, min, 0, 0); at = local.getTime();
  }
  return { at, text: s.trim(), sure };
}

// --- bids -------------------------------------------------------------------------------------------------

// A comment is a bid when it's basically just a number: "55", "$55", "55!", "bid 60", "60 please", "I'll go 70".
function bidOf(comment) {
  const line = String(comment || '').split('\n').map(x => x.trim()).find(Boolean) || '';
  const m = line.match(/^(?:bid|i'?ll go|i'?ll do|go|do)?\s*\$?\s*(\d{1,5}(?:\.\d{1,2})?)\s*\$?\s*(?:bid|!+|please|pls|plz|\.)?\s*$/i);
  return m ? parseFloat(m[1]) : null;
}

function startingBid(text) {
  const m = text.match(/\b(?:sb|starting(?:\s*bid)?|start(?:s|ing)?(?:\s*bid)?(?:\s*(?:at|@))?|opening bid|min(?:imum)?\s*bid|bidding starts?\s*(?:at|@)?)\s*[:=@-]?\s*\$?\s*(\d{1,5})/i);
  return m ? +m[1] : null;
}

// post: { url, text, comments: [{ text }], img, group } -> a listing the rest of the app understands, or null.
function parseGroupPost(post, now = Date.now()) {
  const text = String(post.text || '').trim();
  if (!text) return null;
  const firstLine = text.split('\n').map(x => x.trim()).find(x => x && !/^\$?\d+$/.test(x)) || text;
  const title = firstLine.replace(/\s+/g, ' ').slice(0, 90);
  const id = 'g' + ((post.url.match(/(?:posts|permalink)\/(\d+)/) || [])[1] || Math.abs(hash(post.url)));
  const base = { id, site: 'fbgroup', title, url: post.url, img: post.img || '', location: post.group || 'Facebook group', miles: null };

  const isAuction = AUCTION_WORDS.test(text) && (startingBid(text) != null || /\bauction\b/i.test(text) || (post.comments || []).some(c => bidOf(c.text) != null));
  if (!isAuction) {
    // A plain "for sale" post: needs a price.
    const price = parsePrice(text);
    if (price == null) return null;
    return { ...base, kind: 'fb', price, oldPrice: null, extra: 'FB group post' };
  }

  const start = startingBid(text);
  // Real bids climb in steps. Skip numbers under the start or that leap way past the current high
  // (someone answering "what year?" with "2016" isn't a $2,016 bid).
  const bids = [];
  let top = start || 0;
  for (const c of post.comments || []) {
    const b = bidOf(c.text);
    if (b == null || b <= 0 || (start != null && b < start)) continue;
    if (bids.length || start != null ? b > top * 3 + 25 : b > 5000) continue;
    bids.push(b);
    top = Math.max(top, b);
  }
  const high = bids.length ? Math.max(...bids) : start;
  const end = parseEnd(text, new Date(now));
  const ended = ENDED_WORDS.test(text.split('\n').slice(0, 2).join(' ')) ||
    (post.comments || []).slice(-3).some(c => /\b(sold|winner|won|congrats)\b/i.test(c.text || ''));
  return {
    ...base,
    kind: 'auction',
    price: high ?? 0,
    bids: bids.length,
    startBid: start,
    endsAt: ended ? now - 1 : end.at,
    endText: end.text,
    ship: null,
    pickupOnly: false,
    // Free-form posts: flag the ones where we had to guess so the user checks before bidding.
    needsCheck: !end.sure || high == null || ended,
    ended,
  };
}

function hash(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return h; }

// --- in-page extractors (run inside Facebook pages) --------------------------------------------------------

// Group search results: links to the matching posts.
function groupSearchExtract() {
  const urls = new Set();
  for (const a of document.querySelectorAll('a[href*="/groups/"]')) {
    const h = a.href.split('?')[0];
    if (/\/groups\/[^/]+\/(posts|permalink)\/\d+/.test(h)) urls.add(h.replace(/\/$/, '') + '/');
  }
  const t = document.body.innerText || '';
  const name = (document.title || '').replace(/\s*\|\s*Facebook\s*$/, '');
  const empty = /no results|didn't find anything|we couldn't find/i.test(t);
  // An empty search still returns a marker so the scraper doesn't wait out its timeout.
  return { items: [...urls].map(url => ({ url })), group: name, done: empty, loaded: empty };
}

// One post: its text (with "See more" expanded), first photo, and the comments.
function groupPostExtract() {
  for (const b of document.querySelectorAll('div[role="button"]')) {
    if (/^(see more|view more comments|view previous comments|\d+ more (comments|replies))$/i.test((b.innerText || '').trim())) b.click();
  }
  const msg = document.querySelector('[data-ad-preview="message"], [data-ad-comet-preview="message"]');
  const art = (msg && msg.closest('[role="article"]')) || document.querySelector('[role="main"]') || document.body;
  const img = [...art.querySelectorAll('img')].find(i => /scontent|fbcdn/.test(i.src) && i.naturalWidth > 150);
  const comments = [...document.querySelectorAll('[role="article"][aria-label]')]
    .filter(a => /^(comment|reply) by/i.test(a.getAttribute('aria-label')))
    .map(a => ({ who: a.getAttribute('aria-label'), text: [...a.querySelectorAll('div[dir="auto"]')].map(d => d.innerText).join('\n') }));
  const text = msg ? msg.innerText : '';
  return { items: text ? [{ text, comments, img: img ? img.src : '' }] : [] };
}

module.exports = { groupId, parseEnd, bidOf, startingBid, parseGroupPost, groupSearchExtract, groupPostExtract };
