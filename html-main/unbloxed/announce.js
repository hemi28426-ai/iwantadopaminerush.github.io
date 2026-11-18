// Unbloxed announcements (unbloxed-announce.sql, posted by duke from admin.html): checks on load, every 60 s while the page
// is visible, and when the tab comes back. A new announcement shows as a big banner at the top (menus and in-game) until
// it's closed, runs out or is taken down. Closed ones stay closed (remembered per browser).
(function () {
  'use strict';
  if (window.__ubxAnnounce) return; window.__ubxAnnounce = true;
  if (/[?&](studio|game|remix|import)=/.test(location.search)) return;
  var URL = 'https://zznsfdcpondfnacherxv.supabase.co', KEY = 'sb_publishable_P6Xw_9hNrt-1_sKE7SsN7w_nN7eum3I', SEEN = 'ubx_announce_seen';
  var bar = null, shownId = null;
  function seen() { try { return localStorage.getItem(SEEN); } catch (e) { return null; } }
  function remember(id) { try { localStorage.setItem(SEEN, String(id)); } catch (e) { } }
  function hide() { if (bar) { bar.remove(); bar = null; shownId = null; } }
  function show(a) {
    if (shownId === a.id && bar) return;
    hide(); shownId = a.id;
    if (!document.getElementById('ubx-ann-css')) {
      var st = document.createElement('style'); st.id = 'ubx-ann-css';
      st.textContent = '#ubx-ann{position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:100000;width:min(640px,calc(100% - 32px));box-sizing:border-box;' +
        'display:flex;gap:12px;align-items:flex-start;padding:14px 16px;border-radius:10px;background:#1b1d21;color:#fff;border:2px solid #ffd84a;' +
        'box-shadow:0 10px 34px #000a;font:600 16px/1.4 Montserrat,system-ui,Segoe UI,sans-serif;animation:ubxAnnIn .35s ease-out}' +
        '#ubx-ann b{display:block;color:#ffd84a;font-size:13px;letter-spacing:1.5px;margin-bottom:3px}#ubx-ann .t{flex:1;min-width:0;white-space:pre-wrap;word-wrap:break-word}' +
        '#ubx-ann button{flex:none;border:0;background:#ffffff1a;color:#fff;width:30px;height:30px;border-radius:6px;font:700 18px/1 system-ui;cursor:pointer}' +
        '#ubx-ann button:hover{background:#ffffff33}@keyframes ubxAnnIn{from{opacity:0;transform:translate(-50%,-20px)}to{opacity:1;transform:translate(-50%,0)}}';
      document.head.appendChild(st);
    }
    bar = document.createElement('div'); bar.id = 'ubx-ann'; bar.setAttribute('role', 'alert');
    var ic = document.createElement('div'); ic.textContent = '📢'; ic.style.fontSize = '26px';
    var t = document.createElement('div'); t.className = 't';
    var h = document.createElement('b'); h.textContent = 'ANNOUNCEMENT'; var m = document.createElement('div'); m.textContent = a.msg || '';
    t.appendChild(h); t.appendChild(m);
    var x = document.createElement('button'); x.type = 'button'; x.title = 'Close'; x.textContent = '×';
    x.onclick = function () { remember(a.id); hide(); };
    bar.appendChild(ic); bar.appendChild(t); bar.appendChild(x); document.body.appendChild(bar);
  }
  var busy = false;
  function check() {
    if (busy || document.hidden) return; busy = true;
    fetch(URL + '/rest/v1/rpc/ubx_announce_get', { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: '{}' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (a) {
        if (!a || !a.id) { hide(); return; }          // nothing up (or it was taken down / ran out)
        if (String(a.id) === seen()) { hide(); return; } // this browser closed it already
        show(a);
      })
      .catch(function () { /* offline / not set up yet: nothing to show */ })
      .then(function () { busy = false; });
  }
  check(); setInterval(check, 60000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) check(); });
})();
