'use strict';
// ===== Procedural canvas textures + shared materials =====
const TEX = {};
const MATS = {};

function canvasTex(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  draw(g, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

function makeTextures() {
  TEX.wood = canvasTex(128, (g, s) => {
    g.fillStyle = '#b07a43'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 4; i++) {
      const y = i * 32;
      g.fillStyle = ['#b9824a', '#a8723c', '#c08a50', '#a26d3a'][i];
      g.fillRect(0, y + 1, s, 30);
      g.strokeStyle = 'rgba(70,40,15,0.35)'; g.lineWidth = 1;
      for (let k = 0; k < 6; k++) {
        g.beginPath(); const yy = y + 4 + k * 4.5 + Math.random() * 2;
        g.moveTo(0, yy); g.bezierCurveTo(40, yy + 2, 80, yy - 2, s, yy + 1); g.stroke();
      }
      g.fillStyle = '#5a3615'; g.fillRect(0, y, s, 2);
      g.fillStyle = '#4a2c10'; g.beginPath(); g.arc(8, y + 16, 2, 0, TAU); g.arc(s - 8, y + 16, 2, 0, TAU); g.fill();
    }
  });
  // ground detail: soft light/dark speckles and little blade strokes (multiplied with the terrain colors)
  TEX.grass = canvasTex(256, (g, s) => {
    g.fillStyle = '#e6e6e6'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 2600; i++) {
      const v = 190 + Math.floor(Math.random() * 65);
      g.fillStyle = `rgb(${v},${v},${v})`;
      const x = Math.random() * s, y = Math.random() * s;
      g.fillRect(x, y, 1 + Math.random() * 2, 2 + Math.random() * 4);
    }
    for (let i = 0; i < 260; i++) { g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(Math.random() * s, Math.random() * s, 1, 3); }
  });
  TEX.grass.wrapS = TEX.grass.wrapT = THREE.RepeatWrapping;
  TEX.brick = canvasTex(128, (g, s) => {
    g.fillStyle = '#cfc6b8'; g.fillRect(0, 0, s, s);
    const bh = 16, bw = 32;
    for (let r = 0; r < s / bh; r++) {
      const off = (r % 2) * bw / 2;
      for (let c = -1; c < s / bw + 1; c++) {
        const shade = 150 + Math.random() * 40;
        g.fillStyle = `rgb(${shade + 30},${shade * 0.45},${shade * 0.32})`;
        g.fillRect(c * bw + off + 1.5, r * bh + 1.5, bw - 3, bh - 3);
      }
    }
  });
  TEX.metal = canvasTex(128, (g, s) => {
    const grd = g.createLinearGradient(0, 0, s, s);
    grd.addColorStop(0, '#9aa3ad'); grd.addColorStop(1, '#7d8792');
    g.fillStyle = grd; g.fillRect(0, 0, s, s);
    g.strokeStyle = '#5b636c'; g.lineWidth = 3; g.strokeRect(2, 2, s - 4, s - 4);
    g.beginPath(); g.moveTo(s / 2, 0); g.lineTo(s / 2, s); g.stroke();
    g.fillStyle = '#4c535b';
    for (const [x, y] of [[8, 8], [s - 8, 8], [8, s - 8], [s - 8, s - 8], [s / 2 - 6, 8], [s / 2 + 6, s - 8]]) { g.beginPath(); g.arc(x, y, 2.5, 0, TAU); g.fill(); }
    g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 1;
    for (let i = 0; i < 40; i++) { const y = Math.random() * s; g.beginPath(); g.moveTo(0, y); g.lineTo(s, y + 2); g.stroke(); }
  });
  TEX.siding = canvasTex(128, (g, s) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 8; i++) {
      const y = i * 16;
      const grd = g.createLinearGradient(0, y, 0, y + 16);
      grd.addColorStop(0, '#ffffff'); grd.addColorStop(1, '#d9d9d9');
      g.fillStyle = grd; g.fillRect(0, y, s, 16);
      g.fillStyle = '#b5b5b5'; g.fillRect(0, y + 15, s, 1);
    }
  });
  TEX.roof = canvasTex(128, (g, s) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, s, s);
    for (let r = 0; r < 8; r++) for (let c = 0; c < 9; c++) {
      const v = 200 + Math.random() * 55;
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(c * 16 - (r % 2) * 8 + 1, r * 16 + 1, 14, 14);
    }
  });
  TEX.chest = canvasTex(64, (g, s) => {
    g.fillStyle = '#c98b2e'; g.fillRect(0, 0, s, s);
    g.fillStyle = '#e8b54a'; g.fillRect(0, 0, s, 6); g.fillRect(0, s - 6, s, 6); g.fillRect(0, 0, 6, s); g.fillRect(s - 6, 0, 6, s);
    g.fillStyle = '#ffe28a'; g.fillRect(s / 2 - 5, s / 2 - 7, 10, 14);
  });
  TEX.locker = canvasTex(64, (g, s) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, s, s);
    g.fillStyle = '#cccccc'; for (let i = 0; i < 4; i++) g.fillRect(14, 6 + i * 5, s - 28, 2);
    g.fillStyle = '#999999'; g.fillRect(s - 14, s / 2 - 6, 4, 12);
    g.strokeStyle = '#aaaaaa'; g.lineWidth = 2; g.strokeRect(1, 1, s - 2, s - 2);
  });
}

function makeMaterials() {
  makeTextures();
  const L = (o) => new THREE.MeshLambertMaterial(o);
  MATS.build = { wood: L({ map: TEX.wood }), brick: L({ map: TEX.brick }), metal: L({ map: TEX.metal }) };
  MATS.buildGhost = new THREE.MeshBasicMaterial({ color: 0x4fb3ff, transparent: true, opacity: 0.35, depthWrite: false });
  MATS.buildGhostBad = new THREE.MeshBasicMaterial({ color: 0xff4f4f, transparent: true, opacity: 0.3, depthWrite: false });
  // Marvel landmarks: Castle Doom stone, Latverian red roofs, Avengers Tower glass, Doom's airships
  MATS.castle = L({ map: TEX.metal, color: 0xa4a7b0 });
  MATS.castleRoof = L({ color: 0x2c3170 });
  MATS.redRoof = L({ map: TEX.roof, color: 0xc0462f });
  MATS.creamBrick = L({ map: TEX.brick, color: 0xf3e3c8 });
  MATS.glass = L({ map: TEX.metal, color: 0x7fb6f0, emissive: 0x0a1a33 });
  MATS.aSign = L({ color: 0xffffff, emissive: 0x2a5cff });
  MATS.airship = L({ color: 0x3f5b3c });
  MATS.doomGreen = L({ color: 0x1f4d26 });
  MATS.supplyChest = L({ color: 0x2f7bd6, emissive: 0x0a2a55 });
  MATS.vaultChest = L({ color: 0xffd23a, emissive: 0x4a3200 });
  MATS.doomGold = L({ color: 0xc9971f, emissive: 0x1a1000 });
  MATS.carpet = L({ color: 0x6e1414 });
  MATS.doorway = L({ color: 0x141418 });
  MATS.throneStone = L({ color: 0x6d6a72 });
  MATS.castleFloor = L({ color: 0x5d5960 });
  // v1.5 POIs: the prison and the flying aircraft carrier
  MATS.concrete = L({ map: TEX.metal, color: 0xb9b6ae });
  MATS.prisonOrange = L({ color: 0xe8772e });
  MATS.hull = L({ map: TEX.metal, color: 0x67707c });
  MATS.deck = L({ color: 0x3a3e45 });
  MATS.stripe = L({ color: 0xffd23a, emissive: 0x332200 });
  MATS.rotor = L({ color: 0x2b2f36 });
  MATS.airshipDark = L({ color: 0x2b2b30 });
  MATS.houseWalls = [0xf4d58d, 0x9ad1d4, 0xf2a7a7, 0xc5e1a5, 0xffffff, 0xd7b9f0, 0xffc58a].map(c => L({ map: TEX.siding, color: c }));
  MATS.houseBrick = [0xffffff, 0xe0c0b0, 0xc8a090].map(c => L({ map: TEX.brick, color: c }));
  MATS.houseMetal = L({ map: TEX.metal, color: 0xdde4ee });
  MATS.roofs = [0x8d3b2f, 0x3b5d8d, 0x4a6b3a, 0x5b4636, 0x7d2f5c].map(c => L({ map: TEX.roof, color: c }));
  MATS.floorWood = L({ map: TEX.wood, color: 0xd9b48a });
  MATS.foundation = L({ color: 0x9c968c });
  MATS.chest = L({ map: TEX.chest, emissive: 0x3a2400 });
  MATS.chestOpen = L({ color: 0x6b4a1e });
  MATS.locker = [0x3f6fd8, 0xd83f3f, 0x3fb36f, 0xe0b030].map(c => L({ map: TEX.locker, color: c }));
  MATS.trunk = L({ color: 0x7a4f2a });
  MATS.leaves = L({ color: 0xffffff });
  MATS.rock = L({ color: 0xffffff, flatShading: true });
  MATS.dark = L({ color: 0x222428 });
  MATS.gunMetal = L({ color: 0x3a3d42 });
}

// Fortnite landscape layers (grass / sand / rock / dirt) from dist/ground.js
async function loadGround() {
  if (typeof GROUND_TEX === 'undefined') return;
  const load = (src) => new Promise((res) => { const img = new Image(); img.onload = () => res(img); img.onerror = () => res(null); img.src = src; });
  const out = {};
  for (const k in GROUND_TEX) {
    const img = await load(GROUND_TEX[k]);
    if (!img) return;
    const t = new THREE.Texture(img); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; t.needsUpdate = true;
    const cv = document.createElement('canvas'); cv.width = cv.height = 16; const g = cv.getContext('2d'); g.drawImage(img, 0, 0, 16, 16);
    const d = g.getImageData(0, 0, 16, 16).data; let L = 0; for (let i = 0; i < d.length; i += 4) L += (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) / 255;
    t.userData = { lum: L / 256 };
    out[k] = t;
  }
  TEX.ground = out;
}
