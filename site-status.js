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

  // duke only: pop up a notification when a sub-admin asks to do something (see subadmin-setup.sql)
  var lastPending = -1;
  function checkRequests() {
    creds().then(function (a) {
      if (!a) return null;
      return fetch(API + '/rest/v1/rpc/sub_pending', { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_user: a.u, p_hash: a.h }) })
        .then(function (r) { return r.ok ? r.json() : null; });
    }).then(function (p) {
      var n = p && p.count | 0, el = document.getElementById('dr-req-toast');
      if (!n) { if (el) el.remove(); lastPending = 0; return; }
      if (n === lastPending && el) return;
      lastPending = n;
      if (!el) { el = document.createElement('a'); el.id = 'dr-req-toast'; el.href = ROOT + 'admin.html';
        el.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647;max-width:320px;padding:12px 16px;border-radius:12px;background:rgba(20,24,36,.92);color:#fff;font:600 14px system-ui,sans-serif;text-decoration:none;border:1px solid #ffd84a;box-shadow:0 8px 30px rgba(0,0,0,.5)';
        document.body.appendChild(el); }
      el.innerHTML = '<div style="color:#ffd84a;font-weight:800;margin-bottom:4px">Admin request' + (n > 1 ? 's (' + n + ')' : '') + '</div><div style="font-weight:500;opacity:.9"></div><div style="font-size:12px;opacity:.7;margin-top:6px">Click to approve or deny</div>';
      el.children[1].textContent = String(p.latest || '').slice(0, 140);
      try { if (window.Notification && Notification.permission === 'granted') new Notification('Admin request', { body: String(p.latest || '') }); else if (window.Notification && Notification.permission === 'default') Notification.requestPermission(); } catch (e) {}
    }).catch(function () {});
  }

  // Saved login still valid? If duke renamed the account or reset its password, the old saved login would keep
  // showing the old name everywhere. Sign it out and tell the player. One tiny check per tab (see admin-rename-fix.sql).
  function loginCheck() {
    var c; try { c = JSON.parse(localStorage.getItem('shooter_creds') || 'null'); } catch (e) { return; }
    if (!c || !c.u || !c.p || !window.crypto || !crypto.subtle) return;
    var tag = 'dr_login_ok:' + String(c.u).toLowerCase();
    try { if (sessionStorage.getItem(tag)) return; } catch (e) {}
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(c.p + '::shooter::' + String(c.u).toLowerCase())).then(function (b) {
      var h = Array.from(new Uint8Array(b)).map(function (x) { return x.toString(16).padStart(2, '0'); }).join('');
      return fetch(API + '/rest/v1/rpc/dr_login_check', { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_user: c.u, p_hash: h }) });
    }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j || typeof j !== 'object') return;
      if (j.ok) { try { sessionStorage.setItem(tag, '1'); } catch (e) {} return; }
      if (j.ok !== false) return;
      try { var now = JSON.parse(localStorage.getItem('shooter_creds') || 'null'); if (!now || now.u !== c.u || now.p !== c.p) return; localStorage.removeItem('shooter_creds'); } catch (e) { return; }
      var show = function () {
        var el = document.createElement('div');
        el.style.cssText = 'position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:2147483647;max-width:360px;padding:14px 18px;border-radius:12px;background:rgba(20,24,36,.95);color:#fff;font:600 14px system-ui,sans-serif;border:1px solid #ffd84a;box-shadow:0 8px 30px rgba(0,0,0,.5);cursor:pointer;text-align:center';
        el.textContent = j.renamed_to ? 'Your account is now called "' + j.renamed_to + '". Sign in again with that name and the new password duke gave you.' : 'Your login was changed by the admin. Please sign in again.';
        var s2 = document.createElement('div'); s2.style.cssText = 'font-size:12px;opacity:.7;margin-top:6px'; s2.textContent = 'Click to reload'; el.appendChild(s2);
        el.onclick = function () { location.reload(); };
        document.body.appendChild(el);
      };
      if (document.body) show(); else document.addEventListener('DOMContentLoaded', show);
    }).catch(function () {});
  }
  loginCheck();

  if (isClosed(cached())) { goClosed(); return; }
  check();
  setInterval(check, 60000);
  if (document.body) checkRequests(); else document.addEventListener('DOMContentLoaded', checkRequests);
  setInterval(checkRequests, 60000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) check(); });
})();
