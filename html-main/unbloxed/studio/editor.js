// Unbloxed Studio editor. Map format: studio/FORMAT.md. Classic script (works from file://), needs THREE r128 + TransformControls.
(function () {
'use strict';
const $ = id => document.getElementById(id);
const V3 = THREE.Vector3, DEG = Math.PI / 180;
const SHAPES = ['block', 'ball', 'cylinder', 'wedge'];
const MATS = ['plastic', 'smooth', 'neon', 'metal', 'wood', 'glass', 'grass', 'brick'];
const KINDS = ['none', 'spawn', 'kill', 'checkpoint', 'finish', 'spinner', 'mover', 'bounce', 'botspawner', 'waypoint']; // botspawner/waypoint: studio/bots.js
const KIND_LABEL = { none: 'None', spawn: 'Spawn', kill: 'Kill brick', checkpoint: 'Checkpoint', finish: 'Finish', spinner: 'Spinner', mover: 'Moving platform', bounce: 'Bounce pad', botspawner: 'Bot spawner', waypoint: 'Waypoint' };
const KIND_ICON = { none: '', spawn: '🧍', kill: '☠️', checkpoint: '🚩', finish: '🏁', spinner: '🌀', mover: '↔️', bounce: '⏫', botspawner: '🤖', waypoint: '📍' };
const SKIES = ['day', 'sunset', 'night'];
const DEF_SETTINGS = { walk: 16, jump: 50, gravity: 196, lives: 0, timer: true, gears: false };
const LS_INDEX = 'ubx_studio_projects', LS_P = 'ubx_studio_p_', LS_PLAY = 'ubx_studio_play', LS_LAST = 'ubx_studio_last';
const LEGACY = { obby: ['Obby Unbloxed', '🧗'], heights: ['Unblocked On The Heights', '⚔️'], steal: ['Steal a Blocker', '🛡️'], disaster: ['Natural Disasters', '🌋'], mysteryHouse: ['Murder Mystery: House', '🔪'], mysteryClassic: ['Murder Mystery: Classic', '🕵️'] };

// ---------- icons ----------
const S = (d, extra) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"' + (extra || '') + '>' + d + '</svg>';
const ICONS = {
  undo: S('<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>'),
  redo: S('<path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>'),
  select: S('<path d="M5 3l14 7-6 2-2 6z" fill="currentColor" fill-opacity=".25"/>'),
  move: S('<path d="M12 2v20M2 12h20"/><path d="m9 5 3-3 3 3M9 19l3 3 3-3M5 9l-3 3 3 3M19 9l3 3-3 3"/>'),
  scale: S('<rect x="3" y="11" width="10" height="10" rx="1"/><path d="M14 3h7v7M21 3l-8 8"/>'),
  rotate: S('<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v5h-5"/>'),
  block: S('<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>'),
  ball: S('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12c3 2.5 14 2.5 17 0" opacity=".6"/>'),
  cylinder: S('<ellipse cx="12" cy="5.5" rx="7" ry="2.5"/><path d="M5 5.5v13c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-13"/>'),
  wedge: S('<path d="M3 19h18V6z"/><path d="M21 6 14 3 3 16" opacity=".5"/>'),
  game: S('<path d="M5 21V4M5 4h12l-2.5 4L17 12H5"/>'),
  focus: S('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/><circle cx="12" cy="12" r="3"/>'),
  gear: S('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>')
};
document.querySelectorAll('[data-ic]').forEach(el => el.innerHTML = ICONS[el.dataset.ic] || '');

// ---------- helpers ----------
const r3 = v => Math.round(v * 1000) / 1000;
const r4 = v => Math.round(v * 10000) / 10000;
const fmt = v => String(r3(v));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = o => JSON.parse(JSON.stringify(o));
function vec(a, d) { return Array.isArray(a) && a.length >= 3 ? [0, 1, 2].map(i => isFinite(+a[i]) ? +a[i] : d[i]) : d.slice(); }
function hexColor(c, d) {
  if (typeof c === 'string') { try { return '#' + new THREE.Color(c.trim()).getHexString(); } catch (e) { /* fallthrough */ } }
  return d;
}
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
function toast(t, bad) { const e = $('toast'); e.textContent = t; e.className = bad ? 'bad' : ''; e.style.display = 'block'; clearTimeout(toast.t); toast.t = setTimeout(() => e.style.display = 'none', 2600); }
function authorName() { try { const c = JSON.parse(lsGet('shooter_creds') || 'null'); if (c && c.u) return c.u; const a = JSON.parse(lsGet('unbloxed_av') || '{}'); return a.name || 'Guest'; } catch (e) { return 'Guest'; } }

// ---------- map model ----------
let map = null;           // current v1 map object
let projId = null;        // localStorage project id
const taken = new Set();  // part ids in use
let seq = 0;
function newId() { let id; do id = 'p' + (++seq); while (taken.has(id)); taken.add(id); return id; }

function normPart(p, ids) {
  p = p && typeof p === 'object' ? p : {};
  if (typeof p.id !== 'string' || !p.id || ids.has(p.id)) p.id = null;
  if (p.id) ids.add(p.id);
  if (typeof p.name !== 'string') p.name = 'Part';
  if (!SHAPES.includes(p.shape)) p.shape = 'block';
  p.p = vec(p.p, [0, 0.5, 0]); p.s = vec(p.s, [4, 1, 2]).map(v => Math.max(0.05, Math.abs(v))); p.r = vec(p.r, [0, 0, 0]);
  p.c = hexColor(p.c, '#a3a2a5');
  if (!MATS.includes(p.mat)) p.mat = 'plastic';
  p.t = Math.min(1, Math.max(0, +p.t || 0));
  p.collide = p.collide !== false && p.collide !== 0;
  if (!KINDS.includes(p.kind)) p.kind = 'none';
  kindDefaults(p);
  return p;
}
function kindDefaults(p) {
  if (p.kind === 'spinner') p.spin = vec(p.spin, [0, 1.5, 0]);
  if (p.kind === 'mover') { const m = p.move && typeof p.move === 'object' ? p.move : {}; p.move = Object.assign({}, m, { d: vec(m.d, [0, 0, 10]), t: +m.t > 0 ? +m.t : 3 }); }
  if (p.kind === 'bounce') p.bounce = isFinite(+p.bounce) && p.bounce !== null && p.bounce !== '' ? +p.bounce : 80;
  if (p.kind === 'checkpoint' && !(+p.cp >= 1)) {
    let mx = 0; if (map) for (const q of map.parts) if (q !== p && q.kind === 'checkpoint') mx = Math.max(mx, +q.cp || 0);
    p.cp = mx + 1;
  }
}
function normMap(m) {
  m = m && typeof m === 'object' && !Array.isArray(m) ? m : {};
  m.v = 1;
  if (typeof m.name !== 'string' || !m.name.trim()) m.name = 'Untitled Game';
  if (typeof m.desc !== 'string') m.desc = '';
  if (typeof m.author !== 'string') m.author = authorName();
  if (typeof m.icon !== 'string' || !m.icon) m.icon = '🧱';
  if (!SKIES.includes(m.sky)) m.sky = 'day';
  m.settings = Object.assign({}, DEF_SETTINGS, m.settings && typeof m.settings === 'object' ? m.settings : {});
  const ids = new Set();
  m.parts = (Array.isArray(m.parts) ? m.parts : []).map(p => normPart(p, ids));
  taken.clear(); ids.forEach(i => taken.add(i));
  seq = 0; for (const i of ids) { const n = /^p(\d+)$/.exec(i); if (n) seq = Math.max(seq, +n[1]); }
  for (const p of m.parts) if (!p.id) p.id = newId();
  return m;
}
function defaultMap() {
  return {
    v: 1, name: 'Untitled Game', desc: '', author: authorName(), icon: '🧱', sky: 'day', settings: Object.assign({}, DEF_SETTINGS),
    parts: [
      { id: 'p1', name: 'Baseplate', shape: 'block', p: [0, -2, 0], s: [256, 4, 256], r: [0, 0, 0], c: '#5f6b7a', mat: 'plastic', t: 0, collide: true, kind: 'none' },
      { id: 'p2', name: 'SpawnLocation', shape: 'block', p: [0, 0.5, 0], s: [6, 1, 6], r: [0, 0, 0], c: '#d8dde6', mat: 'smooth', t: 0, collide: true, kind: 'spawn' }
    ]
  };
}

// legacy UBX_MAPS -> v1 (FORMAT.md "Legacy Unbloxed maps")
function fromLegacy(L, key) {
  const parts = [];
  let n = 0;
  const qz = new THREE.Quaternion().setFromAxisAngle(new V3(0, 0, 1), -Math.PI / 2), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (const a of L.parts || []) {
    if (!Array.isArray(a) || a.length < 9) continue;
    const shape = a[12] === 'cylinder' || a[12] === 'ball' || a[12] === 'wedge' ? a[12] : 'block';
    let s = [a[3], a[4], a[5]], r = [a[6], a[7], a[8]];
    if (shape === 'cylinder') { // Roblox cylinder axis is local X; v1 axis is local Y
      const d = Math.min(a[4], a[5]); s = [d, a[3], d];
      q.setFromEuler(e.set(r[0], r[1], r[2], 'YXZ')).multiply(qz); e.setFromQuaternion(q, 'YXZ'); r = [e.x, e.y, e.z];
    }
    if (shape === 'ball') { const d = Math.min(s[0], s[1], s[2]); s = [d, d, d]; }
    parts.push({
      id: 'p' + (++n), name: typeof a[13] === 'string' && a[13] ? a[13] : 'Part', shape, p: [a[0], a[1], a[2]], s, r: r.map(r4),
      c: typeof a[9] === 'string' ? a[9] : '#a3a2a5', mat: 'plastic', t: +a[10] || 0, collide: a[11] !== 0 && a[11] !== false, kind: 'none'
    });
  }
  let spawns = (L.spawns || []).filter(s => Array.isArray(s) && s.length >= 3);
  if (!spawns.length && parts.length) { // no spawns: the obby's first checkpoint pad, else the biggest solid visible part
    let best = key === 'obby' && parts[6] && parts[6].name === 'Touch' ? parts[6] : null;
    if (!best) for (const p of parts) if (p.collide && p.t < 1 && (!best || p.s[0] * p.s[2] > best.s[0] * best.s[2])) best = p;
    if (best) spawns = [[best.p[0], best.p[1] + best.s[1] / 2 + 0.5, best.p[2]]];
  }
  for (const sp of spawns) parts.push({ id: 'p' + (++n), name: 'SpawnLocation', shape: 'block', p: [sp[0], r3(sp[1] - 0.5), sp[2]], s: [4, 1, 4], r: [0, 0, 0], c: '#d8dde6', mat: 'plastic', t: 1, collide: false, kind: 'spawn' });
  const info = LEGACY[key] || [key, '🧱'];
  return { v: 1, name: info[0] + ' (copy)', desc: 'Converted from the Unbloxed map "' + key + '"', author: authorName(), icon: info[1], sky: key === 'disaster' || key === 'heights' ? 'sunset' : 'day', settings: Object.assign({}, DEF_SETTINGS), parts, src: 'legacy:' + key };
}

// ---------- three.js scene ----------
const vp = $('viewport');
const renderer = new THREE.WebGLRenderer({ antialias: true });
let lowGfx = lsGet('ubx_studio_low') === '1';
renderer.setPixelRatio(lowGfx ? 1 : Math.min(window.devicePixelRatio || 1, 1.25));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = !lowGfx; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
vp.insertBefore(renderer.domElement, vp.firstChild);
const canvas = renderer.domElement; canvas.tabIndex = 0;
const scene = new THREE.Scene();
let needs = true; const invalidate = () => { needs = true; };
const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 8000);
camera.rotation.order = 'YXZ';
const cam = { yaw: 0, pitch: -0.42 };
camera.position.set(0, 18, 38);

const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, bot: { value: new THREE.Color() } },
  vertexShader: 'varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: 'uniform vec3 top;uniform vec3 hor;uniform vec3 bot;varying vec3 vP;void main(){float h=vP.y;vec3 c=h>0.?mix(hor,top,pow(smoothstep(0.,.55,h),.7)):mix(hor,bot,smoothstep(0.,-.25,h));gl_FragColor=vec4(c,1.);}'
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), skyMat);
sky.frustumCulled = false; sky.renderOrder = -1; scene.add(sky);
const hemi = new THREE.HemisphereLight('#bfe0ff', '#806040', 0.65); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff4e0', 1);
sun.shadow.mapSize.set(1024, 1024); sun.castShadow = !lowGfx; sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02;
Object.assign(sun.shadow.camera, { left: -120, right: 120, top: 120, bottom: -120, near: 1, far: 800 });
scene.add(sun); scene.add(sun.target);
const SKY = {
  day: { top: '#3d8bff', hor: '#d2e8ff', bot: '#9fb2c6', sun: '#fff4e0', si: 1.0, hs: '#cfe6ff', hg: '#706050', hi: 0.7, dir: [0.45, 1, 0.3] },
  sunset: { top: '#2e3480', hor: '#ffab6b', bot: '#5a3a3a', sun: '#ffb070', si: 0.95, hs: '#ffd2a0', hg: '#402018', hi: 0.55, dir: [1, 0.38, 0.25] },
  night: { top: '#02040e', hor: '#1d2a5a', bot: '#080b18', sun: '#9ab0ff', si: 0.4, hs: '#4a5a90', hg: '#101020', hi: 0.4, dir: [-0.4, 1, 0.35] }
};
const pmrem = new THREE.PMREMGenerator(renderer);
let envTex = null;
function applySky() {
  const k = SKY[map.sky] || SKY.day;
  skyMat.uniforms.top.value.set(k.top); skyMat.uniforms.hor.value.set(k.hor); skyMat.uniforms.bot.value.set(k.bot);
  sun.color.set(k.sun); sun.intensity = k.si; hemi.color.set(k.hs); hemi.groundColor.set(k.hg); hemi.intensity = k.hi;
  sun.userData.dir = new V3().fromArray(k.dir).normalize();
  const es = new THREE.Scene(); es.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), skyMat));
  const old = envTex; envTex = pmrem.fromScene(es, 0.04).texture;
  for (const m of Object.values(matCache)) if (m.envMap) { m.envMap = envTex; m.needsUpdate = true; }
  if (old) old.dispose();
  invalidate();
}
const grid = new THREE.GridHelper(512, 128, 0x000000, 0x000000);
grid.material.transparent = true; grid.material.opacity = 0.16; grid.material.depthWrite = false; grid.position.y = 0.02;
scene.add(grid);

function wedgeGeo() { // Roblox WedgePart: tall face at +Z, slope rises from -Z (front, low edge) to +Z
  const A = [-.5, -.5, -.5], B = [.5, -.5, -.5], C = [-.5, -.5, .5], D = [.5, -.5, .5], E = [-.5, .5, .5], F = [.5, .5, .5];
  const tris = [A, B, D, A, D, C, C, D, F, C, F, E, A, E, F, A, F, B, A, C, E, B, F, D];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([].concat.apply([], tris), 3));
  g.computeVertexNormals();
  return g;
}
const GEO = { block: new THREE.BoxGeometry(1, 1, 1), ball: new THREE.SphereGeometry(0.5, 32, 20), cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 32), wedge: wedgeGeo() };
const BOXEDGE = new THREE.EdgesGeometry(GEO.block);
const EDGE = { block: BOXEDGE, ball: BOXEDGE, cylinder: BOXEDGE, wedge: new THREE.EdgesGeometry(GEO.wedge) };
const SELMAT = new THREE.LineBasicMaterial({ color: 0x35a7ff, depthTest: false, transparent: true, opacity: 0.95 });
const HOVMAT = new THREE.LineBasicMaterial({ color: 0x9fd8ff, depthTest: false, transparent: true, opacity: 0.55 });

const matCache = {};
function getMat(c, mat, t) {
  const key = c + '|' + mat + '|' + t;
  if (matCache[key]) return matCache[key];
  const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(c).convertSRGBToLinear(), roughness: 0.75, metalness: 0 });
  switch (mat) {
    case 'smooth': m.roughness = 0.35; break;
    case 'neon': m.emissive.copy(m.color); m.emissiveIntensity = 1; m.roughness = 1; break;
    case 'metal': m.metalness = 0.8; m.roughness = 0.32; m.envMap = envTex; m.envMapIntensity = 1; break;
    case 'wood': m.roughness = 0.85; break;
    case 'glass': m.roughness = 0.05; m.metalness = 0.15; m.envMap = envTex; break;
    case 'grass': m.roughness = 1; break;
    case 'brick': m.roughness = 0.95; break;
  }
  let op = 1 - t; if (mat === 'glass') op *= 0.55;
  if (op < 1) { m.transparent = true; m.opacity = op; m.depthWrite = op > 0.6; }
  return (matCache[key] = m);
}

const ents = new Map(); // id -> {part, mesh, outline}
const meshes = [];
function applyXf(m, p) {
  m.position.set(p.p[0], p.p[1], p.p[2]);
  m.rotation.set(p.r[0], p.r[1], p.r[2], 'YXZ');
  m.scale.set(Math.max(p.s[0], 0.01), Math.max(p.s[1], 0.01), Math.max(p.s[2], 0.01));
}
function syncPart(p) {
  let e = ents.get(p.id);
  if (!e) {
    const mesh = new THREE.Mesh(GEO[p.shape], getMat(p.c, p.mat, p.t));
    mesh.userData.id = p.id; mesh.receiveShadow = true;
    scene.add(mesh); meshes.push(mesh);
    e = { part: p, mesh, outline: null, shape: p.shape };
    ents.set(p.id, e);
  }
  e.part = p;
  const m = e.mesh;
  if (e.shape !== p.shape) { m.geometry = GEO[p.shape]; if (e.outline) e.outline.geometry = EDGE[p.shape]; e.shape = p.shape; }
  m.material = getMat(p.c, p.mat, p.t);
  m.castShadow = p.t < 0.5 && p.shadow !== false;
  applyXf(m, p);
  invalidate();
  return e;
}
function removeEnt(id) {
  const e = ents.get(id); if (!e) return;
  scene.remove(e.mesh); const i = meshes.indexOf(e.mesh); if (i >= 0) meshes.splice(i, 1);
  if (hover === e.mesh) setHover(null);
  ents.delete(id); invalidate();
}
function rebuildAll() {
  for (const id of Array.from(ents.keys())) removeEnt(id);
  for (const p of map.parts) syncPart(p);
}

// ---------- selection ----------
let sel = []; // part ids, last = primary
function setSel(ids, keepProps) {
  ids = ids.filter((id, i) => ents.has(id) && ids.indexOf(id) === i);
  for (const [id, e] of ents) {
    const on = ids.includes(id);
    if (on && !e.outline) { e.outline = new THREE.LineSegments(EDGE[e.shape], SELMAT); e.outline.renderOrder = 10; e.mesh.add(e.outline); }
    if (!on && e.outline) { e.mesh.remove(e.outline); e.outline = null; }
  }
  sel = ids; invalidate();
  placePivot();
  markTree();
  if (!keepProps) buildProps();
  updateGhost();
  updateStatus();
}
const selParts = () => sel.map(id => ents.get(id).part);

let hover = null;
const hoverBox = new THREE.LineSegments(BOXEDGE, HOVMAT); hoverBox.renderOrder = 9;
function setHover(m) {
  if (hover === m) return;
  if (hoverBox.parent) hoverBox.parent.remove(hoverBox);
  hover = m; invalidate();
  if (m) { hoverBox.geometry = EDGE[ents.get(m.userData.id).shape]; m.add(hoverBox); }
}

// mover preview ghost
const ghost = new THREE.LineSegments(BOXEDGE, new THREE.LineBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.8, depthTest: false }));
const ghostLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new V3(), new V3()]), ghost.material);
ghost.visible = ghostLine.visible = false; ghost.renderOrder = ghostLine.renderOrder = 8;
scene.add(ghost); scene.add(ghostLine);
function updateGhost() {
  const p = sel.length === 1 ? ents.get(sel[0]).part : null;
  const on = !!(p && p.kind === 'mover' && p.move);
  ghost.visible = ghostLine.visible = on;
  if (!on) return;
  ghost.geometry = EDGE[p.shape];
  applyXf(ghost, p); ghost.position.x += p.move.d[0]; ghost.position.y += p.move.d[1]; ghost.position.z += p.move.d[2];
  const a = ghostLine.geometry.attributes.position;
  a.setXYZ(0, p.p[0], p.p[1], p.p[2]); a.setXYZ(1, ghost.position.x, ghost.position.y, ghost.position.z); a.needsUpdate = true;
  ghostLine.geometry.computeBoundingSphere();
  invalidate();
}

// ---------- transform gizmo ----------
const pivot = new THREE.Object3D(); scene.add(pivot);
const tc = new THREE.TransformControls(camera, canvas);
tc.setSize(1.05);
tc.addEventListener('change', invalidate);
scene.add(tc);
let tool = 'select', space = 'world', snapOn = true, moveStep = 1, rotStep = 15;
function selBox() {
  const b = new THREE.Box3();
  for (const id of sel) b.expandByObject(ents.get(id).mesh);
  return b;
}
function placePivot() {
  if (drag) return;
  pivot.scale.set(1, 1, 1);
  if (!sel.length) { tc.detach(); return; }
  if (sel.length === 1) {
    const p = ents.get(sel[0]).part;
    pivot.position.fromArray(p.p); pivot.rotation.set(p.r[0], p.r[1], p.r[2], 'YXZ');
  } else {
    selBox().getCenter(pivot.position); pivot.rotation.set(0, 0, 0);
  }
  pivot.updateMatrixWorld();
  if (tool === 'select') tc.detach(); else { tc.setMode(tool); tc.attach(pivot); }
}
function applySnapSettings() {
  tc.setRotationSnap(snapOn ? rotStep * DEG : null);
  tc.setTranslationSnap(null); tc.setScaleSnap(null);
  tc.setSpace(sel.length > 1 ? 'world' : space);
}
function setTool(t) {
  tool = t; if (t !== 'select') tc.setMode(t);
  document.querySelectorAll('.tool').forEach(b => b.classList.toggle('on', b.dataset.tool === t));
  applySnapSettings(); placePivot(); updateStatus();
}
let drag = null;
const qOf = r => new THREE.Quaternion().setFromEuler(new THREE.Euler(r[0], r[1], r[2], 'YXZ'));
tc.addEventListener('mouseDown', () => {
  if (!sel.length) return;
  applySnapSettings();
  drag = { pos: pivot.position.clone(), quat: pivot.quaternion.clone(), items: selParts().map(p => ({ p, pos: new V3().fromArray(p.p), quat: qOf(p.r), s: p.s.slice() })) };
});
tc.addEventListener('objectChange', () => { if (drag) applyDrag(); });
tc.addEventListener('mouseUp', () => { if (!drag) return; drag = null; commit(); placePivot(); });
function applyDrag() {
  const mode = tc.getMode();
  if (mode === 'translate') {
    const d = pivot.position.clone().sub(drag.pos);
    if (snapOn && moveStep > 0) {
      const rd = v => { v.set(Math.round(v.x / moveStep) * moveStep, Math.round(v.y / moveStep) * moveStep, Math.round(v.z / moveStep) * moveStep); };
      if (tc.space === 'local') { d.applyQuaternion(drag.quat.clone().invert()); rd(d); d.applyQuaternion(drag.quat); } else rd(d);
      pivot.position.copy(drag.pos).add(d);
    }
    for (const it of drag.items) { const np = it.pos.clone().add(d); it.p.p = [r3(np.x), r3(np.y), r3(np.z)]; syncPart(it.p); }
  } else if (mode === 'rotate') {
    const qd = pivot.quaternion.clone().multiply(drag.quat.clone().invert());
    const e = new THREE.Euler();
    for (const it of drag.items) {
      const nq = qd.clone().multiply(it.quat); e.setFromQuaternion(nq, 'YXZ');
      const np = it.pos.clone().sub(drag.pos).applyQuaternion(qd).add(drag.pos);
      it.p.r = [r4(e.x), r4(e.y), r4(e.z)]; it.p.p = [r3(np.x), r3(np.y), r3(np.z)]; syncPart(it.p);
    }
  } else if (mode === 'scale') {
    const f = [Math.abs(pivot.scale.x), Math.abs(pivot.scale.y), Math.abs(pivot.scale.z)];
    const multi = drag.items.length > 1;
    for (const it of drag.items) {
      let s = it.s.map((v, i) => v * f[i]);
      if (snapOn && moveStep > 0) s = s.map((v, i) => f[i] === 1 ? v : Math.max(moveStep, Math.round(v / moveStep) * moveStep));
      s = s.map(v => r3(Math.max(0.05, v)));
      if (it.p.shape === 'cylinder') { if (s[0] !== it.s[0]) s[2] = s[0]; else if (s[2] !== it.s[2]) s[0] = s[2]; }
      it.p.s = s;
      if (multi) { const np = it.pos.clone().sub(drag.pos).multiply(new V3(f[0], f[1], f[2])).add(drag.pos); it.p.p = [r3(np.x), r3(np.y), r3(np.z)]; }
      syncPart(it.p);
    }
  }
  updateGhost(); refreshProps();
}

// ---------- history ----------
const hist = { undo: [], redo: [], cur: '' };
const ser = () => JSON.stringify(map);
function resetHistory() { hist.undo = []; hist.redo = []; hist.cur = ser(); }
function commit() {
  const s = ser();
  if (s === hist.cur) return;
  hist.undo.push(hist.cur); if (hist.undo.length > 80) hist.undo.shift();
  hist.redo = []; hist.cur = s;
  dirty();
}
function restore(str) {
  const m = JSON.parse(str);
  const keep = new Set(m.parts.map(p => p.id));
  for (const id of Array.from(ents.keys())) if (!keep.has(id)) removeEnt(id);
  const old = new Map(map.parts.map(p => [p.id, JSON.stringify(p)]));
  map = m;
  taken.clear(); for (const p of m.parts) taken.add(p.id);
  for (const p of m.parts) if (!ents.has(p.id) || old.get(p.id) !== JSON.stringify(p)) syncPart(p); else ents.get(p.id).part = p;
  applySky(); renderTree(); setSel(sel.filter(id => keep.has(id))); titleUI(); dirty();
}
function undo() { if (!hist.undo.length) return toast('Nothing to undo'); hist.redo.push(hist.cur); hist.cur = hist.undo.pop(); restore(hist.cur); }
function redo() { if (!hist.redo.length) return toast('Nothing to redo'); hist.undo.push(hist.cur); hist.cur = hist.redo.pop(); restore(hist.cur); }

// ---------- projects / storage ----------
function index() { try { const a = JSON.parse(lsGet(LS_INDEX) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
let saveT = 0, saveFail = false;
function dirty() { $('savestate').textContent = 'Unsaved changes'; clearTimeout(saveT); saveT = setTimeout(saveProject, 800); }
function saveProject() {
  clearTimeout(saveT);
  if (!projId) projId = 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const ok = lsSet(LS_P + projId, ser());
  const idx = index().filter(x => x && x.id !== projId);
  idx.unshift({ id: projId, name: map.name, updated: Date.now() });
  lsSet(LS_INDEX, JSON.stringify(idx)); lsSet(LS_LAST, projId);
  saveFail = !ok;
  $('savestate').textContent = ok ? 'Saved ✓' : '⚠ Not saved: browser storage is full';
  return ok;
}
function loadMap(m, id) {
  map = normMap(m); projId = id || null;
  rebuildAll(); applySky(); resetHistory(); renderTree(); setSel([]); titleUI();
  frameAll();
  $('savestate').textContent = id ? 'Saved ✓' : '';
}
function openProject(id) {
  const s = lsGet(LS_P + id); if (!s) return toast('That project is missing', true);
  try { loadMap(JSON.parse(s), id); lsSet(LS_LAST, id); } catch (e) { toast('Could not open that project', true); }
}
function newProject() { saveProject(); loadMap(defaultMap(), null); saveProject(); toast('New game created'); }
function deleteProject(id) {
  lsDel(LS_P + id); lsSet(LS_INDEX, JSON.stringify(index().filter(x => x.id !== id)));
  if (id === projId) { const left = index(); if (left.length) openProject(left[0].id); else { loadMap(defaultMap(), null); saveProject(); } }
}
function titleUI() { $('projname').textContent = (map.icon || '🧱') + ' ' + map.name; document.title = map.name + ' - Unbloxed Studio'; $('publishbtn').textContent = map.cloudId ? 'Update game' : 'Publish'; }

// ---------- explorer ----------
const SHAPE_ICON = { block: ICONS.block, ball: ICONS.ball, cylinder: ICONS.cylinder, wedge: ICONS.wedge };
let rowEls = new Map();
function renderTree() {
  const f = $('exfilter').value.trim().toLowerCase();
  const parts = f ? map.parts.filter(p => p.name.toLowerCase().includes(f) || p.kind.includes(f)) : map.parts;
  let h = '<div class="row root">🌐 Workspace <small style="color:var(--dim);font-weight:500">' + map.parts.length + ' parts</small></div>';
  const MAX = 3000;
  for (const p of parts.slice(0, MAX)) h += '<div class="row" data-id="' + esc(p.id) + '"><span class="sw" style="background:' + p.c + '"></span><span class="ic">' + SHAPE_ICON[p.shape] + '</span><span class="nm">' + esc(p.name) + '</span><span class="k" title="' + KIND_LABEL[p.kind] + '">' + KIND_ICON[p.kind] + '</span></div>';
  if (parts.length > MAX) h += '<div class="empty">' + (parts.length - MAX) + ' more parts. Use the filter to find them.</div>';
  $('tree').innerHTML = h;
  rowEls = new Map(); $('tree').querySelectorAll('.row[data-id]').forEach(r => rowEls.set(r.dataset.id, r));
  if (window.UBXBlocks) UBXBlocks.decorateTree($('tree')); // block scripts: 📜 rows under parts (blocks-editor.js)
  if (window.UBXToolbox) UBXToolbox.decorateTree($('tree')); // toolbox: 📦 model rows for parts with a `group` (toolbox.js)
  markTree();
}
function markTree() {
  $('tree').querySelectorAll('.row.sel').forEach(r => r.classList.remove('sel'));
  for (const id of sel) { const r = rowEls.get(id); if (r) r.classList.add('sel'); }
  const last = rowEls.get(sel[sel.length - 1]);
  if (last) { const t = $('tree'), y = last.offsetTop; if (y < t.scrollTop || y > t.scrollTop + t.clientHeight - 24) t.scrollTop = y - t.clientHeight / 2; }
  if (window.UBXToolbox) UBXToolbox.markTree($('tree'), sel); // toolbox: highlight 📦 model rows (toolbox.js)
}
function treeRow(id) { const r = rowEls.get(id); if (!r) return; const p = ents.get(id).part; r.querySelector('.nm').textContent = p.name; r.querySelector('.sw').style.background = p.c; r.querySelector('.ic').innerHTML = SHAPE_ICON[p.shape]; r.querySelector('.k').textContent = KIND_ICON[p.kind]; }
$('exfilter').addEventListener('input', renderTree);
$('tree').addEventListener('click', e => {
  const r = e.target.closest('.row[data-id]'); if (!r || e.target.tagName === 'INPUT') return;
  const id = r.dataset.id;
  if (e.shiftKey || e.ctrlKey || e.metaKey) setSel(sel.includes(id) ? sel.filter(x => x !== id) : sel.concat(id)); else setSel([id]);
});
$('tree').addEventListener('dblclick', e => {
  const r = e.target.closest('.row[data-id]'); if (!r) return;
  const id = r.dataset.id, p = ents.get(id).part, nm = r.querySelector('.nm');
  const inp = document.createElement('input'); inp.value = p.name; nm.replaceWith(inp); inp.focus(); inp.select();
  let done = false;
  const fin = ok => { if (done) return; done = true; if (ok && inp.value.trim()) { p.name = inp.value.trim().slice(0, 60); commit(); } inp.replaceWith(nm); treeRow(id); buildProps(); };
  inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') fin(true); if (ev.key === 'Escape') fin(false); ev.stopPropagation(); });
  inp.addEventListener('blur', () => fin(true));
});

// ---------- properties ----------
const numIn = (key, step) => '<input type="number" step="' + (step || 'any') + '" data-k="' + key + '">';
function v3(key) { return '<div class="v3">' + [0, 1, 2].map(i => numIn(key + '.' + i)).join('') + '</div>'; }
const PROPS = {
  name: { get: p => p.name, set: (p, v) => { p.name = String(v).trim().slice(0, 60) || 'Part'; } },
  shape: { get: p => p.shape, set: (p, v) => { p.shape = v; if (v === 'cylinder') p.s[2] = p.s[0]; if (v === 'ball') { const d = Math.max(p.s[0], p.s[1], p.s[2]); p.s = [d, d, d]; } } },
  kind: { get: p => p.kind, set: (p, v) => { p.kind = v; kindDefaults(p); } },
  c: { get: p => p.c, set: (p, v) => { p.c = hexColor(v, p.c); } },
  mat: { get: p => p.mat, set: (p, v) => { p.mat = v; } },
  t: { get: p => p.t, set: (p, v) => { p.t = Math.min(1, Math.max(0, v)); } },
  collide: { get: p => p.collide, set: (p, v) => { p.collide = !!v; } },
  shadow: { get: p => p.shadow !== false, set: (p, v) => { if (v) delete p.shadow; else p.shadow = false; } }, // CastShadow (saved only when off)
  'move.t': { get: p => p.move && p.move.t, set: (p, v) => { p.move.t = Math.max(0.1, v); } },
  bounce: { get: p => p.bounce, set: (p, v) => { p.bounce = v; } },
  cp: { get: p => p.cp, set: (p, v) => { p.cp = Math.max(1, Math.round(v)); } }
};
for (let i = 0; i < 3; i++) {
  PROPS['p.' + i] = { get: p => p.p[i], set: (p, v) => { p.p[i] = v; } };
  PROPS['s.' + i] = { get: p => p.s[i], set: (p, v) => { p.s[i] = Math.max(0.05, Math.abs(v)); if (p.shape === 'cylinder' && i !== 1) p.s[2 - i] = p.s[i]; if (p.shape === 'ball') p.s = [p.s[i], p.s[i], p.s[i]]; } };
  PROPS['r.' + i] = { get: p => r3(p.r[i] / DEG), set: (p, v) => { p.r[i] = r4(v * DEG); } };
  PROPS['spin.' + i] = { get: p => p.spin && p.spin[i], set: (p, v) => { p.spin[i] = v; } };
  PROPS['move.d.' + i] = { get: p => p.move && p.move.d[i], set: (p, v) => { p.move.d[i] = v; } };
}
const NUMERIC = k => !['name', 'shape', 'kind', 'c', 'mat', 'collide', 'shadow'].includes(k);
function opts(list, labels) { return list.map(v => '<option value="' + v + '">' + (labels ? labels[v] : v[0].toUpperCase() + v.slice(1)) + '</option>').join(''); }
function buildProps() {
  const body = $('propbody');
  if (!sel.length) {
    $('propsub').textContent = '';
    body.innerHTML = '<div class="empty">Select a part to edit it.<br>Click a part in the viewport or the Explorer. Shift-click to select more.<br><br><b>Camera:</b> right-drag to look, WASD/QE to fly, wheel to zoom, F to focus.</div>';
    if (window.UBXBlocks) UBXBlocks.decorateProps(body, []); // block scripts: game scripts section
    return;
  }
  const parts = selParts(), kinds = new Set(parts.map(p => p.kind)), kind = kinds.size === 1 ? parts[0].kind : null;
  $('propsub').textContent = parts.length > 1 ? parts.length + ' parts' : parts[0].name;
  let h = '<div class="sec">Part</div>' +
    '<div class="pr"><span>Name</span><input type="text" data-k="name" maxlength="60"></div>' +
    '<div class="pr"><span>Shape</span><select data-k="shape">' + opts(SHAPES) + '</select></div>' +
    '<div class="pr"><span>Kind</span><select data-k="kind">' + opts(KINDS, KIND_LABEL) + '</select></div>' +
    '<div class="sec">Transform</div>' +
    '<div class="pr"><span>Position</span>' + v3('p') + '</div>' +
    '<div class="pr"><span>Size</span>' + v3('s') + '</div>' +
    '<div class="pr"><span>Rotation °</span>' + v3('r') + '</div>' +
    (parts.some(p => p.shape === 'cylinder') ? '<div class="note">Cylinder: X/Z = diameter, Y = height (upright).</div>' : '') +
    '<div class="sec">Appearance</div>' +
    '<div class="pr"><span>Color</span><div class="col"><input type="color" data-k="c"><input type="text" data-k="c" maxlength="7"></div></div>' +
    '<div class="pr"><span>Material</span><select data-k="mat">' + opts(MATS) + '</select></div>' +
    '<div class="pr"><span>Transparency</span><div class="rng"><input type="range" min="0" max="1" step="0.05" data-k="t">' + numIn('t', '0.05') + '</div></div>' +
    '<div class="pr"><span>CastShadow</span><input type="checkbox" data-k="shadow"></div>' +
    '<div class="sec">Behavior</div>' +
    '<div class="pr"><span>CanCollide</span><input type="checkbox" data-k="collide"></div>' +
    '<div class="note">Parts are always anchored.</div>';
  if (kind === 'spinner') h += '<div class="sec">🌀 Spinner</div><div class="pr"><span>Spin (rad/s)</span>' + v3('spin') + '</div><div class="note">Turn speed around the part\'s own X, Y, Z axes. 3.14 = half a turn per second.</div>';
  if (kind === 'mover') h += '<div class="sec">↔️ Moving platform</div><div class="pr"><span>Offset</span>' + v3('move.d') + '</div><div class="pr"><span>Time (s)</span>' + numIn('move.t', '0.1') + '</div><div class="note">Goes to position + offset and back. The yellow outline shows the far end.</div>';
  if (kind === 'bounce') h += '<div class="sec">⏫ Bounce pad</div><div class="pr"><span>Bounce speed</span>' + numIn('bounce', '5') + '</div>';
  if (kind === 'checkpoint') h += '<div class="sec">🚩 Checkpoint</div><div class="pr"><span>Order</span>' + numIn('cp', '1') + '</div><div class="note">Players respawn at the last checkpoint they touched.</div>';
  if (kind === 'spawn') h += '<div class="note" style="padding-top:8px">🧍 Players start on top of a random spawn.</div>';
  if (kind === 'kill') h += '<div class="note" style="padding-top:8px">☠️ Touching this sends players back to their checkpoint.</div>';
  if (kind === 'finish') h += '<div class="note" style="padding-top:8px">🏁 Touching this finishes the run and shows the time.</div>';
  body.innerHTML = h;
  refreshProps(true);
  if (window.UBXBlocks) UBXBlocks.decorateProps(body, parts); // block scripts: Scripts section
}
function refreshProps(force) {
  if (!sel.length) return;
  const parts = selParts();
  $('propbody').querySelectorAll('[data-k]').forEach(el => {
    if (!force && el === document.activeElement) return;
    const pr = PROPS[el.dataset.k]; if (!pr) return;
    const vals = parts.map(pr.get), v = vals[0], same = vals.every(x => x === v);
    if (el.type === 'checkbox') { el.checked = !!v; el.indeterminate = !same; return; }
    if (!same) { el.value = el.tagName === 'SELECT' || el.type === 'color' || el.type === 'range' ? v : ''; el.placeholder = '—'; return; }
    el.placeholder = '';
    el.value = v === undefined || v === null ? '' : (typeof v === 'number' ? fmt(v) : v);
  });
  if (parts.length === 1) $('propsub').textContent = parts[0].name;
}
function propInput(e, final) {
  const el = e.target, k = el.dataset && el.dataset.k; if (!k || !PROPS[k]) return;
  let v = el.type === 'checkbox' ? el.checked : el.value;
  if (NUMERIC(k)) { v = parseFloat(v); if (!isFinite(v)) { if (final) refreshProps(true); return; } }
  if (k === 'c' && !/^#?[0-9a-f]{6}$/i.test(String(v).trim())) { if (final) refreshProps(true); return; }
  if (k === 'c' && v[0] !== '#') v = '#' + v;
  for (const p of selParts()) { PROPS[k].set(p, v); syncPart(p); treeRow(p.id); }
  updateGhost();
  if (final) {
    commit(); placePivot();
    if (k === 'kind' || k === 'shape') buildProps(); else refreshProps(true);
  } else {
    $('propbody').querySelectorAll('[data-k="' + k + '"]').forEach(o => { if (o !== el) o.value = el.value; });
  }
}
$('propbody').addEventListener('input', e => { if (['color', 'range', 'checkbox'].includes(e.target.type) || e.target.tagName === 'SELECT') propInput(e, false); });
$('propbody').addEventListener('change', e => propInput(e, true));
$('propbody').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.target.blur(); });

// ---------- editing ops ----------
const PRESETS = {
  block: { name: 'Part', shape: 'block', s: [4, 1, 2] },
  ball: { name: 'Ball', shape: 'ball', s: [4, 4, 4] },
  cylinder: { name: 'Cylinder', shape: 'cylinder', s: [4, 4, 4] },
  wedge: { name: 'Wedge', shape: 'wedge', s: [4, 2, 4] },
  spawn: { name: 'SpawnLocation', shape: 'block', s: [6, 1, 6], c: '#d8dde6', mat: 'smooth', kind: 'spawn' },
  kill: { name: 'KillBrick', shape: 'block', s: [8, 1, 4], c: '#ff2b2b', mat: 'neon', kind: 'kill' },
  checkpoint: { name: 'Checkpoint', shape: 'cylinder', s: [6, 1, 6], c: '#2ecc71', mat: 'neon', kind: 'checkpoint' },
  finish: { name: 'Finish', shape: 'block', s: [8, 1, 8], c: '#ffd24a', mat: 'neon', kind: 'finish' },
  spinner: { name: 'Spinner', shape: 'block', s: [16, 1, 1], c: '#ff8a2a', mat: 'smooth', kind: 'spinner', spin: [0, 1.5, 0] },
  mover: { name: 'MovingPlatform', shape: 'block', s: [6, 1, 6], c: '#3498db', mat: 'smooth', kind: 'mover', move: { d: [0, 0, 10], t: 3 } },
  bounce: { name: 'BouncePad', shape: 'cylinder', s: [6, 1, 6], c: '#ff6fb5', mat: 'neon', kind: 'bounce', bounce: 80 },
  botspawner: { name: 'BotSpawner', shape: 'cylinder', s: [5, 0.6, 5], c: '#b06cff', mat: 'neon', kind: 'botspawner', bot: { count: 2, behavior: 'fighter' } },
  waypoint: { name: 'Waypoint', shape: 'ball', s: [2, 2, 2], c: '#ffd84a', mat: 'neon', t: 0.3, collide: false, kind: 'waypoint', wp: 1 }
};
const GAMEPLAY = [['spawn', 'Spawn'], ['kill', 'Kill brick'], ['checkpoint', 'Checkpoint pad'], ['finish', 'Finish pad'], ['spinner', 'Spinner bar'], ['mover', 'Moving platform'], ['bounce', 'Bounce pad'], ['botspawner', 'Bot spawner'], ['waypoint', 'Bot waypoint']];
const ray = new THREE.Raycaster();
function castFrom(ndcX, ndcY, maxD) {
  ray.setFromCamera({ x: ndcX, y: ndcY }, camera);
  ray.far = maxD || Infinity;
  const hits = ray.intersectObjects(meshes, false);
  return hits[0] || null;
}
function insert(type) {
  const pre = PRESETS[type]; if (!pre) return;
  const p = Object.assign({ id: newId(), name: 'Part', shape: 'block', p: [0, 0, 0], s: [4, 1, 2], r: [0, 0, 0], c: '#a3a2a5', mat: 'plastic', t: 0, collide: true, kind: 'none' }, clone(pre));
  // in front of the camera, resting on whatever is there (or the ground plane)
  const h = castFrom(0, 0, 120);
  const dir = new V3(); camera.getWorldDirection(dir);
  let pt;
  if (h && h.face) {
    const n = h.face.normal.clone().transformDirection(h.object.matrixWorld);
    pt = h.point.clone();
    if (n.y > 0.5) pt.y += p.s[1] / 2; else pt.add(n.multiplyScalar(Math.max(p.s[0], p.s[2]) / 2));
  } else {
    const t = dir.y < -0.05 ? -camera.position.y / dir.y : -1;
    pt = t > 0 && t < 200 ? camera.position.clone().addScaledVector(dir, t) : camera.position.clone().addScaledVector(dir, 20);
    if (t > 0 && t < 200) pt.y = p.s[1] / 2;
  }
  if (snapOn && moveStep > 0) { pt.x = Math.round(pt.x / moveStep) * moveStep; pt.z = Math.round(pt.z / moveStep) * moveStep; }
  p.p = [r3(pt.x), r3(pt.y), r3(pt.z)];
  if (p.kind === 'checkpoint') delete p.cp;
  kindDefaults(p);
  map.parts.push(p); syncPart(p); renderTree(); setSel([p.id]); commit();
  if (tool === 'select') setTool('translate');
}
let clip = [];
function copySel() { if (!sel.length) return; clip = selParts().map(clone); toast('Copied ' + clip.length + (clip.length > 1 ? ' parts' : ' part')); }
function pasteParts(list, lift) {
  if (!list.length) return;
  let dy = 0;
  if (lift) { let lo = Infinity, hi = -Infinity; for (const p of list) { lo = Math.min(lo, p.p[1] - p.s[1] / 2); hi = Math.max(hi, p.p[1] + p.s[1] / 2); } dy = hi - lo; }
  const ids = [];
  for (const src of list) {
    const p = clone(src); p.id = newId(); p.p[1] = r3(p.p[1] + dy);
    if (p.kind === 'checkpoint') { delete p.cp; kindDefaults(p); }
    map.parts.push(p); syncPart(p); ids.push(p.id);
  }
  renderTree(); setSel(ids); commit();
}
function duplicate() { if (!sel.length) return; pasteParts(selParts(), true); }
function paste() { if (!clip.length) return toast('Clipboard is empty'); pasteParts(clip, true); }
function del() {
  if (!sel.length) return;
  const gone = new Set(sel);
  map.parts = map.parts.filter(p => !gone.has(p.id));
  for (const id of gone) { removeEnt(id); taken.delete(id); }
  setSel([]); renderTree(); commit();
}
function focusSel() {
  const b = sel.length ? selBox() : null;
  if (!b || b.isEmpty()) return;
  const sph = b.getBoundingSphere(new THREE.Sphere());
  const dir = new V3(); camera.getWorldDirection(dir);
  camera.position.copy(sph.center).addScaledVector(dir, -(Math.min(sph.radius, 400) * 2.2 + 6));
}
function frameAll() {
  // start looking at a spawn if there is one, else at the middle of the map
  const sp = map.parts.find(p => p.kind === 'spawn');
  let c, rad;
  if (sp && map.parts.length < 40) { c = new V3().fromArray(sp.p); rad = 24; } else if (map.parts.length) {
    const b = new THREE.Box3(); for (const m of meshes) if (ents.get(m.userData.id).part.t < 1) b.expandByObject(m);
    if (b.isEmpty()) for (const m of meshes) b.expandByObject(m);
    const s = b.getBoundingSphere(new THREE.Sphere()); c = s.center; rad = Math.min(s.radius * 0.7, 250);
  } else { c = new V3(); rad = 24; }
  cam.yaw = 0; cam.pitch = -0.42;
  camera.rotation.set(cam.pitch, cam.yaw, 0, 'YXZ');
  const dir = new V3(); camera.getWorldDirection(dir);
  camera.position.copy(c).addScaledVector(dir, -rad * 1.6 - 10);
}

// ---------- viewport input ----------
const ndc = (e) => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * 2 - 1, y: -(e.clientY - r.top) / r.height * 2 + 1, px: e.clientX - r.left, py: e.clientY - r.top }; };
let look = null, pan = null, box = null, lastMove = null;
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('pointerdown', e => {
  canvas.focus();
  closeMenu();
  if (e.button === 2) { look = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); return; }
  if (e.button === 1) { pan = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); e.preventDefault(); return; }
  if (e.button !== 0 || tc.dragging || tc.axis) return;
  const n = ndc(e);
  box = { x: n.px, y: n.py, shift: e.shiftKey || e.ctrlKey || e.metaKey, moved: false, n };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', e => {
  if (look) {
    cam.yaw -= (e.clientX - look.x) * 0.005; cam.pitch = Math.max(-1.55, Math.min(1.55, cam.pitch - (e.clientY - look.y) * 0.005));
    look = { x: e.clientX, y: e.clientY }; return;
  }
  if (pan) {
    const k = 0.05 * (flySpeed() / 40);
    const right = new V3(1, 0, 0).applyQuaternion(camera.quaternion), up = new V3(0, 1, 0).applyQuaternion(camera.quaternion);
    camera.position.addScaledVector(right, -(e.clientX - pan.x) * k).addScaledVector(up, (e.clientY - pan.y) * k);
    pan = { x: e.clientX, y: e.clientY }; return;
  }
  if (box) {
    const n = ndc(e), r = $('boxsel');
    if (!box.moved && Math.hypot(n.px - box.x, n.py - box.y) > 5) box.moved = true;
    if (box.moved) Object.assign(r.style, { display: 'block', left: Math.min(n.px, box.x) + 'px', top: Math.min(n.py, box.y) + 'px', width: Math.abs(n.px - box.x) + 'px', height: Math.abs(n.py - box.y) + 'px' });
    box.cur = n; return;
  }
  lastMove = e;
});
canvas.addEventListener('pointerleave', () => { lastMove = null; setHover(null); });
function endPointer(e) {
  if (look) { look = null; return; }
  if (pan) { pan = null; return; }
  if (!box) return;
  const b = box; box = null; $('boxsel').style.display = 'none';
  if (!b.moved) { // click select
    const h = castFrom(b.n.x, b.n.y);
    const id = h && h.object.userData.id;
    if (!id) { if (!b.shift) setSel([]); return; }
    if (b.shift) setSel(sel.includes(id) ? sel.filter(x => x !== id) : sel.concat(id)); else setSel([id]);
    return;
  }
  const c = b.cur, x0 = Math.min(b.n.x, c.x), x1 = Math.max(b.n.x, c.x), y0 = Math.min(b.n.y, c.y), y1 = Math.max(b.n.y, c.y);
  const v = new V3(), ids = [];
  for (const m of meshes) {
    v.copy(m.position).project(camera);
    if (v.z < 1 && v.x >= x0 && v.x <= x1 && v.y >= y0 && v.y <= y1) { const p = ents.get(m.userData.id).part; if (p.s[0] < 200 || p.s[2] < 200) ids.push(m.userData.id); }
  }
  setSel(b.shift ? sel.concat(ids) : ids);
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const n = ndc(e);
  const h = castFrom(n.x, n.y, 2000);
  const dist = h ? h.distance : 40;
  ray.setFromCamera({ x: n.x, y: n.y }, camera);
  const step = Math.max(1, dist * 0.15) * Math.sign(-e.deltaY) * Math.min(3, Math.abs(e.deltaY) / 100 || 1);
  if (h && step > 0 && step > dist - 1) return;
  camera.position.addScaledVector(ray.ray.direction, step);
}, { passive: false });

// ---------- keyboard ----------
const held = new Set();
const typing = e => { const t = e.target; return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable); };
const modalOpen = () => $('modalbg').style.display === 'flex';
let playing = false;
window.addEventListener('keydown', e => {
  if (playing || (window.UBXBlocks && UBXBlocks.isOpen())) return; // the block script panel handles its own keys
  if (e.key === 'Escape') { if (modalOpen()) closeModal(); else if (menuOpen()) closeMenu(); else if (!typing(e)) setSel([]); return; }
  if (typing(e) || modalOpen()) return;
  const k = e.key.toLowerCase(), ctrl = e.ctrlKey || e.metaKey;
  if (ctrl) {
    const acts = { z: e.shiftKey ? redo : undo, y: redo, d: duplicate, c: copySel, v: paste, s: () => { saveProject(); toast('Saved'); }, a: () => setSel(map.parts.map(p => p.id)), l: toggleSpace, '1': () => setTool('select'), '2': () => setTool('translate'), '3': () => setTool('scale'), '4': () => setTool('rotate') };
    if (acts[k]) { e.preventDefault(); acts[k](); }
    return;
  }
  if (e.altKey) return;
  if ('wasdqe'.includes(k) && k.length === 1) { held.add(k); e.preventDefault(); return; }
  if (e.key === 'Shift') { held.add('shift'); return; }
  const acts = { '1': () => setTool('select'), '2': () => setTool('translate'), '3': () => setTool('scale'), '4': () => setTool('rotate'), f: focusSel, delete: del, backspace: del, f5: play };
  if (acts[k]) { e.preventDefault(); acts[k](); }
});
window.addEventListener('keyup', e => { held.delete(e.key.toLowerCase()); if (e.key === 'Shift') held.delete('shift'); });
window.addEventListener('blur', () => held.clear());
function flySpeed() { return held.has('shift') ? 10 : 40; }

// ---------- render loop ----------
let lastT = performance.now(), lastKey = '';
function resize() {
  const w = vp.clientWidth, h = vp.clientHeight; if (!w || !h) return;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); invalidate();
}
new ResizeObserver(resize).observe(vp);
function frame(t) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (t - lastT) / 1000); lastT = t;
  if (playing) return;
  camera.rotation.set(cam.pitch, cam.yaw, 0, 'YXZ');
  if (held.size) {
    const f = new V3(0, 0, -1).applyQuaternion(camera.quaternion), r = new V3(1, 0, 0).applyQuaternion(camera.quaternion), m = new V3();
    if (held.has('w')) m.add(f); if (held.has('s')) m.sub(f); if (held.has('d')) m.add(r); if (held.has('a')) m.sub(r);
    if (held.has('e')) m.y += 1; if (held.has('q')) m.y -= 1;
    if (m.lengthSq()) camera.position.addScaledVector(m.normalize(), flySpeed() * dt);
  }
  camera.updateMatrixWorld();
  const key = camera.position.x + ',' + camera.position.y + ',' + camera.position.z + ',' + cam.yaw + ',' + cam.pitch;
  if (key !== lastKey) { lastKey = key; needs = true; }
  if (lastMove && !tc.dragging) { const n = ndc(lastMove); const h = castFrom(n.x, n.y, 3000); setHover(h ? h.object : null); lastMove = null; }
  if (!needs) return; // render only when something changed (low-end Chromebooks)
  needs = false;
  sky.position.copy(camera.position);
  // shadow box follows what the camera looks at
  const f = new V3(); camera.getWorldDirection(f);
  const tgt = camera.position.clone().addScaledVector(f, 50); tgt.set(Math.round(tgt.x / 8) * 8, Math.round(tgt.y / 8) * 8, Math.round(tgt.z / 8) * 8);
  sun.target.position.copy(tgt); sun.position.copy(tgt).addScaledVector(sun.userData.dir || new V3(0, 1, 0), 300);
  renderer.render(scene, camera);
  updateCamStat();
}
function updateCamStat() { const p = camera.position; $('stats').textContent = map.parts.length + ' parts · ' + sel.length + ' selected · ' + (snapOn ? 'snap ' + moveStep + ' / ' + rotStep + '°' : 'snap off') + ' · cam ' + Math.round(p.x) + ', ' + Math.round(p.y) + ', ' + Math.round(p.z); }
const HINTS = {
  select: '<b>Select</b>: click a part, Shift-click to add, drag on empty space to box select.',
  translate: '<b>Move</b>: drag the arrows (snaps to the move step when Snap is on). Ctrl+L switches world / local axes.',
  scale: '<b>Scale</b>: drag the handles to resize. Sizes snap to the move step.',
  rotate: '<b>Rotate</b>: drag the rings. Snaps to the rotate step.'
};
function updateStatus() { $('hint').innerHTML = HINTS[tool] + ' &nbsp;·&nbsp; Right-drag look · WASD/QE fly · F focus · Ctrl+D duplicate · Del delete'; updateCamStat(); }

// ---------- ribbon / menus ----------
document.querySelectorAll('.tool').forEach(b => b.onclick = () => setTool(b.dataset.tool));
document.querySelectorAll('[data-ins]').forEach(b => b.onclick = () => insert(b.dataset.ins));
const ACTS = { undo, redo, copy: copySel, paste, duplicate, delete: del, focus: focusSel, settings: openSettings };
document.querySelectorAll('[data-act]').forEach(b => b.onclick = () => ACTS[b.dataset.act]());
function toggleSpace() { space = space === 'world' ? 'local' : 'world'; $('spacebtn').textContent = space === 'world' ? '🌐 World' : '📦 Local'; applySnapSettings(); }
$('spacebtn').onclick = toggleSpace;
$('gridbtn').classList.add('on');
$('gridbtn').onclick = () => { grid.visible = !grid.visible; $('gridbtn').classList.toggle('on', grid.visible); invalidate(); };
function setLow(on) {
  lowGfx = on; lsSet('ubx_studio_low', on ? '1' : '0');
  renderer.shadowMap.enabled = !on; sun.castShadow = !on;
  renderer.setPixelRatio(on ? 1 : Math.min(window.devicePixelRatio || 1, 1.25)); resize();
  for (const m of Object.values(matCache)) m.needsUpdate = true;
  $('lowbtn').classList.toggle('on', on); invalidate();
}
$('lowbtn').classList.toggle('on', lowGfx);
$('lowbtn').onclick = () => setLow(!lowGfx);
$('snapon').onchange = e => { snapOn = e.target.checked; applySnapSettings(); updateCamStat(); };
$('snapmove').onchange = e => { const v = parseFloat(e.target.value); if (v > 0) moveStep = v; else e.target.value = moveStep; updateCamStat(); };
$('snaprot').onchange = e => { const v = parseFloat(e.target.value); if (v > 0) rotStep = v; else e.target.value = rotStep; applySnapSettings(); updateCamStat(); };
$('projname').onclick = openSettings;

const menu = $('menu');
const menuOpen = () => menu.style.display === 'block';
function closeMenu() { menu.style.display = 'none'; document.querySelectorAll('.menubtn.on,#gamebtn.on').forEach(b => b.classList.remove('on')); }
function openMenu(anchor, items) {
  menu.innerHTML = items.map((it, i) => it === '-' ? '<hr>' : '<div class="mi" data-i="' + i + '"><span class="e">' + (it[0] || '') + '</span>' + it[1] + (it[3] ? '<small>' + it[3] + '</small>' : '') + '</div>').join('');
  const r = anchor.getBoundingClientRect();
  menu.style.display = 'block'; menu.style.left = Math.min(r.left, innerWidth - menu.offsetWidth - 8) + 'px'; menu.style.top = r.bottom + 4 + 'px';
  anchor.classList.add('on');
  menu.onclick = e => { const m = e.target.closest('.mi'); if (!m) return; closeMenu(); items[+m.dataset.i][2](); };
}
document.addEventListener('pointerdown', e => { if (menuOpen() && !menu.contains(e.target) && !e.target.closest('.menubtn,#gamebtn')) closeMenu(); });
$('filebtn').onclick = e => { if (menuOpen()) return closeMenu(); openMenu(e.currentTarget, [
  ['📄', 'New game', newProject], ['📂', 'Open…', openDialog], ['💾', 'Save', () => { saveProject(); toast(saveFail ? 'Storage full: export instead' : 'Saved', saveFail); }, 'Ctrl+S'], '-',
  ['⬇️', 'Export .json', exportJson], ['⬆️', 'Import .json…', importJson], ['🧩', 'Open Unbloxed map…', legacyDialog], '-',
  ['⚙️', 'Game settings…', openSettings], ['🚀', 'Publish…', () => publishGame(map)]
]); };
$('gamebtn').onclick = e => { if (menuOpen()) return closeMenu(); openMenu(e.currentTarget, GAMEPLAY.map(([k, n]) => [KIND_ICON[k], n, () => insert(k)])); };

// ---------- modals ----------
function openModal(html) { $('modal').innerHTML = html; $('modalbg').style.display = 'flex'; const f = $('modal').querySelector('input,textarea'); if (f) setTimeout(() => f.focus(), 30); return $('modal'); }
function closeModal() { $('modalbg').style.display = 'none'; $('modal').innerHTML = ''; }
$('modalbg').addEventListener('pointerdown', e => { if (e.target === $('modalbg')) closeModal(); });
const EMOJI = ['🧱', '🧗', '🏁', '⚔️', '🌋', '🏰', '🚀', '🌈', '🏃', '🎯', '🍕', '🐉', '👻', '⭐', '💎', '🌊', '🏝️', '🎮'];
function openSettings() {
  const s = map.settings;
  const m = openModal('<h2>Game settings</h2><div class="sub">How your game shows up and how players move.</div>' +
    '<div class="f"><span>Name</span><input id="g-name" maxlength="40"></div>' +
    '<div class="f"><span>Description</span><textarea id="g-desc" maxlength="300"></textarea></div>' +
    '<div class="f"><span>Icon</span><div><input id="g-icon" maxlength="8" style="width:70px;font-size:18px;text-align:center"><div class="emojis">' + EMOJI.map(x => '<span>' + x + '</span>').join('') + '</div></div></div>' +
    '<div class="f"><span>Sky</span><select id="g-sky">' + opts(SKIES) + '</select></div>' +
    '<div class="f"><span>Walk speed</span><input id="g-walk" type="number" min="1" step="1"></div>' +
    '<div class="f"><span>Jump power</span><input id="g-jump" type="number" min="0" step="1"></div>' +
    '<div class="f"><span>Gravity</span><input id="g-grav" type="number" min="1" step="1"></div>' +
    '<div class="f"><span>Lives</span><input id="g-lives" type="number" min="0" step="1" title="0 = unlimited"></div>' +
    '<div class="f"><span>Show timer</span><input id="g-timer" type="checkbox" style="width:18px;height:18px;justify-self:start"></div>' +
    '<div class="f"><span>Ability to use gears in your game</span><input id="g-gears" type="checkbox" style="width:18px;height:18px;justify-self:start" title="Players can use the gear they have equipped (Marketplace) in this game"></div>' +
    '<div class="note" style="padding:0">Roblox defaults: walk 16, jump 50, gravity 196. Lives 0 = unlimited.</div>' +
    '<div class="acts"><button class="btn" id="g-cancel">Cancel</button><button class="btn pri" id="g-ok">Save</button></div>');
  $('g-name').value = map.name; $('g-desc').value = map.desc; $('g-icon').value = map.icon; $('g-sky').value = map.sky;
  $('g-walk').value = s.walk; $('g-jump').value = s.jump; $('g-grav').value = s.gravity; $('g-lives').value = s.lives; $('g-timer').checked = !!s.timer; $('g-gears').checked = s.gears === true;
  m.querySelector('.emojis').onclick = e => { if (e.target.tagName === 'SPAN') $('g-icon').value = e.target.textContent; };
  $('g-cancel').onclick = closeModal;
  $('g-ok').onclick = () => {
    const num = (id, d) => { const v = parseFloat($(id).value); return isFinite(v) && v >= 0 ? v : d; };
    map.name = $('g-name').value.trim() || 'Untitled Game'; map.desc = $('g-desc').value.trim(); map.icon = $('g-icon').value.trim() || '🧱'; map.sky = $('g-sky').value;
    Object.assign(map.settings, { walk: num('g-walk', 16), jump: num('g-jump', 50), gravity: num('g-grav', 196) || 196, lives: Math.round(num('g-lives', 0)), timer: $('g-timer').checked, gears: $('g-gears').checked });
    closeModal(); applySky(); titleUI(); commit();
  };
}
function ago(t) { const s = (Date.now() - t) / 1000; if (s < 60) return 'just now'; if (s < 3600) return Math.round(s / 60) + ' min ago'; if (s < 86400) return Math.round(s / 3600) + ' h ago'; return new Date(t).toLocaleDateString(); }
function openDialog() {
  saveProject();
  const list = index();
  const m = openModal('<h2>Your games</h2><div class="sub">Saved in this browser.</div><div class="plist">' + list.map(x => {
    let ic = '🧱'; try { ic = JSON.parse(lsGet(LS_P + x.id) || '{}').icon || ic; } catch (e) { /* ignore */ }
    return '<div class="pitem' + (x.id === projId ? ' cur' : '') + '" data-id="' + esc(x.id) + '"><span class="ic">' + esc(ic) + '</span><div><b>' + esc(x.name) + '</b><small>' + (x.id === projId ? 'Open now · ' : '') + 'edited ' + ago(x.updated) + '</small></div><span class="x" title="Delete">🗑</span></div>';
  }).join('') + '</div><div class="acts"><button class="btn" id="o-new">+ New game</button><button class="btn" id="o-close">Close</button></div>');
  m.querySelector('.plist').onclick = e => {
    const it = e.target.closest('.pitem'); if (!it) return;
    if (e.target.classList.contains('x')) { const nm = it.querySelector('b').textContent; if (confirm('Delete "' + nm + '"? This cannot be undone.')) { deleteProject(it.dataset.id); openDialog(); } return; }
    closeModal(); openProject(it.dataset.id);
  };
  $('o-new').onclick = () => { closeModal(); newProject(); };
  $('o-close').onclick = closeModal;
}
function download(name, text) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
function exportJson() { download((map.name.replace(/[^\w\- ]+/g, '').trim() || 'game') + '.unbloxed.json', JSON.stringify(map, null, 1)); }
function importJson() {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
  inp.onchange = () => {
    const f = inp.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const j = JSON.parse(rd.result);
        const m = j && Array.isArray(j.parts) && Array.isArray(j.parts[0]) ? fromLegacy(j, f.name.replace(/\.json$/i, '')) : j;
        if (!m || typeof m !== 'object' || !Array.isArray(m.parts)) throw new Error('bad');
        delete m.cloudId;
        saveProject(); loadMap(m, null); saveProject(); toast('Imported ' + map.parts.length + ' parts');
      } catch (e) { toast('That file is not an Unbloxed Studio game', true); }
    };
    rd.readAsText(f);
  };
  inp.click();
}
function loadLegacyMaps(cb) {
  if (window.UBX_MAPS) return cb();
  const s = document.createElement('script'); s.src = 'assets.js';
  s.onload = () => cb(); s.onerror = () => toast('Could not load the Unbloxed maps (assets.js)', true);
  document.head.appendChild(s);
}
function legacyDialog() {
  const m = openModal('<h2>Open an Unbloxed map</h2><div class="sub">Makes an editable copy of one of the built-in Unbloxed maps as a new game.</div><div class="plist" id="lg-list"><div class="empty">Loading maps…</div></div><div class="acts"><button class="btn" id="lg-close">Close</button></div>');
  $('lg-close').onclick = closeModal;
  loadLegacyMaps(() => {
    if (!$('lg-list')) return;
    const keys = Object.keys(window.UBX_MAPS || {});
    $('lg-list').innerHTML = keys.map(k => { const L = window.UBX_MAPS[k], info = LEGACY[k] || [k, '🧱']; return '<div class="pitem" data-k="' + esc(k) + '"><span class="ic">' + info[1] + '</span><div><b>' + esc(info[0]) + '</b><small>' + ((L.parts || []).length) + ' parts</small></div></div>'; }).join('') || '<div class="empty">No maps found.</div>';
    $('lg-list').onclick = e => {
      const it = e.target.closest('.pitem'); if (!it) return;
      closeModal(); saveProject();
      loadMap(fromLegacy(window.UBX_MAPS[it.dataset.k], it.dataset.k), null); saveProject();
      toast('Opened ' + map.parts.length + ' parts');
    };
  });
}

// ---------- play test ----------
function play() {
  if (playing) return;
  saveProject();
  const ok = lsSet(LS_PLAY, ser());
  if (!ok) return toast('Browser storage is full: cannot start the play test', true);
  playing = true; held.clear(); closeMenu(); closeModal();
  if (tc.dragging) { tc.dragging = false; drag = null; }
  $('playov').style.display = 'block';
  const f = $('playframe');
  f.onload = () => { try { f.contentWindow.focus(); } catch (e) { /* ignore */ } };
  f.src = (window.UBXRemix && UBXRemix.playSrc(map)) || '../unbloxed.html?studio=play'; // standalone remixes play their own game page (studio/remix.js)
  f.focus();
}
function stopPlay() {
  if (!playing) return;
  playing = false;
  const f = $('playframe'); f.onload = null; f.src = 'about:blank';
  $('playov').style.display = 'none';
  lastT = performance.now(); invalidate(); canvas.focus();
}
$('playbtn').onclick = play;
$('stopbtn').onclick = stopPlay;
window.addEventListener('message', e => { if (e.data && e.data.type === 'ubx-studio-stop') stopPlay(); });

// ---------- publish ----------
function captureThumb() {
  if (!window.UBXCloud) return '';
  const hadSel = sel.slice(); setSel([], true); setHover(null);
  const vis = [grid.visible, tc.visible, ghost.visible]; grid.visible = false; tc.visible = false; ghost.visible = ghostLine.visible = false;
  renderer.render(scene, camera);
  const t = window.UBXCloud.thumbFrom(canvas) || '';

  grid.visible = vis[0]; tc.visible = vis[1]; invalidate();
  setSel(hadSel);
  return t;
}
// compact copy for publishing: numbers to 3 decimals, fields equal to FORMAT.md defaults dropped
const PART_DEF = { name: 'Part', shape: 'block', c: '#a3a2a5', mat: 'plastic', t: 0, collide: true, kind: 'none' };
const KIND_FIELDS = { spin: 'spinner', move: 'mover', bounce: 'bounce', cp: 'checkpoint' };
function compactMap(m) {
  const out = clone(m); delete out.cloudId;
  const rn = v => Array.isArray(v) ? v.map(rn) : typeof v === 'number' ? r3(v) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, rn(x)])) : v;
  out.parts = out.parts.map(p => {
    p = rn(p);
    for (const k in PART_DEF) if (p[k] === PART_DEF[k]) delete p[k];
    if (p.r && p.r.every(v => v === 0)) delete p.r;
    for (const k in KIND_FIELDS) if (k in p && p.kind !== KIND_FIELDS[k]) delete p[k];
    return p;
  });
  return out;
}
function publishGame(m) {
  m = m || map;
  const C = window.UBXCloud;
  if (!C) { publishUnavailable('Publishing could not load (studio/cloud.js is missing).'); return; }
  if (!C.user()) return signInDialog(() => publishGame(m));
  let thumb = captureThumb();
  const md = openModal('<h2>' + (m.cloudId ? 'Update your game' : 'Publish your game') + '</h2><div class="sub">Publishing puts your game in Unbloxed under <b>Made in Studio</b> for everyone. Signed in as <b>' + esc(C.user()) + '</b> · <a href="#" id="pb-out" style="color:var(--acc)">not you?</a></div>' +
    '<div class="f"><span>Name</span><input id="pb-name" maxlength="40"></div>' +
    '<div class="f"><span>Description</span><textarea id="pb-desc" maxlength="300"></textarea></div>' +
    '<div class="f"><span>Icon</span><div><input id="pb-icon" maxlength="8" style="width:70px;font-size:18px;text-align:center"><div class="emojis">' + EMOJI.map(x => '<span>' + x + '</span>').join('') + '</div></div></div>' +
    '<div class="f" style="align-items:start"><span>Thumbnail</span><div><div class="thumb" id="pb-thumb"></div><button class="btn" id="pb-retake" style="margin-top:6px;font-size:12px;padding:5px 10px">📷 Retake from current view</button></div></div>' +
    (m.cloudId ? '<div class="note" style="padding:0">Game code: <b>' + esc(m.cloudId) + '</b></div>' : '') +
    '<div class="err" id="pb-err"></div>' +
    '<div class="acts">' + (m.cloudId ? '<button class="btn danger" id="pb-un" style="margin-right:auto">Unpublish</button>' : '') + '<button class="btn" id="pb-export">Export .json</button><button class="btn" id="pb-cancel">Cancel</button><button class="btn go" id="pb-go">' + (m.cloudId ? 'Update game' : 'Publish') + '</button></div>');
  $('pb-name').value = m.name; $('pb-desc').value = m.desc || ''; $('pb-icon').value = m.icon || '🧱';
  const showThumb = () => { $('pb-thumb').style.backgroundImage = thumb ? 'url(' + thumb + ')' : ''; };
  showThumb();
  md.querySelector('.emojis').onclick = e => { if (e.target.tagName === 'SPAN') $('pb-icon').value = e.target.textContent; };
  $('pb-out').onclick = e => { e.preventDefault(); lsDel('shooter_creds'); closeModal(); signInDialog(() => publishGame(m)); };
  $('pb-export').onclick = exportJson;
  $('pb-cancel').onclick = closeModal;
  const busy = on => md.querySelectorAll('button').forEach(b => b.disabled = on);
  $('pb-go').onclick = async () => {
    const name = $('pb-name').value.trim(); if (!name) { $('pb-err').textContent = 'Give your game a name'; return; }
    map.name = name; map.desc = $('pb-desc').value.trim(); map.icon = $('pb-icon').value.trim() || '🧱'; map.author = C.user();
    commit(); titleUI();
    busy(true); $('pb-err').textContent = ''; $('pb-go').textContent = 'Publishing…';
    try {
      const pub = compactMap(map);
      let id = await C.publish({ id: map.cloudId || null, name: map.name, desc: map.desc, icon: map.icon, thumb, map: pub });
      if (Array.isArray(id)) id = id[0]; if (id && typeof id === 'object') id = id.id || id.ubx_publish || Object.values(id)[0];
      if (!id) throw new Error('Publish failed (no game id came back)');
      map.cloudId = String(id); commit(); saveProject(); titleUI();
      publishedDialog(map.cloudId);
    } catch (err) {
      busy(false); $('pb-go').textContent = map.cloudId ? 'Update game' : 'Publish';
      // never sign the kid out of the whole site here (shared login); the project and this dialog stay as they are
      $('pb-err').textContent = err && (err.status === 401 || /login/i.test(err.message || '')) ? "Couldn't publish: your login looks expired. Log in again from the main page." : (err && err.message) || 'Publish failed';
    }
  };
  if (m.cloudId) $('pb-un').onclick = async () => {
    if (!confirm('Unpublish "' + map.name + '"? Players will not be able to find it any more.')) return;
    busy(true); $('pb-err').textContent = '';
    try { await C.unpublish(map.cloudId); delete map.cloudId; commit(); saveProject(); titleUI(); closeModal(); toast('Unpublished'); }
    catch (err) { busy(false); $('pb-err').textContent = (err && err.message) || 'Unpublish failed'; }
  };
  // retake: re-render from the current view (camera may have been moved since the dialog opened)
  $('pb-retake').onclick = () => { // hide the dialog so the camera can be moved, then capture
    $('modalbg').style.display = 'none';
    const bar = document.createElement('div'); bar.id = 'capbar';
    bar.innerHTML = '<span>Frame your thumbnail (right-drag to look, WASD to fly)</span><button class="btn go" id="cap-go">📷 Capture</button><button class="btn" id="cap-x">Cancel</button>';
    document.body.appendChild(bar);
    const back = () => { bar.remove(); $('modalbg').style.display = 'flex'; };
    $('cap-go').onclick = () => { thumb = captureThumb(); back(); showThumb(); };
    $('cap-x').onclick = back;
  };
}
function publishedDialog(id) {
  openModal('<h2>🎉 Published!</h2><div class="sub">It shows up in Unbloxed &gt; <b>Made in Studio</b> right away, and anyone with the game code can play it now. <a href="../unbloxed.html" target="_blank" style="color:var(--acc)">Open Unbloxed</a></div>' +
    '<div class="f"><span>Game code</span><div style="display:flex;gap:6px"><input id="pd-code" readonly style="font-family:monospace;font-size:12px"><button class="btn" id="pd-copy" style="padding:5px 12px">Copy</button></div></div>' +
    '<div class="note" style="padding:0">Friends can paste this code in Unbloxed &gt; Made in Studio &gt; Game code. Publish again any time to update the game.</div>' +
    '<div class="acts"><button class="btn pri" id="pd-ok">Done</button></div>');
  $('pd-code').value = id;
  $('pd-copy').onclick = () => {
    const inp = $('pd-code'); inp.select();
    const done = () => { $('pd-copy').textContent = 'Copied ✓'; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(id).then(done, () => { try { document.execCommand('copy'); done(); } catch (e) { /* ignore */ } });
    else { try { document.execCommand('copy'); done(); } catch (e) { /* ignore */ } }
  };
  $('pd-ok').onclick = closeModal;
}
function publishUnavailable(msg) {
  openModal('<h2>Publish</h2><div class="sub">' + esc(msg) + ' You can still export your game as a .json file.</div><div class="acts"><button class="btn" id="pu-close">Close</button><button class="btn pri" id="pu-exp">Export .json</button></div>');
  $('pu-close').onclick = closeModal; $('pu-exp').onclick = () => { exportJson(); closeModal(); };
}
function signInDialog(after) {
  const C = window.UBXCloud;
  let mode = 'in';
  openModal('<h2>Sign in to publish</h2><div class="sub">Same account as Unbloxed and the rest of the site.</div>' +
    '<div class="tabs"><button class="btn on" data-m="in">Sign in</button><button class="btn" data-m="up">Create account</button></div>' +
    '<div class="f"><span>Username</span><input id="si-u" maxlength="20" autocomplete="username"></div>' +
    '<div class="f"><span>Password</span><input id="si-p" type="password" autocomplete="current-password"></div>' +
    '<div class="err" id="si-err"></div>' +
    '<div class="acts"><button class="btn" id="si-cancel">Cancel</button><button class="btn pri" id="si-go">Sign in</button></div>');
  $('modal').querySelector('.tabs').onclick = e => {
    const b = e.target.closest('[data-m]'); if (!b) return; mode = b.dataset.m;
    $('modal').querySelectorAll('.tabs .btn').forEach(x => x.classList.toggle('on', x === b));
    $('si-go').textContent = mode === 'in' ? 'Sign in' : 'Create account'; $('si-err').textContent = '';
  };
  $('si-cancel').onclick = closeModal;
  const go = async () => {
    $('si-go').disabled = true; $('si-err').textContent = '';
    const err = await (mode === 'in' ? C.signIn : C.signUp)($('si-u').value, $('si-p').value);
    $('si-go').disabled = false;
    if (err) { $('si-err').textContent = err; return; }
    closeModal(); toast('Signed in as ' + C.user()); after();
  };
  $('si-go').onclick = go;
  $('si-p').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
}
$('publishbtn').onclick = () => publishGame(map);

// ---------- boot ----------
window.addEventListener('beforeunload', () => { if (!playing) saveProject(); });
(function boot() {
  const last = lsGet(LS_LAST);
  let opened = false;
  if (last && lsGet(LS_P + last)) { try { loadMap(JSON.parse(lsGet(LS_P + last)), last); opened = true; } catch (e) { /* fall through */ } }
  if (!opened) { const idx = index(); for (const x of idx) { const s = lsGet(LS_P + x.id); if (s) { try { loadMap(JSON.parse(s), x.id); opened = true; break; } catch (e) { /* next */ } } } }
  if (!opened) { loadMap(defaultMap(), null); saveProject(); }
  setTool('select');
  resize();
  requestAnimationFrame(frame);
})();

// small API for wiring and tests
window.UBXStudio = {
  get map() { return map; }, get selection() { return sel.slice(); }, get projectId() { return projId; },
  insert, select: ids => setSel(ids), setTool, undo, redo, duplicate, copy: copySel, paste, del, save: saveProject, play, stop: stopPlay,
  publishGame, fromLegacy, openProject, newProject, camera, scene, gizmo: tc, commit, syncPart: p => { syncPart(p); placePivot(); },
  renderTree, buildProps
};
window.publishGame = publishGame;

// ---------- toolbox models (studio/toolbox.js) ----------
// Insert a model: v1 parts relative to its ground centre (y = 0 is its bottom). Dropped where the screen point `at`
// ({x,y} in NDC, default the view centre) hits a part or the ground, kept out of the camera's face. One undo step.
function insertModel(list, at) {
  if (!Array.isArray(list) || !list.length) return [];
  const a = at || { x: 0, y: 0 };
  let rad = 1; for (const p of list) rad = Math.max(rad, Math.hypot(p.p[0], p.p[2]) + Math.max(p.s[0], p.s[2]) / 2);
  const below = (x, y, z) => { ray.set(new V3(x, y, z), new V3(0, -1, 0)); ray.far = Infinity; const h = ray.intersectObjects(meshes, false)[0]; return h ? h.point.y : Math.min(0, y); };
  const h = castFrom(a.x, a.y, 600), dir = ray.ray.direction.clone();
  let pt;
  if (h && h.face) {
    const n = h.face.normal.clone().transformDirection(h.object.matrixWorld);
    pt = h.point.clone();
    if (n.y <= 0.5) { n.y = 0; if (n.lengthSq() > 1e-6) pt.add(n.normalize().multiplyScalar(rad)); pt.y = below(pt.x, pt.y + 0.5, pt.z); }
  } else {
    const t = dir.y < -0.02 ? -camera.position.y / dir.y : -1;
    pt = t > 0 && t < 600 ? camera.position.clone().addScaledVector(dir, t) : camera.position.clone().addScaledVector(dir, rad + 20);
    if (!(t > 0 && t < 600)) pt.y = below(pt.x, pt.y, pt.z);
  }
  if (!at) { // big models: far enough ahead that the camera is not inside them
    const fl = new V3(dir.x, 0, dir.z), hz = Math.hypot(pt.x - camera.position.x, pt.z - camera.position.z);
    if (fl.lengthSq() > 1e-6 && hz < rad + 4) { fl.normalize(); pt.x = camera.position.x + fl.x * (rad + 4); pt.z = camera.position.z + fl.z * (rad + 4); pt.y = below(pt.x, Math.max(pt.y, camera.position.y), pt.z); }
  }
  if (snapOn && moveStep > 0) { pt.x = Math.round(pt.x / moveStep) * moveStep; pt.z = Math.round(pt.z / moveStep) * moveStep; }
  const ids = [];
  for (const src of list) {
    const p = normPart(clone(src), new Set());
    p.id = newId(); p.p = [r3(p.p[0] + pt.x), r3(p.p[1] + pt.y), r3(p.p[2] + pt.z)];
    map.parts.push(p); syncPart(p); ids.push(p.id);
  }
  renderTree(); setSel(ids); commit();
  if (tool === 'select') setTool('translate');
  return ids;
}
window.UBXStudio.insertModel = insertModel;
})();
