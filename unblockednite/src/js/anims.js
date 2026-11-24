'use strict';
// ===== Animation clips (Quaternius Universal Animation Library, CC0) retargeted onto any skin =====
// At startup every clip is played once on the library's own skeleton and sampled at 30 fps. For each
// frame we store which way every limb points (thigh, calf, upper arm, forearm) in the character's own
// space (x right, y up, -z forward), plus how far the hips bob. SKINS.sync then rotates each skin's limbs
// to point the same way, so one set of clips drives every skeleton.
const ANIM_ROLES = ['thighL', 'thighR', 'calfL', 'calfR', 'upperL', 'upperR', 'foreL', 'foreR'];
const ANIM_SRC = {
  thighL: ['DEF-thighL', 'DEF-shinL'], thighR: ['DEF-thighR', 'DEF-shinR'],
  calfL: ['DEF-shinL', 'DEF-footL'], calfR: ['DEF-shinR', 'DEF-footR'],
  upperL: ['DEF-upper_armL', 'DEF-forearmL'], upperR: ['DEF-upper_armR', 'DEF-forearmR'],
  foreL: ['DEF-forearmL', 'DEF-handL'], foreR: ['DEF-forearmR', 'DEF-handR'],
};
// playback: natural ground speed (m/s at 1x) for locomotion clips, and whether a clip loops
const ANIM_CLIPS = {
  idle: { name: 'Idle_Loop', loop: true }, walk: { name: 'Walk_Loop', loop: true, speed: 2.2 },
  jog: { name: 'Jog_Fwd_Loop', loop: true, speed: 5.6 }, sprint: { name: 'Sprint_Loop', loop: true, speed: 8.4 },
  air: { name: 'Jump_Loop', loop: true }, dance: { name: 'Dance_Loop', loop: true },
  death: { name: 'Death01', loop: false }, swim: { name: 'Swim_Fwd_Loop', loop: true },
  // library clips some emotes are built from (looped while the emote plays)
  u_jab: { name: 'Punch_Jab', loop: true }, u_cross: { name: 'Punch_Cross', loop: true }, u_sword: { name: 'Sword_Attack', loop: true },
  u_spell: { name: 'Spell_Simple_Shoot', loop: true }, u_spellidle: { name: 'Spell_Simple_Idle_Loop', loop: true },
  u_sit: { name: 'Sitting_Idle_Loop', loop: true }, u_talk: { name: 'Idle_Talking_Loop', loop: true }, u_interact: { name: 'Interact', loop: true },
  u_roll: { name: 'Roll', loop: true }, u_crouch: { name: 'Crouch_Idle_Loop', loop: true }, u_sneak: { name: 'Crouch_Fwd_Loop', loop: true },
  u_push: { name: 'Push_Loop', loop: true }, u_drive: { name: 'Driving_Loop', loop: true }, u_fix: { name: 'Fixing_Kneeling', loop: true },
  u_hit: { name: 'Hit_Head', loop: true }, u_formal: { name: 'Walk_Formal_Loop', loop: true }, u_pickup: { name: 'PickUp_Table', loop: true },
  u_hop: { name: 'Jump_Start', loop: true }, u_shoot: { name: 'Pistol_Shoot', loop: true }, u_torch: { name: 'Idle_Torch_Loop', loop: true },
  u_tread: { name: 'Swim_Idle_Loop', loop: true }, u_walk: { name: 'Walk_Loop', loop: true }, u_jog: { name: 'Jog_Fwd_Loop', loop: true },
};
const ANIM_FPS = 30;

const ANIMS = {
  ready: false, clips: {},

  async init() {
    if (typeof ANIM_GLB === 'undefined' || !THREE.GLTFLoader) return false;
    try {
      const gltf = await new Promise((resolve, reject) => {
        const bin = atob(ANIM_GLB), buf = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        gltfLoader().parse(buf.buffer, '', resolve, reject);
      });
      const scene = gltf.scene;
      const B = {}; scene.traverse((o) => { B[o.name] = o; });
      const mixer = new THREE.AnimationMixer(scene);
      const wp = (n) => { const v = new THREE.Vector3(); B[n].getWorldPosition(v); return v; };
      // facing of the library rig (from its rest pose): right = thighR - thighL, forward = up x right
      scene.updateMatrixWorld(true);
      const right = wp('DEF-thighR').sub(wp('DEF-thighL')).setY(0).normalize();
      const fwd = new THREE.Vector3(0, 1, 0).cross(right);
      const toChar = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.atan2(-fwd.x, -fwd.z));
      const legLen = wp('DEF-thighL').distanceTo(wp('DEF-shinL')) + wp('DEF-shinL').distanceTo(wp('DEF-footL'));
      const restHip = wp('DEF-hips').y;
      for (const key in ANIM_CLIPS) {
        const clip = gltf.animations.find((a) => a.name === ANIM_CLIPS[key].name);
        if (!clip) continue;
        mixer.stopAllAction();
        const action = mixer.clipAction(clip); action.play();
        const n = Math.max(2, Math.round(clip.duration * ANIM_FPS) + 1);
        const dirs = new Float32Array(n * ANIM_ROLES.length * 3), hip = new Float32Array(n);
        for (let f = 0; f < n; f++) {
          mixer.setTime(Math.min(clip.duration, f / ANIM_FPS));
          scene.updateMatrixWorld(true);
          ANIM_ROLES.forEach((role, ri) => {
            const [a, b] = ANIM_SRC[role];
            const d = wp(b).sub(wp(a)).normalize().applyQuaternion(toChar);
            dirs.set([d.x, d.y, d.z], (f * ANIM_ROLES.length + ri) * 3);
          });
          hip[f] = (wp('DEF-hips').y - restHip) / legLen;
        }
        this.clips[key] = { n, dur: clip.duration, dirs, hip, loop: ANIM_CLIPS[key].loop, speed: ANIM_CLIPS[key].speed };
        action.stop();
      }
      this.useFortniteLocomotion();
      this.ready = Object.keys(this.clips).length > 0;
      if (this.ready && typeof EMOTES !== 'undefined') EMOTES.build();
    } catch (e) { console.warn('animations failed', e); }
    return this.ready;
  },

  // Fortnite's own idle / walk / jog / sprint / falling (dist/fnloco.js) replace the library's versions
  useFortniteLocomotion() {
    if (typeof FN_LOCO === 'undefined') return;
    const b64 = (s, T) => { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new T(u.buffer); };
    for (const f of FN_LOCO) {
      const key = f.id.replace(/^fn_loco_/, '');
      if (!ANIM_CLIPS[key]) continue;
      const d8 = b64(f.d, Int8Array), h16 = b64(f.h, Int16Array);
      const dirs = new Float32Array(d8.length); for (let i = 0; i < d8.length; i++) dirs[i] = d8[i] / 127;
      const hip = new Float32Array(h16.length); for (let i = 0; i < h16.length; i++) hip[i] = h16[i] / 1000;
      this.clips[key] = { n: f.n, dur: f.dur, dirs, hip, loop: true, speed: ANIM_CLIPS[key].speed }; // in place, no body turn
    }
  },

  // Bake a hand-made clip: fn(t, out) fills out[role] with limb directions (character space) and returns
  // { hip, yaw } (hip bob in leg lengths, body turn in radians). Stored like a sampled clip.
  proc(key, dur, fn) {
    const n = Math.max(2, Math.round(dur * ANIM_FPS) + 1), R = ANIM_ROLES.length;
    const dirs = new Float32Array(n * R * 3), hip = new Float32Array(n), yaw = new Float32Array(n), out = {};
    for (let f = 0; f < n; f++) {
      const r = fn((f / (n - 1)) * dur, out) || {};
      ANIM_ROLES.forEach((role, ri) => { const d = out[role]; dirs.set([d.x, d.y, d.z], (f * R + ri) * 3); });
      hip[f] = r.hip || 0; yaw[f] = r.yaw || 0;
    }
    this.clips[key] = { n, dur, dirs, hip, yaw, loop: true };
  },

  // Fill out[role] (Vector3) with the clip's limb directions at time t; returns the hip bob (in leg lengths).
  sample(key, t, out) {
    const c = this.clips[key];
    let fr = t * ANIM_FPS;
    fr = c.loop ? ((fr % (c.n - 1)) + (c.n - 1)) % (c.n - 1) : Math.min(fr, c.n - 1.001);
    const f0 = Math.floor(fr), f1 = Math.min(c.n - 1, f0 + 1), k = fr - f0, R = ANIM_ROLES.length;
    ANIM_ROLES.forEach((role, ri) => {
      const i0 = (f0 * R + ri) * 3, i1 = (f1 * R + ri) * 3, d = c.dirs;
      (out[role] || (out[role] = new THREE.Vector3())).set(
        d[i0] + (d[i1] - d[i0]) * k, d[i0 + 1] + (d[i1 + 1] - d[i0 + 1]) * k, d[i0 + 2] + (d[i1 + 2] - d[i0 + 2]) * k).normalize();
    });
    this._yaw = c.yaw ? c.yaw[f0] + (c.yaw[f1] - c.yaw[f0]) * k : 0;
    this._hp = c.headP ? c.headP[f0] + (c.headP[f1] - c.headP[f0]) * k : null;
    this._hr = c.headR ? c.headR[f0] + (c.headR[f1] - c.headR[f0]) * k : 0;
    return c.hip[f0] + (c.hip[f1] - c.hip[f0]) * k;
  },
  _yaw: 0,

  // Per-character playback with a short crossfade between clips. Returns the pose for SKINS.sync.
  // st = { key, rate } chosen by the caller; m keeps the playback state.
  pose(m, st, dt) {
    if (!this.ready || !st || !this.clips[st.key]) { m.anim = null; return null; }
    let a = m.anim;
    if (!a) a = m.anim = { key: st.key, t: 0, prevKey: null, prevT: 0, fade: 1, cur: {}, prev: {}, out: {} };
    if (a.key !== st.key) { a.prevKey = a.key; a.prevT = a.t; a.key = st.key; a.t = 0; a.fade = 0; }
    a.t += dt * (st.rate || 1);
    a.fade = Math.min(1, a.fade + dt / 0.18);
    let hip = this.sample(a.key, a.t, a.cur), yaw = this._yaw, hp = this._hp, hr = this._hr;
    if (a.fade < 1 && a.prevKey && this.clips[a.prevKey]) {
      a.prevT += dt;
      const hp0 = this.sample(a.prevKey, a.prevT, a.prev);
      for (const role of ANIM_ROLES) a.out[role] = (a.out[role] || new THREE.Vector3()).copy(a.prev[role]).lerp(a.cur[role], a.fade).normalize();
      const yp = this._yaw, pp = this._hp || 0, pr = this._hr || 0;
      hip = hp0 + (hip - hp0) * a.fade; yaw = yp + (yaw - yp) * a.fade;
      if (hp !== null) { hp = pp + (hp - pp) * a.fade; hr = pr + (hr - pr) * a.fade; }
    } else for (const role of ANIM_ROLES) a.out[role] = (a.out[role] || new THREE.Vector3()).copy(a.cur[role]);
    const C = this.clips[a.key], fg = C.fg && a.fade >= 1 ? { fg: C.fg, f: Math.floor((((a.t * ANIM_FPS) % (C.n - 1)) + (C.n - 1)) % (C.n - 1)) } : null;
    return { dirs: a.out, hip, yaw, head: hp !== null ? [hp, hr] : null, arms: !st.procArms, legs: !st.procLegs, fg };
  },
};
