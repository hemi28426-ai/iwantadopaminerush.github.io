'use strict';
// ===== Emotes: 100 dances and gestures, the emote wheel (B) and playback in the lobby and in matches =====
// Most emotes are hand-made clips: an arm move + a leg move + a tempo (and sometimes a body turn), baked
// by ANIMS.proc into the same limb-direction format as the animation library. Some loop a library clip.
// Directions are in character space: x right, y up, -z forward.

// limb pointing helper: side (-1 left, +1 right), yaw (0 forward, 90 out to that side, 180 back),
// pitch (0 straight down, 90 level, 180 straight up), in degrees
const _D2R = Math.PI / 180;
function edir(out, key, side, yaw, pitch) {
  const y = yaw * _D2R, p = pitch * _D2R;
  (out[key] || (out[key] = new THREE.Vector3())).set(side * Math.sin(p) * Math.sin(y), -Math.cos(p), -Math.sin(p) * Math.cos(y)).normalize();
}
const ESIN = (b) => Math.sin(b * TAU), ECOS = (b) => Math.cos(b * TAU);
// arm: upper and forearm for one side
function earm(o, side, uy, up, fy, fp) { const k = side < 0 ? 'L' : 'R'; edir(o, 'upper' + k, side, uy, up); edir(o, 'fore' + k, side, fy, fp); }
// leg: thigh lift forward (deg, negative = back), sideways spread, knee bend (deg)
function eleg(o, side, lift, spread, knee) {
  const k = side < 0 ? 'L' : 'R';
  const yaw = lift >= 0 ? Math.atan2(spread, lift) / _D2R : 180 - Math.atan2(spread, -lift) / _D2R;
  const p = Math.hypot(lift, spread);
  edir(o, 'thigh' + k, side, yaw, p);
  // the calf folds back from the thigh by the knee bend
  const cp = lift - knee;
  edir(o, 'calf' + k, side, cp >= 0 ? Math.atan2(spread * 0.6, cp) / _D2R : 180 - Math.atan2(spread * 0.6, -cp) / _D2R, Math.hypot(cp, spread * 0.6));
}
const restArm = (o, s) => earm(o, s, 90, 8, 0, 18);

// ---- arm moves (b = beats since start) ----
const EARMS = {
  rest: (o) => { restArm(o, -1); restArm(o, 1); },
  wave: (o, b) => { restArm(o, -1); earm(o, 1, 80, 120, 70 + ESIN(b) * 40, 165); },
  wave2: (o, b) => { earm(o, -1, 80, 125, 70 + ESIN(b) * 40, 165); earm(o, 1, 80, 125, 70 - ESIN(b) * 40, 165); },
  pump: (o, b) => { earm(o, -1, 60, 30, 20, 80); const u = ESIN(b) > 0; earm(o, 1, 40, u ? 165 : 115, 20, u ? 175 : 60); },
  hype: (o, b) => { earm(o, -1, 40 + ESIN(b) * 20, 160, 50, 175); earm(o, 1, 40 - ESIN(b) * 20, 160, 50, 175); },
  clap: (o, b) => { const c = (1 + ECOS(b)) / 2; earm(o, -1, 30 + c * 25, 70, -60 + c * 70, 90); earm(o, 1, 30 + c * 25, 70, -60 + c * 70, 90); },
  floss: (o, b) => {
    // both arms swing to the same side, alternating in front of and behind the body
    const sw = ESIN(b), fr = ECOS(b);
    const yL = fr > 0 ? 20 + sw * -60 : 160 + sw * 60, yR = fr > 0 ? 20 + sw * 60 : 160 - sw * 60;
    earm(o, -1, yL, 35, yL, 35); earm(o, 1, yR, 35, yR, 35);
  },
  roof: (o, b) => { const u = (1 + ESIN(b)) / 2; earm(o, -1, 60, 100 + u * 60, 40, 140 + u * 35); earm(o, 1, 60, 100 + u * 60, 40, 140 + u * 35); },
  disco: (o, b) => { earm(o, -1, 40, 15, 20, 60); const u = ESIN(b * 0.5) > 0; earm(o, 1, u ? 50 : -20, u ? 155 : 40, u ? 50 : -25, u ? 160 : 40); },
  robot: (o, b) => {
    const q = Math.floor(b * 2) % 4, a = [0, 30, 0, -30][q];
    earm(o, -1, 90, 40 + (q === 1 ? 50 : 0), 0, 90); earm(o, 1, 90, 40 + (q === 3 ? 50 : 0), 0, 90);
    return { yaw: a * _D2R * 0.5 };
  },
  chicken: (o, b) => { const f = (1 + ESIN(b * 2)) / 2; earm(o, -1, 110, 30 + f * 45, 10, 20); earm(o, 1, 110, 30 + f * 45, 10, 20); },
  swim: (o, b) => { const a = b * 180; earm(o, -1, 0, 90 + Math.sin(a * _D2R) * 80, 0, 90 + Math.sin(a * _D2R) * 80); earm(o, 1, 0, 90 - Math.sin(a * _D2R) * 80, 0, 90 - Math.sin(a * _D2R) * 80); },
  guitar: (o, b) => { earm(o, -1, 30, 55, 10, 85); earm(o, 1, 20, 35 + ESIN(b * 2) * 12, -70, 75); },
  box: (o, b) => {
    const l = Math.max(0, ESIN(b)), r = Math.max(0, -ESIN(b));
    earm(o, -1, 10, 50 + l * 40, -10, 70 + l * 25); earm(o, 1, 10, 50 + r * 40, -10, 70 + r * 25);
  },
  shrug: (o, b) => { const u = Math.abs(ESIN(b * 0.5)); earm(o, -1, 60, 25 + u * 20, 50, 80); earm(o, 1, 60, 25 + u * 20, 50, 80); },
  jacks: (o, b) => { const u = (1 - ECOS(b)) / 2; earm(o, -1, 90, 15 + u * 155, 90, 20 + u * 160); earm(o, 1, 90, 15 + u * 155, 90, 20 + u * 160); },
  egypt: (o, b) => { const s = ESIN(b) > 0 ? 1 : -1; earm(o, -1, 90, 90, 90, 90 + s * 75); earm(o, 1, 90, 90, 90, 90 - s * 75); },
  hips: (o) => { earm(o, -1, 120, 40, -100, 50); earm(o, 1, 120, 40, -100, 50); },
  heart: (o, b) => { const s = ESIN(b * 0.5) * 12; earm(o, -1, 35 + s, 80, -40 + s, 120); earm(o, 1, 35 - s, 80, -40 - s, 120); },
  point: (o, b) => { const r = ESIN(b * 0.5) > 0; earm(o, -1, r ? 90 : 20, r ? 10 : 90, r ? 0 : 20, r ? 30 : 92); earm(o, 1, r ? 20 : 90, r ? 90 : 10, r ? 20 : 0, r ? 92 : 30); },
  propeller: (o) => { earm(o, -1, 90, 90, 90, 92); earm(o, 1, 90, 90, 90, 92); },
  salute: (o) => { restArm(o, -1); earm(o, 1, 50, 100, -95, 120); },
  sprinkler: (o, b) => { earm(o, -1, 60, 140, -150, 120); const st = (Math.floor(b * 2) % 6) * 20; earm(o, 1, st, 90, st, 92); },
  wavy: (o, b) => { earm(o, -1, 90, 90 + ESIN(b) * 15, 90, 90 - ESIN(b) * 35); earm(o, 1, 90, 90 + ESIN(b + 0.25) * 15, 90, 90 - ESIN(b + 0.25) * 35); },
  cross: (o) => { earm(o, -1, 40, 50, -80, 85); earm(o, 1, 40, 50, -80, 95); },
  lasso: (o, b) => { earm(o, -1, 40, 20, 20, 60); earm(o, 1, 70 + ESIN(b) * 60, 160, 70 + ECOS(b) * 90, 120); },
  dab: (o) => { earm(o, -1, 70, 130, 70, 135); earm(o, 1, 60, 100, -100, 75); },
  takel: (o) => { restArm(o, -1); earm(o, 1, 40, 120, -95, 135); },
  facepalm: (o, b) => { restArm(o, -1); earm(o, 1, -10, 80 + ESIN(b * 0.5) * 3, 240, 140); },
  thinker: (o) => { earm(o, -1, 20, 40, -80, 85); earm(o, 1, 15, 45, -10, 170); },
  conductor: (o, b) => { earm(o, -1, 40, 80 + ESIN(b) * 35, 30, 95 + ESIN(b) * 40); earm(o, 1, 40, 80 - ESIN(b) * 35, 30, 95 - ESIN(b) * 40); },
  swipe: (o, b) => { restArm(o, -1); const s = ESIN(b * 0.5); earm(o, 1, 40 + s * 60, 95, 40 + s * 75, 95); },
  pray: (o, b) => { const s = ESIN(b * 0.5) * 6; earm(o, -1, 20, 40 + s, -60, 130 + s); earm(o, 1, 20, 40 + s, -60, 130 + s); },
  muscle: (o, b) => { const f = (1 + ESIN(b * 0.5)) / 2; earm(o, -1, 90, 90, 60 - f * 40, 120 + f * 50); earm(o, 1, 90, 90, 60 - f * 40, 120 + f * 50); },
  laugh: (o, b) => { const s = ESIN(b * 2) * 8; earm(o, -1, 30, 30 + s, -30, 70 + s); earm(o, 1, 30, 30 + s, -30, 70 + s); },
  zombie: (o, b) => { earm(o, -1, 5, 90 + ESIN(b) * 6, 5, 92); earm(o, 1, 5, 90 - ESIN(b) * 6, 5, 92); },
  airplane: (o, b) => { const t = ESIN(b * 0.5) * 25; earm(o, -1, 90, 90 + t, 90, 90 + t); earm(o, 1, 90, 90 - t, 90, 90 - t); },
  piano: (o, b) => { earm(o, -1, 30, 45, -10, 85 + ESIN(b * 2) * 8); earm(o, 1, 30, 45, -10, 85 - ESIN(b * 2) * 8); },
  drum: (o, b) => { earm(o, -1, 30, 45, -5, 70 + Math.max(0, ESIN(b)) * 45); earm(o, 1, 30, 45, -5, 70 + Math.max(0, -ESIN(b)) * 45); },
  vogue: (o, b) => { const q = Math.floor(b) % 4; if (q % 2) { earm(o, -1, 0, 150, -90, 120); earm(o, 1, 0, 150, -90, 120); } else { earm(o, -1, 90, 90, -10, 90); earm(o, 1, 70, 120, -95, 120); } },
  shimmy: (o, b) => { const s = ESIN(b * 2) * 18; earm(o, -1, 80 + s, 45, 40 + s, 80); earm(o, 1, 80 - s, 45, 40 - s, 80); },
  snap: (o, b) => { const s = ESIN(b) * 10; earm(o, -1, 50, 35 + s, 20, 100 + s); earm(o, 1, 50, 35 - s, 20, 100 - s); },
  bow: (o) => { earm(o, -1, 120, 50, -90, 70); earm(o, 1, 120, 20, 30, 50); },
  ride: (o, b) => { earm(o, -1, 20, 40, -40, 80); earm(o, 1, 20, 40, -40, 80); return { yaw: ESIN(b * 0.5) * 0.2 }; },
};

// ---- leg moves ----
const ELEGS = {
  still: (o, b) => { eleg(o, -1, 2, 6, 4); eleg(o, 1, 2, 6, 4); return { hip: -0.005 + ESIN(b) * 0.004 }; },
  bounce: (o, b) => { const k = (1 - ECOS(b)) / 2 * 25; eleg(o, -1, k * 0.6, 8, k); eleg(o, 1, k * 0.6, 8, k); return { hip: -k / 900 }; },
  step: (o, b) => { const s = ESIN(b * 0.5); eleg(o, -1, 4, 8 + Math.max(0, -s) * 18, Math.max(0, s) * 25); eleg(o, 1, 4, 8 + Math.max(0, s) * 18, Math.max(0, -s) * 25); return { hip: -Math.abs(s) * 0.015 }; },
  kick: (o, b) => { const s = ESIN(b * 0.5); eleg(o, -1, Math.max(0, s) * 60, 6, Math.max(0, s) * 10 + 10); eleg(o, 1, Math.max(0, -s) * 60, 6, Math.max(0, -s) * 10 + 10); return { hip: -0.02 }; },
  march: (o, b) => { const s = ESIN(b * 0.5); eleg(o, -1, Math.max(0, s) * 70, 4, Math.max(0, s) * 80); eleg(o, 1, Math.max(0, -s) * 70, 4, Math.max(0, -s) * 80); return { hip: 0 }; },
  squat: (o, b) => { const k = (1 - ECOS(b * 0.5)) / 2; eleg(o, -1, k * 70, 18, k * 120); eleg(o, 1, k * 70, 18, k * 120); return { hip: -k * 0.32 }; },
  jacks: (o, b) => { const u = (1 - ECOS(b)) / 2; eleg(o, -1, 0, 4 + u * 22, 6); eleg(o, 1, 0, 4 + u * 22, 6); return { hip: Math.abs(ESIN(b * 0.5)) * 0.08 }; },
  running: (o, b) => { const s = ESIN(b * 0.5); eleg(o, -1, s * 30, 4, 20 + Math.max(0, -s) * 40); eleg(o, 1, -s * 30, 4, 20 + Math.max(0, s) * 40); return { hip: -0.03 + Math.abs(ESIN(b)) * 0.02 }; },
  twist: (o, b) => { eleg(o, -1, 20, 10, 40); eleg(o, 1, 20, 10, 40); return { hip: -0.06, yaw: ESIN(b * 0.5) * 0.45 }; },
  tap: (o, b) => { eleg(o, -1, 3, 8, 6); const u = Math.max(0, ESIN(b)); eleg(o, 1, 15 + u * 15, 14, 10 + u * 30); return { hip: -0.005 }; },
  hop: (o, b) => { const u = Math.abs(ESIN(b * 0.5)); eleg(o, -1, 20 + u * 20, 6, 40 + u * 30); eleg(o, 1, 20 + u * 20, 6, 40 + u * 30); return { hip: u * 0.12 - 0.04 }; },
  shuffle: (o, b) => { const s = ESIN(b), c = ECOS(b * 0.5); eleg(o, -1, s * 15, 10 + c * 10, 15); eleg(o, 1, -s * 15, 10 - c * 10, 15); return { hip: -0.02, yaw: c * 0.15 }; },
  kneel: (o) => { eleg(o, -1, 85, 6, 90); eleg(o, 1, -10, 6, 95); return { hip: -0.42 }; },
  wide: (o, b) => { eleg(o, -1, 10, 22, 25); eleg(o, 1, 10, 22, 25); return { hip: -0.05 + ESIN(b) * 0.01 }; },
};

// name, rarity (1 common .. 4 legendary), and either a library clip or an arm + leg move at a tempo (bpm).
// spin = turns per bar (body spins round), sway = body turn back and forth
const EMOTE_DEFS = [
  ['default', 'Default Dance', 1, { clip: 'dance' }],
  ['wave', 'Wave', 1, { arms: 'wave', legs: 'still', bpm: 100 }],
  ['clap', 'Slow Clap', 1, { arms: 'clap', legs: 'still', bpm: 70 }],
  ['salute', 'Salute', 1, { arms: 'salute', legs: 'still', bpm: 60 }],
  ['floss', 'Floss', 3, { arms: 'floss', legs: 'twist', bpm: 125 }],
  ['robot', 'The Robot', 2, { arms: 'robot', legs: 'still', bpm: 110 }],
  ['takel', 'Take the L', 3, { arms: 'takel', legs: 'kick', bpm: 128 }],
  ['dab', 'Dab', 2, { arms: 'dab', legs: 'wide', bpm: 60 }],
  ['hype', 'Hype', 2, { arms: 'hype', legs: 'bounce', bpm: 120 }],
  ['jubilation', 'Jubilation', 2, { arms: 'wave2', legs: 'hop', bpm: 120 }],
  ['pumpit', 'Pump It Up', 2, { arms: 'pump', legs: 'bounce', bpm: 128 }],
  ['raiseroof', 'Raise the Roof', 2, { arms: 'roof', legs: 'bounce', bpm: 116 }],
  ['disco', 'Disco Fever', 3, { arms: 'disco', legs: 'step', bpm: 118 }],
  ['chicken', 'Chicken', 2, { arms: 'chicken', legs: 'march', bpm: 130 }],
  ['swimteam', 'Swim Team', 2, { arms: 'swim', legs: 'bounce', bpm: 100 }],
  ['airguitar', 'Air Shredder', 3, { arms: 'guitar', legs: 'wide', bpm: 140 }],
  ['shadowbox', 'Shadow Boxer', 2, { arms: 'box', legs: 'running', bpm: 140 }],
  ['shrug', 'Shrug', 1, { arms: 'shrug', legs: 'still', bpm: 60 }],
  ['jacks', 'Jumping Jacks', 1, { arms: 'jacks', legs: 'jacks', bpm: 110 }],
  ['egypt', 'Walk Like That', 3, { arms: 'egypt', legs: 'step', bpm: 112 }],
  ['sassy', 'Sassy', 2, { arms: 'hips', legs: 'tap', bpm: 100 }],
  ['heart', 'Heartbreaker', 2, { arms: 'heart', legs: 'still', bpm: 80 }],
  ['pointdance', 'Point It Out', 2, { arms: 'point', legs: 'step', bpm: 120 }],
  ['propeller', 'Helicopter', 3, { arms: 'propeller', legs: 'still', bpm: 120, spin: 1 }],
  ['sprinkler', 'Sprinkler', 2, { arms: 'sprinkler', legs: 'wide', bpm: 120 }],
  ['wavedance', 'Electric Wave', 3, { arms: 'wavy', legs: 'step', bpm: 110 }],
  ['tough', 'Tough Guy', 1, { arms: 'cross', legs: 'wide', bpm: 70 }],
  ['lasso', 'Yeehaw', 3, { arms: 'lasso', legs: 'bounce', bpm: 120 }],
  ['facepalm', 'Facepalm', 1, { arms: 'facepalm', legs: 'still', bpm: 60 }],
  ['thinker', 'Big Brain', 1, { arms: 'thinker', legs: 'still', bpm: 60 }],
  ['maestro', 'Maestro', 3, { arms: 'conductor', legs: 'still', bpm: 90 }],
  ['swipe', 'Swipe It', 2, { arms: 'swipe', legs: 'step', bpm: 110 }],
  ['grateful', 'Grateful', 1, { arms: 'pray', legs: 'still', bpm: 60 }],
  ['flex', 'Flex', 2, { arms: 'muscle', legs: 'wide', bpm: 80 }],
  ['laughing', 'Laugh It Up', 1, { arms: 'laugh', legs: 'bounce', bpm: 160 }],
  ['zombie', 'Brainzzz', 2, { arms: 'zombie', legs: 'running', bpm: 70 }],
  ['airplane', 'Jet Set', 2, { arms: 'airplane', legs: 'running', bpm: 120 }],
  ['piano', 'Keys', 2, { arms: 'piano', legs: 'still', bpm: 120 }],
  ['drummer', 'Drum Roll', 2, { arms: 'drum', legs: 'tap', bpm: 140 }],
  ['vogue', 'Strike a Pose', 3, { arms: 'vogue', legs: 'tap', bpm: 100 }],
  ['shimmy', 'Shimmy', 2, { arms: 'shimmy', legs: 'bounce', bpm: 130 }],
  ['fingersnap', 'Finger Snaps', 1, { arms: 'snap', legs: 'step', bpm: 96 }],
  ['bow', 'Take a Bow', 1, { arms: 'bow', legs: 'still', bpm: 60 }],
  ['ponyride', 'Pony Up', 3, { arms: 'ride', legs: 'hop', bpm: 126 }],
  ['electro', 'Electro Shuffle', 4, { arms: 'point', legs: 'shuffle', bpm: 128 }],
  ['orange', 'Fruit Justice', 4, { arms: 'swim', legs: 'kick', bpm: 120 }],
  ['groove', 'Groove Jam', 3, { arms: 'snap', legs: 'shuffle', bpm: 115 }],
  ['bestmates', 'Best Buds', 3, { arms: 'hype', legs: 'hop', bpm: 128 }],
  ['breakin', 'Breakin\'', 4, { arms: 'propeller', legs: 'squat', bpm: 120, spin: 0.5 }],
  ['squatgoals', 'Squat Goals', 1, { arms: 'cross', legs: 'squat', bpm: 90 }],
  ['marching', 'Band Leader', 2, { arms: 'drum', legs: 'march', bpm: 116 }],
  ['tornado', 'Tornado', 4, { arms: 'hype', legs: 'still', bpm: 140, spin: 2 }],
  ['spinner', 'Spin Cycle', 3, { arms: 'airplane', legs: 'still', bpm: 100, spin: 1 }],
  ['boogie', 'Boogie Down', 3, { arms: 'disco', legs: 'twist', bpm: 124 }],
  ['twist', 'The Twist', 2, { arms: 'shimmy', legs: 'twist', bpm: 140 }],
  ['moonbounce', 'Moon Bounce', 2, { arms: 'wave2', legs: 'jacks', bpm: 90 }],
  ['victoryhop', 'Victory Hop', 2, { arms: 'pump', legs: 'hop', bpm: 120 }],
  ['frogger', 'Frog Hop', 2, { arms: 'chicken', legs: 'hop', bpm: 110 }],
  ['raver', 'Glowsticks', 3, { arms: 'conductor', legs: 'bounce', bpm: 150 }],
  ['dynamo', 'Dynamo', 3, { arms: 'roof', legs: 'shuffle', bpm: 128 }],
  ['popcorn', 'Popcorn', 2, { arms: 'box', legs: 'hop', bpm: 132 }],
  ['tidy', 'Tidy', 2, { arms: 'swipe', legs: 'wide', bpm: 90 }],
  ['pharaoh', 'Pharaoh', 3, { arms: 'egypt', legs: 'twist', bpm: 100 }],
  ['cowboy', 'Line Dancer', 3, { arms: 'hips', legs: 'kick', bpm: 120 }],
  ['jazz', 'Jazz Hands', 2, { arms: 'wave2', legs: 'tap', bpm: 140 }],
  ['metal', 'Headbanger', 3, { arms: 'guitar', legs: 'bounce', bpm: 170 }],
  ['trophy', 'Trophy Lift', 2, { arms: 'hype', legs: 'wide', bpm: 60 }],
  ['champ', 'Champion', 3, { arms: 'muscle', legs: 'step', bpm: 100 }],
  ['showtime', 'Showtime', 3, { arms: 'vogue', legs: 'step', bpm: 120 }],
  ['stomp', 'Stomper', 2, { arms: 'cross', legs: 'march', bpm: 100 }],
  ['ninjastyle', 'Ninja Style', 3, { arms: 'box', legs: 'kick', bpm: 120 }],
  ['propwash', 'Prop Wash', 2, { arms: 'airplane', legs: 'step', bpm: 110, sway: 0.4 }],
  ['jiggy', 'Get Jiggy', 3, { arms: 'shimmy', legs: 'shuffle', bpm: 125 }],
  ['tap', 'Tap Dancer', 2, { arms: 'hips', legs: 'running', bpm: 150 }],
  ['ringleader', 'Ringleader', 3, { arms: 'lasso', legs: 'step', bpm: 110 }],
  ['partyhard', 'Party Hard', 4, { arms: 'pump', legs: 'jacks', bpm: 140 }],
  ['flying', 'Flying High', 3, { arms: 'airplane', legs: 'hop', bpm: 100, sway: 0.6 }],
  ['showoff', 'Show Off', 2, { arms: 'dab', legs: 'bounce', bpm: 100 }],
  ['handshake', 'Hey There', 1, { arms: 'wave', legs: 'tap', bpm: 110 }],
  ['snapback', 'Snapback', 2, { arms: 'snap', legs: 'twist', bpm: 110 }],
  // library-clip emotes
  ['shadowfight', 'Combo Breaker', 3, { clip: 'u_jab', rate: 1 }],
  ['onetwo', 'One-Two', 2, { clip: 'u_cross', rate: 1 }],
  ['swordplay', 'Swashbuckler', 3, { clip: 'u_sword', rate: 1 }],
  ['wizard', 'Spellcaster', 4, { clip: 'u_spell', rate: 1 }],
  ['channel', 'Charging Up', 3, { clip: 'u_spellidle', rate: 1 }],
  ['sitdown', 'Take a Seat', 2, { clip: 'u_sit', rate: 1 }],
  ['storytime', 'Storytime', 1, { clip: 'u_talk', rate: 1 }],
  ['knock', 'Knock Knock', 1, { clip: 'u_interact', rate: 1 }],
  ['tumble', 'Tumble', 3, { clip: 'u_roll', rate: 1 }],
  ['crouch', 'Lay Low', 1, { clip: 'u_crouch', rate: 1 }],
  ['sneaky', 'Sneaky', 2, { clip: 'u_sneak', rate: 0.8 }],
  ['pushit', 'Push It', 2, { clip: 'u_push', rate: 1 }],
  ['roadtrip', 'Road Trip', 3, { clip: 'u_drive', rate: 1 }],
  ['fixit', 'Fix It', 2, { clip: 'u_fix', rate: 1 }],
  ['ouch', 'Ouch', 1, { clip: 'u_hit', rate: 1 }],
  ['fancy', 'Fancy Feet', 3, { clip: 'u_formal', rate: 1 }],
  ['torch', 'Torchbearer', 2, { clip: 'u_torch', rate: 1 }],
  ['tread', 'Treading Water', 2, { clip: 'u_tread', rate: 1 }],
  ['moonwalk', 'Moonwalk', 4, { clip: 'u_walk', rate: -1 }],
  ['jogonspot', 'Jog On The Spot', 1, { clip: 'u_jog', rate: 0.8 }],
];
const EMOTE_PRICE = [0, 200, 500, 800, 1200];
// Fortnite emotes (dist/fnemotes.js, baked by tools/fn-emotes.js from the game's own animations)
const FN_LIST = typeof FN_EMOTES === 'undefined' ? [] : FN_EMOTES.map((e) => ({ id: e.id, name: e.name, rarity: e.rarity, fn: e }));
// event-only emotes: never sold, unlocked by being at the live event
const EMOTE_EVENT = ['fn_snap'];
const EMOTE_FREE = ['default', 'wave', 'clap', 'salute', 'shrug', 'facepalm'].concat(FN_LIST.some((e) => e.id === 'fn_dancemoves') ? ['fn_dancemoves'] : []);
const EMOTES = {
  list: EMOTE_DEFS.map(([id, name, rarity, d]) => Object.assign({ id, name, rarity }, d)).concat(FN_LIST),
  byId: {},
  wheelOpen: false, wheelCb: null, wheelSel: -1, wheelVec: { x: 0, y: 0 }, el: null,

  build() {
    const b64 = (s, T) => { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new T(u.buffer); };
    for (const e of this.list) {
      this.byId[e.id] = e;
      if (e.fn) {
        // a real Fortnite emote: unpack its baked limb directions, hip bob and body turn
        const f = e.fn, d8 = b64(f.d, Int8Array), h16 = b64(f.h, Int16Array), y16 = b64(f.y, Int16Array);
        const dirs = new Float32Array(d8.length); for (let i = 0; i < d8.length; i++) dirs[i] = d8[i] / 127;
        const hip = new Float32Array(h16.length), yaw = new Float32Array(y16.length);
        for (let i = 0; i < h16.length; i++) { hip[i] = h16[i] / 1000; yaw[i] = y16[i] / 1000; }
        const clip = ANIMS.clips['e_' + e.id] = { n: f.n, dur: f.dur, dirs, hip, yaw, loop: true };
        if (f.hp) { const p16 = b64(f.hp, Int16Array), r16 = b64(f.hr, Int16Array); clip.headP = Float32Array.from(p16, (v) => v / 1000); clip.headR = Float32Array.from(r16, (v) => v / 1000); }
        // finger bones (e.g. the Snap): per frame, each finger's rotation from its rest pose
        if (f.fg) { const d8f = b64(f.fg.d, Int8Array); clip.fg = { names: f.fg.names.map((nm) => SKINS.norm(nm)), d: Float32Array.from(d8f, (v) => v / 127) }; }
        delete e.fn; // the packed copy isn't needed any more
        continue;
      }
      if (e.clip) continue;
      const bpm = e.bpm || 100, bars = e.spin ? 2 : 4, dur = bars * 4 * 60 / bpm; // loop length = whole bars
      const arm = EARMS[e.arms] || EARMS.rest, leg = ELEGS[e.legs] || ELEGS.still;
      ANIMS.proc('e_' + e.id, dur, (t, o) => {
        const b = t * bpm / 60;
        const ra = arm(o, b) || {}, rl = leg(o, b) || {};
        let yaw = (ra.yaw || 0) + (rl.yaw || 0);
        if (e.spin) yaw += (t / dur) * TAU * Math.round(e.spin * bars);
        if (e.sway) yaw += ESIN(b / 4) * e.sway;
        return { hip: rl.hip || 0, yaw };
      });
    }
  },
  get(id) { return this.byId[id] || this.list.find(e => e.id === id); },
  // playback state for ANIMS.pose
  state(id) {
    const e = this.get(id);
    if (!e) return null;
    if (e.clip) return { key: e.clip, rate: e.rate || 1 };
    return { key: 'e_' + e.id, rate: 1 };
  },
  price(e) { return EMOTE_PRICE[e.rarity]; },

  // ---- beat music while you emote ----
  beat: 0, playing: null,
  // emotes with their real Fortnite music (EMOTE_MUSIC: the Griddy) loop it instead of the made-up beat
  start(id) {
    this.stop();
    this.playing = this.get(id); this.beat = 0; this._acc = 0; SFX.init();
    const src = typeof EMOTE_MUSIC !== 'undefined' && EMOTE_MUSIC[id];
    if (src) { try { this.audio = new Audio(src); this.audio.loop = true; this.audio.volume = Math.min(1, 0.6 * (SETTINGS.volume ?? 1)); this.audio.play().catch(() => {}); } catch (e) { this.audio = null; } }
  },
  stop() { this.playing = null; if (this.audio) { this.audio.pause(); this.audio = null; } },
  tick(dt) {
    const e = this.playing;
    if (!e || this.audio || !SFX.ctx || SFX.ctx.state !== 'running') return;
    const bpm = e.bpm || 110;
    this._acc += dt * bpm / 60 * 2; // eighth notes
    while (this._acc >= 1) {
      this._acc -= 1; this.beat++;
      const o = SFX._out(0.22, 0), i = this.beat % 8;
      const root = [196, 220, 262, 247][(e.name.length + Math.floor(this.beat / 8)) % 4];
      if (i % 4 === 0) SFX._tone(o, 0.18, 'sine', 120, 45, 0.9); // kick
      if (i % 4 === 2) SFX._noise(o, 0.1, 'highpass', 2500, 2500, 0.35); // snare-ish
      SFX._noise(o, 0.03, 'highpass', 8000, 8000, 0.12); // hat
      if (i === 0 || i === 3 || i === 6) SFX._tone(o, 0.22, e.rarity >= 3 ? 'sawtooth' : 'triangle', root, root, 0.12);
      if (i === 4) SFX._tone(o, 0.2, 'triangle', root * 1.5, root * 1.5, 0.1);
    }
  },

  // ---- emote wheel: up to 8 equipped emotes; mouse direction (or 1-8) picks one ----
  wheel() { const w = (PROFILE.data.wheel || []).filter(id => this.get(id) && PROFILE.data.emotes.includes(id)); return w.length ? w : ['default']; },
  openWheel(cb) {
    if (!this.el) {
      this.el = document.createElement('div'); this.el.id = 'emote-wheel';
      document.body.appendChild(this.el);
      window.addEventListener('mousemove', (e) => {
        if (!this.wheelOpen || INPUT.locked) return;
        this.wheelVec.x = e.clientX - innerWidth / 2; this.wheelVec.y = e.clientY - innerHeight / 2; this.pick();
      });
      this.el.addEventListener('click', () => this.closeWheel(true));
    }
    const w = this.wheel(), n = w.length;
    this.el.innerHTML = `<div class="ew-ring">${w.map((id, i) => {
      const a = (i / n) * TAU - Math.PI / 2, e = this.get(id);
      return `<div class="ew-item r${e.rarity}" data-i="${i}" style="left:${50 + Math.cos(a) * 36}%;top:${50 + Math.sin(a) * 36}%"><kbd>${i + 1}</kbd>${esc(e.name)}</div>`;
    }).join('')}<div class="ew-center">Emote<small>Move mouse · click or B</small></div></div>`;
    this.el.hidden = false;
    this.wheelOpen = true; this.wheelCb = cb; this.wheelSel = -1; this.wheelVec.x = this.wheelVec.y = 0;
  },
  // in a match the mouse is locked: feed it the mouse movement
  nudge(dx, dy) { this.wheelVec.x = clamp(this.wheelVec.x + dx, -200, 200); this.wheelVec.y = clamp(this.wheelVec.y + dy, -200, 200); this.pick(); },
  pick() {
    const w = this.wheel(), v = this.wheelVec;
    if (Math.hypot(v.x, v.y) < 40) this.wheelSel = -1;
    else { const a = Math.atan2(v.y, v.x) + Math.PI / 2; this.wheelSel = ((Math.round(a / TAU * w.length) % w.length) + w.length) % w.length; }
    this.el.querySelectorAll('.ew-item').forEach(d => d.classList.toggle('on', +d.dataset.i === this.wheelSel));
  },
  key(code) {
    const m = /^Digit([1-8])$/.exec(code);
    if (m && +m[1] <= this.wheel().length) { this.wheelSel = +m[1] - 1; this.closeWheel(true); return true; }
    return false;
  },
  closeWheel(choose) {
    if (!this.wheelOpen) return;
    this.wheelOpen = false; this.el.hidden = true;
    const id = choose && this.wheelSel >= 0 ? this.wheel()[this.wheelSel] : null, cb = this.wheelCb;
    this.wheelCb = null;
    if (id && cb) cb(id);
  },
};
