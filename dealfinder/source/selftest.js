// Dev only: `npx electron . --selftest [query]` runs a full search and prints what each step produced.
const { app } = require('electron');

module.exports = async (ses, { runSearch }) => {
  const q = process.argv[process.argv.indexOf('--selftest') + 1] || 'ps5';
  if (q.startsWith('http')) return probe(ses, q);
  if (q === 'probe') return probe(ses, process.env.PROBE_URL);
  if (q === 'ebayloop') return ebayLoop(ses);
  const t0 = Date.now();
  const listings = {};
  const priced = {};
  const arg = k => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : undefined; };
  await runSearch({ q: q.startsWith('--') ? 'ps5' : q, zip: arg('zip') || '94103', mode: arg('mode') || 'both' }, (ev, d) => {
    const t = ((Date.now() - t0) / 1000).toFixed(1) + 's';
    if (ev === 'source') console.log(t, 'SOURCE', d.id, d.state, d.count ?? '', d.state === 'blocked' ? d.url : '');
    else if (ev === 'listings') { console.log(t, 'LISTINGS', d.listings.length, 'area:', d.area); d.listings.forEach(l => listings[l.id] = l); console.log(d.listings.slice(0, 3)); }
    else if (ev === 'market') console.log(t, 'MARKET', JSON.stringify({ value: d.value, comps: d.comps, bySource: d.bySource, newRetail: d.newRetail }));
    else if (ev === 'priced') priced[d.id] = d;
    else if (ev === 'center') console.log(t, 'CENTER', d.label);
    else if (ev === 'distance') listings[d.id].miles = d.miles;
    else console.log(t, ev.toUpperCase(), JSON.stringify(d));
  });
  console.log('\n--- priced listings ---');
  for (const id in listings) {
    const l = listings[id], p = priced[id] || {};
    if (l.kind === 'auction') {
      console.log(`BID $${l.price} ${l.bids}b +${l.ship}sh ${Math.round((l.endsAt - Date.now()) / 60000)}min | ${l.title.slice(0, 40).padEnd(40)} | ${String(l.miles ?? '?').padStart(4)}mi | worth ${p.value ?? '-'} (${p.comps ?? 0}${p.refined ? ', refined' : ''}) | ${p.label || ''} | max bid ${p.maxBid ?? '-'} | profit@max ${p.profitAtMax ?? '-'} now ${p.profitNow ?? '-'}`);
      if (process.argv.includes('--verbose')) for (const e of (p.examples || []).slice(0, 3)) console.log(`      ${e.source.padEnd(11)} $${e.price}  ${e.title.slice(0, 70)}`);
      continue;
    }
    console.log(`$${l.price} | ${l.title.slice(0, 40).padEnd(40)} | ${String(l.miles ?? '?').padStart(4)}mi | worth ${p.value ?? '-'} (${p.comps ?? 0} comps${p.refined ? ', refined' : ''}) | ${p.label || ''} | offer ${p.offer ?? '-'} | profit ${p.profit ?? '-'}`);
    if (process.argv.includes('--verbose')) for (const e of p.examples || []) console.log(`      ${e.source.padEnd(11)} $${e.price}  ${e.title.slice(0, 70)}`);
  }
  console.log('\nTotal', ((Date.now() - t0) / 1000).toFixed(1) + 's');
  app.quit();
};

// `--selftest ebayloop`: how often does eBay hand a hidden window its error page?
async function ebayLoop(ses) {
  const { SITES, scrapePage } = require('./scrapers');
  const qs = ['ps5 digital', 'xbox series x', 'ipad air', 'nintendo switch oled', 'dewalt drill', 'airpods pro', 'gopro hero', 'kitchenaid mixer'];
  const variant = process.argv.includes('--plain') ? q => `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(q)}` : SITES.ebayActive.url;
  for (const q of qs) {
    const t = Date.now();
    const r = await scrapePage(ses, variant(q), SITES.ebayActive.extract, { timeout: 15000 });
    console.log(q.padEnd(22), String(r.items.length).padStart(3), 'items', ((Date.now() - t) / 1000).toFixed(1) + 's', r.title);
    await new Promise(res => setTimeout(res, 1500));
  }
  app.quit();
}

// `--selftest <url>`: what does a hidden window actually see on this page?
async function probe(ses, url) {
  const { BrowserWindow } = require('electron');
  const w = new BrowserWindow({ show: false, width: 1280, height: 1800, webPreferences: { session: ses, backgroundThrottling: false } });
  w.loadURL(url).catch(e => console.log('load error', e.message));
  for (let i = 0; i < 6; i++) {
    await new Promise(r => setTimeout(r, 2500));
    if (!/error page/i.test(w.webContents.getTitle())) break;
    console.log('error page, reloading');
    w.loadURL(url).catch(() => {});
  }
  for (const s of [3, 6, 10]) {
    await new Promise(r => setTimeout(r, s === 3 ? 3000 : (s - (s === 6 ? 3 : 6)) * 1000));
    const info = await w.webContents.executeJavaScript(`(() => { const c = document.querySelectorAll('li.s-card, li.s-item')[4];
      return {title:document.title, url:location.href, cards:document.querySelectorAll('li.s-card, li.s-item').length,
      card: c && [...c.querySelectorAll('a, [class*=title], [class*=price]')].map(e => e.tagName + '.' + e.className + ' ' + (e.getAttribute('href')||'').slice(0,60) + ' :: ' + (e.innerText||'').slice(0,50)),
      texts: [...document.querySelectorAll('li.s-card')].slice(1, 6).map(c => c.innerText.replace(/\\n+/g, ' | ').slice(0, 400)),
      heading: (document.querySelector('.srp-controls__count-heading, h1') || {}).innerText,
      distance: [...document.querySelectorAll('span, a, button, li')].map(e => e.innerText || '').filter(t => t.length < 80 && /\bmi\b|miles|75201|within|pickup/i.test(t)).slice(0, 12),
      text:document.body.innerText.slice(0,200)} })()`).catch(e => e.message);
    console.log(`@${s}s`, JSON.stringify(info, null, 1));
  }
  app.quit();
}
