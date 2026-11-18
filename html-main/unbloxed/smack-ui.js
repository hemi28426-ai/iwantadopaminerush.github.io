// Smack Island UI: the glove picker and the in-game HUD. A Smack Island plug-in for Unbloxed (unbloxed.html; see smack-api.js).
// Picker: opens on SMACK.call('openPicker') (smack.js sends it for G) and at the first start of a visit. Cards show a 3D photo
//  of each glove (rendered once with the hub's shop-photo renderer, cached as an image), stats, the ability, unlock progress,
//  a Buy-with-Slaps button (click twice to confirm) and Equip (only inside the safe hut). Esc / G / X close it.
// HUD (smack mode only): ability button (E) with a cooldown sweep, Slaps balance, "+1 Slap" pops, the SMACKED OUT banner and
//  glove-unlock toasts. Unbloxed look: white rounded panels, Montserrat, blue #335fff, our own icons. Works without the other
//  smack files and never throws into the game.
(function () {
  'use strict';
  var S = window.SMACK;
  if (!S || !S.add) return;

  // ---------- engine globals (top-level let/const in unbloxed.html), always read through a guard ----------
  function G(f) { try { return f(); } catch (e) { return undefined; } }
  function ME() { return G(function () { return me; }); }
  function AV() { return G(function () { return av; }); }
  function active() { return G(function () { return GAME === 'smack' && mode === 'game'; }) === true; }
  function canvasEl() { return G(function () { return R.domElement; }); }
  function escH(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
  function num(v, d) { v = +v; return isFinite(v) ? v : d; }
  function fmt(v) { return String(Math.round(v * 100) / 100); }
  function nameOf(o) { return o && o.a && o.a.name ? o.a.name : (typeof o === 'string' ? o : ''); }
  function warn(w, e) { if (!warn[w]) { warn[w] = 1; console.warn('[smack-ui ' + w + ']', e); } }

  // ---------- our own icons ----------
  function svg(p, s, filled) {
    return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" ' + (filled ? 'fill="currentColor"' :
      'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"') + '>' + p + '</svg>';
  }
  var IC = {
    glove: '<path d="M8.2 16.9 7.3 14.3C5.6 13.8 3.9 12.5 3.9 10.9 3.9 9.6 5.3 9 6.5 9.8L7.6 10.6V7.6C7.6 5 9.7 2.8 12.3 2.8 15.5 2.8 18 5.3 18 8.5V12.6C18 14.4 17.3 15.9 16.3 16.9Z"/><rect x="7.4" y="17.7" width="9.8" height="3.6" rx="1.4"/>',
    bux: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><rect x="9" y="9" width="6" height="6" rx="1.2" fill="currentColor" stroke="none"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    check: '<path d="M5 12.5l4.2 4.2L19 7"/>',
    hut: '<path d="M3 11.5 12 4l9 7.5M5.5 9.6V20h13V9.6M10 20v-5h4v5"/>'
  };
  var BUX = function (s) { return '<span class="smk-bux">' + svg(IC.bux, s || 16) + '</span>'; };

  // ---------- styles ----------
  var CSS = '\
#smk-hud,#smk-pk{font-family:Montserrat,"Helvetica Neue",Helvetica,Arial,sans-serif;color:#202227}\
#smk-hud *,#smk-pk *{box-sizing:border-box}\
.smk-ban h1,.smk-card h2,.smk-g h3{color:#202227;text-transform:none;letter-spacing:normal;font-family:inherit}\
#smk-hud{position:fixed;inset:0;pointer-events:none;z-index:7;display:none}\
body.smk-on #hp{left:50%!important;right:auto!important;width:min(300px,calc(100% - 32px))!important;transform:translateX(-50%)!important;bottom:20px!important}\
@media(max-width:1100px){body.smk-on #help{display:none!important}}\
.smk-bux{display:inline-flex;vertical-align:-3px}\
.smk-cnt{position:absolute;left:50%;top:10px;transform:translateX(-50%);display:flex;align-items:center;gap:8px;height:38px;padding:0 18px 0 6px;background:#fff;border-radius:19px;box-shadow:0 3px 12px rgba(0,0,0,.22);white-space:nowrap}\
.smk-cnt .ic{width:28px;height:28px;border-radius:50%;background:#335fff;color:#fff;display:flex;align-items:center;justify-content:center}\
.smk-cnt b{font-size:19px;font-weight:800}.smk-cnt span{font-size:13px;font-weight:600;color:#6a6f81}\
.smk-cnt.bump{animation:smkBump .4s ease-out}\
@keyframes smkBump{0%,100%{transform:translateX(-50%) scale(1)}35%{transform:translateX(-50%) scale(1.18)}}\
.smk-pops{position:absolute;left:50%;top:30%;width:0;height:0}\
.smk-pop{position:absolute;left:0;top:0;transform:translate(-50%,-50%);text-align:center;white-space:nowrap;animation:smkPop 1.5s ease-out forwards}\
.smk-pop .p{display:inline-block;background:#335fff;color:#fff;font-size:26px;font-weight:900;padding:6px 20px;border-radius:24px;box-shadow:0 0 0 3px #fff,0 6px 20px rgba(0,0,0,.35)}\
.smk-pop .v{display:table;margin:8px auto 0;padding:3px 10px;border-radius:12px;background:rgba(18,22,40,.6);font-size:13px;font-weight:700;color:#fff}\
@keyframes smkPop{0%{transform:translate(-50%,-50%) scale(.4);opacity:0}14%{transform:translate(-50%,-50%) scale(1.12);opacity:1}24%{transform:translate(-50%,-50%) scale(1)}70%{transform:translate(-50%,-90%) scale(1);opacity:1}100%{transform:translate(-50%,-190%) scale(.9);opacity:0}}\
.smk-ban{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);min-width:320px;max-width:calc(100% - 32px);text-align:center;background:#fff;border-radius:16px;padding:18px 36px 16px;box-shadow:0 12px 44px rgba(0,0,0,.4);display:none}\
.smk-ban.on{display:block;animation:smkBan .4s cubic-bezier(.2,1.5,.45,1)}\
.smk-ban h1{margin:0;font-size:46px;line-height:1.05;font-weight:900;font-style:italic;letter-spacing:.5px;color:#e5343d}\
.smk-ban.sea h1{color:#1d8fd8}\
.smk-ban p{margin:8px 0 0;font-size:19px;font-weight:600;color:#494d5a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.smk-ban p b{color:#202227;font-weight:800}\
.smk-ban .t{margin-top:10px;font-size:13px;font-weight:600;color:#6a6f81}\
@keyframes smkBan{from{transform:translate(-50%,-50%) scale(.55);opacity:0}to{transform:translate(-50%,-50%) scale(1);opacity:1}}\
body.smk-ko #dead{color:transparent}\
.smk-ab{position:absolute;left:50%;bottom:20px;transform:translateX(-50%);display:flex;align-items:center;gap:12px;background:#fff;border-radius:14px;padding:7px 18px 7px 7px;box-shadow:0 4px 18px rgba(0,0,0,.28);white-space:nowrap;transition:opacity .2s}\
.smk-ab .sq{position:relative;width:62px;height:62px;border-radius:10px;background:radial-gradient(circle at 50% 38%,#fff,#e9edf4 75%);overflow:hidden;flex:none}\
.smk-ab .sq img{position:absolute;inset:3px;width:56px;height:56px;object-fit:contain}\
.smk-ab .smk-sw{position:absolute;inset:0;width:auto;height:auto;border:0;border-radius:10px}\
.smk-ab .n{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:21px;font-weight:900;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.7)}\
.smk-ab .ring{position:absolute;inset:0;border-radius:10px;box-shadow:inset 0 0 0 3px #335fff;opacity:0;transition:opacity .2s}\
.smk-ab.ready .ring{opacity:1}\
.smk-ab .key{position:absolute;left:3px;top:3px;min-width:19px;height:19px;padding:0 5px;border-radius:5px;background:#272930;color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;z-index:2}\
.smk-ab .tx b{display:block;font-size:16px;font-weight:800;line-height:1.2}\
.smk-ab .tx span{display:block;font-size:12px;font-weight:600;color:#6a6f81;margin-top:2px}\
.smk-ab.none .key{display:none}.smk-ab.dim{opacity:.5}\
.smk-ab.flash .sq{animation:smkFlash .35s ease-out}\
@keyframes smkFlash{0%{transform:scale(1)}30%{transform:scale(.86)}100%{transform:scale(1)}}\
.smk-toasts{position:absolute;right:16px;bottom:84px;display:flex;flex-direction:column;align-items:flex-end;gap:10px}\
.smk-toast{display:flex;align-items:center;gap:12px;width:300px;max-width:calc(100vw - 32px);background:#fff;border-radius:12px;padding:9px 16px 9px 9px;box-shadow:0 6px 24px rgba(0,0,0,.3);animation:smkIn .4s cubic-bezier(.2,1.3,.45,1)}\
.smk-toast img{width:58px;height:58px;flex:none;border-radius:8px;background:radial-gradient(circle at 50% 38%,#fff,#e9edf4 75%);object-fit:contain}\
.smk-toast .k{font-size:11px;font-weight:800;color:#335fff;text-transform:uppercase;letter-spacing:.6px}\
.smk-toast b{display:block;font-size:16px;font-weight:800;margin:1px 0}.smk-toast span{font-size:12px;font-weight:600;color:#6a6f81}\
.smk-toast.out{animation:smkOut .4s forwards}\
@keyframes smkIn{from{transform:translateX(40px);opacity:0}to{transform:none;opacity:1}}\
@keyframes smkOut{to{transform:translateX(40px);opacity:0}}\
#smk-pk{position:fixed;inset:0;z-index:40;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.45)}\
#smk-pk.on{display:flex}\
.smk-card{position:relative;width:940px;max-width:calc(100% - 32px);max-height:calc(100% - 32px);background:#fff;border-radius:12px;box-shadow:0 14px 44px rgba(0,0,0,.45);display:flex;flex-direction:column;overflow:hidden;animation:smkCard .2s ease-out}\
@keyframes smkCard{from{transform:scale(.96);opacity:0}to{transform:none;opacity:1}}\
.smk-head{display:flex;align-items:center;gap:14px;padding:14px 60px 14px 20px;border-bottom:1px solid #dfe0e4;flex-wrap:wrap}\
.smk-head h2{margin:0;font-size:24px;font-weight:800}.smk-sub{font-size:13px;color:#6a6f81;font-weight:500;margin-top:2px}\
.smk-chips{display:flex;gap:8px;margin-left:auto}\
.smk-chip{display:flex;align-items:center;gap:6px;height:32px;padding:0 12px;border-radius:16px;background:rgba(27,37,75,.07);font-size:14px;font-weight:600;color:#494d5a;white-space:nowrap}\
.smk-chip b{color:#202227;font-weight:800}.smk-chip .smk-gl{color:#335fff;display:inline-flex}\
.smk-x{position:absolute;right:12px;top:14px;width:36px;height:36px;border:0;border-radius:8px;background:none;color:#202227;cursor:pointer;display:flex;align-items:center;justify-content:center}\
.smk-x:hover{background:rgba(27,37,75,.08)}\
.smk-note{display:none;align-items:center;gap:10px;margin:14px 20px 0;padding:10px 14px;border-radius:8px;background:#fff4dc;color:#7a5200;font-size:14px;font-weight:700}\
.smk-note.on{display:flex}\
.smk-grid{padding:16px 20px 20px;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;align-items:stretch}\
.smk-g{position:relative;display:flex;flex-direction:column;gap:7px;padding:10px;border:1px solid #dfe0e4;border-radius:10px;background:#fff;min-width:0}\
.smk-g.eq{border-color:#335fff;box-shadow:0 0 0 1px #335fff}\
.smk-g .th{position:relative;height:132px;border-radius:8px;background:radial-gradient(circle at 50% 38%,#fff,#e9edf4 75%);display:flex;align-items:center;justify-content:center}\
.smk-g .th img{width:124px;height:124px;object-fit:contain}\
.smk-g.lk .th img{filter:saturate(.8)}\
.smk-g .tag{position:absolute;left:8px;top:8px;height:22px;padding:0 9px;border-radius:11px;background:#335fff;color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;gap:4px;letter-spacing:.3px}\
.smk-g .lock{position:absolute;right:8px;top:8px;width:30px;height:30px;border-radius:50%;background:#272930;color:#fff;display:flex;align-items:center;justify-content:center}\
.smk-g h3{margin:2px 0 0;font-size:16px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\
.smk-g .d{font-size:12.5px;line-height:1.35;color:#494d5a;min-height:34px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}\
.smk-g .abl{display:flex;align-items:center;gap:7px;font-size:13px;font-weight:700;min-width:0}\
.smk-g .abl i{font-style:normal;flex:none;min-width:19px;height:19px;padding:0 5px;border-radius:5px;background:#272930;color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center}\
.smk-g .abl em{font-style:normal;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\
.smk-g .abl small{margin-left:auto;flex:none;font-size:11.5px;font-weight:600;color:#6a6f81}\
.smk-g .abl.none{color:#6a6f81;font-weight:600}\
.smk-st{display:grid;grid-template-columns:62px 1fr 38px;align-items:center;gap:7px;font-size:11.5px;font-weight:600;color:#494d5a}\
.smk-st span:last-child{text-align:right;color:#202227;font-weight:700}\
.smk-bar{height:6px;border-radius:3px;background:rgba(27,37,75,.1);overflow:hidden}.smk-bar i{display:block;height:100%;border-radius:3px;background:#335fff}\
.smk-ft{margin-top:auto;padding-top:4px;display:flex;flex-direction:column;gap:6px}\
.smk-req{display:flex;justify-content:space-between;gap:6px;font-size:12.5px;font-weight:700;color:#494d5a}\
.smk-req b{color:#202227;font-weight:800}\
.smk-ft .smk-bar.p i{background:#00a86b}\
.smk-need{font-size:11.5px;font-weight:600;color:#6a6f81;text-align:center}.smk-need .smk-bux{margin:0 2px 0 3px}\
.smk-btn{width:100%;height:36px;border:0;border-radius:8px;font:inherit;font-size:15px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px}\
.smk-btn.blue{background:#335fff;color:#fff}.smk-btn.blue:hover{background:#2a50e0}\
.smk-btn.dark{background:#272930;color:#fff}.smk-btn.dark:hover{background:#3a3d46}\
.smk-btn.light{background:rgba(27,37,75,.08);color:#202227}\
.smk-btn:disabled{cursor:default}.smk-btn.blue:disabled{background:#335fff;opacity:.45}.smk-btn.light:disabled{color:#494d5a}\
.smk-foot{padding:10px 20px;border-top:1px solid #dfe0e4;font-size:12.5px;font-weight:500;color:#6a6f81;display:flex;gap:16px;flex-wrap:wrap}\
.smk-foot kbd{font:inherit;font-weight:800;color:#202227;background:rgba(27,37,75,.08);border-radius:4px;padding:1px 6px}\
@media(max-width:600px){.smk-grid{grid-template-columns:repeat(auto-fill,minmax(160px,1fr));padding:12px}.smk-ban h1{font-size:34px}.smk-head{padding-right:56px}}\
';

  // ---------- glove photos (3D, rendered once each, cached) ----------
  var TH = {}, ownTR = null;
  function photoRenderer() {
    var tr = G(function () { return TR; }); // the hub's shop-photo renderer (180x180, transparent, sRGB)
    if (tr && tr.domElement) return tr;
    if (!ownTR) { ownTR = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); ownTR.setSize(180, 180); ownTR.outputEncoding = THREE.sRGBEncoding; }
    return ownTR;
  }
  function defaultGlove(def) { // smooth rounded mitten (only when no other builder exists)
    var T = THREE, g = new T.Group();
    var m1 = new T.MeshStandardMaterial({ color: def.color || '#f5f5f5', roughness: .45 }), m2 = new T.MeshStandardMaterial({ color: def.color2 || '#d9d9d9', roughness: .5 });
    var palm = new T.Mesh(new T.SphereGeometry(.62, 32, 24), m1); palm.scale.set(1, 1.18, .82); g.add(palm);
    var th = new T.Mesh(new T.SphereGeometry(.3, 24, 18), m1); th.scale.set(1, 1.5, 1); th.position.set(.55, .05, .12); th.rotation.z = -.5; g.add(th);
    var cuff = new T.Mesh(new T.CylinderGeometry(.5, .52, .38, 32), m2); cuff.position.y = .74; g.add(cuff);
    return g;
  }
  function gloveMesh(def) {
    var o = null;
    try { if (S.buildGlove) o = S.buildGlove(def); } catch (e) { warn('buildGlove', e); }
    if (!o) try { if (typeof def.build === 'function') o = def.build(THREE); } catch (e) { warn('build ' + def.id, e); }
    return o && o.isObject3D ? o : defaultGlove(def);
  }
  function svgPhoto(def) {
    var c = String(def.color || '#f5f5f5').replace(/[^#\w(),.% ]/g, '');
    return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="' + c + '" stroke="#0004" stroke-width=".5">' + IC.glove + '</g></svg>');
  }
  function photo(def) {
    if (!def) return '';
    if (TH[def.id]) return TH[def.id];
    var url = '';
    try {
      if (!window.THREE) throw new Error('no THREE');
      var r = photoRenderer(), sc = new THREE.Scene();
      sc.add(new THREE.HemisphereLight('#ffffff', '#8090a0', 1.1));
      var l = new THREE.DirectionalLight('#ffffff', .9); l.position.set(3, 6, 8); sc.add(l);
      var obj = gloveMesh(def), piv = new THREE.Group();
      obj.updateMatrixWorld(true);
      var box = new THREE.Box3().setFromObject(obj);
      if (box.isEmpty()) throw new Error('empty glove');
      var c = box.getCenter(new THREE.Vector3()), sph = box.getBoundingSphere(new THREE.Sphere());
      var hold = new THREE.Group(); hold.position.copy(c).multiplyScalar(-1); hold.add(obj); // centre it, then turn it to a 3/4 view
      // catalogue pose: fingers up, cuff down, turned 3/4 (gloves are built fingers-down); def.photoRot [x,y,z] overrides it
      var pr = Array.isArray(def.photoRot) && def.photoRot.length === 3 ? def.photoRot : [.25, .6, Math.PI];
      piv.add(hold); piv.rotation.set(num(pr[0], 0), num(pr[1], 0), num(pr[2], 0)); sc.add(piv);
      var cam = new THREE.PerspectiveCamera(28, 1, .01, 1000), d = sph.radius / Math.sin(THREE.MathUtils.degToRad(14)) * 1.04;
      cam.position.set(0, 0, d); cam.lookAt(0, 0, 0);
      var oc = r.getClearColor(new THREE.Color()).clone(), oa = r.getClearAlpha();
      r.setClearColor(0x000000, 0); r.clear(); r.render(sc, cam); url = r.domElement.toDataURL('image/png');
      r.setClearColor(oc, oa);
      if (url.length < 200) url = '';
    } catch (e) { warn('photo', e); }
    return (TH[def.id] = url || svgPhoto(def));
  }

  // ---------- glove state helpers ----------
  function save() { return S.save || {}; }
  function smacks() { return num(save().slaps, 0) | 0; } // Slaps: the only glove currency (+1 per landed slap)
  function price(def) { try { if (S.price) return S.price(def) | 0; } catch (e) { } var u = def.unlock || {}; return num(u.slaps != null ? u.slaps : u.smacks != null ? u.smacks : u.bux, 0) | 0; }
  function bux() { return smacks(); }
  function isStarter(def) { return price(def) <= 0; }
  function isOwned(def) {
    if (isStarter(def)) return true;
    try { if (S.owned) return !!S.owned(def.id); } catch (e) { warn('owned', e); }
    var u = def.unlock || {};
    return (save().owned || []).indexOf(def.id) >= 0;
  }
  function gloveOf(o) {
    if (!o) return null;
    var d = null;
    try { if (S.gloveOf) d = S.gloveOf(o); } catch (e) { warn('gloveOf', e); }
    return d || S.byId[o.glove] || (o === ME() ? S.byId[save().equipped] : null) || null;
  }
  function equippedId() { var d = gloveOf(ME()); return d ? d.id : save().equipped; }
  function inSafe() { var m = ME(); if (!m) return false; try { return S.inSafe ? !!S.inSafe(m) : true; } catch (e) { warn('inSafe', e); return true; } }
  function sorted() { // starters, then by Slap price; stable
    var rank = function (d) { return price(d); };
    return S.gloves.map(function (d, i) { return [rank(d), i, d]; }).sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; }).map(function (x) { return x[2]; });
  }

  // ---------- DOM ----------
  var hud, cnt, cntN, pops, ban, abEl, abImg, abSw, abN, abName, abSub, toasts, pk, pkGrid, pkNote, pkS, pkB;
  function mk(tag, cls, html, parent) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; }
  function build() {
    if (hud) return;
    var st = document.createElement('style'); st.id = 'smk-css'; st.textContent = CSS; document.head.appendChild(st);
    hud = mk('div', '', null, document.body); hud.id = 'smk-hud';
    cnt = mk('div', 'smk-cnt', '<div class="ic">' + svg(IC.glove, 18, true) + '</div><b>0</b><span>Slaps</span>', hud); cntN = cnt.querySelector('b');
    pops = mk('div', 'smk-pops', '', hud);
    ban = mk('div', 'smk-ban', '<h1></h1><p></p><div class="t"></div>', hud);
    abEl = mk('div', 'smk-ab none', '<div class="sq"><img alt=""><div class="smk-sw"></div><div class="ring"></div><div class="n"></div><div class="key">E</div></div><div class="tx"><b></b><span></span></div>', hud);
    abImg = abEl.querySelector('img'); abSw = abEl.querySelector('.smk-sw'); abN = abEl.querySelector('.n'); abName = abEl.querySelector('.tx b'); abSub = abEl.querySelector('.tx span');
    toasts = mk('div', 'smk-toasts', '', hud);
    pk = mk('div', '', '<div class="smk-card" role="dialog" aria-label="Gloves"><div class="smk-head"><div><h2>Gloves</h2><div class="smk-sub">Every slap that lands earns 1 Slap. Spend Slaps on gloves</div></div>' +
      '<div class="smk-chips"><span class="smk-chip"><span class="smk-gl">' + svg(IC.glove, 17, true) + '</span><b class="s">0</b> Slaps</span><b class="b" style="display:none">0</b></div>' +
      '<button class="smk-x" title="Close (G)">' + svg(IC.x, 22) + '</button></div>' +
      '<div class="smk-note">' + svg(IC.hut, 20) + 'Go back to the hut to change gloves</div><div class="smk-grid"></div>' +
      '<div class="smk-foot"><span><kbd>G</kbd> open / close gloves</span><span><kbd>E</kbd> use your glove\'s ability</span><span><kbd>Esc</kbd> close</span></div></div>', document.body);
    pk.id = 'smk-pk';
    pkGrid = pk.querySelector('.smk-grid'); pkNote = pk.querySelector('.smk-note'); pkS = pk.querySelector('.smk-chip b.s'); pkB = pk.querySelector('.smk-chip b.b');
    pk.querySelector('.smk-x').onclick = function () { closePicker(true); };
    pk.addEventListener('mousedown', function (e) { if (e.target === pk) closePicker(true); });
    pkGrid.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-act]'); if (!b || b.disabled) return;
      var def = S.byId[b.getAttribute('data-id')]; if (!def) return;
      if (b.getAttribute('data-act') === 'equip') doEquip(def); else doBuy(def);
    });
  }
  function showHud(on) {
    if (!hud) { if (!on) return; build(); }
    hud.style.display = on ? 'block' : 'none';
    document.body.classList.toggle('smk-on', !!on);
    if (!on) { hideBanner(); closePicker(false); pops.innerHTML = ''; toasts.innerHTML = ''; }
  }

  // ---------- glove picker ----------
  var open = false, firstStart = true, lastSig = '', buyArm = null, gHeld = false;
  function openPicker() {
    if (!active()) return;
    build(); showHud(true);
    if (!open) { open = true; pk.classList.add('on'); lastSig = ''; }
    unlockPointer(); renderPicker(true);
  }
  function closePicker(relock) {
    if (!open) return;
    open = false; buyArm = null; if (pk) pk.classList.remove('on');
    var c = canvasEl();
    if (relock && c && active() && document.pointerLockElement !== c) try { var p = c.requestPointerLock(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
  }
  function unlockPointer() { try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) {} }
  function statMax() {
    var m = { p: 2, s: 1.5, c: 2 };
    S.gloves.forEach(function (d) { m.p = Math.max(m.p, num(d.power, 1)); m.s = Math.max(m.s, num(d.speed, 1)); m.c = Math.max(m.c, num(d.cooldown, .8)); });
    return m;
  }
  function stat(label, v, max, txt) {
    return '<div class="smk-st"><span>' + label + '</span><div class="smk-bar"><i style="width:' + Math.max(4, Math.min(100, v / max * 100)).toFixed(1) + '%"></i></div><span>' + txt + '</span></div>';
  }
  function card(def, st, mx) {
    var id = escH(def.id), own = isOwned(def), eq = st.eq === def.id, u = def.unlock || {}, ab = def.ability, h = [];
    h.push('<div class="smk-g' + (eq ? ' eq' : '') + (own ? '' : ' lk') + '"><div class="th"><img alt="" src="' + photo(def) + '">' +
      (eq ? '<span class="tag">' + svg(IC.check, 12) + 'EQUIPPED</span>' : '') + (own ? '' : '<span class="lock">' + svg(IC.lock, 16) + '</span>') + '</div>');
    h.push('<h3 title="' + escH(def.name || def.id) + '">' + escH(def.name || def.id) + '</h3><div class="d">' + escH(def.desc || '') + '</div>');
    h.push(ab && ab.name ? '<div class="abl"><i>E</i><em>' + escH(ab.name) + '</em>' + (num(ab.cooldown, 0) > 0 ? '<small>' + fmt(num(ab.cooldown, 0)) + 's</small>' : '') + '</div>' : '<div class="abl none">No ability</div>');
    var p = num(def.power, 1), s = num(def.speed, 1), c = num(def.cooldown, .8);
    h.push(stat('Power', p, mx.p, '×' + fmt(p)) + stat('Speed', s, mx.s, '×' + fmt(s)) + stat('Cooldown', c, mx.c, fmt(c) + 's'));
    h.push('<div class="smk-ft">');
    if (own) {
      if (eq) h.push('<button class="smk-btn light" disabled>' + svg(IC.check, 16) + 'Equipped</button>');
      else if (!st.safe) h.push('<button class="smk-btn light" disabled>' + svg(IC.hut, 16) + 'Equip in the hut</button>');
      else h.push('<button class="smk-btn blue" data-act="equip" data-id="' + id + '">Equip</button>');
    } else {
      var pr = price(def), can = st.smacks >= pr, armed = can && buyArm && buyArm.id === def.id && buyArm.until > st.now;
      h.push('<button class="smk-btn ' + (armed ? 'dark' : 'blue') + '" data-act="buy" data-id="' + id + '"' + (can ? '' : ' disabled') + '>' + (armed ? 'Confirm ' : 'Buy ') + pr.toLocaleString() + ' Slaps</button>');
      if (!can) h.push('<div class="smk-need">You need ' + (pr - st.smacks).toLocaleString() + ' more Slaps</div><div class="smk-bar p"><i style="width:' + (st.smacks / pr * 100).toFixed(1) + '%"></i></div>');
    }
    h.push('</div></div>');
    return h.join('');
  }
  function pickerState() {
    var now = performance.now();
    return { smacks: smacks(), bux: bux(), safe: inSafe(), eq: equippedId(), now: now };
  }
  function renderPicker(force) {
    if (!open || !pk) return;
    try {
      var st = pickerState(), gl = sorted();
      var sig = [st.smacks, st.bux, st.safe, st.eq, gl.length, buyArm && buyArm.until > st.now ? buyArm.id : '', gl.map(function (d) { return isOwned(d) ? 1 : 0; }).join('')].join('|');
      pkS.textContent = st.smacks.toLocaleString(); pkB.textContent = st.bux.toLocaleString();
      pkNote.classList.toggle('on', !st.safe);
      if (!force && sig === lastSig) return;
      lastSig = sig;
      var mx = statMax();
      pkGrid.innerHTML = gl.length ? gl.map(function (d) { return card(d, st, mx); }).join('') :
        '<div style="grid-column:1/-1;text-align:center;color:#6a6f81;padding:40px 0;font-weight:600">No gloves yet.</div>';
    } catch (e) { warn('render', e); }
  }
  function doEquip(def) {
    var m = ME(); if (!m || !isOwned(def)) return;
    if (!inSafe()) { renderPicker(true); return; }
    try { if (S.equip) S.equip(m, def.id); else m.glove = def.id; } catch (e) { warn('equip', e); }
    try { if (S.save) { S.save.equipped = def.id; if (S.saveNow) S.saveNow(); } } catch (e) { warn('save', e); }
    abDef = undefined; closePicker(true);
  }
  function doBuy(def) {
    var pr = price(def), now = performance.now();
    if (!pr || isOwned(def)) { renderPicker(true); return; }
    if (!buyArm || buyArm.id !== def.id || buyArm.until < now) { buyArm = { id: def.id, until: now + 4000 }; renderPicker(true); return; }
    buyArm = null;
    try { if (S.buy) S.buy(def.id); } catch (e) { warn('buy', e); }
    renderPicker(true); watchOwned();
  }

  // ---------- HUD: Smacks, pops, banner, ability button, toasts ----------
  var lastSmacks = null, lastPopT = 0, banOn = false, banT = 0, banKey = '', abDef, abState = '', abPosT = 0, ownedSnap = null, toasted = {};
  function pop(victim) {
    if (!hud) return;
    var d = mk('div', 'smk-pop', '<div class="p">+1 Slap</div>' + (victim ? '<div class="v">You smacked out <b>' + escH(victim) + '</b></div>' : ''), pops);
    setTimeout(function () { d.remove(); }, 1600); lastPopT = performance.now();
  }
  function showBanner(by) {
    build();
    var nm = by && by !== ME() ? nameOf(by) : '', key = nm || '~sea';
    if (banOn && banKey === key) return;
    banKey = key; banOn = true; banT = performance.now();
    ban.querySelector('h1').textContent = nm ? 'SMACKED OUT' : 'SPLASH!';
    ban.querySelector('p').innerHTML = nm ? 'by <b>' + escH(nm) + '</b>' : 'You fell in the sea';
    ban.classList.toggle('sea', !nm);
    ban.classList.remove('on'); void ban.offsetWidth; ban.classList.add('on');
    document.body.classList.add('smk-ko');
  }
  function hideBanner() { banOn = false; banKey = ''; if (ban) ban.classList.remove('on'); document.body.classList.remove('smk-ko'); }
  function toastUnlock(def) {
    if (!hud || !def || toasted[def.id] || isStarter(def)) return;
    toasted[def.id] = 1;
    var d = mk('div', 'smk-toast', '<img alt="" src="' + photo(def) + '"><div><div class="k">New glove unlocked</div><b>' + escH(def.name || def.id) + '</b><span>' +
      (inSafe() ? 'Press G to equip it' : 'Press G in the hut to equip it') + '</span></div>', toasts);
    setTimeout(function () { d.classList.add('out'); setTimeout(function () { d.remove(); }, 450); }, 4500);
  }
  function watchOwned() { // toast gloves that became owned (Smack goals reached, bought) even if no 'unlocked' hook came
    if (!S.gloves.length) return;
    var cur = {};
    S.gloves.forEach(function (d) { if (isOwned(d)) cur[d.id] = 1; else delete toasted[d.id]; });
    if (ownedSnap) for (var id in cur) if (!ownedSnap[id]) toastUnlock(S.byId[id]);
    ownedSnap = cur;
  }
  function dropPlainToast(def) { // smack.js also announces unlocks with the engine's plain toast(): ours replaces it
    try {
      var n = def.name || def.id, want = ['🧤 New glove unlocked: ' + n, '🧤 Bought ' + n + '!'], k = document.body.children;
      for (var i = k.length - 1, j = 0; i >= 0 && j < 6; i--, j++) if (k[i].tagName === 'DIV' && !k[i].id && want.indexOf(k[i].textContent) >= 0) { k[i].remove(); break; }
    } catch (e) { }
  }
  function aboveOf(ids, min) { // px from the bottom that clears the given (visible) engine elements
    var b = min;
    ids.forEach(function (id) {
      var e = document.getElementById(id); if (!e || !e.getClientRects().length) return; // not shown (fixed elements have no offsetParent)
      var r = e.getBoundingClientRect(); if (r.height > 0 && r.top < innerHeight) b = Math.max(b, innerHeight - r.top + 12);
    });
    return b;
  }
  function place() { // ability button just above the engine's bottom-centre panel (#hp); toasts above Hub / server buttons
    abEl.style.bottom = aboveOf(['hp'], 20) + 'px';
    toasts.style.bottom = aboveOf(['back', 'ubxnet-btn'], 84) + 'px';
  }
  function updAbility(m) {
    var def = gloveOf(m), ab = def && def.ability;
    if (def !== abDef) {
      abDef = def;
      abImg.src = def ? photo(def) : ''; abImg.style.visibility = def ? 'visible' : 'hidden';
      abName.textContent = ab && ab.name ? ab.name : (def ? def.name || def.id : 'No glove');
      abSub.textContent = ab && ab.name ? (def.name || def.id) : 'No ability · G for gloves';
      abEl.classList.toggle('none', !(ab && ab.name)); abState = '';
    }
    var tot = ab ? Math.max(.01, num(ab.cooldown, 1)) : 1, cd = ab ? Math.max(0, num(m.abilityCd, 0)) : 0, f = Math.min(1, cd / tot);
    var a = Math.round((1 - f) * 360), s = (ab ? (f > 0 ? a : 'r') : 'x') + (m.ko > 0 || m.stun > 0 ? 'd' : '') + (f > 0 ? (cd >= 10 ? Math.ceil(cd) : cd.toFixed(1)) : '');
    if (s === abState) return; abState = s;
    // cooling down: the button dims and the part still to recharge is darker; the light part grows clockwise from 12
    abSw.style.background = f > 0 ? 'conic-gradient(rgba(18,22,40,.3) ' + a + 'deg,rgba(18,22,40,.68) ' + a + 'deg)' : 'none';
    abN.textContent = f > 0 ? (cd >= 10 ? Math.ceil(cd) : cd.toFixed(1)) : '';
    abEl.classList.toggle('ready', !!ab && f === 0);
    abEl.classList.toggle('dim', m.ko > 0);
  }
  function hudTick() {
    if (!active()) { if (hud && hud.style.display !== 'none') showHud(false); return; }
    var m = ME(); if (!m) return;
    if (!hud || hud.style.display === 'none') showHud(true);
    var n = smacks();
    if (n !== lastSmacks) {
      if (lastSmacks !== null && n > lastSmacks) { cnt.classList.remove('bump'); void cnt.offsetWidth; cnt.classList.add('bump'); if (performance.now() - lastPopT > 600) pop(''); }
      lastSmacks = n; cntN.textContent = n.toLocaleString();
    }
    updAbility(m);
    var now = performance.now();
    if (now - abPosT > 500) { abPosT = now; place(); }
    if (m.ko > 0) {
      if (!banOn) { var hb = m.lastHitBy, recent = hb && hb !== m && (!m.lastHitT || now - m.lastHitT < 8000); showBanner(recent ? hb : null); }
      var bt = 'Back to the hut in ' + Math.max(1, Math.ceil(m.ko)) + '…', te = ban.querySelector('.t'); if (te.textContent !== bt) te.textContent = bt;
    } else if (banOn && now - banT > 700) hideBanner();
    if (open && document.pointerLockElement) unlockPointer();
  }

  // ---------- hooks ----------
  S.add('start', function () {
    build(); showHud(true); hideBanner(); lastSmacks = null; abDef = undefined; ownedSnap = null; toasted = {};
    watchOwned(); hudTick();
    firstStart = false; // the lobby's glove pedestals replace the startup picker
  });
  S.add('stop', function () { showHud(false); });
  S.add('tick', function () { hudTick(); });
  S.add('openPicker', function () { openPicker(); return true; });
  S.add('gloveAdded', function () { if (open) renderPicker(true); });
  S.add('unlocked', function (g) { if (!g || !active()) return; dropPlainToast(g); toastUnlock(g); if (ownedSnap) ownedSnap[g.id] = 1; if (open) renderPicker(true); });
  S.add('equip', function (o) { if (o === ME()) { abDef = undefined; if (open) renderPicker(); } });
  S.add('ability', function (o) { if (o === ME() && abEl) { abEl.classList.remove('flash'); void abEl.offsetWidth; abEl.classList.add('flash'); } });
  S.add('beforeSlap', function (o) { if (open && o === ME()) return false; }); // no slapping while choosing
  S.add('ko', function (t, by) {
    var m = ME(); if (!m || !active()) return;
    if (t === m) showBanner(by && by !== m ? by : null);
    else if (by && by === m) pop(nameOf(t));
  });

  // keys while the picker is open: G / Esc close it (and G is kept from smack.js so it doesn't reopen), E is held back
  addEventListener('keydown', function (e) {
    if (e.code === 'KeyG' && gHeld) { e.stopPropagation(); return; }
    if (!open) return;
    if (e.code === 'Escape' || e.code === 'KeyG') {
      e.preventDefault(); e.stopPropagation();
      if (!e.repeat) { if (e.code === 'KeyG') gHeld = true; closePicker(e.code === 'KeyG'); }
    } else if (e.code === 'KeyE') e.stopPropagation();
  }, true);
  addEventListener('keyup', function (e) { if (e.code === 'KeyG') gHeld = false; }, true);
  document.addEventListener('pointerlockchange', function () { if (open && document.pointerLockElement) unlockPointer(); });

  // slow watcher: hides everything when the mode is left without a 'stop', keeps the open picker and unlocks current
  setInterval(function () {
    try {
      if (!active()) { if (hud && hud.style.display !== 'none') showHud(false); return; }
      watchOwned(); if (open) renderPicker();
    } catch (e) { warn('watch', e); }
  }, 250);

  S.ui = { open: openPicker, close: closePicker, update: function () { hudTick(); watchOwned(); renderPicker(); }, photo: photo, banner: showBanner, pop: pop };
})();
