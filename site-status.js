// Dopamine Rush: site-wide shut-down switch (see site-shutdown.sql). Every page includes this script.
// When the owner closes the site in Supabase, the page jumps to closed.html, which brings everyone back
// automatically once it reopens. Checks on load, every minute and when the tab comes back.
// If Supabase can't be reached the site stays open, unless the last answer this browser got was "closed".
// Inside the hub's game frame it does nothing: the hub page itself is checked.
(function () {
  'use strict';
  if (window.__drSiteStatus) return;
  window.__drSiteStatus = true;
  try { if (window.self !== window.top) return; } catch (e) { return; }

  var src = (document.currentScript && document.currentScript.src) || '';
  var ROOT = src.replace(/site-status\.js(\?.*)?$/, '');
  if (!ROOT) return;
  var API = window.DR_STATUS_URL || 'https://zznsfdcpondfnacherxv.supabase.co';
  var KEY = 'sb_publishable_P6Xw_9hNrt-1_sKE7SsN7w_nN7eum3I';
  var CACHE = 'dr_site_status';

  function cached() { try { return JSON.parse(localStorage.getItem(CACHE) || 'null'); } catch (e) { return null; } }
  function remember(s) {
    try { localStorage.setItem(CACHE, JSON.stringify({ closed: !!s.closed, message: s.message || '', until: s.until || null, at: Date.now() })); } catch (e) {}
  }
  function isClosed(s) { return !!(s && s.closed && (!s.until || new Date(s.until).getTime() > Date.now())); }
  var leaving = false;
  function goClosed() {
    if (leaving) return; leaving = true;
    location.replace(ROOT + 'closed.html?back=' + encodeURIComponent(location.href));
  }

  // the duke (admin) account may use the site while it is closed; the server checks the password hash
  function creds() {
    try {
      var c = JSON.parse(localStorage.getItem('shooter_creds') || 'null');
      if (!c || !c.u || !c.p || String(c.u).toLowerCase() !== 'duke' || !window.crypto || !crypto.subtle) return Promise.resolve(null);
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode(c.p + '::shooter::' + String(c.u).toLowerCase())).then(function (b) {
        return { u: c.u, h: Array.from(new Uint8Array(b)).map(function (x) { return x.toString(16).padStart(2, '0'); }).join('') };
      });
    } catch (e) { return Promise.resolve(null); }
  }

  function check() {
    if (leaving) return;
    creds().then(function (a) {
      return fetch(API + '/rest/v1/rpc/dr_site_status', {
        method: 'POST',
        headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_user: a ? a.u : '', p_hash: a ? a.h : '' })
      });
    }).then(function (r) {
      if (r.status === 404) return null;   // switch not set up yet: stay open
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (s) {
      if (!s || typeof s !== 'object') return;
      remember(s);
      if (isClosed(s)) goClosed();
    }).catch(function () {
      if (isClosed(cached())) goClosed();  // can't reach the server: keep the last known answer
    });
  }

  if (isClosed(cached())) { goClosed(); return; }
  check();
  setInterval(check, 60000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) check(); });
})();
