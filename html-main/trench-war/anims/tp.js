// Trench War third-person (Arsenal-style) avatar pose layer. Runs every frame after the base walk pose.
window.TWA_TP = function (o, u, S) {
  var PI2 = Math.PI / 2, dt = Math.min(S.dt || 0.016, 0.1), speed = S.speed || 0;
  var a = u.arms, ch = a.children, R = ch[0], L = ch[1], b = u.body;
  var t = u._tp;
  if (!t) t = u._tp = { t: Math.random() * 6, rx: -PI2, lx: -PI2, ly: -0.6, lz: 0, drop: 0, lean: 0, sway: 0, bob: 0, mv: 0, ay: 0.5 };
  var k = 1 - Math.exp(-dt * 12), id = S.gun;
  t.t += dt;
  var moving = speed > 0.3, sprint = speed > 6;
  // walk-synced bob (u.ph is the leg phase from the base animation)
  var mvT = moving ? 1 : 0; t.mv += (mvT - t.mv) * k;
  var ph = u.ph || 0;
  var step = Math.sin(ph * 2) * t.mv;          // two bobs per stride
  var sway = Math.sin(ph) * t.mv;
  var breath = Math.sin(t.t * 2.1) * (1 - t.mv);
  var dropT = sprint ? 0.35 : 0; t.drop += (dropT - t.drop) * k;
  var leanT = S.crouch ? 0.28 : (sprint ? 0.1 : 0); t.lean += (leanT - t.lean) * k;
  // targets for the individual arms
  var rx = -PI2, lx = -PI2, ly = -0.6, lz = 0;
  if (id === 'knife') { lx = 0.08; ly = 0; lz = 0.05; }
  else if (id === 'nade') { rx = -PI2 - 1.0; lx = -PI2; }
  t.rx += (rx - t.rx) * k; t.lx += (lx - t.lx) * k; t.ly += (ly - t.ly) * k; t.lz += (lz - t.lz) * k;
  R.rotation.set(t.rx, 0, 0);
  L.rotation.order = 'YXZ'; L.rotation.set(t.lx, t.ly, t.lz);
  // whole arms group (arms + gun): breathing, walk bob, sprint drop
  a.rotation.x += t.drop + step * 0.05 + breath * 0.012;
  a.rotation.y = sway * 0.04;
  a.position.y = t.ay + step * 0.06 + breath * 0.02;
  // body sway and crouch lean (absolute; base doesn't touch these)
  if (b) { b.rotation.x = t.lean + sprint * 0.0; b.rotation.z = sway * 0.035 * (sprint ? 1.5 : 1); b.rotation.y = -sway * 0.05; }
};
